/**
 * The phone's recording → 16 kHz mono 16-bit WAV, the input Whisper wants (docs/ascolto.md, «Audio»).
 *
 * Phones record what their browser can: Chrome and Firefox `audio/webm;codecs=opus`, Safari `audio/mp4` (AAC). ffmpeg
 * (already a requirement of the project) reads all of them. The input goes to a temporary file, not to a pipe: an MP4
 * whose index sits at the end cannot be read from a pipe. The output comes back on stdout. At most `maxSecondi` are
 * kept; the file is removed whatever happens.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const FREQUENZA = 16_000;
const BYTE_PER_SECONDO = FREQUENZA * 2;
const INTESTAZIONE_WAV = 44;

export interface AudioConvertito {
  wav: Buffer;
  secondi: number;
  ms: number;
}

export class ErroreConversione extends Error {}

/** Where the samples of a WAV start (after the `data` chunk header; ffmpeg may write a LIST chunk before it). */
function inizioDati(wav: Buffer): number {
  const dati = wav.indexOf('data', 12, 'ascii');
  return dati > 0 ? dati + 8 : INTESTAZIONE_WAV;
}

/** Seconds of a 16 kHz mono s16 WAV made by `converti`. */
export const secondiWav = (wav: Buffer): number => Math.max(0, wav.length - inizioDati(wav)) / BYTE_PER_SECONDO;

export async function converti(audio: Buffer, o: { maxSecondi: number; ffmpeg?: string; timeoutMs?: number }): Promise<AudioConvertito> {
  const t0 = performance.now();
  const cartella = await fs.mkdtemp(path.join(os.tmpdir(), 'tagm-dettato-'));
  const ingresso = path.join(cartella, 'registrazione');
  try {
    await fs.writeFile(ingresso, audio);
    const wav = await new Promise<Buffer>((ok, ko) => {
      const p = spawn(o.ffmpeg ?? 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', ingresso, '-t', String(o.maxSecondi), '-vn', '-ac', '1', '-ar', String(FREQUENZA), '-c:a', 'pcm_s16le', '-bitexact', '-f', 'wav', 'pipe:1'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const pezzi: Buffer[] = [];
      let errore = '';
      const timer = setTimeout(() => p.kill('SIGKILL'), o.timeoutMs ?? 15_000);
      p.stdout.on('data', (d: Buffer) => pezzi.push(d));
      p.stderr.on('data', (d: Buffer) => (errore += String(d)));
      p.on('error', (e) => (clearTimeout(timer), ko(new ErroreConversione(`ffmpeg: ${e.message}`))));
      p.on('close', (codice) => {
        clearTimeout(timer);
        if (codice === 0) ok(Buffer.concat(pezzi));
        else ko(new ErroreConversione(`ffmpeg exit ${codice}: ${errore.trim().split('\n').slice(-2).join(' | ').slice(0, 200)}`));
      });
    });
    // ffmpeg writing to a pipe cannot seek back to fill the sizes in the header: fix them here.
    if (wav.length >= INTESTAZIONE_WAV && wav.toString('ascii', 0, 4) === 'RIFF') {
      wav.writeUInt32LE(wav.length - 8, 4);
      const dati = wav.indexOf('data', 12, 'ascii');
      if (dati > 0) wav.writeUInt32LE(wav.length - dati - 8, dati + 4);
    }
    return { wav, secondi: secondiWav(wav), ms: Math.round(performance.now() - t0) };
  } finally {
    await fs.rm(cartella, { recursive: true, force: true });
  }
}

/** Peak level of a 16-bit PCM WAV, 0–1 (a silent recording is not sent to Whisper: it would invent words). */
export function picco(wav: Buffer): number {
  let max = 0;
  for (let i = inizioDati(wav); i + 1 < wav.length; i += 2) {
    const v = Math.abs(wav.readInt16LE(i));
    if (v > max) max = v;
  }
  return max / 32768;
}
