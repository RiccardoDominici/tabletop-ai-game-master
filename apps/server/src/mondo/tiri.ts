/**
 * Rolls of the world (docs/mondo.md §2, «Uncertain outcomes»): when the campaign leaves a world outcome to chance (an
 * `avanza_quando` gate with `tiro`: does the front advance, does the news spread), the AI never decides it; the Engine
 * rolls, Game Master side, hidden by default. This is the ONE hook for those rolls: the director passes it to the world
 * (MondoInGioco, option `tira`), and the Game Master roll path (prove/tiri-master.ts) is what the director passes.
 *
 * The world hands its own dice to the hook with every request: a campaign without sheets has no Engine dice, and the
 * world's dice are saved in its snapshot (seed and counter), so a resume replays them. The hook may use them or the
 * Engine's (saved with the checks' state); it never draws from a source nobody saves.
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

/**
 * A roll of the world: the request in, the outcome out. Never decided by a model. `dadiDelMondo` are the world's own
 * dice (saved in the world's snapshot): the hook rolls with them when it has no saved dice of its own.
 */
export type TiroDelMondo = (r: RichiestaTiroMondo, dadiDelMondo: FonteDadi) => EsitoTiroMondo;

/** The default hook: one die from the world's own dice (crypto, reproducible from seed and counter). */
export const tiroDelMondo: TiroDelMondo = (r, dadi) => {
  const valore = dadi.tira(r.dado);
  return { riuscito: valore >= r.almeno, valore, dado: r.dado, almeno: r.almeno, visibile: r.visibile };
};
