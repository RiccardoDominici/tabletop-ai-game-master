/**
 * The difficulty of a check that no data sets (docs/prove.md §4, «Difficulty from signals»), for the rules arbiter.
 *
 * When neither a scene check, nor an NPC's sheet (Influence), nor a defence gives the number to beat, the rule set's
 * default rung is the start (SRD 5.2: medium, DC 15; a manual: its `difficolta_predefinita`). What makes the action
 * easier or harder moves it on the set's own ladder:
 * - a signal in what the PC does (`parole.difficolta` of lingue/<code>/prove.yaml: «controcorrente», «viscido», «al
 *   buio» harder; «con la rincorsa», «con una corda» easier) moves it one rung, whatever the count (two hardships in
 *   one sentence are a hard check, not a very hard one);
 * - when the action's own words say nothing, a hard signal in a sentence of the narration or of the scene that shares a
 *   content word with the action («un ponte stretto» for «cammino sul ponte») moves it one rung: the world makes it
 *   harder. Not on top of the action's own signals: measured on twenty actions, the scene's «ponte stretto sul fiume
 *   gonfio» also made reading runes on the bridge's pier very hard.
 * At most one rung either way. «Impossible» is never decided here: the rules arbiter rolls, at worst hard.
 *
 * The signals are words of the content language (docs/lingue.md); the ladder is the set's (`difficolta`, from the
 * easiest): d20 sets by DC, roll-under sets by divisor, 2d6 sets by modifier.
 */
import { normalizza } from '../azioni/regole';
import { DIFFICOLTA } from '../campagna/regole-srd';
import type { SistemaRegole } from '../regole/tipi';
import { datiProve } from './lingua';
import { inComune } from './parole-testo';

/** A ladder of difficulties, from the easiest, and the rung a check starts from. */
export interface ScalaDifficolta {
  ids: string[];
  predefinita: number;
}

/** The SRD 5.2 ladder (molto_facile … quasi_impossibile), from medium; or the set's, from its default. */
export function scalaDifficolta(s: SistemaRegole | null): ScalaDifficolta {
  if (!s || s.srd) {
    const ids = Object.keys(DIFFICOLTA);
    return { ids, predefinita: ids.indexOf('media') };
  }
  const durezza = (d: SistemaRegole['difficolta'][number]): number =>
    s.risoluzione.tipo === 'sotto_soglia' ? (d.divisore ?? 1) : s.risoluzione.tipo === '2d6_fasce' ? -(d.modificatore ?? 0) : (d.valore ?? 15);
  const ids = [...s.difficolta].sort((a, b) => durezza(a) - durezza(b)).map((d) => d.id);
  const i = ids.indexOf(s.difficoltaPredefinita);
  return { ids, predefinita: i >= 0 ? i : 0 };
}

/** The signals found, and how many rungs they move (−1, 0, +1). */
export interface SegnaliDifficolta {
  gradini: number;
  facili: string[];
  difficili: string[];
  /** Hard signals of the scene's sentences that touch the action. */
  scena: string[];
}

const compilati = new WeakMap<object, { facili: Array<[string, RegExp]>; difficili: Array<[string, RegExp]> }>();

/** The language pack's signals, each as its own expression at the start of a word (compiled once per pack). */
function liste(): { facili: Array<[string, RegExp]>; difficili: Array<[string, RegExp]> } {
  const p = datiProve();
  let c = compilati.get(p);
  if (!c) {
    const voci = (xs: readonly string[] | undefined): Array<[string, RegExp]> => (xs ?? []).map((v) => [v, new RegExp(`\\b(${v})`)]);
    c = { facili: voci(p.parole.difficolta?.piu_facile), difficili: voci(p.parole.difficolta?.piu_difficile) };
    compilati.set(p, c);
  }
  return c;
}

const trovati = (testo: string, voci: ReadonlyArray<[string, RegExp]>): string[] => {
  const t = normalizza(testo);
  return voci.filter(([, re]) => re.test(t)).map(([v]) => v);
};

/** The sentences of a text (narration, the scene's description), without the narrator's tags. */
export function frasiDi(testo: string): string[] {
  return testo
    .replace(/\[[^\]]*\]/g, ' ')
    .split(/[.!?;\n]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

/**
 * How the action's own words and the scene move the difficulty. `fatti`: what the PC does (speech removed); `scena`:
 * the sentences of the last narration and of the scene's public description; `nomi`: the names' words, which do not
 * count as shared content.
 */
export function segnaliDifficolta(fatti: string, scena: readonly string[] = [], nomi: ReadonlySet<string> = new Set()): SegnaliDifficolta {
  const { facili: lf, difficili: ld } = liste();
  const facili = trovati(fatti, lf);
  const difficili = trovati(fatti, ld);
  const azione = Math.sign(difficili.length - facili.length);
  const vicine = azione === 0 && !facili.length ? scena.filter((f) => inComune(fatti, f, nomi) >= 1) : [];
  const daScena = [...new Set(vicine.flatMap((f) => trovati(f, ld)))];
  const gradini = azione !== 0 ? azione : daScena.length ? 1 : 0;
  return { gradini, facili, difficili, scena: daScena };
}

/** The difficulty id for these rungs on this ladder; null when it is the ladder's default (nothing moved it). */
export function difficoltaDa(scala: ScalaDifficolta, gradini: number): string | null {
  if (!gradini || !scala.ids.length) return null;
  const i = Math.max(0, Math.min(scala.ids.length - 1, scala.predefinita + gradini));
  return i === scala.predefinita ? null : scala.ids[i]!;
}
