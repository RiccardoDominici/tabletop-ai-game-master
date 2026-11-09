/**
 * Interfaccia comune dei motori vocali (TtsProvider dell'architettura, §5).
 * Il contratto è quello del servizio voce di docs/f0-contratti.md: PCM s16le mono in streaming.
 */

export type NomeMotoreVoce = 'qwen' | 'mock' | 'fish';

export interface SaluteVoce {
  pronto: boolean;
  modello: string;
  sample_rate: number;
  formato: 'pcm_s16le';
  voci: string[];
}

export interface RichiestaTts {
  /** Id univoco (anche per /annulla). */
  id: string;
  /** voce_id del registro (narratore, vincent, nadine, …). */
  voce: string;
  /** Solo parole, senza markup espressivo (Qwen e il finto leggerebbero direzioni e tag). */
  testo: string;
  /**
   * Testo per i motori espressivi (drama-3): direzione, suoni e tag bilanciati, già passati dalla
   * guardia di voce/espressione.ts. Lo prepara la pipeline solo se il motore ha `espressivo`.
   */
  espressivo?: string;
}

export interface FlussoTts {
  sampleRate: number;
  /** Pezzi PCM nell'ordine in cui il motore li produce. */
  pezzi: AsyncIterable<Uint8Array>;
  /** Motore che ha parlato davvero (con la riserva può non essere quello scelto). */
  motore?: NomeMotoreVoce;
  /** Costo stimato della richiesta in dollari (motori a pagamento), noto alla partenza. */
  costo_usd?: number;
  /** Byte UTF-8 del testo mandato (la tariffa di drama-3 è per byte). */
  byte_testo?: number;
}

export class ErroreVoce extends Error {
  override name = 'ErroreVoce';
  constructor(
    message: string,
    /** 404 = voce inesistente, 400 = testo vuoto, 0 = rete/servizio giù. */
    readonly stato: number,
  ) {
    super(message);
  }
}

export interface MotoreVoce {
  readonly nome: NomeMotoreVoce;
  /** Capisce direzioni, suoni e tag (drama-3): la pipeline gli prepara `espressivo`. */
  readonly espressivo?: boolean;
  salute(signal?: AbortSignal): Promise<SaluteVoce>;
  /**
   * Avvia la sintesi. Interrompere `signal` deve fermare la generazione (il servizio vero
   * si ferma quando il client chiude la connessione).
   */
  sintetizza(richiesta: RichiestaTts, signal: AbortSignal): Promise<FlussoTts>;
  /**
   * Facoltativo, non bloccante: «sveglia» il modello dopo una pausa (POST /sveglia del servizio),
   * così la prima frase vera non paga il primo audio lento. Si chiama alla chiusura della finestra.
   */
  sveglia?(): Promise<void>;
}
