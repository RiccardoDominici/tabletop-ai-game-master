/**
 * Stall moves S1 → S2 → S3 (docs/mondo.md §5, manual «Stall», E12). A stall is a closed window without actions,
 * outside a fight (there an empty window is the NPCs' turn), or the second turn in a row whose actions bring no new
 * decision (E12: each one only waits or looks around, by the language's patterns, or repeats that PC's previous
 * action). The counter grows on consecutive stalls and goes back to zero on a real decision or a scene change.
 * Level ((n − 1) mod 3) + 1:
 * - S1 a soft move of an active front (its moves and visible signs as material); from the fourth stall on, S1 also
 *   owes a mark to that danger's clock (a soft move ignored: the world moves);
 * - S2 a proactive clue: first a clue offered by a consequence, else one not yet revealed of the scene;
 * - S3 an NPC present, or a memory, sums up 2–3 concrete leads from what the PCs know.
 * Never an empty «cosa fate?»: each level carries material. Pure choice: the director supplies the context.
 */
import type { PericoloMondo } from '../campagna/mondo';
import { normalizza } from '../azioni/regole';
import { campoOggetti, campoRegex, campoTesto, regole } from '../lingua/motore';

/** Patterns of an action that brings no new decision, from lingue/<code>/motore.yaml (section `stallo`). */
const senzaDecisioneRegole = (): ReadonlyArray<[string, RegExp]> =>
  regole('stallo', (s) =>
    campoOggetti(s, 'senza_decisione').flatMap((e): Array<[string, RegExp]> => {
      const re = campoRegex(e, 'regex', campoTesto(e, 'flags'));
      return re ? [[campoTesto(e, 'nome'), re]] : [];
    }),
  );

/**
 * Why an action brings no new decision (E12), or null if it does: it only waits, stays put, does nothing or looks
 * around (the whole action, by the language's patterns), or it repeats the same PC's previous action word for word.
 */
export function senzaDecisione(testo: string, precedente: string | null): string | null {
  const t = testo.trim();
  const uguale = (x: string): string => normalizza(x).replace(/[\s.!?…]+$/u, '');
  if (precedente !== null && uguale(t) === uguale(precedente)) return 'ripetuta';
  for (const [nome, re] of senzaDecisioneRegole()) if (re.test(t)) return nome;
  return null;
}

export type LivelloStallo = 1 | 2 | 3;

export function livelloStallo(n: number): LivelloStallo {
  return (((Math.max(1, n) - 1) % 3) + 1) as LivelloStallo;
}

/** From the fourth stall on, S1 is «hard»: it owes a mark to the danger's clock. */
export function stalloDuro(n: number): boolean {
  return n > 3 && livelloStallo(n) === 1;
}

/** What a closed window brought: nothing, actions without a new decision, or a real decision. */
export type ChiusuraPerStallo = 'vuota' | 'indecisa' | 'decisa';

/**
 * After this many answers in a row that brought nothing new to the table, the next closed window is a stall whatever
 * its actions say (`fermi`).
 */
export const TURNI_FERMI_PER_STALLO = 2;

/** Consecutive stalls (saved in the snapshot). */
export class ContatoreStallo {
  n = 0;
  /** Consecutive turns whose actions brought no new decision (E12: the second one is a stall). */
  indecisi = 0;
  /**
   * Consecutive answers that brought nothing new: no repertoire line, no roll, no clue, no clock mark, no scene change,
   * no fight (the director tells, `registraEsito`). Third e2e pass, bug 8: a stalling table wrote «Cosa facciamo?»,
   * «Non lo so…», «Mi siedo sul muretto», «Ci penso. Aspetto.»; only the bare «Aspetto.» matched the patterns, so the
   * counter never reached a stall and five turns of fourteen had an empty catalogue: the narrator answered with a
   * description or handed the question back. What the turn did to the game is language-free, unlike the words.
   */
  fermi = 0;
  /** Each PC's last action (normalised), to see a repetition. */
  readonly ultime = new Map<string, string>();

  /**
   * A closed window: returns the stall number (1, 2, …) or 0 if it is not a stall. Old form: a boolean = empty or not.
   */
  registra(chiusura: ChiusuraPerStallo | boolean, inCombattimento: boolean, versoPng = false): number {
    const c: ChiusuraPerStallo = chiusura === true ? 'vuota' : chiusura === false ? 'decisa' : chiusura;
    // Whatever the words say, the last answers changed nothing: the table is spinning, the world moves. Not when an
    // action speaks to or acts on an NPC present (`versoPng`): that is a decision even if no prepared line answers it.
    if (c !== 'vuota' && !inCombattimento && !versoPng && this.fermi >= TURNI_FERMI_PER_STALLO) {
      this.indecisi = 0;
      this.n += 1;
      return this.n;
    }
    if (c === 'decisa') {
      this.n = 0;
      this.indecisi = 0;
      return 0;
    }
    if (inCombattimento) return 0;
    if (c === 'indecisa') {
      this.indecisi += 1;
      if (this.indecisi < 2) return 0;
    }
    this.n += 1;
    return this.n;
  }

  /**
   * How a window with these actions closes for the stall (E12), and the PCs' last actions remembered for next time.
   */
  classifica(azioni: ReadonlyArray<{ autore: string; testo: string | null }>): ChiusuraPerStallo {
    const conTesto = azioni.filter((a): a is { autore: string; testo: string } => !!a.testo);
    if (conTesto.length === 0) return 'vuota';
    const indecisa = conTesto.every((a) => senzaDecisione(a.testo, this.ultime.get(a.autore) ?? null) !== null);
    for (const a of conTesto) this.ultime.set(a.autore, a.testo);
    return indecisa ? 'indecisa' : 'decisa';
  }

  /** The answer to a closed window: did it bring anything new to the table (see `fermi`)? */
  registraEsito(qualcosaDiNuovo: boolean): void {
    this.fermi = qualcosaDiNuovo ? 0 : this.fermi + 1;
    // Something new after stalls: the next window starts from zero again (its words decide).
    if (qualcosaDiNuovo) this.n = 0;
  }

  azzera(): void {
    this.n = 0;
    this.indecisi = 0;
    this.fermi = 0;
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
