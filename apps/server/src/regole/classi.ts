/**
 * Classes of a rule set and their level tables (docs/regole.md §2, «Classi e tiri salvezza»): the saving throw table
 * (mechanism M5) and the spells per day (M3) of each class, by level, as the manual prints them. The sheet names its
 * class and level (`scheda.classe`, `scheda.livello`, regole/schede.ts); the Engine reads the row.
 *
 *   tiri_salvezza:
 *     colonne:                                   # the manual's save categories, in the table's order
 *       - {id: morte, nome: "Raggio della morte o veleno"}
 *       - {id: incantesimi, nome: "Incantesimi"}
 *   classi:
 *     - id: mago
 *       nome: "Mago"
 *       tiri_salvezza:                           # rows from the lowest level; each holds from its `da` up
 *         - {da: 1, valori: [13, 15]}            # one value per column
 *       incantesimi_al_giorno:                   # spells per day by spell level (1st, 2nd…), from `da` up
 *         - {da: 1, slot: [1]}
 *         - {da: 3, slot: [2, 1]}
 */
import type { TiriSalvezza } from './salvezze';
import type { Voce } from './tipi';
import { leggiTratti, type Tratto } from './tratti';

export interface Classe extends Voce {
  /** Save rows (one value per column of `tiri_salvezza.colonne`); empty = the class has none. */
  tiriSalvezza: Array<{ da: number; valori: number[] }>;
  /** Spells per day by spell level, by class level; empty = the class casts no spells. */
  incantesimiAlGiorno: Array<{ da: number; slot: number[] }>;
  /** The class's traits (regole/tratti.ts). */
  tratti: Tratto[];
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const ID = /^[a-z0-9_]+$/;

/** Rows `{da, <chiave>: [numbers]}` from the lowest level up, `da` growing; errors with `dove`. */
function righe<K extends string>(v: unknown, chiave: K, dove: string, errori: string[], lunghezza: number | null): Array<{ da: number } & Record<K, number[]>> {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push(`${dove}: a list of {da, ${chiave}: [...]}`);
    return [];
  }
  const out: Array<{ da: number } & Record<K, number[]>> = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const da = o?.['da'];
    const valori = o?.[chiave];
    if (!o || !intero(da) || da < 0 || !Array.isArray(valori) || !valori.every((n) => intero(n) && n >= 0)) {
      errori.push(`${dove}[${i + 1}]: {da: a level from 0, ${chiave}: [whole numbers]}`);
      continue;
    }
    if (lunghezza !== null && valori.length !== lunghezza) errori.push(`${dove}[${i + 1}]: ${valori.length} values, the table has ${lunghezza} columns`);
    if (out.length && da <= out.at(-1)!.da) errori.push(`${dove}[${i + 1}]: «da» grows row after row`);
    out.push({ da, [chiave]: valori } as { da: number } & Record<K, number[]>);
  }
  return out;
}

/** `tiri_salvezza.colonne` of the set; null without the section. */
export function leggiColonneSalvezza(v: unknown, errori: string[]): TiriSalvezza['colonne'] | null {
  if (v === undefined || v === null) return null;
  const col = ogg(v)?.['colonne'];
  if (!Array.isArray(col) || !col.length) {
    errori.push('tiri_salvezza.colonne: a list of {id, nome}, at least one');
    return null;
  }
  const out: Voce[] = [];
  for (const [i, x] of col.entries()) {
    const o = ogg(x);
    const id = typeof o?.['id'] === 'string' && ID.test(o['id']) ? o['id'] : null;
    if (!id) errori.push(`tiri_salvezza.colonne[${i + 1}]: an id in snake_case`);
    else if (out.some((c) => c.id === id)) errori.push(`tiri_salvezza.colonne: id repeated «${id}»`);
    else out.push({ id, nome: typeof o?.['nome'] === 'string' ? o['nome'] : id });
  }
  return out;
}

/** `classi:` of the set (the tables of each class). */
export function leggiClassi(v: unknown, colonne: number | null, errori: string[], ctx: { abilita: ReadonlySet<string>; colonne: ReadonlySet<string> } = { abilita: new Set(), colonne: new Set() }): Classe[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push('classi: a list of {id, nome, tiri_salvezza, incantesimi_al_giorno}');
    return [];
  }
  const out: Classe[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const id = typeof o?.['id'] === 'string' && ID.test(o['id']) ? o['id'] : null;
    if (!o || !id) {
      errori.push(`classi[${i + 1}]: an id in snake_case`);
      continue;
    }
    if (out.some((c) => c.id === id)) errori.push(`classi: id repeated «${id}»`);
    const ts = righe(o['tiri_salvezza'], 'valori', `classi.${id}.tiri_salvezza`, errori, colonne);
    if (ts.length && colonne === null) errori.push(`classi.${id}.tiri_salvezza: the set has no tiri_salvezza.colonne`);
    out.push({ id, nome: typeof o['nome'] === 'string' ? o['nome'] : id, tiriSalvezza: ts, incantesimiAlGiorno: righe(o['incantesimi_al_giorno'], 'slot', `classi.${id}.incantesimi_al_giorno`, errori, null), tratti: leggiTratti(o['tratti'], `classi.${id}.tratti`, ctx, errori) });
  }
  return out;
}
