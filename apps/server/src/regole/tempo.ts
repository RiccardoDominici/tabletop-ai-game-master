/**
 * Game time of a rule set (docs/regole.md §2, «Tempo»; audit P4-01; Basic Fantasy p. 42: a turn is ten minutes, a combat
 * round ten seconds): the units the manual counts time in, which one is a fight's round, what a closed window of the
 * table costs outside a fight (exploring: a turn), the actions that take longer, and the hour the session starts at. The
 * Engine's clock (prove/tempo.ts) counts seconds and reads durations in these units.
 *
 *   tempo:
 *     unita:                                    # from the smallest
 *       - {id: round, nome: "Round", plurale: "round", secondi: 10}
 *       - {id: turno, nome: "Turno", plurale: "turni", secondi: 600}
 *       - {id: ora, nome: "Ora", plurale: "ore", secondi: 3600}
 *       - {id: giorno, nome: "Giorno", plurale: "giorni", secondi: 86400}
 *     round: round                              # the unit of a fight's round
 *     per_finestra: {turno: 1}                  # a closed window outside a fight
 *     azioni:                                   # optional: actions that take longer (words of the action)
 *       - {parole: [cerco trappole, perquisisco], durata: {turno: 1}}
 *     inizio: {ora: 18}                         # optional: the time of day the session starts at (day 1)
 *
 * A set without `tempo` keeps the rule from before the clock: a closed window outside a fight is one round.
 */
import { leggiFormula, type FormulaDadi } from '../campagna/regole-srd';

export interface UnitaTempo {
  id: string;
  nome: string;
  plurale: string;
  secondi: number;
}

export interface RegolaTempo {
  unita: UnitaTempo[];
  /** The unit of a fight's round. */
  round: string;
  /** Seconds a closed window outside a fight costs. */
  perFinestra: number;
  /** Actions that take longer than a window: their words and their seconds. */
  azioni: Array<{ parole: string[]; secondi: number }>;
  /** Seconds after midnight of day 1 at which the session starts. */
  inizio: number;
  /**
   * The clock is shown and told (panel, phone, the narrator's «ora è …»). False for a set that has round and rest
   * lengths but no window rule or start hour (the SRD 5.2): its durations count, its time of day would mean nothing.
   */
  mostra?: boolean;
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const ID = /^[a-z0-9_]+$/;

/** A duration written as {unit: amount, …} in seconds; null with an error when a unit or an amount is wrong. */
export function secondiDi(unita: readonly UnitaTempo[], v: unknown, dove: string, errori: string[]): number | null {
  const o = ogg(v);
  if (!o || !Object.keys(o).length) {
    errori.push(`${dove}: a duration {unit of tempo.unita: amount}, e.g. {turno: 1}`);
    return null;
  }
  let s = 0;
  for (const [k, n] of Object.entries(o)) {
    const u = unita.find((x) => x.id === k);
    if (!u || typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
      errori.push(`${dove}.${k}: ${u ? 'a number from 0' : `«${k}» is not a unit of tempo.unita`}`);
      return null;
    }
    s += n * u.secondi;
  }
  return Math.round(s);
}

export function leggiTempo(v: unknown, errori: string[]): RegolaTempo | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  const unita: UnitaTempo[] = [];
  for (const [i, x] of (Array.isArray(o?.['unita']) ? (o!['unita'] as unknown[]) : []).entries()) {
    const u = ogg(x);
    const id = typeof u?.['id'] === 'string' && ID.test(u['id']) ? u['id'] : null;
    const secondi = u?.['secondi'];
    if (!u || !id || typeof secondi !== 'number' || !Number.isInteger(secondi) || secondi < 1) {
      errori.push(`tempo.unita[${i + 1}]: {id, nome, plurale, secondi: a whole number ≥ 1}`);
      continue;
    }
    if (unita.length && secondi <= unita.at(-1)!.secondi) errori.push(`tempo.unita[${i + 1}]: from the smallest unit up`);
    const nome = typeof u['nome'] === 'string' ? u['nome'] : id;
    unita.push({ id, nome, plurale: typeof u['plurale'] === 'string' ? u['plurale'] : nome, secondi });
  }
  if (!o || !unita.length) {
    errori.push('tempo: {unita: [{id, nome, plurale, secondi}], round, per_finestra, azioni, inizio}');
    return null;
  }
  const round = typeof o['round'] === 'string' ? o['round'] : unita[0]!.id;
  if (!unita.some((u) => u.id === round)) errori.push(`tempo.round: «${round}» is not a unit of tempo.unita`);
  const perFinestra = o['per_finestra'] === undefined ? (unita.find((u) => u.id === round)?.secondi ?? unita[0]!.secondi) : (secondiDi(unita, o['per_finestra'], 'tempo.per_finestra', errori) ?? unita[0]!.secondi);
  const azioni: RegolaTempo['azioni'] = [];
  for (const [i, x] of (Array.isArray(o['azioni']) ? (o['azioni'] as unknown[]) : []).entries()) {
    const a = ogg(x);
    const parole = Array.isArray(a?.['parole']) ? (a!['parole'] as unknown[]).filter((p): p is string => typeof p === 'string' && !!p.trim()) : [];
    const secondi = a ? secondiDi(unita, a['durata'], `tempo.azioni[${i + 1}].durata`, errori) : null;
    if (!parole.length || secondi === null) {
      errori.push(`tempo.azioni[${i + 1}]: {parole: [words of the action], durata: {unit: amount}}`);
      continue;
    }
    azioni.push({ parole, secondi });
  }
  // The day's units are physical (60, 3600, 86400 seconds): `inizio` may use the set's units or ora/minuto plainly.
  const inizio = o['inizio'] === undefined ? 0 : (secondiDi([...unita, { id: 'ora', nome: 'ora', plurale: 'ore', secondi: 3600 }, { id: 'minuto', nome: 'minuto', plurale: 'minuti', secondi: 60 }].filter((u, i, l) => l.findIndex((y) => y.id === u.id) === i), o['inizio'], 'tempo.inizio', errori) ?? 0);
  return { unita, round, perFinestra, azioni, inizio };
}

/** The seconds of one unit (null if the set has no such unit). */
export function secondiUnita(t: RegolaTempo, id: string): number | null {
  return t.unita.find((u) => u.id === id)?.secondi ?? null;
}

/** A light's or an effect's duration in a unit, as a formula («1d4+4» turns): its seconds once rolled by `tira`. */
export function durataInSecondi(t: RegolaTempo, unita: string, f: FormulaDadi, tira: (f: FormulaDadi) => number): number | null {
  const s = secondiUnita(t, unita);
  return s === null ? null : Math.max(1, tira(f)) * s;
}

/** A formula or a number as the set writes a duration amount. */
export function quantita(v: unknown): FormulaDadi | null {
  return leggiFormula(v);
}

/**
 * Overland travel (Basic Fantasy p. 45): distance per day from the encounter movement (`per_movimento` × the round's
 * rate: 40' → 24 miles), times the terrain's factor; the group goes at its slowest member's rate.
 *
 *   viaggio:
 *     unita: miglia
 *     per_movimento: 2                     # per unit of movement.unita (12 m → 24 miles)
 *     ore_al_giorno: 8                     # the travel day
 *     terreni: [{id: strada, nome: "Strada lastricata", per: 1.333}, {id: montagna, nome: "Montagna", per: 0.333}]
 */
export interface RegolaViaggio {
  unita: string;
  perMovimento: number;
  oreAlGiorno: number;
  terreni: Array<{ id: string; nome: string; per: number }>;
}

export function leggiViaggio(v: unknown, errori: string[]): RegolaViaggio | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;
  const terreni = (Array.isArray(o?.['terreni']) ? (o!['terreni'] as unknown[]) : []).flatMap((x, i) => {
    const t = ogg(x);
    if (t && typeof t['id'] === 'string' && ID.test(t['id']) && num(t['per'])) return [{ id: t['id'], nome: typeof t['nome'] === 'string' ? t['nome'] : t['id'], per: t['per'] }];
    errori.push(`viaggio.terreni[${i + 1}]: {id, nome, per: the terrain's factor}`);
    return [];
  });
  if (!o || typeof o['unita'] !== 'string' || !num(o['per_movimento']) || !num(o['ore_al_giorno']) || !terreni.length) {
    errori.push('viaggio: {unita, per_movimento, ore_al_giorno, terreni: [{id, nome, per}]}');
    return null;
  }
  return { unita: o['unita'], perMovimento: o['per_movimento'], oreAlGiorno: o['ore_al_giorno'], terreni };
}
