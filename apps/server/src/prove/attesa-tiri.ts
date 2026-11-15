/**
 * The wait for the dice rolled at the table (docs/prove.md §8, «Manual rolls»).
 *
 * When a window closes and some actions need a roll, the director opens one wait with the turn's requests. Each request
 * is closed by its player's phone (the values the dice show), by the Game Master for them (panel), by dictation («ho
 * fatto 14»), or switched to the Engine's dice from the panel. When every request is closed the wait resolves with the
 * values, and the turn goes on (rolls, then the narrator). The director cancels the wait when the turn is interrupted
 * (stop, restart, scene change): the promise then resolves with null.
 *
 * State, not events: the open requests are part of what the table, the phones and the panel receive at every update,
 * so a phone that reconnects finds its request again. Pure of transport: the director decides who receives what.
 */
import type { RichiestaTiro, RichiestaTiroMaster } from '@tabletop-ai-gm/shared';
import type { Logger } from '../logger';
import { erroreValori, richiestaPubblica, type TiroInserito } from './richieste';

export type EsitoInserimento = { ok: true; completo: boolean } | { ok: false; motivo: 'nessuna' | 'gia' | 'altro_pg' | 'quanti' | 'facce' };

interface Attesa {
  turno: number;
  richieste: Map<string, RichiestaTiroMaster>;
  inseriti: Map<string, TiroInserito>;
  aperta_a: number;
  risolvi: (r: Map<string, TiroInserito> | null) => void;
}

export class AttesaTiri {
  private attesa: Attesa | null = null;

  constructor(
    private readonly o: {
      log: Logger;
      /** Monotonic clock (ms), for the wait's duration in the log. */
      ora: () => number;
      /** The open requests changed: the director pushes the new state to table, phones and panel. */
      cambiato: () => void;
    },
  ) {}

  get aperta(): boolean {
    return this.attesa !== null;
  }

  get turno(): number | null {
    return this.attesa?.turno ?? null;
  }

  /**
   * Opens the wait for a turn's requests (one round of them: the director opens a new wait for the follow-ups, the
   * damage after a hit, initiative, death saves). Resolves with the values entered (by request id) when every request
   * is closed, or with null if the wait is cancelled. No requests: resolves at once with an empty map.
   */
  attendi(turno: number, richieste: readonly RichiestaTiroMaster[]): Promise<Map<string, TiroInserito> | null> {
    if (this.attesa) this.annulla('a new wait replaces the old one');
    if (!richieste.length) return Promise.resolve(new Map());
    return new Promise((risolvi) => {
      this.attesa = { turno, richieste: new Map(richieste.map((r) => [r.id, { ...r, valori: null }])), inseriti: new Map(), aperta_a: this.o.ora(), risolvi };
      this.o.log.info({ turno, richieste: richieste.map((r) => ({ id: r.id, chi: r.chi, cosa: r.etichetta, dadi: `${r.quanti}d${r.facce}`, mod: r.modificatore, contro: r.contro.valore, privata: r.privata })) }, 'manual rolls: waiting for the dice at the table');
      this.o.cambiato();
    });
  }

  /**
   * Values for a request. `id_pg`: the phone's PC (it may close only its own requests); null for the Game Master.
   * When the last request is closed the wait resolves.
   */
  inserisci(id: string, valori: unknown, da: TiroInserito['da'], id_pg: string | null = null): EsitoInserimento {
    const a = this.attesa;
    const r = a?.richieste.get(id);
    if (!a || !r) return { ok: false, motivo: 'nessuna' };
    if (id_pg !== null && r.chi !== id_pg) return { ok: false, motivo: 'altro_pg' };
    if (a.inseriti.has(r.id)) return { ok: false, motivo: 'gia' };
    const errore = erroreValori(r, valori);
    if (errore) return { ok: false, motivo: errore };
    const v = (valori as number[]).map((x) => Number(x));
    a.inseriti.set(r.id, { richiesta: richiestaPubblica(r), valori: v, da });
    r.valori = v;
    this.o.log.info({ turno: a.turno, richiesta: id, chi: r.chi, valori: v, da }, 'manual rolls: dice entered');
    return { ok: true, completo: this.forseCompleta() };
  }

  /** The Game Master switches a request to the Engine's dice (a forgotten roll, a player gone). */
  automatico(id: string): EsitoInserimento {
    const a = this.attesa;
    const r = a?.richieste.get(id);
    if (!a || !r) return { ok: false, motivo: 'nessuna' };
    if (a.inseriti.has(r.id)) return { ok: false, motivo: 'gia' };
    a.inseriti.set(r.id, { richiesta: richiestaPubblica(r), valori: null, da: 'motore' });
    this.o.log.info({ turno: a.turno, richiesta: id, chi: r.chi }, 'manual rolls: switched to the Engine\'s dice by the Game Master');
    return { ok: true, completo: this.forseCompleta() };
  }

  /** Every open request to the Engine's dice at once (the Game Master's «tira tu tutto»). */
  tuttiAutomatici(): number {
    const a = this.attesa;
    if (!a) return 0;
    let n = 0;
    for (const r of a.richieste.values()) {
      if (a.inseriti.has(r.id)) continue;
      a.inseriti.set(r.id, { richiesta: richiestaPubblica(r), valori: null, da: 'motore' });
      n += 1;
    }
    if (n) this.o.log.info({ turno: a.turno, richieste: n }, 'manual rolls: all open requests switched to the Engine\'s dice');
    this.forseCompleta();
    return n;
  }

  /** The turn is interrupted: the wait ends with nothing (the director drops the turn). */
  annulla(motivo: string): void {
    const a = this.attesa;
    if (!a) return;
    this.attesa = null;
    this.o.log.info({ turno: a.turno, motivo, aperte: [...a.richieste.values()].filter((r) => !a.inseriti.has(r.id)).map((r) => r.id) }, 'manual rolls: wait cancelled');
    a.risolvi(null);
    this.o.cambiato();
  }

  private forseCompleta(): boolean {
    const a = this.attesa;
    if (!a) return false;
    const mancano = [...a.richieste.values()].filter((r) => !a.inseriti.has(r.id));
    if (mancano.length) {
      this.o.cambiato();
      return false;
    }
    this.attesa = null;
    this.o.log.info({ turno: a.turno, attesa_ms: Math.round(this.o.ora() - a.aperta_a), da: [...a.inseriti.values()].map((x) => x.da) }, 'manual rolls: every die is in, the turn goes on');
    a.risolvi(a.inseriti);
    this.o.cambiato();
    return true;
  }

  private aperte(): RichiestaTiroMaster[] {
    const a = this.attesa;
    return a ? [...a.richieste.values()].filter((r) => !a.inseriti.has(r.id)) : [];
  }

  /** For the projector and every phone: the open requests of public actions, without DC or target. */
  pubbliche(): RichiestaTiro[] {
    return this.aperte().filter((r) => !r.privata).map(richiestaPubblica);
  }

  /** For one PC's phone: its open requests, private ones included, without DC or target. */
  delPg(id_pg: string): RichiestaTiro[] {
    return this.aperte().filter((r) => r.chi === id_pg).map(richiestaPubblica);
  }

  /** For the Game Master panel: every request of the wait, with DC, target and the values already entered. */
  master(): RichiestaTiroMaster[] {
    return this.attesa ? [...this.attesa.richieste.values()].map((r) => ({ ...r })) : [];
  }
}
