/**
 * Motore vocale «fish»: fish-audio/drama-3 attraverso OpenRouter (docs/ricerca-voce-drama3.md).
 *
 *   POST https://openrouter.ai/api/v1/audio/speech
 *   {model: 'fish-audio/drama-3', input, voice: <reference_id Fish>, response_format: 'pcm'}
 *   → 200 audio/pcm;rate=44100;channels=1, chunked: PCM s16le mono in streaming (misurato il 9/11/2026)
 *
 * Stesso contratto del servizio Qwen verso la pipeline (FlussoTts): la pipeline non sa chi parla.
 * `sintetizza` si risolve solo quando è arrivato il PRIMO pezzo di audio (entro `primoByteMs`): così
 * un errore o un'attesa troppo lunga si vedono prima che lo schermo abbia annunciato la frase, e la
 * riserva (voce/riserva.ts) può ritentare o passare a Qwen senza audio a metà.
 *
 * Per ogni segmento il log ha: voce, byte del testo, primo byte, totale, secondi di audio, costo stimato.
 * La chiave è SOLO la riga OPENROUTER_API_KEY= del file indicato, letta al primo uso, mai nei log.
 */
import type { Logger } from '../logger';
import { leggiRigaChiave } from '../llm/chiave';
import type { VoceRegistro } from './registro-voci';
import type { FlussoTts, MotoreVoce, RichiestaTts, SaluteVoce } from './tipi';
import { ErroreVoce } from './tipi';

export const MODELLO_FISH = 'fish-audio/drama-3';
/** Tariffa di lancio di drama-3 su OpenRouter: 2 $ per milione di byte UTF-8 del testo (può salire). */
export const DOLLARI_PER_BYTE = 2 / 1_000_000;
const URL_PREDEFINITO = 'https://openrouter.ai/api/v1';
const SAMPLE_RATE_ATTESO = 44_100;

export interface OpzioniFish {
  /** File .env da cui leggere SOLO la riga OPENROUTER_API_KEY=. */
  fileChiave: string;
  voci: Map<string, VoceRegistro>;
  log: Logger;
  /** Tempo massimo per il primo pezzo di audio (poi la richiesta è fallita). */
  primoByteMs?: number;
  /** Tempo massimo senza pezzi nuovi a metà frase. */
  silenzioMs?: number;
  baseUrl?: string;
  /** Per i test: fetch finto. */
  fetch?: typeof fetch;
}

/** Costo stimato di un testo: byte UTF-8 × tariffa. */
export function costoFish(testo: string): { byte: number; usd: number } {
  const byte = Buffer.byteLength(testo, 'utf8');
  return { byte, usd: byte * DOLLARI_PER_BYTE };
}

/**
 * Una lettura del corpo che si arrende quando il segnale scatta (timeout nostri o interruzione): non
 * tutte le implementazioni di fetch chiudono il corpo all'abort, e una lettura appesa bloccherebbe la frase.
 */
function leggi(lettore: ReadableStreamDefaultReader<Uint8Array>, segnale: AbortSignal): Promise<{ done: boolean; value?: Uint8Array }> {
  if (segnale.aborted) return Promise.reject(segnale.reason as Error);
  return new Promise((risolvi, rifiuta) => {
    const via = (): void => rifiuta(segnale.reason as Error);
    segnale.addEventListener('abort', via, { once: true });
    lettore.read().then(
      (r) => {
        segnale.removeEventListener('abort', via);
        risolvi(r);
      },
      (e: unknown) => {
        segnale.removeEventListener('abort', via);
        rifiuta(e as Error);
      },
    );
  });
}

/** Frequenza dal Content-Type («audio/pcm;rate=44100;channels=1»). */
export function sampleRateDa(contentType: string | null): number | null {
  const m = /rate=(\d+)/.exec(contentType ?? '');
  return m ? Number(m[1]) : null;
}

export class MotoreVoceFish implements MotoreVoce {
  readonly nome = 'fish' as const;
  readonly espressivo = true;
  private chiave: string | null = null;
  private readonly primoByteMs: number;
  private readonly silenzioMs: number;
  private readonly baseUrl: string;
  private readonly fetch: typeof fetch;

  constructor(private readonly o: OpzioniFish) {
    this.primoByteMs = o.primoByteMs ?? 6000;
    this.silenzioMs = o.silenzioMs ?? 8000;
    this.baseUrl = o.baseUrl ?? URL_PREDEFINITO;
    this.fetch = o.fetch ?? fetch;
  }

  /** La chiave si legge al primo uso (un errore di file non deve impedire l'avvio del server). */
  private prendiChiave(): string {
    this.chiave ??= leggiRigaChiave(this.o.fileChiave, 'OPENROUTER_API_KEY=');
    return this.chiave;
  }

  async salute(): Promise<SaluteVoce> {
    let pronto = true;
    try {
      this.prendiChiave();
    } catch {
      pronto = false;
    }
    const voci = [...this.o.voci.values()].filter((v) => v.fish).map((v) => v.id);
    return { pronto: pronto && voci.length > 0, modello: MODELLO_FISH, sample_rate: SAMPLE_RATE_ATTESO, formato: 'pcm_s16le', voci };
  }

  /**
   * «Sveglia»: una GET gratuita (/key) apre DNS e TLS verso OpenRouter, così la prima frase del turno
   * trova la connessione già pronta. Al meglio, mai bloccante.
   */
  async sveglia(): Promise<void> {
    const t0 = performance.now();
    try {
      const r = await this.fetch(`${this.baseUrl}/key`, { headers: { authorization: `Bearer ${this.prendiChiave()}` }, signal: AbortSignal.timeout(3000) });
      await r.arrayBuffer().catch(() => undefined);
      this.o.log.debug({ stato: r.status, ms: Math.round(performance.now() - t0) }, 'voce fish: sveglia');
    } catch (err) {
      this.o.log.debug({ err: (err as Error).message }, 'voce fish: sveglia non riuscita');
    }
  }

  async sintetizza(r: RichiestaTts, signal: AbortSignal): Promise<FlussoTts> {
    const input = (r.espressivo ?? r.testo).trim();
    if (!input) throw new ErroreVoce('testo vuoto', 400);
    const voce = this.o.voci.get(r.voce);
    if (!voce?.fish) throw new ErroreVoce(`voce senza reference_id Fish nel registro: ${r.voce}`, 404);
    const { byte, usd } = costoFish(input);
    const log = this.o.log;
    const t0 = performance.now();
    // Un solo controllore per la richiesta: lo ferma chi chiama (interruzione) o un nostro timeout.
    const controllo = new AbortController();
    const inoltra = (): void => controllo.abort(signal.reason);
    if (signal.aborted) throw signal.reason ?? new Error('interrotta');
    signal.addEventListener('abort', inoltra, { once: true });
    let timer: NodeJS.Timeout | null = setTimeout(() => controllo.abort(new ErroreVoce(`nessun audio entro ${this.primoByteMs} ms`, 504)), this.primoByteMs);
    const pulisci = (): void => {
      if (timer) clearTimeout(timer);
      timer = null;
      signal.removeEventListener('abort', inoltra);
    };
    const motivo = (err: unknown): Error => (controllo.signal.reason instanceof ErroreVoce ? controllo.signal.reason : (err as Error));

    let risposta: Response;
    try {
      risposta = await this.fetch(`${this.baseUrl}/audio/speech`, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.prendiChiave()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODELLO_FISH, input, voice: voce.fish, response_format: 'pcm' }),
        signal: controllo.signal,
      });
    } catch (err) {
      pulisci();
      if (signal.aborted) throw err;
      const e = motivo(err);
      throw e instanceof ErroreVoce ? e : new ErroreVoce(`OpenRouter irraggiungibile: ${e.message}`, 0);
    }
    if (!risposta.ok) {
      pulisci();
      let dettaglio = '';
      try {
        const corpo = (await risposta.json()) as { error?: { message?: string; code?: unknown } };
        dettaglio = corpo.error?.message ?? JSON.stringify(corpo).slice(0, 200);
      } catch {
        /* corpo non JSON */
      }
      throw new ErroreVoce(`OpenRouter /audio/speech ${risposta.status}: ${dettaglio}`, risposta.status);
    }
    const sampleRate = sampleRateDa(risposta.headers.get('content-type')) ?? SAMPLE_RATE_ATTESO;
    const corpo = risposta.body;
    if (!corpo) {
      pulisci();
      throw new ErroreVoce('OpenRouter: risposta senza corpo', 502);
    }
    const lettore = corpo.getReader();
    // Primo pezzo di audio: fino a qui un errore si può ancora ritentare.
    let primo: Uint8Array | undefined;
    try {
      for (;;) {
        const { value, done } = await leggi(lettore, controllo.signal);
        if (done) throw new ErroreVoce('OpenRouter: flusso finito senza audio', 502);
        if (value && value.length) {
          primo = value;
          break;
        }
      }
    } catch (err) {
      pulisci();
      void lettore.cancel().catch(() => undefined);
      if (signal.aborted) throw err;
      const e = motivo(err);
      throw e instanceof ErroreVoce ? e : new ErroreVoce(`OpenRouter: flusso interrotto prima dell'audio: ${e.message}`, 502);
    }
    const primoByteMs = Math.round(performance.now() - t0);
    if (timer) clearTimeout(timer);
    timer = null;
    const silenzioMs = this.silenzioMs;

    async function* pezzi(): AsyncGenerator<Uint8Array> {
      let byteAudio = 0;
      let esito = 'finita';
      try {
        byteAudio += primo!.length;
        yield primo!;
        for (;;) {
          // Un pezzo nuovo entro silenzioMs, altrimenti la frase si chiude qui (audio parziale).
          timer = setTimeout(() => controllo.abort(new ErroreVoce(`flusso fermo da ${silenzioMs} ms`, 504)), silenzioMs);
          const { value, done } = await leggi(lettore, controllo.signal);
          clearTimeout(timer);
          timer = null;
          if (done) break;
          if (value?.length) {
            byteAudio += value.length;
            yield value;
          }
        }
      } catch (err) {
        esito = signal.aborted ? 'interrotta' : `errore: ${motivo(err).message}`;
        if (!signal.aborted) throw motivo(err);
      } finally {
        if (esito === 'finita' && controllo.signal.aborted) esito = 'interrotta';
        pulisci();
        void lettore.cancel().catch(() => undefined);
        const totaleMs = Math.round(performance.now() - t0);
        const secondi = byteAudio / 2 / sampleRate;
        const riga = {
          id: r.id,
          voce: r.voce,
          fish: voce!.fish,
          byte_testo: byte,
          primo_byte_ms: primoByteMs,
          totale_ms: totaleMs,
          secondi_audio: Math.round(secondi * 100) / 100,
          rtf: secondi > 0 ? Math.round((totaleMs / 1000 / secondi) * 100) / 100 : null,
          costo_usd: Math.round(usd * 1e7) / 1e7,
          // Direzioni e suoni mandati (senza le parole): per capire a orecchio cosa ha chiesto il narratore.
          direzioni: [...input.matchAll(/\[([^[\]]+)\]/g)].map((m) => m[1]),
          esito,
        };
        if (esito.startsWith('errore')) log.error(riga, 'voce fish: segmento fallito a metà');
        else log.info(riga, 'voce fish: segmento');
      }
    }
    return { sampleRate, pezzi: pezzi(), motore: 'fish', costo_usd: usd, byte_testo: byte };
  }
}
