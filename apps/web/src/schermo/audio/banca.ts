/**
 * Banca dei file audio del proiettore: scarica, decodifica e libera, con un tetto alla memoria.
 *
 * - `precarica(url)`: scarica i byte compressi (pochi MB: Opus/MP3) dei luoghi probabili, senza
 *   decodificarli. Un brano decodificato pesa invece ~23 MB al minuto (48 kHz stereo Float32).
 * - `prendi(url)`: decodifica quando serve davvero (pigra) e segna il buffer «in uso»;
 *   `rilascia(url)` lo libera. Un buffer non in uso e non più voluto si scarta subito; gli altri
 *   restano finché la memoria decodificata sta sotto il tetto (i più vecchi escono per primi).
 * - I byte compressi restano in una cache LRU con un suo tetto: tornare in un luogo già visto
 *   costa solo una nuova decodifica (~100–300 ms), mai un nuovo download.
 *
 * decodeAudioData stacca (detach) l'ArrayBuffer che riceve: gli si passa sempre una copia.
 * Scaricatore e decodificatore si iniettano: banca.test.ts li sostituisce con dei finti.
 */
import { creaLog } from '../../lib/log';
import { byteDecodificati, type BufferAudio } from './contesto';

const log = creaLog('audio-banca');

export type Scaricatore = (url: string) => Promise<ArrayBuffer>;
export type Decodificatore = (byte: ArrayBuffer) => Promise<BufferAudio>;

export interface OpzioniBanca {
  /** Tetto dei byte compressi tenuti (predefinito 96 MB). */
  maxCompressi?: number;
  /** Tetto della memoria decodificata (predefinito 512 MB, ~22 minuti di stereo a 48 kHz). */
  maxDecodificati?: number;
}

export interface StatisticheBanca {
  compressi: number;
  byteCompressi: number;
  decodificati: number;
  byteDecodificati: number;
  inUso: number;
  errori: number;
}

interface Voce {
  byte: Promise<ArrayBuffer | null> | null;
  dimensione: number;
  buffer: Promise<BufferAudio | null> | null;
  bufferPronto: BufferAudio | null;
  usi: number;
}

/** Scaricatore del browser: fetch con la cache HTTP (il server manda max-age=3600). */
export const scaricaConFetch: Scaricatore = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.arrayBuffer();
};

export class BancaAudio {
  /** Map in ordine d'uso: la prima voce è la meno recente. */
  private readonly voci = new Map<string, Voce>();
  private voluti = new Set<string>();
  private errori = 0;
  private readonly maxCompressi: number;
  private readonly maxDecodificati: number;

  constructor(
    private readonly scarica: Scaricatore,
    private readonly decodifica: Decodificatore,
    o: OpzioniBanca = {},
  ) {
    this.maxCompressi = o.maxCompressi ?? 96 * 1024 * 1024;
    this.maxDecodificati = o.maxDecodificati ?? 512 * 1024 * 1024;
  }

  /** Scarica (senza decodificare) le URL non ancora in banca. */
  precarica(urls: Iterable<string>): void {
    for (const url of urls) if (url) void this.byte(url);
  }

  /**
   * Le URL che servono adesso o a breve (luogo corrente e vicini): un buffer decodificato fuori da
   * questo elenco e non in uso si libera subito.
   */
  tieni(urls: Iterable<string>): void {
    this.voluti = new Set(urls);
    this.libera();
  }

  /** Buffer decodificato pronto da suonare (null se scaricamento o decodifica falliscono). */
  async prendi(url: string): Promise<BufferAudio | null> {
    const voce = this.voce(url);
    voce.usi += 1;
    if (!voce.buffer) {
      voce.buffer = this.byte(url).then(async (byte) => {
        if (!byte) {
          // Download fallito: il prossimo `prendi` riprova da capo.
          voce.buffer = null;
          return null;
        }
        try {
          const b = await this.decodifica(byte.slice(0));
          voce.bufferPronto = b;
          log.debug('Audio decodificato', { url, secondi: Number(b.duration.toFixed(1)), mb: Number((byteDecodificati(b) / 1048576).toFixed(1)) });
          return b;
        } catch (errore) {
          this.errori += 1;
          log.warn('Audio non decodificato: quello strato resta muto', { url, errore: String(errore) });
          voce.buffer = null;
          return null;
        }
      });
    }
    const b = await voce.buffer;
    if (!b) voce.usi = Math.max(0, voce.usi - 1);
    this.libera();
    return b;
  }

  /** Il buffer di `url` non suona più (una volta per ogni `prendi` riuscito). */
  rilascia(url: string): void {
    const voce = this.voci.get(url);
    if (!voce) return;
    voce.usi = Math.max(0, voce.usi - 1);
    this.libera();
  }

  statistiche(): StatisticheBanca {
    let byteCompressi = 0;
    let decodificati = 0;
    let byteDec = 0;
    let inUso = 0;
    for (const v of this.voci.values()) {
      byteCompressi += v.dimensione;
      if (v.bufferPronto) {
        decodificati += 1;
        byteDec += byteDecodificati(v.bufferPronto);
      }
      if (v.usi > 0) inUso += 1;
    }
    return { compressi: this.voci.size, byteCompressi, decodificati, byteDecodificati: byteDec, inUso, errori: this.errori };
  }

  /** Il buffer di `url` è decodificato adesso? (test e debug) */
  decodificato(url: string): boolean {
    return !!this.voci.get(url)?.bufferPronto;
  }

  private voce(url: string): Voce {
    const esistente = this.voci.get(url);
    if (esistente) {
      // Usata di nuovo: diventa la più recente.
      this.voci.delete(url);
      this.voci.set(url, esistente);
      return esistente;
    }
    const nuova: Voce = { byte: null, dimensione: 0, buffer: null, bufferPronto: null, usi: 0 };
    this.voci.set(url, nuova);
    return nuova;
  }

  private byte(url: string): Promise<ArrayBuffer | null> {
    const voce = this.voce(url);
    if (!voce.byte) {
      voce.byte = this.scarica(url).then(
        (byte) => {
          voce.dimensione = byte.byteLength;
          this.libera();
          return byte;
        },
        (errore: unknown) => {
          this.errori += 1;
          log.warn('Audio non scaricato: quello strato resta muto', { url, errore: String(errore) });
          // Un nuovo tentativo riparte da zero.
          voce.byte = null;
          return null;
        },
      );
    }
    return voce.byte;
  }

  /** Applica i tetti: prima i decodificati superflui, poi i compressi più vecchi. */
  private libera(): void {
    let totaleDec = 0;
    for (const v of this.voci.values()) if (v.bufferPronto) totaleDec += byteDecodificati(v.bufferPronto);
    for (const [url, v] of this.voci) {
      if (!v.bufferPronto || v.usi > 0) continue;
      if (!this.voluti.has(url) || totaleDec > this.maxDecodificati) {
        totaleDec -= byteDecodificati(v.bufferPronto);
        v.bufferPronto = null;
        v.buffer = null;
        log.debug('Buffer decodificato liberato', { url });
      }
    }
    let totaleComp = 0;
    for (const v of this.voci.values()) totaleComp += v.dimensione;
    for (const [url, v] of this.voci) {
      if (totaleComp <= this.maxCompressi) break;
      if (v.usi > 0 || v.buffer || this.voluti.has(url) || v.dimensione === 0) continue;
      totaleComp -= v.dimensione;
      this.voci.delete(url);
    }
  }
}
