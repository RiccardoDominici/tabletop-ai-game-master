/**
 * Saving throws as the manual rolls them (mechanism M5 of docs/regole-audit/; docs/regole.md §2, «Tiri salvezza»): a d20
 * against the number of the class and level table, never a difficulty rung of the set or the arbiter's advantage. A
 * save is an ability of the set marked `salvezza`: `true` (a save of the manual, with the sheet's bonus) or the id of a
 * column of `tiri_salvezza` (then the number comes from the table of the sheet's class and level, or `salva_come`).
 *
 * Two ways to get the number to reach, in this order:
 * - **the table**: the set has `tiri_salvezza` and the sheet has a class with rows (or `salva_come`): the target is the
 *   row's value for the save's column; the sheet's own bonus for that ability is not added (the table replaces it), the
 *   race's and class's traits are (regole/tratti.ts), with the ability's characteristic (Basic Fantasy p. 60: poison +
 *   Constitution, charm + Wisdom, illusions + Intelligence);
 * - **the sheet** (sets without tables, and sheets written before them): the target is the set's default difficulty
 *   (Basic Fantasy's 17 at level 1) and the sheet's bonus is `default − table number`, as the Preparer wrote it. Exact,
 *   because the difficulty can no longer move.
 */
import type { SchedaGenerica, SistemaRegole, Voce } from './tipi';
import { valoreCaratteristica } from './schede';

/** The save table of a set: its columns, and for each class the rows from the lowest level (`da` included). */
export interface TiriSalvezza {
  colonne: Voce[];
  /** class id → rows; level 0 is the «normal man» row (Basic Fantasy's NM). */
  classi: Record<string, Array<{ da: number; valori: number[] }>>;
}

export interface BersaglioSalvezza {
  /** The number the d20 plus the bonus must reach. */
  contro: number;
  /** What is added to the d20: the characteristic, the sheet's or the traits' bonus, active effects. */
  modificatore: number;
  /** Where the number comes from: the class table, or the sheet's bonus against the default difficulty. */
  fonte: 'tabella' | 'scheda';
  /** The column of the table, when there is one («morte», «incantesimi»). */
  colonna: string | null;
}

/** The column of a save ability: its `salvezza` id, or null (`true`: a save of the sheet's bonus). */
export function colonnaDi(s: SistemaRegole, abilita: string): string | null {
  const a = s.abilita.find((x) => x.id === abilita);
  return typeof a?.salvezza === 'string' ? a.salvezza : null;
}

/** Whether the ability is a saving throw of the manual (`salvezza: true` or a column id). */
export function eSalvezza(s: SistemaRegole, abilita: string | null): boolean {
  return !!abilita && !!s.abilita.find((x) => x.id === abilita)?.salvezza;
}

/** The row of a class table at a level: the highest with `da` ≤ level (below the first, the first). */
export function rigaAlLivello<T extends { da: number }>(righe: readonly T[], livello: number): T | null {
  let r: T | null = righe[0] ?? null;
  for (const x of righe) if (livello >= x.da) r = x;
  return r;
}

/** The table's number for a sheet's class and level (or `salva_come`) in a column; null = no table, class or column. */
export function numeroDaTabella(s: SistemaRegole, sch: SchedaGenerica, colonna: string): number | null {
  const t = s.tiriSalvezza;
  if (!t) return null;
  const i = t.colonne.findIndex((c) => c.id === colonna);
  const come = sch.salvaCome ?? (sch.classe ? { classe: sch.classe, livello: sch.livello ?? 1 } : null);
  const righe = come ? t.classi[come.classe] : undefined;
  if (i < 0 || !righe?.length || !come) return null;
  return rigaAlLivello(righe, come.livello)?.valori[i] ?? null;
}

/**
 * The number to reach and the bonus of a save, for one sheet and one save ability of the set. `extra`: what the traits
 * and the active effects add (the caller sums them). Null when the ability is not a save of the set.
 */
export function bersaglioSalvezza(s: SistemaRegole, sch: SchedaGenerica, abilita: string, extra = 0): BersaglioSalvezza | null {
  const a = s.abilita.find((x) => x.id === abilita);
  if (!a?.salvezza) return null;
  const car = a.caratteristica ? valoreCaratteristica(s, sch, a.caratteristica) : 0;
  const colonna = colonnaDi(s, abilita);
  const numero = colonna ? numeroDaTabella(s, sch, colonna) : null;
  if (numero !== null) return { contro: numero, modificatore: car + extra, fonte: 'tabella', colonna };
  const predefinita = s.difficolta.find((d) => d.id === s.difficoltaPredefinita)?.valore ?? s.difficolta[0]?.valore ?? 10;
  return { contro: predefinita, modificatore: car + (sch.abilita[abilita] ?? 0) + extra, fonte: 'scheda', colonna };
}
