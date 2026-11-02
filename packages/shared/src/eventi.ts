/**
 * @cantastorie/shared — eventi Socket.IO tipizzati (F0).
 *
 * Stanze lato server:
 * - "tavolo": tutti i telefoni e lo schermo (stato, trascrizione, metriche);
 * - "schermo": solo lo schermo dopo «Inizia sessione» (audio);
 * - "player:<id_pg>": i telefoni che hanno scelto quel PG (azione privata).
 *
 * L'audio viaggia come PCM s16le mono in binario (Buffer lato server, ArrayBuffer lato browser).
 * Ogni frase è annunciata da `audio:frase`, seguita da N `audio:pezzo` e chiusa da `audio:fine_frase`.
 * `audio:fine_turno` dice che il turno non avrà altre frasi.
 */
import type { AzionePrivata, MisureTurno, SchedaPg, StatoTavolo } from './dominio';

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
  /** Buchi (underrun) contati durante il turno. */
  buchi: number;
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
}

export interface EventiClientVersoServer {
  /** Telefono: entra nel tavolo e riceve lo stato. */
  'telefono:entra': (ack: (stato: StatoTavolo) => void) => void;
  /** Telefono: sceglie (o cambia) il PG; entra nella stanza player:<id_pg>. */
  'telefono:scegli_pg': (dati: { id_pg: string }, ack: (esito: Esito) => void) => void;
  'azione:invia': (
    dati: { id_pg: string; testo: string; versione_scena: number },
    ack: (esito: Esito) => void,
  ) => void;
  'azione:ritira': (dati: { id_pg: string }, ack: (esito: Esito) => void) => void;
  'azione:pronto': (dati: { id_pg: string; pronto: boolean }, ack: (esito: Esito) => void) => void;
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
}

/** Porte fissate dal contratto F0. */
export const PORTA_SERVER = 4610;
export const PORTA_VOCE = 4611;
export const PORTA_VITE = 4612;
