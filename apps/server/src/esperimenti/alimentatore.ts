/**
 * Feeds the script's actions to the table window by window (bug C4 of docs/e2e-finale.md).
 *
 * Out of combat a window takes one script turn: its scene changes first, then every action in it.
 * In turn-based combat the server opens the window only for the PCs on turn (`StatoTavolo.combattimento.turno_di`):
 * a blind script that sent every action of the script turn had the others deferred by the Engine
 * (`TavoloAzioni.rinvia`), then re-judged stale («impossibile», «dubbia») and left waiting for a confirmation no
 * headless phone gives. So in combat the feeder sends only the actions of the PCs on turn; the other actions of the
 * same script turn wait in a per-PC queue and go out on that PC's own turn, in script order. When none of the PCs on
 * turn has a queued action, the next script turn is loaded (its actions join the queues) so the script keeps moving;
 * when the script is over and the PC on turn has nothing left, that PC passes (an empty window, logged).
 *
 * Pure: no sockets, no server. esegui.ts asks it what to send for each window it sees.
 */
import type { ComandoMaster } from '@tabletop-ai-gm/shared';
import type { Passo } from './copione';

type PassoAzione = Extract<Passo, { tipo: 'azione' }>;

/** What to do in one window. */
export interface PassoFinestra {
  /** Scene changes of the script turn just loaded, to make before sending the actions (empty most of the time). */
  scene: string[];
  /** Game Master commands of the script turn just loaded (a rest, a hazard), sent after the scene changes. */
  master: ComandoMaster[];
  /** Actions to send now, one per PC at most. */
  azioni: PassoAzione[];
  /** The last script turn loaded so far (1-based; 0 = none yet). */
  turnoCopione: number;
  /** Combat: PCs with a queued action that are not on turn (they wait for their turn). */
  inAttesa: string[];
  /** Combat: PCs on turn with nothing left to send (the script is over for them): they pass. */
  passano: string[];
  /** Queued actions dropped because their PC is dead (a dead PC's player does not act any more). */
  scartate: number;
}

export class AlimentatoreCopione {
  private readonly code = new Map<string, PassoAzione[]>();
  private prossimoTurno = 0;

  constructor(private readonly turni: readonly Passo[][]) {}

  /** No script turn left to load and no queued action. */
  get finito(): boolean {
    return this.prossimoTurno >= this.turni.length && this.inCoda() === 0;
  }

  /** Queued actions not yet sent (all PCs). */
  inCoda(): number {
    let n = 0;
    for (const c of this.code.values()) n += c.length;
    return n;
  }

  /** The script turn about to be loaded, 1-based (for logs and the run summary). */
  get turnoCopione(): number {
    return this.prossimoTurno;
  }

  private carica(scene: string[], master: ComandoMaster[] = []): boolean {
    const turno = this.turni[this.prossimoTurno];
    if (!turno) return false;
    this.prossimoTurno += 1;
    for (const p of turno) {
      if (p.tipo === 'scena') scene.push(p.scena);
      else if (p.tipo === 'master') master.push(p.comando);
      else {
        const c = this.code.get(p.pg) ?? [];
        c.push(p);
        this.code.set(p.pg, c);
      }
    }
    return true;
  }

  private haInCoda(pg: string): boolean {
    return (this.code.get(pg)?.length ?? 0) > 0;
  }

  /**
   * The actions for the window that just opened. `diTurno`: the PCs the server is waiting for in turn-based combat
   * (null or empty = no turns: everyone may act).
   */
  prossimo(diTurno: readonly string[] | null, morti: ReadonlySet<string> = new Set()): PassoFinestra {
    const scene: string[] = [];
    const master: ComandoMaster[] = [];
    // A dead PC never comes on turn again: its queued actions would wait forever (run of 15 November, a PC killed in
    // round one kept «waiting for their turn» to the end of the script).
    let scartate = 0;
    for (const pg of morti) {
      scartate += this.code.get(pg)?.length ?? 0;
      this.code.delete(pg);
    }
    const turni = diTurno?.length ? diTurno : null;
    if (turni) {
      // Load script turns until one of the PCs on turn has something to do (or the script is over).
      while (!turni.some((pg) => this.haInCoda(pg)) && this.carica(scene, master)) {
        /* keep loading */
      }
    } else if (this.inCoda() === 0) this.carica(scene, master);
    const chi = turni ?? [...this.code.keys()];
    const azioni: PassoAzione[] = [];
    for (const pg of chi) {
      const p = this.code.get(pg)?.shift();
      if (p) azioni.push(p);
    }
    const inAttesa = turni ? [...this.code].filter(([pg, c]) => c.length && !turni.includes(pg)).map(([pg]) => pg) : [];
    const passano = turni ? turni.filter((pg) => !azioni.some((a) => a.pg === pg)) : [];
    return { scene, master, azioni, turnoCopione: this.prossimoTurno, inAttesa, passano, scartate };
  }
}
