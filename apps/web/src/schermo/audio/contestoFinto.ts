/**
 * AudioContext FINTO per i test dell'audio del proiettore (solo i test lo importano).
 *
 * Un solo orologio governa tutto: `ctx.currentTime` (s) e i timer (ms) avanzano insieme con
 * `avanza(s)`. I parametri registrano le automazioni e le valutano come il browser
 * (setValueAtTime, linearRamp, setTarget, setValueCurve, cancelScheduledValues): `value` è il
 * valore all'istante corrente, così i test leggono i guadagni proprio come l'e2e in Chrome.
 */
import type { BufferAudio, ContestoAudio, NodoAudio, NodoGuadagno, ParametroAudio, SorgenteBuffer } from './contesto';
import type { Timer } from './traccia';

type Evento =
  | { tipo: 'valore'; t: number; v: number }
  | { tipo: 'rampa'; t: number; v: number }
  | { tipo: 'bersaglio'; t: number; v: number; tau: number }
  | { tipo: 'curva'; t: number; durata: number; curva: Float32Array };

export class ParametroFinto implements ParametroAudio {
  readonly eventi: Evento[] = [];
  private iniziale: number;

  constructor(
    private readonly ctx: { currentTime: number },
    valore: number,
  ) {
    this.iniziale = valore;
  }

  get value(): number {
    return this.valoreA(this.ctx.currentTime);
  }

  set value(v: number) {
    // Come nel browser: un'assegnazione diretta equivale a setValueAtTime(v, adesso).
    this.iniziale = this.eventi.length ? this.iniziale : v;
    if (this.eventi.length) this.aggiungi({ tipo: 'valore', t: this.ctx.currentTime, v });
  }

  setValueAtTime(v: number, t: number): void {
    this.aggiungi({ tipo: 'valore', t, v });
  }

  linearRampToValueAtTime(v: number, t: number): void {
    this.aggiungi({ tipo: 'rampa', t, v });
  }

  setTargetAtTime(v: number, t: number, tau: number): void {
    this.aggiungi({ tipo: 'bersaglio', t, v, tau });
  }

  setValueCurveAtTime(curva: Float32Array, t: number, durata: number): void {
    // Il browser rifiuta una curva che si sovrappone ad altre automazioni: anche qui.
    for (const e of this.eventi) {
      const fine = e.tipo === 'curva' ? e.t + e.durata : e.t;
      if (e.t < t + durata && fine > t && !(e.tipo !== 'curva' && e.t === t)) throw new Error(`curva sovrapposta a un'automazione (t=${t})`);
    }
    this.aggiungi({ tipo: 'curva', t, durata, curva: Float32Array.from(curva) });
  }

  cancelScheduledValues(t: number): void {
    for (let i = this.eventi.length - 1; i >= 0; i -= 1) {
      const e = this.eventi[i]!;
      const attiva = e.tipo === 'curva' && e.t < t && e.t + e.durata > t;
      if (e.t >= t || attiva) this.eventi.splice(i, 1);
    }
  }

  /** Valore all'istante `t` secondo le automazioni registrate. */
  valoreA(t: number): number {
    let v = this.iniziale;
    let tPrec = 0;
    for (let i = 0; i < this.eventi.length; i += 1) {
      const e = this.eventi[i]!;
      if (e.t > t) {
        // Rampa lineare verso un evento futuro: interpolazione dal precedente.
        if (e.tipo === 'rampa') return v + ((e.v - v) * (t - tPrec)) / Math.max(1e-9, e.t - tPrec);
        return v;
      }
      const prossimo = this.eventi[i + 1];
      const finoA = Math.min(t, prossimo && prossimo.tipo !== 'rampa' ? prossimo.t : t);
      switch (e.tipo) {
        case 'valore':
        case 'rampa':
          v = e.v;
          break;
        case 'bersaglio':
          v = e.v + (v - e.v) * Math.exp(-(finoA - e.t) / e.tau);
          break;
        case 'curva': {
          const x = Math.min(1, (finoA - e.t) / e.durata);
          const pos = x * (e.curva.length - 1);
          const k = Math.floor(pos);
          const a = e.curva[k]!;
          const b = e.curva[Math.min(e.curva.length - 1, k + 1)]!;
          v = a + (b - a) * (pos - k);
          break;
        }
      }
      tPrec = e.tipo === 'curva' ? e.t + e.durata : e.t;
    }
    return v;
  }

  private aggiungi(e: Evento): void {
    this.eventi.push(e);
    this.eventi.sort((a, b) => a.t - b.t);
  }
}

class NodoFinto implements NodoAudio {
  readonly uscite = new Set<NodoAudio>();
  connect(d: NodoAudio): void {
    this.uscite.add(d);
  }
  disconnect(): void {
    this.uscite.clear();
  }
}

export class GuadagnoFinto extends NodoFinto implements NodoGuadagno {
  readonly gain: ParametroFinto;
  constructor(ctx: { currentTime: number }) {
    super();
    this.gain = new ParametroFinto(ctx, 1);
  }
}

export class SorgenteFinta extends NodoFinto implements SorgenteBuffer {
  buffer: BufferAudio | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  avviataA: number | null = null;
  fermataA: number | null = null;
  private readonly finali: Array<() => void> = [];
  start(quando = 0): void {
    this.avviataA = quando;
  }
  stop(quando = 0): void {
    this.fermataA = quando;
  }
  addEventListener(_tipo: 'ended', f: () => void): void {
    this.finali.push(f);
  }
  /** Simula la fine (come `ended` nel browser). */
  finisci(): void {
    for (const f of this.finali.splice(0)) f();
  }
}

export function bufferFinto(duration: number, numberOfChannels = 2, sampleRate = 48000): BufferAudio {
  return { duration, length: Math.round(duration * sampleRate), numberOfChannels, sampleRate };
}

/** Contesto finto con orologio e timer condivisi. */
export class ContestoFinto implements ContestoAudio, Timer {
  currentTime = 0;
  readonly destination = new NodoFinto();
  readonly guadagni: GuadagnoFinto[] = [];
  readonly sorgenti: SorgenteFinta[] = [];
  private prossimoTimer = 1;
  private readonly timer = new Map<number, { alle: number; f: () => void }>();
  /** Durata (s) dei buffer decodificati, per URL o primo byte (vedi `decodeAudioData`). */
  durataDecodificata = 8;

  createGain(): GuadagnoFinto {
    const g = new GuadagnoFinto(this);
    this.guadagni.push(g);
    return g;
  }

  createBufferSource(): SorgenteFinta {
    const s = new SorgenteFinta();
    this.sorgenti.push(s);
    return s;
  }

  async decodeAudioData(byte: ArrayBuffer): Promise<BufferAudio> {
    // Il primo byte, se non zero, è la durata in secondi (comodo per i test).
    const d = new Uint8Array(byte)[0] || this.durataDecodificata;
    return bufferFinto(d);
  }

  /** Orologio in ms (per l'isteresi). */
  get oraMs(): number {
    return this.currentTime * 1000;
  }

  imposta(f: () => void, ms: number): number {
    const id = this.prossimoTimer++;
    this.timer.set(id, { alle: this.oraMs + ms, f });
    return id;
  }

  cancella(id: number): void {
    this.timer.delete(id);
  }

  /** Avanza l'orologio di `s` secondi facendo scattare i timer scaduti, in ordine. */
  avanza(s: number): void {
    const fine = this.currentTime + s;
    for (;;) {
      const scaduti = [...this.timer.entries()].filter(([, t]) => t.alle <= fine * 1000).sort((a, b) => a[1].alle - b[1].alle);
      const primo = scaduti[0];
      if (!primo) break;
      this.timer.delete(primo[0]);
      this.currentTime = Math.max(this.currentTime, primo[1].alle / 1000);
      primo[1].f();
    }
    this.currentTime = fine;
  }

  get timerAttivi(): number {
    return this.timer.size;
  }
}
