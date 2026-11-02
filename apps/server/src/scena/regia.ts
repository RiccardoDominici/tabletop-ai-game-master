/**
 * Regia della scena (F0): l'unico «scrittore» dello stato del tavolo e del ciclo dei turni.
 *
 *   attesa ──(schermo: Inizia sessione)──▶ apertura ──(audio finito)──▶ finestra
 *   finestra ──(tutti pronti | 10 s dopo la prima azione)──▶ narrazione
 *   narrazione ──(LLM finito + voce finita + audio suonato)──▶ finestra (turno+1)
 *   qualsiasi ──(ferma)──▶ fermata ──(ricomincia)──▶ apertura
 *
 * Le misure di latenza di ogni turno partono da t0 = chiusura della finestra e finiscono in
 * logs/turni.jsonl; il costo di ogni chiamata in logs/costi.jsonl.
 *
 * Ogni flusso asincrono controlla `epoca`: ferma/ricomincia la incrementano e i flussi vecchi,
 * al risveglio da un await, si accorgono di essere superati ed escono senza toccare lo stato.
 */
import type {
  AzionePrivata,
  Esito,
  FaseScena,
  MisureTurno,
  SchermoAudioFinito,
  SchermoAudioIniziato,
  StatoTavolo,
  VoceTrascrizione,
} from '@cantastorie/shared';
import type { Campagna } from '../campagna/tipi';
import { ID_NARRATORE, NOME_NARRATORE } from '../campagna/tipi';
import type { Logger } from '../logger';
import type { Narratore } from '../llm/tipi';
import { MisuratoreTurno } from '../metriche/misure';
import type { RegistroJsonl } from '../metriche/jsonl';
import { compilaMessaggioTurno } from '../narrazione/messaggio';
import { FinestraAzioni, type Orologio, type RiepilogoFinestra } from '../turni/finestra';
import { narraTurno } from '../turni/narrazione';
import { PipelineVoce, type UscitaAudio } from '../voce/pipeline';
import type { SelettoreVoce } from '../voce/selettore';

export interface OpzioniRegia {
  campagna: Campagna;
  /** Blocchi di sistema stabili: [prompt del narratore, contesto della campagna]. */
  sistema: string[];
  narratore: Narratore;
  voce: SelettoreVoce;
  uscitaAudio: UscitaAudio;
  orologio: Orologio;
  log: Logger;
  registroTurni: RegistroJsonl;
  registroCosti: RegistroJsonl;
  chiusuraDopoPrimaAzioneMs: number;
  margineFineAudioMs: number;
  trascrizioneMax: number;
  preriscalda: boolean;
}

/** Ascoltatori del trasporto (Socket.IO). */
export interface UscitaRegia {
  stato(stato: StatoTavolo): void;
  azioneMia(id_pg: string, azione: AzionePrivata | null): void;
  metriche(misure: MisureTurno): void;
  avviso(livello: 'info' | 'errore', testo: string): void;
}

interface AttesaAudio {
  turno: number;
  risolvi: (fine: number | null) => void;
  timer: (() => void) | null;
}

export class Regia {
  private readonly o: OpzioniRegia;
  private readonly pipeline: PipelineVoce;
  private uscita: UscitaRegia | null = null;

  private fase: FaseScena = 'attesa';
  private turno = 0;
  private versioneScena = 0;
  private versioneStato = 0;
  private epoca = 0;
  private trascrizione: VoceTrascrizione[] = [];
  private prossimoIdTrascrizione = 1;
  /** Voce di trascrizione aperta per segmento del turno corrente (per unire le frasi). */
  private segmentiAperti = new Map<string, VoceTrascrizione>();

  private finestra: FinestraAzioni | null = null;
  private azioniPrivate = new Map<string, AzionePrivata>();
  private controlloLlm: AbortController | null = null;
  private misuratore: MisuratoreTurno | null = null;
  /** Primo pezzo d'audio inviato nel turno corrente (stima della fine se lo schermo tace). */
  private primoAudioInviato = new Map<number, number>();
  private attesaAudio: AttesaAudio | null = null;

  /** socket.id → id_pg scelto. */
  private telefoni = new Map<string, string>();
  /** socket.id degli schermi che hanno sbloccato l'audio. */
  private schermi = new Set<string>();

  constructor(opzioni: OpzioniRegia) {
    this.o = opzioni;
    this.pipeline = new PipelineVoce({
      motore: () => this.o.voce.attivo,
      uscita: opzioni.uscitaAudio,
      log: opzioni.log.child({ modulo: 'voce' }),
      osservatore: {
        richiesta: (f) => {
          if (f.turno === this.misuratore?.turno) this.misuratore.segna('voce_richiesta', this.o.orologio.ora());
        },
        primoAudio: (f) => {
          const ora = this.o.orologio.ora();
          if (!this.primoAudioInviato.has(f.turno)) this.primoAudioInviato.set(f.turno, ora);
          if (f.turno === this.misuratore?.turno) this.misuratore.segna('voce_primo_audio', ora);
        },
      },
    });
    this.o.voce.onCambio(() => this.notifica());
  }

  collega(uscita: UscitaRegia): void {
    this.uscita = uscita;
  }

  // ------------------------------------------------------------------ stato

  stato(): StatoTavolo {
    const c = this.o.campagna;
    const conteggio = new Map<string, number>();
    for (const id of this.telefoni.values()) conteggio.set(id, (conteggio.get(id) ?? 0) + 1);
    return {
      versione_stato: this.versioneStato,
      versione_scena: this.versioneScena,
      fase: this.fase,
      turno: this.turno,
      scena: { id_campagna: c.id, titolo: c.scena.titolo, umore: c.scena.umore, intensita: c.scena.intensita },
      pg: c.pg.map((p) => ({ id: p.id, nome: p.nome, descrizione: p.descrizione, telefoni: conteggio.get(p.id) ?? 0 })),
      finestra: this.finestra?.aperta
        ? this.finestra.pubblica()
        : { aperta: false, turno: this.turno, invitati: [], azioni: [], chiusura_prevista_ms: null },
      trascrizione: this.trascrizione.slice(-this.o.trascrizioneMax),
      voce_motore: this.o.voce.nome,
      schermo_connesso: this.schermi.size > 0,
      ora_server_ms: this.o.orologio.adesso(),
    };
  }

  azioneDi(id_pg: string): AzionePrivata | null {
    return this.azioniPrivate.get(id_pg) ?? null;
  }

  private notifica(): void {
    this.versioneStato += 1;
    this.uscita?.stato(this.stato());
  }

  private aggiornaAzione(id_pg: string, azione: AzionePrivata | null): void {
    if (azione) this.azioniPrivate.set(id_pg, azione);
    else this.azioniPrivate.delete(id_pg);
    this.uscita?.azioneMia(id_pg, azione);
  }

  private aggiungiTrascrizione(v: Omit<VoceTrascrizione, 'id'>): VoceTrascrizione {
    const voce = { id: this.prossimoIdTrascrizione++, ...v };
    this.trascrizione.push(voce);
    return voce;
  }

  // ------------------------------------------------------------------ telefoni e schermi

  /** PG scelti da almeno un telefono (se nessuno, tutti: così chi arriva dopo può giocare). */
  private pgAlTavolo(): string[] {
    const scelti = new Set(this.telefoni.values());
    const elenco = this.o.campagna.pg.map((p) => p.id).filter((id) => scelti.has(id));
    return elenco.length ? elenco : this.o.campagna.pg.map((p) => p.id);
  }

  telefonoSceglie(socketId: string, id_pg: string): Esito {
    if (!this.o.campagna.pg.some((p) => p.id === id_pg)) return { ok: false, errore: 'Personaggio sconosciuto.' };
    const prima = this.telefoni.get(socketId);
    this.telefoni.set(socketId, id_pg);
    if (prima && prima !== id_pg) this.lasciaPg(prima);
    this.finestra?.aggiungiInvitato(id_pg);
    this.o.log.info({ socket: socketId, id_pg, prima: prima ?? null }, 'telefono: PG scelto');
    this.notifica();
    return { ok: true };
  }

  telefonoEsce(socketId: string): void {
    const id_pg = this.telefoni.get(socketId);
    this.telefoni.delete(socketId);
    if (id_pg) {
      this.lasciaPg(id_pg);
      this.notifica();
    }
  }

  private lasciaPg(id_pg: string): void {
    if ([...this.telefoni.values()].includes(id_pg)) return; // un altro telefono lo tiene
    this.finestra?.rimuoviInvitato(id_pg);
  }

  /** Lo schermo ha sbloccato l'audio: entra, e la scena parte se era in attesa. */
  schermoInizia(socketId: string): Esito {
    this.schermi.add(socketId);
    this.o.log.info({ socket: socketId, fase: this.fase, schermi: this.schermi.size }, 'schermo: audio sbloccato');
    if (this.fase === 'attesa') this.avviaScena();
    else this.notifica();
    return { ok: true };
  }

  schermoEsce(socketId: string): void {
    if (this.schermi.delete(socketId)) {
      this.o.log.info({ socket: socketId, schermi: this.schermi.size }, 'schermo: uscito');
      // Senza schermi nessuno avviserà la fine dell'audio: chi aspetta va avanti con la stima.
      if (this.schermi.size === 0 && this.attesaAudio) this.programmaStimaFine(this.attesaAudio, 0);
      this.notifica();
    }
  }

  schermoAudioIniziato(d: SchermoAudioIniziato, ricevutoA: number): void {
    const istante = ricevutoA - Math.max(0, d.ritardo_ms);
    if (this.misuratore && d.turno === this.misuratore.turno) {
      this.misuratore.segna('schermo_inizio_audio', istante);
    }
    this.o.log.debug({ turno: d.turno, id_frase: d.id_frase, ritardo_ms: d.ritardo_ms }, 'schermo: audio iniziato');
  }

  schermoAudioFinito(d: SchermoAudioFinito, ricevutoA: number): void {
    const istante = ricevutoA - Math.max(0, d.ritardo_ms);
    this.o.log.info({ turno: d.turno, buchi: d.buchi, ritardo_ms: d.ritardo_ms }, 'schermo: audio finito');
    const a = this.attesaAudio;
    if (a && a.turno === d.turno) {
      a.timer?.();
      this.attesaAudio = null;
      a.risolvi(istante);
    }
  }

  // ------------------------------------------------------------------ comandi della scena

  ferma(motivo = 'comando'): Esito {
    if (this.fase === 'attesa' || this.fase === 'fermata') return { ok: false, errore: 'La scena non è in corso.' };
    this.interrompiTutto(motivo);
    this.fase = 'fermata';
    this.aggiungiTrascrizione({ turno: this.turno, tipo: 'sistema', chi: 'sistema', nome: 'Sistema', testo: 'Scena fermata.' });
    this.o.log.info({ turno: this.turno, motivo }, 'scena: fermata');
    this.notifica();
    return { ok: true };
  }

  ricomincia(): Esito {
    this.interrompiTutto('ricomincia');
    this.trascrizione = [];
    this.turno = 0;
    this.versioneScena = 0;
    this.azioniPrivate.clear();
    for (const id of this.o.campagna.pg.map((p) => p.id)) this.uscita?.azioneMia(id, null);
    this.o.log.info({ schermi: this.schermi.size }, 'scena: ricomincia');
    if (this.schermi.size > 0) this.avviaScena();
    else {
      this.fase = 'attesa';
      this.notifica();
    }
    return { ok: true };
  }

  /** Comandi dei telefoni sulla finestra corrente. */
  inviaAzione(id_pg: string, testo: string, versione: number): Esito {
    if (!this.finestra?.aperta) return { ok: false, errore: 'La finestra delle azioni è chiusa.' };
    const esito = this.finestra.invia(id_pg, testo, versione);
    if (esito.ok) this.sincronizzaAzione(id_pg);
    return esito;
  }

  ritiraAzione(id_pg: string): Esito {
    if (!this.finestra?.aperta) return { ok: false, errore: 'La finestra delle azioni è chiusa.' };
    const esito = this.finestra.ritira(id_pg);
    if (esito.ok) this.sincronizzaAzione(id_pg);
    return esito;
  }

  segnaPronto(id_pg: string, pronto: boolean): Esito {
    if (!this.finestra?.aperta) return { ok: false, errore: 'La finestra delle azioni è chiusa.' };
    const finestra = this.finestra;
    const esito = finestra.pronto(id_pg, pronto);
    // Se «pronto» ha chiuso la finestra, la chiusura ha già aggiornato le azioni.
    if (esito.ok && finestra.aperta) this.sincronizzaAzione(id_pg);
    return esito;
  }

  private sincronizzaAzione(id_pg: string): void {
    const a = this.finestra?.azioneDi(id_pg);
    if (!a || !this.finestra) return;
    if (!a.testo) {
      // Solo «pronto» senza azione: al telefono non serve una scheda d'azione.
      if (this.azioniPrivate.has(id_pg) && this.azioniPrivate.get(id_pg)!.turno !== this.finestra.turno) this.aggiornaAzione(id_pg, null);
      return;
    }
    this.aggiornaAzione(id_pg, {
      id_pg,
      testo: a.testo,
      stato: a.ritirata ? 'ritirata' : 'in_coda',
      pronto: a.pronto,
      versione_scena: a.versione_scena,
      turno: this.finestra.turno,
    });
  }

  // ------------------------------------------------------------------ flusso della scena

  private interrompiTutto(motivo: string): void {
    this.epoca += 1;
    this.controlloLlm?.abort(new Error(motivo));
    this.controlloLlm = null;
    this.pipeline.interrompi(motivo);
    if (this.finestra?.aperta) this.finestra.chiudi('forzata');
    this.finestra = null;
    if (this.attesaAudio) {
      this.attesaAudio.timer?.();
      this.attesaAudio.risolvi(null);
      this.attesaAudio = null;
    }
    if (this.misuratore) {
      const record = { ...this.misuratore.record(), interrotto: true };
      this.o.registroTurni.scrivi(record);
      this.misuratore = null;
    }
  }

  private avviaScena(): void {
    const epoca = ++this.epoca;
    const c = this.o.campagna;
    this.fase = 'apertura';
    this.turno = 0;
    this.segmentiAperti.clear();
    this.o.log.info({ scena: c.scena.id, frasi: c.scena.apertura.length, voce: this.o.voce.nome }, 'scena: apertura');
    if (this.o.preriscalda && this.o.narratore.preriscalda) void this.preriscalda();

    this.aggiungiTrascrizione({ turno: 0, tipo: 'narrazione', chi: ID_NARRATORE, nome: NOME_NARRATORE, testo: c.scena.apertura.join(' ') });
    c.scena.apertura.forEach((testo, indice) =>
      this.pipeline.accoda({
        id_frase: `t0-f${indice}`,
        turno: 0,
        indice,
        parlante: ID_NARRATORE,
        nome: NOME_NARRATORE,
        voce_id: ID_NARRATORE,
        testo,
      }),
    );
    this.notifica();
    void (async () => {
      const esito = await this.pipeline.chiudiTurno(0);
      if (epoca !== this.epoca || esito.interrotto) return;
      await this.attendiFineAudio(0, esito.secondi);
      if (epoca !== this.epoca) return;
      this.versioneScena += 1;
      this.apriFinestra('tutti');
    })();
  }

  private async preriscalda(): Promise<void> {
    try {
      const inizio = this.o.orologio.ora();
      const esito = await this.o.narratore.preriscalda!(this.o.sistema);
      if (!esito) return;
      this.o.registroCosti.scrivi({ ts: new Date().toISOString(), tipo: 'preriscaldamento', modello: esito.modello, ...esito.costo, ms: Math.round(this.o.orologio.ora() - inizio) });
      this.o.log.info({ ...esito.costo, ms: Math.round(this.o.orologio.ora() - inizio) }, 'llm: cache preriscaldata');
    } catch (err) {
      this.o.log.warn({ err: (err as Error).message }, 'llm: preriscaldamento fallito (si continua)');
    }
  }

  private apriFinestra(invito: string[] | 'tutti'): void {
    const presenti = this.pgAlTavolo();
    let invitati = invito === 'tutti' ? presenti : invito.filter((id) => presenti.includes(id));
    if (invitati.length === 0) {
      if (invito !== 'tutti') this.o.log.warn({ invito, presenti }, 'regia: nessun invitato è al tavolo, si invitano tutti');
      invitati = presenti;
    }
    // Le azioni del turno appena narrato sono risolte.
    for (const [id, a] of this.azioniPrivate) {
      if (a.stato === 'in_risoluzione') this.aggiornaAzione(id, { ...a, stato: 'risolta' });
    }
    this.turno += 1;
    this.segmentiAperti.clear();
    const turno = this.turno;
    this.finestra = new FinestraAzioni({
      turno,
      invitati,
      versioneScena: this.versioneScena,
      chiusuraDopoPrimaAzioneMs: this.o.chiusuraDopoPrimaAzioneMs,
      invitoATutti: invito === 'tutti',
      orologio: this.o.orologio,
      onChiusura: (r) => this.finestraChiusa(r),
      onCambio: () => this.notifica(),
    });
    this.fase = 'finestra';
    this.o.log.info({ turno, invitati, versione_scena: this.versioneScena }, 'finestra: aperta');
    this.notifica();
  }

  private finestraChiusa(r: RiepilogoFinestra): void {
    if (r.motivo === 'forzata') return; // ferma/ricomincia: niente narrazione
    const epoca = this.epoca;
    const c = this.o.campagna;
    this.fase = 'narrazione';
    this.o.log.info(
      { turno: r.turno, motivo: r.motivo, finestra_ms: r.durata_ms, azioni: r.azioni.length, senzaAzione: r.senzaAzione },
      'finestra: chiusa',
    );
    const nomePg = (id: string) => c.pg.find((p) => p.id === id)?.nome ?? id;
    // Le azioni diventano pubbliche nella trascrizione e passano «in risoluzione».
    for (const a of r.azioni) {
      this.aggiungiTrascrizione({ turno: r.turno, tipo: 'azione', chi: a.id_pg, nome: nomePg(a.id_pg), testo: a.testo });
      this.aggiornaAzione(a.id_pg, {
        id_pg: a.id_pg,
        testo: a.testo,
        stato: 'in_risoluzione',
        pronto: a.pronto,
        versione_scena: a.versione_scena,
        turno: r.turno,
      });
    }
    this.misuratore = new MisuratoreTurno(r.turno, r.chiusa_a, r.durata_ms, this.o.voce.nome, this.o.orologio.adesso());
    const messaggio = compilaMessaggioTurno({
      turno: r.turno,
      trascrizione: this.trascrizione,
      azioni: [
        ...r.azioni.map((a) => ({ id_pg: a.id_pg, nome: nomePg(a.id_pg), testo: a.testo })),
        ...r.senzaAzione.map((id) => ({ id_pg: id, nome: nomePg(id), testo: null })),
      ],
      pgAlTavolo: this.pgAlTavolo().map((id) => ({ id, nome: nomePg(id) })),
    });
    this.notifica();
    void this.eseguiNarrazione(r.turno, messaggio, epoca);
  }

  private async eseguiNarrazione(turno: number, messaggio: string, epoca: number): Promise<void> {
    const misuratore = this.misuratore!;
    const controllo = new AbortController();
    this.controlloLlm = controllo;
    const log = this.o.log.child({ turno });
    log.debug({ caratteri: messaggio.length }, 'narratore: messaggio del turno');

    const esito = await narraTurno(
      { campagna: this.o.campagna, narratore: this.o.narratore, pipeline: this.pipeline, log },
      {
        turno,
        sistema: this.o.sistema,
        messaggio,
        signal: controllo.signal,
        misuratore,
        ora: () => this.o.orologio.ora(),
        onFrase: (f) => {
          if (epoca !== this.epoca) return;
          this.trascriviFrase(turno, f.etichetta, f.nome, f.testo, f.segmento);
        },
      },
    );
    if (epoca !== this.epoca) return;
    this.controlloLlm = null;

    if (esito.esito) {
      this.o.registroCosti.scrivi({ ts: new Date().toISOString(), tipo: 'turno', turno, modello: esito.esito.modello, stop_reason: esito.esito.stopReason, ...esito.esito.costo });
      log.info({ ...esito.esito.costo, frasi: esito.frasi, anomalie: esito.anomalie }, 'narratore: turno narrato');
    }
    // Il narratore è caduto senza dire niente: la mossa morbida pronta tiene viva la scena (E3).
    if (esito.errore && esito.frasi === 0) {
      this.uscita?.avviso('errore', 'Il narratore non risponde: riprovo al prossimo turno.');
      this.parlaRiserva(turno);
    }

    const voce = await this.pipeline.chiudiTurno(turno);
    if (epoca !== this.epoca || voce.interrotto) return;
    const fine = await this.attendiFineAudio(turno, voce.secondi);
    if (epoca !== this.epoca) return;
    if (fine !== null) misuratore.imposta('audio_fine', fine);

    const record = misuratore.record();
    this.o.registroTurni.scrivi({ ...record });
    this.uscita?.metriche(record);
    log.info(record, 'turno: misure');
    this.misuratore = null;
    this.primoAudioInviato.delete(turno);
    this.versioneScena += 1;
    this.apriFinestra(esito.invito ?? 'tutti');
  }

  /** Unisce le frasi dello stesso segmento in una voce di trascrizione. */
  private trascriviFrase(turno: number, etichetta: string, nome: string, testo: string, segmento: number): void {
    const chiave = `${turno}:${segmento}`;
    const aperta = this.segmentiAperti.get(chiave);
    if (aperta) aperta.testo = `${aperta.testo} ${testo}`;
    else {
      const voce = this.aggiungiTrascrizione({
        turno,
        tipo: etichetta === ID_NARRATORE ? 'narrazione' : 'battuta',
        chi: etichetta,
        nome,
        testo,
      });
      this.segmentiAperti.set(chiave, voce);
    }
    this.notifica();
  }

  private parlaRiserva(turno: number): void {
    const mossa = this.o.campagna.scena.dati['mossa_morbida_pronta'];
    const testo = typeof mossa === 'string' && mossa.trim() ? mossa.trim() : 'Il fuoco crepita. Per un momento, nessuno parla.';
    this.trascriviFrase(turno, ID_NARRATORE, NOME_NARRATORE, testo, 999);
    this.pipeline.accoda({ id_frase: `t${turno}-riserva`, turno, indice: 0, parlante: ID_NARRATORE, nome: NOME_NARRATORE, voce_id: ID_NARRATORE, testo });
  }

  /**
   * Aspetta che l'audio del turno abbia finito di suonare sullo schermo. Risolve con l'istante
   * (monotono) della fine riferita dallo schermo, oppure null se si è andati avanti con la stima
   * (nessuno schermo, o schermo muto).
   */
  private attendiFineAudio(turno: number, secondi: number): Promise<number | null> {
    if (this.schermi.size === 0 || secondi === 0) return Promise.resolve(null);
    return new Promise((risolvi) => {
      const attesa: AttesaAudio = { turno, risolvi, timer: null };
      this.attesaAudio = attesa;
      this.programmaStimaFine(attesa, secondi);
    });
  }

  /** Riserva: se lo schermo non avvisa, si va avanti alla fine stimata dell'audio più un margine. */
  private programmaStimaFine(attesa: AttesaAudio, secondi: number): void {
    attesa.timer?.();
    const ora = this.o.orologio.ora();
    const inizio = this.primoAudioInviato.get(attesa.turno) ?? ora;
    const fineStimata = inizio + secondi * 1000;
    const ms = Math.max(0, fineStimata - ora) + (this.schermi.size > 0 ? this.o.margineFineAudioMs : 0);
    attesa.timer = this.o.orologio.dopo(ms, () => {
      if (this.attesaAudio !== attesa) return;
      this.attesaAudio = null;
      this.o.log.warn({ turno: attesa.turno, attesa_ms: Math.round(ms) }, 'schermo: fine audio non ricevuta, si prosegue con la stima');
      attesa.risolvi(null);
    });
  }
}
