/**
 * Regia della scena (F0): l'unico «scrittore» dello stato del tavolo e del ciclo dei turni.
 *
 *   attesa ──(schermo: Inizia sessione)──▶ apertura ──(audio finito)──▶ finestra
 *   finestra ──(hanno inviato tutti + assestamento | scadenza concitata | Risolvi ora)──▶ narrazione
 *   narrazione ──(LLM finito + voce finita + audio suonato)──▶ finestra (turno+1)
 *   apertura | narrazione ──(sorvegliante: nessun segno di vita)──▶ finestra (turno+1)
 *   qualsiasi ──(ferma)──▶ fermata ──(ricomincia)──▶ apertura
 *
 * Ritmo (docs/f0-contratti.md, «Turno»): calmo = nessuna scadenza, si aspetta che inviino tutti;
 * concitato = conto alla rovescia dall'apertura della finestra. Lo chiede il narratore con
 * `[ritmo]` o la scena (`ritmo` nei dati); si torna a calmo col narratore o cambiando scena.
 * Nessuna pausa automatica: la pausa la mette e la toglie solo il master.
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
// Frasi fisse nella lingua dei contenuti (lingue/<codice>/testi-motore.yaml, sezione `regia`). Alias perché
// `testo` qui è spesso un parametro o un campo (il testo di un'azione, di una frase).
import { LINGUA_PREDEFINITA, linguaAttiva, testo as testoFisso, type Lingua } from '../lingua';
import type {
  AzionePrivata,
  Esito,
  EsitoPrivato,
  FaseScena,
  MisureTurno,
  PersonaggioScena,
  SchermoAudioFinito,
  SchedaPg,
  SchermoAudioIniziato,
  StatoTavolo,
  VoceTrascrizione,
} from '@cantastorie/shared';
import { schedaPg } from '../campagna/scheda';
import type { Campagna, ScenaCaricata } from '../campagna/tipi';
import { ID_NARRATORE, NOME_NARRATORE, conScena } from '../campagna/tipi';
import { nomeBreve } from '../campagna/nomi';
import { fuoriDallaFinzione } from '../narrazione/finzione';
import { MOTIVO_FINE_SESSIONE } from '../sessione/archivio';
import type { MemoriaSessione } from '../sessione/memoria';
import type { FotografiaSessione, StatoRicostruito, StatoTavoloSalvato } from '../sessione/tipi';
import type { RiassuntoSerata, SerataMaster } from '@cantastorie/shared';
import { collegaSituazioni, type SituazioneCollegata } from '../campagna/situazioni';
import type { Logger } from '../logger';
import type { Narratore } from '../llm/tipi';
import { MisuratoreTurno } from '../metriche/misure';
import type { RegistroJsonl } from '../metriche/jsonl';
import { compilaMessaggioTurno, type DatiMessaggioTurno } from '../narrazione/messaggio';
import type { Orologio } from '../turni/orologio';
import { azioniPerNarratore } from '../azioni/narratore';
import type { CatalogoImmagini } from '../campagna/immagini';
import type { CatalogoAudio } from '../audio/catalogo';
import { audioDellaScena, type UmoreScelto } from '../audio/scena';
import { LimiteUmori, risolviEffetto, risolviUmore, type CueAudio } from '../audio/cue';
import { TavoloAzioni, type RiepilogoChiusura } from '../azioni/tavolo';
import type { Arbitro, Azione } from '../azioni/tipi';
import { narraTurno, type EsitoUsaTurno, type VoceUscita } from '../turni/narrazione';
import { messaggioChiusura, messaggioRiparazione } from '../narrazione/messaggio';
import { segretiNascosti, type EsitoGuardiaSegreti } from '../narrazione/guardia-segreti';
import { CanaleSceneggiatore } from '../sceneggiatore/canale';
import type { RichiestaSceneggiatore, RispostaSceneggiatore } from '../sceneggiatore/protocollo';
import { validaBattute } from '../sceneggiatore/valida';
import { giaUsati, ticBloccati } from '../sceneggiatore/ripetizioni';

/** Oltre questo tempo la battuta chiesta «subito» allo sceneggiatore non si dice più (resta nel repertorio). */
export const TETTO_SCENEGGIATORE_MS = 90_000;
import { SerataGuidata } from './serata';
import { climaxInCorso } from '../sessione/durata';
import { normalizza } from '../azioni/regole';
import { nomiDeiPng, pngNominati, temaPresente } from '../repertorio/pertinenza';
import { personaggiScena, pngIncontrati, presenzaEffettiva, presenzeMaster } from './presenze';
import { sommaCosti } from '../llm/costi';
import type { Battuta, Repertorio } from '../repertorio/tipi';
import { StatoRepertorio } from '../repertorio/stato';
import { righeMenzogneDette } from '../repertorio/menzogne';
import { segretiNelTesto, type ParolaSegreta, type StatoPubblico } from '../repertorio/segreti';
import { CacheAudio, chiaveAudio, testoPerVoce } from '../voce/cache-audio';
import { voceDi } from '../turni/narrazione';
import { PipelineVoce, type UscitaAudio } from '../voce/pipeline';
import { direzionePredefinita } from '../voce/espressione';
import { creaPronunciatore, type Pronunciatore } from '../voce/pronuncia';
import type { SelettoreVoce } from '../voce/selettore';
import { StatoOrologi, type EsitoAvanzamento, type Orologio as OrologioMinaccia } from './orologi';
import { NoteRegia } from '../master/note';
import { conBattitoAudio, Sorvegliante, type BloccoSorvegliato } from './sorvegliante';
import { sezioneRitmo } from '../narrazione/ritmo';
import type { Ritmo } from '../azioni/tipi';
import { sezioneNoteRegia } from '../narrazione/messaggio';
import { MotoreProve, type AzionePerProve } from '../prove/motore';
import type { ArbitroProve, DecisioneProva, DecisioneRegole, EsitoTurnoProve } from '../prove/tipi';
import type { RegoleCampagna, SchedaGenerica } from '../regole/tipi';
import type { CombattimentoMaster } from '@cantastorie/shared';
import type { FonteDadi } from '../prove/dadi';
import { regolaEsiti, titoloEsiti } from '../prove/testi';
import { guardiaPrivate } from '../narrazione/privato';
import type { SchedaNumerica } from '../campagna/schede';

/** Gli orologi già avanzati in una risposta (un segno per orologio, al massimo due: StatoOrologi.avanza). */
interface SegniInRisposta {
  orologi: Set<string>;
}

/** Il segno è quello di un orologio dovuto in questo turno (un segno senza orologio: basta un dovuto). */
function segnoDovutoDi(b: Battuta, dovuti: ReadonlySet<string> | undefined): boolean {
  if (!dovuti?.size) return false;
  return b.effetti.avanza_orologio ? dovuti.has(b.effetti.avanza_orologio) : true;
}

export interface OpzioniRegia {
  campagna: Campagna;
  /** Lingue della partita (docs/lingue.md); assente = la configurazione e i contenuti nella lingua attiva. */
  lingue?: { interfaccia: Lingua; contenuti: Lingua };
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
  /** Attesa dopo che hanno inviato tutti gli invitati, prima di chiudere (default 2,5 s). */
  assestamentoMs?: number;
  /** Ritmo concitato: durata della finestra dall'apertura (default 25 s). */
  concitatoMs?: number;
  /** Sorvegliante: silenzio massimo di LLM/voce/audio prima di riprendere il gioco (default 60 s; 0 = spento). */
  sorveglianteMs?: number;
  margineFineAudioMs: number;
  trascrizioneMax: number;
  preriscalda: boolean;
  /** A = 'improvvisa' (F0), B = 'repertorio' (battute pre-scritte scelte da Haiku). */
  modo: 'improvvisa' | 'repertorio';
  /** Modalità repertorio: battute, parole segrete (controllo dei contesti), audio pre-generato. */
  repertorio?: Repertorio;
  paroleSegrete?: ParolaSegreta[];
  /**
   * Lettore minimo (llm/minimo.ts): nel messaggio anche le battute d'attesa (riempitivi), per le azioni
   * a cui nessuna battuta del catalogo risponde. Il selettore completo non le riceve.
   */
  attesaNelCatalogo?: boolean;
  /** «La volta scorsa»: un narratore a parte (il lettore minimo non scrive prosa); null = riserva dai segni. */
  narratoreRiassunto?: Narratore | null;
  /**
   * Lo sceneggiatore (docs/sceneggiatore.md): la cartella sorvegliata dove chiedere battute a Claude Code
   * mentre si gioca, e il tetto oltre cui la battuta scritta su richiesta non si dice più. null = spento.
   */
  sceneggiatore?: { radice: string; tettoMs?: number } | null;
  /** Le battute delle «prossime» appena entrate nel repertorio: la loro voce va in cache in sottofondo (drama-3). */
  preGeneraAudio?: ((battute: readonly Battuta[]) => unknown) | null;
  cacheAudio?: CacheAudio;
  /** Esperimenti: la finestra si apre sempre per tutti i PG al tavolo (l'invito resta nel log). */
  finestraATutti?: boolean;
  /** Arbitro delle azioni simultanee (null = solo regole). */
  arbitro?: Arbitro | null;
  /**
   * Prove e dadi (docs/prove.md): schede numeriche, arbitro delle prove, se i dadi sono attivi
   * (schede presenti e niente `regole.dadi: false`), seme fisso o dadi finti per i test.
   * Assente = come prima: nessun tiro, il narratore risolve con «sì, ma».
   */
  prove?: {
    schede: ReadonlyMap<string, SchedaNumerica>;
    arbitro: ArbitroProve<DecisioneProva> | ArbitroProve<DecisioneRegole> | null;
    attivo: boolean;
    /** Set di regole non SRD con le sue schede (docs/regole.md); assente = SRD 5.2. */
    regole?: { regole: RegoleCampagna; schede: ReadonlyMap<string, SchedaGenerica> };
    seme?: string;
    dadi?: FonteDadi;
    attesaMaxMs?: number;
  };
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

/*
 * Le frasi fisse della regia stanno nel pacchetto della lingua (sezione `regia`), chieste quando servono:
 * - `regia.motivi.*`: perché un'azione torna al giocatore (saltata dal master, narrazione interrotta,
 *   cambio di scena, blocco del narratore, serata chiusa, ripresa dopo un arresto);
 * - `regia.righe.*`: righe di sistema della trascrizione (fine scena col finale: il tavolo NON va in
 *   pausa, il master sceglie come andare avanti; blocco; fine sessione; serata chiusa…);
 * - `regia.narratore.riserva_blocco`: riserva del narratore dopo un blocco (solo testo: la voce
 *   potrebbe essere proprio ciò che si è bloccato);
 * - `regia.errori.*`: rifiuti dei comandi (pannello, telefoni).
 */
/** Token di un telefono (localStorage): lettere, cifre e trattini. */
const DISPOSITIVO_VALIDO = /^[A-Za-z0-9_-]{8,64}$/;

/** Ascoltatori del trasporto (Socket.IO). */
export interface UscitaRegia {
  stato(stato: StatoTavolo): void;
  azioneMia(id_pg: string, azione: AzionePrivata | null): void;
  metriche(misure: MisureTurno): void;
  avviso(livello: 'info' | 'errore', testo: string): void;
  /** Al telefono di quel PG: tutti i suoi esiti privati (`[privato pg_x]`), mai al proiettore. */
  privati?(id_pg: string, esiti: EsitoPrivato[]): void;
}

interface AttesaAudio {
  turno: number;
  risolvi: (fine: number | null) => void;
  timer: (() => void) | null;
}

export { nomeBreve };

/** Ritmo dichiarato dalla scena (`ritmo: concitato` in scena.yaml); assente o altro = calmo. */
export function ritmoDellaScena(c: Campagna): Ritmo {
  return c.scena.dati['ritmo'] === 'concitato' ? 'concitato' : 'calmo';
}

export class Regia {
  private readonly o: OpzioniRegia;
  private readonly pipeline: PipelineVoce;
  private readonly pronuncia: Pronunciatore;
  private orologi: StatoOrologi;
  /** Stato del repertorio (solo in modalità repertorio). */
  private statoRepertorio: StatoRepertorio | null = null;
  /** Battute mostrate al selettore in questo turno: un [usa] fuori elenco si rifiuta. */
  private elencoTurno = new Set<string>();
  /** Scene già visitate in questa sessione: tornandoci il narratore legge il rientro, non l'apertura. */
  private readonly sceneVisitate = new Set<string>();
  /**
   * Scene che hanno già avuto il loro finale: un finale per scena. Dopo il finale il tavolo riapre la
   * finestra (decide il master) e l'orologio resta completo: senza questa guardia ogni turno ne diceva
   * un altro (log del 3 novembre: sei finali di fila a o_colpevole 6/6).
   */
  private readonly sceneConFinale = new Set<string>();
  /**
   * Battute dette SOLO a un'azione privata, e indizi rivelati solo da loro: il PG le ha sentite, il tavolo
   * no. La guardia dei segreti non le conta come «pubblica_dopo» (narrazione/guardia-segreti.ts).
   */
  private readonly battutePrivate = new Set<string>();
  private readonly indiziPrivati = new Set<string>();
  /** Quante volte ogni PNG ha già detto la sua deviazione (si alternano testo e varianti). */
  private readonly deviazioniDette = new Map<string, number>();
  /** Lo sceneggiatore (sceneggiatore/canale.ts), se acceso. */
  private readonly sceneggiatore: CanaleSceneggiatore | null;
  /** Battute chieste «subito» per un'azione rimasta senza risposta: id richiesta → PG, turno, se privata. */
  private readonly attesaSubito = new Map<string, { pg: string; turno: number; privata: boolean }>();
  /** Progressivo delle frasi dette dallo sceneggiatore (id delle frasi della voce). */
  private frasiSceneggiatore = 0;
  /** La serata: «La volta scorsa…», Diario, durata e chiusura guidata (scena/serata.ts). */
  private readonly serata: SerataGuidata;
  /** B2: azioni del turno per autore (chi può ricevere una battuta, e se privata), stallo, segno dovuto. */
  /** Il turno B in corso: azioni per PG, stallo, orologi il cui segno è dovuto (uno per orologio). */
  private turnoB: {
    azioni: Map<string, { id: string; privata: boolean; testo: string; prove: readonly string[] }>;
    stallo: boolean;
    dovuti: ReadonlySet<string>;
    /** Preselezione del Motore: id della battuta → PG della cui azione i temi la chiamano. */
    indicate: ReadonlyMap<string, string>;
  } | null = null;
  /** [usa] di questa risposta il cui «> pg» il Motore ha dedotto (mancava) o corretto (era sbagliato). */
  private pgDedotti = 0;
  /** Nomi dei PNG e soprannomi, per la pertinenza del catalogo. */
  private readonly nomiPng: Map<string, string[]>;
  /** Luogo corrente (id della scena o del nodo): sceglie l'immagine del proiettore. */
  private luogo: string;
  /** La campagna vista dalla scena in corso (conScena): contesto, orologi attivi, immagini. */
  private campagna: Campagna;
  /** Presenza dei PNG decisa a mano dal master (true = in scena, false = altrove). Si azzera a ogni cambio di scena. */
  private presenzeManuali = new Map<string, boolean>();
  /** PNG nascosti (scheda `nascosto: true`) che il master ha rivelato a mano. Vale per la sessione. */
  private rivelati = new Set<string>();
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
  /** Ritmo del tavolo: vale per la finestra aperta o per la prossima (calmo = nessuna scadenza). */
  private ritmo: Ritmo = 'calmo';
  /** Sorvegliante delle attese del Motore (apertura, narrazione): mai un'attesa senza fine. */
  private readonly sorvegliante: Sorvegliante;
  /** Audio: umore scelto dal master o dal Motore (vale solo nella scena in cui è stato scelto). */
  private umoreScelto: UmoreScelto | null = null;
  /** Audio: al massimo un cambio d'umore automatico al minuto per scena (anche il master conta). */
  private readonly limiteUmori = new LimiteUmori();
  /** Audio: chi registra i segnali automatici (il registro del pannello del master). */
  private suCue: ((e: { comando: 'umore' | 'effetto'; ok: boolean; dettagli: string }) => void) | null = null;
  private uscita: UscitaRegia | null = null;

  private fase: FaseScena = 'attesa';
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
    /** Archivi di prima: era la pausa presa dal Motore dopo gli stalli (non c'è più: si riparte). */
    pausaAutomatica: boolean;
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
  /**
   * Esiti delle azioni private (righe `[privato pg_x]`, battute verso un'azione privata): solo ai
   * telefoni di quel PG, nel registro e nel contesto del narratore; mai nella trascrizione pubblica.
   */
  private privati: EsitoPrivato[] = [];
  private privatiSalvati = new Map<number, string>();
  /** Riga privata aperta per turno:segmento (le frasi della stessa riga si uniscono). */
  private privatiAperti = new Map<string, EsitoPrivato>();
  private prossimoIdTrascrizione = 1;
  /** Voce di trascrizione aperta per segmento del turno corrente (per unire le frasi). */
  private segmentiAperti = new Map<string, VoceTrascrizione>();

  /** Azioni dei giocatori e finestra (docs/azioni-concorrenti.md). */
  private readonly tavolo: TavoloAzioni;
  /** Prove e dadi del Motore (null = campagna senza schede o regia di prova senza dadi). */
  private readonly prove: MotoreProve | null;
  /** Prove riuscite per azione nel turno che si sta narrando (cancello `richiede.prova` del repertorio). */
  private riuscitePerAzione = new Map<string, readonly string[]>();
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
    this.ritmo = ritmoDellaScena(this.campagna);
    this.sorvegliante = new Sorvegliante({
      orologio: opzioni.orologio,
      log: opzioni.log.child({ modulo: 'sorvegliante' }),
      silenzioMs: opzioni.sorveglianteMs ?? 60_000,
      onBlocco: (b) => this.riprendiDopoBlocco(b),
    });
    this.statoRepertorio = this.nuovoStatoRepertorio();
    this.pipeline = new PipelineVoce({
      motore: () => this.o.voce.attivo,
      // Ogni pezzo d'audio che esce è un segno di vita per il sorvegliante (una frase lunga non è un blocco).
      uscita: conBattitoAudio(opzioni.uscitaAudio, () => this.sorvegliante.batti('voce: audio in uscita')),
      log: opzioni.log.child({ modulo: 'voce' }),
      ...(opzioni.cacheAudio ? { cache: opzioni.cacheAudio } : {}),
      // Voce espressiva (drama-3): direzione di chi parla dalla scheda o dalla carta di stile; costo a fine turno.
      direzione: (parlante) => direzionePredefinita(this.campagna, parlante),
      registraCosto: (riga) => this.o.registroCosti.scrivi({ ...riga }),
      osservatore: {
        richiesta: (f) => {
          this.sorvegliante.batti(`voce: richiesta ${f.id_frase}`);
          if (f.turno === this.misuratore?.turno) this.misuratore.segna('voce_richiesta', this.o.orologio.ora());
          // Segnale audio legato a questa frase: parte adesso, con lei (l'effetto lo suona lo schermo).
          if (f.cue) this.applicaCue(f.cue);
        },
        primoAudio: (f) => {
          this.sorvegliante.batti(`voce: primo audio ${f.id_frase}`);
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
      ...(opzioni.assestamentoMs !== undefined ? { assestamentoMs: opzioni.assestamentoMs } : {}),
      ...(opzioni.concitatoMs !== undefined ? { concitatoMs: opzioni.concitatoMs } : {}),
      onCambio: () => {
        // Server in spegnimento: niente notifiche né salvataggi (l'archivio può essere già chiuso,
        // e i telefoni che cadono adesso toglierebbero invitati da una finestra che non c'è più).
        if (this.spento) return;
        this.notifica();
        this.programmaSalvataggioTavolo();
      },
      onAzione: (id_pg, a) => this.uscita?.azioneMia(id_pg, this.conTiri(a)),
      onChiusura: (r) => void this.finestraChiusa(r).catch((err: unknown) => this.dopoEccezione(this.epoca, r.turno, 'narrazione', err)),
    });
    // Prove e dadi: il Motore tira, l'arbitro decide solo che cosa si tira (docs/prove.md).
    const po = opzioni.prove;
    this.prove = po
      ? new MotoreProve({
          schede: po.schede,
          arbitro: po.arbitro,
          attivo: po.attivo,
          conIndizi: opzioni.modo === 'improvvisa',
          log: opzioni.log.child({ modulo: 'prove' }),
          orologio: opzioni.orologio,
          contesto: () => ({
            campagna: this.campagna,
            scenaPubblica: this.scenaPubblica,
            narrazione: this.ultimaNarrazione(),
            versione: this.versioneScena,
            pgAlTavolo: this.pgAlTavolo(),
            nome: (id) => this.campagna.pg.find((p) => p.id === id)?.nome ?? this.campagna.png.find((p) => p.id === id)?.nome ?? id,
          }),
          ...(po.seme ? { seme: po.seme } : {}),
          ...(po.dadi ? { dadi: po.dadi } : {}),
          ...(po.attesaMaxMs !== undefined ? { attesaMaxMs: po.attesaMaxMs } : {}),
          ...(po.regole ? { regole: po.regole } : {}),
        })
      : null;
    if (this.prove) opzioni.log.info({ dadi: this.prove.attivo, seme: this.prove.attivo ? this.prove.seme : null }, 'prove: Motore delle prove pronto');
    this.sceneggiatore = opzioni.sceneggiatore
      ? new CanaleSceneggiatore({ radice: opzioni.sceneggiatore.radice, log: opzioni.log.child({ modulo: 'sceneggiatore' }), adesso: () => this.o.orologio.adesso(), onRisposta: (rq, rs) => this.dalloSceneggiatore(rq, rs) })
      : null;
    this.serata = new SerataGuidata({ campagna: opzioni.campagna, narratore: opzioni.narratoreRiassunto !== undefined ? opzioni.narratoreRiassunto : opzioni.narratore, log: opzioni.log, parole: () => this.o.paroleSegrete ?? [], pubblico: () => this.statoPubblico() });
    if (!opzioni.ripresa) this.serata.preparaPerPacchetto();
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
      pausa: { richiesta: this.pausaRichiesta, invitoSospeso: this.invitoSospeso },
      ritmo: this.ritmo,
      prossimoIdTrascrizione: this.prossimoIdTrascrizione,
      sceneVisitate: [...this.sceneVisitate],
      sceneConFinale: [...this.sceneConFinale],
      serata: this.serata.esporta(),
      segretiPrivati: { battute: [...this.battutePrivate], indizi: [...this.indiziPrivati] },
      // Decisioni del master su presenze e rivelazioni: nel registro, così una ripresa le ritrova (assenti = nessuna).
      ...(this.presenzeManuali.size ? { presenzeManuali: [...this.presenzeManuali] } : {}),
      ...(this.rivelati.size ? { rivelati: [...this.rivelati] } : {}),
      ...(this.prove?.attivo ? { prove: this.prove.esporta() } : {}),
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
    // Esiti privati per turno: nel registro sotto le azioni private (sessione/registro.ts), e nella ripresa.
    const privatiPerTurno = new Map<number, EsitoPrivato[]>();
    for (const v of this.privati) privatiPerTurno.set(v.turno, [...(privatiPerTurno.get(v.turno) ?? []), v]);
    for (const [turno, esiti] of privatiPerTurno) {
      const testo = JSON.stringify(esiti);
      if (this.privatiSalvati.get(turno) === testo) continue;
      this.privatiSalvati.set(turno, testo);
      eventi.push({ tipo: 'privati_turno', dati: { turno, esiti } });
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
      this.salvaTavoloOra();
    });
  }

  /**
   * Scrive subito il tavolo nel registro, se è cambiato. Serve nei punti stabili: alla chiusura della
   * finestra (che ora scatta da un timer, l'assestamento) le azioni «chiuse» devono essere nel
   * registro prima che la narrazione cominci, se no un riavvio a metà le perderebbe.
   */
  private salvaTavoloOra(): void {
    if (this.spento || !this.o.memoria?.info()) return;
    const tavolo = JSON.stringify(this.tavolo.esporta());
    if (tavolo === this.tavoloSalvato) return;
    this.tavoloSalvato = tavolo;
    this.o.memoria.scrivi([{ tipo: 'tavolo', dati: JSON.parse(tavolo) }], null);
  }

  /**
   * All'avvio del server: lo stato torna quello della sessione salvata. Il gioco non riparte da solo:
   * aspetta il proiettore («Inizia sessione»), e allora riprende senza rileggere l'apertura.
   */
  private ripristina(r: StatoRicostruito): void {
    const f = r.fotografia;
    this.sessione = r.sessione;
    if (this.o.campagna.scene.some((s) => s.id === f.scena)) this.impostaScena(f.scena);
    // Dopo impostaScena (che azzera le presenze a mano): le decisioni del master di questa scena tornano.
    for (const [id, presente] of f.presenzeManuali ?? []) this.presenzeManuali.set(id, presente);
    for (const id of f.rivelati ?? []) this.rivelati.add(id);
    this.luogo = f.luogo || this.campagna.scena.id;
    this.orologi.importa(f.orologi);
    if (this.prove?.attivo && f.prove) this.prove.importa(f.prove);
    if (this.statoRepertorio && f.repertorio) this.statoRepertorio.importa(f.repertorio);
    this.note.importa(f.note);
    this.umoreScelto = f.umore ? { ...f.umore } : null;
    this.situazione = f.situazione ? { ...f.situazione } : null;
    for (const id of f.situazioniMostrate ?? []) this.situazioniMostrate.add(id);
    // Archivi di prima: almeno la scena in corso è già stata visitata.
    for (const id of f.sceneVisitate ?? [f.scena]) this.sceneVisitate.add(id);
    for (const id of f.sceneConFinale ?? []) this.sceneConFinale.add(id);
    for (const id of f.segretiPrivati?.battute ?? []) this.battutePrivate.add(id);
    for (const id of f.segretiPrivati?.indizi ?? []) this.indiziPrivati.add(id);
    this.serata.preparaPerRipresa(f.serata, r.trascrizione, r.ultimoEvento, this.o.orologio.adesso(), this.titoliScene(f.sceneVisitate ?? [f.scena]), this.segniMostrati());
    this.trascrizione = r.trascrizione.map((v) => ({ ...v }));
    this.privati = (r.privati ?? []).map((v) => ({ ...v }));
    this.prossimoIdTrascrizione = Math.max(f.prossimoIdTrascrizione ?? 1, ...this.trascrizione.map((v) => v.id + 1));
    // I turni ripresi sono già nel registro così come sono: non si riscrivono.
    const perTurno = new Map<number, VoceTrascrizione[]>();
    for (const v of this.trascrizione) perTurno.set(v.turno, [...(perTurno.get(v.turno) ?? []), v]);
    for (const [t, voci] of perTurno) this.turniSalvati.set(t, JSON.stringify(voci));
    this.turno = f.turno;
    this.versioneScena = f.versioneScena;
    this.invitoSospeso = f.pausa?.invitoSospeso ?? null;
    // La pausa «automatica» degli archivi di prima non esiste più: torna una finestra normale.
    if (f.pausa?.automatica === true && f.fase === 'pausa') this.o.log.info({ turno: f.turno }, 'sessione: la pausa automatica salvata non vale più, si riparte');
    this.ritmo = f.ritmo === 'concitato' ? 'concitato' : 'calmo';
    for (const [d, pg] of r.dispositivi) this.dispositivi.set(d, pg);
    const tavolo = r.tavolo ? this.tavolo.importa(r.tavolo, testoFisso('regia.motivi.ripresa')) : { finestra: null, interrotte: [] };
    this.daRiprendere = { fase: f.fase, pausaAutomatica: f.pausa?.automatica === true, finestra: tavolo.finestra, interrotte: tavolo.interrotte, turno: f.turno, quando: r.ultimoEvento };
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
    this.rigaDiSistema(this.turno, testoFisso('regia.righe.ripresa'));
    // Un'altra serata (chiusa con «Chiudi la sessione», o lasciata aperta per ore): comincia con
    // «La volta scorsa…», poi la finestra per tutti; le azioni rimaste in coda tornano ai giocatori.
    const eraChiusa = this.serata.serataChiusa;
    const recap = this.serata.prendiLaVoltaScorsa();
    this.serata.riparte(this.o.orologio.adesso());
    if (eraChiusa || recap.length) {
      this.cominciaNuovaSerata(recap, eraChiusa ? 'ripresa dopo una serata chiusa' : 'ripresa di un’altra sera');
      return;
    }
    if (d.fase === 'fermata') {
      this.fase = 'fermata';
    } else if (d.fase === 'pausa' && !d.pausaAutomatica) {
      this.fase = 'pausa';
      if (d.finestra?.aperta) this.tavolo.riapri(d.finestra, this.versioneScena, true);
    } else if (d.fase === 'pausa') {
      // Archivi di prima: la pausa presa dal Motore dopo gli stalli non esiste più, si riparte.
      if (d.finestra?.aperta) {
        this.fase = 'finestra';
        this.tavolo.riapri(d.finestra, this.versioneScena, false);
      } else {
        const invito = this.invitoSospeso ?? 'tutti';
        this.invitoSospeso = null;
        this.apriFinestra(invito);
      }
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
    if (!info) return { ok: false, errore: testoFisso('regia.errori.nessuna_sessione') };
    if (this.fase !== 'attesa' && this.fase !== 'fermata') this.interrompiTutto('fine sessione');
    this.daRiprendere = null;
    if (this.fase !== 'attesa') this.fase = 'fermata';
    this.rigaDiSistema(this.turno, testoFisso('regia.righe.fine_sessione'));
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
    if (!this.dispositivi.has(dispositivo)) return { ok: false, errore: testoFisso('regia.errori.telefono_sconosciuto') };
    if (id_pg !== null && !this.campagna.pg.some((p) => p.id === id_pg)) return { ok: false, errore: testoFisso('regia.errori.personaggio_sconosciuto') };
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
    if (tag !== null && !this.o.audio?.umore(tag)) return { ok: false, errore: testoFisso('regia.errori.umore_senza_brano', { umore: tag }) };
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
      this.suCue?.({ comando: 'effetto', ok: true, dettagli: testoFisso('regia.audio.effetto', { origine: cue.origine, effetto: cue.effetto }) });
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
      this.suCue?.({ comando: 'umore', ok: false, dettagli: testoFisso('regia.audio.umore_ignorato', { origine, umore: nome, secondi: Math.ceil(attesa / 1000) }) });
      this.notifica();
      return true;
    }
    this.suCue?.({ comando: 'umore', ok: true, dettagli: testoFisso('regia.audio.umore', { origine, da: prima ?? 'auto', a: nome }) });
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
    const origine = testoFisso('regia.audio.origine_battuta', { id: b.id });
    const cue: CueAudio = { origine };
    if (b.audio.umore) {
      const r = risolviUmore(b.audio.umore, this.o.audio);
      if (r.ok) cue.umore = r.valore;
      else this.suCue?.({ comando: 'umore', ok: false, dettagli: testoFisso('regia.audio.rifiutato', { origine, motivo: r.motivo }) });
    }
    if (b.audio.effetto) {
      const r = risolviEffetto(b.audio.effetto, this.o.audio);
      if (r.ok) cue.effetto = r.valore;
      else this.suCue?.({ comando: 'effetto', ok: false, dettagli: testoFisso('regia.audio.rifiutato', { origine, motivo: r.motivo }) });
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
      if (!this.situazione) return { ok: false, errore: testoFisso('regia.errori.nessuna_situazione') };
      this.togliSituazione('master');
      this.notifica();
      return { ok: true };
    }
    const s = this.situazioni.find((x) => x.id === id);
    if (!s) return { ok: false, errore: testoFisso('regia.errori.situazione_sconosciuta') };
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

  /**
   * PNG che sono nella scena in corso: solo loro parlano (le battute in catalogo e le righe improvvisate).
   * È `png_presenti` della scheda, corretta dal master a mano (`presenzeManuali`): unico punto della regia.
   */
  private pngInScena(): ReadonlySet<string> {
    return presenzaEffettiva(this.campagna.scena.png_presenti, this.presenzeManuali);
  }

  /** PNG della campagna visti dal tavolo: presenti in scena e già incontrati (vedi presenze.ts). */
  private personaggiVisti(): PersonaggioScena[] {
    const img = this.o.immagini;
    return personaggiScena({
      png: this.campagna.png,
      presenti: this.pngInScena(),
      incontrati: pngIncontrati(this.trascrizione, this.campagna.png),
      rivelati: this.rivelati,
      ritratto: (id) => img?.ritratto(id) ?? null,
    });
  }

  /** Il master mette un PNG in scena o altrove (null = torna a quanto dice la scena). */
  impostaPresenza(id_png: string, presente: boolean | null): Esito {
    if (!this.campagna.png.some((p) => p.id === id_png)) return { ok: false, errore: testoFisso('regia.errori.personaggio_sconosciuto') };
    if (presente === null) this.presenzeManuali.delete(id_png);
    else this.presenzeManuali.set(id_png, presente);
    this.o.log.info({ png: id_png, presente, scena: this.campagna.scena.id }, 'scena: presenza di un PNG decisa dal master');
    this.notifica();
    return { ok: true };
  }

  /** Il master rivela a mano un PNG nascosto: da ora si mostra al tavolo anche senza aver parlato. */
  rivela(id_png: string): Esito {
    const png = this.campagna.png.find((p) => p.id === id_png);
    if (!png) return { ok: false, errore: testoFisso('regia.errori.personaggio_sconosciuto') };
    if (png.nascosto !== true) return { ok: false, errore: testoFisso('regia.errori.png_visibile') };
    this.rivelati.add(id_png);
    this.o.log.info({ png: id_png, scena: this.campagna.scena.id }, 'scena: PNG nascosto rivelato dal master');
    this.notifica();
    return { ok: true };
  }

  /** Presenze per il pannello del master (anche i PNG mai incontrati). */
  presenzeMasterVista(): ReturnType<typeof presenzeMaster> {
    return presenzeMaster({
      png: this.campagna.png,
      presenti: this.pngInScena(),
      incontrati: pngIncontrati(this.trascrizione, this.campagna.png),
      manuali: this.presenzeManuali,
      rivelati: this.rivelati,
    });
  }

  // ------------------------------------------------------------------ serata (scena/serata.ts)

  /** Titoli delle scene, nell'ordine dato. */
  private titoliScene(ids: readonly string[]): string[] {
    return ids.map((id) => this.o.campagna.scene.find((s) => s.id === id)?.titolo ?? id);
  }

  /** I testi dei segni mostrati dagli orologi attivi (detti a voce: pubblici). */
  private segniMostrati(): string[] {
    return this.orologi.elenco.flatMap((o) => o.segni.slice(0, o.pieni));
  }

  /** «Finora stasera» per il Diario: scene attraversate e segni del tempo, niente di privato. */
  private finoraStasera(): string[] {
    const righe = this.sceneVisitate.size ? [testoFisso('regia.diario.luoghi', { luoghi: this.titoliScene([...this.sceneVisitate]).join(', ') })] : [];
    return [...righe, ...this.segniMostrati().slice(-3)];
  }

  /** La scena è nel climax: il consiglio di chiudere aspetta (sessione/durata.ts). */
  private climax(): boolean {
    return climaxInCorso(this.campagna.scena, this.orologi.elenco);
  }

  /** Il consiglio di avvicinarsi a una pausa naturale, per il messaggio del turno (null = niente). */
  private consiglioSerata(turno: number): string | null {
    this.serata.togliLaVoltaScorsa();
    const c = this.serata.consiglio(this.o.orologio.adesso(), this.climax());
    if (c) this.o.log.info({ turno }, 'serata: fine vicina, consiglio di pausa naturale nel contesto');
    return c;
  }

  /** Un'altra serata comincia: le azioni rimaste tornano ai giocatori, «La volta scorsa…», poi la finestra per tutti. */
  private cominciaNuovaSerata(recap: string[], perché: string): void {
    this.tavolo.annullaVive(testoFisso('regia.motivi.chiusura_serata'));
    this.tavolo.chiudiForzata();
    this.turno += 1;
    this.o.log.info({ sessione: this.sessione, turno: this.turno, frasi: recap.length, perché }, 'serata: comincia un’altra serata');
    this.leggiApertura(this.turno, recap);
    this.notifica();
    this.salva('nuova_serata');
  }

  /** Per il pannello del master. */
  get serataMaster(): SerataMaster {
    const chiudibile = (this.fase === 'finestra' || this.fase === 'pausa') && !this.tavolo.chiudendo && !this.serata.serataChiusa;
    return this.serata.master(this.o.orologio.adesso(), this.climax(), chiudibile);
  }

  /** Il master cambia la durata prevista della serata. */
  impostaOreSerata(ore: number): Esito {
    if (!this.serata.impostaOre(ore)) return { ok: false, errore: testoFisso('regia.errori.durata_non_valida') };
    this.o.log.info({ ore }, 'serata: durata cambiata dal master');
    this.notifica();
    return { ok: true };
  }

  /**
   * «Chiudi la sessione» (chiusura guidata): le azioni in coda tornano ai giocatori, il narratore chiude
   * la serata (in modalità B una battuta `chiusura` del repertorio, se c'è, la dice il Motore; se no
   * improvvisa), poi il riassunto della serata (modello + guardia, o riserva) va sul proiettore e nel
   * Diario, e `alFinire` lo riceve (sessione/ciclo.ts scrive registro e riassunto.yaml). La sessione
   * resta riprendibile: la prossima volta comincia con «La volta scorsa…».
   */
  chiudiSessione(alFinire?: (r: RiassuntoSerata) => void): Esito {
    if (this.serata.inChiusura) return { ok: false, errore: testoFisso('regia.errori.chiusura_in_corso') };
    if (this.serata.serataChiusa) return { ok: false, errore: testoFisso('regia.errori.serata_gia_chiusa') };
    if (this.narrazioneInCorso || this.tavolo.chiudendo) return { ok: false, errore: testoFisso('regia.errori.aspetta_narrazione') };
    if (this.fase !== 'finestra' && this.fase !== 'pausa') return { ok: false, errore: testoFisso('regia.errori.serata_non_in_corso') };
    const annullate = this.tavolo.annullaVive(testoFisso('regia.motivi.chiusura_serata'));
    const turno = this.tavolo.aperta ? this.turno : this.turno + 1;
    this.tavolo.chiudiForzata();
    this.pausaRichiesta = false;
    this.invitoSospeso = null;
    this.turno = turno;
    this.serata.iniziaChiusura();
    this.o.log.info({ turno, azioni_annullate: annullate.length }, 'serata: chiusura guidata');
    void this.eseguiChiusura(turno, alFinire).catch((err: unknown) => {
      this.o.log.error({ turno, err: (err as Error).message }, 'serata: chiusura fallita');
      this.serata.annullaChiusura();
      this.fase = 'pausa';
      this.invitoSospeso = 'tutti';
      this.notifica();
    });
    return { ok: true };
  }

  private async eseguiChiusura(turno: number, alFinire?: (r: RiassuntoSerata) => void): Promise<void> {
    const epoca = ++this.epoca;
    this.fase = 'narrazione';
    this.segmentiAperti.clear();
    this.sorvegliante.inizia(turno, 'narrazione', 'chiusura della serata');
    this.notifica();
    const log = this.o.log.child({ turno, chiusura: true });
    const battuta = this.statoRepertorio?.disponibili(turno).find((b) => b.tipo === 'chiusura') ?? null;
    const uso = battuta ? this.statoRepertorio!.usa(battuta.id, turno, { inRisposta: new Set() }) : null;
    if (uso?.ok) {
      log.info({ battuta: uso.battuta.id }, 'serata: chiusura dal repertorio');
      uso.righe.forEach((r, k) => {
        const { voce_id, nome } = voceDi(this.campagna, r.etichetta);
        this.aggiungiTrascrizione({ turno, tipo: r.etichetta === ID_NARRATORE ? 'narrazione' : 'battuta', chi: r.etichetta, nome, testo: r.testo });
        this.pipeline.accoda({ id_frase: `t${turno}-c${k}`, turno, indice: k, parlante: r.etichetta, nome, voce_id, testo: r.testo, testo_voce: this.pronuncia(r.testo) });
      });
    } else {
      const controllo = new AbortController();
      this.controlloLlm = controllo;
      const messaggio = messaggioChiusura({
        trascrizione: this.trascrizione,
        pgAlTavolo: this.pgAlTavolo().map((id) => ({ id, nome: this.nomePg(id) })),
        orologi: this.statoRepertorio ? this.orologi.descriviRepertorio(turno) : this.orologi.descrivi(turno),
      });
      const esito = await narraTurno(
        { campagna: this.campagna, narratore: this.o.narratore, pipeline: this.pipeline, log },
        {
          turno,
          sistema: this.sistema,
          messaggio,
          signal: controllo.signal,
          misuratore: new MisuratoreTurno(turno, this.o.orologio.ora(), 0, this.o.voce.nome, this.o.orologio.adesso()),
          ora: () => this.o.orologio.ora(),
          pronuncia: this.pronuncia,
          presenti: this.pngInScena(),
          usa: null,
          ignora: new Set(['invito_mancante']),
          onFrase: (f) => {
            if (epoca !== this.epoca) return;
            this.sorvegliante.batti('llm: frase della chiusura');
            this.trascriviFrase(turno, f.etichetta, f.nome, f.testo, f.segmento);
          },
        },
      );
      this.controlloLlm = null;
      if (epoca !== this.epoca) return;
      if (esito.esito) this.o.registroCosti.scrivi({ ts: new Date().toISOString(), tipo: 'chiusura', turno, modello: esito.esito.modello, ...esito.esito.costo });
      log.info({ frasi: esito.frasi, errore: esito.errore }, 'serata: chiusura narrata');
    }
    // Il riassunto si scrive mentre la voce legge la chiusura.
    const riassunto = this.serata.riassumi(this.trascrizione, this.titoliScene([...this.sceneVisitate]), this.segniMostrati(), turno);
    const voce = await this.pipeline.chiudiTurno(turno);
    if (epoca !== this.epoca || voce.interrotto) return;
    await this.attendiFineAudio(turno, voce.secondi);
    const r = await riassunto;
    if (epoca !== this.epoca) return;
    this.sorvegliante.fine('chiusura della serata');
    const s = this.serata.chiudi(r, new Date(this.o.orologio.adesso()).toISOString());
    this.versioneScena += 1;
    this.fase = 'pausa';
    this.invitoSospeso = 'tutti';
    this.rigaDiSistema(turno, testoFisso('regia.righe.serata_chiusa'));
    this.o.registroNarrazioni.scrivi({ sessione: this.sessione, turno, tipo: 'chiusura_serata', origine: r.origine, motivo: r.motivo ?? null, riassunto: s.testo, fili: s.fili });
    log.info({ origine: r.origine, fili: s.fili.length }, 'serata: chiusa, riassunto sul proiettore');
    this.notifica();
    this.salva('chiusura_serata');
    alFinire?.(s);
  }

  // ------------------------------------------------------------------ sceneggiatore (docs/sceneggiatore.md)

  /**
   * Dopo un turno: per ogni azione pubblica a cui il lettore non ha trovato una battuta («nessuna»: solo
   * una battuta d'attesa, o niente) si chiede SUBITO la sua battuta; poi, in sottofondo, le battute per
   * le azioni probabili del prossimo turno. Lo sceneggiatore lavora mentre il tavolo parla.
   */
  private chiediAlloSceneggiatore(turno: number, azioni: ReadonlyArray<{ id_pg: string; testo: string | null; [k: string]: unknown }>, uscita: readonly VoceUscita[]): void {
    const s = this.statoRepertorio!;
    const canale = this.sceneggiatore!;
    if (!canale.vivo) return;
    const risposte = new Set(uscita.filter((u) => u.tipo === 'usa' && u.per && !s.repertorio.perId.get(u.id)?.riempitivo).map((u) => (u.tipo === 'usa' ? u.per! : '')));
    // Anche le azioni private: la risposta va al telefono di quel PG (canale [privato]).
    for (const a of azioni) {
      if (!a.testo || a['sospesa'] === true || risposte.has(a.id_pg)) continue;
      const privata = a['privata'] === true;
      const id = canale.nuovoId('subito', turno);
      if (canale.chiedi(this.richiestaSceneggiatore(id, 'subito', turno, 1, { id_pg: a.id_pg, nome: this.nomePg(a.id_pg), testo: a.testo, ...(privata ? { privata: true } : {}) }))) {
        this.attesaSubito.set(id, { pg: a.id_pg, turno, privata });
      }
    }
    canale.chiedi(this.richiestaSceneggiatore(canale.nuovoId('prossime', turno), 'prossime', turno, 6));
  }

  private richiestaSceneggiatore(id: string, tipo: RichiestaSceneggiatore['tipo'], turno: number, quante: number, azione?: RichiestaSceneggiatore['azione']): RichiestaSceneggiatore {
    const s = this.statoRepertorio!;
    const sc = this.campagna.scena;
    return {
      id,
      tipo,
      creata: new Date(this.o.orologio.adesso()).toISOString(),
      turno,
      campagna: this.o.campagna.cartella,
      scena: { id: sc.id, titolo: sc.titolo, png_presenti: [...this.pngInScena()] },
      ...(azione ? { azione } : {}),
      trascrizione: this.trascrizione.filter((v) => v.tipo !== 'sistema').slice(-30).map((v) => `${v.nome}: ${v.testo}`),
      stato: { indizi_rivelati: [...s.indiziRivelati], fatti_noti: [...s.fattiNoti], battute_usate: [...s.usi.keys()], orologi: this.orologi.riepilogo() },
      prefisso: `sc_${id.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_`,
      quante,
      gia_usati: { ...giaUsati(this.trascrizione, turno), tic: Object.fromEntries(ticBloccati(this.trascrizione, this.campagna.png)) },
    };
  }

  /**
   * Una risposta dello sceneggiatore: le battute che passano il controllo (sceneggiatore/valida.ts)
   * entrano nel repertorio vivo, e da lì nel catalogo dei turni dopo. Quella chiesta «subito» si dice
   * adesso, se il tavolo è in finestra nella stessa scena e il tetto non è passato; se no resta nel
   * repertorio per la prossima volta.
   */
  private dalloSceneggiatore(rq: RichiestaSceneggiatore, rs: RispostaSceneggiatore): void {
    const s = this.statoRepertorio;
    const subito = this.attesaSubito.get(rq.id);
    this.attesaSubito.delete(rq.id);
    const ms = this.o.orologio.adesso() - Date.parse(rq.creata);
    const riga = { sessione: this.sessione, turno: this.turno, tipo: 'sceneggiatore', richiesta: rq.id, tipo_richiesta: rq.tipo, per_turno: rq.turno, esito: rs.esito, ms_claude: rs.ms, ms_totale: ms } as Record<string, unknown>;
    if (!s || rs.esito !== 'ok' || !rs.yaml || this.spento) {
      this.o.registroNarrazioni.scrivi({ ...riga, accettate: [], scartate: [], consegnata: false, ...(rs.errore ? { errore: rs.errore } : {}) });
      return;
    }
    const v = validaBattute(rs.yaml, {
      campagna: this.campagna,
      scena: rq.scena.id,
      presenti: new Set(rq.scena.png_presenti),
      esistenti: s.repertorio.perId,
      prefisso: rq.prefisso,
      parole: this.o.paroleSegrete ?? [],
      pubblico: this.statoPubblicoAlTavolo(),
      detto: this.trascrizione.filter((x) => x.tipo !== 'sistema').map((x) => x.testo).join('\n'),
      privata: subito?.privata === true,
      ticBloccati: ticBloccati(this.trascrizione, this.campagna.png),
    });
    for (const b of v.accettate) {
      s.repertorio.battute.push(b);
      s.repertorio.perId.set(b.id, b);
    }
    this.o.log.info({ richiesta: rq.id, tipo: rq.tipo, accettate: v.accettate.map((b) => b.id), scartate: v.scartate, ms }, 'sceneggiatore: battute nel repertorio');
    // Le «prossime» si diranno più avanti: la loro voce si prepara adesso, in sottofondo.
    if (rq.tipo === 'prossime' && v.accettate.length) this.o.preGeneraAudio?.(v.accettate);
    const tetto = this.o.sceneggiatore?.tettoMs ?? TETTO_SCENEGGIATORE_MS;
    const prima = v.accettate[0];
    let consegnata = false;
    if (subito && prima) {
      if (ms > tetto) this.o.log.info({ richiesta: rq.id, ms, tetto }, 'sceneggiatore: battuta arrivata oltre il tetto, resta nel repertorio');
      else if (this.fase !== 'finestra' || this.campagna.scena.id !== rq.scena.id) this.o.log.info({ richiesta: rq.id, fase: this.fase }, 'sceneggiatore: il tavolo è andato avanti, la battuta resta nel repertorio');
      else consegnata = this.diciDelloSceneggiatore(prima, subito.pg, rq, subito.privata);
    }
    this.o.registroNarrazioni.scrivi({ ...riga, accettate: v.accettate.map((b) => ({ id: b.id, chi: b.chi, tipo: b.tipo, quando: b.quando, temi: b.temi, testo: b.testo })), scartate: v.scartate, consegnata, ...(subito ? { per_pg: subito.pg, azione: rq.azione?.testo ?? null, privata: subito.privata } : {}) });
  }

  /**
   * La battuta scritta su richiesta, detta a finestra aperta (la voce la mette nel turno in corso). Per
   * un'azione privata va solo al telefono di quel PG: esito privato e voce `solo_pg`, mai in trascrizione.
   */
  private diciDelloSceneggiatore(b: Battuta, pg: string, rq: RichiestaSceneggiatore, privata = false): boolean {
    const uso = this.statoRepertorio!.usa(b.id, this.turno, { inRisposta: new Set() });
    if (!uso.ok) {
      this.o.log.warn({ battuta: b.id, motivo: uso.motivo }, 'sceneggiatore: battuta non usabile');
      return false;
    }
    const turno = this.turno;
    for (const r of uso.righe) {
      const { voce_id, nome } = voceDi(this.campagna, r.etichetta);
      this.frasiSceneggiatore += 1;
      if (privata) this.frasePrivata(turno, { etichetta: r.etichetta, nome, testo: r.testo, segmento: 70_000 + this.frasiSceneggiatore, id_pg: pg });
      else this.aggiungiTrascrizione({ turno, tipo: r.etichetta === ID_NARRATORE ? 'narrazione' : 'battuta', chi: r.etichetta, nome, testo: r.testo });
      this.pipeline.accoda({ id_frase: `t${turno}-s${this.frasiSceneggiatore}`, turno, indice: 700 + this.frasiSceneggiatore, parlante: r.etichetta, nome, voce_id, testo: r.testo, testo_voce: this.pronuncia(r.testo), ...(privata ? { solo_pg: pg } : {}) });
    }
    this.o.log.info({ battuta: b.id, per: pg, richiesta: rq.id, turno, privata }, 'sceneggiatore: battuta detta a finestra aperta');
    this.notifica();
    return true;
  }

  /** Lo stato pubblico al tavolo (battute e indizi usciti solo in privato non contano), come la guardia dei segreti. */
  private statoPubblicoAlTavolo(): StatoPubblico | null {
    const s = this.statoRepertorio;
    return s ? { indiziRivelati: new Set([...s.indiziRivelati].filter((i) => !this.indiziPrivati.has(i))), battuteUsate: (id) => s.usata(id) && !this.battutePrivate.has(id) } : null;
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

  /** Perché la battuta non può rispondere all'azione di `per` in questo turno (null = può). */
  private motivoPer(b: Battuta, per: string): string | null {
    const azione = this.turnoB?.azioni.get(per);
    if (!azione) return `${per} non ha un'azione in questo turno`;
    if (!this.statoRepertorio!.rispondeA(b, { autore: per, ...azione })) {
      return `${b.id} non risponde all'azione ${azione.privata ? 'privata' : 'pubblica'} di ${per} (cancelli privata/da_pg delle condizioni aperte)`;
    }
    return null;
  }

  /**
   * Il PG a cui la battuta risponde, quando il selettore non l'ha detto o ha sbagliato: fra le azioni
   * del turno che la battuta può accettare (cancelli), l'unica; altrimenti l'unica i cui temi la
   * chiamano; altrimenti l'unica che nomina chi parla. null = ambigua (il [usa] resta rifiutato).
   */
  private deduciPg(b: Battuta): string | null {
    const s = this.statoRepertorio!;
    const possibili = [...(this.turnoB?.azioni ?? [])].filter(([autore, a]) => s.rispondeA(b, { autore, ...a }));
    const unico = (xs: typeof possibili): string | null => (xs.length === 1 ? xs[0]![0] : null);
    if (possibili.length <= 1) return unico(possibili);
    const perTemi = possibili.filter(([, a]) => temaPresente(a.testo, b.temi));
    const daTemi = unico(perTemi);
    if (daTemi) return daTemi;
    const base = perTemi.length ? perTemi : possibili;
    return b.chi === ID_NARRATORE ? null : unico(base.filter(([, a]) => pngNominati(a.testo, this.nomiPng).has(b.chi)));
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
  private usaBattuta(id: string, per: string | null, turno: number, segni: SegniInRisposta, motore = false): EsitoUsaTurno {
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
    // Il «> pg» mancante o sbagliato si ripara una volta, se una sola azione del turno può essere quella
    // giusta (playtest di nozze-neve: tre battute giuste rifiutate per il «> pg» dimenticato, e la scena
    // restava a metà: il cassetto aperto e il contenuto mai detto).
    const perDato = per;
    if (per) {
      const motivo = this.motivoPer(b, per);
      if (motivo) {
        const giusto = motore ? null : this.deduciPg(b);
        if (!giusto || giusto === per) return { ok: false, motivo };
        this.o.log.info({ turno, battuta: id, per, corretto: giusto, motivo }, 'repertorio: [usa] riparato dal Motore («> pg» corretto)');
        per = giusto;
      }
    } else {
      // Un finale non risponde all'azione di nessuno: chiude la scena (se è disponibile, s.usa lo controlla).
      // Un segno senza «> pg» passa solo se è dovuto IL SUO orologio (non un orologio qualsiasi).
      const libera = motore || b.tipo === 'finale' || (b.tipo === 'segno_orologio' && segnoDovutoDi(b, t?.dovuti)) || (b.riempitivo && !!t?.stallo);
      if (s.serveAzione(b) || !libera) {
        const dedotto = motore ? null : this.deduciPg(b);
        if (!dedotto) {
          return s.serveAzione(b)
            ? { ok: false, motivo: `${id} ha un cancello sull'azione (privata o da_pg): serve «> pg»` }
            : { ok: false, motivo: 'battuta senza «> pg»: ammessa solo per il segno dovuto del suo orologio, un finale o allo stallo' };
        }
        this.o.log.info({ turno, battuta: id, per: dedotto }, 'repertorio: «> pg» dedotto dal Motore (una sola azione adatta)');
        per = dedotto;
      }
    }
    if (per !== perDato) this.pgDedotti += 1;
    // Ritmo massimo dell'orologio: vale per i segni senza «> pg» (dovuti o del Motore); un segno legato
    // all'azione di un PG lo scavalca. Un segno per orologio, al massimo due orologi per risposta.
    const nuoviIndizi = b.effetti.rivela_indizi.filter((i) => !s.indiziRivelati.has(i));
    const esito = s.usa(id, turno, { inRisposta: segni.orologi, ritmo: per === null });
    if (!esito.ok) return esito;
    // Detta a un'azione privata: la sente solo quel PG, e per la guardia dei segreti non è pubblica.
    if (per && t?.azioni.get(per)?.privata) {
      this.battutePrivate.add(id);
      for (const i of nuoviIndizi) this.indiziPrivati.add(i);
    } else {
      this.battutePrivate.delete(id);
      for (const i of b.effetti.rivela_indizi) this.indiziPrivati.delete(i);
    }
    this.rivelateNelTurno.push(esito.battuta.id, ...esito.battuta.effetti.rivela_indizi);
    if (esito.orologiPartiti.length) this.o.log.info({ turno, battuta: id, orologi: esito.orologiPartiti }, 'orologio: partito (parte_dopo)');
    const audio = this.cueBattuta(esito.battuta);
    return {
      ok: true,
      versione: esito.versione,
      ...(per !== perDato ? { per } : {}),
      ...(audio ? { audio } : {}),
      // Risponde a un'azione PRIVATA: le righe vanno solo al telefono di quel PG.
      ...(per && this.turnoB?.azioni.get(per)?.privata ? { privato: per } : {}),
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
        personaggi: this.personaggiVisti(),
        ...(this.o.audio ? { audio: audioDellaScena(this.o.audio, c, this.luogo, this.umoreScelto) } : {}),
      },
      pg: c.pg.map((p) => ({
        id: p.id,
        nome: p.nome,
        descrizione: p.descrizione,
        telefoni: conteggio.get(p.id) ?? 0,
        ...(this.prove?.attivo ? { pf: this.prove.stato.puntiFerita(p.id) } : {}),
      })),
      finestra: this.tavolo.finestraPubblica(),
      al_tavolo: this.tavolo.alTavolo(),
      trascrizione: this.trascrizione.slice(-this.o.trascrizioneMax),
      voce_motore: this.o.voce.nome,
      schermo_connesso: this.schermi.size > 0,
      ritmo: this.ritmo,
      ora_server_ms: this.o.orologio.adesso(),
      lingua: this.o.lingue ?? { interfaccia: LINGUA_PREDEFINITA, contenuti: linguaAttiva() },
      ...(this.prove?.attivo ? { dadi: true, tiri: this.prove.tiriPubblici() } : {}),
      ...(this.prove?.inCombattimento ? { combattimento: this.prove.vistaCombattimento() } : {}),
      ...this.serata.pubblico(this.finoraStasera()),
    };
  }

  azioneDi(id_pg: string): AzionePrivata | null {
    return this.conTiri(this.tavolo.azioneDi(id_pg));
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


  /** Riga di sistema della trascrizione (telefoni, proiettore, pannello): chi «sistema», nome nella lingua dei contenuti. */
  private rigaDiSistema(turno: number, testo: string): VoceTrascrizione {
    return this.aggiungiTrascrizione({ turno, tipo: 'sistema', chi: 'sistema', nome: testoFisso('regia.nome_sistema'), testo });
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
    if (!this.campagna.pg.some((p) => p.id === id_pg)) return { ok: false, errore: testoFisso('regia.errori.personaggio_sconosciuto') };
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
    this.sorvegliante.batti(`schermo: audio iniziato ${d.id_frase}`);
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
    if (this.fase === 'attesa' || this.fase === 'fermata') return { ok: false, errore: testoFisso('regia.errori.scena_non_in_corso') };
    this.interrompiTutto(motivo);
    this.fase = 'fermata';
    this.rigaDiSistema(this.turno, testoFisso('regia.righe.scena_fermata'));
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
    this.sceneggiatore?.chiudi();
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
    this.privati = [];
    this.privatiSalvati.clear();
    this.privatiAperti.clear();
    this.turno = 0;
    this.versioneScena = 0;
    // Si riparte dalla prima scena, con gli orologi della campagna da capo.
    this.orologi = new StatoOrologi(this.o.campagna);
    this.sceneVisitate.clear();
    this.sceneConFinale.clear();
    this.rivelati.clear();
    this.impostaScena(this.o.campagna.scene[0]!.id);
    this.statoRepertorio = this.nuovoStatoRepertorio();
    this.tavolo.azzera();
    // Punti ferita pieni, dadi con un seme nuovo, nessuna carta.
    this.prove?.azzera();
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
    if (this.fase === 'attesa' || this.fase === 'fermata') return { ok: false, errore: testoFisso('regia.errori.scena_non_in_corso') };
    if (this.fase === 'pausa') return { ok: false, errore: testoFisso('regia.errori.gia_in_pausa') };
    if (this.pausaRichiesta) return { ok: false, errore: testoFisso('regia.errori.pausa_gia_chiesta') };
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
    if (this.pausaRichiesta && this.fase !== 'pausa') {
      this.pausaRichiesta = false;
      this.o.log.info({ turno: this.turno }, 'scena: pausa chiesta annullata');
      this.notifica();
      return { ok: true };
    }
    if (this.fase !== 'pausa') return { ok: false, errore: testoFisso('regia.errori.non_in_pausa') };
    if (this.serata.serataChiusa) {
      // Dopo «Chiudi la sessione», Riprendi comincia un'altra serata: «La volta scorsa…», poi si gioca.
      const recap = this.serata.prendiLaVoltaScorsa();
      this.serata.riparte(this.o.orologio.adesso());
      this.cominciaNuovaSerata(recap, 'riprendi dopo una serata chiusa');
      return { ok: true };
    }
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
    if (!this.narrazioneInCorso) return { ok: false, errore: testoFisso('regia.errori.nessuna_narrazione') };
    const turno = this.turno;
    const faseInterrotta = this.fase;
    this.interrompiFlussi('master');
    this.primoAudioInviato.delete(turno);
    const annullate = this.tavolo.annullaChiuse(turno, testoFisso('regia.motivi.narrazione_interrotta'));
    this.rigaDiSistema(turno, testoFisso('regia.righe.narrazione_interrotta'));
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
    if (!nuova) return { ok: false, errore: testoFisso('regia.errori.scena_sconosciuta') };
    if (nuova.id === this.campagna.scena.id) return { ok: false, errore: testoFisso('regia.errori.scena_gia_in_corso') };
    if (this.narrazioneInCorso || this.tavolo.chiudendo) return { ok: false, errore: testoFisso('regia.errori.aspetta_narrazione') };
    const da = this.campagna.scena.id;
    const inGioco = this.fase !== 'attesa' && this.fase !== 'fermata';
    // A finestra aperta il suo turno non è stato narrato: l'apertura lo prende; altrimenti il successivo.
    const turno = !inGioco ? this.turno : this.tavolo.aperta ? this.turno : this.turno + 1;
    this.impostaScena(nuova.id, turno);
    this.o.log.info({ da, a: nuova.id, fase: this.fase, immagine: this.o.immagini?.luogo(nuova.id) ?? null }, 'scena: cambio di scena');
    if (!inGioco) {
      this.notifica();
      return { ok: true };
    }
    const annullate = this.tavolo.annullaVive(testoFisso('regia.motivi.cambio_scena'));
    this.tavolo.chiudiForzata();
    // Le decisioni delle prove valevano per la scena di prima (PF e dadi restano).
    this.prove?.dimentica();
    this.pausaRichiesta = false;
    this.invitoSospeso = null;
    this.turno = turno;
    this.rigaDiSistema(turno, testoFisso('regia.righe.nuova_scena', { titolo: nuova.titolo }));
    // Una scena già visitata non riapre con l'apertura (e la prima scena col riassunto di sessione):
    // si legge il suo rientro (playtest di nozze-neve: la casera si rileggeva da capo a ogni ritorno).
    const rientro = this.sceneVisitate.has(nuova.id) ? this.rientroIn(nuova, turno) : null;
    this.sceneVisitate.add(nuova.id);
    const frasi = rientro?.frasi ?? nuova.apertura;
    this.o.registroNarrazioni.scrivi({
      sessione: this.sessione,
      turno,
      tipo: 'cambio_scena',
      da,
      a: nuova.id,
      azioni_annullate: annullate,
      ...(rientro ? { rientro: rientro.battuta ?? 'testo' } : {}),
      testo: frasi.map((f) => `[narratore] ${f}`).join('\n'),
    });
    if (this.o.preriscalda && this.o.narratore.preriscalda) void this.preriscalda();
    this.leggiApertura(turno, frasi);
    return { ok: true };
  }

  /** Ritmo del tavolo adesso (per il pannello). */
  get ritmoCorrente(): Ritmo {
    return this.ritmo;
  }

  /**
   * Cambia il ritmo: dal narratore (`[ritmo]`, vale per la prossima finestra), dalla scena o dal
   * master (a finestra aperta vale subito: concitato fa partire il conto da adesso, calmo lo toglie).
   */
  impostaRitmo(ritmo: Ritmo, origine: 'narratore' | 'scena' | 'master'): Esito {
    if (ritmo !== 'calmo' && ritmo !== 'concitato') return { ok: false, errore: testoFisso('regia.errori.ritmo_sconosciuto') };
    const prima = this.ritmo;
    this.ritmo = ritmo;
    if (this.fase === 'finestra') this.tavolo.impostaRitmo(ritmo);
    if (prima !== ritmo) this.o.log.info({ turno: this.turno, da: prima, a: ritmo, origine, fase: this.fase }, 'ritmo: cambiato');
    this.notifica();
    return { ok: true };
  }

  /** Il master chiude la finestra adesso («Risolvi ora»: il narratore risponde alle azioni inviate). */
  chiudiFinestraOra(): Esito {
    if (this.fase === 'pausa') return { ok: false, errore: testoFisso('tavolo.in_pausa') };
    if (this.fase !== 'finestra') return { ok: false, errore: testoFisso('tavolo.finestra_chiusa') };
    return this.tavolo.chiudiOra();
  }

  /** Il master salta l'azione di un giocatore (non entra nel turno). */
  saltaAzione(idAzione: string): Esito {
    const a = this.tavolo.salta(idAzione, testoFisso('regia.motivi.saltata'));
    if (!a) return { ok: false, errore: testoFisso('regia.errori.azione_inesistente') };
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
    if (this.fase === 'attesa' || this.fase === 'fermata') return { ok: false, errore: testoFisso('regia.errori.scena_non_in_corso') };
    const esito = this.tavolo.invia(id_pg, testo, versioneVista, privata);
    // Che cosa si tira lo decide l'arbitro adesso, in sottofondo: alla chiusura è già pronto.
    if (esito.ok) this.preparaProve(id_pg);
    // Lo stesso per la battuta del lettore minimo: la sceglie adesso, mentre gli altri scrivono.
    if (esito.ok) this.preparaLettore(id_pg);
    return esito;
  }

  ritiraAzione(id_pg: string): Esito {
    const esito = this.tavolo.ritira(id_pg);
    if (esito.ok) this.o.narratore.annullaPreclassifica?.(id_pg);
    return esito;
  }

  /**
   * Lettore minimo (llm/minimo.ts): l'azione appena inviata si classifica subito col catalogo che il
   * Motore le darebbe adesso (stessi cancelli, stessa preselezione). Alla chiusura il lettore controlla
   * che la scelta valga ancora nel catalogo del turno, e rifà solo le azioni che non tornano.
   */
  private preparaLettore(id_pg: string): void {
    const s = this.statoRepertorio;
    if (!s || !this.o.narratore.preclassifica) return;
    const a = this.tavolo.tutte().find((x) => x.autore === id_pg && (x.stato === 'in_coda' || x.stato === 'da_confermare'));
    if (!a) return;
    const azioni = [{ autore: id_pg, testo: a.testo, privata: a.privata, prove: [] as string[] }];
    const dovuti = new Set(this.orologi.dovuti(this.turno).map((o) => o.id));
    const { battute } = s.catalogo({ turno: this.turno, azioni, stallo: false, dovuti, nomiPng: this.nomiPng, parole: this.o.paroleSegrete ?? [] });
    const indicate = s.indicatePerAzioni(battute, azioni, this.nomiPng).find((x) => x.autore === id_pg)?.ids ?? [];
    const righe = new Map(battute.map((b) => [b.id, StatoRepertorio.riga(b).replace(/^- /, '')]));
    this.o.narratore.preclassifica({ id_pg, nome: this.nomePg(id_pg), testo: a.testo, privata: a.privata }, { indicate, righe });
  }

  confermaAzione(id_pg: string): Esito {
    return this.tavolo.conferma(id_pg);
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
    this.sorvegliante.fine(motivo);
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
    this.sceneVisitate.add(c.scena.id);
    // Una sessione che continua (pacchetto dopo, senza riassunto_iniziale) comincia con «La volta scorsa…».
    this.serata.riparte(this.o.orologio.adesso());
    this.leggiApertura(0, [...this.serata.prendiLaVoltaScorsa(), ...c.scena.apertura]);
    this.salva('inizio');
  }

  /**
   * Il narratore legge l'apertura di una scena (fase «apertura», turno `turno`), poi la finestra si
   * apre per tutti (o il tavolo va in pausa, se il master l'ha chiesta).
   */
  private leggiApertura(turno: number, frasi: string[]): void {
    const epoca = ++this.epoca;
    this.fase = 'apertura';
    this.sorvegliante.inizia(turno, 'apertura', 'apertura: frasi alla voce');
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
    })().catch((err: unknown) => this.dopoEccezione(epoca, turno, 'apertura', err));
  }

  /**
   * La scena corrente diventa `id`: contesto del narratore, orologi attivi, repertorio, luogo.
   * `turno`: quello dell'apertura della scena (gli orologi contano il ritmo da lì e applicano le
   * regole `orologi_in_scena`, es. «al Sasso il tramonto sale a sei»).
   */
  private impostaScena(id: string, turno = 0): void {
    this.campagna = conScena(this.o.campagna, id);
    this.presenzeManuali.clear();
    this.sistema = this.o.sistemaPer?.(this.campagna) ?? this.sistema;
    this.scenaPubblica = this.o.scenaPubblicaPer?.(this.campagna) ?? this.scenaPubblica;
    for (const salto of this.orologi.impostaScena(this.campagna.scena, turno)) {
      this.o.log.info({ scena: id, turno, orologio: salto.id, da: salto.da, a: salto.a }, 'orologio: sale entrando nella scena (orologi_in_scena.pieni_almeno)');
    }
    this.statoRepertorio?.impostaScena(this.campagna.scena);
    this.luogo = id;
    this.togliSituazione('cambio di scena');
    // Scena nuova (o ricominciata): torna il suo umore iniziale, e il limite riparte.
    this.umoreScelto = null;
    this.limiteUmori.azzera();
    // Scena nuova: il ritmo torna quello della scena (calmo, se la scena non dice niente).
    const ritmo = ritmoDellaScena(this.campagna);
    if (ritmo !== this.ritmo) this.o.log.info({ scena: id, da: this.ritmo, a: ritmo }, 'ritmo: quello della scena nuova');
    this.ritmo = ritmo;
  }

  /**
   * Il rientro in una scena già visitata: in modalità B la battuta di `rientro` della scheda, se è
   * ancora disponibile (es. `tr_casera`, max_usi 1: esce e conta come usata); altrimenti il testo di
   * `rientro`, o la prima frase dell'apertura della scena (campagna/caricatore.ts, rientroDa).
   */
  private rientroIn(scena: ScenaCaricata, turno: number): { frasi: string[]; battuta: string | null } {
    const id = scena.rientro.battuta;
    if (id && this.statoRepertorio) {
      const uso = this.statoRepertorio.usa(id, turno, { inRisposta: new Set() });
      if (uso.ok) {
        this.o.log.info({ scena: scena.id, turno, battuta: id }, 'scena: rientro con la battuta della scheda');
        return { frasi: uso.righe.map((r) => r.testo), battuta: id };
      }
      this.o.log.info({ scena: scena.id, turno, battuta: id, motivo: uso.motivo }, 'scena: battuta di rientro non disponibile, si legge il testo di riserva');
    }
    this.o.log.info({ scena: scena.id, turno, frasi: scena.rientro.frasi.length }, 'scena: rientro (senza rileggere l’apertura)');
    return { frasi: scena.rientro.frasi, battuta: null };
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
  // ------------------------------------------------------------------ prove e dadi (docs/prove.md)

  /** L'azione del giocatore con le carte dei suoi tiri (anche privati: va solo al suo telefono). */
  private conTiri(a: AzionePrivata | null): AzionePrivata | null {
    if (!a || !this.prove?.attivo) return a;
    const tiri = this.prove.tiriDellAzione(a.id);
    return tiri.length ? { ...a, tiri } : a;
  }

  private static versoProve(a: Azione): AzionePerProve {
    return { id: a.id, autore: a.autore, testo: a.testo, privata: a.privata, revisione: a.revisione };
  }

  /**
   * In sottofondo, l'arbitro decide che cosa tirano le azioni in coda (solo quella di `id_pg`, o
   * tutte dopo una narrazione): le decisioni restano in cache per la chiusura.
   */
  private preparaProve(id_pg?: string): void {
    if (!this.prove?.attivo) return;
    const vive = this.tavolo.tutte().filter((a) => a.stato === 'in_coda' || a.stato === 'da_confermare');
    const daFare = id_pg ? vive.filter((a) => a.autore === id_pg) : vive;
    if (!daFare.length) return;
    this.prove.preclassifica(daFare.map(Regia.versoProve), vive.filter((a) => !daFare.includes(a)).map(Regia.versoProve));
  }

  /**
   * Guardia delle azioni private del turno (narrazione/privato.ts): una riga al tavolo che nomina
   * l'autore di un'azione privata e ne riprende il contenuto va al suo telefono. Una per chiamata
   * del narratore (i segmenti ripartono da capo).
   */
  /**
   * La guardia dei segreti del turno (narrazione/guardia-segreti.ts). Pubblico è ciò che il tavolo ha
   * sentito: la trascrizione pubblica, le azioni pubbliche del turno, le battute e gli indizi usciti al
   * tavolo (non quelli detti a un'azione privata). Una riga che direbbe un segreto ancora nascosto va al
   * telefono dell'autore se il turno ha solo la sua azione privata (è la risposta a quella); se no il
   * PNG dice la sua deviazione (battuta `rifiuto` del repertorio) e una riga del narratore si toglie.
   */
  private guardiaSegreti(azioni: ReadonlyArray<{ id_pg: string; testo: string | null; [k: string]: unknown }>): { guardiaSegreti?: (etichetta: string, testo: string) => EsitoGuardiaSegreti | null } {
    const parole = this.o.paroleSegrete ?? [];
    if (!parole.length) return {};
    const s = this.statoRepertorio;
    const pubblico: StatoPubblico | null = s
      ? { indiziRivelati: new Set([...s.indiziRivelati].filter((i) => !this.indiziPrivati.has(i))), battuteUsate: (id) => s.usata(id) && !this.battutePrivate.has(id) }
      : null;
    const conTesto = azioni.filter((a) => a.testo);
    const pubbliche = conTesto.filter((a) => a['privata'] !== true);
    const autoriPrivati = new Set(conTesto.filter((a) => a['privata'] === true).map((a) => a.id_pg));
    const soloPrivato = pubbliche.length === 0 && autoriPrivati.size === 1 ? [...autoriPrivati][0]! : null;
    const detto = [
      ...this.trascrizione.filter((v) => v.tipo === 'narrazione' || v.tipo === 'battuta' || v.tipo === 'azione').map((v) => v.testo),
      ...pubbliche.map((a) => a.testo as string),
    ].join('\n');
    return {
      guardiaSegreti: (etichetta, testo) => {
        const trovate = segretiNascosti(testo, parole, pubblico, detto);
        if (!trovate.length) return null;
        return soloPrivato ? { parole: trovate, privato: soloPrivato } : { parole: trovate, sostituto: this.deviazioneDi(etichetta) };
      },
    };
  }

  /**
   * Ciò che dice un PNG al posto di una riga che svelerebbe un segreto: la sua battuta `rifiuto` del
   * repertorio (testo, poi le varianti a turno), anche se è solo un esempio di voce; senza, una riga
   * neutra del narratore. Per il narratore: niente (la riga si toglie).
   */
  private deviazioneDi(etichetta: string): Array<{ etichetta: string; testo: string }> {
    if (etichetta === ID_NARRATORE) return [];
    const b = this.o.repertorio?.battute.find((x) => x.chi === etichetta && x.tipo === 'rifiuto');
    const nome = voceDi(this.campagna, etichetta).nome;
    if (!b) return [{ etichetta: ID_NARRATORE, testo: testoFisso('regia.narratore.deviazione', { nome }) }];
    const n = this.deviazioniDette.get(etichetta) ?? 0;
    this.deviazioniDette.set(etichetta, n + 1);
    const versioni = [b.testo, ...b.varianti];
    return versioni[n % versioni.length]!.map((r) => ({ etichetta: r.etichetta, testo: r.testo }));
  }

  private guardiaPrivate(azioni: ReadonlyArray<{ id_pg: string; testo: string | null; [k: string]: unknown }>): { spostaPrivata?: NonNullable<ReturnType<typeof guardiaPrivate>> } {
    const c = this.campagna;
    const nomiDi = (id: string): string[] => {
      const nome = c.pg.find((p) => p.id === id)?.nome ?? id;
      return [nome, nomeBreve(nome), ...Object.entries(c.alias).filter(([, x]) => x === id).map(([a]) => a)];
    };
    const tutti = new Set([...c.pg.map((p) => p.nome), ...c.png.map((p) => p.nome), ...Object.keys(c.alias)].map((n) => n.toLowerCase()));
    const g = guardiaPrivate(
      azioni.map((a) => ({ id_pg: a.id_pg, testo: a.testo, privata: a['privata'] === true })),
      nomiDi,
      tutti,
    );
    return g ? { spostaPrivata: g } : {};
  }

  /** Per il pannello del master: schede coi PF e condizioni del set (null senza dadi). */
  get combattimentoMaster(): CombattimentoMaster | null {
    return this.prove?.attivo ? this.prove.combattimentoMaster() : null;
  }

  /** Combattimento a turni: tiene le azioni di chi è di turno, rinvia le altre (tornano in coda). */
  private soloChiEraDiTurno(r: RiepilogoChiusura): RiepilogoChiusura {
    const diTurno = this.prove?.turnoCombattimento();
    if (!diTurno?.length) return r;
    const fuori = r.azioni.filter((a) => !diTurno.includes(a.autore));
    if (!fuori.length) return r;
    this.tavolo.rinvia(fuori.map((a) => a.id));
    this.o.log.info({ turno: r.turno, di_turno: diTurno, rinviate: fuori.map((a) => a.autore) }, 'combattimento: risolve solo chi è di turno');
    return { ...r, azioni: r.azioni.filter((a) => diTurno.includes(a.autore)) };
  }

  /** Pannello del master: comincia o finisce lo scontro, corregge PF e condizioni. */
  iniziaCombattimento(): Esito {
    const fatto = this.prove?.iniziaCombattimento();
    if (!fatto) return { ok: false, errore: testoFisso(this.prove?.attivo ? 'regia.errori.combattimento_in_corso' : 'regia.errori.senza_dadi') };
    this.rigaDiSistema(this.turno, fatto);
    this.o.log.info({ turno: this.turno }, 'combattimento: aperto dal master');
    this.notifica();
    return { ok: true };
  }

  terminaCombattimento(): Esito {
    if (!this.prove?.terminaCombattimento()) return { ok: false, errore: testoFisso('regia.errori.nessun_combattimento') };
    this.rigaDiSistema(this.turno, testoFisso('regia.righe.combattimento_chiuso'));
    this.notifica();
    return { ok: true };
  }

  impostaPf(id: string, valore: number): Esito {
    if (!this.prove?.impostaPf(id, valore)) return { ok: false, errore: testoFisso('regia.errori.pf_non_validi') };
    this.notifica();
    return { ok: true };
  }

  condizioneCombattimento(id: string, condizione: string, attiva: boolean): Esito {
    if (!this.prove?.condizione(id, condizione, attiva)) return { ok: false, errore: testoFisso('regia.errori.condizione_sconosciuta') };
    this.notifica();
    return { ok: true };
  }

  /** I dadi del turno chiuso: carte a proiettore e telefoni, fatti per il narratore, prove riuscite. */
  private async tiriDelTurno(r: RiepilogoChiusura): Promise<EsitoTurnoProve> {
    const esito = await this.prove!.risolvi(r.turno, r.azioni.map(Regia.versoProve));
    this.riuscitePerAzione = new Map([...esito.perAzione].map(([id, e]) => [id, e.riuscite]));
    this.o.log.info(
      {
        turno: r.turno,
        attesa_ms: esito.attesa_ms,
        tardive: esito.tardive,
        tiri: esito.tiri.map((t) => `${t.nome}: ${t.etichetta} ${t.totale} contro ${t.contro.tipo} ${t.contro.valore}, ${t.riuscita ? 'riuscita' : 'fallita'}${t.privata ? ' (privata)' : ''}`),
        // Le righe esatte che riceve il narratore: per rivedere dopo la partita se ha raccontato l'esito giusto.
        fatti: esito.fatti,
      },
      'prove: tiri del turno',
    );
    if (esito.tiri.length) {
      // Proiettore e telefoni: le carte pubbliche (stato.tiri); ogni autore riceve le sue, anche private.
      this.notifica();
      for (const a of r.azioni) this.uscita?.azioneMia(a.autore, this.conTiri(this.tavolo.azioneDi(a.autore)));
    }
    return esito;
  }

  private fineNarrazione(invito: string[] | 'tutti'): void {
    // Combattimento a turni: invita il Motore, non il narratore (solo chi è di turno).
    const diTurno = this.prove?.turnoCombattimento();
    if (diTurno?.length) invito = diTurno;
    // Il lavoro del Motore è finito: da qui il tavolo aspetta i giocatori (senza fretta) o il master.
    this.sorvegliante.fine('fine narrazione');
    void this.tavolo.dopoNarrazione(this.turno, this.versioneScena);
    // Le azioni in coda sono state decise prima di questa narrazione: si rifanno sulla nuova.
    this.preparaProve();
    this.situazioniDopoLeRivelazioni();
    if (this.scenaFinitaAlTurno === this.turno) {
      // Il finale è stato detto. Prima il tavolo andava in pausa e ripartiva solo con Riprendi del
      // master (la pausa «che non riparte da sola» della prova del 3 novembre): ora la finestra si
      // riapre per tutti e il master riceve l'avviso per scegliere come andare avanti.
      this.scenaFinitaAlTurno = null;
      const fine = testoFisso('regia.righe.fine_scena');
      this.rigaDiSistema(this.turno, fine);
      this.uscita?.avviso('info', fine);
      this.o.log.info({ turno: this.turno, scena: this.campagna.scena.id }, 'scena: finita col finale, la finestra si riapre (decide il master)');
      invito = 'tutti';
    }
    if (this.pausaRichiesta) {
      // Pausa chiesta dal master durante la narrazione: scatta adesso, e riparte solo con Riprendi.
      this.pausaRichiesta = false;
      this.fase = 'pausa';
      this.invitoSospeso = invito;
      this.o.log.info({ turno: this.turno, invito }, 'scena: in pausa (dopo la narrazione)');
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
    this.tavolo.apri(this.turno, invitati, this.versioneScena, invito === 'tutti', this.ritmo);
  }

  private async finestraChiusa(r: RiepilogoChiusura): Promise<void> {
    if (r.motivo === 'forzata') return; // ferma/ricomincia: niente narrazione
    // Combattimento a turni: si risolve solo chi era di turno; le azioni degli altri tornano in coda.
    r = this.soloChiEraDiTurno(r);
    this.salvaTavoloOra();
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
    this.sorvegliante.inizia(r.turno, 'narrazione', 'llm: chiamata');
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
    // Tiri del turno (docs/prove.md): il Motore tira PRIMA del narratore, che riceve gli esiti come
    // fatti. Le decisioni dell'arbitro di solito sono già pronte (prese all'invio): nessuna attesa.
    this.riuscitePerAzione = new Map();
    // In combattimento si tira anche senza azioni: i turni dei PNG vanno avanti.
    const tiri = this.prove?.attivo && (r.azioni.length || this.prove.inCombattimento) ? await this.tiriDelTurno(r) : null;
    if (epoca !== this.epoca) return;
    // Gli stessi dati vanno al lettore minimo, che non legge il testo (llm/minimo.ts, turnoDaDati).
    const datiTurno: DatiMessaggioTurno = {
      turno: r.turno,
      trascrizione: this.trascrizione,
      privati: this.privati,
      azioni: perNarratore.azioni,
      collegamenti: perNarratore.collegamenti,
      // Nessuna azione (scadenza concitata, o Risolvi ora a mani vuote): il mondo fa una mossa.
      ...(r.azioni.length === 0 ? { stallo: 1 } : {}),
      pgAlTavolo: this.pgAlTavolo().map((id) => ({ id, nome: nomePg(id) })),
      orologi: this.statoRepertorio ? this.orologi.descriviRepertorio(r.turno) : this.orologi.descrivi(r.turno),
      ...(this.statoRepertorio ? { repertorio: this.elencoRepertorio(r) } : {}),
      noteRegia: this.note.testi,
      tempoSerata: this.consiglioSerata(r.turno),
      ...(tiri?.fatti.length ? { esitiTiri: { titolo: titoloEsiti(), regola: this.prove?.regolaEsiti() ?? regolaEsiti(), righe: tiri.fatti } } : {}),
    };
    const messaggioBase = compilaMessaggioTurno(datiTurno);
    // Ritmo concitato: il narratore sa che vale ancora, e quando dire `[ritmo] calmo`.
    const ritmo = sezioneRitmo(this.ritmo);
    const messaggio = ritmo ? `${messaggioBase}\n\n${ritmo}` : messaggioBase;
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
    // Mossa del mondo (nessuna azione): la narrazione resta nella finzione (narrazione/finzione.ts).
    const mossaDelMondo = r.azioni.length === 0;
    void this.eseguiNarrazione(r.turno, messaggio, epoca, azioni, r.motivo, noteNelMessaggio.map((n) => n.testo), mossaDelMondo, datiTurno).catch((err: unknown) =>
      this.dopoEccezione(epoca, r.turno, 'narrazione', err),
    );
  }

  private async eseguiNarrazione(
    turno: number,
    messaggio: string,
    epoca: number,
    azioni: Array<{ id_pg: string; testo: string | null; [k: string]: unknown }>,
    chiusura: RiepilogoChiusura['motivo'],
    noteRegia: string[] = [],
    mossaDelMondo = false,
    dati?: DatiMessaggioTurno,
  ): Promise<void> {
    const misuratore = this.misuratore!;
    const controllo = new AbortController();
    this.controlloLlm = controllo;
    /** Orologi già avanzati in questa risposta: un segno per orologio, al massimo due orologi. */
    const segniInRisposta: SegniInRisposta = { orologi: new Set<string>() };
    this.pgDedotti = 0;
    const log = this.o.log.child({ turno });
    log.debug({ caratteri: messaggio.length }, 'narratore: messaggio del turno');

    const esito = await narraTurno(
      { campagna: this.campagna, narratore: this.o.narratore, pipeline: this.pipeline, log },
      {
        turno,
        sistema: this.sistema,
        messaggio,
        ...(dati ? { dati } : {}),
        signal: controllo.signal,
        misuratore,
        ora: () => this.o.orologio.ora(),
        pronuncia: this.pronuncia,
        ...this.parametriAudioTurno(),
        ...(mossaDelMondo ? { scartaFrase: fuoriDallaFinzione } : {}),
        ...this.guardiaPrivate(azioni),
        ...this.guardiaSegreti(azioni),
        presenti: this.pngInScena(),
        usa: this.statoRepertorio ? (id, per) => this.usaBattuta(id, per, turno, segniInRisposta) : null,
        onFrase: (f) => {
          if (epoca !== this.epoca) return;
          this.sorvegliante.batti('llm: frase');
          this.trascriviFrase(turno, f.etichetta, f.nome, f.testo, f.segmento);
        },
        onPrivato: (f) => {
          if (epoca !== this.epoca) return;
          this.sorvegliante.batti('llm: frase privata');
          this.frasePrivata(turno, f);
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
          ...(dati ? { dati: { ...dati, riparazione: true } } : {}),
          signal: controllo.signal,
          misuratore,
          ora: () => this.o.orologio.ora(),
          pronuncia: this.pronuncia,
          ...this.parametriAudioTurno(),
          ...(mossaDelMondo ? { scartaFrase: fuoriDallaFinzione } : {}),
          ...this.guardiaPrivate(azioni),
          ...this.guardiaSegreti(azioni),
          presenti: this.pngInScena(),
          usa: (id, per) => this.usaBattuta(id, per, turno, segniInRisposta),
          prefissoFrasi: 'r',
          ignora: new Set(['invito_mancante']),
          onFrase: (f) => {
            if (epoca !== this.epoca) return;
            this.trascriviFrase(turno, f.etichetta, f.nome, f.testo, 50_000 + f.segmento);
          },
          onPrivato: (f) => {
            if (epoca !== this.epoca) return;
            this.frasePrivata(turno, { ...f, segmento: 50_000 + f.segmento });
          },
        },
      );
      if (epoca !== this.epoca) return;
      esito.uscita.push(...riparazione.uscita);
      esito.righe_prescritte += riparazione.righe_prescritte;
      esito.righe_improvvisate += riparazione.righe_improvvisate;
      esito.usa_rifiutati += riparazione.usa_rifiutati;
      esito.scartate += riparazione.scartate;
      esito.scartate_assenti += riparazione.scartate_assenti;
      esito.scartate_segreti += riparazione.scartate_segreti;
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

    // B2: il segno di un orologio era dovuto ma il selettore non l'ha usato → lo mette il Motore,
    // orologio per orologio (al massimo due), dopo le risposte e prima della frase d'invito
    // (deterministico, nessun token in più).
    const segniAggiunti: string[] = [];
    if (this.statoRepertorio && this.turnoB?.dovuti.size && esito.esito && !controllo.signal.aborted) {
      for (const idOrologio of this.turnoB.dovuti) {
        if (segniInRisposta.orologi.has(idOrologio)) continue;
        const aggiunto = this.aggiungiSegnoDovuto(turno, esito, segniInRisposta, log, (b) => b.tipo === 'segno_orologio' && b.effetti.avanza_orologio === idOrologio, idOrologio);
        if (aggiunto) {
          segniAggiunti.push(aggiunto.id);
          esito.righe_prescritte += aggiunto.righe;
        }
      }
    }
    // Il finale: a orologio della scena completo il Motore fa dire il finale disponibile (e la sua
    // chiusura), poi il tavolo va in pausa e decide il master (docs/repertorio.md, «Il finale»).
    let finale: string | null = null;
    if (this.statoRepertorio && esito.esito && !controllo.signal.aborted) {
      const f = this.finaleDelMotore(turno, esito, segniInRisposta, log);
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
        this.statoRepertorio && esito.esito ? this.aggiungiSegnoDovuto(turno, esito, segniInRisposta, log, (b) => (b.tipo === 'segno_orologio' && segnoDovutoDi(b, this.turnoB?.dovuti)) || b.riempitivo) : null;
      if (rimedio) esito.righe_prescritte += rimedio.righe;
      else this.parlaRiserva(turno);
      log.warn({ turno, scartate: esito.scartate, rimedio: rimedio?.id ?? 'mossa morbida' }, 'stallo: narrazione fuori dalla finzione, rimedio del Motore');
    }
    this.controlloLlm = null;

    // Orologi: il narratore propone, il Motore controlla (un segno per orologio, al massimo due
    // orologi per risposta, il ritmo massimo di ciascuno). In modalità repertorio i segni sono
    // battute: la riga [orologio] non vale.
    const esitiOrologi: Array<{ id: string; ok: boolean; motivo?: string; stato?: string }> = [];
    for (const id of this.statoRepertorio ? [] : esito.orologi) {
      const a = this.orologi.avanza(id, turno, { inRisposta: segniInRisposta.orologi, ritmo: true });
      esitiOrologi.push(a.ok ? { id, ok: true, stato: `${a.orologio.pieni}/${a.orologio.segmenti}` } : { id, ok: false, motivo: a.motivo });
      if (a.ok) {
        segniInRisposta.orologi.add(id);
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
      this.uscita?.avviso('errore', testoFisso('regia.avvisi.narratore_muto'));
      this.parlaRiserva(turno);
    }

    this.sorvegliante.batti('llm: fine, si aspetta la voce');
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
      // Righe improvvisate di PNG fuori dalla scena, scartate prima della voce (narraTurno, `presenti`).
      righe_png_assenti: esito.scartate_assenti,
      // Righe improvvisate al tavolo fermate dalla guardia dei segreti (spostate al telefono o sostituite).
      righe_segrete_fermate: esito.scartate_segreti,
      // Selettore: «> pg» dedotti o corretti dal Motore; battute indicate dalla preselezione e quante sono uscite.
      pg_dedotti: this.pgDedotti,
      battute_indicate: this.turnoB?.indicate.size ?? 0,
      battute_indicate_usate: esito.uscita.filter((u) => u.tipo === 'usa' && !!this.turnoB?.indicate.has(u.id)).length,
      azioni_pubbliche: pubbliche.size,
      azioni_senza_risposta: senzaRisposta.length,
      riparazioni,
      // Il primo segno aggiunto dal Motore (come prima) e tutti quelli del turno (uno per orologio dovuto).
      segno_aggiunto: segniAggiunti[0] ?? null,
      segni_aggiunti: segniAggiunti,
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
    // [ritmo] del narratore: vale dalla finestra che si apre adesso.
    if (esito.ritmo) this.impostaRitmo(esito.ritmo, 'narratore');
    if (this.statoRepertorio && this.sceneggiatore) this.chiediAlloSceneggiatore(turno, azioni, esito.uscita);
    this.fineNarrazione(esito.invito ?? 'tutti');
  }

  /**
   * Un flusso asincrono della narrazione (o dell'apertura) è caduto con un'eccezione: se è ancora
   * quello in corso, il gioco riparte subito come per un blocco (invece di restare appeso).
   */
  private dopoEccezione(epoca: number, turno: number, fase: string, err: unknown): void {
    this.o.log.error({ turno, fase, err: (err as Error)?.message ?? String(err), stack: (err as Error)?.stack }, 'regia: eccezione nel flusso della narrazione');
    if (epoca !== this.epoca || !this.narrazioneInCorso) return;
    this.riprendiDopoBlocco({ turno, fase, ultimo: `eccezione: ${(err as Error)?.message ?? String(err)}`, fermo_ms: 0, durata_ms: 0 });
  }

  /**
   * Il sorvegliante ha visto un'attesa senza segni di vita (o un flusso è caduto): si registra la
   * causa, si fermano LLM e voce, e il gioco riparte con una finestra per tutti. Se il narratore
   * non aveva detto niente del turno, le azioni tornano ai giocatori (non sono state risolte) e
   * resta una breve riserva del narratore, solo testo.
   */
  private riprendiDopoBlocco(b: BloccoSorvegliato): void {
    if (!this.narrazioneInCorso) return;
    const turno = this.turno;
    const fase = this.fase;
    const causa = b.ultimo.startsWith('eccezione')
      ? b.ultimo
      : this.controlloLlm
        ? 'il modello non risponde'
        : this.attesaAudio
          ? 'lo schermo non ha detto che l’audio è finito'
          : 'la voce non ha finito le frasi del turno';
    const inCodaVoce = this.pipeline.inCoda;
    const detto = this.trascrizione.some((v) => v.turno === turno && (v.tipo === 'narrazione' || v.tipo === 'battuta'));
    this.interrompiFlussi('sorvegliante');
    this.primoAudioInviato.delete(turno);
    const annullate = fase === 'narrazione' && !detto ? this.tavolo.annullaChiuse(turno, testoFisso('regia.motivi.blocco')) : [];
    if (!detto && fase === 'narrazione') this.trascriviFrase(turno, ID_NARRATORE, NOME_NARRATORE, testoFisso('regia.narratore.riserva_blocco'), 998);
    const riga = testoFisso('regia.righe.blocco');
    this.rigaDiSistema(turno, riga);
    this.o.log.error({ turno, fase, causa, ultimo: b.ultimo, fermo_ms: b.fermo_ms, durata_ms: b.durata_ms, voce_in_coda: inCodaVoce, detto, azioni_annullate: annullate }, 'sorvegliante: attesa bloccata, il gioco riparte');
    this.o.registroNarrazioni.scrivi({ sessione: this.sessione, turno, tipo: 'sorvegliante', fase, causa, ultimo: b.ultimo, fermo_ms: b.fermo_ms, azioni_annullate: annullate });
    this.uscita?.avviso('errore', riga);
    this.versioneScena += 1;
    this.fineNarrazione('tutti');
  }

  /**
   * Fatti scoperti e catalogo B2 del turno: solo battute pertinenti alle azioni a cui possono
   * rispondere (le pubbliche; le private solo per le battute con `richiede.privata`, e `da_pg` solo
   * per quei PG), il segno se è dovuto, le battute per stato dell'orologio, i riempitivi allo stallo.
   */
  private elencoRepertorio(r: RiepilogoChiusura): { fattiScoperti: string[]; indicate: string[]; battuteDisponibili: string; stallo: boolean; menzogne: string[]; attesa: string } {
    const s = this.statoRepertorio!;
    // «Stallo»: una finestra chiusa senza nessuna azione (scadenza concitata o Risolvi ora a mani vuote).
    const stallo = r.azioni.length === 0;
    // Il segno dovuto è di un orologio preciso: in catalogo entrano solo i segni degli orologi dovuti.
    const dovuti = new Set(this.orologi.dovuti(r.turno).map((o) => o.id));
    // Le prove riuscite dell'azione aprono le battute col cancello `richiede.prova`.
    const azioni = r.azioni.map((a) => ({ autore: a.autore, testo: a.testo, privata: a.privata, prove: this.riuscitePerAzione.get(a.id) ?? [] }));
    const { battute: catalogoPieno, trattenute, perche } = s.catalogo({ turno: r.turno, azioni, stallo, dovuti, nomiPng: this.nomiPng, parole: this.o.paroleSegrete ?? [] });
    // Preselezione deterministica: per ogni azione le battute i cui temi QUELL'azione tocca; vanno in
    // testa al catalogo e in una sezione loro, con il «> pg» già scritto.
    // Un finale per scena: detto quello, gli altri finali escono dal catalogo del selettore.
    const catalogo = this.sceneConFinale.has(this.campagna.scena.id) ? catalogoPieno.filter((b) => b.tipo !== 'finale') : catalogoPieno;
    const perAzione = s.indicatePerAzioni(catalogo, azioni, this.nomiPng);
    const indicate = new Map(perAzione.flatMap((x) => x.ids.map((id) => [id, x.autore] as const)));
    const battute = [...catalogo.filter((b) => indicate.has(b.id)), ...catalogo.filter((b) => !indicate.has(b.id))];
    this.elencoTurno = new Set(battute.map((b) => b.id));
    // Lettore minimo: le battute d'attesa (riempitivi, di solito solo allo stallo) per le azioni senza battuta.
    const attesa =
      this.o.attesaNelCatalogo && !stallo
        ? s.catalogo({ turno: r.turno, azioni, stallo: true, dovuti, nomiPng: this.nomiPng, parole: this.o.paroleSegrete ?? [] }).battute.filter((b) => b.riempitivo && !this.elencoTurno.has(b.id))
        : [];
    for (const b of attesa) this.elencoTurno.add(b.id);
    this.turnoB = {
      azioni: new Map(r.azioni.map((a) => [a.autore, { id: a.id, privata: a.privata, testo: a.testo, prove: this.riuscitePerAzione.get(a.id) ?? [] }])),
      stallo,
      dovuti,
      indicate,
    };
    this.o.log.info({ turno: r.turno, catalogo: battute.length, perche, trattenute, stallo, dovuti: [...dovuti], indicate: Object.fromEntries(perAzione.map((x) => [x.autore, x.ids])) }, 'repertorio: catalogo del turno');
    return {
      fattiScoperti: s.fattiScoperti.map((id) => `${id} — ${this.testoFatto(id)}`),
      indicate: perAzione.map((x) => `- ${x.autore} (${this.nomePg(x.autore)}): ${x.ids.map((id) => `[usa] ${id} > ${x.autore}`).join(` ${testoFisso('regia.modello.oppure')} `)}`),
      battuteDisponibili: s.elencoDisponibili(battute),
      attesa: s.elencoDisponibili(attesa),
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
    segni: SegniInRisposta,
    log: Logger,
    /** Quale battuta del catalogo far uscire (predefinito: un segno d'orologio). */
    scegli: (b: Battuta) => boolean = (b) => b.tipo === 'segno_orologio',
    /** L'orologio dovuto (per il log). */
    orologio: string | null = null,
  ): { id: string; righe: number } | null {
    const s = this.statoRepertorio!;
    const b = s.disponibili(turno).find((x) => scegli(x) && this.elencoTurno.has(x.id));
    if (!b) {
      log.warn({ turno, orologio }, 'orologio: segno dovuto ma nessuna battuta di segno disponibile');
      return null;
    }
    return this.aggiungiBattutaMotore(turno, esito, segni, log, b, false);
  }

  /**
   * Il finale del Motore: se in questa risposta il selettore ha già usato un finale, oppure un
   * orologio della scena è completo e c'è un finale disponibile (StatoRepertorio.finaleDelMotore),
   * lo fa dire, poi la chiusura se c'è; l'invito del narratore, se non è ancora partito, si ritira.
   * A narrazione finita il tavolo va in pausa (fineNarrazione). null = nessun finale in questo turno.
   */
  private finaleDelMotore(turno: number, esito: { uscita: VoceUscita[] }, segno: SegniInRisposta, log: Logger): { finale: string; righe: number } | null {
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
      if (this.sceneConFinale.has(this.campagna.scena.id)) return null; // la scena ha già avuto il suo finale
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
    this.sceneConFinale.add(this.campagna.scena.id);
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
  private aggiungiBattutaMotore(turno: number, esito: { uscita: VoceUscita[] }, segno: SegniInRisposta, log: Logger, b: Battuta, inFondo: boolean): { id: string; righe: number } | null {
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
    // Le righe private (`[privato pg_x]`) non rispondono a un'azione pubblica: il tavolo non le sente.
    const testoImprovvisato = normalizza(uscita.filter((u) => u.tipo === 'improvvisata' && !u.privato).map((u) => (u.tipo === 'improvvisata' ? u.testo : '')).join('\n'));
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
  /** Una frase privata: si unisce alla sua riga e il telefono di quel PG riceve l'elenco aggiornato. */
  private frasePrivata(turno: number, f: { etichetta: string; nome: string; testo: string; segmento: number; id_pg: string }): void {
    const chiave = `${turno}:${f.segmento}`;
    const aperta = this.privatiAperti.get(chiave);
    if (aperta) aperta.testo = `${aperta.testo} ${f.testo}`;
    else {
      const esito: EsitoPrivato = { id: `p${turno}-${f.segmento}`, turno, id_pg: f.id_pg, chi: f.etichetta, nome: f.nome, testo: f.testo };
      this.privati.push(esito);
      this.privatiAperti.set(chiave, esito);
    }
    this.o.log.info({ turno, id_pg: f.id_pg, chi: f.etichetta, caratteri: f.testo.length }, 'narratore: esito privato');
    this.uscita?.privati?.(f.id_pg, this.esitiPrivati(f.id_pg));
  }

  /** Gli esiti privati di un PG (per il suo telefono, anche quando lo sceglie o si riconnette). */
  esitiPrivati(id_pg: string): EsitoPrivato[] {
    return this.privati.filter((v) => v.id_pg === id_pg).map((v) => ({ ...v }));
  }

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
    const testo = typeof mossa === 'string' && mossa.trim() ? mossa.trim() : testoFisso('regia.narratore.riserva_turno');
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
    // Attesa lunga ma prevista: il sorvegliante aspetta l'audio del turno, più il margine.
    this.sorvegliante.batti('audio: in riproduzione sul proiettore', secondi * 1000 + this.o.margineFineAudioMs);
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
