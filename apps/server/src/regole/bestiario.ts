/**
 * A rule set's bestiary (docs/regole.md §2, «Bestiario»; audit rows P5-20, P5-21, P6-00 to P6-08 of
 * docs/regole-audit/basic-fantasy-gioco.md): the manual's monster stat blocks as data, and the rules that turn a stat
 * block into a sheet — the hit die, the attack bonus by hit dice, what «less than one hit die» means.
 *
 *   regole.yaml →
 *     bestiario:
 *       dado_vita: 8                    # a monster's hit die (Basic Fantasy p. 62: always d8 unless noted)
 *       mezzo: "1d4"                    # the hit points of «½» hit dice
 *       attacco: [{da: 0, bonus: 0}, {da: 1, bonus: 1}, …]   # attack bonus by hit dice (p. 53); da 0 = less than one
 *       abilita: [mischia, distanza]    # the set's attack abilities that take it
 *       uno_meno_meno_di_uno: true      # «1−1» hit dice or less count as less than one (p. 54)
 *   regole/mostri.yaml → (or `mostri:` inline in regole.yaml)
 *     mostri:
 *       - id: ghoul
 *         nome: "Ghoul"
 *         manuale: "Ghoul (and Ghast) | Ghoul"   # the stat block it was copied from (strumenti/regole/confronta_bestiario.py)
 *         pagina: 97
 *         difesa: 14
 *         dadi_vita: "2*"                # as printed: "3+2", "1-1", "½", asterisks for the special-ability XP bonus
 *         attacco: 8                     # the bracket after the hit dice, when the attack bonus differs from them
 *         attacchi: [{id: artiglio, nome: "Artiglio", danno: "1d3", colpendo: [paralisi_ghoul]}, {id: morso, …}]
 *         per_round: [[artiglio, artiglio, morso]]   # the attacks of one round; alternatives in order
 *         salva_come: {classe: guerriero, livello: 2}
 *         morale: 9                      # or {prima: 7, dopo: 12} (a giant ant, p. 64)
 *         px: 100
 *         …and every other key a sheet has (tipo, immune, tratti, colpito_solo_da…), plus the printed text fields
 *         movimento, numero, tesoro, testo (for the Preparer and the narrator; the Engine does not read them).
 *
 * A sheet points to an entry with `mostro: <id>` (an NPC's or a minions' type): the entry's keys come first and the
 * sheet's own win (regole/schede.ts). The Engine never decides a number here: the hit dice give the attack bonus by the
 * set's table and the hit points by the set's die, rolled once per creature with the session's seed (prove/bestiario.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { FormulaDadi } from '../campagna/regole-srd';
import { leggiFormula } from '../campagna/regole-srd';

/** How a stat block becomes a sheet: the hit die, ½ hit dice, the attack bonus by hit dice. */
export interface RegolaBestiario {
  dadoVita: number;
  mezzo: FormulaDadi;
  /** Attack bonus rows from the lowest hit dice; `da` 0 = less than one hit die. */
  attacco: Array<{ da: number; bonus: number }>;
  /** The set's abilities that take the attack bonus (melee and missile). */
  abilita: string[];
  /** «1−1» hit dice or less count as less than one (Basic Fantasy p. 54). */
  unoMenoMenoDiUno: boolean;
  /** Every monster's darkvision unless its entry's traits say otherwise (Basic Fantasy p. 43: 60'); null = none. */
  scurovisione: number | null;
}

/** A monster's hit dice as the manual prints them: «3+2*» = 3 dice, +2 hit points, one asterisk. */
export interface DadiVita {
  numero: number;
  /** «½»: half a hit die (the set's `mezzo` hit points), less than one for the tables. */
  mezzo: boolean;
  bonus: number;
  asterischi: number;
}

/** One stat block of the bestiary: its id and name, and the raw sheet keys it gives (read by regole/schede.ts). */
export interface Mostro {
  id: string;
  nome: string;
  /** The rest of the entry, as YAML: the keys of a sheet plus the printed text fields. */
  dati: Record<string, unknown>;
}

const HD = /^(\d+|½)(?:\s*([+-])\s*(\d+))?\s*(\**)$/;

/** «3+2*», «1-1», «½», «9**», 3 → the hit dice; null when it is none of these. */
export function leggiDadiVita(v: unknown): DadiVita | null {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return { numero: v, mezzo: false, bonus: 0, asterischi: 0 };
  if (typeof v !== 'string') return null;
  const m = HD.exec(v.trim().replace('−', '-'));
  if (!m) return null;
  const mezzo = m[1] === '½';
  return { numero: mezzo ? 0 : Number(m[1]), mezzo, bonus: m[2] ? (m[2] === '-' ? -1 : 1) * Number(m[3]) : 0, asterischi: m[4]?.length ?? 0 };
}

/**
 * The hit dice a table reads (attack bonus, XP, a spell's hit-dice limit): the number of dice, the plus or minus ignored
 * (3+2 and 3−1 count as 3); ½, and with `unoMenoMenoDiUno` «1−1» or less, count as 0 («less than one», p. 54).
 */
export function dadiVitaEffettivi(d: DadiVita, r: Pick<RegolaBestiario, 'unoMenoMenoDiUno'> | null): number {
  if (d.mezzo) return 0;
  if (r?.unoMenoMenoDiUno && d.numero <= 1 && d.bonus < 0) return 0;
  return d.numero;
}

/** The hit points to roll: the dice of the set's die plus the bonus («3+2» = 3d8+2); ½ = the set's `mezzo`. */
export function formulaPuntiFerita(d: DadiVita, r: RegolaBestiario | null): FormulaDadi {
  if (d.mezzo) return r?.mezzo ?? { numero: 1, facce: 4, bonus: 0 };
  return { numero: Math.max(1, d.numero), facce: r?.dadoVita ?? 8, bonus: d.bonus };
}

/** The attack bonus of a monster of these (effective) hit dice by the set's table: the last row with `da` ≤ them. */
export function attaccoDaDadiVita(r: RegolaBestiario, dadi: number): number {
  let bonus = r.attacco[0]?.bonus ?? 0;
  for (const x of r.attacco) if (dadi >= x.da) bonus = x.bonus;
  return bonus;
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const ID = /^[a-z0-9_]+$/;

/** `bestiario:` of regole.yaml; null when absent (a set without monster rules: sheets keep their typed numbers). */
export function leggiRegolaBestiario(v: unknown, abilita: ReadonlySet<string>, errori: string[]): RegolaBestiario | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  if (!o) {
    errori.push('bestiario: {dado_vita, mezzo, attacco, abilita}');
    return null;
  }
  const dado = o['dado_vita'] ?? 8;
  if (!intero(dado) || ![4, 6, 8, 10, 12].includes(dado)) errori.push('bestiario.dado_vita: 4, 6, 8, 10 or 12');
  const mezzo = o['mezzo'] === undefined ? { numero: 1, facce: 4, bonus: 0 } : leggiFormula(o['mezzo']);
  if (!mezzo) errori.push('bestiario.mezzo: the hit points of ½ hit dice, a formula like 1d4');
  const attacco: RegolaBestiario['attacco'] = [];
  for (const [i, x] of (Array.isArray(o['attacco']) ? o['attacco'] : []).entries()) {
    const r = ogg(x);
    if (!r || !intero(r['da']) || r['da'] < 0 || !intero(r['bonus'])) errori.push(`bestiario.attacco[${i + 1}]: {da: hit dice from 0, bonus: a whole number}`);
    else if (attacco.length && r['da'] <= attacco.at(-1)!.da) errori.push(`bestiario.attacco[${i + 1}]: «da» grows row after row`);
    else attacco.push({ da: r['da'], bonus: r['bonus'] });
  }
  if (o['attacco'] !== undefined && !attacco.length) errori.push('bestiario.attacco: at least one row');
  const ab = Array.isArray(o['abilita']) ? o['abilita'].filter((x): x is string => typeof x === 'string') : [];
  for (const a of ab) if (!abilita.has(a)) errori.push(`bestiario.abilita: «${a}» is not an ability of the set`);
  if (attacco.length && !ab.length) errori.push('bestiario.abilita: the attack abilities that take the bonus (mischia, distanza)');
  if (o['uno_meno_meno_di_uno'] !== undefined && typeof o['uno_meno_meno_di_uno'] !== 'boolean') errori.push('bestiario.uno_meno_meno_di_uno: true o false');
  const sv = o['scurovisione'];
  if (sv !== undefined && !(typeof sv === 'number' && Number.isFinite(sv) && sv >= 0)) errori.push('bestiario.scurovisione: every monster\'s darkvision range, in the unit of movement');
  return { dadoVita: intero(dado) ? dado : 8, mezzo: mezzo ?? { numero: 1, facce: 4, bonus: 0 }, attacco, abilita: ab.filter((a) => abilita.has(a)), unoMenoMenoDiUno: o['uno_meno_meno_di_uno'] === true, scurovisione: typeof sv === 'number' && sv >= 0 ? sv : null };
}

/** Keys of an entry that describe the printed stat block and are not a sheet's (the Engine does not read them). */
export const SOLO_TESTO = ['manuale', 'pagina', 'movimento', 'numero', 'tesoro', 'testo', 'controllo', 'difesa_senza_armatura'] as const;

/**
 * The entries of `mostri:` (inline in regole.yaml, then regole/mostri.yaml). An entry without an id is reported; a
 * repeated id is reported and the first one counts. The sheet keys themselves are checked when a sheet uses the entry.
 */
export function leggiMostri(liste: ReadonlyArray<{ v: unknown; dove: string }>, errori: string[]): Mostro[] {
  const out: Mostro[] = [];
  for (const { v, dove } of liste) {
    if (v === undefined || v === null) continue;
    if (!Array.isArray(v)) {
      errori.push(`${dove}: a list of monster entries ({id, nome, …})`);
      continue;
    }
    for (const [i, x] of v.entries()) {
      const o = ogg(x);
      const id = typeof o?.['id'] === 'string' && ID.test(o['id']) ? o['id'] : null;
      if (!o || !id) {
        errori.push(`${dove}[${i + 1}]: an id in snake_case`);
        continue;
      }
      if (out.some((m) => m.id === id)) {
        errori.push(`${dove}: monster id repeated «${id}»`);
        continue;
      }
      if (o['dadi_vita'] !== undefined && !leggiDadiVita(o['dadi_vita'])) errori.push(`${dove}.${id}.dadi_vita: «${String(o['dadi_vita'])}» is not hit dice like 3, "3+2", "1-1", "½", "2*"`);
      out.push({ id, nome: typeof o['nome'] === 'string' ? o['nome'] : id, dati: o });
    }
  }
  return out;
}

/** The bestiary file of a rule set's folder (regole/mostri.yaml), if any, as YAML. */
export function leggiFileMostri(cartella: string, errori: string[]): unknown {
  const file = path.join(cartella, 'mostri.yaml');
  if (!fs.existsSync(file)) return undefined;
  try {
    const d = YAML.parse(fs.readFileSync(file, 'utf8'));
    return ogg(d)?.['mostri'] ?? d;
  } catch (err) {
    errori.push(`regole/mostri.yaml: YAML non valido (${(err as Error).message})`);
    return undefined;
  }
}

/** An entry's keys as a sheet's raw keys: the printed-only fields dropped, the sheet's own keys laid over them. */
export function schedaConMostro(m: Mostro, scheda: D): D {
  const base: D = {};
  for (const [k, v] of Object.entries(m.dati)) if (k !== 'id' && k !== 'nome' && !(SOLO_TESTO as readonly string[]).includes(k)) base[k] = v;
  const out: D = { ...structuredClone(base), ...scheda };
  delete out['mostro'];
  return out;
}
