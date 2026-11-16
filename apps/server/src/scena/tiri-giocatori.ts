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
 * 5. The follow-ups, round after round: the Engine runs the turn again on a copy with the dice entered so far and asks
 *    what they lead to (the damage of a hit, then initiative when a fight starts, then a dying PC's death saves),
 *    until nothing is left to roll. A roll the Game Master gave to the Engine keeps that PC's follow-ups with the
 *    Engine for the rest of the turn; «Tutti al Motore» gives the Engine every roll left in the turn.
 * 6. The director goes on with `completa` and the narrator, as before.
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
import type { AzionePerProve, DecisioniTurno, MotoreProve, ProvaDelMaster } from '../prove/motore';
import { richiestaPubblica, type TiroInserito } from '../prove/richieste';

/** What the wait gives the director's turn. */
export interface TiriGiocati {
  /** The decisions already taken (null = no manual step: the director decides and rolls as before). */
  decisioni: DecisioniTurno | null;
  inseriti: Map<string, TiroInserito>;
  /** How long the table took to roll (0 = no wait). */
  attesa_ms: number;
  /** The turn has only checks the Game Master asked (no action): not a stall (docs/prove.md §8). */
  soloDelMaster: boolean;
}

const NESSUNA: () => TiriGiocati = () => ({ decisioni: null, inseriti: new Map(), attesa_ms: 0, soloDelMaster: false });

/** Rounds of follow-ups in one turn at most (attack, damage, initiative, death saves to the end: far fewer in play). */
const MAX_GIRI = 40;

/** The line the narrator says for a request (language pack, prove.richiesta.*): what to roll, never the number to beat. */
export function fraseRichiesta(r: Pick<RichiestaTiro, 'nome' | 'tipo' | 'etichetta' | 'vantaggio' | 'per'>): string {
  const nome = r.nome.split(' ')[0] ?? r.nome;
  // Follow-ups: the damage of a hit, initiative, a death save, the other PC's die in a contest.
  if (r.per === 'danno') return testo('prove.richiesta.danno', { nome });
  if (r.per === 'iniziativa') return testo('prove.richiesta.iniziativa', { nome });
  if (r.per === 'morte') return testo('prove.richiesta.morte', { nome });
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

/** A check the Game Master asked, waiting for the next closed window (the panel lists it). */
export interface ProvaChiesta {
  id: string;
  id_pg: string;
  /** What is rolled, as the catalogue names it («Percezione (Saggezza)»). */
  nome: string;
  difficolta: string | null;
  privata: boolean;
}

export class TiriGiocatoriRegia {
  readonly attesa: AttesaTiri;
  /** Checks the Game Master asked from the panel, for the next closed window (docs/prove.md §8). */
  private delMaster: Array<ProvaDelMaster & { chiesta: ProvaChiesta }> = [];
  private prossimaDelMaster = 1;
  /** This turn's switches to the Engine from the panel: they hold for the follow-ups of the same turn. */
  private alMotore = { pg: new Set<string>(), tutti: false };

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
    if (!prove?.attivo) return NESSUNA();
    // The Game Master's checks join this turn (all of them: the panel asked them for «now»).
    const delMaster = this.delMaster;
    // In a fight a window with no action still rolls (the NPCs' steps, a dying PC's death save, initiative of a new
    // round): with manual rolls the players roll their own there too.
    // A fight the Game Master opened from the panel starts in this window: its initiative is the players' too.
    const scontro = this.manuali && (prove.inCombattimento || prove.combattimentoChiesto);
    if (!r.azioni.length && !delMaster.length && !scontro) return NESSUNA();
    // Automatic rolls with no Game Master check: the director decides and rolls as before.
    if (!this.manuali && !delMaster.length) return NESSUNA();
    this.delMaster = [];
    const soloDelMaster = !r.azioni.length && delMaster.length > 0;
    const epoca = this.o.epoca();
    this.o.inizio();
    const decisioni = await prove.decidi(r.turno, r.azioni.map((a) => this.o.versoProve(a)), delMaster);
    if (epoca !== this.o.epoca()) return null;
    if (!this.manuali) return { decisioni, inseriti: new Map(), attesa_ms: 0, soloDelMaster };
    this.alMotore = { pg: new Set(), tutti: false };
    const inseriti = new Map<string, TiroInserito>();
    let t0: number | null = null;
    let frasi = 0;
    for (let giro = 0; giro < MAX_GIRI; giro++) {
      // From the live state each round: the dice entered so far decide what comes next.
      const nuove = prove.richiesteGiocatori(decisioni, inseriti).filter((x) => !inseriti.has(x.id));
      if (!nuove.length) break;
      const daChiedere: RichiestaTiroMaster[] = [];
      for (const x of nuove) {
        if (this.alMotore.tutti || this.alMotore.pg.has(x.chi)) inseriti.set(x.id, { richiesta: richiestaPubblica(x), valori: null, da: 'motore' });
        else daChiedere.push(x);
      }
      if (daChiedere.length < nuove.length) this.o.log.info({ turno: r.turno, alMotore: nuove.filter((x) => inseriti.has(x.id)).map((x) => x.id) }, 'manual rolls: follow-ups left with the Engine, as the Game Master chose this turn');
      if (!daChiedere.length) continue;
      if (giro > 0) this.o.log.info({ turno: r.turno, giro, richieste: daChiedere.map((x) => x.id) }, 'manual rolls: follow-up rolls asked');
      t0 ??= this.o.orologio.ora();
      const attesa = this.attesa.attendi(r.turno, daChiedere);
      for (const x of daChiedere) if (!x.privata) this.o.parla(r.turno, fraseRichiesta(x), frasi++);
      const entrati = await attesa;
      if (!entrati || epoca !== this.o.epoca()) return null;
      for (const [id, x] of entrati) inseriti.set(id, x);
      if (giro === MAX_GIRI - 1) this.o.log.warn({ turno: r.turno }, 'manual rolls: too many rounds of follow-ups, the Engine rolls the rest');
    }
    return { decisioni, inseriti, attesa_ms: t0 === null ? 0 : Math.round(this.o.orologio.ora() - t0), soloDelMaster };
  }

  annulla(motivo: string): void {
    this.attesa.annulla(motivo);
  }

  /**
   * The Game Master asks a PC for a check (`cosa`: «abilita:percezione», «salvezza:destrezza», «caratteristica:forza»;
   * `difficolta`: an id of the set's scale, or null for its default). It joins the next closed window: the player rolls
   * it at the table (manual) or the Engine rolls it, and the narrator gets the outcome as a fact.
   */
  chiedi(id_pg: string, nomePg: string, cosa: string, difficolta: string | null, motivo: string, privata: boolean): ProvaChiesta | null {
    const prove = this.o.prove;
    if (!prove?.attivo) return null;
    const id = `m_${this.prossimaDelMaster}`;
    const decisione = prove.decisioneDelMaster(id, cosa, difficolta);
    const voce = prove.catalogoDelMaster().prove.find((p) => p.id === cosa);
    if (!decisione || !voce) return null;
    this.prossimaDelMaster += 1;
    const testoAzione = testo('prove.master.azione', { cosa: voce.nome, motivo: motivo ? testo('prove.master.motivo', { motivo }) : '' });
    const chiesta: ProvaChiesta = { id, id_pg, nome: voce.nome, difficolta, privata };
    this.delMaster.push({ azione: { id, autore: id_pg, testo: testoAzione, privata, revisione: 0 }, decisione, chiesta });
    this.o.log.info({ id, id_pg, pg: nomePg, cosa, difficolta, privata, motivo: motivo || null }, 'prove: the Game Master asks a check, it joins the next closed window');
    this.o.cambiato();
    return chiesta;
  }

  /** The Game Master's checks still waiting for a closed window. */
  chieste(): ProvaChiesta[] {
    return this.delMaster.map((m) => m.chiesta);
  }

  /** Restart: the checks asked for the old scene are forgotten. */
  dimenticaChieste(): void {
    this.delMaster = [];
  }

  /** A phone enters the dice its player rolled (only for its own PC). */
  dalTelefono(id_pg: string, id: string, valori: unknown, da: 'telefono' | 'dettato' = 'telefono'): EsitoInserimento {
    return this.attesa.inserisci(id, valori, da, id_pg);
  }

  /**
   * The Game Master enters the dice for a player, or switches the roll (or every open roll) to the Engine. A switch
   * holds for the rest of the turn: that PC's follow-ups (or every roll left, with «*») go to the Engine too.
   */
  dalMaster(id: string, valori: number[] | null): EsitoInserimento {
    if (id === '*') {
      this.alMotore.tutti = true;
      this.attesa.tuttiAutomatici();
      return { ok: true, completo: true };
    }
    if (valori) return this.attesa.inserisci(id, valori, 'master');
    const chi = this.attesa.master().find((x) => x.id === id)?.chi;
    const esito = this.attesa.automatico(id);
    if (esito.ok && chi) this.alMotore.pg.add(chi);
    return esito;
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
