/**
 * Stall moves S1 → S2 → S3 (docs/mondo.md §5, manual «Stall», E12). A stall is a closed window without actions,
 * outside a fight (there an empty window is the NPCs' turn). The counter grows on consecutive stalls and goes back
 * to zero on a turn with an action or a scene change. Level ((n − 1) mod 3) + 1:
 * - S1 a soft move of an active front (its moves and visible signs as material); from the fourth stall on, S1 also
 *   owes a mark to that danger's clock (a soft move ignored: the world moves);
 * - S2 a proactive clue: first a clue offered by a consequence, else one not yet revealed of the scene;
 * - S3 an NPC present, or a memory, sums up 2–3 concrete leads from what the PCs know.
 * Never an empty «cosa fate?»: each level carries material. Pure choice: the director supplies the context.
 */
import type { PericoloMondo } from '../campagna/mondo';

export type LivelloStallo = 1 | 2 | 3;

export function livelloStallo(n: number): LivelloStallo {
  return (((Math.max(1, n) - 1) % 3) + 1) as LivelloStallo;
}

/** From the fourth stall on, S1 is «hard»: it owes a mark to the danger's clock. */
export function stalloDuro(n: number): boolean {
  return n > 3 && livelloStallo(n) === 1;
}

/** Consecutive stalls (saved in the snapshot). */
export class ContatoreStallo {
  n = 0;

  /** A closed window: returns the stall number (1, 2, …) or 0 if it is not a stall. */
  registra(senzaAzioni: boolean, inCombattimento: boolean): number {
    if (!senzaAzioni) {
      this.n = 0;
      return 0;
    }
    if (inCombattimento) return 0;
    this.n += 1;
    return this.n;
  }

  azzera(): void {
    this.n = 0;
  }
}

/** What the director knows when choosing the move. */
export interface ContestoStallo {
  pericoli: readonly PericoloMondo[];
  /** Clocks active in the scene and still running (not full, started). */
  orologiAttivi: ReadonlySet<string>;
  /** NPCs in the scene now. */
  presenti: ReadonlySet<string>;
  /** Clues offered by consequences, in order. */
  offerti: readonly string[];
  /** Clues of the current scene, in order of the card. */
  indiziDellaScena: readonly string[];
  /** Clues already revealed (mode B) or already given by a stall move (both modes). */
  giàDati: ReadonlySet<string>;
  /** Places the PCs know and have not visited (node names). */
  luoghiNoti: readonly string[];
  /** Facts the PCs have discovered (texts, most recent last). */
  fattiScoperti: readonly string[];
  /** The last visible sign of the active threat (a mark already shown), if any. */
  ultimoSegno: string | null;
}

export interface MossaStallo {
  n: number;
  livello: LivelloStallo;
  duro: boolean;
  /** The danger of the scene (S1, and the hard S1's clock). */
  pericolo: PericoloMondo | null;
  /** The clue to bring (S2). */
  indizio: string | null;
  /** 2–3 concrete leads (S3). */
  piste: string[];
}

/** The danger the scene is facing: its clock is active, or an NPC of its cast is present, or the first one. */
export function pericoloDellaScena(c: Pick<ContestoStallo, 'pericoli' | 'orologiAttivi' | 'presenti'>): PericoloMondo | null {
  return (
    c.pericoli.find((p) => p.orologio && c.orologiAttivi.has(p.orologio)) ??
    c.pericoli.find((p) => p.cast.some((x) => c.presenti.has(x))) ??
    c.pericoli.find((p) => p.mosse.length > 0) ??
    null
  );
}

/** The move for the n-th consecutive stall. S2 and S3 fall back to the level before when they have no material. */
export function mossaDiStallo(n: number, c: ContestoStallo): MossaStallo {
  const livello = livelloStallo(n);
  const pericolo = pericoloDellaScena(c);
  const indizio = [...c.offerti, ...c.indiziDellaScena].find((i) => !c.giàDati.has(i)) ?? null;
  const piste = [...c.luoghiNoti.slice(0, 2), ...c.fattiScoperti.slice(-1), ...(c.ultimoSegno ? [c.ultimoSegno] : [])].slice(0, 3);
  if (livello === 3 && piste.length >= 2) return { n, livello: 3, duro: false, pericolo, indizio: null, piste };
  if (livello >= 2 && indizio) return { n, livello: 2, duro: false, pericolo, indizio, piste: [] };
  return { n, livello: 1, duro: stalloDuro(n), pericolo, indizio: null, piste: [] };
}
