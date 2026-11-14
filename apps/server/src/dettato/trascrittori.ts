/**
 * Who turns the audio into text (docs/ascolto.md, «Providers»): the chain [provider, ...riserve] of the `ascolto`
 * component, tried in order at every dictation.
 *
 * - `locale`: whisper.cpp's whisper-server (scripts/ascolto-avvio.sh, 127.0.0.1:4614), POST /inference multipart with
 *   `file` (16 kHz mono WAV), `language` (fixed to the play language, never auto-detected), `prompt` (the campaign names,
 *   dettato/prompt.ts), `temperature` 0 with the default fallback step, `response_format` json → `{text}`. The server
 *   handles one request at a time (its own mutex). Its watchdog (provider/sentinella-locale.ts, GET /health) refuses at
 *   once while it is down, so the dictation goes straight to the reserve, and restarts it with the script.
 * - `openrouter`: OpenRouter's `/audio/transcriptions` (multipart like OpenAI's: `model`, `file`, `language`, `prompt`);
 *   whisper-1 costs $0.006 a minute. The key is read on first use and never logged.
 * - `nessuno`: no transcriber; the phone hides the microphone and the players type.
 */
import { cercaChiave } from '../llm/chiavi';
import type { Lingua } from '../lingua';
import type { Logger } from '../logger';
import type { SentinellaModello } from '../provider/sentinella-locale';

export const DOLLARI_PER_MINUTO_OPENROUTER = 0.006;

export interface RichiestaTrascrizione {
  wav: Buffer;
  secondi: number;
  lingua: Lingua;
  prompt: string;
  segnale?: AbortSignal;
}

export interface Trascrizione {
  testo: string;
  costo_usd: number;
}

export interface Trascrittore {
  /** Provider name, as in the configuration (locale, openrouter, openai). */
  readonly provider: string;
  readonly modello: string;
  /** False while the provider is known to be unusable (server down): the chain skips it without waiting. */
  disponibile(): boolean;
  trascrivi(r: RichiestaTrascrizione): Promise<Trascrizione>;
}

export class ErroreTrascrizione extends Error {}

/** whisper.cpp's whisper-server. */
export class WhisperLocale implements Trascrittore {
  readonly provider = 'locale';
  constructor(private readonly o: { url: string; modello: string; sentinella?: SentinellaModello; timeoutMs?: number; fetch?: typeof fetch }) {}

  get modello(): string {
    return this.o.modello;
  }

  disponibile(): boolean {
    return this.o.sentinella?.disponibile() ?? true;
  }

  async trascrivi(r: RichiestaTrascrizione): Promise<Trascrizione> {
    const fd = new FormData();
    fd.append('file', new Blob([new Uint8Array(r.wav)], { type: 'audio/wav' }), 'dettato.wav');
    fd.append('language', r.lingua);
    fd.append('prompt', r.prompt);
    fd.append('temperature', '0');
    fd.append('temperature_inc', '0.2');
    fd.append('response_format', 'json');
    fd.append('no_timestamps', 'true');
    const segnale = r.segnale ? AbortSignal.any([r.segnale, AbortSignal.timeout(this.o.timeoutMs ?? 30_000)]) : AbortSignal.timeout(this.o.timeoutMs ?? 30_000);
    let risposta: Response;
    try {
      risposta = await (this.o.fetch ?? fetch)(`${this.o.url.replace(/\/$/, '')}/inference`, { method: 'POST', body: fd, signal: segnale });
    } catch (err) {
      this.o.sentinella?.segnala(false, (err as Error).message);
      throw new ErroreTrascrizione(`whisper-server: ${(err as Error).message}`);
    }
    const corpo = await risposta.text();
    if (!risposta.ok) {
      if (risposta.status >= 500) this.o.sentinella?.segnala(false, `HTTP ${risposta.status}`);
      throw new ErroreTrascrizione(`whisper-server: HTTP ${risposta.status} ${corpo.slice(0, 160)}`);
    }
    this.o.sentinella?.segnala(true);
    const d = JSON.parse(corpo) as { text?: unknown; error?: unknown };
    if (typeof d.text !== 'string') throw new ErroreTrascrizione(`whisper-server: no text (${String(d.error ?? corpo.slice(0, 80))})`);
    return { testo: d.text.trim(), costo_usd: 0 };
  }
}

/** OpenRouter's (or another OpenAI-compatible) transcription API. */
export class WhisperApi implements Trascrittore {
  private chiave: string | null = null;
  constructor(
    private readonly o: { provider: 'openrouter' | 'openai'; url: string; modello: string; nomeChiave: string | null; fileChiave?: string; dollariPerMinuto: number; timeoutMs?: number; fetch?: typeof fetch },
  ) {}

  get provider(): string {
    return this.o.provider;
  }

  get modello(): string {
    return this.o.modello;
  }

  disponibile(): boolean {
    return true;
  }

  async trascrivi(r: RichiestaTrascrizione): Promise<Trascrizione> {
    if (this.o.nomeChiave) this.chiave ??= cercaChiave(this.o.nomeChiave, this.o.fileChiave ? { filePrecedente: this.o.fileChiave } : {}).valore;
    const fd = new FormData();
    fd.append('model', this.o.modello);
    fd.append('language', r.lingua);
    if (r.prompt) fd.append('prompt', r.prompt);
    fd.append('file', new Blob([new Uint8Array(r.wav)], { type: 'audio/wav' }), 'dettato.wav');
    const segnale = r.segnale ? AbortSignal.any([r.segnale, AbortSignal.timeout(this.o.timeoutMs ?? 30_000)]) : AbortSignal.timeout(this.o.timeoutMs ?? 30_000);
    const risposta = await (this.o.fetch ?? fetch)(`${this.o.url.replace(/\/$/, '')}/audio/transcriptions`, {
      method: 'POST',
      headers: this.chiave ? { authorization: `Bearer ${this.chiave}` } : {},
      body: fd,
      signal: segnale,
    });
    const corpo = await risposta.text();
    if (!risposta.ok) throw new ErroreTrascrizione(`${this.o.provider}: HTTP ${risposta.status} ${corpo.slice(0, 160)}`);
    const d = JSON.parse(corpo) as { text?: unknown };
    if (typeof d.text !== 'string') throw new ErroreTrascrizione(`${this.o.provider}: no text in the answer`);
    return { testo: d.text.trim(), costo_usd: (r.secondi / 60) * this.o.dollariPerMinuto };
  }
}

export interface EsitoCatena extends Trascrizione {
  provider: string;
  modello: string;
  ms: number;
  /** Providers tried before, and why they failed (for the log). */
  saltati: string[];
}

/** Tries the transcribers in order; the first that answers wins. Throws if none does. */
export async function trascriviConCatena(catena: readonly Trascrittore[], r: RichiestaTrascrizione, log: Logger): Promise<EsitoCatena> {
  const saltati: string[] = [];
  for (const t of catena) {
    if (!t.disponibile()) {
      saltati.push(`${t.provider}: down`);
      continue;
    }
    const t0 = performance.now();
    try {
      const esito = await t.trascrivi(r);
      return { ...esito, provider: t.provider, modello: t.modello, ms: Math.round(performance.now() - t0), saltati };
    } catch (err) {
      if (r.segnale?.aborted) throw err;
      const motivo = (err as Error).message;
      saltati.push(`${t.provider}: ${motivo.slice(0, 120)}`);
      log.warn({ provider: t.provider, motivo }, 'dictation: transcriber failed, trying the next one');
    }
  }
  throw new ErroreTrascrizione(`no transcriber answered (${saltati.join('; ') || 'none configured'})`);
}
