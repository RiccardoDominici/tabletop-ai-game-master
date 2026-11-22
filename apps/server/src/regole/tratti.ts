/**
 * Race and class traits of a rule set (mechanism M6 of docs/regole-audit/; docs/regole.md §2, «Razze e tratti»): what a
 * race or a class adds to a kind of roll or makes a character immune to, as data the sheet carries (`scheda.razza`,
 * `scheda.classe`, or the sheet's own `tratti`) and the Engine applies. A closed list:
 *
 *   razze:
 *     - id: halfling
 *       nome: "Halfling"
 *       tratti:
 *         - {tiro: iniziativa, bonus: 1}                                  # added to initiative
 *         - {tiro: abilita, abilita: [distanza], bonus: 1}                # added to those abilities' rolls (attacks too)
 *         - {tiro: salvezza, colonne: [morte, bacchette], bonus: 4}       # added to saves of those table columns
 *         - {immune: [paralisi_ghoul]}                                    # powers or conditions it ignores
 *         - {sorpresa: -1}                                                # its surprise range (1d6 ≤ the side's): −1
 *         - {almeno: {nascondersi: 70}}                                   # an ability at least this value (M1: the class
 *                                                                         #   table's or this, the better; the halfling's hiding)
 *         - {dado_vita_massimo: 6}                                        # never a hit die bigger than a d6 (elves, halflings)
 *         - {tiro: esperienza, bonus: 10}                                 # +10% to every XP earned (humans, p. 6)
 *         - {scurovisione: 18}                                            # sees in the dark this far (dwarves, elves: 60')
 */
import type { Voce } from './tipi';
import { leggiRequisiti, type Requisiti } from './requisiti';

export type Tratto =
  | { tipo: 'iniziativa'; bonus: number }
  | { tipo: 'abilita'; abilita: string[]; bonus: number }
  | { tipo: 'salvezza'; colonne: string[]; bonus: number }
  | { tipo: 'immune'; a: string[] }
  | { tipo: 'sorpresa'; modificatore: number }
  | { tipo: 'almeno'; valori: Record<string, number> }
  | { tipo: 'dado_vita'; facce: number }
  | { tipo: 'esperienza'; bonus: number }
  | { tipo: 'scurovisione'; portata: number };

export interface Razza extends Voce {
  tratti: Tratto[];
  /** Creation (M7, regole/creazione.ts): the scores a character of the race needs (Basic Fantasy p. 5: a dwarf's CON ≥ 9). */
  requisiti: Requisiti;
  /** The classes open to the race (Basic Fantasy p. 5: a dwarf is a cleric, fighter or thief); null = any. */
  classi: string[] | null;
  /** The languages a character of the race starts knowing (Basic Fantasy p. 4: its own and Common). */
  lingue: string[];
  /** Added to the generated scores (none in Basic Fantasy; other manuals give +1 Dexterity, −1 Constitution). */
  aggiustamenti: Record<string, number>;
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const ID = /^[a-z0-9_]+$/;
const ids = (v: unknown): string[] | null => (Array.isArray(v) && v.length && v.every((x) => typeof x === 'string' && ID.test(x)) ? (v as string[]) : null);

/** A list of traits (`tratti:` of a race, a class or a sheet). `abilita`, `colonne`: the set's ids. */
export function leggiTratti(v: unknown, dove: string, ctx: { abilita: ReadonlySet<string>; colonne: ReadonlySet<string> }, errori: string[]): Tratto[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push(`${dove}: a list of traits`);
    return [];
  }
  const out: Tratto[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const d = `${dove}[${i + 1}]`;
    if (o && o['immune'] !== undefined) {
      const a = ids(o['immune']);
      if (a) out.push({ tipo: 'immune', a });
      else errori.push(`${d}.immune: a list of ids (powers or conditions)`);
      continue;
    }
    if (o && o['sorpresa'] !== undefined) {
      if (intero(o['sorpresa']) && o['sorpresa'] !== 0) out.push({ tipo: 'sorpresa', modificatore: o['sorpresa'] });
      else errori.push(`${d}.sorpresa: a whole number, not 0 (−1: surprised one face less)`);
      continue;
    }
    if (o && o['almeno'] !== undefined) {
      const a = ogg(o['almeno']);
      const voci = Object.entries(a ?? {});
      const ignote = voci.filter(([k]) => !ctx.abilita.has(k)).map(([k]) => k);
      if (!a || !voci.length || !voci.every(([, n]) => intero(n) && n >= 0) || ignote.length) errori.push(`${d}.almeno: {ability of the set: a whole number}${ignote.length ? ` (not: ${ignote.join(', ')})` : ''}`);
      else out.push({ tipo: 'almeno', valori: Object.fromEntries(voci) as Record<string, number> });
      continue;
    }
    if (o && o['scurovisione'] !== undefined) {
      const n = o['scurovisione'];
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0) out.push({ tipo: 'scurovisione', portata: n });
      else errori.push(`${d}.scurovisione: how far it sees in the dark, in the set's unit of movement (0 = none)`);
      continue;
    }
    if (o && o['dado_vita_massimo'] !== undefined) {
      const f = o['dado_vita_massimo'];
      if (intero(f) && [2, 3, 4, 6, 8, 10, 12, 20].includes(f)) out.push({ tipo: 'dado_vita', facce: f });
      else errori.push(`${d}.dado_vita_massimo: the faces of the largest hit die (6 = never more than a d6)`);
      continue;
    }
    const bonus = o?.['bonus'];
    if (!o || !intero(bonus) || bonus === 0) {
      errori.push(`${d}: {tiro: iniziativa | abilita | salvezza | esperienza, bonus: n}, {immune: [...]}, {sorpresa: n}, {almeno: {...}} or {dado_vita_massimo: n}`);
      continue;
    }
    if (o['tiro'] === 'iniziativa') out.push({ tipo: 'iniziativa', bonus });
    else if (o['tiro'] === 'esperienza') out.push({ tipo: 'esperienza', bonus });
    else if (o['tiro'] === 'abilita') {
      const a = ids(o['abilita']);
      const ignote = a?.filter((x) => !ctx.abilita.has(x)) ?? [];
      if (!a || ignote.length) errori.push(`${d}.abilita: abilities of the set${ignote.length ? ` (not: ${ignote.join(', ')})` : ''}`);
      else out.push({ tipo: 'abilita', abilita: a, bonus });
    } else if (o['tiro'] === 'salvezza') {
      const c = ids(o['colonne']);
      const ignote = c?.filter((x) => !ctx.colonne.has(x)) ?? [];
      if (!c || ignote.length) errori.push(`${d}.colonne: columns of tiri_salvezza${ignote.length ? ` (not: ${ignote.join(', ')})` : ''}`);
      else out.push({ tipo: 'salvezza', colonne: c, bonus });
    } else errori.push(`${d}.tiro: iniziativa, abilita, salvezza or esperienza`);
  }
  return out;
}

/** `razze:` of the set. */
export function leggiRazze(v: unknown, ctx: { abilita: ReadonlySet<string>; colonne: ReadonlySet<string> }, errori: string[]): Razza[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push('razze: a list of {id, nome, tratti}');
    return [];
  }
  const out: Razza[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const id = typeof o?.['id'] === 'string' && ID.test(o['id']) ? o['id'] : null;
    if (!o || !id) {
      errori.push(`razze[${i + 1}]: an id in snake_case`);
      continue;
    }
    if (out.some((r) => r.id === id)) errori.push(`razze: id repeated «${id}»`);
    const classi = o['classi'] === undefined || o['classi'] === null ? null : ids(o['classi']);
    if (o['classi'] !== undefined && o['classi'] !== null && !classi) errori.push(`razze.${id}.classi: a list of class ids`);
    const lingue = o['lingue'] === undefined ? [] : ids(o['lingue']);
    if (o['lingue'] !== undefined && !lingue) errori.push(`razze.${id}.lingue: a list of language ids`);
    const agg = ogg(o['aggiustamenti']) ?? {};
    if (o['aggiustamenti'] !== undefined && (!ogg(o['aggiustamenti']) || !Object.values(agg).every(intero))) errori.push(`razze.${id}.aggiustamenti: characteristic → a whole number`);
    out.push({
      id,
      nome: typeof o['nome'] === 'string' ? o['nome'] : id,
      tratti: leggiTratti(o['tratti'], `razze.${id}.tratti`, ctx, errori),
      requisiti: leggiRequisiti(o['requisiti'], `razze.${id}.requisiti`, null, errori),
      classi,
      lingue: lingue ?? [],
      aggiustamenti: Object.fromEntries(Object.entries(agg).filter((e): e is [string, number] => intero(e[1]))),
    });
  }
  return out;
}

/** The percentage added to the XP a character earns (the humans' +10%, Basic Fantasy p. 6). */
export function bonusEsperienza(tratti: readonly Tratto[]): number {
  return tratti.reduce((n, t) => (t.tipo === 'esperienza' ? n + t.bonus : n), 0);
}

/** The sum of the traits' bonuses of one kind for a roll. */
export function bonusTratti(tratti: readonly Tratto[], tiro: { tipo: 'iniziativa' } | { tipo: 'abilita'; abilita: string } | { tipo: 'salvezza'; colonna: string | null }): number {
  let n = 0;
  for (const t of tratti) {
    if (t.tipo === 'iniziativa' && tiro.tipo === 'iniziativa') n += t.bonus;
    else if (t.tipo === 'abilita' && tiro.tipo === 'abilita' && t.abilita.includes(tiro.abilita)) n += t.bonus;
    else if (t.tipo === 'salvezza' && tiro.tipo === 'salvezza' && tiro.colonna && t.colonne.includes(tiro.colonna)) n += t.bonus;
  }
  return n;
}
