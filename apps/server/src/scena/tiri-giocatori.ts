/**
 * Manual rolls in the director's turn (docs/prove.md §8): between the window's close and the narrator, the Engine asks
 * the players to roll real dice and waits for the values.
 *
 * 1. The arbiter's decisions for the closed actions (MotoreProve.decidi), as in automatic play.
 * 2. What each player must roll (MotoreProve.richiesteGiocatori), plus the checks the Game Master asked from the panel.
 * 3. The narrator's voice says each public request («Ida, fai un tiro di Furtività.»): never the DC, never a private
 *    action's request (that one is only on its player's phone). The requests are in the table state (projector, phones)
 *    and on the panel, with the DC only there.
 * 4. The wait (prove/attesa-tiri.ts) until every die is in: from the phone, from dictation, entered by the Game Master,
 *    or switched to the Engine's dice. No timeout: a table waits for its dice; the panel unblocks a forgotten roll.
 * 5. The director goes on with `completa` and the narrator, as before.
 *
 * Automatic rolls, a campaign without dice or a turn with no action skip all of it: the director rolls as before.
 * The director keeps only the call sites; everything about the wait lives here.
 */
import type { RichiestaTiro, RichiestaTiroMaster } from '@tabletop-ai-gm/shared';
import type { Logger } from '../logger';
import type { Orologio } from '../turni/orologio';
import type { RiepilogoChiusura } from '../azioni/tavolo';
import { testo } from '../lingua';
import { AttesaTiri, type EsitoInserimento } from '../prove/attesa-tiri';
import type { ModalitaTiri } from '../prove/modalita';
import type { AzionePerProve, DecisioniTurno, MotoreProve } from '../prove/motore';
import type { TiroInserito } from '../prove/richieste';

/** What the wait gives the director's turn. */
export interface TiriGiocati {
  /** The decisions already taken (null = no manual step: the director decides and rolls as before). */
  decisioni: DecisioniTurno | null;
  inseriti: Map<string, TiroInserito>;
  /** How long the table took to roll (0 = no wait). */
  attesa_ms: number;
}

const NESSUNA: () => TiriGiocati = () => ({ decisioni: null, inseriti: new Map(), attesa_ms: 0 });

/** The line the narrator says for a request (language pack, prove.richiesta.*): what to roll, never the number to beat. */
export function fraseRichiesta(r: Pick<RichiestaTiro, 'nome' | 'tipo' | 'etichetta' | 'vantaggio'>): string {
  const nome = r.nome.split(' ')[0] ?? r.nome;
  const vantaggio = r.vantaggio ? testo(`prove.richiesta.con_${r.vantaggio}`) : '';
  const abilita = /^(.+?) \(([^)]+)\)$/.exec(r.etichetta);
  if (r.tipo === 'attacco') return testo('prove.richiesta.attacco', { nome, cosa: r.etichetta, vantaggio });
  if (abilita && r.tipo !== 'salvezza') return testo('prove.richiesta.abilita', { nome, abilita: abilita[1]!, vantaggio });
  return testo('prove.richiesta.altro', { nome, cosa: r.etichetta, vantaggio });
}

export interface OpzioniTiriGiocatori {
  modalita: ModalitaTiri | null;
  prove: MotoreProve | null;
  log: Logger;
  orologio: Orologio;
  /** The director's epoch: an interrupted turn changes it. */
  epoca: () => number;
  /** The turn is being resolved: the director's phase becomes «narrazione» (pause and stop apply as in a narration). */
  inizio: () => void;
  /** The narrator says one line of the turn (a public request). */
  parla: (turno: number, testo: string, indice: number) => void;
  /** The open requests changed: table state, the phones of the PCs, the panel. */
  cambiato: () => void;
  versoProve: (a: RiepilogoChiusura['azioni'][number]) => AzionePerProve;
}

export class TiriGiocatoriRegia {
  readonly attesa: AttesaTiri;

  constructor(private readonly o: OpzioniTiriGiocatori) {
    this.attesa = new AttesaTiri({ log: o.log, ora: () => o.orologio.ora(), cambiato: () => o.cambiato() });
  }

  /** The players roll their own dice (the campaign's setting, or the instance's override). */
  get manuali(): boolean {
    return !!this.o.prove?.attivo && this.o.modalita?.giocatori === 'manuale';
  }

  /**
   * Steps 1–4 for a closed window. Null = the wait was cancelled (the turn is dropped); `decisioni: null` = nothing to
   * do here (automatic rolls, no dice, no action).
   */
  async prima(r: RiepilogoChiusura): Promise<TiriGiocati | null> {
    const prove = this.o.prove;
    if (!prove || !this.manuali || !r.azioni.length) return NESSUNA();
    const epoca = this.o.epoca();
    this.o.inizio();
    const decisioni = await prove.decidi(r.turno, r.azioni.map((a) => this.o.versoProve(a)));
    if (epoca !== this.o.epoca()) return null;
    const richieste = prove.richiesteGiocatori(decisioni);
    if (!richieste.length) return { decisioni, inseriti: new Map(), attesa_ms: 0 };
    const t0 = this.o.orologio.ora();
    const attesa = this.attesa.attendi(r.turno, richieste);
    richieste.filter((x) => !x.privata).forEach((x, k) => this.o.parla(r.turno, fraseRichiesta(x), k));
    const inseriti = await attesa;
    if (!inseriti || epoca !== this.o.epoca()) return null;
    return { decisioni, inseriti, attesa_ms: Math.round(this.o.orologio.ora() - t0) };
  }

  annulla(motivo: string): void {
    this.attesa.annulla(motivo);
  }

  /** A phone enters the dice its player rolled (only for its own PC). */
  dalTelefono(id_pg: string, id: string, valori: unknown, da: 'telefono' | 'dettato' = 'telefono'): EsitoInserimento {
    return this.attesa.inserisci(id, valori, da, id_pg);
  }

  /** The Game Master enters the dice for a player, or switches the roll (or every open roll) to the Engine. */
  dalMaster(id: string, valori: number[] | null): EsitoInserimento {
    if (id === '*') {
      this.attesa.tuttiAutomatici();
      return { ok: true, completo: true };
    }
    return valori ? this.attesa.inserisci(id, valori, 'master') : this.attesa.automatico(id);
  }

  pubbliche(): RichiestaTiro[] {
    return this.attesa.pubbliche();
  }

  delPg(id_pg: string): RichiestaTiro[] {
    return this.attesa.delPg(id_pg);
  }

  master(): RichiestaTiroMaster[] {
    return this.attesa.master();
  }
}
