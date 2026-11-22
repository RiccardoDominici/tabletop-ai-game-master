/**
 * Ability requirements of a class or a race (mechanism M7, docs/regole.md §2 «Creazione»): the minimum and maximum
 * scores a character needs to join it. Basic Fantasy p. 5–7: a class's Prime Requisite of at least 9, a dwarf's
 * Constitution of at least 9 and Charisma of at most 17.
 *
 *   classi: [{id: chierico, requisiti: {saggezza: {min: 9}}}]
 *   razze:  [{id: nano, requisiti: {costituzione: {min: 9}, carisma: {max: 17}}, classi: [chierico, guerriero, ladro]}]
 *
 * Kept apart from regole/creazione.ts so classes and races (regole/classi.ts, regole/tratti.ts) can read them without
 * importing the whole creation procedure.
 */

/** Characteristic id → its bounds (both inclusive; null = no bound on that side). */
export type Requisiti = Record<string, { min: number | null; max: number | null }>;

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/**
 * `requisiti:` of a class or race. A bare number is the minimum (`{saggezza: 9}`); `{min, max}` either side. The ids
 * are checked against the set's characteristics by the caller (`caratteristiche`), when it knows them.
 */
export function leggiRequisiti(v: unknown, dove: string, caratteristiche: ReadonlySet<string> | null, errori: string[]): Requisiti {
  if (v === undefined || v === null) return {};
  const o = ogg(v);
  if (!o) {
    errori.push(`${dove}: a map characteristic → {min, max} (or a number, the minimum)`);
    return {};
  }
  const out: Requisiti = {};
  for (const [car, x] of Object.entries(o)) {
    if (caratteristiche && !caratteristiche.has(car)) errori.push(`${dove}.${car}: not a characteristic of the set`);
    if (intero(x)) {
      out[car] = { min: x, max: null };
      continue;
    }
    const b = ogg(x);
    const min = b?.['min'];
    const max = b?.['max'];
    if (!b || (min !== undefined && !intero(min)) || (max !== undefined && !intero(max)) || (min === undefined && max === undefined)) {
      errori.push(`${dove}.${car}: {min: n} and/or {max: n}, whole numbers`);
      continue;
    }
    if (intero(min) && intero(max) && min > max) errori.push(`${dove}.${car}: min ${min} above max ${max}`);
    out[car] = { min: intero(min) ? min : null, max: intero(max) ? max : null };
  }
  return out;
}

/** The requirements a score set misses: one entry per characteristic out of its bounds. */
export function requisitiMancati(r: Requisiti, punteggi: Readonly<Record<string, number>>): Array<{ caratteristica: string; valore: number; min: number | null; max: number | null }> {
  const out: Array<{ caratteristica: string; valore: number; min: number | null; max: number | null }> = [];
  for (const [car, b] of Object.entries(r)) {
    const v = punteggi[car];
    if (v === undefined) continue;
    if ((b.min !== null && v < b.min) || (b.max !== null && v > b.max)) out.push({ caratteristica: car, valore: v, min: b.min, max: b.max });
  }
  return out;
}
