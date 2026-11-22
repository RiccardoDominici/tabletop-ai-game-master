/**
 * A check's number by the character's level (regole.yaml → difficolta_per_livello; Basic Fantasy's Ability Rolls,
 * p. 189: «d20 + the ability bonus ≥ the Target», 17 for a normal man or a 1st-level character down to 7 at the 20th).
 * The set's difficulty rungs stay the Game Master's adjustments around it: every rung moves by the same amount, so a
 * 5th-level character's «facile» is 13 − 2 = 11. Saves, attacks and thresholds keep their own numbers (the caller only
 * asks for an ability or characteristic check). A sheet with no level, or a set without the table, uses the rungs as
 * written.
 */
import { rigaDi } from './progressione';
import type { SchedaGenerica, SistemaRegole } from './tipi';

/** How much the rungs move for a character of `livello` (0 = none). */
export function spostamentoAlLivello(s: SistemaRegole, livello: number | null | undefined): number {
  const righe = s.difficoltaPerLivello;
  const base = s.difficolta.find((d) => d.id === s.difficoltaPredefinita)?.valore;
  if (!righe?.length || livello === null || livello === undefined || base === null || base === undefined) return 0;
  const r = rigaDi(righe, livello);
  return r ? r.valore - base : 0;
}

/** The set as a check of this sheet sees it: the same rungs, moved by its level's row (the set itself when unmoved). */
export function sistemaAlLivello(s: SistemaRegole, sch: Pick<SchedaGenerica, 'livello' | 'classe'> | null): SistemaRegole {
  // A level only counts on a sheet that has one by its class (a PC, a classed NPC); a monster's hit dice are not a level.
  const n = sch?.classe ? spostamentoAlLivello(s, sch.livello ?? 1) : 0;
  if (!n) return s;
  return { ...s, difficolta: s.difficolta.map((d) => (d.valore === null ? d : { ...d, valore: d.valore + n })) };
}
