/**
 * Conversioni PCM pure (nessuna dipendenza dal browser): testabili in Node.
 *
 * Il server manda PCM s16le mono: 2 byte per campione, little-endian. Il contratto promette pezzi
 * di lunghezza pari, ma un pezzo dispari non deve rompere l'allineamento di tutti i campioni
 * seguenti: il byte in più si porta al pezzo successivo della stessa frase (`RiportoByte`).
 */

/** Byte per campione nel formato pcm_s16le. */
export const BYTE_PER_CAMPIONE = 2;

/** Divisore della conversione Int16 → Float32: −32768 → −1, 32767 → 0,99997. */
const SCALA_INT16 = 32768;

/**
 * Vista Uint8Array sul payload di `audio:pezzo`, senza copiare.
 * Nel browser Socket.IO consegna un ArrayBuffer; nei test (e in Node) può essere un Uint8Array/Buffer.
 */
export function comeByte(pcm: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (pcm instanceof ArrayBuffer) return new Uint8Array(pcm);
  return new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
}

/**
 * Converte byte s16le (lunghezza pari) in campioni Float32 in [-1, 1).
 * Usa DataView: indipendente dall'endianness della macchina e dall'allineamento del buffer
 * (un Int16Array su un offset dispari lancerebbe un RangeError).
 */
export function int16leAFloat32(byte: Uint8Array): Float32Array<ArrayBuffer> {
  const campioni = Math.floor(byte.byteLength / BYTE_PER_CAMPIONE);
  const uscita = new Float32Array(campioni);
  const vista = new DataView(byte.buffer, byte.byteOffset, campioni * BYTE_PER_CAMPIONE);
  for (let i = 0; i < campioni; i++) {
    uscita[i] = vista.getInt16(i * BYTE_PER_CAMPIONE, true) / SCALA_INT16;
  }
  return uscita;
}

/**
 * Riporto del byte dispari tra pezzi consecutivi della STESSA frase.
 * Una istanza per frase: alla fine della frase l'eventuale byte avanzato si scarta.
 */
export class RiportoByte {
  private resto: number | null = null;

  /**
   * Unisce il byte riportato (se c'è) al nuovo pezzo e restituisce solo byte a lunghezza pari;
   * l'eventuale ultimo byte dispari resta da parte per il pezzo successivo.
   */
  unisci(pezzo: Uint8Array): Uint8Array {
    // Caso comune (nessun riporto, lunghezza pari): nessuna copia.
    if (this.resto === null && pezzo.byteLength % BYTE_PER_CAMPIONE === 0) return pezzo;

    // Mette davanti il byte riportato (una sola copia, solo quando serve).
    let tutto = pezzo;
    if (this.resto !== null) {
      tutto = new Uint8Array(pezzo.byteLength + 1);
      tutto[0] = this.resto;
      tutto.set(pezzo, 1);
    }

    // Ciò che avanza oltre la parte pari (al massimo un byte) diventa il nuovo riporto.
    const pari = tutto.byteLength - (tutto.byteLength % BYTE_PER_CAMPIONE);
    this.resto = pari < tutto.byteLength ? (tutto[tutto.byteLength - 1] ?? null) : null;
    return tutto.subarray(0, pari);
  }

  /** C'è un byte in attesa? */
  get inSospeso(): boolean {
    return this.resto !== null;
  }

  /** Fine frase: scarta l'eventuale byte avanzato. Restituisce true se ne è stato scartato uno. */
  svuota(): boolean {
    const cerano = this.resto !== null;
    this.resto = null;
    return cerano;
  }
}
