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
 * - Finestra: si chiude quando tutti gli invitati sono pronti o 10 s dopo la prima azione, ma si
 *   allunga (max 8 s) se ci sono azioni da confermare o un invitato sta scrivendo; allo scadere
 *   le «da confermare» diventano «sospese».
 * - Chiusura atomica: si decide, si blocca la finestra (gli invii vanno alla successiva), si
 *   aspettano per poco i giudizi dell'arbitro in volo, poi in un solo passo sincrono tutte le
 *   azioni vive diventano «chiuse» (o «sospese»).
 * - Dopo la narrazione: le azioni scritte prima di essa si ricontrollano (valida / dubbia /
 *   impossibile); chi aveva perso un conflitto esclusivo e ha tenuto l'azione può risultare
 *   «superata».
 */
import type { AzioneAlTavolo, AzionePrivata, AzionePubblica, Esito, FinestraPubblica, RichiestaScelta } from '@cantastorie/shared';
import type { Logger } from '../logger';
import type { Orologio } from '../turni/orologio';
import { daSegnalare, percorsoVerso } from './propagazione';
import { normalizza, relazioniDaRegole } from './regole';
import { Spareggio } from './spareggio';
import { avvisoConflitto, avvisoDipendenza, avvisoVecchia, MOTIVO_SOSPESA, motivoSuperata } from './testi';
import { STATI_VIVI, type Arbitro, type Azione, type AzioneArbitro, type ContestoArbitro } from './tipi';

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
  chiusuraDopoPrimaAzioneMs?: number;
  estensioneMaxMs?: number;
  scritturaRecenteMs?: number;
  attesaArbitroMs?: number;
  /** Finestra aperta senza nessun input (azioni, scrittura, pronto) per questo tempo → stallo. 0 = mai. */
  stalloMs?: number;
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
   * «stallo»: nessun input per 45 s, il narratore fa una mossa contro lo stallo.
   * «master»: il master l'ha chiusa dal pannello.
   */
  motivo: 'tutti_pronti' | 'scadenza' | 'forzata' | 'stallo' | 'master';
  durata_ms: number;
  /** Istante monotono della chiusura (t0 delle misure). */
  chiusa_a: number;
}

interface Finestra {
  turno: number;
  invitati: string[];
  invitoATutti: boolean;
  aperta: boolean;
  chiudendo: boolean;
  apertaA: number;
  primaAzioneA: number | null;
  /** Quando la chiusura è diventata dovuta (inizio dell'eventuale allungamento). */
  dovutaA: number | null;
  pronti: Set<string>;
}

export class TavoloAzioni {
  private readonly o: Required<Omit<OpzioniTavolo, 'arbitro' | 'nomeBreve'>> & { arbitro: Arbitro | null; nomeBreve: (id: string) => string };
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
  private annullaStallo: (() => void) | null = null;
  private spareggio: Spareggio;
  /** Giocatori con cui è stato creato lo spareggio (la rotazione vale finché il tavolo non cambia). */
  private giocatoriSpareggio: string;
  /**
   * Pausa del master: la finestra resta aperta (si scrive, si modifica, si ritira) ma non si chiude
   * da sola e lo stallo non scatta finché il master non riprende.
   */
  private inPausa = false;

  constructor(opzioni: OpzioniTavolo) {
    this.o = {
      chiusuraDopoPrimaAzioneMs: 10_000,
      estensioneMaxMs: 8_000,
      scritturaRecenteMs: 3_000,
      attesaArbitroMs: 1_200,
      stalloMs: 45_000,
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
      pronto: !!this.finestra?.pronti.has(a.autore) && this.finestra.turno === a.turno,
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
    if (!f || !f.aperta) return { aperta: false, turno: this.ultimoTurno, invitati: [], azioni: [], chiusura_prevista_ms: null };
    const azioni: AzionePubblica[] = f.invitati.map((id) => ({ id_pg: id, scritta: !!this.azioneViva(id, f.turno), pronto: f.pronti.has(id) }));
    // In pausa nessun conto alla rovescia: la finestra non si chiude da sola.
    return { aperta: true, turno: f.turno, invitati: [...f.invitati], azioni, chiusura_prevista_ms: this.inPausa ? null : this.scadenzaEpoch() };
  }

  /** Epoch ms della prossima chiusura prevista (base 10 s, o fine dell'allungamento). */
  private scadenzaEpoch(): number | null {
    const f = this.finestra;
    if (!f) return null;
    const mono = f.dovutaA !== null ? f.dovutaA + this.o.estensioneMaxMs : f.primaAzioneA !== null ? f.primaAzioneA + this.o.chiusuraDopoPrimaAzioneMs : null;
    return mono === null ? null : this.epoch(mono);
  }

  private epoch(mono: number): number {
    return Math.round(this.o.orologio.adesso() + (mono - this.o.orologio.ora()));
  }

  // ------------------------------------------------------------------ finestra

  apri(turno: number, invitati: string[], versioneScena: number, invitoATutti: boolean): void {
    this.versioneScena = versioneScena;
    this.ultimoTurno = turno - 1;
    // La rotazione dei pareggi continua tra le finestre; riparte solo se cambiano i giocatori.
    const giocatori = this.o.giocatori();
    if (giocatori.join(',') !== this.giocatoriSpareggio) {
      this.spareggio = new Spareggio(giocatori);
      this.giocatoriSpareggio = giocatori.join(',');
    }
    const ora = this.o.orologio.ora();
    this.finestra = {
      turno,
      invitati: [...new Set(invitati)],
      invitoATutti,
      aperta: true,
      chiudendo: false,
      apertaA: ora,
      // Azioni scritte mentre il narratore parlava: il conto alla rovescia parte all'apertura.
      primaAzioneA: this.vive(turno).length ? ora : null,
      dovutaA: null,
      pronti: new Set(),
    };
    this.o.log.info({ turno, invitati: this.finestra.invitati, giaInCoda: this.vive(turno).length }, 'finestra: aperta');
    this.riarmaStallo();
    this.o.onCambio();
    this.controlla();
  }

  /**
   * Stallo (docs/architettura.md, «Turni»): se la finestra resta aperta senza NESSUN input per
   * `stalloMs`, si chiude con motivo «stallo» e il narratore fa una mossa morbida. Ogni input
   * (invio, scrittura, pronto, ritiro, conferma) fa ripartire il conto.
   */
  private riarmaStallo(): void {
    this.annullaStallo?.();
    this.annullaStallo = null;
    const f = this.finestra;
    if (!f?.aperta || f.chiudendo || this.o.stalloMs <= 0 || this.inPausa) return;
    this.annullaStallo = this.o.orologio.dopo(this.o.stalloMs, () => {
      this.annullaStallo = null;
      const g = this.finestra;
      if (!g?.aperta || g.chiudendo || this.vive(g.turno).length) return;
      this.o.log.info({ turno: g.turno, ms: this.o.stalloMs }, 'finestra: stallo, nessun input');
      void this.chiudi('stallo');
    });
  }

  aggiungiInvitato(id_pg: string): void {
    const f = this.finestra;
    if (!f?.aperta || !f.invitoATutti || f.invitati.includes(id_pg)) return;
    f.invitati.push(id_pg);
    this.o.onCambio();
  }

  rimuoviInvitato(id_pg: string): void {
    const f = this.finestra;
    if (!f?.aperta || f.invitati.length <= 1) return;
    if (this.azioneViva(id_pg, f.turno)) return; // ha scritto: la sua azione conta comunque
    f.invitati = f.invitati.filter((x) => x !== id_pg);
    this.o.onCambio();
    this.controlla();
  }

  // ------------------------------------------------------------------ comandi dei telefoni

  invia(id_pg: string, testo: string, versioneVista: number, privata = false): Esito {
    const pulito = testo.trim();
    if (!pulito) return { ok: false, errore: 'Scrivi cosa fa il tuo personaggio.' };
    if (pulito.length > MAX_CARATTERI_AZIONE) return { ok: false, errore: `Massimo ${MAX_CARATTERI_AZIONE} caratteri.` };
    const ora = this.o.orologio.ora();
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
        pronto: false,
        dipende_da: [],
        conflitti: [],
        revisione: 1,
        causa: null,
      };
      this.azioni.set(a.id, a);
      this.ultima.set(id_pg, a.id);
      const f = this.finestra;
      if (f?.aperta && !f.chiudendo && f.turno === turno && f.primaAzioneA === null) f.primaAzioneA = ora;
      this.o.log.info({ azione: a.id, autore: id_pg, turno, privata, versione_vista: a.versione_vista, finestra_aperta: this.aperta }, 'azione: inviata');
      this.dopoInvio(a);
    }
    this.scritture.delete(id_pg);
    this.riarmaStallo();
    this.o.onCambio();
    this.controlla();
    return { ok: true };
  }

  ritira(id_pg: string): Esito {
    const a = this.azioneViva(id_pg);
    if (!a) return { ok: false, errore: 'Non c’è nessuna azione da ritirare.' };
    a.stato = 'ritirata';
    a.richiesta = null;
    a.motivo = null;
    this.finestra?.pronti.delete(id_pg);
    this.o.log.info({ azione: a.id, autore: id_pg }, 'azione: ritirata');
    this.segnalaDipendenti(a, 'ritirata', null);
    this.notificaAzione(a);
    this.riarmaStallo();
    this.o.onCambio();
    this.controlla();
    return { ok: true };
  }

  /** «Confermo» / «Tengo». */
  conferma(id_pg: string): Esito {
    const a = this.azioneViva(id_pg);
    if (!a || a.stato !== 'da_confermare') return { ok: false, errore: 'Non c’è niente da confermare.' };
    a.stato = 'in_coda';
    a.richiesta = null;
    a.motivo = null;
    this.o.log.info({ azione: a.id, autore: id_pg }, 'azione: confermata');
    this.notificaAzione(a);
    this.riarmaStallo();
    this.o.onCambio();
    this.controlla();
    return { ok: true };
  }

  pronto(id_pg: string, pronto: boolean): Esito {
    const f = this.finestra;
    if (!f?.aperta || f.chiudendo) return { ok: false, errore: 'La finestra delle azioni è chiusa: la tua azione entrerà nella prossima.' };
    if (!f.invitati.includes(id_pg)) return { ok: false, errore: 'Questa volta il narratore non ha chiamato il tuo personaggio: scrivi pure, la tua azione entra comunque.' };
    if (pronto) f.pronti.add(id_pg);
    else f.pronti.delete(id_pg);
    const a = this.azioneViva(id_pg, f.turno);
    if (a) this.notificaAzione(a);
    this.riarmaStallo();
    this.o.onCambio();
    this.controlla();
    return { ok: true };
  }

  /** Indicatore «sta scrivendo»: allunga la chiusura per gli invitati (ed è un input: niente stallo). */
  scrivo(id_pg: string): void {
    this.scritture.set(id_pg, this.o.orologio.ora());
    this.riarmaStallo();
    this.controlla();
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
    a.richiesta = { ...r, consigliato, scadenza_ms: this.finestra?.dovutaA != null && this.finestra.turno === a.turno ? this.scadenzaEpoch() : null };
    a.motivo = r.testo;
    this.notificaAzione(a);
  }

  private notificaAzione(a: Azione): void {
    if (this.ultima.get(a.autore) === a.id) this.o.onAzione(a.autore, this.privata(a));
  }

  // ------------------------------------------------------------------ chiusura

  /** Ricontrolla le condizioni di chiusura e programma il prossimo controllo. */
  private controlla(): void {
    const f = this.finestra;
    if (!f?.aperta || f.chiudendo || this.inPausa) return;
    this.annullaControllo?.();
    this.annullaControllo = null;
    const ora = this.o.orologio.ora();
    const tuttiPronti = f.invitati.length > 0 && f.invitati.every((p) => f.pronti.has(p));
    const scadenzaBase = f.primaAzioneA === null ? null : f.primaAzioneA + this.o.chiusuraDopoPrimaAzioneMs;
    if (!tuttiPronti && (scadenzaBase === null || ora < scadenzaBase)) {
      if (scadenzaBase !== null) this.annullaControllo = this.o.orologio.dopo(scadenzaBase - ora, () => this.controlla());
      return;
    }
    const motivo = tuttiPronti ? 'tutti_pronti' : 'scadenza';
    if (f.dovutaA === null) {
      f.dovutaA = ora;
      // Le scelte in sospeso ora hanno una scadenza precisa.
      for (const a of this.vive(f.turno)) {
        if (a.richiesta && a.richiesta.scadenza_ms === null) {
          a.richiesta = { ...a.richiesta, scadenza_ms: this.scadenzaEpoch() };
          this.notificaAzione(a);
        }
      }
    }
    const fine = f.dovutaA + this.o.estensioneMaxMs;
    const daConfermare = this.vive(f.turno).some((a) => a.stato === 'da_confermare');
    const scriventi = f.invitati.map((p) => this.scritture.get(p)).filter((t): t is number => t !== undefined && ora - t < this.o.scritturaRecenteMs);
    if ((daConfermare || scriventi.length) && ora < fine) {
      // Si allunga: prossimo controllo quando smette di scrivere o allo scadere dell'allungamento.
      const prossimo = Math.min(fine, ...scriventi.map((t) => t + this.o.scritturaRecenteMs));
      this.annullaControllo = this.o.orologio.dopo(Math.max(10, prossimo - ora), () => this.controlla());
      this.o.onCambio();
      return;
    }
    void this.chiudi(motivo);
  }

  /** Chiusura forzata (ferma/ricomincia): niente narrazione. */
  chiudiForzata(): void {
    this.inPausa = false;
    if (this.finestra?.aperta) void this.chiudi('forzata');
  }

  // ------------------------------------------------------------------ comandi del master

  /**
   * Pausa del master a finestra aperta: niente chiusura automatica e niente stallo. Le azioni
   * restano vive e modificabili; i timer si fermano.
   */
  sospendi(): void {
    if (this.inPausa) return;
    this.inPausa = true;
    this.annullaControllo?.();
    this.annullaControllo = null;
    this.annullaStallo?.();
    this.annullaStallo = null;
    this.o.log.info({ turno: this.finestra?.turno ?? null }, 'finestra: sospesa dal master');
    this.o.onCambio();
  }

  /**
   * Ripresa dopo la pausa: il conto alla rovescia riparte da capo (10 s se c'è già un'azione) e
   * l'allungamento si azzera; chi era pronto resta pronto.
   */
  riprendi(): void {
    if (!this.inPausa) return;
    this.inPausa = false;
    const f = this.finestra;
    if (f?.aperta && !f.chiudendo) {
      const ora = this.o.orologio.ora();
      f.primaAzioneA = this.vive(f.turno).length ? ora : null;
      f.dovutaA = null;
    }
    this.o.log.info({ turno: f?.turno ?? null }, 'finestra: ripresa dal master');
    this.riarmaStallo();
    this.o.onCambio();
    this.controlla();
  }

  /** Il master chiude la finestra adesso: il narratore risponde alle azioni inviate. */
  chiudiOra(): Esito {
    const f = this.finestra;
    if (!f?.aperta) return { ok: false, errore: 'La finestra delle azioni non è aperta.' };
    if (f.chiudendo) return { ok: false, errore: 'La finestra si sta già chiudendo.' };
    if (this.inPausa) return { ok: false, errore: 'Il tavolo è in pausa: riprendi prima di chiudere la finestra.' };
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
    if (this.finestra?.turno === a.turno) this.finestra.pronti.delete(a.autore);
    this.o.log.info({ azione: a.id, autore: a.autore, turno: a.turno }, 'azione: saltata dal master');
    this.segnalaDipendenti(a, 'superata', null);
    this.notificaAzione(a);
    this.o.onCambio();
    this.controlla();
    return a;
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

  private async chiudi(motivo: RiepilogoChiusura['motivo']): Promise<void> {
    const f = this.finestra;
    if (!f?.aperta || f.chiudendo) return;
    f.chiudendo = true; // lucchetto: da qui gli invii vanno alla finestra successiva
    this.annullaControllo?.();
    this.annullaControllo = null;
    this.annullaStallo?.();
    this.annullaStallo = null;
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
          a.motivo = MOTIVO_SOSPESA;
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
    this.o.log.info({ turno: f.turno, motivo, chiuse: ordinate.map((a) => a.id), sospese: sospese.map((a) => a.id), durata_ms: r.durata_ms }, 'finestra: chiusa');
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

  /** Ricomincia: dimentica tutto. */
  azzera(): void {
    this.inPausa = false;
    this.annullaControllo?.();
    this.annullaControllo = null;
    this.annullaStallo?.();
    this.annullaStallo = null;
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
