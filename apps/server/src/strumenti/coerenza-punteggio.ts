/**
 * Offline scorer of the coherence checker on the frozen replay set (docs/coerenza.md, «Frozen replay set»): any
 * checker variant runs over every call of esperimenti/coerenza/insieme.json, sentence by sentence and in order (the
 * guards keep state within a call), and is compared with the labels of esperimenti/coerenza/etichette.json. A sentence
 * the variant touches (replaces, drops or moves) that is labelled clean, or not labelled (the set's other sentences are
 * clean), is a wrong touch; a violation it leaves is a miss. Rules only: seconds, no model, no key.
 *
 *   npx tsx apps/server/src/strumenti/coerenza-punteggio.ts [variant…]      (default: every rule variant)
 *
 * Variants: `attive` (what changes the table's text today: R-fuori, R-esito without the absorbed-blow branch,
 * R-assente for an NPC's line), `regole` (attive plus the two rules in observation, R-inesistente of cb4ded5 and the
 * absorbed-blow branch of 8cb8426), `filtro` (touches every sentence the mention filter flags: the ceiling of the
 * filter alone). The small-model candidate is coerenza-domanda.ts, which reuses `valuta` from here.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { caricaCampagna } from '../campagna/caricatore';
import { nomeBreve } from '../campagna/nomi';
import { tipiGregari } from '../campagna/gregari';
import { creatureAssenti, creatureNote, frasePresenti, guardiaInesistenti, nominateIn } from '../coerenza/inesistenti';
import type { Registro, StatoEntita } from '../coerenza/registro';
import { impostaLingua } from '../lingua';
import { guardiaEsiti, type CorrezioneEsito } from '../narrazione/guardia-esiti';
import { guardiaFuori } from '../narrazione/guardia-fuori';
import type { FuoriGioco } from '../prove/stato';
import { RADICE_REPO } from '../percorsi';
import type { ChiamataInsieme, FraseInsieme } from './coerenza-insieme';

const IN_GIOCO: ReadonlySet<StatoEntita> = new Set(['in_piedi', 'ferito', 'grave', 'nascosto']);
const CARTELLA = path.join(RADICE_REPO, 'esperimenti', 'coerenza');

export interface Etichetta {
  etichetta: 'violation' | 'clean';
  perche: string;
  testo: string;
}

/** A checker variant: for one call, a function that says whether it touches each sentence (in order). */
export interface Variante {
  nome: string;
  prepara: (ch: ChiamataInsieme) => (f: FraseInsieme) => boolean | Promise<boolean>;
}

export interface Punteggio {
  variante: string;
  violazioni: number;
  prese: number;
  mancate: Array<{ chiave: string; testo: string; perche: string }>;
  toccatePulite: Array<{ chiave: string; testo: string; etichettata: boolean }>;
  ms: number;
}

/** A set and its labels: `insieme` (the frozen set) or another name, e.g. `prima` (insieme-prima.json, etichette-prima.json). */
export function carica(nome = 'insieme'): { insieme: ChiamataInsieme[]; etichette: Record<string, Etichetta>; campagna: string } {
  const suffisso = nome === 'insieme' ? '' : `-${nome}`;
  const i = JSON.parse(fs.readFileSync(path.join(CARTELLA, `insieme${suffisso}.json`), 'utf8')) as { campagna: string; insieme: ChiamataInsieme[] };
  const e = JSON.parse(fs.readFileSync(path.join(CARTELLA, `etichette${suffisso}.json`), 'utf8')) as { etichette: Record<string, Etichetta> };
  return { insieme: i.insieme, etichette: e.etichette, campagna: i.campagna };
}

/** The guards as the director builds them for one call (scena/regia.ts, guardiaDegliEsiti), from the set's rows. */
export function guardieDellaChiamata(ch: ChiamataInsieme, o: { inesistente: boolean; assorbito: boolean; fuori?: boolean }, tipi: ReturnType<typeof tipiGregari>): (testo: string) => CorrezioneEsito {
  const nomi = new Map<string, string[]>(ch.entita.map((e) => [e.id, e.nomi]));
  const nome = (id: string): string => ch.entita.find((e) => e.id === id)?.nome ?? id;
  const tiri = ch.carte.map(
    (k) =>
      ({
        id: `${k.chi}-${k.bersaglio}`,
        tipo: 'attacco',
        chi: k.chi,
        nome: nome(k.chi),
        bersaglio: { id: k.bersaglio, nome: nome(k.bersaglio) },
        riuscita: k.riuscita,
        danno: { totale: k.danno },
        privata: false,
        a_terra: k.riuscita && ch.fuoriOra.includes(k.bersaglio),
      }) as unknown as TiroMostrato,
  );
  const stato = (id: string): StatoEntita | undefined => ch.entita.find((e) => e.id === id)?.stato;
  const esiti = guardiaEsiti({
    tiri,
    nomi,
    conScheda: (id) => id.startsWith('pg_') || id.startsWith('png_'),
    fuori: (id) => !IN_GIOCO.has(stato(id) ?? 'in_piedi'),
    nome,
    // Without the absorbed-blow branch: what it says is dropped here, as in observation.
    ...(o.assorbito ? {} : { osserva: () => undefined }),
  });
  const fuoriDaPrima = (id: string): FuoriGioco | null => {
    if (ch.fuoriOra.includes(id)) return null;
    const s = stato(id);
    if (!s || IN_GIOCO.has(s)) return null;
    return s === 'morto' ? 'morto' : s === 'fuggito' ? 'fuggito' : 'a_terra';
  };
  const fuori = o.fuori === false ? null : guardiaFuori({ nomi, nome, fuoriDaPrima });
  let ines: ((t: string) => CorrezioneEsito) | null = null;
  if (o.inesistente) {
    const registro: Registro = { turno: ch.turno, scena: ch.scena, entita: ch.entita, fatti: [], esiti: [], negati: [] };
    const assenti = creatureAssenti(registro, creatureNote(ch.entita, tipi));
    const sicure = assenti.filter((a) => ch.scontro || a.caduti.length > 0);
    const pubbliche = nominateIn(ch.azioni.filter((a) => !a.privata).map((a) => a.testo).join(' \n '), sicure);
    const giudicate = ch.scontro ? sicure : pubbliche;
    const per = new Map(ch.entita.map((e) => [e.id, e]));
    const nomiTitolari = [...new Set(giudicate.flatMap((a) => a.titolari).flatMap((id) => (per.has(id) ? [per.get(id)!.nome, nomeBreve(per.get(id)!.nome)] : [])))];
    ines = guardiaInesistenti({ assenti: giudicate, nomiTitolari, frase: (a) => frasePresenti(registro, [a]) });
  }
  return (testo) => ines?.(testo) ?? esiti(testo) ?? fuori?.(testo) ?? null;
}

/** R-assente as VerificaTurno applies it: an NPC's line when that NPC is not in the scene and in play. */
function assente(ch: ChiamataInsieme, f: FraseInsieme): boolean {
  if (!f.etichetta.startsWith('png_')) return false;
  const e = ch.entita.find((x) => x.id === f.etichetta);
  return !e || e.presenza !== 'in_scena' || !IN_GIOCO.has(e.stato);
}

export function varianteRegole(nome: string, o: { inesistente: boolean; assorbito: boolean }, tipi: ReturnType<typeof tipiGregari>): Variante {
  return {
    nome,
    prepara: (ch) => {
      const g = guardieDellaChiamata(ch, o, tipi);
      return (f) => (f.etichetta === 'narratore' ? g(f.testo) !== null : assente(ch, f));
    },
  };
}

export const varianteFiltro: Variante = { nome: 'filtro', prepara: () => (f) => f.segnata };

/** Runs a variant over the set and scores it against the labels. */
export async function valuta(v: Variante, insieme: readonly ChiamataInsieme[], etichette: Record<string, Etichetta>): Promise<Punteggio> {
  const t0 = Date.now();
  const p: Punteggio = { variante: v.nome, violazioni: 0, prese: 0, mancate: [], toccatePulite: [], ms: 0 };
  for (const ch of insieme) {
    const decidi = v.prepara(ch);
    for (const f of ch.frasi) {
      const chiave = `${ch.id}:${f.i}`;
      const e = etichette[chiave];
      const tocca = await decidi(f);
      if (e?.etichetta === 'violation') {
        p.violazioni++;
        if (tocca) p.prese++;
        else p.mancate.push({ chiave, testo: f.testo, perche: e.perche });
      } else if (tocca) p.toccatePulite.push({ chiave, testo: f.testo, etichettata: !!e });
    }
  }
  p.ms = Date.now() - t0;
  return p;
}

export function riga(p: Punteggio): string {
  return `| ${p.variante} | ${p.prese}/${p.violazioni} | ${p.mancate.length} | ${p.toccatePulite.length} (${p.toccatePulite.filter((x) => x.etichettata).length} labelled) | ${p.ms} ms |`;
}

async function main(): Promise<void> {
  const { insieme, etichette, campagna } = carica();
  const c = caricaCampagna(path.join(RADICE_REPO, 'campagne', campagna));
  impostaLingua(c.lingua ?? 'it');
  const tipi = tipiGregari(c);
  const tutte: Variante[] = [varianteRegole('attive', { inesistente: false, assorbito: false }, tipi), varianteRegole('regole', { inesistente: true, assorbito: true }, tipi), varianteFiltro];
  const scelte = process.argv.slice(2);
  const varianti = scelte.length ? tutte.filter((v) => scelte.includes(v.nome)) : tutte;
  fs.mkdirSync(path.join(CARTELLA, 'punteggi'), { recursive: true });
  process.stdout.write('| variant | caught | missed | clean touched | time |\n|---|---|---|---|---|\n');
  for (const v of varianti) {
    const p = await valuta(v, insieme, etichette);
    fs.writeFileSync(path.join(CARTELLA, 'punteggi', `${v.nome}.json`), `${JSON.stringify(p, null, 1)}\n`);
    process.stdout.write(`${riga(p)}\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) void main();
