/**
 * @cantastorie/shared — eventi Socket.IO tipizzati (F0).
 *
 * Stanze lato server:
 * - "tavolo": tutti i telefoni e lo schermo (stato, trascrizione, metriche);
 * - "schermo": solo lo schermo dopo «Inizia sessione» (audio);
 * - "player:<id_pg>": i telefoni che hanno scelto quel PG (azione privata);
 * - "ascolto": i telefoni con «Ascolta qui» acceso (la voce del gioco anche sul telefono);
 * - "ascolto:<id_pg>": quelli che hanno anche scelto quel PG (la voce di un esito privato, solo lì);
 * - "master": il pannello del master, entrato col token del log del server (mai i telefoni).
 *
 * L'audio viaggia come PCM s16le mono in binario (Buffer lato server, ArrayBuffer lato browser).
 * Ogni frase è annunciata da `audio:frase`, seguita da N `audio:pezzo` e chiusa da `audio:fine_frase`.
 * `audio:fine_turno` dice che il turno non avrà altre frasi.
 */
import type { AzionePrivata, MisureTurno, SchedaPg, StatoTavolo } from './dominio';
import type { ComandoMaster, EsitoEntrataMaster, StatoMaster } from './master';

/** Risposta standard agli eventi con conferma (ack). */
export type Esito = { ok: true } | { ok: false; errore: string };

/** Annuncio di una frase che sta per arrivare in audio. */
export interface AudioFrase {
  /** Id univoco della frase (anche id della richiesta al servizio voce). */
  id_frase: string;
  turno: number;
  /** Progressivo della frase nel turno (0 = prima). */
  indice: number;
  /** Id di chi parla: 'narratore' o id_png. */
  parlante: string;
  /** Nome da mostrare sotto il parlante. */
  nome: string;
  /** Testo della frase (sottotitolo). */
  testo: string;
  /** Frequenza di campionamento del PCM che seguirà. */
  sample_rate: number;
  /** Effetto del catalogo audio (sfx_<tag>) da far partire insieme alla frase. */
  effetto?: string;
  /**
   * Frase privata (l'esito di un'azione privata): la sua voce va SOLO ai telefoni di quel PG con
   * «Ascolta qui» acceso, mai al proiettore né agli altri telefoni.
   */
  solo_pg?: string;
}

/** Pezzo di audio di una frase: PCM s16le mono, lunghezza sempre pari (campioni interi). */
export interface AudioPezzo {
  id_frase: string;
  /** Progressivo del pezzo nella frase (0 = primo). */
  seq: number;
  /** Byte PCM. Lato server è un Buffer, lato browser arriva come ArrayBuffer. */
  pcm: ArrayBuffer | Uint8Array;
}

export interface AudioFineFrase {
  id_frase: string;
  turno: number;
  /** Secondi di audio inviati per la frase. */
  secondi: number;
  /** La frase è stata interrotta o è fallita (l'audio può essere parziale). */
  interrotta: boolean;
}

export interface AudioFineTurno {
  turno: number;
  /** Numero di frasi del turno. */
  frasi: number;
  /** Effetti (sfx_<tag>) da suonare quando la voce del turno è finita (un [effetto] dopo l'ultima frase). */
  effetti?: string[];
}

/**
 * Esito di un'azione privata (riga `[privato pg_x]` del narratore, o battuta che risponde a un'azione
 * privata): solo per il telefono di quel PG, mai per il proiettore né la trascrizione pubblica. Una voce
 * per riga (le frasi della stessa riga si uniscono).
 */
export interface EsitoPrivato {
  id: string;
  turno: number;
  id_pg: string;
  /** Chi parla: 'narratore' o id_png. */
  chi: string;
  nome: string;
  testo: string;
}

/** Lo schermo avvisa che il primo pezzo di un turno ha cominciato a suonare davvero. */
export interface SchermoAudioIniziato {
  turno: number;
  id_frase: string;
  /**
   * Da quanti ms il suono è uscito, misurato sul client nel momento dell'invio
   * (≥ 0; include la latenza d'uscita dell'AudioContext). Il server sottrae questo valore
   * all'istante di ricezione.
   */
  ritardo_ms: number;
}

/** Lo schermo avvisa che l'ultimo pezzo del turno ha finito di suonare. */
export interface SchermoAudioFinito {
  turno: number;
  ritardo_ms: number;
  /** Buchi (underrun) contati durante il turno: un pezzo programmato dopo la fine del precedente. */
  buchi: number;
  /** Di cui a metà frase (il suono inciampa). */
  buchi_in_frase: number;
  /** Di cui all'inizio di una frase (pausa più lunga tra due frasi). */
  buchi_tra_frasi: number;
  /** Silenzio totale inserito dai buchi (ms). */
  silenzio_ms: number;
}

/** Informazioni di rete per il QR del proiettore. */
export interface InfoServer {
  url_telefono: string;
  url_schermo: string;
  ip_lan: string;
  porta: number;
  /** QR del link per i telefoni, come SVG pronto da inserire. */
  qr_svg: string;
}

export interface EventiServerVersoClient {
  stato: (stato: StatoTavolo) => void;
  /** Al telefono che ha scelto il PG: la propria azione (null = nessuna). */
  'azione:mia': (azione: AzionePrivata | null) => void;
  /** Al telefono che ha scelto il PG: tutti i suoi esiti privati della scena (a ogni novità e alla scelta). */
  'privato:esiti': (esiti: EsitoPrivato[]) => void;
  /** Al telefono che ha scelto il PG: la sua scheda, con le conoscenze private. */
  'pg:scheda': (scheda: SchedaPg) => void;
  'metriche:turno': (misure: MisureTurno) => void;
  avviso: (avviso: { livello: 'info' | 'errore'; testo: string }) => void;
  'audio:frase': (frase: AudioFrase) => void;
  'audio:pezzo': (pezzo: AudioPezzo) => void;
  'audio:fine_frase': (fine: AudioFineFrase) => void;
  'audio:fine_turno': (fine: AudioFineTurno) => void;
  /** Interrompi subito tutto l'audio in coda (scena fermata). */
  'audio:interrompi': () => void;
  /** Suona un effetto del catalogo audio (comando del master). */
  'audio:effetto': (effetto: { id: string }) => void;
  /** Solo alla stanza "master": istantanea completa per il pannello. */
  'master:stato': (stato: StatoMaster) => void;
}

export interface EventiClientVersoServer {
  /** Telefono: entra nel tavolo e riceve lo stato. */
  'telefono:entra': (ack: (stato: StatoTavolo) => void) => void;
  /** Telefono: sceglie (o cambia) il PG; entra nella stanza player:<id_pg>. */
  'telefono:scegli_pg': (dati: { id_pg: string; dispositivo?: string }, ack: (esito: Esito) => void) => void;
  /**
   * Telefono: si presenta col token del dispositivo (localStorage). Se il server lo conosce (anche da
   * una sessione ripresa dopo un riavvio) risponde col PG che quel telefono aveva scelto.
   */
  'telefono:dispositivo': (dati: { dispositivo: string }, ack: (risposta: { id_pg: string | null }) => void) => void;
  /**
   * Telefono: «Ascolta qui» acceso o spento. Acceso = entra nella stanza "ascolto" (e in
   * "ascolto:<id_pg>" se ha scelto un PG) e riceve gli stessi `audio:*` del proiettore.
   */
  'telefono:ascolta': (dati: { attivo: boolean }, ack: (esito: Esito) => void) => void;
  /**
   * Invia (o sostituisce: una sola azione per giocatore per finestra) l'azione del PG. Si può
   * inviare sempre, anche mentre il narratore parla: allora entra nella finestra successiva.
   * `versione_vista` è quella fissata dal telefono al primo tasto.
   */
  'azione:invia': (
    dati: { id_pg: string; testo: string; versione_vista: number; privata?: boolean },
    ack: (esito: Esito) => void,
  ) => void;
  /** «Confermo» / «Tengo» su un'azione da confermare. */
  'azione:conferma': (dati: { id_pg: string }, ack: (esito: Esito) => void) => void;
  /**
   * Il giocatore sta scrivendo (al primo tasto e poi al massimo una volta al secondo): fissa la
   * versione vista e allunga di poco l'assestamento prima della chiusura (indicatore degli ultimi
   * 3 s), per un «anch'io» in arrivo. Non fa partire nessun conto alla rovescia.
   */
  'azione:scrivo': (dati: { id_pg: string; versione_vista: number }) => void;
  'azione:ritira': (dati: { id_pg: string }, ack: (esito: Esito) => void) => void;
  /** Risincronizzazione: risponde con lo stato corrente. */
  'stato:richiedi': (ack: (stato: StatoTavolo) => void) => void;

  /** Schermo: osserva il tavolo (stato, QR) prima di «Inizia sessione». */
  'schermo:osserva': (ack: (risposta: { stato: StatoTavolo; info: InfoServer }) => void) => void;
  /** Schermo: audio sbloccato; entra nella stanza "schermo" e avvia (o riprende) la scena. */
  'schermo:inizia': (ack: (esito: Esito) => void) => void;
  'schermo:audio_iniziato': (dati: SchermoAudioIniziato) => void;
  'schermo:audio_finito': (dati: SchermoAudioFinito) => void;

  /** Ferma la scena: interrompe LLM e voce. */
  'scena:ferma': (ack: (esito: Esito) => void) => void;
  /** Ricomincia la scena dall'apertura (azzera trascrizione e turni). */
  'scena:ricomincia': (ack: (esito: Esito) => void) => void;

  /** Pannello del master: entra nella stanza "master" col token stampato nel log all'avvio. */
  'master:entra': (dati: { token: string }, ack: (esito: EsitoEntrataMaster) => void) => void;
  /** Pannello del master: un comando (solo dopo `master:entra` riuscito). */
  'master:comando': (comando: ComandoMaster, ack: (esito: Esito) => void) => void;
}

/** Porte fissate dal contratto F0. */
export const PORTA_SERVER = 4610;
export const PORTA_VOCE = 4611;
export const PORTA_VITE = 4612;
