/**
 * The next roll a draft waits for (docs/creazione.md): the current step's, in the manual's order — each score's dice
 * (3d6 for Strength, then Intelligence…, Basic Fantasy p. 3), each level's hit die, the starting money. With manual rolls
 * the phone shows one box per die; with automatic rolls the Engine rolls them with the draft's own dice.
 */
import type { PassoCreazione } from '@tabletop-ai-gm/shared';
import { testo } from '../lingua';
import { metodo, nomeCaratteristica, passoCorrente, pfPerLivello, type Bozza, type CtxCreazione } from './bozza';

export interface ProssimoTiro {
  passo: PassoCreazione;
  numero: number;
  facce: number;
  bonus: number;
  /** What it is for, in the content language («Forza», «Punti ferita del 1° livello», «Monete»). */
  per: string;
  /** The characteristic the roll is for (scores in order), or null. */
  caratteristica: string | null;
  /** The level's index (hit points), else 0. */
  indice: number;
}

export function prossimoTiro(ctx: CtxCreazione, b: Bozza): ProssimoTiro | null {
  const p = passoCorrente(ctx, b);
  if (p === 'caratteristiche') {
    const m = metodo(ctx);
    if (m.tipo !== 'dadi' || b.base || b.tiriCaratteristiche.length >= ctx.s.caratteristiche.length) return null;
    const i = b.tiriCaratteristiche.length;
    const car = m.ordine === 'fisso' ? ctx.s.caratteristiche[i]!.id : null;
    return {
      passo: p,
      numero: m.dadi.numero,
      facce: m.dadi.facce,
      bonus: m.dadi.bonus,
      per: car ? nomeCaratteristica(ctx, car) : testo('creazione.tiri.punteggio', { n: i + 1, di: ctx.s.caratteristiche.length }),
      caratteristica: car,
      indice: i,
    };
  }
  if (p === 'punti_ferita') {
    const livelli = pfPerLivello(ctx, b);
    const i = livelli.findIndex((x, k) => x.tira && !b.dadiPf[k]);
    if (i < 0) return null;
    const x = livelli[i]!;
    return { passo: p, numero: 1, facce: x.dado!.facce, bonus: x.bonus, per: testo('creazione.tiri.punti_ferita', { livello: x.livello }), caratteristica: null, indice: i };
  }
  if (p === 'monete' && ctx.cr.monete && !b.dadiMonete) {
    const m = ctx.cr.monete;
    return { passo: p, numero: m.dadi.numero, facce: m.dadi.facce, bonus: m.dadi.bonus, per: testo('creazione.tiri.monete'), caratteristica: null, indice: 0 };
  }
  return null;
}
