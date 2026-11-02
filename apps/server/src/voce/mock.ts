/**
 * Motore vocale FINTO, con lo stesso contratto del servizio Qwen: serve ai test e a giocare
 * quando il servizio voce è giù. Produce un tono morbido «a sillabe» (non silenzio, così si
 * sente che l'audio arriva) con tempi realistici:
 * - primo pezzo dopo ~650 ms (come Qwen in streaming);
 * - pezzi da 200 ms di audio generati a RTF 0,85 (poco più veloce del tempo reale);
 * - durata proporzionale al testo (~15 caratteri al secondo).
 * `scalaTempo` accorcia tutte le attese (0,05 = venti volte più veloce) per i test.
 */
import { setTimeout as attendi } from 'node:timers/promises';
import type { FlussoTts, MotoreVoce, RichiestaTts, SaluteVoce } from './tipi';
import { ErroreVoce } from './tipi';

export interface OpzioniMock {
  sampleRate?: number;
  primoAudioMs?: number;
  rtf?: number;
  secondiPerPezzo?: number;
  caratteriAlSecondo?: number;
  scalaTempo?: number;
  voci?: string[];
}

export const VOCI_F0 = ['narratore', 'vincent', 'nadine', 'lucian', 'tabitha'];

/** Altezza del tono per voce, così nei test a orecchio le voci si distinguono. */
function frequenzaPer(voce: string): number {
  const tabella: Record<string, number> = { narratore: 196, vincent: 147, nadine: 262, lucian: 175, tabitha: 294 };
  if (tabella[voce]) return tabella[voce]!;
  let h = 0;
  for (const c of voce) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 150 + (h % 150);
}

export class MotoreVoceMock implements MotoreVoce {
  readonly nome = 'mock' as const;
  private readonly o: Required<OpzioniMock>;

  constructor(opzioni: OpzioniMock = {}) {
    this.o = {
      sampleRate: opzioni.sampleRate ?? 24_000,
      primoAudioMs: opzioni.primoAudioMs ?? 650,
      rtf: opzioni.rtf ?? 0.85,
      secondiPerPezzo: opzioni.secondiPerPezzo ?? 0.2,
      caratteriAlSecondo: opzioni.caratteriAlSecondo ?? 15,
      scalaTempo: opzioni.scalaTempo ?? 1,
      voci: opzioni.voci ?? VOCI_F0,
    };
  }

  async salute(): Promise<SaluteVoce> {
    return { pronto: true, modello: 'mock-tono', sample_rate: this.o.sampleRate, formato: 'pcm_s16le', voci: this.o.voci };
  }

  /** Durata dell'audio che il mock produrrà per un testo (secondi). */
  durataPer(testo: string): number {
    return Math.max(0.6, testo.length / this.o.caratteriAlSecondo);
  }

  async sintetizza(r: RichiestaTts, signal: AbortSignal): Promise<FlussoTts> {
    if (!r.testo.trim()) throw new ErroreVoce('testo vuoto', 400);
    if (!this.o.voci.includes(r.voce)) throw new ErroreVoce(`voce inesistente: ${r.voce}`, 404);
    const o = this.o;
    const durata = this.durataPer(r.testo);
    const frequenza = frequenzaPer(r.voce);
    const campioniPerPezzo = Math.round(o.secondiPerPezzo * o.sampleRate);
    const totale = Math.round(durata * o.sampleRate);

    async function* pezzi(): AsyncGenerator<Uint8Array> {
      await attendi(o.primoAudioMs * o.scalaTempo, undefined, { signal });
      for (let inizio = 0; inizio < totale; inizio += campioniPerPezzo) {
        if (signal.aborted) return;
        const n = Math.min(campioniPerPezzo, totale - inizio);
        yield generaTono(inizio, n, totale, frequenza, o.sampleRate);
        if (inizio + n < totale) {
          await attendi(((n / o.sampleRate) * o.rtf * 1000) * o.scalaTempo, undefined, { signal });
        }
      }
    }
    return { sampleRate: o.sampleRate, pezzi: pezzi() };
  }
}

/** PCM s16le mono: tono con inviluppo a «sillabe» (4 Hz) e dissolvenza agli estremi. */
export function generaTono(inizio: number, n: number, totale: number, frequenza: number, sr: number): Uint8Array {
  const buf = Buffer.alloc(n * 2);
  const dissolvenza = Math.round(0.02 * sr);
  for (let i = 0; i < n; i++) {
    const k = inizio + i;
    const t = k / sr;
    const sillabe = 0.55 + 0.45 * Math.sin(2 * Math.PI * 4 * t);
    const bordo = Math.min(1, k / dissolvenza, (totale - k) / dissolvenza);
    const v = 0.12 * sillabe * bordo * Math.sin(2 * Math.PI * frequenza * t);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2);
  }
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
