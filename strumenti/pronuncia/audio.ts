/**
 * Voice and ear of the pronunciation test (docs/pronuncia.md): the sentence is synthesised with the REAL engines
 * of the server (drama-3 via OpenRouter, local Qwen via HTTP), so exactly the game's voice is tested, and it is
 * transcribed with Whisper (openai/whisper-1 via OpenRouter).
 *
 * The OpenRouter key is looked up as the server does (apps/server/src/llm/chiavi.ts: environment, .env at the
 * root, fallback file) and is never printed. Local Whisper (mlx-whisper) is not available: it needs torch and the
 * whisper-large-v3-turbo weights; it will be added here as another `Trascrittore` when needed.
 */
import { cercaChiave } from '../../apps/server/src/llm/chiavi';
import type { Lingua } from '../../apps/server/src/lingua';
import type { MotoreVoce } from '../../apps/server/src/voce/tipi';

/** Rate of whisper-1 (OpenAI, passed through OpenRouter): $0.006 per minute of audio. */
export const DOLLARI_PER_MINUTO_WHISPER = 0.006;
const URL_OPENROUTER = 'https://openrouter.ai/api/v1';

export interface Audio {
  pcm: Buffer;
  sampleRate: number;
  secondi: number;
  costo_usd: number;
}

/** Synthesises a sentence with a server engine and collects all the PCM (s16le mono). */
export async function sintetizza(motore: MotoreVoce, voce: string, testo: string, id: string, timeoutMs = 60_000): Promise<Audio> {
  const segnale = AbortSignal.timeout(timeoutMs);
  const flusso = await motore.sintetizza({ id, voce, testo, ...(motore.espressivo ? { espressivo: testo } : {}) }, segnale);
  const pezzi: Buffer[] = [];
  for await (const p of flusso.pezzi) pezzi.push(Buffer.from(p));
  const pcm = Buffer.concat(pezzi);
  return { pcm, sampleRate: flusso.sampleRate, secondi: pcm.length / 2 / flusso.sampleRate, costo_usd: flusso.costo_usd ?? 0 };
}

/** PCM s16le mono → WAV file (44-byte RIFF header). */
export function wav(pcm: Buffer, sampleRate: number): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export interface Trascrittore {
  readonly nome: string;
  trascrivi(audio: Audio, lingua: Lingua): Promise<{ testo: string; costo_usd: number }>;
}

/** Whisper via OpenRouter (multipart, like the OpenAI API). */
export class WhisperOpenRouter implements Trascrittore {
  readonly nome = 'openai/whisper-1';
  private chiave: string | null = null;

  constructor(private readonly o: { fileChiave: string; fetch?: typeof fetch }) {}

  async trascrivi(audio: Audio, lingua: Lingua): Promise<{ testo: string; costo_usd: number }> {
    this.chiave ??= cercaChiave('OPENROUTER_API_KEY', { filePrecedente: this.o.fileChiave }).valore;
    const fd = new FormData();
    fd.append('model', this.nome);
    fd.append('language', lingua);
    fd.append('file', new Blob([new Uint8Array(wav(audio.pcm, audio.sampleRate))], { type: 'audio/wav' }), 'prova.wav');
    for (let tentativo = 1; ; tentativo++) {
      const r = await (this.o.fetch ?? fetch)(`${URL_OPENROUTER}/audio/transcriptions`, { method: 'POST', headers: { authorization: `Bearer ${this.chiave}` }, body: fd, signal: AbortSignal.timeout(60_000) });
      const corpo = await r.text();
      if (r.ok) {
        const testo = (JSON.parse(corpo) as { text?: string }).text ?? '';
        return { testo: testo.trim(), costo_usd: (audio.secondi / 60) * DOLLARI_PER_MINUTO_WHISPER };
      }
      // 429 and 5xx: retry twice, with a pause; anything else is a real error (key, format).
      if (tentativo >= 3 || !(r.status === 429 || r.status >= 500)) throw new Error(`whisper: HTTP ${r.status} ${corpo.slice(0, 160)}`);
      await new Promise((ok) => setTimeout(ok, 1500 * tentativo));
    }
  }
}
