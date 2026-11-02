/**
 * @cantastorie/shared — tipi di dominio condivisi tra server, telefono e schermo (F0).
 *
 * Tutto ciò che viaggia su Socket.IO è descritto qui. Il server è l'unica fonte di verità:
 * telefono e schermo ricevono istantanee (`StatoTavolo`) con un numero di versione e si
 * risincronizzano chiedendo `stato:richiedi` quando si riconnettono.
 */

/** Fasi della scena, nell'ordine in cui normalmente si susseguono. */
export type FaseScena =
  /** Scena caricata, nessuno ha ancora premuto «Inizia sessione» sullo schermo. */
  | 'attesa'
  /** Il narratore legge il testo d'apertura della scena. */
  | 'apertura'
  /** Finestra delle azioni aperta: gli invitati scrivono, modificano, ritirano, premono «pronto». */
  | 'finestra'
  /** Finestra chiusa: Haiku narra, la voce parla, lo schermo suona. */
  | 'narrazione'
  /** Scena fermata a mano (interrompe LLM e voce). */
  | 'fermata';

/** Personaggio giocante come lo vedono i telefoni (dati pubblici da pg.yaml). */
export interface PgPubblico {
  id: string;
  nome: string;
  /** Una riga leggibile: razza, classe, tratto. Può essere vuota. */
  descrizione: string;
  /** Quanti telefoni hanno scelto questo PG in questo momento. */
  telefoni: number;
}

/** Stato di un'azione scritta da un giocatore. */
export type StatoAzione =
  /** Inviata, finestra ancora aperta: si può modificare o ritirare. */
  | 'in_coda'
  /** Finestra chiusa, il narratore la sta risolvendo. */
  | 'in_risoluzione'
  /** Narrazione del turno finita. */
  | 'risolta'
  /** Ritirata dal giocatore prima della chiusura. */
  | 'ritirata';

/** Riepilogo pubblico dell'azione di un PG nella finestra corrente (senza il testo). */
export interface AzionePubblica {
  id_pg: string;
  /** Il PG ha un'azione inviata (non ritirata). */
  scritta: boolean;
  pronto: boolean;
}

/** Azione completa, mandata solo al telefono di chi l'ha scritta (stanza player:<id_pg>). */
export interface AzionePrivata {
  id_pg: string;
  testo: string;
  stato: StatoAzione;
  pronto: boolean;
  /** Versione della scena su cui l'azione è stata scritta. */
  versione_scena: number;
  /** Turno in cui l'azione è stata (o sarà) risolta. */
  turno: number;
}

/** Finestra delle azioni (vuota quando chiusa). */
export interface FinestraPubblica {
  aperta: boolean;
  /** Turno che la finestra prepara (il turno di narrazione che seguirà la chiusura). */
  turno: number;
  invitati: string[];
  azioni: AzionePubblica[];
  /** Epoch ms in cui la finestra si chiuderà da sola (10 s dopo la prima azione), se fissato. */
  chiusura_prevista_ms: number | null;
}

/** Voce della trascrizione pubblica. */
export interface VoceTrascrizione {
  /** Progressivo stabile, utile come key React. */
  id: number;
  turno: number;
  tipo: 'narrazione' | 'battuta' | 'azione' | 'sistema';
  /** Id di chi parla: 'narratore', id_png, id_pg, oppure 'sistema'. */
  chi: string;
  /** Nome da mostrare. */
  nome: string;
  testo: string;
}

/** Scena come la vede lo schermo. */
export interface ScenaPubblica {
  id_campagna: string;
  titolo: string;
  /** Tag d'atmosfera (musica.tag della scena), usato per lo sfondo. */
  umore: string;
  /** Intensità 1–5 (per lo sfondo), se indicata. */
  intensita: number | null;
}

/** Istantanea completa del tavolo, mandata a ogni cambiamento. */
export interface StatoTavolo {
  /** Cresce a ogni cambiamento dello stato: serve alla risincronizzazione. */
  versione_stato: number;
  /** Cresce a ogni narrazione risolta: viene timbrata sulle azioni. */
  versione_scena: number;
  fase: FaseScena;
  /** Turno corrente (0 = apertura). */
  turno: number;
  scena: ScenaPubblica;
  pg: PgPubblico[];
  finestra: FinestraPubblica;
  /** Ultime voci della trascrizione pubblica (le più vecchie possono essere tagliate). */
  trascrizione: VoceTrascrizione[];
  /** Motore voce in uso: 'qwen' (servizio locale) oppure 'mock'. */
  voce_motore: 'qwen' | 'mock';
  /** Lo schermo ha premuto «Inizia sessione» ed è connesso. */
  schermo_connesso: boolean;
  /**
   * Epoch ms del server quando ha costruito questa istantanea: il client ne ricava lo scarto
   * del proprio orologio, così il conto alla rovescia (`chiusura_prevista_ms`) è giusto anche
   * su un telefono con l'ora sbagliata.
   */
  ora_server_ms: number;
}

/** Misure di latenza di un turno (stessi campi di logs/turni.jsonl, docs/f0-contratti.md). */
export interface MisureTurno {
  turno: number;
  /** ISO 8601 dell'istante di chiusura della finestra (t0). */
  ts: string;
  voce_motore: 'qwen' | 'mock';
  finestra_ms: number;
  llm_primo_token: number | null;
  llm_prima_frase: number | null;
  voce_richiesta: number | null;
  voce_primo_audio: number | null;
  schermo_inizio_audio: number | null;
  llm_fine: number | null;
  audio_fine: number | null;
  token_ingresso: number;
  token_uscita: number;
  token_cache_lettura: number;
  token_cache_scrittura: number;
  costo_usd: number;
}
