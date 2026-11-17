/**
 * «Impossibile» needs a reason the fiction records (A1 of docs/da-fare.md; docs/prove.md §3).
 *
 * A model arbiter (Haiku, profile B) may answer «impossibile» for an action that is only hard: in the measures of
 * docs/prove-verifica.md §5 it said so for «sollevo il carro rovesciato» three runs out of three, with a `motivo` that
 * contradicted its own verdict («un guerriero forte può tentare»). Prompt wording and a reason-first field were
 * measured and dropped. The deterministic rule, applied after any arbiter:
 * - an «impossibile» stands when the scene records why: one of its `vincoli_pubblici` (the public facts the Preparer
 *   writes, «La porta di ferro resta chiusa finché qualcuno gira nella serratura la chiave…») shares at least two
 *   content words with the action. A constraint only licenses the verdict; it never makes one: «Giro la chiave nella
 *   porta di ferro» shares every word with its constraint and is the allowed action, so the Engine never turns
 *   anything into «impossibile» by itself;
 * - otherwise, if the rules arbiter (prove/classificatore-regole.ts) rolls a check for the action, that check is
 *   rolled, on the set's ladder from the action's and the scene's signals (at worst hard): hard is not impossible;
 * - otherwise (the rules find nothing to roll: flying, acting on what is not in the scene) the model's verdict stays.
 *   That last path is the model's own and is not measured live (no API credit since 16 November).
 * Pure functions: the Engine (prove/motore.ts, `decidi`) applies them; a replay of the cached Haiku answers uses them
 * as well.
 */
import type { Campagna } from '../campagna/tipi';
import { classificaARegole, type IngressoClassificatore } from './classificatore-regole';
import { inComune, senzaParlato } from './parole-testo';
import type { DecisioneProva, DecisioneRegole } from './tipi';

type Decisione = DecisioneProva | DecisioneRegole;

/** Content words an action must share with a public constraint for it to be the recorded reason. */
const PAROLE_IN_COMUNE = 2;

/** The scene's public constraints (`vincoli_pubblici`, schema of the Preparer's skill): what the fiction fixes. */
export function vincoliPubblici(c: Campagna): string[] {
  const v = c.scena.dati['vincoli_pubblici'];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
}

/** The constraint that gives the reason why the action cannot succeed as written, or null. Names count as content. */
export function vincoloDellAzione(testo: string, vincoli: readonly string[]): string | null {
  return vincoli.find((v) => inComune(testo, v) >= PAROLE_IN_COMUNE) ?? null;
}

export interface VaglioImpossibile {
  /** The decision to keep: the model's «impossibile», or the rules' check instead. */
  decisione: Decisione;
  /** `vincolo`: a constraint gives the reason; `regole`: the rules' check replaces it; `resta`: nothing to roll. */
  perche: 'vincolo' | 'regole' | 'resta';
  vincolo?: string;
}

/** The rule above, for one decision of the type «impossibile» (any other decision is returned as it is, `resta`). */
export function vagliaImpossibile(d: Decisione, az: { id: string; testo: string; autore: string }, ing: IngressoClassificatore, vincoli: readonly string[]): VaglioImpossibile {
  if (d.tipo !== 'impossibile') return { decisione: d, perche: 'resta' };
  const vincolo = vincoloDellAzione(senzaParlato(az.testo), vincoli);
  if (vincolo) return { decisione: d, perche: 'vincolo', vincolo };
  const r = classificaARegole(az, ing);
  if (r.tipo === 'prova' || r.tipo === 'contrapposta' || r.tipo === 'salvezza') return { decisione: r, perche: 'regole' };
  return { decisione: d, perche: 'resta' };
}
