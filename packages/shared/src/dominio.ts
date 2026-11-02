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
  /**
   * Tavolo in pausa dal pannello del master: nessuna nuova finestra e nessuna narrazione finché
   * il master non riprende. I telefoni possono scrivere (l'azione entra alla ripresa).
   */
  | 'pausa'
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

/**
 * Scheda del PG per il SUO telefono (stanza player:<id_pg>): include le conoscenze private,
 * che non vanno mai al tavolo, allo schermo o al narratore (T9).
 */
export interface SchedaPg {
  id_pg: string;
  nome: string;
  descrizione: string;
  /** Sezioni leggibili (Chi sei, Il tuo aggancio, Cosa sai fare…), nell'ordine della scheda. */
  sezioni: Array<{ titolo: string; righe: string[] }>;
  /** Cose che sa solo questo PG: il giocatore decide se e quando dirle. */
  conoscenze_private: string[];
  /** Situazione comune a tutto il gruppo. */
  situazione_comune: string | null;
}

/**
 * Stato di un'azione (docs/azioni-concorrenti.md). «In coda» e «da confermare» restano distinti:
 * solo il secondo chiede una scelta al giocatore.
 */
export type StatoAzione =
  /** Inviata: aspetta la chiusura della finestra; si può modificare o ritirare. */
  | 'in_coda'
  /** Qualcosa l'ha toccata: il giocatore sceglie Confermo (o Tengo) / Cambio / Ritiro. */
  | 'da_confermare'
  /** Ritirata dall'autore. */
  | 'ritirata'
  /** Entrata nel gruppo che il narratore sta risolvendo: non si tocca più. */
  | 'chiusa'
  /** Il narratore l'ha risolta. */
  | 'risolta'
  /** Non eseguita: la scena o un'altra azione l'hanno resa impossibile (vedi `motivo`). Si riscrive. */
  | 'superata'
  /** Era da confermare e il tempo è scaduto: esclusa dal turno. Si riscrive. */
  | 'sospesa';

/** Presenza di un invitato nella finestra corrente (senza il testo). */
export interface AzionePubblica {
  id_pg: string;
  /** Il PG ha un'azione inviata e valida in questa finestra. */
  scritta: boolean;
  pronto: boolean;
}

/** Scelta chiesta al giocatore quando la sua azione passa a «da confermare». */
export interface RichiestaScelta {
  tipo: 'dipendenza' | 'conflitto' | 'vecchia';
  /** Cosa è successo e cosa si può fare, in parole semplici (mai il contenuto di azioni private altrui). */
  testo: string;
  /** Etichetta del pulsante per tenere l'azione: «Confermo», oppure «Tengo» nei conflitti. */
  conferma: 'Confermo' | 'Tengo';
  /**
   * Scelta da mettere in evidenza: «cambio» quando l'azione ha perso il suo appoggio (dipendenza
   * rotta, conflitto perso), «conferma» quando probabilmente vale ancora (azione vecchia dubbia).
   */
  consigliato: 'conferma' | 'cambio';
  /** Epoch ms (orologio del server) oltre cui l'azione diventa «sospesa»; null = non ancora fissato. */
  scadenza_ms: number | null;
}

/** La mia azione, mandata solo al telefono di chi l'ha scritta (stanza player:<id_pg>). */
export interface AzionePrivata {
  id: string;
  id_pg: string;
  /** Testo corrente: anche quando è superata o sospesa resta qui, pronto da riscrivere. */
  testo: string;
  privata: boolean;
  stato: StatoAzione;
  /** Frase breve quando lo stato cambia per cause esterne. */
  motivo: string | null;
  /** Presente quando lo stato è «da_confermare». */
  richiesta: RichiestaScelta | null;
  pronto: boolean;
  /** Ultima narrazione che il giocatore aveva ricevuto quando ha cominciato a scrivere. */
  versione_vista: number;
  /** Turno (finestra) in cui l'azione entra. */
  turno: number;
  /** Epoch ms del primo invio (decide l'ordine: prima scrive, prima arriva). */
  inviata_alle: number;
}

/** Azione pubblica di un altro giocatore, nella sezione «Al tavolo» dei telefoni. */
export interface AzioneAlTavolo {
  id: string;
  id_pg: string;
  nome: string;
  testo: string;
  stato: StatoAzione;
  /** Nomi dei PG alle cui azioni questa si collega («anch'io», «lo seguo»…). */
  dipende_da: string[];
  /** Turno (finestra) in cui l'azione entra: maggiore di quello aperto = aspetta il prossimo. */
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
  /** Luogo corrente: id della scena o del nodo (cambia quando il gruppo si sposta). */
  luogo: string;
  /** URL dell'immagine del luogo corrente; null se manca (lo schermo usa lo sfondo d'atmosfera). */
  immagine: string | null;
  /** Ritratti dei PNG che ne hanno uno: id_png → URL. Il narratore non ha ritratto. */
  ritratti: Record<string, string>;
  /** URL da precaricare (luoghi vicini, ritratti dei PNG presenti), nell'ordine di probabilità. */
  prossime: string[];
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
  /** Azioni pubbliche in attesa (in coda o da confermare) di tutti i giocatori: «Al tavolo». */
  al_tavolo: AzioneAlTavolo[];
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
  /** ms da t0 alla chiamata (non bloccante) di POST /sveglia al servizio voce; null se non chiamata. */
  voce_sveglia: number | null;
  /** Buchi di riproduzione riferiti dallo schermo (null se lo schermo non ha riferito). */
  buchi: number | null;
  buchi_in_frase: number | null;
  buchi_tra_frasi: number | null;
  silenzio_ms: number | null;
  token_ingresso: number;
  token_uscita: number;
  token_cache_lettura: number;
  token_cache_scrittura: number;
  costo_usd: number;
}
