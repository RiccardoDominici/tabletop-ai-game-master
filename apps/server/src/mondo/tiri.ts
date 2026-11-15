/**
 * Rolls of the world (docs/mondo.md §2, «Uncertain outcomes»): when the campaign leaves a world outcome to chance (an
 * `avanza_quando` gate with `tiro`: does the front advance, does the news spread), the AI never decides it; the Engine
 * rolls, Game Master side, hidden by default. This is the ONE hook for those rolls: the director passes it to the world
 * (MondoInGioco, option `tira`), and the Game Master roll path (prove/) can replace it with its own function.
 */
import type { FonteDadi } from '../prove/dadi';

export interface RichiestaTiroMondo {
  /** What asks for the roll: the gate key («o_x#2»). */
  origine: string;
  /** Why, for the log and the Game Master («o_piena: lascia_scena»). */
  motivo: string;
  turno: number;
  /** Faces of the die (2–100). */
  dado: number;
  /** Success on this value or higher. */
  almeno: number;
  /** The campaign asks to show the roll at the table (default: hidden, Game Master only). */
  visibile: boolean;
}

export interface EsitoTiroMondo {
  riuscito: boolean;
  valore: number;
  dado: number;
  almeno: number;
  visibile: boolean;
}

/** A roll of the world: the request in, the outcome out. Never decided by a model. */
export type TiroDelMondo = (r: RichiestaTiroMondo) => EsitoTiroMondo;

/** The default hook: one die from the Engine's dice source (crypto, reproducible from seed and counter). */
export function tiroDelMondo(dadi: FonteDadi): TiroDelMondo {
  return (r) => {
    const valore = dadi.tira(r.dado);
    return { riuscito: valore >= r.almeno, valore, dado: r.dado, almeno: r.almeno, visibile: r.visibile };
  };
}
