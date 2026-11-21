/**
 * Progression by class and level (mechanism M1 of docs/regole-audit/; docs/regole.md §2, «Progressione»): the class
 * tables a manual prints for each level — experience points to reach it, the hit points it adds, the attack bonus, the
 * values of the abilities that grow with the level (the thief's percentages), the rows of a power rolled against a
 * class table (Turn Undead) — as rows inside `classi[]`, and the set-level rules that say how they reach a sheet
 * (`progressione:`). The Engine and the validator DERIVE a sheet's numbers from them by its `classe` and `livello`; a
 * number the sheet writes by hand stays as an override (reported when it disagrees), so the Preparer writes no
 * arithmetic and a level-up between sessions changes everything at once.
 *
 *   progressione:
 *     attacco: [mischia, distanza, {abilita: alle_spalle, piu: 4}]   # abilities whose value is the class's attack bonus (+ piu)
 *     punti_ferita: {caratteristica: costituzione, minimo: 1}       # each hit die adds this bonus; a die gives at least 1
 *     un_livello_per_avventura: true                                # XP stop one short of the level after next (p. 49)
 *   classi:
 *     - id: ladro
 *       px: [0, 1250, 2500]                                        # XP to reach level 1, 2, 3… (one per level, growing)
 *       dadi_vita: [{da: 1, dado: "1d4"}, {da: 10, fissi: 2}]       # what each level from `da` adds: a die, or fixed HP
 *       attacco: [{da: 1, bonus: 1}, {da: 3, bonus: 2}]            # the attack bonus, from `da` up
 *       abilita:                                                   # ability values by level (the set's ability ids)
 *         colonne: [scassinare, ascoltare]
 *         righe: [{da: 1, valori: [25, 30]}, {da: 2, valori: [30, 34]}]
 *       tabelle:                                                   # a power rolled against a class table: power id → rows
 *         scacciare_non_morti: [{da: 1, valori: [13, 17, null]}, {da: 8, valori: [T, 3, 7]}]
 */
import { leggiFormula, type FormulaDadi } from '../campagna/regole-srd';
import type { Tratto } from './tratti';

/** A cell of a power's class table: the number to reach, `T` (it works, no roll), `D` (a stronger result), null (No). */
export type ValoreTabella = number | 'T' | 'D' | null;

export interface RigaDadiVita {
  da: number;
  /** One die for each level from `da` (with the characteristic's bonus); null when the row is fixed. */
  dado: FormulaDadi | null;
  /** Fixed hit points for each level from `da` (after name level: no characteristic added). */
  fissi: number | null;
}

/** The progression tables of one class (all optional: an empty list = the class has none). */
export interface ProgressioneClasse {
  /** XP to reach level 1, 2, 3… (index 0 = level 1). */
  px: number[];
  dadiVita: RigaDadiVita[];
  attacco: Array<{ da: number; bonus: number }>;
  /** Ability values by level: the thief's percentages (`colonne` are the set's ability ids). */
  abilita: { colonne: string[]; righe: Array<{ da: number; valori: number[] }> } | null;
  /** Power id → rows of its class table (Turn Undead). */
  tabelle: Record<string, Array<{ da: number; valori: ValoreTabella[] }>>;
}

/** The set-level rules of progression (`progressione:`). */
export interface Progressione {
  /** Abilities whose value is the class's attack bonus, plus `piu` (the sneak attack's +4). */
  attacco: Array<{ abilita: string; piu: number }>;
  /** Each hit die adds this characteristic's bonus (null: none); a die gives at least `minimo`. */
  puntiFerita: { caratteristica: string | null; minimo: number };
  /** No character gains more than one level from one adventure: XP stop one short of the level after next. */
  unLivelloPerAvventura: boolean;
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const ID = /^[a-z0-9_]+$/;

/** The row of a level table: the highest with `da` ≤ level (below the first, the first). */
export function rigaDi<T extends { da: number }>(righe: readonly T[], livello: number): T | null {
  let r: T | null = righe[0] ?? null;
  for (const x of righe) if (livello >= x.da) r = x;
  return r;
}

/** Rows `{da, …}` from the lowest level, `da` growing; each row read by `leggi` (null = malformed, reported there). */
function righe<T extends { da: number }>(v: unknown, dove: string, errori: string[], leggi: (o: D, da: number, d: string) => T | null): T[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push(`${dove}: a list of rows {da, …}`);
    return [];
  }
  const out: T[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const d = `${dove}[${i + 1}]`;
    if (!o || !intero(o['da']) || o['da'] < 0) {
      errori.push(`${d}: {da: a level from 0, …}`);
      continue;
    }
    const r = leggi(o, o['da'], d);
    if (!r) continue;
    if (out.length && r.da <= out.at(-1)!.da) errori.push(`${d}: «da» grows row after row`);
    out.push(r);
  }
  return out;
}

/** A cell of a power's class table: a whole number, T, D, or null. */
function cella(v: unknown): ValoreTabella | undefined {
  if (v === null) return null;
  if (v === 'T' || v === 'D') return v;
  return intero(v) && v >= 0 ? v : undefined;
}

/** The progression fields of one class of `classi:` (regole/classi.ts calls it). `abilita`: the set's ability ids. */
export function leggiProgressioneClasse(o: D, id: string, ctx: { abilita: ReadonlySet<string> }, errori: string[]): ProgressioneClasse {
  const dove = `classi.${id}`;
  const px: number[] = [];
  if (o['px'] !== undefined) {
    if (!Array.isArray(o['px']) || !o['px'].length || !o['px'].every((n) => intero(n) && n >= 0)) errori.push(`${dove}.px: XP to reach each level, whole numbers from level 1`);
    else {
      const l = o['px'] as number[];
      for (const [i, n] of l.entries()) if (i && n <= l[i - 1]!) errori.push(`${dove}.px[${i + 1}]: XP grow level after level`);
      px.push(...l);
    }
  }
  const dadiVita = righe<RigaDadiVita>(o['dadi_vita'], `${dove}.dadi_vita`, errori, (r, da, d) => {
    if (r['fissi'] !== undefined) {
      if (intero(r['fissi']) && r['fissi'] >= 0) return { da, dado: null, fissi: r['fissi'] };
      errori.push(`${d}.fissi: a whole number of hit points`);
      return null;
    }
    const f = leggiFormula(r['dado']);
    if (!f || f.numero !== 1 || f.bonus !== 0) {
      errori.push(`${d}: {da, dado: "1d8"} (one die a level) or {da, fissi: 2}`);
      return null;
    }
    return { da, dado: f, fissi: null };
  });
  const attacco = righe(o['attacco'], `${dove}.attacco`, errori, (r, da, d) => {
    if (intero(r['bonus'])) return { da, bonus: r['bonus'] };
    errori.push(`${d}.bonus: the attack bonus, a whole number`);
    return null;
  });
  let abilita: ProgressioneClasse['abilita'] = null;
  if (o['abilita'] !== undefined) {
    const a = ogg(o['abilita']);
    const colonne = Array.isArray(a?.['colonne']) ? (a['colonne'] as unknown[]) : null;
    if (!a || !colonne?.length || !colonne.every((c) => typeof c === 'string' && ID.test(c))) errori.push(`${dove}.abilita: {colonne: [ability ids], righe: [{da, valori}]}`);
    else {
      const ignote = (colonne as string[]).filter((c) => !ctx.abilita.has(c));
      if (ignote.length) errori.push(`${dove}.abilita.colonne: not abilities of the set: ${ignote.join(', ')}`);
      const r = righe(a['righe'], `${dove}.abilita.righe`, errori, (x, da, d) => {
        const v = x['valori'];
        if (!Array.isArray(v) || !v.every((n) => intero(n) && n >= 0)) {
          errori.push(`${d}.valori: whole numbers, one per column`);
          return null;
        }
        if (v.length !== colonne.length) errori.push(`${d}.valori: ${v.length} values, the table has ${colonne.length} columns`);
        return { da, valori: v as number[] };
      });
      abilita = { colonne: colonne as string[], righe: r };
    }
  }
  const tabelle: ProgressioneClasse['tabelle'] = {};
  if (o['tabelle'] !== undefined) {
    const t = ogg(o['tabelle']);
    if (!t) errori.push(`${dove}.tabelle: {power id: [{da, valori}]}`);
    for (const [k, v] of Object.entries(t ?? {})) {
      if (!ID.test(k)) errori.push(`${dove}.tabelle: «${k}» is not an id`);
      tabelle[k] = righe(v, `${dove}.tabelle.${k}`, errori, (x, da, d) => {
        const valori = Array.isArray(x['valori']) ? (x['valori'] as unknown[]).map(cella) : null;
        if (!valori || valori.some((c) => c === undefined)) {
          errori.push(`${d}.valori: one cell per column: a whole number, T, D or null (No)`);
          return null;
        }
        return { da, valori: valori as ValoreTabella[] };
      });
    }
  }
  return { px, dadiVita, attacco, abilita, tabelle };
}

/** `progressione:` of the set; null without it. `abilita`, `caratteristiche`: the set's ids. */
export function leggiProgressione(v: unknown, ctx: { abilita: ReadonlySet<string>; caratteristiche: ReadonlySet<string> }, errori: string[]): Progressione | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  if (!o) {
    errori.push('progressione: {attacco, punti_ferita, un_livello_per_avventura}');
    return null;
  }
  const attacco: Progressione['attacco'] = [];
  for (const [i, x] of (Array.isArray(o['attacco']) ? o['attacco'] : o['attacco'] === undefined ? [] : [null]).entries()) {
    const e = typeof x === 'string' ? { abilita: x } : ogg(x);
    const ab = e?.['abilita'];
    const piu = e?.['piu'] ?? 0;
    if (typeof ab !== 'string' || !ctx.abilita.has(ab) || !intero(piu)) errori.push(`progressione.attacco[${i + 1}]: an ability of the set, or {abilita, piu: a whole number}`);
    else attacco.push({ abilita: ab, piu });
  }
  const pf = ogg(o['punti_ferita']) ?? {};
  const car = pf['caratteristica'] ?? null;
  if (car !== null && (typeof car !== 'string' || !ctx.caratteristiche.has(car))) errori.push('progressione.punti_ferita.caratteristica: a characteristic of the set, or null');
  const minimo = pf['minimo'] ?? 1;
  if (!intero(minimo) || minimo < 0) errori.push('progressione.punti_ferita.minimo: a whole number from 0');
  if (o['un_livello_per_avventura'] !== undefined && typeof o['un_livello_per_avventura'] !== 'boolean') errori.push('progressione.un_livello_per_avventura: true or false');
  return {
    attacco,
    puntiFerita: { caratteristica: typeof car === 'string' && ctx.caratteristiche.has(car) ? car : null, minimo: intero(minimo) && minimo >= 0 ? minimo : 1 },
    unLivelloPerAvventura: o['un_livello_per_avventura'] === true,
  };
}

/** XP to reach `livello` (level 0 and 1: the first threshold, 0 when the class has no table); null beyond the table. */
export function sogliaPx(c: ProgressioneClasse, livello: number): number | null {
  if (!c.px.length) return null;
  if (livello <= 1) return c.px[0]!;
  return c.px[livello - 1] ?? null;
}

/** The level an XP total reaches by the class table (at least 1; the table's last level at most). */
export function livelloDaPx(c: ProgressioneClasse, px: number): number {
  let l = 1;
  for (const [i, n] of c.px.entries()) if (px >= n) l = i + 1;
  return l;
}

/**
 * The most XP a character of `livello` may hold after one adventure when the set gives at most one level a time: one
 * short of the level after next (Basic Fantasy p. 49: a 1st-level thief stops at 2,499). Null = no cap.
 */
export function tettoPx(c: ProgressioneClasse, livello: number, unLivello: boolean): number | null {
  if (!unLivello) return null;
  const dopo = sogliaPx(c, Math.max(1, livello) + 2);
  return dopo === null ? null : dopo - 1;
}

/**
 * What the class tables give a sheet at its level: ability id → value. The attack bonus goes to the abilities of
 * `progressione.attacco` (plus their `piu`); the class's ability table gives its columns; a trait `almeno` (a race's own
 * threshold, the halfling's hiding) raises an ability to at least its number. Empty without a class or tables.
 */
export function valoriDaClasse(p: Progressione | null | undefined, c: ProgressioneClasse | null, livello: number, tratti: readonly Tratto[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (c) {
    const bonus = rigaDi(c.attacco, livello)?.bonus;
    if (bonus !== undefined && p) for (const a of p.attacco) out[a.abilita] = bonus + a.piu;
    const r = c.abilita ? rigaDi(c.abilita.righe, livello) : null;
    if (c.abilita && r) for (const [i, id] of c.abilita.colonne.entries()) if (r.valori[i] !== undefined) out[id] = r.valori[i]!;
  }
  for (const t of tratti) if (t.tipo === 'almeno') for (const [id, n] of Object.entries(t.valori)) out[id] = Math.max(out[id] ?? n, n);
  return out;
}

/**
 * The hit points a character gains on reaching `livello`: the class row's die (no bigger than a trait's
 * `dado_vita_massimo`) with the characteristic's bonus and the set's minimum, or the row's fixed number (no bonus).
 * Null when the class has no hit-dice rows.
 */
export function puntiFeritaDelLivello(p: Progressione | null | undefined, c: ProgressioneClasse, livello: number, bonusCaratteristica: number, tratti: readonly Tratto[]): { dado: FormulaDadi | null; fissi: number; bonus: number; minimo: number } | null {
  const r = rigaDi(c.dadiVita, livello);
  if (!r) return null;
  if (r.dado === null) return { dado: null, fissi: r.fissi ?? 0, bonus: 0, minimo: 0 };
  const massimo = tratti.reduce<number | null>((m, t) => (t.tipo === 'dado_vita' ? Math.min(m ?? t.facce, t.facce) : m), null);
  const facce = massimo !== null ? Math.min(r.dado.facce, massimo) : r.dado.facce;
  return { dado: { numero: 1, facce, bonus: 0 }, fissi: 0, bonus: p?.puntiFerita.caratteristica ? bonusCaratteristica : 0, minimo: p?.puntiFerita.minimo ?? 1 };
}

/** The lowest and highest maximum hit points a sheet of `livello` can have by the class rows (the validator's bounds). */
export function limitiPuntiFerita(p: Progressione | null | undefined, c: ProgressioneClasse, livello: number, bonusCaratteristica: number, tratti: readonly Tratto[]): { min: number; max: number } | null {
  if (!c.dadiVita.length || livello < 1) return null;
  let min = 0;
  let max = 0;
  for (let l = 1; l <= livello; l++) {
    const x = puntiFeritaDelLivello(p, c, l, bonusCaratteristica, tratti)!;
    if (!x.dado) {
      min += x.fissi;
      max += x.fissi;
      continue;
    }
    min += Math.max(x.minimo, 1 + x.bonus);
    max += Math.max(x.minimo, x.dado.facce + x.bonus);
  }
  return { min, max };
}
