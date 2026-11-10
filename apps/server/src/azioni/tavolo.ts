/**
 * Motore delle azioni simultanee (docs/azioni-concorrenti.md). Possiede le azioni, la finestra
 * e gli avvisi; l'arbitro (regole + modello) consiglia i collegamenti, qui si decide.
 *
 * - Si può scrivere sempre: a finestra chiusa (il narratore parla) l'azione entra nella prossima.
 * - Un'azione per giocatore per finestra: un nuovo invio la sostituisce.
 * - Dipendenze: se la radice è ritirata, cambiata (in modo che conta), superata o sospesa, chi ne
 *   dipende (anche lungo la catena) passa a «da confermare».
 * - Conflitti esclusivi: vince chi ha inviato prima (pareggi entro 1 s a rotazione); l'altro lo
 *   sa subito, finché può cambiare idea.
 * - Finestra (richieste del 9 novembre): inviare vuol dire «ho finito». Si chiude quando TUTTI gli
 *   invitati hanno un'azione viva, nessuna è da confermare, ed è passata una breve attesa di
 *   assestamento (2,5 s, allungata finché qualcuno sta scrivendo, per un «anch'io» o una
 *   correzione). Al ritmo calmo non c'è nessuna scadenza: se nessuno scrive, il gioco aspetta.
 *   Al ritmo concitato (lo chiede la narrazione) la finestra ha una scadenza dall'apertura; allo
 *   scadere si allunga di poco per chi scrive o deve confermare, poi le «da confermare» diventano
 *   «sospese» e si risolve con quello che c'è. Un'azione in coda NON fa mai partire un conto.
 * - Chiusura atomica: si decide, si blocca la finestra (gli invii vanno alla successiva), si
 *   aspettano per poco i giudizi dell'arbitro in volo, poi in un solo passo sincrono tutte le
 *   azioni vive diventano «chiuse» (o «sospese»).
 * - Dopo la narrazione: le azioni scritte prima di essa si ricontrollano (valida / dubbia /
 *   impossibile); chi aveva perso un conflitto esclusivo e ha tenuto l'azione può risultare
 *   «superata».
 */
import type { AzioneAlTavolo, AzionePrivata, AzionePubblica, Esito, FinestraPubblica, RichiestaScelta } from '@cantastorie/shared';
import { testo } from '../lingua';
import type { Logger } from '../logger';
import type { Orologio } from '../turni/orologio';
import { daSegnalare, percorsoVerso } from './propagazione';
import { normalizza, relazioniDaRegole } from './regole';
import { Spareggio } from './spareggio';
import { avvisoConflitto, avvisoDipendenza, avvisoVecchia, motivoSospesa, motivoSuperata } from './testi';
import { STATI_VIVI, type Arbitro, type Azione, type AzioneArbitro, type ContestoArbitro, type Ritmo } from './tipi';
import type { StatoTavoloSalvato } from '../sessione/tipi';

export const MAX_CARATTERI_AZIONE = 500;

export interface OpzioniTavolo {
  /** PG al tavolo (rotazione dei pareggi, presenza). */
  giocatori: () => string[];
  nomePg: (id_pg: string) => string;
  /** Nome breve per gli avvisi sul telefono («Ginestra», non «Ginestra Fondovalle»). */
  nomeBreve?: (id_pg: string) => string;
  /** Alias minuscoli → id_pg, per le regole. */
  nomi: ReadonlyMap<string, string>;
  orologio: Orologio;
  arbitro: Arbitro | null;
  contesto: () => ContestoArbitro;
  log: Logger;
  /** Attesa dopo che tutti gli invitati hanno inviato, prima di chiudere (default 2,5 s). */
  assestamentoMs?: number;
  /** Ritmo concitato: la finestra si chiude da sola questo tempo dopo l'apertura (default 25 s). */
  concitatoMs?: number;
  /** Allungamento massimo per chi sta scrivendo o deve confermare (assestamento e scadenza). */
  estensioneMaxMs?: number;
  scritturaRecenteMs?: number;
  attesaArbitroMs?: number;
  onCambio: () => void;
  onAzione: (id_pg: string, azione: AzionePrivata | null) => void;
  onChiusura: (r: RiepilogoChiusura) => void;
}

export interface RiepilogoChiusura {
  turno: number;
  /** Azioni chiuse, in ordine di risoluzione (invio, pareggi a rotazione). */
  azioni: Azione[];
  sospese: Azione[];
  /** Invitati senza azione (hanno passato o non hanno scritto). */
  senzaAzione: string[];
  /**
   * «tutti_inviato»: ogni invitato ha la sua azione (dopo l'assestamento).
   * «scadenza»: ritmo concitato, il tempo è finito; si risolve con quello che c'è.
   * «master»: il master l'ha chiusa dal pannello («Risolvi ora»).
   * «forzata»: ferma/ricomincia/cambio di scena, niente narrazione.
   */
  motivo: 'tutti_inviato' | 'scadenza' | 'forzata' | 'master';
  durata_ms: number;
  /** Istante monotono della chiusura (t0 delle misure). */
  chiusa_a: number;
}

interface Finestra {
  turno: number;
  invitati: string[];
  /** Invitati all'apertura: chi si riconnette dopo essere caduto torna nell'elenco. */
  chiamati: string[];
  invitoATutti: boolean;
  aperta: boolean;
  chiudendo: boolean;
  apertaA: number;
  ritmo: Ritmo;
  /** Ritmo concitato: istante (monotono) della scadenza; null al ritmo calmo. */
  scadenzaA: number | null;
  /** La scadenza concitata è passata: inizio dell'allungamento (null = non ancora). */
  dovutaA: number | null;
  /** Tutti gli invitati hanno inviato: da qui conta l'assestamento (null = qualcuno manca). */
  completaA: number | null;
}

export class TavoloAzioni {
  private readonly o: Required<Omit<OpzioniTavolo, 'arbitro' | 'nomeBreve'>> & {
    arbitro: Arbitro | null;
    nomeBreve: (id: string) => string;
  };
  private readonly azioni = new Map<string, Azione>();
  /** id_pg → id dell'ultima azione del giocatore (qualsiasi stato). */
  private readonly ultima = new Map<string, string>();
  private readonly scritture = new Map<string, number>();
  /** Giudizi dell'arbitro in volo per azione (la chiusura li aspetta per poco). */
  private readonly inVolo = new Map<string, Promise<void>>();
  private finestra: Finestra | null = null;
  /** Ultimo turno chiuso (le azioni scritte a finestra chiusa vanno al successivo). */
  private ultimoTurno = 0;
  private versioneScena = 0;
  private prossimoId = 1;
  private annullaControllo: (() => void) | null = null;
  private spareggio: Spareggio;
  /** Giocatori con cui è stato creato lo spareggio (la rotazione vale finché il tavolo non cambia). */
  private giocatoriSpareggio: string;
  /**
   * Pausa del master: la finestra resta aperta (si scrive, si modifica, si ritira) ma non si chiude
   * da sola finché il master non riprende.
   */
  private inPausa = false;

  constructor(opzioni: OpzioniTavolo) {
    this.o = {
      assestamentoMs: 2_500,
      concitatoMs: 25_000,
      estensioneMaxMs: 8_000,
      scritturaRecenteMs: 3_000,
      attesaArbitroMs: 1_200,
      ...opzioni,
      nomeBreve: opzioni.nomeBreve ?? opzioni.nomePg,
    };
    this.spareggio = new Spareggio(opzioni.giocatori());
    this.giocatoriSpareggio = opzioni.giocatori().join(',');
  }

  // ------------------------------------------------------------------ lettura

  get turnoDestinazione(): number {
    const f = this.finestra;
    // Durante la chiusura (lucchetto) gli invii vanno già alla finestra successiva.
    if (f?.aperta) return f.chiudendo ? f.turno + 1 : f.turno;
    return this.ultimoTurno + 1;
  }

  get aperta(): boolean {
    return !!this.finestra?.aperta;
  }

  /** La finestra si sta chiudendo (lucchetto preso, si aspettano i giudizi dell'arbitro). */
  get chiudendo(): boolean {
    return !!this.finestra?.aperta && this.finestra.chiudendo;
  }

  /** La finestra aperta è sospesa dalla pausa del master. */
  get sospesa(): boolean {
    return this.inPausa;
  }

  get turnoFinestra(): number | null {
    return this.finestra?.aperta ? this.finestra.turno : null;
  }

  èInvitato(id_pg: string): boolean {
    return !!this.finestra?.aperta && this.finestra.invitati.includes(id_pg);
  }

  azione(id: string): Azione | undefined {
    return this.azioni.get(id);
  }

  tutte(): Azione[] {
    return [...this.azioni.values()];
  }

  private vive(turno = this.turnoDestinazione): Azione[] {
    return this.tutte().filter((a) => a.turno === turno && STATI_VIVI.has(a.stato));
  }

  private azioneViva(id_pg: string, turno = this.turnoDestinazione): Azione | undefined {
    const id = this.ultima.get(id_pg);
    const a = id ? this.azioni.get(id) : undefined;
    return a && a.turno === turno && STATI_VIVI.has(a.stato) ? a : undefined;
  }

  privata(a: Azione): AzionePrivata {
    return {
      id: a.id,
      id_pg: a.autore,
      testo: a.testo,
      privata: a.privata,
      stato: a.stato,
      motivo: a.motivo,
      richiesta: a.richiesta,
      versione_vista: a.versione_vista,
      turno: a.turno,
      inviata_alle: a.inviata_alle,
    };
  }

  azioneDi(id_pg: string): AzionePrivata | null {
    const id = this.ultima.get(id_pg);
    const a = id ? this.azioni.get(id) : undefined;
    return a ? this.privata(a) : null;
  }

  /** «Al tavolo»: azioni PUBBLICHE vive di tutti (anche quelle per la finestra successiva). */
  alTavolo(): AzioneAlTavolo[] {
    return this.tutte()
      .filter((a) => STATI_VIVI.has(a.stato) && !a.privata && a.turno >= this.turnoDestinazione)
      .sort((x, y) => x.inviata_alle - y.inviata_alle)
      .map((a) => ({
        id: a.id,
        id_pg: a.autore,
        nome: this.o.nomePg(a.autore),
        testo: a.testo,
        stato: a.stato,
        dipende_da: a.dipende_da.map((d) => this.azioni.get(d)).filter((d): d is Azione => !!d).map((d) => this.o.nomeBreve(d.autore)),
        turno: a.turno,
      }));
  }

  finestraPubblica(): FinestraPubblica {
    const f = this.finestra;
    if (!f || !f.aperta) return { aperta: false, turno: this.ultimoTurno, invitati: [], azioni: [], aspettiamo: [], chiusura_prevista_ms: null };
    const azioni: AzionePubblica[] = f.invitati.map((id) => ({ id_pg: id, scritta: !!this.azioneViva(id, f.turno) }));
    return {
      aperta: true,
      turno: f.turno,
      invitati: [...f.invitati],
      azioni,
      aspettiamo: this.mancano(f),
      // Solo al ritmo concitato c'è un conto alla rovescia; in pausa la finestra non si chiude da sola.
      chiusura_prevista_ms: this.inPausa ? null : this.scadenzaEpoch(),
    };
  }

  /** Invitati che non hanno ancora un'azione viva in questa finestra (chi stiamo aspettando). */
  private mancano(f: Finestra): string[] {
    return f.invitati.filter((id) => !this.azioneViva(id, f.turno));
  }

  /**
   * Epoch ms della chiusura automatica: solo al ritmo concitato (la scadenza, o la fine
   * dell'allungamento una volta scaduta). Al ritmo calmo null: nessun conto alla rovescia.
   */
  private scadenzaEpoch(): number | null {
    const f = this.finestra;
    if (!f || f.scadenzaA === null) return null;
    const mono = f.dovutaA !== null ? f.dovutaA + this.o.estensioneMaxMs : f.scadenzaA;
    return this.epoch(mono);
  }

  /** Ritmo della finestra aperta (null a finestra chiusa). */
  get ritmo(): Ritmo | null {
    return this.finestra?.aperta ? this.finestra.ritmo : null;
  }

  private epoch(mono: number): number {
    return Math.round(this.o.orologio.adesso() + (mono - this.o.orologio.ora()));
  }

  // ------------------------------------------------------------------ finestra

  /**
   * Apre la finestra del turno. `ritmo` concitato fissa la scadenza da adesso (la narrazione l'ha
   * chiesto); al ritmo calmo nessuna scadenza. Le azioni già in coda (scritte mentre il narratore
   * parlava) contano subito, ma non fanno partire nessun conto alla rovescia.
   */
  apri(turno: number, invitati: string[], versioneScena: number, invitoATutti: boolean, ritmo: Ritmo = 'calmo'): void {
    this.versioneScena = versioneScena;
    this.ultimoTurno = turno - 1;
    // La rotazione dei pareggi continua tra le finestre; riparte solo se cambiano i giocatori.
    const giocatori = this.o.giocatori();
    if (giocatori.join(',') !== this.giocatoriSpareggio) {
      this.spareggio = new Spareggio(giocatori);
      this.giocatoriSpareggio = giocatori.join(',');
    }
    const ora = this.o.orologio.ora();
    const elenco = [...new Set(invitati)];
    this.finestra = {
      turno,
      invitati: elenco,
      chiamati: [...elenco],
      invitoATutti,
      aperta: true,
      chiudendo: false,
      apertaA: ora,
      ritmo,
      scadenzaA: ritmo === 'concitato' ? ora + this.o.concitatoMs : null,
      dovutaA: null,
      completaA: null,
    };
    this.o.log.info({ turno, invitati: elenco, giaInCoda: this.vive(turno).length, ritmo, scadenza_ms: ritmo === 'concitato' ? this.o.concitatoMs : null }, 'finestra: aperta');
    this.o.onCambio();
    this.controlla();
  }

  /**
   * Cambio di ritmo a finestra aperta (master): concitato fissa la scadenza da adesso, calmo la
   * toglie (e azzera l'eventuale allungamento). A finestra chiusa vale per la prossima (lo passa
   * la regia ad `apri`).
   */
  impostaRitmo(ritmo: Ritmo): void {
    const f = this.finestra;
    if (!f?.aperta || f.chiudendo || f.ritmo === ritmo) return;
    f.ritmo = ritmo;
    f.scadenzaA = ritmo === 'concitato' ? this.o.orologio.ora() + this.o.concitatoMs : null;
    f.dovutaA = null;
    this.o.log.info({ turno: f.turno, ritmo }, 'finestra: ritmo cambiato a finestra aperta');
    for (const a of this.vive(f.turno)) {
      if (a.richiesta) {
        a.richiesta = { ...a.richiesta, scadenza_ms: this.scadenzaEpoch() };
        this.notificaAzione(a);
      }
    }
    this.o.onCambio();
    this.controlla();
  }

  /**
   * Un telefono ha scelto (o ritrovato) il suo PG: con l'invito a `tutti` entra nell'elenco; con
   * un invito per nome rientra solo se era chiamato all'apertura (era caduto la connessione).
   */
  aggiungiInvitato(id_pg: string): void {
    const f = this.finestra;
    if (!f?.aperta || f.chiudendo || f.invitati.includes(id_pg)) return;
    if (!f.invitoATutti && !f.chiamati.includes(id_pg)) return;
    f.invitati.push(id_pg);
    this.o.log.info({ turno: f.turno, id_pg }, 'finestra: invitato (ri)entrato');
    this.o.onCambio();
    this.controlla();
  }

  /**
   * Il telefono di un invitato si è scollegato: non lo si aspetta (se ha già scritto, la sua azione
   * conta comunque). Se non resta nessun invitato si aspetta chiunque sia al tavolo, così il
   * turno non parte mai senza un'azione.
   */
  rimuoviInvitato(id_pg: string): void {
    const f = this.finestra;
    if (!f?.aperta || f.chiudendo || !f.invitati.includes(id_pg)) return;
    if (this.azioneViva(id_pg, f.turno)) return; // ha scritto: la sua azione conta comunque
    f.invitati = f.invitati.filter((x) => x !== id_pg);
    if (f.invitati.length === 0) {
      f.invitati = this.o.giocatori().filter((x) => x !== id_pg);
      if (f.invitati.length === 0) f.invitati = [id_pg];
      f.invitoATutti = true;
      this.o.log.info({ turno: f.turno, uscito: id_pg, invitati: f.invitati }, 'finestra: nessun invitato collegato, si aspetta il tavolo');
    } else {
      this.o.log.info({ turno: f.turno, uscito: id_pg, invitati: f.invitati }, 'finestra: invitato scollegato, non lo si aspetta');
    }
    this.o.onCambio();
    this.controlla();
  }

  // ------------------------------------------------------------------ comandi dei telefoni

  invia(id_pg: string, testoAzione: string, versioneVista: number, privata = false): Esito {
    const pulito = testoAzione.trim();
    // Errori per il telefono: frasi del pacchetto della lingua (sezione `tavolo`).
    if (!pulito) return { ok: false, errore: testo('tavolo.scrivi_azione') };
    if (pulito.length > MAX_CARATTERI_AZIONE) return { ok: false, errore: testo('tavolo.troppo_lunga', { max: MAX_CARATTERI_AZIONE }) };
    const adesso = this.o.orologio.adesso();
    const turno = this.turnoDestinazione;
    const esistente = this.azioneViva(id_pg, turno);
    if (esistente) {
      const prima = { ...esistente };
      esistente.testo = pulito;
      esistente.privata = privata;
      esistente.revisione += 1;
      esistente.modificata_alle = adesso;
      esistente.stato = 'in_coda';
      esistente.richiesta = null;
      esistente.motivo = null;
      esistente.causa = null;
      esistente.conflitti = [];
      esistente.dipende_da = [];
      this.o.log.info({ azione: esistente.id, autore: id_pg, revisione: esistente.revisione }, 'azione: modificata');
      this.dopoInvio(esistente);
      this.valutaCambio(prima, esistente);
    } else {
      const a: Azione = {
        id: `a${this.prossimoId++}`,
        autore: id_pg,
        testo: pulito,
        privata,
        inviata_alle: adesso,
        modificata_alle: adesso,
        versione_vista: Math.min(versioneVista, this.versioneScena),
        turno,
        stato: 'in_coda',
        motivo: null,
        richiesta: null,
        dipende_da: [],
        conflitti: [],
        revisione: 1,
        causa: null,
      };
      this.azioni.set(a.id, a);
      this.ultima.set(id_pg, a.id);
      this.o.log.info({ azione: a.id, autore: id_pg, turno, privata, versione_vista: a.versione_vista, finestra_aperta: this.aperta }, 'azione: inviata');
      this.dopoInvio(a);
    }
    this.scritture.delete(id_pg);
    this.riavviaAssestamento();
    this.o.onCambio();
    this.controlla();
    return { ok: true };
  }

  ritira(id_pg: string): Esito {
    const a = this.azioneViva(id_pg);
    if (!a) return { ok: false, errore: testo('tavolo.niente_da_ritirare') };
    a.stato = 'ritirata';
    a.richiesta = null;
    a.motivo = null;
    this.o.log.info({ azione: a.id, autore: id_pg }, 'azione: ritirata');
    this.segnalaDipendenti(a, 'ritirata', null);
    this.notificaAzione(a);
    this.riavviaAssestamento();
    this.o.onCambio();
    this.controlla();
    return { ok: true };
  }

  /** «Confermo» / «Tengo». */
  conferma(id_pg: string): Esito {
    const a = this.azioneViva(id_pg);
    if (!a || a.stato !== 'da_confermare') return { ok: false, errore: testo('tavolo.niente_da_confermare') };
    a.stato = 'in_coda';
    a.richiesta = null;
    a.motivo = null;
    this.o.log.info({ azione: a.id, autore: id_pg }, 'azione: confermata');
    this.notificaAzione(a);
    this.riavviaAssestamento();
    this.o.onCambio();
    this.controlla();
    return { ok: true };
  }

  /**
   * Indicatore «sta scrivendo»: allunga l'assestamento (un «anch'io» in arrivo) e, al ritmo
   * concitato, l'allungamento dopo la scadenza. Non fa mai partire un conto alla rovescia.
   */
  scrivo(id_pg: string): void {
    this.scritture.set(id_pg, this.o.orologio.ora());
    this.controlla();
  }

  /** Qualcosa è cambiato (invio, modifica, ritiro, conferma): l'assestamento riparte da adesso. */
  private riavviaAssestamento(): void {
    if (this.finestra?.aperta && !this.finestra.chiudendo) this.finestra.completaA = null;
  }

  // ------------------------------------------------------------------ arbitro

  private versoArbitro(a: Azione): AzioneArbitro {
    return { id: a.id, autore: a.autore, nome: this.o.nomePg(a.autore), testo: a.testo, privata: a.privata };
  }

  /** Dopo un invio o una modifica: regole subito, modello in sottofondo (non blocca l'invio). */
  private dopoInvio(a: Azione): void {
    const altri = this.vive(a.turno).filter((x) => x.id !== a.id);
    const coda = altri.map((x) => this.versoArbitro(x));
    const regole = relazioniDaRegole(this.versoArbitro(a), coda, this.o.nomi);
    if (regole.dipende_da.length) this.applicaRelazioni(a, a.revisione, { dipende_da: regole.dipende_da, conflitti: [], fonte: 'regole' });
    this.notificaAzione(a);
    if (regole.certo || altri.length === 0 || !this.o.arbitro) return;
    const rev = a.revisione;
    const t0 = this.o.orologio.ora();
    const p = this.o.arbitro
      .relazioni({ ...this.o.contesto(), nuova: this.versoArbitro(a), coda })
      .then((esito) => {
        this.o.log.info({ azione: a.id, ms: Math.round(this.o.orologio.ora() - t0), esito }, 'arbitro: relazioni');
        this.applicaRelazioni(a, rev, esito);
      })
      .catch((err: unknown) => this.o.log.error({ azione: a.id, err: (err as Error).message }, 'arbitro: relazioni fallite'))
      .finally(() => {
        if (this.inVolo.get(a.id) === p) this.inVolo.delete(a.id);
      });
    this.inVolo.set(a.id, p);
  }

  /** Applica dipendenze e conflitti suggeriti, se l'azione è ancora quella giudicata. */
  applicaRelazioni(a: Azione, revisione: number, esito: { dipende_da: string[]; conflitti: Array<{ con: string; esclusivo: boolean }>; fonte?: string }): void {
    if (a.revisione !== revisione || !STATI_VIVI.has(a.stato)) return;
    const valida = (id: string): Azione | undefined => {
      const x = this.azioni.get(id);
      return x && x.id !== a.id && x.autore !== a.autore && x.turno === a.turno && STATI_VIVI.has(x.stato) ? x : undefined;
    };
    // Da un'azione privata altrui non si può dipendere: l'autore non la vede.
    const dipende = [...new Set(esito.dipende_da)].filter((id) => {
      const x = valida(id);
      return x && !x.privata;
    });
    if (dipende.length) a.dipende_da = [...new Set([...a.dipende_da, ...dipende])];
    // Corsa: l'azione a cui si appoggia è stata ritirata (o è uscita dal turno) mentre l'arbitro
    // decideva. Il legame non vale più, ma l'autore va avvisato come se fosse successo dopo.
    if (a.stato === 'in_coda') {
      const caduta = [...new Set(esito.dipende_da)]
        .map((id) => this.azioni.get(id))
        .find((x) => x && x.autore !== a.autore && x.turno === a.turno && !x.privata && (x.stato === 'ritirata' || x.stato === 'superata' || x.stato === 'sospesa'));
      if (caduta) {
        const evento = caduta.stato as 'ritirata' | 'superata' | 'sospesa';
        this.chiediScelta(
          a,
          { tipo: 'dipendenza', testo: avvisoDipendenza({ nomeRadice: this.o.nomeBreve(caduta.autore), testoRadice: caduta.testo, evento, testoMio: a.testo }), conferma: 'Confermo' },
          caduta.id,
        );
        this.o.log.info({ azione: a.id, radice: caduta.id, evento }, 'azioni: dipendeva da un’azione già caduta');
      }
    }
    for (const c of esito.conflitti) {
      const altra = valida(c.con);
      if (!altra || a.conflitti.some((k) => k.con === altra.id)) continue;
      const vince = c.esclusivo ? this.spareggio.vincitore(a, altra) : a.inviata_alle <= altra.inviata_alle ? a.id : altra.id;
      a.conflitti.push({ con: altra.id, esclusivo: c.esclusivo, vince });
      altra.conflitti = altra.conflitti.filter((k) => k.con !== a.id);
      altra.conflitti.push({ con: a.id, esclusivo: c.esclusivo, vince });
      if (!c.esclusivo) continue;
      const perdente = vince === a.id ? altra : a;
      const vincitrice = vince === a.id ? a : altra;
      this.o.log.info({ vince: vincitrice.id, perde: perdente.id }, 'azioni: conflitto esclusivo');
      if (perdente.stato === 'in_coda') {
        this.chiediScelta(perdente, {
          tipo: 'conflitto',
          testo: avvisoConflitto(vincitrice.privata ? { nomeVincitore: null, testoVincitore: null } : { nomeVincitore: this.o.nomeBreve(vincitrice.autore), testoVincitore: vincitrice.testo }),
          conferma: 'Tengo',
        });
      }
      this.notificaAzione(vincitrice);
    }
    this.notificaAzione(a);
    this.o.onCambio();
    this.controlla();
  }

  /** La radice è cambiata: si avvisa solo chi ne è davvero toccato (lo dice l'arbitro). */
  private valutaCambio(prima: Azione, dopo: Azione): void {
    const diretti = this.vive(dopo.turno).filter((x) => x.dipende_da.includes(dopo.id));
    if (!diretti.length) return;
    if (normalizza(prima.testo).replace(/[^\p{L}\p{N} ]/gu, '') === normalizza(dopo.testo).replace(/[^\p{L}\p{N} ]/gu, '')) return;
    const segnala = (toccate: Set<string> | null): void => this.segnalaDipendenti(dopo, 'cambiata', toccate, prima.testo);
    if (!this.o.arbitro) return segnala(null);
    const rev = dopo.revisione;
    const p = this.o.arbitro
      .cambio({ ...this.o.contesto(), prima: this.versoArbitro(prima), dopo: this.versoArbitro(dopo), dipendenti: diretti.map((x) => this.versoArbitro(x)) })
      .then((g) => {
        if (dopo.revisione !== rev) return;
        const toccate = new Set(diretti.filter((x) => g[x.id]?.toccata !== false).map((x) => x.id));
        this.o.log.info({ azione: dopo.id, toccate: [...toccate] }, 'arbitro: cambio');
        segnala(toccate);
      })
      .catch((err: unknown) => {
        this.o.log.error({ azione: dopo.id, err: (err as Error).message }, 'arbitro: cambio fallito, si avvisano tutti');
        segnala(null);
      });
    this.inVolo.set(`cambio:${dopo.id}`, p);
    void p.finally(() => this.inVolo.delete(`cambio:${dopo.id}`));
  }

  /** Propaga lungo la catena: i dipendenti vivi passano a «da confermare». */
  private segnalaDipendenti(radice: Azione, evento: 'ritirata' | 'cambiata' | 'superata' | 'sospesa', toccate: Set<string> | null, testoPrima?: string): void {
    const ids = daSegnalare(this.tutte(), radice.id, toccate);
    for (const id of ids) {
      const d = this.azioni.get(id)!;
      const percorso = percorsoVerso(this.tutte(), id, radice.id);
      const intermedio = percorso.length > 2 ? this.azioni.get(percorso[1]!) : undefined;
      this.chiediScelta(
        d,
        {
          tipo: 'dipendenza',
          testo: avvisoDipendenza({
            nomeRadice: this.o.nomeBreve(radice.autore),
            testoRadice: testoPrima ?? radice.testo,
            evento,
            testoNuovoRadice: radice.testo,
            testoMio: d.testo,
            ...(intermedio ? { tramite: this.o.nomeBreve(intermedio.autore) } : {}),
          }),
          conferma: 'Confermo',
        },
        radice.id,
      );
    }
    if (ids.length) this.o.log.info({ radice: radice.id, evento, avvisati: ids }, 'azioni: dipendenti da confermare');
  }

  private chiediScelta(a: Azione, r: Omit<RichiestaScelta, 'scadenza_ms' | 'consigliato'>, causa: string | null = null): void {
    a.stato = 'da_confermare';
    a.causa = causa;
    // La spinta giusta: chi ha perso l'appoggio (dipendenza, conflitto) probabilmente cambia;
    // un'azione vecchia ma dubbia probabilmente vale ancora.
    const consigliato = r.tipo === 'vecchia' ? 'conferma' : 'cambio';
    // Al ritmo concitato la scelta ha la scadenza della finestra; al calmo nessuna (si aspetta).
    a.richiesta = { ...r, consigliato, scadenza_ms: this.finestra?.aperta && this.finestra.turno === a.turno ? this.scadenzaEpoch() : null };
    a.motivo = r.testo;
    this.notificaAzione(a);
  }

  private notificaAzione(a: Azione): void {
    if (this.ultima.get(a.autore) === a.id) this.o.onAzione(a.autore, this.privata(a));
  }

  // ------------------------------------------------------------------ chiusura

  /**
   * Ricontrolla le condizioni di chiusura e programma il prossimo controllo (un solo timer).
   *
   * 1. Completa: ogni invitato ha un'azione viva e nessuna azione è da confermare → si chiude
   *    dopo `assestamentoMs` dal momento in cui lo è diventata (ogni invio, ritiro o conferma lo
   *    fa ripartire), allungato finché qualcuno sta scrivendo, al massimo di `estensioneMaxMs`.
   * 2. Ritmo concitato e scadenza passata → allungamento (al massimo `estensioneMaxMs`) finché
   *    c'è chi scrive o deve confermare, poi si chiude con quello che c'è.
   * 3. Altrimenti si aspetta, senza timer: al ritmo calmo il gioco non ha fretta.
   */
  private controlla(): void {
    const f = this.finestra;
    if (!f?.aperta || f.chiudendo || this.inPausa) return;
    this.annullaControllo?.();
    this.annullaControllo = null;
    const ora = this.o.orologio.ora();
    const vive = this.vive(f.turno);
    const daConfermare = vive.some((a) => a.stato === 'da_confermare');
    const completa = f.invitati.length > 0 && this.mancano(f).length === 0 && !daConfermare;
    // Chi sta scrivendo adesso (anche chi non è invitato: la sua azione entra in questo turno).
    const scriventi = [...this.scritture.values()].filter((t) => ora - t < this.o.scritturaRecenteMs);
    const fineScrittura = scriventi.length ? Math.max(...scriventi) + this.o.scritturaRecenteMs : 0;
    const scadenze: number[] = [];

    if (completa) {
      if (f.completaA === null) {
        f.completaA = ora;
        this.o.log.debug({ turno: f.turno, assestamento_ms: this.o.assestamentoMs }, 'finestra: tutti hanno inviato, assestamento');
      }
      const base = f.completaA + this.o.assestamentoMs;
      const fine = Math.min(Math.max(base, fineScrittura), base + this.o.estensioneMaxMs);
      if (ora >= fine) return void this.chiudi('tutti_inviato');
      scadenze.push(fine);
    } else {
      f.completaA = null;
    }

    if (f.scadenzaA !== null) {
      if (ora >= f.scadenzaA) {
        if (f.dovutaA === null) {
          f.dovutaA = ora;
          this.o.log.info({ turno: f.turno, mancano: this.mancano(f), daConfermare }, 'finestra: scadenza del ritmo concitato');
          // Le scelte in sospeso ora hanno una scadenza precisa (la fine dell'allungamento).
          for (const a of vive) {
            if (a.richiesta) {
              a.richiesta = { ...a.richiesta, scadenza_ms: this.scadenzaEpoch() };
              this.notificaAzione(a);
            }
          }
          this.o.onCambio();
        }
        const fine = f.dovutaA + this.o.estensioneMaxMs;
        const invitatiScrivono = f.invitati.some((p) => {
          const t = this.scritture.get(p);
          return t !== undefined && ora - t < this.o.scritturaRecenteMs;
        });
        if (!(daConfermare || invitatiScrivono) || ora >= fine) return void this.chiudi('scadenza');
        scadenze.push(Math.min(fine, fineScrittura || fine));
      } else {
        scadenze.push(f.scadenzaA);
      }
    }

    if (scadenze.length) {
      const prossimo = Math.min(...scadenze);
      this.annullaControllo = this.o.orologio.dopo(Math.max(10, prossimo - ora), () => this.controlla());
    }
  }

  /** Chiusura forzata (ferma/ricomincia): niente narrazione. */
  chiudiForzata(): void {
    this.inPausa = false;
    if (this.finestra?.aperta) void this.chiudi('forzata');
  }

  // ------------------------------------------------------------------ comandi del master

  /**
   * Pausa del master a finestra aperta: niente chiusura automatica. Le azioni restano vive e
   * modificabili; i timer si fermano.
   */
  sospendi(): void {
    if (this.inPausa) return;
    this.inPausa = true;
    this.annullaControllo?.();
    this.annullaControllo = null;
    this.o.log.info({ turno: this.finestra?.turno ?? null }, 'finestra: sospesa dal master');
    this.o.onCambio();
  }

  /**
   * Ripresa dopo la pausa: al ritmo concitato la scadenza riparte da capo (tutto il tempo di
   * nuovo), l'allungamento e l'assestamento si azzerano.
   */
  riprendi(): void {
    if (!this.inPausa) return;
    this.inPausa = false;
    const f = this.finestra;
    if (f?.aperta && !f.chiudendo) {
      f.scadenzaA = f.ritmo === 'concitato' ? this.o.orologio.ora() + this.o.concitatoMs : null;
      f.dovutaA = null;
      f.completaA = null;
    }
    this.o.log.info({ turno: f?.turno ?? null }, 'finestra: ripresa dal master');
    this.o.onCambio();
    this.controlla();
  }

  /** Il master chiude la finestra adesso: il narratore risponde alle azioni inviate. */
  chiudiOra(): Esito {
    const f = this.finestra;
    if (!f?.aperta) return { ok: false, errore: testo('tavolo.finestra_chiusa') };
    if (f.chiudendo) return { ok: false, errore: testo('tavolo.finestra_in_chiusura') };
    if (this.inPausa) return { ok: false, errore: testo('tavolo.in_pausa') };
    void this.chiudi('master');
    return { ok: true };
  }

  /**
   * Il master salta un'azione viva: diventa «superata» con il motivo (il testo torna nella casella
   * del giocatore), e chi ne dipendeva deve decidere come per un ritiro.
   */
  salta(id: string, motivo: string): Azione | null {
    const a = this.azioni.get(id);
    if (!a || !STATI_VIVI.has(a.stato)) return null;
    a.stato = 'superata';
    a.richiesta = null;
    a.motivo = motivo;
    this.riavviaAssestamento();
    this.o.log.info({ azione: a.id, autore: a.autore, turno: a.turno }, 'azione: saltata dal master');
    this.segnalaDipendenti(a, 'superata', null);
    this.notificaAzione(a);
    this.o.onCambio();
    this.controlla();
    return a;
  }

  /**
   * Cambio di scena: tutte le azioni ancora vive (di qualunque turno) erano per la scena di prima.
   * Diventano «superate» col motivo, e tornano nella casella dei giocatori.
   */
  annullaVive(motivo: string): string[] {
    const vive = this.tutte().filter((a) => STATI_VIVI.has(a.stato));
    for (const a of vive) {
      a.stato = 'superata';
      a.richiesta = null;
      a.motivo = motivo;
      this.notificaAzione(a);
    }
    if (vive.length) this.o.log.info({ azioni: vive.map((a) => a.id) }, 'azioni: cambio di scena, da riscrivere');
    this.o.onCambio();
    return vive.map((a) => a.id);
  }

  /**
   * Narrazione interrotta dal master: le azioni «chiuse» di quel turno non sono state risolte.
   * Diventano «superate» con il motivo, così tornano nella casella pronte da rimandare.
   */
  annullaChiuse(turno: number, motivo: string): string[] {
    const chiuse = this.tutte().filter((a) => a.turno === turno && a.stato === 'chiusa');
    for (const a of chiuse) {
      a.stato = 'superata';
      a.motivo = motivo;
      this.notificaAzione(a);
    }
    if (chiuse.length) this.o.log.info({ turno, azioni: chiuse.map((a) => a.id) }, 'azioni: narrazione interrotta, da riscrivere');
    this.o.onCambio();
    return chiuse.map((a) => a.id);
  }

  /**
   * Combattimento a turni (docs/combattimento.md): le azioni chiuse di chi NON era di turno tornano in
   * coda per il turno successivo, così si risolvono quando tocca a loro (nessuno perde ciò che ha scritto).
   */
  rinvia(ids: readonly string[]): string[] {
    const fatte: string[] = [];
    for (const id of ids) {
      const a = this.azioni.get(id);
      if (!a || a.stato !== 'chiusa') continue;
      a.stato = 'in_coda';
      a.turno = this.ultimoTurno + 1;
      a.motivo = null;
      this.notificaAzione(a);
      fatte.push(id);
    }
    if (fatte.length) {
      this.o.log.info({ azioni: fatte, turno: this.ultimoTurno + 1 }, 'azioni: rinviate al turno del loro PG (combattimento)');
      this.o.onCambio();
    }
    return fatte;
  }

  private async chiudi(motivo: RiepilogoChiusura['motivo']): Promise<void> {
    const f = this.finestra;
    if (!f?.aperta || f.chiudendo) return;
    f.chiudendo = true; // lucchetto: da qui gli invii vanno alla finestra successiva
    this.annullaControllo?.();
    this.annullaControllo = null;
    // Giudizi dell'arbitro ancora in volo: si aspettano per poco, così il narratore ha i collegamenti.
    if (motivo !== 'forzata' && this.inVolo.size) {
      const t0 = this.o.orologio.ora();
      await Promise.race([Promise.allSettled([...this.inVolo.values()]), new Promise((r) => this.o.orologio.dopo(this.o.attesaArbitroMs, () => r(null)))]);
      this.o.log.debug({ ms: Math.round(this.o.orologio.ora() - t0) }, 'finestra: attesa arbitro alla chiusura');
    }
    // --- passo atomico (sincrono) ---
    const ora = this.o.orologio.ora();
    const vive = this.vive(f.turno);
    const sospese: Azione[] = [];
    const chiuse: Azione[] = [];
    for (const a of vive) {
      if (a.stato === 'da_confermare' || motivo === 'forzata') {
        if (motivo !== 'forzata') {
          a.stato = 'sospesa';
          a.richiesta = null;
          a.motivo = motivoSospesa();
          sospese.push(a);
        }
      } else {
        a.stato = 'chiusa';
        a.richiesta = null;
        chiuse.push(a);
      }
    }
    // L'ordine rispetta i vincitori dei conflitti già annunciati ai giocatori.
    const ordinate = this.spareggio.ordina(chiuse, (x, y) => x.conflitti.find((c) => c.con === y.id && c.esclusivo)?.vince ?? null);
    f.aperta = false;
    f.chiudendo = false;
    this.ultimoTurno = f.turno;
    const scritto = new Set(vive.map((a) => a.autore));
    const r: RiepilogoChiusura = {
      turno: f.turno,
      azioni: ordinate,
      sospese,
      senzaAzione: f.invitati.filter((p) => !scritto.has(p)),
      motivo,
      durata_ms: Math.round(ora - f.apertaA),
      chiusa_a: ora,
    };
    for (const a of vive) this.notificaAzione(a);
    this.o.log.info({ turno: f.turno, motivo, ritmo: f.ritmo, chiuse: ordinate.map((a) => a.id), sospese: sospese.map((a) => a.id), durata_ms: r.durata_ms }, 'finestra: chiusa');
    if (motivo !== 'forzata') this.o.onChiusura(r);
    this.o.onCambio();
  }

  // ------------------------------------------------------------------ dopo la narrazione

  /**
   * La narrazione del turno `turnoRisolto` è finita (versione della scena ora `versioneNuova`):
   * le chiuse diventano risolte (chi aveva perso un conflitto esclusivo si ricontrolla), e le
   * azioni in coda scritte prima di questa narrazione si giudicano: valida / dubbia / impossibile.
   */
  async dopoNarrazione(turnoRisolto: number, versioneNuova: number): Promise<void> {
    this.versioneScena = versioneNuova;
    const chiuse = this.tutte().filter((a) => a.turno === turnoRisolto && a.stato === 'chiusa');
    const perdenti = chiuse.filter((a) => a.conflitti.some((c) => c.esclusivo && c.vince !== a.id));
    for (const a of chiuse) {
      if (perdenti.includes(a)) continue;
      a.stato = 'risolta';
      this.notificaAzione(a);
    }
    const vecchie = this.tutte().filter((a) => a.turno > turnoRisolto && STATI_VIVI.has(a.stato) && a.versione_vista < versioneNuova);
    this.o.onCambio();
    if (!this.o.arbitro || (!perdenti.length && !vecchie.length)) {
      for (const a of perdenti) {
        a.stato = 'risolta';
        this.notificaAzione(a);
      }
      return;
    }
    const daGiudicare = [...perdenti, ...vecchie];
    const revisioni = new Map(daGiudicare.map((a) => [a.id, a.revisione]));
    let giudizi: Awaited<ReturnType<Arbitro['vecchie']>> = {};
    try {
      giudizi = await this.o.arbitro.vecchie({ ...this.o.contesto(), azioni: daGiudicare.map((a) => this.versoArbitro(a)) });
      this.o.log.info({ turno: turnoRisolto, giudizi }, 'arbitro: azioni vecchie');
    } catch (err) {
      this.o.log.error({ err: (err as Error).message }, 'arbitro: giudizio delle azioni vecchie fallito (restano valide)');
    }
    for (const a of perdenti) {
      const g = giudizi[a.id];
      if (g?.giudizio === 'impossibile') {
        a.stato = 'superata';
        a.motivo = motivoSuperata(g.motivo);
      } else a.stato = 'risolta';
      this.notificaAzione(a);
    }
    for (const a of vecchie) {
      const g = giudizi[a.id];
      if (!g || a.revisione !== revisioni.get(a.id) || !STATI_VIVI.has(a.stato) || g.giudizio === 'valida') continue;
      if (g.giudizio === 'dubbia') {
        this.chiediScelta(a, { tipo: 'vecchia', testo: avvisoVecchia(g.motivo, a.testo), conferma: 'Confermo' });
      } else {
        a.stato = 'superata';
        a.richiesta = null;
        a.motivo = motivoSuperata(g.motivo);
        this.notificaAzione(a);
        this.segnalaDipendenti(a, 'superata', null);
      }
    }
    this.o.onCambio();
    this.controlla();
  }

  // ------------------------------------------------------------------ sessione salvata

  /**
   * Stato da salvare nel registro della sessione: le azioni che contano ancora (vive, dei due turni
   * più recenti, e l'ultima di ogni giocatore), la finestra (senza timer) e i contatori.
   */
  esporta(): StatoTavoloSalvato {
    const ultime = new Set(this.ultima.values());
    const azioni = this.tutte()
      .filter((a) => STATI_VIVI.has(a.stato) || a.turno >= this.ultimoTurno - 1 || ultime.has(a.id))
      .map((a) => ({ ...a, dipende_da: [...a.dipende_da], conflitti: a.conflitti.map((c) => ({ ...c })) }));
    const f = this.finestra;
    return {
      azioni,
      ultima: [...this.ultima],
      finestra: f ? { turno: f.turno, invitati: [...f.invitati], invitoATutti: f.invitoATutti, aperta: f.aperta, ritmo: f.ritmo } : null,
      ultimoTurno: this.ultimoTurno,
      versioneScena: this.versioneScena,
      prossimoId: this.prossimoId,
      inPausa: this.inPausa,
    };
  }

  /**
   * Ripresa di una sessione. La finestra resta CHIUSA (niente timer finché la regia non la riapre):
   * si restituisce com'era, così la regia sa se riaprirla. Le azioni «chiuse» erano nel turno che il
   * narratore stava raccontando quando il server si è fermato: non sono state risolte, tornano ai
   * giocatori come «superate» col motivo dato. Le altre restano com'erano.
   */
  importa(s: StatoTavoloSalvato, motivoInterrotte: string): { finestra: StatoTavoloSalvato['finestra']; interrotte: string[] } {
    this.azzera();
    for (const a of s.azioni ?? []) this.azioni.set(a.id, { ...a, dipende_da: [...(a.dipende_da ?? [])], conflitti: (a.conflitti ?? []).map((c) => ({ ...c })) });
    for (const [pg, id] of s.ultima ?? []) if (this.azioni.has(id)) this.ultima.set(pg, id);
    this.ultimoTurno = s.ultimoTurno ?? 0;
    this.versioneScena = s.versioneScena ?? 0;
    this.prossimoId = Math.max(s.prossimoId ?? 1, ...[...this.azioni.keys()].map((id) => Number(id.slice(1)) + 1).filter(Number.isFinite));
    const interrotte: string[] = [];
    for (const a of this.azioni.values()) {
      if (a.stato !== 'chiusa') continue;
      a.stato = 'superata';
      a.richiesta = null;
      a.motivo = motivoInterrotte;
      interrotte.push(a.id);
    }
    for (const a of this.azioni.values()) if (this.ultima.get(a.autore) === a.id) this.o.onAzione(a.autore, this.privata(a));
    this.o.log.info({ azioni: this.azioni.size, interrotte, finestra: s.finestra }, 'azioni: riprese dalla sessione salvata');
    return { finestra: s.finestra ?? null, interrotte };
  }

  /**
   * Riapre una finestra salvata (ripresa): stessi invitati e stesso ritmo; l'eventuale scadenza
   * concitata riparte da adesso (gli archivi di prima avevano anche `pronti`: si ignora).
   */
  riapri(f: NonNullable<StatoTavoloSalvato['finestra']>, versioneScena: number, inPausa: boolean): void {
    this.apri(f.turno, f.invitati, versioneScena, f.invitoATutti, f.ritmo === 'concitato' ? 'concitato' : 'calmo');
    if (inPausa) this.sospendi();
    else this.controlla();
  }

  /** Spegnimento del server: i timer della finestra si fermano, lo stato resta com'è (niente notifiche). */
  spegni(): void {
    this.annullaControllo?.();
    this.annullaControllo = null;
  }

  /** Ricomincia: dimentica tutto. */
  azzera(): void {
    this.inPausa = false;
    this.annullaControllo?.();
    this.annullaControllo = null;
    for (const id of this.ultima.keys()) this.o.onAzione(id, null);
    this.azioni.clear();
    this.ultima.clear();
    this.scritture.clear();
    this.inVolo.clear();
    this.finestra = null;
    this.ultimoTurno = 0;
    this.versioneScena = 0;
  }
}
