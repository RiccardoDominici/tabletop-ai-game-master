/**
 * Load and movement of a rule set (mechanism M8 of docs/regole-audit/; docs/regole.md §2, «Carico e movimento»; Basic
 * Fantasy p. 42): what a character carries weighs (the catalog's weights, regole/catalogo.ts, and its coins), the load
 * band that weight falls in by its Strength score and race, and the movement rate its worn armor and that band give.
 *
 *   carico:
 *     unita: libbre
 *     caratteristica: forza                  # the score that sets the limits (the sheet's value, not its bonus)
 *     fasce: [{id: leggero, nome: "Carico leggero"}, {id: pesante, nome: "Carico pesante"}]   # beyond the last: overloaded
 *     limiti:                                # rows from the lowest score; one limit per band
 *       - {da: 3, valori: [25, 60]}
 *       - {da: 9, valori: [60, 150]}
 *     per_razza: {halfling: [{da: 3, valori: [20, 40]}]}   # races with their own rows
 *     peso_armatura: {halfling: 0.25}        # a race's armor weighs this fraction
 *   movimento:
 *     unita: metri
 *     per_turno: 3                           # exploring, a turn covers this many times the round's rate
 *     righe:                                 # by the worn armor's category (`nessuna` = no armor), one per band
 *       - {armatura: nessuna, valori: [12, 9]}
 *       - {armatura: metallo, valori: [6, 3]}
 */
import type { Voce } from './tipi';

export interface RigaCarico {
  da: number;
  valori: number[];
}

export interface RegolaCarico {
  unita: string;
  caratteristica: string;
  fasce: Voce[];
  limiti: RigaCarico[];
  perRazza: Record<string, RigaCarico[]>;
  pesoArmatura: Record<string, number>;
}

export interface RegolaMovimento {
  unita: string;
  perTurno: number | null;
  righe: Array<{ armatura: string; valori: number[] }>;
}

/** The id of the movement row for a character with no armor on. */
export const SENZA_ARMATURA = 'nessuna';

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ID = /^[a-z0-9_]+$/;

function righe(v: unknown, n: number, dove: string, errori: string[]): RigaCarico[] {
  if (!Array.isArray(v) || !v.length) {
    errori.push(`${dove}: rows {da: a score, valori: [one limit per band]}, from the lowest score`);
    return [];
  }
  const out: RigaCarico[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const valori = o?.['valori'];
    if (!o || !numero(o['da']) || !Array.isArray(valori) || valori.length !== n || !valori.every((y) => numero(y) && y > 0) || valori.some((y, k) => k > 0 && y <= valori[k - 1])) {
      errori.push(`${dove}[${i + 1}]: {da: a score, valori: ${n} growing limits, one per band}`);
      continue;
    }
    if (out.length && (o['da'] as number) <= out.at(-1)!.da) errori.push(`${dove}[${i + 1}]: «da» grows row after row`);
    out.push({ da: o['da'] as number, valori: valori as number[] });
  }
  return out;
}

export function leggiCarico(v: unknown, caratteristiche: ReadonlySet<string>, errori: string[]): RegolaCarico | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  const fasce: Voce[] = (Array.isArray(o?.['fasce']) ? (o!['fasce'] as unknown[]) : []).flatMap((x) => {
    const f = ogg(x);
    return f && typeof f['id'] === 'string' && ID.test(f['id']) ? [{ id: f['id'], nome: typeof f['nome'] === 'string' ? f['nome'] : f['id'] }] : [];
  });
  const car = typeof o?.['caratteristica'] === 'string' ? o['caratteristica'] : null;
  if (!o || !fasce.length || typeof o['unita'] !== 'string' || !car) {
    errori.push('carico: {unita, caratteristica, fasce: [{id, nome}], limiti: [{da, valori}], per_razza, peso_armatura}');
    return null;
  }
  if (!caratteristiche.has(car)) errori.push(`carico.caratteristica: «${car}» is not a characteristic of the set`);
  const perRazza: Record<string, RigaCarico[]> = {};
  for (const [r, l] of Object.entries(ogg(o['per_razza']) ?? {})) perRazza[r] = righe(l, fasce.length, `carico.per_razza.${r}`, errori);
  const pesoArmatura: Record<string, number> = {};
  for (const [r, f] of Object.entries(ogg(o['peso_armatura']) ?? {})) {
    if (numero(f) && f > 0) pesoArmatura[r] = f;
    else errori.push(`carico.peso_armatura.${r}: a fraction like 0.25`);
  }
  return { unita: o['unita'], caratteristica: car, fasce, limiti: righe(o['limiti'], fasce.length, 'carico.limiti', errori), perRazza, pesoArmatura };
}

export function leggiMovimento(v: unknown, bande: number | null, errori: string[]): RegolaMovimento | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  if (!o || typeof o['unita'] !== 'string' || !Array.isArray(o['righe']) || !o['righe'].length) {
    errori.push('movimento: {unita, per_turno, righe: [{armatura: a category of the catalog or nessuna, valori: [one per load band]}]}');
    return null;
  }
  const out: RegolaMovimento['righe'] = [];
  for (const [i, x] of (o['righe'] as unknown[]).entries()) {
    const r = ogg(x);
    const valori = r?.['valori'];
    if (!r || typeof r['armatura'] !== 'string' || !Array.isArray(valori) || !valori.every((y) => numero(y) && y >= 0) || (bande !== null && valori.length !== bande)) {
      errori.push(`movimento.righe[${i + 1}]: {armatura, valori: ${bande ?? 'n'} rates, one per load band}`);
      continue;
    }
    out.push({ armatura: r['armatura'], valori: valori as number[] });
  }
  const perTurno = o['per_turno'] === undefined ? null : numero(o['per_turno']) && (o['per_turno'] as number) > 0 ? (o['per_turno'] as number) : (errori.push('movimento.per_turno: a number'), null);
  return { unita: o['unita'], perTurno, righe: out };
}

/** The load limits of a score for a race: the race's own rows, else the set's; the highest row with `da` ≤ the score. */
export function limitiDi(c: RegolaCarico, punteggio: number, razza: string | null | undefined): number[] {
  const tabella = (razza && c.perRazza[razza]) || c.limiti;
  let riga = tabella[0];
  for (const r of tabella) if (punteggio >= r.da) riga = r;
  return riga?.valori ?? [];
}

/** The band a weight falls in: its index, or the number of bands (overloaded) when it is above the last limit. */
export function fasciaDi(limiti: readonly number[], peso: number): number {
  const i = limiti.findIndex((l) => peso <= l + 1e-9);
  return i === -1 ? limiti.length : i;
}

/** The movement rate for the worn armor's category and the load band; 0 when overloaded; null without a row. */
export function movimentoDi(m: RegolaMovimento, categoria: string | null, fascia: number): number | null {
  const riga = m.righe.find((r) => r.armatura === (categoria ?? SENZA_ARMATURA)) ?? m.righe.find((r) => r.armatura === SENZA_ARMATURA);
  if (!riga) return null;
  return fascia >= riga.valori.length ? 0 : riga.valori[fascia]!;
}
