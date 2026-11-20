/**
 * Per-character resources of a rule set (docs/regole.md §2, «Risorse»; mechanism M3 of docs/regole-audit/): counters the
 * manual keeps — ammunition, money, uses per day — with what refreshes them, plus how spells are prepared. The counts
 * live in the Engine state (prove/risorse.ts) and the session snapshot; the sheet gives the starting values.
 *
 *   risorse:
 *     - {id: frecce, nome: "Frecce", ricarica: mai}        # ricarica: mai | riposo | scontro
 *     - {id: monete, nome: "Monete d'oro", ricarica: mai}
 *   magia: {preparazione: vanciana}                         # vanciana (Basic Fantasy: each prepared copy is one cast)
 *                                                           # | slot (the sheet's spells are known; a cast spends a slot)
 *
 * Spell slots by spell level come from the class table (`classi[].incantesimi_al_giorno`, regole/classi.ts) or the
 * sheet's `slot` (an NPC caster); they come back with a rest that refreshes (`riposo[].ricarica`).
 */
import type { Voce } from './tipi';

export const RICARICHE = ['mai', 'riposo', 'scontro'] as const;
export type Ricarica = (typeof RICARICHE)[number];

export interface Risorsa extends Voce {
  ricarica: Ricarica;
}

export interface Magia {
  /** `vanciana`: each prepared copy is one cast, gone until the next rest; `slot`: known spells, a slot per cast. */
  preparazione: 'vanciana' | 'slot';
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const ID = /^[a-z0-9_]+$/;

export function leggiRisorse(v: unknown, errori: string[]): Risorsa[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push('risorse: a list of {id, nome, ricarica}');
    return [];
  }
  const out: Risorsa[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const id = typeof o?.['id'] === 'string' && ID.test(o['id']) ? o['id'] : null;
    const ricarica = o?.['ricarica'] ?? 'mai';
    if (!o || !id || !(RICARICHE as readonly unknown[]).includes(ricarica)) {
      errori.push(`risorse[${i + 1}]: {id: snake_case, nome, ricarica: ${RICARICHE.join(' | ')}}`);
      continue;
    }
    if (out.some((r) => r.id === id)) errori.push(`risorse: id repeated «${id}»`);
    out.push({ id, nome: typeof o['nome'] === 'string' ? o['nome'] : id, ricarica: ricarica as Ricarica });
  }
  return out;
}

export function leggiMagia(v: unknown, errori: string[]): Magia | null {
  if (v === undefined || v === null) return null;
  const p = ogg(v)?.['preparazione'];
  if (p !== 'vanciana' && p !== 'slot') {
    errori.push('magia.preparazione: vanciana or slot');
    return null;
  }
  return { preparazione: p };
}
