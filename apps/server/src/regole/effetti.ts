/**
 * Typed effects of a rule set (docs/regole.md §2, «Effetti tipati»; mechanism M4 of docs/regole-audit/): what a spell, a
 * potion, a trap, a fall, a poison, a monster's special or a rest DOES to a sheet, as data from a closed list. The
 * Engine applies them (prove/effetti.ts) with a card, the way it applies an attack's damage; nothing here is decided by
 * a model.
 *
 *   effetti:
 *     - {tipo: danno, dadi: "1d6+1", colpi: {ogni_livelli: 3, massimo: 5}}        # magic missile: one more every 3 levels
 *     - {tipo: danno, dadi: "1d6", dadi_per_livello: {massimo: 10}}              # 1d6 per caster level
 *     - {tipo: cura, dadi: "1d6+1"}
 *     - {tipo: caduta, altezza: 20}                                              # the set's falling table (`cadute`)
 *     - {tipo: attacco, bonus: 1, dadi: "1d6+1"}                                 # a trap that attacks like a monster
 *     - {tipo: condizione, condizione: addormentato, durata: {round_per_livello: 5}, finisce_se_ferito: true}
 *     - {tipo: bonus, a: difesa, valore: 3, contro: mischia, durata: {round: 5, round_per_livello: 1}}
 *     - {tipo: immunita, a: [dardo_incantato], durata: {round: 5}}
 *     - {tipo: stabilizza}                                                       # binding wounds: a dying PC is stable
 *     - {tipo: morte}                                                            # save or die (poison)
 *     - {tipo: oggetto, oggetto: corda, quante: 1}                               # a catalog item found (−1: lost)
 *     - {tipo: monete, monete: {mo: 20}}                                         # coins found (negative: paid)
 *
 * Durations: `istantanea` (default for damage and healing), `{round: N | "XdY", round_per_livello: k}`, a unit of the
 * set's clock (`{turno: "2d8"}`; `{turni: …}` is the unit `turno`; without that unit it lasts the scene), `scena` (until
 * the scene changes), `riposo` (until the next rest) or `permanente` (until the Game Master removes it). Rounds tick on
 * the game clock (prove/tempo.ts): each round of a fight, and what each closed window outside one costs.
 */
import { leggiFormula, type FormulaDadi } from '../campagna/regole-srd';

/** How a number grows with the caster's level: every `ogni` levels one more, at most `massimo`. */
export interface Scala {
  ogni: number;
  massimo: number | null;
}

export type Durata =
  | { tipo: 'istantanea' }
  | { tipo: 'round'; dadi: FormulaDadi; perLivello: number }
  /** In units of the set's clock (`{turno: "2d8"}`; the old `{turni: …}` is the unit `turno`): turned into rounds when given. */
  | { tipo: 'tempo'; unita: string; dadi: FormulaDadi }
  | { tipo: 'scena' }
  | { tipo: 'riposo' }
  | { tipo: 'permanente' };

/** The closed list of effect kinds (docs/regole.md §2). */
export const TIPI_EFFETTO = ['danno', 'cura', 'caduta', 'attacco', 'condizione', 'bonus', 'immunita', 'stabilizza', 'morte', 'oggetto', 'monete'] as const;
export type TipoEffetto = (typeof TIPI_EFFETTO)[number];

/** What a temporary bonus adds to: Armor Class, attack rolls, saving throws, damage. */
export const BERSAGLI_BONUS = ['difesa', 'attacchi', 'salvezze', 'danni'] as const;
export type BersaglioBonus = (typeof BERSAGLI_BONUS)[number];

export type EffettoTipato =
  /** `pariAiPf`: the damage is the author's current hit points instead of the dice (a breath in some manuals). */
  | { tipo: 'danno'; dadi: FormulaDadi; dadiPerLivello: Scala | null; bonusPerLivello: Scala | null; colpi: Scala | null; tipoDanno: string | null; pariAiPf?: boolean }
  | { tipo: 'cura'; dadi: FormulaDadi; dadiPerLivello: Scala | null; bonusPerLivello: Scala | null }
  | { tipo: 'caduta'; altezza: number }
  | { tipo: 'attacco'; bonus: number; dadi: FormulaDadi; distanza: boolean }
  | { tipo: 'condizione'; condizione: string; durata: Durata; finisceSeFerito: boolean }
  | { tipo: 'bonus'; a: BersaglioBonus; valore: number; contro: 'tutti' | 'mischia' | 'distanza'; durata: Durata }
  | { tipo: 'immunita'; a: string[]; durata: Durata }
  | { tipo: 'stabilizza' }
  | { tipo: 'morte' }
  /** A catalog item gained (quante > 0: a chest's rope) or lost (< 0) by the target (prove/inventario.ts). */
  | { tipo: 'oggetto'; oggetto: string; quante: number }
  /** Coins gained (a reward) or paid (negative: their worth, with change) by the target. */
  | { tipo: 'monete'; monete: Record<string, number> };

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null);
const ID = /^[a-z0-9_]+$/;

function scala(v: unknown, dove: string, errori: string[]): Scala | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  const ogni = o ? (o['ogni_livelli'] === undefined ? 1 : intero(o['ogni_livelli'])) : null;
  const massimo = o && o['massimo'] !== undefined ? intero(o['massimo']) : null;
  if (!o || ogni === null || ogni < 1 || (o['massimo'] !== undefined && (massimo === null || massimo < 1))) {
    errori.push(`${dove}: {ogni_livelli: n ≥ 1, massimo: n ≥ 1} (both optional)`);
    return null;
  }
  return { ogni, massimo };
}

/** A duration as the set writes it. `predefinita` when the key is missing. */
export function leggiDurata(v: unknown, dove: string, errori: string[], predefinita: Durata = { tipo: 'istantanea' }): Durata {
  if (v === undefined || v === null) return predefinita;
  if (v === 'istantanea' || v === 'scena' || v === 'riposo' || v === 'permanente') return { tipo: v };
  const o = ogg(v);
  // A duration in a unit of the set's clock: {turni: 3} (the unit `turno`) or {<unit id>: amount}. Without a clock that
  // has the unit, the Engine lets it last the scene (prove/attivi.ts).
  const unita = o ? Object.keys(o).filter((k) => k !== 'round' && k !== 'round_per_livello') : [];
  if (o && unita.length === 1 && o['round'] === undefined && o['round_per_livello'] === undefined) {
    const k = unita[0]!;
    const dadi = leggiFormula(o[k]);
    if (!dadi || !ID.test(k)) {
      errori.push(`${dove}.${k}: an amount, a number or a formula like 2d8`);
      return predefinita;
    }
    return { tipo: 'tempo', unita: k === 'turni' ? 'turno' : k, dadi };
  }
  if (o && (o['round'] !== undefined || o['round_per_livello'] !== undefined)) {
    const dadi = o['round'] === undefined ? { numero: 0, facce: 0, bonus: 0 } : leggiFormula(o['round']);
    const perLivello = o['round_per_livello'] === undefined ? 0 : intero(o['round_per_livello']);
    if (!dadi || perLivello === null || perLivello < 0) {
      errori.push(`${dove}: round is a number or a formula like 1d4, round_per_livello a whole number`);
      return predefinita;
    }
    return { tipo: 'round', dadi, perLivello };
  }
  errori.push(`${dove}: istantanea, scena, riposo, permanente, {round: …, round_per_livello: …} or {turni: …}`);
  return predefinita;
}

/** One typed effect; null (with an error) when it is not one of the closed list. */
export function leggiEffetto(v: unknown, dove: string, errori: string[]): EffettoTipato | null {
  const o = ogg(v);
  const tipo = o?.['tipo'];
  if (!o || !(TIPI_EFFETTO as readonly unknown[]).includes(tipo)) {
    errori.push(`${dove}: tipo one of ${TIPI_EFFETTO.join(', ')}`);
    return null;
  }
  const formula = (k = 'dadi'): FormulaDadi | null => {
    const f = leggiFormula(o[k]);
    if (!f) errori.push(`${dove}.${k}: a dice formula like 1d6+1 (or a whole number)`);
    return f;
  };
  switch (tipo as TipoEffetto) {
    case 'danno': {
      // `pari_ai_pf: true`: as much damage as the author's current hit points (no dice).
      if (o['pari_ai_pf'] !== undefined && typeof o['pari_ai_pf'] !== 'boolean') errori.push(`${dove}.pari_ai_pf: true o false`);
      const pari = o['pari_ai_pf'] === true;
      const dadi = pari && o['dadi'] === undefined ? { numero: 0, facce: 0, bonus: 0 } : formula();
      if (!dadi) return null;
      return { tipo: 'danno', dadi, dadiPerLivello: scala(o['dadi_per_livello'], `${dove}.dadi_per_livello`, errori), bonusPerLivello: scala(o['bonus_per_livello'], `${dove}.bonus_per_livello`, errori), colpi: scala(o['colpi'], `${dove}.colpi`, errori), tipoDanno: typeof o['tipo_danno'] === 'string' ? o['tipo_danno'] : null, ...(pari ? { pariAiPf: true } : {}) };
    }
    case 'cura': {
      const dadi = formula();
      if (!dadi) return null;
      return { tipo: 'cura', dadi, dadiPerLivello: scala(o['dadi_per_livello'], `${dove}.dadi_per_livello`, errori), bonusPerLivello: scala(o['bonus_per_livello'], `${dove}.bonus_per_livello`, errori) };
    }
    case 'caduta': {
      const altezza = typeof o['altezza'] === 'number' && o['altezza'] >= 0 ? o['altezza'] : null;
      if (altezza === null) {
        errori.push(`${dove}.altezza: the height fallen, in the unit of the set's falling table (cadute.unita)`);
        return null;
      }
      return { tipo: 'caduta', altezza };
    }
    case 'attacco': {
      const dadi = formula();
      const bonus = o['bonus'] === undefined ? 0 : intero(o['bonus']);
      if (bonus === null) errori.push(`${dove}.bonus: a whole number (the trap's attack bonus)`);
      if (!dadi || bonus === null) return null;
      return { tipo: 'attacco', bonus, dadi, distanza: o['distanza'] === true };
    }
    case 'condizione': {
      const condizione = typeof o['condizione'] === 'string' && ID.test(o['condizione']) ? o['condizione'] : null;
      if (!condizione) {
        errori.push(`${dove}.condizione: the id of one of the set's conditions (combattimento.condizioni)`);
        return null;
      }
      return { tipo: 'condizione', condizione, durata: leggiDurata(o['durata'], `${dove}.durata`, errori, { tipo: 'scena' }), finisceSeFerito: o['finisce_se_ferito'] === true };
    }
    case 'bonus': {
      const a = o['a'];
      const valore = intero(o['valore']);
      const contro = o['contro'] === undefined ? 'tutti' : o['contro'];
      if (!(BERSAGLI_BONUS as readonly unknown[]).includes(a)) errori.push(`${dove}.a: ${BERSAGLI_BONUS.join(', ')}`);
      if (valore === null || valore === 0) errori.push(`${dove}.valore: a whole number, not 0`);
      if (contro !== 'tutti' && contro !== 'mischia' && contro !== 'distanza') errori.push(`${dove}.contro: tutti, mischia or distanza`);
      if (!(BERSAGLI_BONUS as readonly unknown[]).includes(a) || valore === null || valore === 0 || (contro !== 'tutti' && contro !== 'mischia' && contro !== 'distanza')) return null;
      return { tipo: 'bonus', a: a as BersaglioBonus, valore, contro, durata: leggiDurata(o['durata'], `${dove}.durata`, errori, { tipo: 'scena' }) };
    }
    case 'immunita': {
      const a = Array.isArray(o['a']) ? o['a'].filter((x): x is string => typeof x === 'string' && ID.test(x)) : [];
      if (!a.length) {
        errori.push(`${dove}.a: a list of ids (powers or conditions the target becomes immune to)`);
        return null;
      }
      return { tipo: 'immunita', a, durata: leggiDurata(o['durata'], `${dove}.durata`, errori, { tipo: 'scena' }) };
    }
    case 'stabilizza':
      return { tipo: 'stabilizza' };
    case 'morte':
      return { tipo: 'morte' };
    case 'oggetto': {
      const oggetto = typeof o['oggetto'] === 'string' && ID.test(o['oggetto']) ? o['oggetto'] : null;
      const quante = o['quante'] === undefined ? 1 : intero(o['quante']);
      if (!oggetto || quante === null || quante === 0) {
        errori.push(`${dove}: {tipo: oggetto, oggetto: an id of the set's catalog, quante: a whole number, negative to lose it}`);
        return null;
      }
      return { tipo: 'oggetto', oggetto, quante };
    }
    case 'monete': {
      const m = ogg(o['monete']);
      if (!m || !Object.keys(m).length || !Object.entries(m).every(([k, n]) => ID.test(k) && intero(n) !== null && n !== 0)) {
        errori.push(`${dove}: {tipo: monete, monete: {coin id: amount}} (negative to pay)`);
        return null;
      }
      return { tipo: 'monete', monete: m as Record<string, number> };
    }
  }
}

/** A list of typed effects (`effetti:` of a power, of a scene check, of a rest). */
export function leggiEffetti(v: unknown, dove: string, errori: string[]): EffettoTipato[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push(`${dove}: a list of effects`);
    return [];
  }
  return v.flatMap((x, i) => {
    const e = leggiEffetto(x, `${dove}[${i + 1}]`, errori);
    return e ? [e] : [];
  });
}

/** How many of something at a caster level: one more every `ogni` levels (`colpi` start at 1 at level 1), capped. */
export function perLivello(s: Scala, livello: number, daUno = false): number {
  const n = daUno ? 1 + Math.floor((Math.max(1, livello) - 1) / s.ogni) : Math.floor(Math.max(0, livello) / s.ogni);
  return s.massimo === null ? n : Math.min(s.massimo, n);
}

/** The dice of a damage or healing effect at a caster level: base dice × level (if scaled), plus a bonus per level. */
export function formulaAlLivello(e: Extract<EffettoTipato, { tipo: 'danno' | 'cura' }>, livello: number): FormulaDadi {
  const numero = e.dadiPerLivello ? Math.max(1, perLivello(e.dadiPerLivello, livello)) * e.dadi.numero : e.dadi.numero;
  const bonus = e.dadi.bonus + (e.bonusPerLivello ? perLivello(e.bonusPerLivello, livello) : 0);
  return { numero, facce: e.dadi.facce, bonus };
}

/** The condition ids a list of effects refers to (the loader checks they are the set's). */
export function condizioniCitate(effetti: readonly EffettoTipato[]): string[] {
  return effetti.flatMap((e) => (e.tipo === 'condizione' ? [e.condizione] : []));
}
