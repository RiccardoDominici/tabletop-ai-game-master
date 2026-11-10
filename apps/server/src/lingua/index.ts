/**
 * Lingua dei contenuti del Motore (docs/lingue.md): i pacchetti `lingue/<codice>/` (frasi fisse, regole
 * linguistiche, parole chiave dei dadi) e i prompt `prompts/<codice>/`.
 *
 * Il pacchetto attivo è uno per processo: un server gioca una campagna sola, e la sua lingua (quella
 * della campagna, o della configurazione) si imposta all'avvio con `impostaLingua`. Senza, vale
 * l'italiano: test e strumenti che non la impostano si comportano come prima.
 *
 * L'italiano è il riferimento. Ogni altro pacchetto deve avere tutte le sue chiavi, con gli stessi
 * segnaposto `{nome}` (lo controlla `controllaPacchi`, usato da caricaPacco e dai test).
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { RADICE_REPO } from '../percorsi';

export const LINGUE = ['it', 'en'] as const;
export type Lingua = (typeof LINGUE)[number];
export const LINGUA_PREDEFINITA: Lingua = 'it';
/** La lingua di riferimento: le sue chiavi sono quelle che ogni pacchetto deve avere. */
export const LINGUA_RIFERIMENTO: Lingua = 'it';

/** File di regole di un pacchetto (oltre alle frasi fisse testi*.yaml). */
export type FilePacco = 'motore' | 'prove';

export function èLingua(x: unknown): x is Lingua {
  return typeof x === 'string' && (LINGUE as readonly string[]).includes(x);
}

/** Valida un codice lingua letto da configurazione o campagna: vuoto = null, sconosciuto = errore chiaro. */
export function comeLingua(x: unknown, dove: string): Lingua | null {
  if (x === undefined || x === null || x === '') return null;
  const c = String(x).trim().toLowerCase();
  if (èLingua(c)) return c;
  throw new Error(`${dove}: lingua «${String(x)}» sconosciuta (lingue disponibili: ${LINGUE.join(', ')})`);
}

export interface Pacco {
  codice: Lingua;
  /** Frasi fisse, a chiavi piatte («regia.fine_scena»), con segnaposto {nome}. */
  testi: Readonly<Record<string, string>>;
  /** Regole linguistiche del Motore (annuncio, collegamenti tra azioni, guardie, frasi). */
  motore: Readonly<Record<string, unknown>>;
  /** Parole chiave dell'arbitro dei dadi e nomi delle regole. */
  prove: Readonly<Record<string, unknown>>;
}

let radice = path.join(RADICE_REPO, 'lingue');
const cache = new Map<Lingua, Pacco>();
let attiva: Lingua = LINGUA_PREDEFINITA;

/** Solo per i test: un'altra cartella dei pacchetti (svuota la cache). */
export function usaCartellaPacchi(cartella: string): void {
  radice = cartella;
  cache.clear();
}

function appiattisci(o: unknown, prefisso = '', fuori: Record<string, string> = {}): Record<string, string> {
  if (o === null || o === undefined) return fuori;
  if (typeof o === 'string') {
    fuori[prefisso] = o;
    return fuori;
  }
  if (typeof o !== 'object' || Array.isArray(o)) throw new Error(`testi.yaml: «${prefisso}» deve essere un testo o una sezione`);
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) appiattisci(v, prefisso ? `${prefisso}.${k}` : k, fuori);
  return fuori;
}

function leggi(codice: Lingua, file: FilePacco): unknown {
  const p = path.join(radice, codice, `${file}.yaml`);
  if (!fs.existsSync(p)) return {};
  return YAML.parse(fs.readFileSync(p, 'utf8')) ?? {};
}

/**
 * Le frasi fisse: testi.yaml più i file testi-<area>.yaml (uno per area del Motore, così chi lavora su
 * un'area non tocca il file degli altri). Una chiave ripetuta in due file è un errore.
 */
function leggiTesti(codice: Lingua): Record<string, string> {
  const cartella = path.join(radice, codice);
  const file = fs.existsSync(cartella) ? fs.readdirSync(cartella).filter((f) => /^testi(-[a-z0-9]+)?\.yaml$/.test(f)).sort() : [];
  const tutti: Record<string, string> = {};
  for (const f of file) {
    const parte = appiattisci(YAML.parse(fs.readFileSync(path.join(cartella, f), 'utf8')) ?? {});
    for (const [k, v] of Object.entries(parte)) {
      if (k in tutti) throw new Error(`${codice}/${f}: la chiave «${k}» c'è già in un altro file testi`);
      tutti[k] = v;
    }
  }
  return tutti;
}

function leggiPacco(codice: Lingua): Pacco {
  return {
    codice,
    testi: leggiTesti(codice),
    motore: leggi(codice, 'motore') as Record<string, unknown>,
    prove: leggi(codice, 'prove') as Record<string, unknown>,
  };
}

const segnaposto = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

/** Chiavi di primo livello di un oggetto di regole, ricorsive fino alle foglie non-oggetto. */
function forma(o: unknown, prefisso = ''): string[] {
  if (o === null || typeof o !== 'object' || Array.isArray(o)) return [prefisso];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => forma(v, prefisso ? `${prefisso}.${k}` : k));
}

/**
 * Problemi di un pacchetto rispetto all'italiano: chiavi mancanti o in più, segnaposto diversi (testi);
 * campi mancanti o in più (motore, prove). Vuoto = tutto a posto.
 */
export function controllaPacco(codice: Lingua): string[] {
  const rif = leggiPacco(LINGUA_RIFERIMENTO);
  const p = leggiPacco(codice);
  const problemi: string[] = [];
  for (const [k, v] of Object.entries(rif.testi)) {
    const t = p.testi[k];
    if (t === undefined) problemi.push(`${codice}/testi.yaml: manca «${k}»`);
    else if (segnaposto(t).join() !== segnaposto(v).join()) problemi.push(`${codice}/testi.yaml: «${k}» ha i segnaposto {${segnaposto(t).join(', ')}} invece di {${segnaposto(v).join(', ')}}`);
  }
  for (const k of Object.keys(p.testi)) if (!(k in rif.testi)) problemi.push(`${codice}/testi.yaml: «${k}» non c'è nell'italiano`);
  for (const f of ['motore', 'prove'] as const) {
    const a = new Set(forma(rif[f]));
    const b = new Set(forma(p[f]));
    for (const k of a) if (!b.has(k)) problemi.push(`${codice}/${f}.yaml: manca «${k}»`);
    for (const k of b) if (!a.has(k)) problemi.push(`${codice}/${f}.yaml: «${k}» non c'è nell'italiano`);
  }
  return problemi;
}

/** I problemi di tutti i pacchetti (per i test). */
export function controllaPacchi(): string[] {
  return LINGUE.filter((l) => l !== LINGUA_RIFERIMENTO).flatMap((l) => controllaPacco(l));
}

/** Il pacchetto di una lingua (controllato rispetto all'italiano alla prima lettura). */
export function caricaPacco(codice: Lingua): Pacco {
  const c = cache.get(codice);
  if (c) return c;
  if (codice !== LINGUA_RIFERIMENTO) {
    const problemi = controllaPacco(codice);
    if (problemi.length) throw new Error(`pacchetto della lingua «${codice}» incompleto:\n- ${problemi.slice(0, 20).join('\n- ')}`);
  }
  const p = leggiPacco(codice);
  cache.set(codice, p);
  return p;
}

/** Imposta la lingua dei contenuti di questo processo (all'avvio, o quando cambia la campagna). */
export function impostaLingua(codice: Lingua): void {
  caricaPacco(codice);
  attiva = codice;
}

export function linguaAttiva(): Lingua {
  return attiva;
}

/** Il pacchetto della lingua attiva. */
export function pacco(): Pacco {
  return caricaPacco(attiva);
}

/**
 * Una frase fissa del Motore nella lingua attiva, con i segnaposto `{nome}` sostituiti. Una chiave
 * mancante è un errore di programmazione: si lancia, così i test lo trovano subito.
 */
export function testo(chiave: string, valori: Record<string, string | number> = {}, lingua: Lingua = attiva): string {
  const t = caricaPacco(lingua).testi[chiave];
  if (t === undefined) throw new Error(`testo «${chiave}» assente dal pacchetto «${lingua}»`);
  return t.replace(/\{(\w+)\}/g, (tutto, nome: string) => (nome in valori ? String(valori[nome]) : tutto));
}

/** Percorso di un prompt nella lingua attiva (o in quella data): prompts/<codice>/<nome>.md. */
export function percorsoPrompt(nome: string, lingua: Lingua = attiva): string {
  return path.join(RADICE_REPO, 'prompts', lingua, `${nome}.md`);
}

/** Il testo di un prompt nella lingua attiva. */
export function leggiPrompt(nome: string, lingua: Lingua = attiva): string {
  return fs.readFileSync(percorsoPrompt(nome, lingua), 'utf8');
}
