/**
 * Health rules of a rule set beyond the fight (docs/regole.md §2): the falling-damage table and the kinds of rest. The
 * Engine applies them (prove/effetti.ts for a fall, prove/riposo.ts for a rest), so hit points change through every
 * source the manual names, not only attacks (audit gap 1, docs/regole-audit/basic-fantasy-gioco.md P5-50, P5-53).
 *
 *   cadute: {dadi: "1d6", ogni: 10, unita: "piedi", arrotonda: vicino, massimo: 20}
 *   riposo:
 *     - {id: notte, nome: "Una notte di sonno", cura: 1}        # cura: a whole number, a formula, or tutti
 *     - {id: a_letto, nome: "Un giorno a letto", cura: 2, ricarica: false}
 *
 * `arrotonda: vicino` rounds the height to the nearest step (Basic Fantasy p. 59: 1–4 feet nothing, 5–14 feet 1d6);
 * `giu` drops the part of a step (SRD 5.2: 1d6 for every full 10 feet). A rest's `ricarica` (default true) refreshes
 * the resources and spell slots that come back with rest (prove/risorse.ts).
 */
import { leggiFormula, type FormulaDadi } from '../campagna/regole-srd';

export interface RegolaCadute {
  /** Dice for each step of height. */
  dadi: FormulaDadi;
  /** Height of one step, in `unita`. */
  ogni: number;
  /** The unit of the heights, as the set writes them («piedi», «metri»): said on the card. */
  unita: string;
  arrotonda: 'vicino' | 'giu';
  /** At most this many steps of dice (null = no cap). */
  massimo: number | null;
}

export interface TipoRiposo {
  id: string;
  nome: string;
  /** Hit points each character recovers: a number, a formula rolled for each, or every one (`tutti`). */
  cura: { tipo: 'punti'; dadi: FormulaDadi } | { tipo: 'tutti' };
  /** The rest refreshes the resources that come back with rest (spell slots, uses per day). */
  ricarica: boolean;
  /** How long it takes, in seconds of the game clock (`durata: {ora: 8}`, read with the set's `tempo`); null = no time. */
  durata?: number | null;
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);

export function leggiCadute(v: unknown, errori: string[]): RegolaCadute | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  const dadi = leggiFormula(o?.['dadi']);
  const ogni = typeof o?.['ogni'] === 'number' && o['ogni'] > 0 ? o['ogni'] : null;
  const arrotonda = o?.['arrotonda'] === undefined ? 'vicino' : o['arrotonda'];
  const massimo = o?.['massimo'] === undefined ? null : typeof o['massimo'] === 'number' && Number.isInteger(o['massimo']) && o['massimo'] > 0 ? o['massimo'] : NaN;
  if (!o || !dadi || ogni === null || (arrotonda !== 'vicino' && arrotonda !== 'giu') || Number.isNaN(massimo)) {
    errori.push('cadute: {dadi: "1d6", ogni: 10, unita: "piedi", arrotonda: vicino | giu, massimo: 20}');
    return null;
  }
  return { dadi, ogni, unita: typeof o['unita'] === 'string' ? o['unita'] : '', arrotonda, massimo: massimo as number | null };
}

export function leggiRiposo(v: unknown, errori: string[]): TipoRiposo[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push('riposo: a list of {id, nome, cura}');
    return [];
  }
  const out: TipoRiposo[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const id = typeof o?.['id'] === 'string' && /^[a-z0-9_]+$/.test(o['id']) ? o['id'] : null;
    const cura = o?.['cura'] === 'tutti' ? ({ tipo: 'tutti' } as const) : (() => {
      const f = leggiFormula(o?.['cura'] ?? 0);
      return f ? ({ tipo: 'punti', dadi: f } as const) : null;
    })();
    if (!o || !id || !cura) {
      errori.push(`riposo[${i + 1}]: {id: snake_case, nome, cura: a number, a formula or tutti}`);
      continue;
    }
    if (out.some((r) => r.id === id)) errori.push(`riposo: id repeated «${id}»`);
    out.push({ id, nome: typeof o['nome'] === 'string' ? o['nome'] : id, cura, ricarica: o['ricarica'] !== false });
  }
  return out;
}

/** How many steps of dice a fall of `altezza` deals by the set's table (0 = no damage). */
export function passiCaduta(r: RegolaCadute, altezza: number): number {
  const q = Math.max(0, altezza) / r.ogni;
  const n = r.arrotonda === 'giu' ? Math.floor(q + 1e-9) : Math.round(q);
  return r.massimo === null ? n : Math.min(r.massimo, n);
}
