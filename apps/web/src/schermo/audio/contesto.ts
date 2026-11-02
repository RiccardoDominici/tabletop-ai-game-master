/**
 * Il minimo di Web Audio che usa l'audio del proiettore, come interfacce strutturali: un vero
 * AudioContext le soddisfa così com'è, e nei test basta un contesto finto (finto.test-utils.ts)
 * che registra le automazioni dei guadagni sull'orologio audio.
 */

export interface ParametroAudio {
  /** Valore corrente (Chrome lo aggiorna durante le automazioni, a ogni quanto di rendering). */
  value: number;
  setValueAtTime(valore: number, t: number): unknown;
  linearRampToValueAtTime(valore: number, t: number): unknown;
  setTargetAtTime(valore: number, t: number, tau: number): unknown;
  setValueCurveAtTime(curva: Float32Array<ArrayBuffer>, t: number, durata: number): unknown;
  cancelScheduledValues(t: number): unknown;
}

export interface NodoAudio {
  connect(destinazione: NodoAudio): unknown;
  disconnect(): void;
}

export interface NodoGuadagno extends NodoAudio {
  readonly gain: ParametroAudio;
}

/** Il minimo di AudioBuffer: serve a stimare la memoria e a ripetere un loop. */
export interface BufferAudio {
  readonly duration: number;
  readonly length: number;
  readonly numberOfChannels: number;
  readonly sampleRate: number;
}

export interface SorgenteBuffer extends NodoAudio {
  buffer: BufferAudio | null;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  start(quando?: number, offset?: number): void;
  stop(quando?: number): void;
  addEventListener(tipo: 'ended', f: () => void, opzioni?: { once?: boolean }): void;
}

export interface ContestoAudio {
  readonly currentTime: number;
  readonly destination: NodoAudio;
  createGain(): NodoGuadagno;
  createBufferSource(): SorgenteBuffer;
  decodeAudioData(byte: ArrayBuffer): Promise<BufferAudio>;
}

/** Byte stimati di un buffer decodificato (Float32 per canale). */
export function byteDecodificati(b: BufferAudio): number {
  return b.length * b.numberOfChannels * 4;
}

/**
 * Porta un guadagno da dove si trova adesso a una nuova automazione senza scatti: legge il
 * valore corrente, cancella le automazioni (anche quella in corso) e lo fissa all'istante `ora`.
 */
export function fermaAutomazione(p: ParametroAudio, ora: number): number {
  const v = p.value;
  p.cancelScheduledValues(ora);
  p.setValueAtTime(v, ora);
  return v;
}
