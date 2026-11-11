/**
 * Parole segrete (campagne/<id>/repertorio/parole_segrete.yaml): espressioni che portano un
 * segreto. Finché nessuno degli id di `pubblica_dopo` (indizio rivelato o battuta uscita) è
 * accaduto, non devono comparire nel contesto del selettore in modalità repertorio.
 *
 * Le regex sono scritte per Python (`re.search` sul testo minuscolo), dove \w e \b riconoscono
 * anche le lettere accentate. In JavaScript \w e \b sono solo ASCII: `regexDaPython` le traduce in
 * classi Unicode, così «\bè il pane\b» si comporta come in Python.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { DatiYaml } from '../campagna/tipi';

export interface ParolaSegreta {
  parola: string;
  /** Sorgente Python originale (per i messaggi). */
  sorgente: string;
  regex: RegExp;
  pubblica_dopo: string[];
  fatti: string[];
}

const PAROLA = '[\\p{L}\\p{N}_]';
const CONFINE = `(?:(?<=${PAROLA})(?!${PAROLA})|(?<!${PAROLA})(?=${PAROLA}))`;

/** Traduce \w e \b da Python (Unicode) a JavaScript (flag u). */
export function regexDaPython(sorgente: string): RegExp {
  let out = '';
  for (let i = 0; i < sorgente.length; i++) {
    const c = sorgente[i]!;
    if (c === '\\' && i + 1 < sorgente.length) {
      const d = sorgente[i + 1]!;
      if (d === 'w') out += PAROLA;
      else if (d === 'b') out += CONFINE;
      else out += c + d;
      i++;
      continue;
    }
    out += c;
  }
  return new RegExp(out, 'u');
}

export function caricaParoleSegrete(cartellaRepertorio: string): ParolaSegreta[] {
  const file = path.join(cartellaRepertorio, 'parole_segrete.yaml');
  if (!fs.existsSync(file)) return [];
  const dati = (YAML.parse(fs.readFileSync(file, 'utf8')) ?? {}) as DatiYaml;
  const parole = Array.isArray(dati['parole']) ? (dati['parole'] as DatiYaml[]) : [];
  return parole
    .filter((p) => typeof p['regex'] === 'string' || typeof p['parola'] === 'string')
    .map((p) => {
      const sorgente = typeof p['regex'] === 'string' ? p['regex'] : String(p['parola']).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
      return {
        parola: typeof p['parola'] === 'string' ? p['parola'] : sorgente,
        sorgente,
        regex: regexDaPython(sorgente),
        pubblica_dopo: lista(p['pubblica_dopo']),
        fatti: lista(p['fatti']),
      };
    });
}

/**
 * Parole segrete di una campagna: repertorio/parole_segrete.yaml della campagna o, se il pacchetto di
 * sessione ne ha uno, quello del pacchetto, che lo sostituisce (campagna/tipi.ts, cartelleSegreti).
 */
export function caricaParoleSegreteCampagna(c: { cartelleSegreti: readonly string[] }): ParolaSegreta[] {
  const out: ParolaSegreta[] = [];
  for (const cartella of c.cartelleSegreti) {
    for (const p of caricaParoleSegrete(cartella)) if (!out.some((x) => x.sorgente === p.sorgente)) out.push(p);
  }
  return out;
}

/** Stato minimo per decidere se una parola è diventata pubblica. */
export interface StatoPubblico {
  indiziRivelati: ReadonlySet<string>;
  battuteUsate: (id: string) => boolean;
  /**
   * Fatti che i PG sanno (canone `noto_ai_pg`, anche da un pacchetto di sessione, ed effetti `fatti_noti` delle
   * battute dette): la parola di un fatto noto non è più un segreto.
   */
  fattiNoti?: ReadonlySet<string>;
}

export function èPubblica(p: ParolaSegreta, s: StatoPubblico | null): boolean {
  if (!s) return false;
  if (p.fatti.length && s.fattiNoti && p.fatti.every((f) => s.fattiNoti!.has(f))) return true;
  return p.pubblica_dopo.some((id) => s.indiziRivelati.has(id) || s.battuteUsate(id));
}

/** Parole ancora segrete che compaiono nel testo. */
/** Il testo senza questi pezzi (le parole dei giocatori dentro un messaggio del Motore). */
export function senzaTesti(testo: string, pezzi: readonly string[]): string {
  return pezzi.filter((p) => p.trim().length > 0).reduce((t, p) => t.split(p).join(' '), testo);
}

/**
 * Le parole segrete che il MOTORE ha messo in un messaggio: si tolgono prima i testi già sentiti al tavolo (le azioni
 * dei giocatori e la trascrizione pubblica, eco del narratore compresa), che per definizione non sono più segreti.
 */
export function segretiDelMotore(messaggio: string, giaDetti: readonly string[], parole: ParolaSegreta[], s: StatoPubblico | null): ParolaSegreta[] {
  return segretiNelTesto(senzaTesti(messaggio, giaDetti), parole, s);
}

export function segretiNelTesto(testo: string, parole: ParolaSegreta[], s: StatoPubblico | null = null): ParolaSegreta[] {
  const minuscolo = testo.toLowerCase();
  return parole.filter((p) => !èPubblica(p, s) && p.regex.test(minuscolo));
}

/**
 * Toglie da un testo le frasi che contengono una parola ancora segreta. Ciò che è segreto lo dice
 * SOLO la campagna (parole_segrete.yaml): nel codice non c'è nessuna espressione di una campagna.
 */
export function togliFrasiSegrete(testo: string, parole: ParolaSegreta[], s: StatoPubblico | null = null): string {
  const frasi = testo.split(/(?<=[.!?…])\s+/);
  const tenute = frasi.filter((f) => segretiNelTesto(f, parole, s).length === 0);
  return tenute.join(' ').trim();
}
