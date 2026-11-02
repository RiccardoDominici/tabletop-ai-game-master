/**
 * Misure di latenza di un turno (docs/f0-contratti.md, «Misure di latenza»).
 * Tutti i tempi in ms dall'istante in cui la finestra si chiude (t0), su orologio monotono;
 * in più la durata della finestra e i token/costo della chiamata.
 */
import type { MisureTurno } from '@cantastorie/shared';
import type { Costo } from '../llm/costi';

export type CampoTempo =
  | 'voce_sveglia'
  | 'llm_primo_token'
  | 'llm_prima_frase'
  | 'voce_richiesta'
  | 'voce_primo_audio'
  | 'schermo_inizio_audio'
  | 'llm_fine'
  | 'audio_fine';

export class MisuratoreTurno {
  private readonly tempi = new Map<CampoTempo, number>();
  private costo: Costo | null = null;
  private buchi: { buchi: number; buchi_in_frase: number; buchi_tra_frasi: number; silenzio_ms: number } | null = null;

  constructor(
    readonly turno: number,
    /** Istante monotono di chiusura della finestra (ms). */
    readonly t0: number,
    readonly finestraMs: number,
    readonly voceMotore: 'qwen' | 'mock',
    /** Epoch ms di t0, per il campo ts. */
    private readonly t0Epoch: number,
  ) {}

  /** Registra il PRIMO istante di un evento (le volte successive sono ignorate). */
  segna(campo: CampoTempo, istante: number): void {
    if (!this.tempi.has(campo)) this.tempi.set(campo, istante);
  }

  /** Registra (o sovrascrive) un istante: per eventi «di fine». */
  imposta(campo: CampoTempo, istante: number): void {
    this.tempi.set(campo, istante);
  }

  ha(campo: CampoTempo): boolean {
    return this.tempi.has(campo);
  }

  impostaCosto(costo: Costo): void {
    this.costo = costo;
  }

  /** Buchi di riproduzione riferiti dallo schermo a fine turno. */
  impostaBuchi(b: { buchi: number; buchi_in_frase: number; buchi_tra_frasi: number; silenzio_ms: number }): void {
    this.buchi = b;
  }

  private rel(campo: CampoTempo): number | null {
    const t = this.tempi.get(campo);
    return t === undefined ? null : Math.round(t - this.t0);
  }

  record(): MisureTurno {
    return {
      turno: this.turno,
      ts: new Date(this.t0Epoch).toISOString(),
      voce_motore: this.voceMotore,
      finestra_ms: Math.round(this.finestraMs),
      llm_primo_token: this.rel('llm_primo_token'),
      llm_prima_frase: this.rel('llm_prima_frase'),
      voce_richiesta: this.rel('voce_richiesta'),
      voce_primo_audio: this.rel('voce_primo_audio'),
      schermo_inizio_audio: this.rel('schermo_inizio_audio'),
      llm_fine: this.rel('llm_fine'),
      audio_fine: this.rel('audio_fine'),
      voce_sveglia: this.rel('voce_sveglia'),
      buchi: this.buchi?.buchi ?? null,
      buchi_in_frase: this.buchi?.buchi_in_frase ?? null,
      buchi_tra_frasi: this.buchi?.buchi_tra_frasi ?? null,
      silenzio_ms: this.buchi?.silenzio_ms ?? null,
      token_ingresso: this.costo?.token_ingresso ?? 0,
      token_uscita: this.costo?.token_uscita ?? 0,
      token_cache_lettura: this.costo?.token_cache_lettura ?? 0,
      token_cache_scrittura: this.costo?.token_cache_scrittura ?? 0,
      costo_usd: this.costo?.costo_usd ?? 0,
    };
  }
}
