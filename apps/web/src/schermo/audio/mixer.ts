/**
 * Il mixer del proiettore: un GainNode per bus, il ducking sotto la voce e il volume generale.
 *
 *   tracce musica   → [musica]   ─┐
 *   strati ambiente → [ambiente] ─┴→ [sotto voce] ─┐
 *   temi dei PNG    → [temi] ─────────────────────┤
 *   effetti         → [effetti] ──────────────────┼→ [generale] → casse
 *   voce (LettorePcm) → [voce] ───────────────────┘
 *
 * «sotto voce» è il ducking: scende di ~9 dB mentre la voce suona e risale dopo (PianoDucking).
 * I suoi comandi sono solo setTargetAtTime in avanti nel tempo, mai cancellazioni (una
 * cancellazione ripristina di colpo il valore di prima: si sentirebbe uno scatto).
 * Volumi e muti dei bus vengono dalle impostazioni (pannello, localStorage).
 */
import { creaLog } from '../../lib/log';
import type { ContestoAudio, NodoGuadagno } from './contesto';
import { BUS, guadagnoBus, type ImpostazioneBus, type ImpostazioniMixer, type NomeBus } from './impostazioni';
import type { ComandoDucking } from './regole';

const log = creaLog('audio-mixer');

/** Costante di tempo dei cambi di volume dal pannello (s): morbidi ma pronti. */
const TAU_VOLUME_S = 0.05;

export class Mixer {
  readonly bus: Readonly<Record<NomeBus, NodoGuadagno>>;
  /** Ducking di musica e ambienti. */
  readonly sottoVoce: NodoGuadagno;
  readonly generale: NodoGuadagno;
  private ultimoDucking = 0;

  constructor(
    private readonly ctx: ContestoAudio,
    impostazioni: ImpostazioniMixer,
  ) {
    this.generale = ctx.createGain();
    this.generale.connect(ctx.destination);
    this.sottoVoce = ctx.createGain();
    this.sottoVoce.connect(this.generale);
    const bus = {} as Record<NomeBus, NodoGuadagno>;
    for (const nome of BUS) {
      const g = ctx.createGain();
      g.gain.value = guadagnoBus(impostazioni[nome]);
      g.connect(nome === 'musica' || nome === 'ambiente' ? this.sottoVoce : this.generale);
      bus[nome] = g;
    }
    this.bus = bus;
    log.info('Mixer pronto', { bus: BUS.map((n) => `${n}=${guadagnoBus(impostazioni[n]).toFixed(2)}`).join(' ') });
  }

  /** Volume o muto di un bus (dal pannello): raggiunto in ~150 ms. */
  imposta(nome: NomeBus, b: ImpostazioneBus): void {
    const ora = this.ctx.currentTime;
    this.bus[nome].gain.setTargetAtTime(guadagnoBus(b), ora, TAU_VOLUME_S);
  }

  /** Applica i comandi del PianoDucking (già in ordine di tempo). */
  ducking(comandi: readonly ComandoDucking[]): void {
    for (const c of comandi) {
      const t = Math.max(c.a, this.ultimoDucking, this.ctx.currentTime);
      this.ultimoDucking = t;
      this.sottoVoce.gain.setTargetAtTime(c.valore, t, c.tau);
      log.debug('Ducking', { verso: c.verso, valore: Number(c.valore.toFixed(3)), t: Number(t.toFixed(3)) });
    }
  }

  /** Valori correnti dei guadagni (HUD, debug e2e). */
  guadagni(): Record<string, number> {
    const out: Record<string, number> = { generale: this.generale.gain.value, sotto_voce: this.sottoVoce.gain.value };
    for (const nome of BUS) out[`bus_${nome}`] = this.bus[nome].gain.value;
    return out;
  }
}
