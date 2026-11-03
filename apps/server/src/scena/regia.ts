/**
 * Regia della scena (F0): l'unico «scrittore» dello stato del tavolo e del ciclo dei turni.
 *
 *   attesa ──(schermo: Inizia sessione)──▶ apertura ──(audio finito)──▶ finestra
 *   finestra ──(tutti pronti | 10 s dopo la prima azione | master)──▶ narrazione
 *   narrazione ──(LLM finito + voce finita + audio suonato)──▶ finestra (turno+1)
 *   qualsiasi ──(ferma)──▶ fermata ──(ricomincia)──▶ apertura
 *
 * Pannello del master (master/comandi.ts):
 *   finestra ──(pausa)──▶ pausa (finestra sospesa) ──(riprendi)──▶ finestra
 *   apertura | narrazione ──(pausa)──▶ …la narrazione finisce… ──▶ pausa ──(riprendi)──▶ finestra
 *   apertura | narrazione ──(ferma la narrazione: LLM + voce interrotti)──▶ pausa
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
  SchedaPg,
  SchermoAudioIniziato,
  StatoTavolo,
  VoceTrascrizione,
} from '@cantastorie/shared';
import { schedaPg } from '../campagna/scheda';
import type { Campagna } from '../campagna/tipi';
import { ID_NARRATORE, NOME_NARRATORE, conScena } from '../campagna/tipi';
import { nomeBreve } from '../campagna/nomi';
import { fuoriDallaFinzione } from '../narrazione/finzione';
import { MOTIVO_FINE_SESSIONE } from '../sessione/archivio';
import type { MemoriaSessione } from '../sessione/memoria';
import type { FotografiaSessione, StatoRicostruito, StatoTavoloSalvato } from '../sessione/tipi';
import { collegaSituazioni, type SituazioneCollegata } from '../campagna/situazioni';
import type { Logger } from '../logger';
import type { Narratore } from '../llm/tipi';
import { MisuratoreTurno } from '../metriche/misure';
import type { RegistroJsonl } from '../metriche/jsonl';
import { compilaMessaggioTurno } from '../narrazione/messaggio';
import type { Orologio } from '../turni/orologio';
import { azioniPerNarratore } from '../azioni/narratore';
import type { CatalogoImmagini } from '../campagna/immagini';
import type { CatalogoAudio } from '../audio/catalogo';
import { audioDellaScena, type UmoreScelto } from '../audio/scena';
import { LimiteUmori, risolviEffetto, risolviUmore, type CueAudio } from '../audio/cue';
import { TavoloAzioni, type RiepilogoChiusura } from '../azioni/tavolo';
import type { Arbitro, Azione } from '../azioni/tipi';
import { narraTurno, type EsitoUsaTurno, type VoceUscita } from '../turni/narrazione';
import { messaggioRiparazione } from '../narrazione/messaggio';
import { normalizza } from '../azioni/regole';
import { nomiDeiPng } from '../repertorio/pertinenza';
import { sommaCosti } from '../llm/costi';
import type { Battuta, Repertorio } from '../repertorio/tipi';
import { StatoRepertorio } from '../repertorio/stato';
import { righeMenzogneDette } from '../repertorio/menzogne';
import { segretiNelTesto, type ParolaSegreta, type StatoPubblico } from '../repertorio/segreti';
import { CacheAudio, chiaveAudio, testoPerVoce } from '../voce/cache-audio';
import { voceDi } from '../turni/narrazione';
import { PipelineVoce, type UscitaAudio } from '../voce/pipeline';
import { creaPronunciatore, type Pronunciatore } from '../voce/pronuncia';
import type { SelettoreVoce } from '../voce/selettore';
import { StatoOrologi, type EsitoAvanzamento, type Orologio as OrologioMinaccia } from './orologi';
import { NoteRegia } from '../master/note';
import { sezioneNoteRegia } from '../narrazione/messaggio';

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
  /** Una riga per turno: azioni, testo grezzo del narratore, invito, orologi, anomalie. */
  registroNarrazioni: RegistroJsonl;
  chiusuraDopoPrimaAzioneMs: number;
  margineFineAudioMs: number;
  trascrizioneMax: number;
  preriscalda: boolean;
  /** A = 'improvvisa' (F0), B = 'repertorio' (battute pre-scritte scelte da Haiku). */
  modo: 'improvvisa' | 'repertorio';
  /** Modalità repertorio: battute, parole segrete (controllo dei contesti), audio pre-generato. */
  repertorio?: Repertorio;
  paroleSegrete?: ParolaSegreta[];
  cacheAudio?: CacheAudio;
  /** Esperimenti: la finestra si apre sempre per tutti i PG al tavolo (l'invito resta nel log). */
  finestraATutti?: boolean;
  /** Arbitro delle azioni simultanee (null = solo regole). */
  arbitro?: Arbitro | null;
  /** Riassunto pubblico della scena per l'arbitro. */
  scenaPubblica?: string;
  /**
   * Campagne con più scene: blocchi di sistema e riassunto pubblico per una scena (la campagna
   * passata ha quella scena come corrente). Senza, il cambio di scena tiene quelli iniziali.
   */
  sistemaPer?: (campagna: Campagna) => string[];
  scenaPubblicaPer?: (campagna: Campagna) => string;
  /** Immagini dei luoghi e ritratti dei PNG per il proiettore. */
  immagini?: CatalogoImmagini;
  /** Musica, ambienti e temi dei PNG per il proiettore (docs/audio.md). */
  audio?: CatalogoAudio;
  /** Silenzio che fa scattare la mossa contro lo stallo (default 45 s; 0 = mai). */
  stalloMs?: number;
  /** Registro della sessione (persistenza); null o assente = niente salvataggi (test, prove). */
  memoria?: MemoriaSessione | null;
  /** Sessione da riprendere, ricostruita dal registro all'avvio del server. */
  ripresa?: StatoRicostruito | null;
  /**
   * Campagna a pacchetti, sessione nuova: telefono → PG della sessione prima (i PG durano tra le
   * sessioni, e ogni giocatore ritrova il suo senza sceglierlo di nuovo). Ignorato con una ripresa.
   */
  dispositiviEreditati?: ReadonlyMap<string, string> | null;
}

/** Motivi mostrati al giocatore quando il master tocca la sua azione. */
export const MOTIVO_SALTATA = 'Il master ha saltato questa azione: puoi riscriverla.';
export const MOTIVO_NARRAZIONE_INTERROTTA = 'Il master ha interrotto la narrazione: la tua azione non è stata risolta, puoi rimandarla.';
export const MOTIVO_CAMBIO_SCENA = 'Si cambia scena: la tua azione era per il luogo di prima, riscrivila se vale ancora.';
/** Mosse contro lo stallo di fila (senza nessun input) dopo cui il tavolo va in pausa da solo. */
export const STALLI_PRIMA_DELLA_PAUSA = 2;
/** Cosa leggono proiettore e telefoni quando il tavolo si è fermato da solo. */
export const TESTO_PAUSA_AUTOMATICA = "Il tavolo è in pausa: scrivete un'azione per ripartire.";
/** Riga di sistema quando il Motore chiude la scena col finale (il tavolo va in pausa, decide il master). */
export const TESTO_FINE_SCENA = 'La scena è finita: il master sceglie come andare avanti.';
/** Riga di sistema scritta da «Fine sessione» (pannello del master). */
export const TESTO_FINE_SESSIONE = 'Fine della sessione.';
export const MOTIVO_RIPRESA = 'Il gioco si è fermato mentre il narratore rispondeva: la tua azione non è stata risolta, puoi rimandarla.';
/** Token di un telefono (localStorage): lettere, cifre e trattini. */
const DISPOSITIVO_VALIDO = /^[A-Za-z0-9_-]{8,64}$/;

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

export { nomeBreve };

export class Regia {
  private readonly o: OpzioniRegia;
  private readonly pipeline: PipelineVoce;
  private readonly pronuncia: Pronunciatore;
  private orologi: StatoOrologi;
  /** Stato del repertorio (solo in modalità repertorio). */
  private statoRepertorio: StatoRepertorio | null = null;
  /** Battute mostrate al selettore in questo turno: un [usa] fuori elenco si rifiuta. */
  private elencoTurno = new Set<string>();
  /** B2: azioni del turno per autore (chi può ricevere una battuta, e se privata), stallo, segno dovuto. */
  private turnoB: { azioni: Map<string, { id: string; privata: boolean }>; stallo: boolean; segnoDovuto: boolean } | null = null;
  /** Nomi dei PNG e soprannomi, per la pertinenza del catalogo. */
  private readonly nomiPng: Map<string, string[]>;
  /** Luogo corrente (id della scena o del nodo): sceglie l'immagine del proiettore. */
  private luogo: string;
  /** La campagna vista dalla scena in corso (conScena): contesto, orologi attivi, immagini. */
  private campagna: Campagna;
  /** Blocchi di sistema della scena in corso (prompt + contesto), in cache. */
  private sistema: string[];
  /** Riassunto pubblico della scena in corso, per l'arbitro. */
  private scenaPubblica: string;
  /** Immagini di situazione della campagna, con la rivelazione che le fa comparire. */
  private readonly situazioni: SituazioneCollegata[];
  /**
   * Situazione sul proiettore al posto del luogo. `auto`: messa dal Motore dopo una rivelazione,
   * resta finché i giocatori reagiscono (si toglie quando parte la narrazione successiva); quelle
   * del master restano finché lui non le toglie o cambia luogo.
   */
  private situazione: { id: string; url: string; auto: boolean; turno: number } | null = null;
  /** Situazioni già mostrate in automatico (una volta sola ciascuna). */
  private readonly situazioniMostrate = new Set<string>();
  /** Indizi e battute usciti nella narrazione in corso (per le situazioni). */
  private rivelateNelTurno: string[] = [];
  /** Stalli di fila (S1, S2, S3…): si azzera appena qualcuno agisce. */
  private stalliDiFila = 0;
  /** Audio: umore scelto dal master o dal Motore (vale solo nella scena in cui è stato scelto). */
  private umoreScelto: UmoreScelto | null = null;
  /** Audio: al massimo un cambio d'umore automatico al minuto per scena (anche il master conta). */
  private readonly limiteUmori = new LimiteUmori();
  /** Audio: chi registra i segnali automatici (il registro del pannello del master). */
  private suCue: ((e: { comando: 'umore' | 'effetto'; ok: boolean; dettagli: string }) => void) | null = null;
  private uscita: UscitaRegia | null = null;

  private fase: FaseScena = 'attesa';
  /**
   * Pausa presa dal Motore dopo STALLI_PRIMA_DELLA_PAUSA mosse contro lo stallo di fila: nessuno sta
   * giocando. Riparte da sola alla prima azione di un telefono (o con Riprendi del master).
   */
  private pausaAutomatica = false;
  /** Il server si sta spegnendo: niente più notifiche ai client. */
  private spento = false;
  /** Telefono (token del dispositivo) → PG: alla riconnessione, anche dopo un riavvio, il PG torna. */
  private readonly dispositivi = new Map<string, string>();
  /** Turno in cui il Motore ha chiuso la scena col finale: a narrazione finita il tavolo va in pausa. */
  private scenaFinitaAlTurno: number | null = null;
  /** Socket del telefono → token del dispositivo (per il pannello: quali telefoni ricordati sono collegati). */
  private readonly dispositivoDiSocket = new Map<string, string>();
  /** Sessione ripresa dal registro, in attesa del proiettore per ripartire (null = niente da riprendere). */
  private daRiprendere: {
    fase: FaseScena;
    finestra: StatoTavoloSalvato['finestra'];
    interrotte: string[];
    turno: number;
    quando: string;
  } | null = null;
  /** Ultima ripresa fatta (per il pannello: quando e da che turno). */
  private ripresaFatta: { quando: string; turno: number } | null = null;
  /** Ultimo stato del tavolo e dei turni della trascrizione già scritti nel registro (niente doppioni). */
  private tavoloSalvato = '';
  private readonly turniSalvati = new Map<number, string>();
  private salvataggioTavoloProgrammato = false;
  private turno = 0;
  private versioneScena = 0;
  private versioneStato = 0;
  private epoca = 0;
  private trascrizione: VoceTrascrizione[] = [];
  private prossimoIdTrascrizione = 1;
  /** Voce di trascrizione aperta per segmento del turno corrente (per unire le frasi). */
  private segmentiAperti = new Map<string, VoceTrascrizione>();

  /** Azioni dei giocatori e finestra (docs/azioni-concorrenti.md). */
  private readonly tavolo: TavoloAzioni;
  private controlloLlm: AbortController | null = null;
  private misuratore: MisuratoreTurno | null = null;
  /** Primo pezzo d'audio inviato nel turno corrente (stima della fine se lo schermo tace). */
  private primoAudioInviato = new Map<number, number>();
  private attesaAudio: AttesaAudio | null = null;
  /** Id della scena in corso (ISO dell'avvio): raggruppa le righe di narrazioni.jsonl. */
  private sessione = '';

  /** socket.id → id_pg scelto. */
  private telefoni = new Map<string, string>();
  /** socket.id degli schermi che hanno sbloccato l'audio. */
  private schermi = new Set<string>();

  /** Il master ha chiesto la pausa: a fine narrazione non si apre la finestra. */
  private pausaRichiesta = false;
  /** In pausa dopo una narrazione: l'invito da usare quando il master riprende. */
  private invitoSospeso: string[] | 'tutti' | null = null;
  /** Note di regia del master: entrano nel messaggio dei prossimi turni. */
  readonly note = new NoteRegia();
  /** Chi vuole sapere di ogni cambiamento (il pannello del master). */
  private readonly ascoltatori = new Set<() => void>();

  constructor(opzioni: OpzioniRegia) {
    this.o = opzioni;
    this.campagna = opzioni.campagna;
    this.sistema = opzioni.sistema;
    this.scenaPubblica = opzioni.scenaPubblica ?? '';
    this.situazioni = opzioni.immagini ? collegaSituazioni(opzioni.campagna, opzioni.immagini.situazioni(opzioni.campagna.png.map((p) => p.id))) : [];
    if (this.situazioni.length) opzioni.log.info({ situazioni: this.situazioni.map((x) => ({ id: x.id, dopo: x.dopo })) }, 'immagini: situazioni e rivelazioni');
    this.pronuncia = creaPronunciatore(opzioni.campagna);
    this.orologi = new StatoOrologi(opzioni.campagna);
    this.nomiPng = nomiDeiPng(opzioni.campagna);
    this.luogo = opzioni.campagna.scena.id;
    this.statoRepertorio = this.nuovoStatoRepertorio();
    this.pipeline = new PipelineVoce({
      motore: () => this.o.voce.attivo,
      uscita: opzioni.uscitaAudio,
      log: opzioni.log.child({ modulo: 'voce' }),
      ...(opzioni.cacheAudio ? { cache: opzioni.cacheAudio } : {}),
      osservatore: {
        richiesta: (f) => {
          if (f.turno === this.misuratore?.turno) this.misuratore.segna('voce_richiesta', this.o.orologio.ora());
          // Segnale audio legato a questa frase: parte adesso, con lei (l'effetto lo suona lo schermo).
          if (f.cue) this.applicaCue(f.cue);
        },
        primoAudio: (f) => {
          const ora = this.o.orologio.ora();
          if (!this.primoAudioInviato.has(f.turno)) this.primoAudioInviato.set(f.turno, ora);
          if (f.turno === this.misuratore?.turno) this.misuratore.segna('voce_primo_audio', ora);
        },
      },
    });
    this.o.voce.onCambio(() => this.notifica());
    const nomi = new Map<string, string>();
    for (const [alias, id] of Object.entries(opzioni.campagna.alias)) if (opzioni.campagna.pg.some((p) => p.id === id)) nomi.set(alias, id);
    this.tavolo = new TavoloAzioni({
      giocatori: () => this.pgAlTavolo(),
      nomePg: (id) => this.nomePg(id),
      nomeBreve: (id) => nomeBreve(this.nomePg(id)),
      nomi,
      orologio: opzioni.orologio,
      arbitro: opzioni.arbitro ?? null,
      contesto: () => ({ narrazione: this.ultimaNarrazione(), scena: this.scenaPubblica }),
      log: opzioni.log.child({ modulo: 'azioni' }),
      chiusuraDopoPrimaAzioneMs: opzioni.chiusuraDopoPrimaAzioneMs,
      ...(opzioni.stalloMs !== undefined ? { stalloMs: opzioni.stalloMs } : {}),
      // Senza telefoni con un PG non c'è nessuno da smuovere: niente mosse contro lo stallo.
      puòStallare: () => this.telefoni.size > 0,
      onCambio: () => {
        this.notifica();
        this.programmaSalvataggioTavolo();
      },
      onAzione: (id_pg, a) => this.uscita?.azioneMia(id_pg, a),
      onChiusura: (r) => this.finestraChiusa(r),
    });
    if (opzioni.ripresa) this.ripristina(opzioni.ripresa);
    else if (opzioni.dispositiviEreditati) {
      for (const [d, pg] of opzioni.dispositiviEreditati) if (opzioni.campagna.pg.some((p) => p.id === pg)) this.dispositivi.set(d, pg);
      if (this.dispositivi.size) opzioni.log.info({ dispositivi: [...this.dispositivi.values()] }, 'sessione: i telefoni ritrovano i PG della sessione prima');
    }
  }

  // ------------------------------------------------------------------ sessione salvata (registro)

  /** Lo stato del gioco da salvare (tutto tranne trascrizione e azioni, che hanno i loro eventi). */
  private fotografia(): FotografiaSessione {
    return {
      fase: this.fase,
      turno: this.turno,
      versioneScena: this.versioneScena,
      scena: this.campagna.scena.id,
      luogo: this.luogo,
      situazione: this.situazione ? { ...this.situazione } : null,
      situazioniMostrate: [...this.situazioniMostrate],
      umore: this.umoreScelto ? { ...this.umoreScelto } : null,
      orologi: this.orologi.esporta(),
      repertorio: this.statoRepertorio?.esporta() ?? null,
      note: this.note.esporta(),
      pausa: { richiesta: this.pausaRichiesta, invitoSospeso: this.invitoSospeso, automatica: this.pausaAutomatica },
      prossimoIdTrascrizione: this.prossimoIdTrascrizione,
    };
  }

  /**
   * Scrive nel registro, in una transazione: i turni della trascrizione cambiati dall'ultima volta,
   * la fotografia e il tavolo. Si chiama nei punti stabili (fine di un turno, comandi del master).
   */
  salva(causa: string): void {
    const memoria = this.o.memoria;
    if (!memoria?.info()) return;
    const eventi: Array<{ tipo: string; dati: unknown }> = [];
    const perTurno = new Map<number, VoceTrascrizione[]>();
    for (const v of this.trascrizione) perTurno.set(v.turno, [...(perTurno.get(v.turno) ?? []), v]);
    for (const [turno, voci] of perTurno) {
      const testo = JSON.stringify(voci);
      if (this.turniSalvati.get(turno) === testo) continue;
      this.turniSalvati.set(turno, testo);
      eventi.push({ tipo: 'trascrizione_turno', dati: { turno, voci } });
    }
    eventi.push({ tipo: 'fotografia', dati: { ...this.fotografia(), causa } });
    const tavolo = JSON.stringify(this.tavolo.esporta());
    if (tavolo !== this.tavoloSalvato) {
      this.tavoloSalvato = tavolo;
      eventi.push({ tipo: 'tavolo', dati: JSON.parse(tavolo) });
    }
    memoria.scrivi(eventi, this.turno);
  }

  /** Il master ha cambiato lo stato del gioco (master/comandi.ts): si salva subito. */
  salvaDopoComando(comando: string): void {
    this.salva(`master:${comando}`);
  }

  /** Azioni e finestra cambiano spesso: una sola scrittura per giro dell'event loop, e solo se diverse. */
  private programmaSalvataggioTavolo(): void {
    if (this.salvataggioTavoloProgrammato || !this.o.memoria?.info()) return;
    this.salvataggioTavoloProgrammato = true;
    setImmediate(() => {
      this.salvataggioTavoloProgrammato = false;
      const tavolo = JSON.stringify(this.tavolo.esporta());
      if (tavolo === this.tavoloSalvato) return;
      this.tavoloSalvato = tavolo;
      this.o.memoria?.scrivi([{ tipo: 'tavolo', dati: JSON.parse(tavolo) }], null);
    });
  }

  /**
   * All'avvio del server: lo stato torna quello della sessione salvata. Il gioco non riparte da solo:
   * aspetta il proiettore («Inizia sessione»), e allora riprende senza rileggere l'apertura.
   */
  private ripristina(r: StatoRicostruito): void {
    const f = r.fotografia;
    this.sessione = r.sessione;
    if (this.o.campagna.scene.some((s) => s.id === f.scena)) this.impostaScena(f.scena);
    this.luogo = f.luogo || this.campagna.scena.id;
    this.orologi.importa(f.orologi);
    if (this.statoRepertorio && f.repertorio) this.statoRepertorio.importa(f.repertorio);
    this.note.importa(f.note);
    this.umoreScelto = f.umore ? { ...f.umore } : null;
    this.situazione = f.situazione ? { ...f.situazione } : null;
    for (const id of f.situazioniMostrate ?? []) this.situazioniMostrate.add(id);
    this.trascrizione = r.trascrizione.map((v) => ({ ...v }));
    this.prossimoIdTrascrizione = Math.max(f.prossimoIdTrascrizione ?? 1, ...this.trascrizione.map((v) => v.id + 1));
    // I turni ripresi sono già nel registro così come sono: non si riscrivono.
    const perTurno = new Map<number, VoceTrascrizione[]>();
    for (const v of this.trascrizione) perTurno.set(v.turno, [...(perTurno.get(v.turno) ?? []), v]);
    for (const [t, voci] of perTurno) this.turniSalvati.set(t, JSON.stringify(voci));
    this.turno = f.turno;
    this.versioneScena = f.versioneScena;
    this.invitoSospeso = f.pausa?.invitoSospeso ?? null;
    this.pausaAutomatica = f.pausa?.automatica === true;
    for (const [d, pg] of r.dispositivi) this.dispositivi.set(d, pg);
    const tavolo = r.tavolo ? this.tavolo.importa(r.tavolo, MOTIVO_RIPRESA) : { finestra: null, interrotte: [] };
    this.daRiprendere = { fase: f.fase, finestra: tavolo.finestra, interrotte: tavolo.interrotte, turno: f.turno, quando: r.ultimoEvento };
    this.fase = 'attesa';
    this.o.log.info(
      { sessione: r.sessione, turno: f.turno, fase: f.fase, scena: f.scena, luogo: this.luogo, voci: this.trascrizione.length, interrotte: tavolo.interrotte, finestra: tavolo.finestra },
      'sessione: ripresa dal registro, si aspetta il proiettore',
    );
  }

  /** Il proiettore è pronto: la sessione ripresa riparte da dov'era (senza rileggere l'apertura). */
  private riprendiSessione(): void {
    const d = this.daRiprendere!;
    this.daRiprendere = null;
    this.ripresaFatta = { quando: new Date(this.o.orologio.adesso()).toISOString(), turno: d.turno };
    this.aggiungiTrascrizione({ turno: this.turno, tipo: 'sistema', chi: 'sistema', nome: 'Sistema', testo: 'La sessione riprende da dove si era fermata.' });
    if (d.fase === 'fermata') {
      this.fase = 'fermata';
    } else if (d.fase === 'pausa') {
      this.fase = 'pausa';
      if (d.finestra?.aperta) this.tavolo.riapri(d.finestra, this.versioneScena, true);
    } else if (d.finestra?.aperta) {
      // La finestra era aperta: torna con le sue azioni in coda e chi era pronto.
      this.fase = 'finestra';
      this.tavolo.riapri(d.finestra, this.versioneScena, false);
    } else if (d.fase === 'apertura') {
      // Apertura (della sessione o di una scena) a metà: non si rilegge, si passa la parola ai giocatori.
      this.apriFinestra('tutti');
    } else {
      // Il narratore stava rispondendo: quel turno si rigioca (le sue azioni sono tornate ai giocatori).
      this.turno = Math.max(0, this.turno - 1);
      this.apriFinestra('tutti');
    }
    this.o.log.info({ sessione: this.sessione, turno: this.turno, fase: this.fase, prima: d.fase, interrotte: d.interrotte }, 'sessione: ripresa');
    this.notifica();
    this.salva('ripresa');
  }

  /** Per il pannello: la sessione in corso e la ripresa (fatta, o in attesa del proiettore). */
  get infoRegistro(): { sessione: string | null; creata: string | null; eventi: number; ripresa: { quando: string; turno: number } | null; inAttesaDiRipresa: { quando: string; turno: number } | null } {
    const info = this.o.memoria?.info() ?? null;
    return {
      sessione: info?.id ?? null,
      creata: info?.creata ?? null,
      eventi: info?.eventi ?? 0,
      ripresa: this.ripresaFatta,
      inAttesaDiRipresa: this.daRiprendere ? { quando: this.daRiprendere.quando, turno: this.daRiprendere.turno } : null,
    };
  }

  /**
   * «Fine sessione» (pannello del master): il gioco si ferma, l'ultima fotografia entra nel registro e
   * la sessione dell'archivio si chiude con MOTIVO_FINE_SESSIONE. Restituisce l'id chiuso: da lì si
   * estrae il registro (sessione/registra.ts). Il proiettore che dopo preme «Inizia» comincia una
   * sessione nuova dello stesso pacchetto (si rigioca), finché il master non passa alla prossima.
   */
  fineSessione(): { ok: true; sessione: string } | { ok: false; errore: string } {
    const info = this.o.memoria?.info();
    if (!info) return { ok: false, errore: 'Nessuna sessione in corso da chiudere.' };
    if (this.fase !== 'attesa' && this.fase !== 'fermata') this.interrompiTutto('fine sessione');
    this.daRiprendere = null;
    if (this.fase !== 'attesa') this.fase = 'fermata';
    this.aggiungiTrascrizione({ turno: this.turno, tipo: 'sistema', chi: 'sistema', nome: 'Sistema', testo: TESTO_FINE_SESSIONE });
    this.salva('fine_sessione');
    this.o.memoria!.termina(MOTIVO_FINE_SESSIONE);
    this.o.log.info({ sessione: info.id, turno: this.turno, eventi: info.eventi }, 'sessione: fine sessione');
    this.notifica();
    return { ok: true, sessione: info.id };
  }

  /** «Nuova sessione» del pannello: si chiude quella in corso e si ricomincia da capo. */
  nuovaSessione(): Esito {
    this.daRiprendere = null;
    this.ripresaFatta = null;
    return this.ricomincia();
  }

  /** Per il pannello: i telefoni ricordati, col loro PG e se sono collegati adesso. */
  get dispositiviRicordati(): Array<{ dispositivo: string; id_pg: string; collegato: boolean }> {
    const collegati = new Set(this.dispositivoDiSocket.values());
    return [...this.dispositivi].map(([dispositivo, id_pg]) => ({ dispositivo, id_pg, collegato: collegati.has(dispositivo) }));
  }

  /**
   * Il master cambia il PG ricordato di un telefono (un giocatore che non viene, uno nuovo che entra):
   * `id_pg` null lo dimentica. Vale dal prossimo collegamento di quel telefono; il cambio va nel
   * registro (evento `dispositivo`, con id_pg null per «dimenticato»).
   */
  assegnaDispositivo(dispositivo: string, id_pg: string | null): Esito {
    if (!this.dispositivi.has(dispositivo)) return { ok: false, errore: 'Telefono sconosciuto.' };
    if (id_pg !== null && !this.campagna.pg.some((p) => p.id === id_pg)) return { ok: false, errore: 'Personaggio sconosciuto.' };
    if (id_pg === null) this.dispositivi.delete(dispositivo);
    else this.dispositivi.set(dispositivo, id_pg);
    this.o.memoria?.scrivi([{ tipo: 'dispositivo', dati: { dispositivo, id_pg } }], null);
    this.o.log.info({ dispositivo: dispositivo.slice(0, 8), id_pg }, 'telefono: PG ricordato cambiato dal master');
    this.notifica();
    return { ok: true };
  }

  /** Il PG di un telefono conosciuto (token del dispositivo), o null. */
  pgDelDispositivo(dispositivo: unknown): string | null {
    if (typeof dispositivo !== 'string' || !DISPOSITIVO_VALIDO.test(dispositivo)) return null;
    const pg = this.dispositivi.get(dispositivo);
    return pg && this.campagna.pg.some((p) => p.id === pg) ? pg : null;
  }

  /** Immagine del luogo, ritratti e immagini da precaricare (luoghi collegati, ritratti dei presenti). */
  private immaginiPubbliche(): { luogo: string; immagine: string | null; ritratti: Record<string, string>; situazione: string | null; prossime: string[] } {
    const img = this.o.immagini;
    const ritratti: Record<string, string> = {};
    for (const p of this.campagna.png) {
      const u = img?.ritratto(p.id);
      if (u) ritratti[p.id] = u;
    }
    const immagine = img?.luogo(this.luogo) ?? null;
    // Prossime: i ritratti dei PNG presenti, poi i luoghi collegati al nodo della scena.
    const nodo = typeof this.campagna.scena.dati['nodo'] === 'string' ? (this.campagna.scena.dati['nodo'] as string) : null;
    const nodi = (this.campagna.campagnaNarratore['nodi'] as Array<Record<string, unknown>> | undefined) ?? [];
    const collegati = (nodi.find((n) => n['id'] === nodo)?.['collegamenti'] as string[] | undefined) ?? [];
    // Scene vicine (campagne con più scene): quelle il cui nodo è un'uscita o un collegamento di questa.
    const uscite = ((this.campagna.scena.dati['uscite'] as Array<Record<string, unknown>> | undefined) ?? []).map((u) => u?.['verso']);
    const vicine = this.o.campagna.scene.filter((s) => s.id !== this.campagna.scena.id && [...collegati, ...uscite].includes(s.dati['nodo'])).map((s) => s.id);
    const prossime = [
      ...this.campagna.scena.png_presenti.map((id) => ritratti[id]),
      ...[this.campagna.scena.id, ...vicine, ...collegati].filter((l) => l !== this.luogo).map((l) => img?.luogo(l)),
    ].filter((u): u is string => !!u);
    // In coda, le situazioni che una rivelazione può far comparire (dissolvenza senza attese).
    const situazioni = this.situazioni.filter((x) => x.dopo.length && !this.situazioniMostrate.has(x.id)).map((x) => x.url);
    return { luogo: this.luogo, immagine, ritratti, situazione: this.situazione?.url ?? null, prossime: [...new Set([...prossime, ...situazioni])] };
  }

  /** Il gruppo si sposta: cambia l'immagine del proiettore (con dissolvenza sullo schermo). */
  cambiaLuogo(luogo: string): Esito {
    if (luogo === this.luogo) return { ok: true };
    this.o.log.info({ da: this.luogo, a: luogo, immagine: this.o.immagini?.luogo(luogo) ?? null }, 'scena: cambio di luogo');
    this.luogo = luogo;
    this.togliSituazione('cambio di luogo');
    this.notifica();
    return { ok: true };
  }

  // ------------------------------------------------------------------ audio (docs/audio.md)

  /**
   * Umore musicale scelto dal master o dal Motore (`umore_<tag>` del manifest audio), null per
   * tornare alla musica del luogo. Sul proiettore cambia subito, senza aspettare l'isteresi.
   */
  cambiaUmore(tag: string | null): Esito {
    if (tag !== null && !this.o.audio?.umore(tag)) return { ok: false, errore: `Nessun brano per l'umore «${tag}».` };
    const scena = this.campagna.scena.id;
    const prima = this.umoreAttuale;
    this.limiteUmori.segna(this.o.orologio.ora(), scena);
    const giàScelto = this.umoreScelto?.scena === scena;
    this.umoreScelto = { tag, scena };
    if (prima === tag && giàScelto) return { ok: true };
    this.o.log.info({ da: prima, a: tag, scena }, 'audio: cambio d’umore');
    this.notifica();
    return { ok: true };
  }

  /** Umore della musica in vigore (tag), null = la musica del luogo. */
  get umoreAttuale(): string | null {
    return this.stato().scena.audio?.umore?.replace(/^umore_/, '') ?? null;
  }

  /** Parametri audio di un turno di narrazione: controlli dei tag, rifiuti nel registro, umore senza frase. */
  private parametriAudioTurno(): { audio?: NonNullable<ReturnType<Regia['risolutoreAudio']>>; cueRifiutato: (tipo: 'umore' | 'effetto', tag: string, motivo: string) => void; cueSenzaFrase: (c: CueAudio) => void } {
    const audio = this.risolutoreAudio();
    return {
      ...(audio ? { audio } : {}),
      cueRifiutato: (tipo, tag, motivo) => {
        this.suCue?.({ comando: tipo, ok: false, dettagli: `automatico (narratore): [${tipo}] ${tag} ignorato: ${motivo}` });
        this.notifica();
      },
      cueSenzaFrase: (c) => this.applicaCue(c),
    };
  }

  /** Chi riceve i segnali audio automatici (il registro del pannello del master). */
  suCueAudio(f: (e: { comando: 'umore' | 'effetto'; ok: boolean; dettagli: string }) => void): void {
    this.suCue = f;
  }

  /** Controlli dei tag [umore]/[effetto] per il turno: vocabolario chiuso e catalogo della campagna. */
  private risolutoreAudio(): { umore(tag: string): ReturnType<typeof risolviUmore>; effetto(tag: string): ReturnType<typeof risolviEffetto> } | undefined {
    const cat = this.o.audio;
    if (!cat) return undefined;
    return { umore: (t) => risolviUmore(t, cat), effetto: (t) => risolviEffetto(t, cat) };
  }

  /** Segnale audio automatico arrivato alla sua frase (o senza frase): umore con limite, effetto. */
  private applicaCue(cue: CueAudio): void {
    let notificato = false;
    if (cue.umore !== undefined) notificato = this.umoreAutomatico(cue.umore, cue.origine);
    if (cue.effetto) {
      this.suCue?.({ comando: 'effetto', ok: true, dettagli: `automatico (${cue.origine}): effetto ${cue.effetto} con la frase` });
      this.o.log.info({ effetto: cue.effetto, origine: cue.origine }, 'audio: effetto automatico');
      if (!notificato) this.notifica();
    }
  }

  /**
   * Cambio d'umore deciso dal Motore: al massimo uno al minuto nella stessa scena (il cambio di
   * scena azzera il conto). Restituisce true se ha notificato lo stato.
   */
  private umoreAutomatico(tag: string | null, origine: string): boolean {
    const scena = this.campagna.scena.id;
    const nome = tag ?? 'auto';
    const prima = this.umoreAttuale;
    if (prima === tag) return false;
    const attesa = this.limiteUmori.attesa(this.o.orologio.ora(), scena);
    if (attesa > 0) {
      this.o.log.info({ umore: nome, origine, attesa_ms: Math.round(attesa) }, 'audio: umore automatico ignorato (uno al minuto)');
      this.suCue?.({ comando: 'umore', ok: false, dettagli: `automatico (${origine}): umore ${nome} ignorato, un cambio al minuto (ancora ${Math.ceil(attesa / 1000)} s)` });
      this.notifica();
      return true;
    }
    this.suCue?.({ comando: 'umore', ok: true, dettagli: `automatico (${origine}): umore della musica ${prima ?? 'auto'} → ${nome}` });
    const esito = this.cambiaUmore(tag);
    if (!esito.ok) {
      this.o.log.warn({ umore: nome, origine, errore: esito.errore }, 'audio: umore automatico non applicato');
      this.notifica();
    }
    return true;
  }

  /** L'audio di una battuta (`audio: {umore, effetto}`), controllato sul catalogo della campagna. */
  private cueBattuta(b: Battuta): CueAudio | undefined {
    if (!b.audio || !this.o.audio) return undefined;
    const origine = `battuta ${b.id}`;
    const cue: CueAudio = { origine };
    if (b.audio.umore) {
      const r = risolviUmore(b.audio.umore, this.o.audio);
      if (r.ok) cue.umore = r.valore;
      else this.suCue?.({ comando: 'umore', ok: false, dettagli: `automatico (${origine}): ${r.motivo}` });
    }
    if (b.audio.effetto) {
      const r = risolviEffetto(b.audio.effetto, this.o.audio);
      if (r.ok) cue.effetto = r.valore;
      else this.suCue?.({ comando: 'effetto', ok: false, dettagli: `automatico (${origine}): ${r.motivo}` });
    }
    return cue.umore !== undefined || cue.effetto ? cue : undefined;
  }

  // ------------------------------------------------------------------ immagini di situazione

  /** Situazioni della campagna con la loro rivelazione (pannello). */
  get situazioniCollegate(): readonly SituazioneCollegata[] {
    return this.situazioni;
  }

  /** Id della situazione sul proiettore, o null. */
  get situazioneInOnda(): string | null {
    return this.situazione?.id ?? null;
  }

  /** Il master mette (o toglie, con null) un'immagine di situazione sul proiettore. */
  mostraSituazione(id: string | null): Esito {
    if (id === null) {
      if (!this.situazione) return { ok: false, errore: 'Nessuna situazione sul proiettore.' };
      this.togliSituazione('master');
      this.notifica();
      return { ok: true };
    }
    const s = this.situazioni.find((x) => x.id === id);
    if (!s) return { ok: false, errore: 'Immagine di situazione sconosciuta.' };
    this.situazione = { id: s.id, url: s.url, auto: false, turno: this.turno };
    this.o.log.info({ situazione: s.id, da: 'master' }, 'immagini: situazione sul proiettore');
    this.notifica();
    return { ok: true };
  }

  private togliSituazione(motivo: string): void {
    if (!this.situazione) return;
    this.o.log.info({ situazione: this.situazione.id, motivo }, 'immagini: situazione tolta');
    this.situazione = null;
  }

  /**
   * Fine della narrazione: se è uscita la rivelazione di una situazione (indizio o battuta nel suo
   * `dopo`), la situazione va sul proiettore ora che la rivelazione è stata ascoltata.
   */
  private situazioniDopoLeRivelazioni(): void {
    const rivelate = new Set(this.rivelateNelTurno);
    this.rivelateNelTurno = [];
    if (rivelate.size === 0) return;
    const s = this.situazioni.find((x) => !this.situazioniMostrate.has(x.id) && x.dopo.some((d) => rivelate.has(d)));
    if (!s) return;
    this.situazioniMostrate.add(s.id);
    this.situazione = { id: s.id, url: s.url, auto: true, turno: this.turno };
    this.o.log.info({ situazione: s.id, dopo: s.dopo.filter((d) => rivelate.has(d)), turno: this.turno }, 'immagini: situazione dopo la rivelazione');
  }

  private nomePg(id: string): string {
    return this.campagna.pg.find((p) => p.id === id)?.nome ?? id;
  }

  /** Testo dell'ultima narrazione pubblica (per l'arbitro). */
  private ultimaNarrazione(): string {
    const voci = this.trascrizione.filter((v) => v.tipo === 'narrazione' || v.tipo === 'battuta');
    const ultimo = voci.at(-1)?.turno;
    return voci
      .filter((v) => v.turno === ultimo)
      .map((v) => (v.tipo === 'battuta' ? `${v.nome}: ${v.testo}` : v.testo))
      .join('\n');
  }

  collega(uscita: UscitaRegia): void {
    this.uscita = uscita;
  }

  /** Id della scena in corso (ISO dell'avvio, '' prima dell'avvio) e modalità del narratore. */
  get infoSessione(): { sessione: string; modo: 'improvvisa' | 'repertorio' } {
    return { sessione: this.sessione, modo: this.o.modo };
  }

  private nuovoStatoRepertorio(): StatoRepertorio | null {
    if (this.o.modo !== 'repertorio') return null;
    if (!this.o.repertorio) throw new Error('modalità repertorio senza repertorio caricato');
    return new StatoRepertorio(this.o.repertorio, this.campagna, this.orologi);
  }

  /** Stato pubblico per le parole segrete: indizi rivelati e battute uscite. */
  private statoPubblico(): StatoPubblico | null {
    const s = this.statoRepertorio;
    return s ? { indiziRivelati: s.indiziRivelati, battuteUsate: (id) => s.usata(id) } : null;
  }

  /**
   * `[usa] <id>` dal selettore: la battuta esce se è disponibile; le sue righe vanno alla voce con
   * l'audio pre-generato (stessa normalizzazione dello script di pre-generazione).
   */
  private usaBattuta(id: string, per: string | null, turno: number, segno: { mostrato: boolean }, motore = false): EsitoUsaTurno {
    const s = this.statoRepertorio;
    if (!s) return { ok: false, motivo: 'modalità improvvisa: nessun repertorio' };
    // Una battuta scelta dal Motore (finale, chiusura) non passa dal catalogo del selettore: la sua
    // disponibilità la controlla comunque s.usa.
    if (!motore && !this.elencoTurno.has(id)) {
      const b = s.repertorio.perId.get(id);
      return { ok: false, motivo: b ? `non era nel catalogo del turno (${s.motivoIndisponibile(b, turno) ?? 'non pertinente alle azioni o trattenuta per un segreto'})` : `battuta inesistente: ${id}` };
    }
    // B2: ogni battuta risponde a un'azione (`> pg`), salvo il segno dovuto e le mosse di stallo.
    // Cancelli sull'azione: `richiede.privata` solo verso un'azione privata, `da_pg` solo verso quei PG;
    // le altre battute solo verso azioni pubbliche (un'azione privata non riceve battute qualsiasi).
    const b = s.repertorio.perId.get(id)!;
    const t = this.turnoB;
    if (per) {
      const azione = t?.azioni.get(per);
      if (!azione) return { ok: false, motivo: `${per} non ha un'azione in questo turno` };
      if (!s.rispondeA(b, { autore: per, privata: azione.privata })) {
        return { ok: false, motivo: `${id} non risponde all'azione ${azione.privata ? 'privata' : 'pubblica'} di ${per} (cancelli privata/da_pg delle condizioni aperte)` };
      }
    } else {
      if (s.serveAzione(b)) return { ok: false, motivo: `${id} ha un cancello sull'azione (privata o da_pg): serve «> pg»` };
      // Un finale non risponde all'azione di nessuno: chiude la scena (se è disponibile, s.usa lo controlla).
      const libera = motore || b.tipo === 'finale' || (b.tipo === 'segno_orologio' && !!t?.segnoDovuto) || (b.riempitivo && !!t?.stallo);
      if (!libera) return { ok: false, motivo: 'battuta senza «> pg»: ammessa solo per il segno dovuto, un finale o allo stallo' };
    }
    const esito = s.usa(id, turno, segno.mostrato);
    if (!esito.ok) return esito;
    if (esito.battuta.effetti.avanza_orologio) segno.mostrato = true;
    this.rivelateNelTurno.push(esito.battuta.id, ...esito.battuta.effetti.rivela_indizi);
    if (esito.orologiPartiti.length) this.o.log.info({ turno, battuta: id, orologi: esito.orologiPartiti }, 'orologio: partito (parte_dopo)');
    const audio = this.cueBattuta(esito.battuta);
    return {
      ok: true,
      versione: esito.versione,
      ...(audio ? { audio } : {}),
      righe: esito.righe.map((r) => {
        const { mostrato, voce } = testoPerVoce(r.etichetta, r.testo, this.pronuncia);
        return { etichetta: r.etichetta, testo: mostrato, testo_voce: voce, chiave_cache: chiaveAudio(voceDi(this.campagna, r.etichetta).voce_id, voce) };
      }),
    };
  }

  // ------------------------------------------------------------------ stato

  stato(): StatoTavolo {
    const c = this.campagna;
    const conteggio = new Map<string, number>();
    for (const id of this.telefoni.values()) conteggio.set(id, (conteggio.get(id) ?? 0) + 1);
    return {
      versione_stato: this.versioneStato,
      versione_scena: this.versioneScena,
      fase: this.fase,
      turno: this.turno,
      scena: {
        id_campagna: c.id,
        titolo: c.scena.titolo,
        umore: c.scena.umore,
        intensita: c.scena.intensita,
        ...this.immaginiPubbliche(),
        ...(this.o.audio ? { audio: audioDellaScena(this.o.audio, c, this.luogo, this.umoreScelto) } : {}),
      },
      pg: c.pg.map((p) => ({ id: p.id, nome: p.nome, descrizione: p.descrizione, telefoni: conteggio.get(p.id) ?? 0 })),
      finestra: this.tavolo.finestraPubblica(),
      al_tavolo: this.tavolo.alTavolo(),
      trascrizione: this.trascrizione.slice(-this.o.trascrizioneMax),
      voce_motore: this.o.voce.nome,
      schermo_connesso: this.schermi.size > 0,
      pausa_automatica: this.fase === 'pausa' && this.pausaAutomatica,
      ora_server_ms: this.o.orologio.adesso(),
    };
  }

  azioneDi(id_pg: string): AzionePrivata | null {
    return this.tavolo.azioneDi(id_pg);
  }

  /** Scheda privata del PG (solo per il telefono che l'ha scelto). */
  schedaPg(id_pg: string): SchedaPg | null {
    return schedaPg(this.campagna, id_pg);
  }

  private notifica(): void {
    if (this.spento) return;
    this.versioneStato += 1;
    this.uscita?.stato(this.stato());
    for (const f of this.ascoltatori) f();
  }

  /** Un modulo esterno (note di regia) ha cambiato qualcosa che il pannello deve vedere. */
  notificaEsterna(): void {
    this.notifica();
  }

  /** Registra un ascoltatore di ogni cambiamento dello stato; restituisce la funzione che lo toglie. */
  alCambio(f: () => void): () => void {
    this.ascoltatori.add(f);
    return () => this.ascoltatori.delete(f);
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
    const elenco = this.campagna.pg.map((p) => p.id).filter((id) => scelti.has(id));
    return elenco.length ? elenco : this.campagna.pg.map((p) => p.id);
  }

  telefonoSceglie(socketId: string, id_pg: string, dispositivo?: unknown): Esito {
    if (!this.campagna.pg.some((p) => p.id === id_pg)) return { ok: false, errore: 'Personaggio sconosciuto.' };
    if (typeof dispositivo === 'string' && DISPOSITIVO_VALIDO.test(dispositivo)) {
      this.dispositivoDiSocket.set(socketId, dispositivo);
      if (this.dispositivi.get(dispositivo) !== id_pg) {
        this.dispositivi.set(dispositivo, id_pg);
        this.o.memoria?.scrivi([{ tipo: 'dispositivo', dati: { dispositivo, id_pg } }], null);
      }
    }
    const prima = this.telefoni.get(socketId);
    this.telefoni.set(socketId, id_pg);
    if (prima && prima !== id_pg) this.lasciaPg(prima);
    this.tavolo.aggiungiInvitato(id_pg);
    this.o.log.info({ socket: socketId, id_pg, prima: prima ?? null }, 'telefono: PG scelto');
    this.notifica();
    return { ok: true };
  }

  telefonoEsce(socketId: string): void {
    const id_pg = this.telefoni.get(socketId);
    this.telefoni.delete(socketId);
    this.dispositivoDiSocket.delete(socketId);
    if (id_pg) {
      this.lasciaPg(id_pg);
      this.notifica();
    }
  }

  private lasciaPg(id_pg: string): void {
    if ([...this.telefoni.values()].includes(id_pg)) return; // un altro telefono lo tiene
    this.tavolo.rimuoviInvitato(id_pg);
  }

  /** Lo schermo ha sbloccato l'audio: entra, e la scena parte se era in attesa. */
  schermoInizia(socketId: string): Esito {
    this.schermi.add(socketId);
    this.o.log.info({ socket: socketId, fase: this.fase, schermi: this.schermi.size }, 'schermo: audio sbloccato');
    if (this.fase === 'attesa' && this.daRiprendere) this.riprendiSessione();
    else if (this.fase === 'attesa') this.avviaScena();
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
    this.o.log.info(
      { turno: d.turno, buchi: d.buchi, buchi_in_frase: d.buchi_in_frase, buchi_tra_frasi: d.buchi_tra_frasi, silenzio_ms: d.silenzio_ms, ritardo_ms: d.ritardo_ms },
      'schermo: audio finito',
    );
    if (this.misuratore && d.turno === this.misuratore.turno && typeof d.buchi === 'number') {
      this.misuratore.impostaBuchi({
        buchi: d.buchi,
        buchi_in_frase: typeof d.buchi_in_frase === 'number' ? d.buchi_in_frase : 0,
        buchi_tra_frasi: typeof d.buchi_tra_frasi === 'number' ? d.buchi_tra_frasi : 0,
        silenzio_ms: typeof d.silenzio_ms === 'number' ? d.silenzio_ms : 0,
      });
    }
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
    if (motivo !== 'arresto') this.salva('fermata');
    return { ok: true };
  }

  /**
   * Spegnimento del server: si fermano LLM, voce e timer, senza toccare lo stato del gioco e senza
   * dirlo ai client (la sessione salvata riprenderà da qui; i telefoni vedranno solo la connessione
   * che cade e torna, non una «scena fermata»).
   */
  spegni(): void {
    this.spento = true;
    this.interrompiFlussi('arresto');
    this.tavolo.spegni();
    this.o.log.info({ turno: this.turno, fase: this.fase }, 'scena: server in spegnimento');
  }

  ricomincia(): Esito {
    this.interrompiTutto('ricomincia');
    this.o.memoria?.termina('ricomincia');
    this.daRiprendere = null;
    this.turniSalvati.clear();
    this.tavoloSalvato = '';
    this.trascrizione = [];
    this.turno = 0;
    this.versioneScena = 0;
    // Si riparte dalla prima scena, con gli orologi della campagna da capo.
    this.orologi = new StatoOrologi(this.o.campagna);
    this.impostaScena(this.o.campagna.scene[0]!.id);
    this.statoRepertorio = this.nuovoStatoRepertorio();
    this.tavolo.azzera();
    // Le note di regia contano i turni di questa scena: si riparte senza.
    this.note.azzera();
    this.situazioniMostrate.clear();
    this.rivelateNelTurno = [];
    this.o.log.info({ schermi: this.schermi.size }, 'scena: ricomincia');
    if (this.schermi.size > 0) this.avviaScena();
    else {
      this.fase = 'attesa';
      this.notifica();
    }
    return { ok: true };
  }

  // ------------------------------------------------------------------ comandi del master
  // Validazione e registro degli eventi stanno in master/comandi.ts: qui solo l'effetto sullo stato.

  /** La narrazione (apertura compresa) è in corso: LLM o voce stanno lavorando. */
  get narrazioneInCorso(): boolean {
    return this.fase === 'apertura' || this.fase === 'narrazione';
  }

  get statoPausa(): { richiesta: boolean; attiva: boolean } {
    return { richiesta: this.pausaRichiesta, attiva: this.fase === 'pausa' };
  }

  /**
   * Pausa: nessuna nuova finestra. A finestra aperta la finestra resta aperta ma non si chiude da
   * sola (e niente stallo); durante una narrazione la si lascia finire e poi il tavolo si ferma.
   */
  pausa(): Esito {
    if (this.fase === 'attesa' || this.fase === 'fermata') return { ok: false, errore: 'La scena non è in corso.' };
    if (this.fase === 'pausa' && this.pausaAutomatica) {
      // Il master conferma la pausa presa dal Motore: da qui riparte solo con Riprendi.
      this.pausaAutomatica = false;
      this.notifica();
      return { ok: true };
    }
    if (this.fase === 'pausa') return { ok: false, errore: 'Il tavolo è già in pausa.' };
    if (this.pausaRichiesta) return { ok: false, errore: 'La pausa è già chiesta: scatta alla fine della narrazione.' };
    // A finestra chiusa ma col lucchetto preso la narrazione sta per partire: si comporta come una narrazione.
    if (this.fase === 'finestra' && !this.tavolo.chiudendo) {
      this.tavolo.sospendi();
      this.fase = 'pausa';
      this.invitoSospeso = null;
      this.o.log.info({ turno: this.turno }, 'scena: in pausa (finestra sospesa)');
    } else {
      this.pausaRichiesta = true;
      this.o.log.info({ turno: this.turno, fase: this.fase }, 'scena: pausa chiesta, scatta a fine narrazione');
    }
    this.notifica();
    return { ok: true };
  }

  /** Riprende dalla pausa (o annulla una pausa chiesta e non ancora scattata). */
  riprendi(): Esito {
    // Si riparte (master o prima azione dopo la pausa automatica): il conto degli stalli riparte da zero.
    this.pausaAutomatica = false;
    this.stalliDiFila = 0;
    if (this.pausaRichiesta && this.fase !== 'pausa') {
      this.pausaRichiesta = false;
      this.o.log.info({ turno: this.turno }, 'scena: pausa chiesta annullata');
      this.notifica();
      return { ok: true };
    }
    if (this.fase !== 'pausa') return { ok: false, errore: 'Il tavolo non è in pausa.' };
    if (this.tavolo.aperta) {
      this.fase = 'finestra';
      this.tavolo.riprendi();
      this.o.log.info({ turno: this.turno }, 'scena: ripresa (finestra di nuovo attiva)');
    } else {
      const invito = this.invitoSospeso ?? 'tutti';
      this.invitoSospeso = null;
      this.o.log.info({ turno: this.turno, invito }, 'scena: ripresa (nuova finestra)');
      this.apriFinestra(invito);
    }
    this.notifica();
    return { ok: true };
  }

  /**
   * Freno d'emergenza: interrompe subito LLM e voce (lo schermo tace) e mette il tavolo in pausa.
   * Le azioni del turno interrotto non sono state risolte: tornano ai giocatori da rimandare.
   */
  fermaNarrazione(): Esito {
    if (!this.narrazioneInCorso) return { ok: false, errore: 'Nessuna narrazione in corso.' };
    const turno = this.turno;
    const faseInterrotta = this.fase;
    this.interrompiFlussi('master');
    this.primoAudioInviato.delete(turno);
    const annullate = this.tavolo.annullaChiuse(turno, MOTIVO_NARRAZIONE_INTERROTTA);
    this.aggiungiTrascrizione({ turno, tipo: 'sistema', chi: 'sistema', nome: 'Sistema', testo: 'Il master ha interrotto la narrazione.' });
    this.o.registroNarrazioni.scrivi({ sessione: this.sessione, turno, tipo: 'interrotta', fase: faseInterrotta, azioni_annullate: annullate });
    // La parte già detta è pubblica: le azioni scritte nel frattempo si ricontrollano contro di essa.
    this.versioneScena += 1;
    void this.tavolo.dopoNarrazione(turno, this.versioneScena);
    this.pausaRichiesta = false;
    this.invitoSospeso = 'tutti';
    this.fase = 'pausa';
    this.o.log.warn({ turno, fase: faseInterrotta, azioni_annullate: annullate }, 'scena: narrazione interrotta dal master, tavolo in pausa');
    this.notifica();
    return { ok: true };
  }

  /** Id della scena in corso. */
  get scenaCorrente(): string {
    return this.campagna.scena.id;
  }

  /**
   * Passaggio a un'altra scena (pannello del master). Prima dell'avvio o a scena fermata cambia solo
   * la scena da cui si parte. A tavolo in gioco: le azioni in sospeso (scritte per la scena di
   * prima) tornano ai giocatori, il proiettore passa al luogo della scena nuova con la dissolvenza,
   * il narratore ne legge l'apertura e si apre la finestra per tutti.
   */
  cambiaScena(id: string): Esito {
    const nuova = this.o.campagna.scene.find((s) => s.id === id);
    if (!nuova) return { ok: false, errore: 'Scena sconosciuta.' };
    if (nuova.id === this.campagna.scena.id) return { ok: false, errore: 'È già la scena in corso.' };
    if (this.narrazioneInCorso || this.tavolo.chiudendo) return { ok: false, errore: 'Aspetta che finisca la narrazione, o fermala prima.' };
    const da = this.campagna.scena.id;
    this.impostaScena(nuova.id);
    this.o.log.info({ da, a: nuova.id, fase: this.fase, immagine: this.o.immagini?.luogo(nuova.id) ?? null }, 'scena: cambio di scena');
    if (this.fase === 'attesa' || this.fase === 'fermata') {
      this.notifica();
      return { ok: true };
    }
    const annullate = this.tavolo.annullaVive(MOTIVO_CAMBIO_SCENA);
    // A finestra aperta il suo turno non è stato narrato: l'apertura lo prende; altrimenti il successivo.
    const turno = this.tavolo.aperta ? this.turno : this.turno + 1;
    this.tavolo.chiudiForzata();
    this.pausaRichiesta = false;
    this.invitoSospeso = null;
    this.turno = turno;
    this.aggiungiTrascrizione({ turno, tipo: 'sistema', chi: 'sistema', nome: 'Sistema', testo: `Nuova scena: ${nuova.titolo}.` });
    this.o.registroNarrazioni.scrivi({ sessione: this.sessione, turno, tipo: 'cambio_scena', da, a: nuova.id, azioni_annullate: annullate, testo: nuova.apertura.map((f) => `[narratore] ${f}`).join('\n') });
    if (this.o.preriscalda && this.o.narratore.preriscalda) void this.preriscalda();
    this.leggiApertura(turno, nuova.apertura);
    return { ok: true };
  }

  /** Il master chiude la finestra adesso (il narratore risponde alle azioni inviate). */
  chiudiFinestraOra(): Esito {
    if (this.fase === 'pausa') return { ok: false, errore: 'Il tavolo è in pausa: riprendi prima di chiudere la finestra.' };
    if (this.fase !== 'finestra') return { ok: false, errore: 'La finestra delle azioni non è aperta.' };
    return this.tavolo.chiudiOra();
  }

  /** Il master salta l'azione di un giocatore (non entra nel turno). */
  saltaAzione(idAzione: string): Esito {
    const a = this.tavolo.salta(idAzione, MOTIVO_SALTATA);
    if (!a) return { ok: false, errore: 'Azione inesistente o già fuori dal turno.' };
    return { ok: true };
  }

  /** Il master avanza (+1) o riporta indietro (−1) un orologio di un segno. */
  spostaOrologio(id: string, passo: 1 | -1): EsitoAvanzamento {
    // Un orologio che aspetta (parte_dopo) parte quando il master lo fa avanzare: è una decisione umana.
    if (passo === 1 && this.orologi.elenco.some((o) => o.id === id) && this.orologi.avvia(id, this.turno)) {
      this.o.log.info({ orologio: id, turno: this.turno }, 'orologio: partito per mano del master');
    }
    const esito = passo === 1 ? this.orologi.avanza(id, this.turno, false) : this.orologi.indietro(id);
    if (esito.ok) {
      this.o.log.info({ orologio: id, passo, pieni: esito.orologio.pieni, segmenti: esito.orologio.segmenti }, 'orologio: spostato dal master');
      this.notifica();
    }
    return esito;
  }

  /** Orologi attivi con lo stato tenuto dal Motore (per il pannello). */
  get orologiAttivi(): ReadonlyArray<Readonly<OrologioMinaccia> & { dovuto: boolean }> {
    const turnoProssimo = this.fase === 'finestra' || this.fase === 'pausa' ? this.turno : this.turno + 1;
    return this.orologi.elenco.map((o) => ({ ...o, dovuto: this.orologi.dovuto(o, turnoProssimo) }));
  }

  /** Tutte le azioni (per il pannello, private comprese). */
  get azioniTutte(): ReadonlyArray<Readonly<Azione>> {
    return this.tavolo.tutte();
  }

  /** Stato del repertorio (modalità B), null in modalità improvvisa. */
  get repertorioAttivo(): StatoRepertorio | null {
    return this.statoRepertorio;
  }

  get turnoCorrente(): number {
    return this.turno;
  }

  /** Luogo corrente sul proiettore. */
  get luogoCorrente(): string {
    return this.luogo;
  }

  /**
   * Comandi dei telefoni. Si può scrivere sempre: a finestra chiusa (il narratore parla) l'azione
   * entra nella finestra successiva.
   */
  inviaAzione(id_pg: string, testo: string, versioneVista: number, privata = false): Esito {
    if (this.fase === 'attesa' || this.fase === 'fermata') return { ok: false, errore: 'La scena non è in corso.' };
    const esito = this.tavolo.invia(id_pg, testo, versioneVista, privata);
    if (esito.ok && this.fase === 'pausa' && this.pausaAutomatica) {
      // Qualcuno è tornato a giocare: la pausa presa dal Motore finisce, l'azione entra nella finestra.
      this.o.log.info({ turno: this.turno, id_pg }, 'scena: azione dopo la pausa automatica, si riparte');
      this.riprendi();
      this.salva('ripresa_dopo_stallo');
    }
    return esito;
  }

  ritiraAzione(id_pg: string): Esito {
    return this.tavolo.ritira(id_pg);
  }

  confermaAzione(id_pg: string): Esito {
    return this.tavolo.conferma(id_pg);
  }

  segnaPronto(id_pg: string, pronto: boolean): Esito {
    return this.tavolo.pronto(id_pg, pronto);
  }

  scrivo(id_pg: string): void {
    this.tavolo.scrivo(id_pg);
  }

  // ------------------------------------------------------------------ flusso della scena

  private interrompiTutto(motivo: string): void {
    this.scenaFinitaAlTurno = null;
    this.interrompiFlussi(motivo);
    this.tavolo.chiudiForzata();
    this.pausaRichiesta = false;
    this.invitoSospeso = null;
  }

  /** Ferma LLM, voce, attese dell'audio e misure in corso (i flussi vecchi escono per `epoca`). */
  private interrompiFlussi(motivo: string): void {
    this.epoca += 1;
    this.controlloLlm?.abort(new Error(motivo));
    this.controlloLlm = null;
    this.pipeline.interrompi(motivo);
    if (this.attesaAudio) {
      this.attesaAudio.timer?.();
      this.attesaAudio.risolvi(null);
      this.attesaAudio = null;
    }
    if (this.misuratore) {
      const record = { ...this.misuratore.record(), interrotto: true, motivo_interruzione: motivo };
      this.o.registroTurni.scrivi(record);
      this.misuratore = null;
    }
  }

  private avviaScena(): void {
    const c = this.campagna;
    this.sessione = this.o.memoria?.nuova() ?? new Date(this.o.orologio.adesso()).toISOString();
    // I telefoni che hanno scelto il PG prima dell'inizio entrano nella sessione nuova.
    this.o.memoria?.scrivi(
      [
        { tipo: 'inizio', dati: { campagna: this.o.campagna.id, modo: this.o.modo, scena: c.scena.id } },
        ...[...this.dispositivi].map(([dispositivo, id_pg]) => ({ tipo: 'dispositivo', dati: { dispositivo, id_pg } })),
      ],
      0,
    );
    this.o.registroNarrazioni.scrivi({ sessione: this.sessione, turno: 0, tipo: 'apertura', scena: c.scena.id, voce: this.o.voce.nome, testo: c.scena.apertura.map((f) => `[narratore] ${f}`).join('\n') });
    this.turno = 0;
    this.o.log.info({ scena: c.scena.id, frasi: c.scena.apertura.length, voce: this.o.voce.nome }, 'scena: apertura');
    if (this.o.preriscalda && this.o.narratore.preriscalda) void this.preriscalda();
    this.leggiApertura(0, c.scena.apertura);
    this.salva('inizio');
  }

  /**
   * Il narratore legge l'apertura di una scena (fase «apertura», turno `turno`), poi la finestra si
   * apre per tutti (o il tavolo va in pausa, se il master l'ha chiesta).
   */
  private leggiApertura(turno: number, frasi: string[]): void {
    const epoca = ++this.epoca;
    this.fase = 'apertura';
    this.segmentiAperti.clear();
    if (frasi.length === 0) {
      this.versioneScena += 1;
      this.fineNarrazione('tutti');
      return;
    }
    this.aggiungiTrascrizione({ turno, tipo: 'narrazione', chi: ID_NARRATORE, nome: NOME_NARRATORE, testo: frasi.join(' ') });
    frasi.forEach((testo, indice) =>
      this.pipeline.accoda({
        id_frase: `t${turno}-f${indice}`,
        turno,
        indice,
        parlante: ID_NARRATORE,
        nome: NOME_NARRATORE,
        voce_id: ID_NARRATORE,
        testo,
        testo_voce: this.pronuncia(testo),
      }),
    );
    this.notifica();
    void (async () => {
      const esito = await this.pipeline.chiudiTurno(turno);
      if (epoca !== this.epoca || esito.interrotto) return;
      await this.attendiFineAudio(turno, esito.secondi);
      if (epoca !== this.epoca) return;
      this.versioneScena += 1;
      this.fineNarrazione('tutti');
    })();
  }

  /** La scena corrente diventa `id`: contesto del narratore, orologi attivi, repertorio, luogo. */
  private impostaScena(id: string): void {
    this.campagna = conScena(this.o.campagna, id);
    this.sistema = this.o.sistemaPer?.(this.campagna) ?? this.sistema;
    this.scenaPubblica = this.o.scenaPubblicaPer?.(this.campagna) ?? this.scenaPubblica;
    this.orologi.impostaScena(this.campagna.scena);
    this.statoRepertorio?.impostaScena(this.campagna.scena);
    this.luogo = id;
    this.togliSituazione('cambio di scena');
    // Scena nuova (o ricominciata): torna il suo umore iniziale, e il limite riparte.
    this.umoreScelto = null;
    this.limiteUmori.azzera();
  }

  private async preriscalda(): Promise<void> {
    try {
      const inizio = this.o.orologio.ora();
      const esito = await this.o.narratore.preriscalda!(this.sistema);
      if (!esito) return;
      this.o.registroCosti.scrivi({ ts: new Date().toISOString(), tipo: 'preriscaldamento', modello: esito.modello, ...esito.costo, ms: Math.round(this.o.orologio.ora() - inizio) });
      this.o.log.info({ ...esito.costo, ms: Math.round(this.o.orologio.ora() - inizio) }, 'llm: cache preriscaldata');
    } catch (err) {
      this.o.log.warn({ err: (err as Error).message }, 'llm: preriscaldamento fallito (si continua)');
    }
  }

  /**
   * Fine di una narrazione (o dell'apertura): le azioni del turno si risolvono e quelle scritte nel
   * frattempo si ricontrollano contro la narrazione appena finita (in sottofondo). Poi si apre la
   * finestra, oppure, se il master ha chiesto la pausa, il tavolo si ferma con l'invito in serbo.
   */
  private fineNarrazione(invito: string[] | 'tutti'): void {
    void this.tavolo.dopoNarrazione(this.turno, this.versioneScena);
    this.situazioniDopoLeRivelazioni();
    if (this.scenaFinitaAlTurno === this.turno) {
      // Il finale è stato detto: niente finestra nuova, il master sceglie (altra scena, Riprendi, Fine sessione).
      this.scenaFinitaAlTurno = null;
      this.fase = 'pausa';
      this.invitoSospeso = 'tutti';
      this.aggiungiTrascrizione({ turno: this.turno, tipo: 'sistema', chi: 'sistema', nome: 'Sistema', testo: TESTO_FINE_SCENA });
      this.uscita?.avviso('info', TESTO_FINE_SCENA);
      this.o.log.info({ turno: this.turno, scena: this.campagna.scena.id }, 'scena: finita col finale, tavolo in pausa');
      this.notifica();
      this.salva('fine_scena');
      return;
    }
    if (this.pausaRichiesta) {
      this.pausaRichiesta = false;
      this.fase = 'pausa';
      this.invitoSospeso = invito;
      this.o.log.info({ turno: this.turno, invito, automatica: this.pausaAutomatica }, 'scena: in pausa (dopo la narrazione)');
      if (this.pausaAutomatica) {
        this.aggiungiTrascrizione({ turno: this.turno, tipo: 'sistema', chi: 'sistema', nome: 'Sistema', testo: TESTO_PAUSA_AUTOMATICA });
        this.uscita?.avviso('info', TESTO_PAUSA_AUTOMATICA);
      }
      this.notifica();
      this.salva('fine_turno');
      return;
    }
    this.apriFinestra(invito);
    this.salva('fine_turno');
  }

  private apriFinestra(invito: string[] | 'tutti'): void {
    const presenti = this.pgAlTavolo();
    let invitati = invito === 'tutti' ? presenti : invito.filter((id) => presenti.includes(id));
    // Esperimenti: copione fisso di azioni, quindi tutti possono agire (l'invito resta nel registro).
    if (this.o.finestraATutti) invitati = presenti;
    if (invitati.length === 0) {
      if (invito !== 'tutti') this.o.log.warn({ invito, presenti }, 'regia: nessun invitato è al tavolo, si invitano tutti');
      invitati = presenti;
    }
    this.turno += 1;
    this.segmentiAperti.clear();
    this.fase = 'finestra';
    this.tavolo.apri(this.turno, invitati, this.versioneScena, invito === 'tutti');
  }

  private finestraChiusa(r: RiepilogoChiusura): void {
    if (r.motivo === 'forzata') return; // ferma/ricomincia: niente narrazione
    // La situazione messa dopo una rivelazione ha accompagnato la reazione dei giocatori: si torna al luogo.
    if (this.situazione?.auto && this.situazione.turno < r.turno) this.togliSituazione('narrazione successiva');
    this.rivelateNelTurno = [];
    this.misuratore = new MisuratoreTurno(r.turno, r.chiusa_a, r.durata_ms, this.o.voce.nome, this.o.orologio.adesso());
    // Contratto voce: /sveglia alla chiusura della finestra, in parallelo alla chiamata dell'LLM
    // (fire-and-forget: la prima frase arriva dopo ~0,9 s, la sveglia ci sta dentro).
    const motoreVoce = this.o.voce.attivo;
    if (motoreVoce.sveglia) {
      this.misuratore.segna('voce_sveglia', this.o.orologio.ora());
      void motoreVoce.sveglia();
    }
    const epoca = this.epoca;
    const c = this.campagna;
    this.fase = 'narrazione';
    this.o.log.info(
      { turno: r.turno, motivo: r.motivo, finestra_ms: r.durata_ms, azioni: r.azioni.length, senzaAzione: r.senzaAzione },
      'finestra: chiusa',
    );
    const nomePg = (id: string) => c.pg.find((p) => p.id === id)?.nome ?? id;
    // Le azioni pubbliche entrano nella trascrizione (in ordine di risoluzione).
    for (const a of r.azioni) {
      if (!a.privata) this.aggiungiTrascrizione({ turno: r.turno, tipo: 'azione', chi: a.autore, nome: nomePg(a.autore), testo: a.testo });
    }
    const perNarratore = azioniPerNarratore(r, nomePg, (id) => this.tavolo.azione(id));
    this.stalliDiFila = r.motivo === 'stallo' ? this.stalliDiFila + 1 : 0;
    if (this.stalliDiFila >= STALLI_PRIMA_DELLA_PAUSA && !this.pausaRichiesta) {
      // Nessuno gioca da un po': questa è l'ultima mossa del mondo, poi il tavolo si ferma da solo.
      this.pausaRichiesta = true;
      this.pausaAutomatica = true;
      this.o.log.info({ turno: r.turno, stalli: this.stalliDiFila }, 'scena: troppi stalli di fila, pausa automatica a fine narrazione');
    }
    const messaggio = compilaMessaggioTurno({
      turno: r.turno,
      trascrizione: this.trascrizione,
      azioni: perNarratore.azioni,
      collegamenti: perNarratore.collegamenti,
      ...(this.stalliDiFila ? { stallo: this.stalliDiFila } : {}),
      pgAlTavolo: this.pgAlTavolo().map((id) => ({ id, nome: nomePg(id) })),
      orologi: this.statoRepertorio ? this.orologi.descriviRepertorio(r.turno) : this.orologi.descrivi(r.turno),
      ...(this.statoRepertorio ? { repertorio: this.elencoRepertorio(r) } : {}),
      noteRegia: this.note.testi,
    });
    // Note di regia: entrano in questa chiamata (e nella sua eventuale riparazione) e consumano un turno.
    const noteNelMessaggio = this.note.elenco;
    if (noteNelMessaggio.length) {
      const sezione = sezioneNoteRegia(noteNelMessaggio.map((n) => n.testo));
      this.o.log.info(
        { turno: r.turno, note: noteNelMessaggio.map((n) => ({ id: n.id, testo: n.testo, turni_rimasti: n.turni_rimasti })), nel_messaggio: !!sezione && messaggio.includes(sezione) },
        'narratore: note di regia nel messaggio',
      );
      const scadute = this.note.consumaTurno();
      if (scadute.length) this.o.log.info({ turno: r.turno, scadute: scadute.map((n) => n.id) }, 'note di regia: scadute');
    }
    // Rete di sicurezza: nel messaggio del selettore non deve esserci nessuna parola ancora segreta.
    if (this.statoRepertorio && this.o.paroleSegrete?.length) {
      const trovate = segretiNelTesto(messaggio, this.o.paroleSegrete, this.statoPubblico());
      if (trovate.length) this.o.log.error({ turno: r.turno, parole: trovate.map((p) => p.parola) }, 'repertorio: parola segreta nel messaggio del selettore');
    }
    this.notifica();
    const azioni = [
      ...r.azioni.map((a) => ({ id_pg: a.autore, testo: a.testo as string | null, privata: a.privata, dipende_da: a.dipende_da, conflitti: a.conflitti })),
      ...r.sospese.map((a) => ({ id_pg: a.autore, testo: a.testo as string | null, sospesa: true })),
      ...r.senzaAzione.map((id) => ({ id_pg: id, testo: null as string | null })),
    ];
    // Mossa del mondo (stallo, o nessuna azione): la narrazione resta nella finzione (narrazione/finzione.ts).
    const mossaDelMondo = r.motivo === 'stallo' || r.azioni.length === 0;
    void this.eseguiNarrazione(r.turno, messaggio, epoca, azioni, r.motivo, noteNelMessaggio.map((n) => n.testo), mossaDelMondo);
  }

  private async eseguiNarrazione(
    turno: number,
    messaggio: string,
    epoca: number,
    azioni: Array<{ id_pg: string; testo: string | null; [k: string]: unknown }>,
    chiusura: RiepilogoChiusura['motivo'],
    noteRegia: string[] = [],
    mossaDelMondo = false,
  ): Promise<void> {
    const misuratore = this.misuratore!;
    const controllo = new AbortController();
    this.controlloLlm = controllo;
    /** Un segno di orologio è già uscito in questa risposta (mai due). */
    const segnoInRisposta = { mostrato: false };
    const log = this.o.log.child({ turno });
    log.debug({ caratteri: messaggio.length }, 'narratore: messaggio del turno');

    const esito = await narraTurno(
      { campagna: this.campagna, narratore: this.o.narratore, pipeline: this.pipeline, log },
      {
        turno,
        sistema: this.sistema,
        messaggio,
        signal: controllo.signal,
        misuratore,
        ora: () => this.o.orologio.ora(),
        pronuncia: this.pronuncia,
        ...this.parametriAudioTurno(),
        ...(mossaDelMondo ? { scartaFrase: fuoriDallaFinzione } : {}),
        usa: this.statoRepertorio ? (id, per) => this.usaBattuta(id, per, turno, segnoInRisposta) : null,
        onFrase: (f) => {
          if (epoca !== this.epoca) return;
          this.trascriviFrase(turno, f.etichetta, f.nome, f.testo, f.segmento);
        },
      },
    );
    if (epoca !== this.epoca) return;

    // Ogni azione dichiarata deve ricevere una risposta (B2). In modalità repertorio, se qualcuna
    // resta senza, una seconda chiamata breve risponde solo a quelle (una volta per turno).
    const pubbliche = new Map(azioni.filter((a) => a.testo && !a['privata'] && !a['sospesa']).map((a) => [a.id_pg, a.testo as string]));
    let senzaRisposta = this.azioniSenzaRisposta(esito.uscita, pubbliche);
    let riparazioni = 0;
    if (this.statoRepertorio && senzaRisposta.length && esito.esito && !controllo.signal.aborted) {
      riparazioni = 1;
      const primoCosto = esito.esito.costo;
      const riparazione = await narraTurno(
        { campagna: this.campagna, narratore: this.o.narratore, pipeline: this.pipeline, log },
        {
          turno,
          sistema: this.sistema,
          messaggio: messaggioRiparazione(messaggio, esito.esito.testo, senzaRisposta.map((id) => ({ id, nome: this.nomePg(id), testo: pubbliche.get(id)! }))),
          signal: controllo.signal,
          misuratore,
          ora: () => this.o.orologio.ora(),
          pronuncia: this.pronuncia,
          ...this.parametriAudioTurno(),
          ...(mossaDelMondo ? { scartaFrase: fuoriDallaFinzione } : {}),
          usa: (id, per) => this.usaBattuta(id, per, turno, segnoInRisposta),
          prefissoFrasi: 'r',
          ignora: new Set(['invito_mancante']),
          onFrase: (f) => {
            if (epoca !== this.epoca) return;
            this.trascriviFrase(turno, f.etichetta, f.nome, f.testo, 50_000 + f.segmento);
          },
        },
      );
      if (epoca !== this.epoca) return;
      esito.uscita.push(...riparazione.uscita);
      esito.righe_prescritte += riparazione.righe_prescritte;
      esito.righe_improvvisate += riparazione.righe_improvvisate;
      esito.usa_rifiutati += riparazione.usa_rifiutati;
      esito.scartate += riparazione.scartate;
      esito.anomalie.push(...riparazione.anomalie);
      if (riparazione.esito) {
        esito.esito.testo += `\n${riparazione.esito.testo}`;
        esito.esito.costo = sommaCosti(primoCosto, riparazione.esito.costo);
        misuratore.impostaCosto(esito.esito.costo);
        this.o.registroCosti.scrivi({ ts: new Date().toISOString(), tipo: 'riparazione', turno, modello: riparazione.esito.modello, ...riparazione.esito.costo });
      }
      const prima = senzaRisposta;
      senzaRisposta = this.azioniSenzaRisposta(esito.uscita, pubbliche);
      log.warn({ senza_risposta: prima, dopo_riparazione: senzaRisposta }, 'repertorio: azioni senza risposta, riparazione');
    }

    // B2: il segno d'orologio era dovuto ma il selettore non l'ha usato → lo mette il Motore,
    // dopo le risposte e prima della frase d'invito (deterministico, nessun token in più).
    let segnoAggiunto: string | null = null;
    if (this.statoRepertorio && this.turnoB?.segnoDovuto && !segnoInRisposta.mostrato && esito.esito && !controllo.signal.aborted) {
      const aggiunto = this.aggiungiSegnoDovuto(turno, esito, segnoInRisposta, log);
      if (aggiunto) {
        segnoAggiunto = aggiunto.id;
        esito.righe_prescritte += aggiunto.righe;
      }
    }
    // Il finale: a orologio della scena completo il Motore fa dire il finale disponibile (e la sua
    // chiusura), poi il tavolo va in pausa e decide il master (docs/repertorio.md, «Il finale»).
    let finale: string | null = null;
    if (this.statoRepertorio && esito.esito && !controllo.signal.aborted) {
      const f = this.finaleDelMotore(turno, esito, segnoInRisposta, log);
      if (f) {
        finale = f.finale;
        esito.righe_prescritte += f.righe;
      }
    }
    // Mossa del mondo rimasta vuota (le frasi fuori dalla finzione sono state scartate): rimedia il
    // Motore, senza un'altra chiamata. Modalità B: il segno dovuto o un riempitivo del catalogo;
    // altrimenti la mossa morbida pronta della scena.
    if (mossaDelMondo && esito.scartate > 0 && !esito.uscita.some((u) => u.tipo === 'usa' || u.tipo === 'improvvisata') && !controllo.signal.aborted) {
      const rimedio =
        this.statoRepertorio && esito.esito ? this.aggiungiSegnoDovuto(turno, esito, segnoInRisposta, log, (b) => (b.tipo === 'segno_orologio' && !!this.turnoB?.segnoDovuto) || b.riempitivo) : null;
      if (rimedio) esito.righe_prescritte += rimedio.righe;
      else this.parlaRiserva(turno);
      log.warn({ turno, scartate: esito.scartate, rimedio: rimedio?.id ?? 'mossa morbida' }, 'stallo: narrazione fuori dalla finzione, rimedio del Motore');
    }
    this.controlloLlm = null;

    // Orologi: il narratore propone, il Motore controlla (al massimo un segno per risposta).
    // In modalità repertorio i segni sono battute: la riga [orologio] non vale.
    let avanzato = segnoInRisposta.mostrato;
    const esitiOrologi: Array<{ id: string; ok: boolean; motivo?: string; stato?: string }> = [];
    for (const id of this.statoRepertorio ? [] : esito.orologi) {
      const a = this.orologi.avanza(id, turno, avanzato);
      esitiOrologi.push(a.ok ? { id, ok: true, stato: `${a.orologio.pieni}/${a.orologio.segmenti}` } : { id, ok: false, motivo: a.motivo });
      if (a.ok) {
        avanzato = true;
        log.info({ orologio: id, pieni: a.orologio.pieni, segmenti: a.orologio.segmenti }, 'orologio: avanzato');
      } else {
        log.error({ orologio: id, motivo: a.motivo }, 'orologio: avanzamento rifiutato');
      }
    }

    if (esito.esito) {
      // Testo grezzo del narratore: serve a rivedere qualità e protocollo dopo la sessione.
      log.info({ testo: esito.esito.testo, stop_reason: esito.esito.stopReason }, 'narratore: testo del turno');
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

    if (this.statoRepertorio && esito.orologi.length) log.warn({ orologi: esito.orologi }, 'repertorio: riga [orologio] ignorata (i segni sono battute)');
    const record = misuratore.record();
    const conteggi = {
      modo: this.o.modo,
      righe_prescritte: esito.righe_prescritte,
      righe_improvvisate: esito.righe_improvvisate,
      usa_rifiutati: esito.usa_rifiutati,
      azioni_pubbliche: pubbliche.size,
      azioni_senza_risposta: senzaRisposta.length,
      riparazioni,
      segno_aggiunto: segnoAggiunto,
      finale,
    };
    this.o.registroTurni.scrivi({ ...record, ...conteggi, sessione: this.sessione });
    this.o.registroNarrazioni.scrivi({
      sessione: this.sessione,
      turno,
      tipo: 'turno',
      chiusura,
      ...conteggi,
      uscita: esito.uscita,
      ...(this.statoRepertorio ? { stato_repertorio: this.statoRepertorio.riepilogo() } : {}),
      voce: record.voce_motore,
      azioni,
      pg_presenti: this.pgAlTavolo(),
      ...(noteRegia.length ? { note_regia: noteRegia } : {}),
      testo: esito.esito?.testo ?? null,
      errore: esito.errore,
      invito: esito.invito,
      orologi: esitiOrologi,
      stato_orologi: this.orologi.riepilogo(),
      anomalie: esito.anomalie,
      misure: record,
    });
    this.uscita?.metriche(record);
    log.info(record, 'turno: misure');
    this.misuratore = null;
    this.primoAudioInviato.delete(turno);
    this.versioneScena += 1;
    this.fineNarrazione(esito.invito ?? 'tutti');
  }

  /**
   * Fatti scoperti e catalogo B2 del turno: solo battute pertinenti alle azioni a cui possono
   * rispondere (le pubbliche; le private solo per le battute con `richiede.privata`, e `da_pg` solo
   * per quei PG), il segno se è dovuto, le battute per stato dell'orologio, i riempitivi allo stallo.
   */
  private elencoRepertorio(r: RiepilogoChiusura): { fattiScoperti: string[]; battuteDisponibili: string; stallo: boolean; menzogne: string[] } {
    const s = this.statoRepertorio!;
    // Stallo: 45 s senza input, o una finestra chiusa senza nessuna azione (tutti hanno passato).
    const stallo = r.motivo === 'stallo' || r.azioni.length === 0;
    const segnoDovuto = this.orologi.elenco.some((o) => this.orologi.dovuto(o, r.turno));
    const azioni = r.azioni.map((a) => ({ autore: a.autore, testo: a.testo, privata: a.privata }));
    const { battute, trattenute, perche } = s.catalogo({ turno: r.turno, azioni, stallo, segnoDovuto, nomiPng: this.nomiPng, parole: this.o.paroleSegrete ?? [] });
    this.elencoTurno = new Set(battute.map((b) => b.id));
    this.turnoB = { azioni: new Map(r.azioni.map((a) => [a.autore, { id: a.id, privata: a.privata }])), stallo, segnoDovuto };
    this.o.log.info({ turno: r.turno, catalogo: battute.length, perche, trattenute, stallo, segnoDovuto }, 'repertorio: catalogo del turno');
    return {
      fattiScoperti: s.fattiScoperti.map((id) => `${id} — ${this.testoFatto(id)}`),
      battuteDisponibili: s.elencoDisponibili(battute),
      stallo,
      menzogne: righeMenzogneDette(s.menzogneDette, this.campagna, this.o.paroleSegrete ?? [], this.statoPubblico()),
    };
  }

  /**
   * Fa uscire la battuta del segno dovuto e la mette PRIMA dell'invito finale, se l'ultima riga
   * improvvisata è un invito (una domanda) e la sua voce non è ancora partita; altrimenti in fondo.
   * Restituisce la battuta usata e quante righe ha, o null se non c'è un segno disponibile.
   */
  private aggiungiSegnoDovuto(
    turno: number,
    esito: { uscita: VoceUscita[] },
    segno: { mostrato: boolean },
    log: Logger,
    /** Quale battuta del catalogo far uscire (predefinito: il segno d'orologio). */
    scegli: (b: Battuta) => boolean = (b) => b.tipo === 'segno_orologio',
  ): { id: string; righe: number } | null {
    const s = this.statoRepertorio!;
    const b = s.disponibili(turno).find((x) => scegli(x) && this.elencoTurno.has(x.id));
    if (!b) {
      log.warn({ turno }, 'orologio: segno dovuto ma nessuna battuta di segno disponibile');
      return null;
    }
    return this.aggiungiBattutaMotore(turno, esito, segno, log, b, false);
  }

  /**
   * Il finale del Motore: se in questa risposta il selettore ha già usato un finale, oppure un
   * orologio della scena è completo e c'è un finale disponibile (StatoRepertorio.finaleDelMotore),
   * lo fa dire, poi la chiusura se c'è; l'invito del narratore, se non è ancora partito, si ritira.
   * A narrazione finita il tavolo va in pausa (fineNarrazione). null = nessun finale in questo turno.
   */
  private finaleDelMotore(turno: number, esito: { uscita: VoceUscita[] }, segno: { mostrato: boolean }, log: Logger): { finale: string; righe: number } | null {
    const s = this.statoRepertorio!;
    const completi = this.orologi.elenco.filter((o) => o.pieni >= o.segmenti);
    const giàDetto = esito.uscita.find((u) => u.tipo === 'usa' && s.repertorio.perId.get(u.id)?.tipo === 'finale');
    let righe = 0;
    let id: string;
    if (giàDetto && giàDetto.tipo === 'usa') {
      id = giàDetto.id;
      log.info({ turno, finale: id }, 'finale: scelto dal selettore');
    } else {
      if (completi.length === 0) return null;
      const { scelto, candidati, scartati } = s.finaleDelMotore(turno);
      if (!scelto) {
        log.info({ turno, orologi: completi.map((o) => o.id), scartati }, 'finale: orologio completo ma nessun finale disponibile');
        return null;
      }
      this.ritiraInvito(turno, esito, log);
      const detto = this.aggiungiBattutaMotore(turno, esito, segno, log, scelto, true);
      if (!detto) return null;
      id = scelto.id;
      righe += detto.righe;
      log.info({ turno, finale: id, orologi: completi.map((o) => `${o.id} ${o.pieni}/${o.segmenti}`), candidati, scartati }, 'finale: il Motore chiude la scena (il primo finale disponibile nell\'ordine del repertorio)');
    }
    const chiusura = s.chiusuraDelMotore(turno, completi);
    if (chiusura) {
      this.ritiraInvito(turno, esito, log);
      const detta = this.aggiungiBattutaMotore(turno, esito, segno, log, chiusura, true);
      if (detta) {
        righe += detta.righe;
        log.info({ turno, chiusura: chiusura.id }, 'finale: chiusura detta dal Motore');
      }
    }
    this.scenaFinitaAlTurno = turno;
    return { finale: id, righe };
  }

  /** L'invito finale del narratore («cosa fate?»), se non è ancora partito, si toglie da voce e trascrizione. */
  private ritiraInvito(turno: number, esito: { uscita: VoceUscita[] }, log: Logger): void {
    const ultima = esito.uscita.at(-1);
    if (ultima?.tipo !== 'improvvisata' || ultima.etichetta !== ID_NARRATORE || !ultima.testo.includes('?') || !ultima.frasi?.length) return;
    if (!this.pipeline.ritira(ultima.frasi)) return;
    const voce = ultima.segmento !== undefined ? this.segmentiAperti.get(`${turno}:${ultima.segmento}`) : undefined;
    if (voce) this.trascrizione.splice(this.trascrizione.indexOf(voce), 1);
    esito.uscita.pop();
    log.info({ turno, invito: ultima.testo }, 'finale: invito del narratore ritirato');
  }

  /**
   * Fa dire una battuta scelta dal Motore (segno dovuto, finale, chiusura). `inFondo`: dopo tutto il
   * resto del turno; altrimenti PRIMA dell'invito finale del narratore, se l'ultima riga improvvisata
   * è una domanda e la sua voce non è ancora partita.
   */
  private aggiungiBattutaMotore(turno: number, esito: { uscita: VoceUscita[] }, segno: { mostrato: boolean }, log: Logger, b: Battuta, inFondo: boolean): { id: string; righe: number } | null {
    const uso = this.usaBattuta(b.id, null, turno, segno, true);
    if (!uso.ok) {
      log.error({ turno, battuta: b.id, motivo: uso.motivo }, 'repertorio: battuta del Motore non applicabile');
      return null;
    }
    const ultima = esito.uscita.at(-1);
    const invito = !inFondo && ultima?.tipo === 'improvvisata' && ultima.etichetta === ID_NARRATORE && ultima.testo.includes('?') ? ultima : null;
    // Voce: prima della prima frase dell'invito, se è ancora in coda.
    const frasi = uso.righe.map((r, k) => {
      const { voce_id, nome } = voceDi(this.campagna, r.etichetta);
      return { id_frase: `t${turno}-m${k}`, turno, indice: 900 + k, parlante: r.etichetta, nome, voce_id, testo: r.testo, testo_voce: r.testo_voce, chiave_cache: r.chiave_cache };
    });
    const primaDellInvito = this.pipeline.accodaPrima(frasi, invito?.frasi?.[0] ?? '');
    // Trascrizione: le righe del segno prima della voce dell'invito.
    const nuove = uso.righe.map((r) =>
      this.aggiungiTrascrizione({ turno, tipo: r.etichetta === ID_NARRATORE ? 'narrazione' : 'battuta', chi: r.etichetta, nome: voceDi(this.campagna, r.etichetta).nome, testo: r.testo }),
    );
    const vocInvito = invito?.segmento !== undefined ? this.segmentiAperti.get(`${turno}:${invito.segmento}`) : undefined;
    if (vocInvito) {
      this.trascrizione.splice(this.trascrizione.length - nuove.length, nuove.length);
      this.trascrizione.splice(this.trascrizione.indexOf(vocInvito), 0, ...nuove);
    }
    // Uscita del turno: la battuta, marcata come aggiunta dal Motore, prima dell'invito.
    const voce: VoceUscita = { tipo: 'usa', id: b.id, per: null, versione: uso.versione, righe: uso.righe.map((r) => ({ etichetta: r.etichetta, testo: r.testo })), motore: true };
    if (invito) esito.uscita.splice(esito.uscita.length - 1, 0, voce);
    else esito.uscita.push(voce);
    log.info({ turno, battuta: b.id, tipo: b.tipo, prima_dell_invito: !!invito && primaDellInvito }, 'repertorio: battuta aggiunta dal Motore');
    this.notifica();
    return { id: b.id, righe: uso.righe.length };
  }

  /**
   * Azioni pubbliche rimaste senza risposta: nessuna battuta `> pg` e nessuna riga improvvisata
   * che nomina quel PG (per nome, nome breve o soprannome).
   */
  private azioniSenzaRisposta(uscita: VoceUscita[], pubbliche: Map<string, string>): string[] {
    const risposte = new Set<string>();
    const testoImprovvisato = normalizza(uscita.filter((u) => u.tipo === 'improvvisata').map((u) => (u.tipo === 'improvvisata' ? u.testo : '')).join('\n'));
    for (const u of uscita) if (u.tipo === 'usa' && u.per) risposte.add(u.per);
    for (const id of pubbliche.keys()) {
      if (risposte.has(id)) continue;
      const nome = this.nomePg(id);
      const varianti = [nome, nomeBreve(nome), ...Object.entries(this.campagna.alias).filter(([, v]) => v === id).map(([k]) => k)];
      if (varianti.some((v) => v.length > 2 && new RegExp(`(?<![\\p{L}])${normalizza(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u').test(testoImprovvisato))) risposte.add(id);
    }
    return [...pubbliche.keys()].filter((id) => !risposte.has(id));
  }

  /** Testo di un fatto del canone (per i fatti scoperti). */
  private testoFatto(id: string): string {
    const canone = (this.campagna.campagnaNarratore['canone'] as Array<Record<string, unknown>> | undefined) ?? [];
    const f = canone.find((x) => x?.['id'] === id);
    return typeof f?.['testo'] === 'string' ? f['testo'] : id;
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
    const mossa = this.campagna.scena.dati['mossa_morbida_pronta'];
    const testo = typeof mossa === 'string' && mossa.trim() ? mossa.trim() : 'Il fuoco crepita. Per un momento, nessuno parla.';
    this.trascriviFrase(turno, ID_NARRATORE, NOME_NARRATORE, testo, 999);
    this.pipeline.accoda({
      id_frase: `t${turno}-riserva`,
      turno,
      indice: 0,
      parlante: ID_NARRATORE,
      nome: NOME_NARRATORE,
      voce_id: ID_NARRATORE,
      testo,
      testo_voce: this.pronuncia(testo),
    });
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
