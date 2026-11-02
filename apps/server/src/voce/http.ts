/**
 * Client del servizio voce locale (Qwen3-TTS, 127.0.0.1:4611), contratto in docs/f0-contratti.md:
 * - GET  /salute  → {pronto, modello, sample_rate, formato, voci}
 * - POST /tts     {id, voce, testo} → PCM s16le in streaming (chunked), X-Sample-Rate
 * - POST /annulla {id}             → ferma o toglie dalla coda
 * Interrompere la richiesta chiude la connessione: il servizio smette di generare. In più si manda
 * /annulla (al meglio) per togliere la richiesta anche se fosse ancora in coda.
 */
import type { Logger } from '../logger';
import type { FlussoTts, MotoreVoce, RichiestaTts, SaluteVoce } from './tipi';
import { ErroreVoce } from './tipi';

export class MotoreVoceHttp implements MotoreVoce {
  readonly nome = 'qwen' as const;

  constructor(
    private readonly baseUrl: string,
    private readonly log: Logger,
  ) {}

  async salute(signal?: AbortSignal): Promise<SaluteVoce> {
    const r = await fetch(`${this.baseUrl}/salute`, { signal: signal ?? AbortSignal.timeout(2000) });
    if (!r.ok) throw new ErroreVoce(`/salute ha risposto ${r.status}`, r.status);
    return (await r.json()) as SaluteVoce;
  }

  async sintetizza(richiesta: RichiestaTts, signal: AbortSignal): Promise<FlussoTts> {
    const annulla = (): void => void this.annulla(richiesta.id);
    signal.addEventListener('abort', annulla, { once: true });
    let risposta: Response;
    try {
      risposta = await fetch(`${this.baseUrl}/tts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(richiesta),
        signal,
      });
    } catch (err) {
      signal.removeEventListener('abort', annulla);
      if (signal.aborted) throw err;
      throw new ErroreVoce(`servizio voce irraggiungibile: ${(err as Error).message}`, 0);
    }
    if (!risposta.ok) {
      signal.removeEventListener('abort', annulla);
      let dettaglio = '';
      try {
        dettaglio = JSON.stringify(await risposta.json());
      } catch {
        /* corpo non JSON */
      }
      throw new ErroreVoce(`/tts ha risposto ${risposta.status} ${dettaglio}`, risposta.status);
    }
    const sampleRate = Number(risposta.headers.get('x-sample-rate') ?? 24_000);
    const formato = risposta.headers.get('x-formato');
    if (formato && formato !== 'pcm_s16le') this.log.warn({ formato }, 'voce: formato inatteso');
    const corpo = risposta.body;
    if (!corpo) throw new ErroreVoce('/tts senza corpo', 500);

    async function* pezzi(): AsyncGenerator<Uint8Array> {
      try {
        for await (const pezzo of corpo as unknown as AsyncIterable<Uint8Array>) yield pezzo;
      } finally {
        signal.removeEventListener('abort', annulla);
      }
    }
    return { sampleRate, pezzi: pezzi() };
  }

  /** Al meglio: se fallisce, la chiusura della connessione basta comunque a fermare la generazione. */
  async annulla(id: string): Promise<void> {
    try {
      const r = await fetch(`${this.baseUrl}/annulla`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
        signal: AbortSignal.timeout(1500),
      });
      const esito = (await r.json().catch(() => ({}))) as { annullata?: boolean };
      this.log.debug({ id, annullata: esito.annullata ?? null }, 'voce: /annulla');
    } catch (err) {
      this.log.debug({ id, err: (err as Error).message }, 'voce: /annulla non riuscito');
    }
  }
}
