/**
 * Finestra delle azioni (docs/f0-contratti.md, «Turno»):
 * - solo i PG invitati possono scrivere; finché è aperta l'azione si modifica o si ritira;
 * - «pronto» (anche senza azione = passo);
 * - si chiude quando TUTTI gli invitati sono pronti, oppure 10 s dopo la prima azione inviata;
 * - ogni azione porta il numero di versione della scena su cui è stata scritta.
 *
 * Logica pura: il tempo arriva da un `Orologio` iniettato, così i test sono deterministici.
 */
import type { AzionePubblica, Esito, FinestraPubblica } from '@cantastorie/shared';

export interface Orologio {
  /** Millisecondi monotoni (performance.now in produzione). */
  ora(): number;
  /** Epoch ms (per i client). */
  adesso(): number;
  /** Programma una richiamata; restituisce la funzione che la annulla. */
  dopo(ms: number, cb: () => void): () => void;
}

export const orologioDiSistema: Orologio = {
  ora: () => performance.now(),
  adesso: () => Date.now(),
  dopo: (ms, cb) => {
    const t = setTimeout(cb, ms);
    return () => clearTimeout(t);
  },
};

export type MotivoChiusura = 'tutti_pronti' | 'scadenza' | 'forzata';

export interface AzioneInFinestra {
  id_pg: string;
  /** Testo corrente ('' se mai scritta). */
  testo: string;
  versione_scena: number;
  pronto: boolean;
  ritirata: boolean;
  /** Quante volte è stata inviata o modificata. */
  modifiche: number;
}

export interface RiepilogoFinestra {
  turno: number;
  invitati: string[];
  /** Azioni effettive (scritte e non ritirate), nell'ordine di primo invio. */
  azioni: AzioneInFinestra[];
  /** Invitati che non hanno scritto niente (hanno passato o non hanno fatto in tempo). */
  senzaAzione: string[];
  motivo: MotivoChiusura;
  /** Durata della finestra, dall'apertura alla chiusura. */
  durata_ms: number;
  /** Istante monotono della chiusura (t0 delle misure di latenza). */
  chiusa_a: number;
}

export interface OpzioniFinestra {
  turno: number;
  invitati: string[];
  versioneScena: number;
  chiusuraDopoPrimaAzioneMs: number;
  /** Se vero, un PG che arriva al tavolo a finestra aperta viene invitato anche lui. */
  invitoATutti: boolean;
  orologio: Orologio;
  onChiusura: (riepilogo: RiepilogoFinestra) => void;
  onCambio: () => void;
}

export const MAX_CARATTERI_AZIONE = 500;

export class FinestraAzioni {
  private readonly o: OpzioniFinestra;
  private readonly invitati: string[];
  private readonly azioni = new Map<string, AzioneInFinestra>();
  private readonly apertaA: number;
  private aperta_ = true;
  private annullaTimer: (() => void) | null = null;
  private chiusuraPrevistaEpoch: number | null = null;
  private riepilogo_: RiepilogoFinestra | null = null;

  constructor(opzioni: OpzioniFinestra) {
    this.o = opzioni;
    this.invitati = [...new Set(opzioni.invitati)];
    this.apertaA = opzioni.orologio.ora();
  }

  get aperta(): boolean {
    return this.aperta_;
  }

  get turno(): number {
    return this.o.turno;
  }

  get riepilogo(): RiepilogoFinestra | null {
    return this.riepilogo_;
  }

  èInvitato(id_pg: string): boolean {
    return this.invitati.includes(id_pg);
  }

  azioneDi(id_pg: string): AzioneInFinestra | undefined {
    return this.azioni.get(id_pg);
  }

  invia(id_pg: string, testo: string, versioneScena: number): Esito {
    const errore = this.controllaInvitato(id_pg);
    if (errore) return errore;
    const pulito = testo.trim();
    if (!pulito) return { ok: false, errore: 'Scrivi cosa fa il tuo personaggio.' };
    if (pulito.length > MAX_CARATTERI_AZIONE) return { ok: false, errore: `Massimo ${MAX_CARATTERI_AZIONE} caratteri.` };
    if (versioneScena !== this.o.versioneScena) {
      return { ok: false, errore: 'La scena è cambiata: rileggi cosa è successo e riscrivi.' };
    }
    const prima = this.azioni.get(id_pg);
    this.azioni.set(id_pg, {
      id_pg,
      testo: pulito,
      versione_scena: versioneScena,
      pronto: prima?.pronto ?? false,
      ritirata: false,
      modifiche: (prima?.modifiche ?? 0) + 1,
    });
    // Il conto alla rovescia parte dalla prima azione inviata nella finestra.
    if (!this.annullaTimer) this.avviaTimer();
    this.o.onCambio();
    this.controllaTuttiPronti();
    return { ok: true };
  }

  ritira(id_pg: string): Esito {
    const errore = this.controllaInvitato(id_pg);
    if (errore) return errore;
    const a = this.azioni.get(id_pg);
    if (!a || a.ritirata || !a.testo) return { ok: false, errore: 'Non c’è nessuna azione da ritirare.' };
    a.ritirata = true;
    a.pronto = false;
    // Se non resta nessuna azione, il conto alla rovescia si ferma: aspettiamo la prossima.
    if (this.azioniAttive().length === 0) this.fermaTimer();
    this.o.onCambio();
    return { ok: true };
  }

  pronto(id_pg: string, pronto: boolean): Esito {
    const errore = this.controllaInvitato(id_pg);
    if (errore) return errore;
    const a = this.azioni.get(id_pg) ?? {
      id_pg,
      testo: '',
      versione_scena: this.o.versioneScena,
      pronto: false,
      ritirata: false,
      modifiche: 0,
    };
    a.pronto = pronto;
    this.azioni.set(id_pg, a);
    this.o.onCambio();
    this.controllaTuttiPronti();
    return { ok: true };
  }

  /** Un PG è arrivato al tavolo a finestra aperta. */
  aggiungiInvitato(id_pg: string): void {
    if (!this.aperta_ || !this.o.invitoATutti || this.invitati.includes(id_pg)) return;
    this.invitati.push(id_pg);
    this.o.onCambio();
  }

  /** Nessun telefono ha più quel PG: non lo si aspetta più. */
  rimuoviInvitato(id_pg: string): void {
    if (!this.aperta_) return;
    const i = this.invitati.indexOf(id_pg);
    if (i < 0 || this.invitati.length === 1) return; // l'ultimo invitato resta: non si chiude a vuoto
    const a = this.azioni.get(id_pg);
    if (a && a.testo && !a.ritirata) return; // ha scritto: la sua azione conta comunque
    this.invitati.splice(i, 1);
    this.azioni.delete(id_pg);
    this.o.onCambio();
    this.controllaTuttiPronti();
  }

  chiudi(motivo: MotivoChiusura): RiepilogoFinestra | null {
    if (!this.aperta_) return null;
    this.aperta_ = false;
    this.fermaTimer();
    const ora = this.o.orologio.ora();
    const attive = this.azioniAttive();
    const r: RiepilogoFinestra = {
      turno: this.o.turno,
      invitati: [...this.invitati],
      azioni: attive.map((a) => ({ ...a })),
      senzaAzione: this.invitati.filter((id) => !attive.some((a) => a.id_pg === id)),
      motivo,
      durata_ms: Math.round(ora - this.apertaA),
      chiusa_a: ora,
    };
    this.riepilogo_ = r;
    this.o.onChiusura(r);
    this.o.onCambio();
    return r;
  }

  pubblica(): FinestraPubblica {
    const azioni: AzionePubblica[] = this.invitati.map((id) => {
      const a = this.azioni.get(id);
      return { id_pg: id, scritta: !!a && !!a.testo && !a.ritirata, pronto: a?.pronto ?? false };
    });
    return {
      aperta: this.aperta_,
      turno: this.o.turno,
      invitati: [...this.invitati],
      azioni,
      chiusura_prevista_ms: this.aperta_ ? this.chiusuraPrevistaEpoch : null,
    };
  }

  private azioniAttive(): AzioneInFinestra[] {
    return [...this.azioni.values()].filter((a) => a.testo && !a.ritirata);
  }

  private controllaInvitato(id_pg: string): Esito | null {
    if (!this.aperta_) return { ok: false, errore: 'La finestra delle azioni è chiusa.' };
    if (!this.invitati.includes(id_pg)) return { ok: false, errore: 'Questa volta il narratore non ha chiamato il tuo personaggio.' };
    return null;
  }

  private controllaTuttiPronti(): void {
    if (!this.aperta_ || this.invitati.length === 0) return;
    if (this.invitati.every((id) => this.azioni.get(id)?.pronto)) this.chiudi('tutti_pronti');
  }

  private avviaTimer(): void {
    const ms = this.o.chiusuraDopoPrimaAzioneMs;
    this.chiusuraPrevistaEpoch = this.o.orologio.adesso() + ms;
    this.annullaTimer = this.o.orologio.dopo(ms, () => {
      this.annullaTimer = null;
      this.chiudi('scadenza');
    });
  }

  private fermaTimer(): void {
    this.annullaTimer?.();
    this.annullaTimer = null;
    this.chiusuraPrevistaEpoch = null;
  }
}
