/**
 * Una traccia che suona su un bus: sorgente(i) → guadagno della traccia → bus.
 *
 * Loop senza giunta:
 * - `giunta_s` = 0: loop nativo dell'AudioBufferSourceNode (`loop`, `loopStart`, `loopEnd` dal
 *   manifest, se ci sono): il campione dopo l'ultimo è il primo, nessun buco, nessun timer;
 * - `giunta_s` > 0 (file che non si chiudono bene): copie sovrapposte che si scambiano in
 *   dissolvenza; la copia successiva si programma con un timer ~2 s prima, sull'orologio audio.
 *
 * Entrata e uscita con dissolvenza a potenza costante (curvaPotenzaCostante); un'uscita a metà di
 * un'entrata riparte dal valore corrente (fermaAutomazione), senza scatti.
 */
import type { TracciaAudio } from '@cantastorie/shared';
import { creaLog } from '../../lib/log';
import { fermaAutomazione, type BufferAudio, type ContestoAudio, type NodoAudio, type NodoGuadagno, type SorgenteBuffer } from './contesto';
import { curvaPotenzaCostante, giroIncrociato } from './regole';

const log = creaLog('audio-traccia');

/** Punti delle curve di dissolvenza (bastano per qualche secondo, senza gradini udibili). */
const PUNTI_CURVA = 64;
/** La copia successiva di un loop incrociato si programma così tanto prima (s). */
const ANTICIPO_GIRO_S = 2;

export interface Timer {
  imposta(f: () => void, ms: number): number;
  cancella(id: number): void;
}

export const timerFinestra: Timer = {
  imposta: (f, ms) => window.setTimeout(f, ms),
  cancella: (id) => window.clearTimeout(id),
};

export class TracciaInRiproduzione {
  readonly guadagno: NodoGuadagno;
  private readonly sorgenti = new Set<SorgenteBuffer>();
  private timerGiro: number | null = null;
  private fermata = false;
  /** Fine prevista dell'ultima uscita (per sapere quando liberare). */
  private onFine: (() => void) | null = null;

  constructor(
    private readonly ctx: ContestoAudio,
    readonly traccia: TracciaAudio,
    private readonly buffer: BufferAudio,
    bus: NodoAudio,
    private readonly timer: Timer,
    /** Guadagno pieno della traccia (guadagno del manifest × livello voluto). */
    private readonly pieno: number = traccia.guadagno,
  ) {
    this.guadagno = ctx.createGain();
    this.guadagno.gain.value = 0;
    this.guadagno.connect(bus);
  }

  get id(): string {
    return this.traccia.id;
  }

  /** Suona da `t` (orologio del contesto) con un'entrata di `entrataS` secondi (0 = subito pieno). */
  avvia(t: number, entrataS: number): void {
    const g = this.guadagno.gain;
    if (entrataS > 0) {
      g.setValueAtTime(0, t);
      g.setValueCurveAtTime(curvaPotenzaCostante(PUNTI_CURVA, this.pieno, true), t, entrataS);
    } else {
      g.setValueAtTime(this.pieno, t);
    }
    const giunta = this.traccia.loop ? this.traccia.giunta_s : 0;
    if (giunta > 0 && this.buffer.duration > giunta * 2) this.giroIncrociato(t, 0);
    else this.sorgente(t, this.traccia.loop);
  }

  /**
   * Dissolve in `uscitaS` secondi e poi ferma tutto; `fine` scatta a sorgenti ferme (per
   * rilasciare il buffer). Chiamarla due volte non fa danni.
   */
  ferma(uscitaS: number, fine?: () => void): void {
    if (fine) this.onFine = fine;
    if (this.fermata) return;
    this.fermata = true;
    if (this.timerGiro !== null) this.timer.cancella(this.timerGiro);
    this.timerGiro = null;
    const ora = this.ctx.currentTime;
    const g = this.guadagno.gain;
    const v = fermaAutomazione(g, ora);
    const durata = Math.max(0.02, uscitaS);
    if (v > 0) g.setValueCurveAtTime(curvaPotenzaCostante(PUNTI_CURVA, v, false), ora, durata);
    const fineT = ora + durata + 0.05;
    for (const s of this.sorgenti) {
      try {
        s.stop(fineT);
      } catch {
        // Mai partita o già fermata: niente da fare.
      }
    }
    // Senza sorgenti (o se `ended` non arrivasse) si chiude comunque col timer.
    this.timer.imposta(() => this.chiudi(), (durata + 0.3) * 1000);
  }

  /** Valore corrente del guadagno della traccia (debug). */
  get valore(): number {
    return this.guadagno.gain.value;
  }

  private chiudi(): void {
    for (const s of this.sorgenti) s.disconnect();
    this.sorgenti.clear();
    this.guadagno.disconnect();
    const f = this.onFine;
    this.onFine = null;
    f?.();
  }

  /** Una sorgente sul guadagno della traccia; `loop` = loop nativo coi punti del manifest. */
  private sorgente(t: number, loop: boolean, guadagno: NodoAudio = this.guadagno): SorgenteBuffer {
    const s = this.ctx.createBufferSource();
    s.buffer = this.buffer;
    if (loop) {
      s.loop = true;
      const { loop_inizio_s: a, loop_fine_s: b } = this.traccia;
      if (a !== null && b !== null && b <= this.buffer.duration) {
        s.loopStart = a;
        s.loopEnd = b;
      }
    }
    s.connect(guadagno);
    s.addEventListener(
      'ended',
      () => {
        s.disconnect();
        this.sorgenti.delete(s);
      },
      { once: true },
    );
    this.sorgenti.add(s);
    s.start(t);
    return s;
  }

  /** Copia `k` di un loop a giunta incrociata, con la sua dissolvenza; programma la successiva. */
  private giroIncrociato(t0: number, k: number): void {
    if (this.fermata) return;
    const durata = this.buffer.duration;
    const giunta = Math.min(this.traccia.giunta_s, durata / 2);
    const giro = giroIncrociato(t0, durata, giunta, k);
    const ponte = this.ctx.createGain();
    ponte.connect(this.guadagno);
    const p = ponte.gain;
    if (k === 0) p.setValueAtTime(1, giro.inizio);
    else {
      p.setValueAtTime(0, giro.inizio);
      p.setValueCurveAtTime(curvaPotenzaCostante(PUNTI_CURVA, 1, true), giro.inizio, giunta);
    }
    p.setValueAtTime(1, giro.fine - giunta);
    p.setValueCurveAtTime(curvaPotenzaCostante(PUNTI_CURVA, 1, false), giro.fine - giunta, giunta);
    const s = this.sorgente(giro.inizio, false, ponte);
    s.addEventListener('ended', () => ponte.disconnect(), { once: true });
    const attesaMs = Math.max(0, (giro.prossimo - ANTICIPO_GIRO_S - this.ctx.currentTime) * 1000);
    this.timerGiro = this.timer.imposta(() => this.giroIncrociato(t0, k + 1), attesaMs);
    if (k === 0) log.debug('Loop a giunta incrociata', { id: this.id, durata, giunta });
  }
}
