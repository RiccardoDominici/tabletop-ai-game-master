/**
 * Motore con riserva: drama-3 come voce del gioco, ma il turno non si blocca mai per la voce.
 *
 * Per ogni frase:
 * 1. drama-3 (MotoreVoceFish), che si risolve solo al primo pezzo di audio;
 * 2. se fallisce prima dell'audio (rete, 5xx, 429, nessun audio entro il limite): log chiaro e UN
 *    ritentativo; gli errori che un ritentativo non sistema (400, 401, 402, 403, 404) non si ritentano;
 * 3. se fallisce ancora: Qwen locale, solo se `riserva()` lo dà per pronto (il selettore controlla
 *    /salute) e con le sole parole (Qwen leggerebbe direzioni e tag);
 * 4. altrimenti ErroreVoce 503: la pipeline mostra la frase senza voce (testo sullo schermo per il
 *    tempo di lettura) e il turno va avanti.
 * Un fallimento a metà frase (audio già partito) non si ritenta: la frase resta parziale.
 */
import type { Logger } from '../logger';
import type { FlussoTts, MotoreVoce, RichiestaTts, SaluteVoce } from './tipi';
import { ErroreVoce } from './tipi';

/** Errori che un secondo tentativo identico non risolve. */
const NON_RITENTABILI = new Set([400, 401, 402, 403, 404, 413]);

export class MotoreConRiserva implements MotoreVoce {
  readonly nome = 'fish' as const;
  readonly espressivo = true;

  constructor(
    private readonly primario: MotoreVoce,
    /** Il motore di riserva se è pronto adesso, altrimenti null (niente riserva). */
    private readonly riserva: () => MotoreVoce | null,
    private readonly log: Logger,
    private readonly tentativi = 2,
  ) {}

  salute(signal?: AbortSignal): Promise<SaluteVoce> {
    return this.primario.salute(signal);
  }

  sveglia(): Promise<void> {
    return this.primario.sveglia?.() ?? Promise.resolve();
  }

  async sintetizza(r: RichiestaTts, signal: AbortSignal): Promise<FlussoTts> {
    let ultimo: Error | null = null;
    for (let tentativo = 1; tentativo <= this.tentativi; tentativo++) {
      try {
        const flusso = await this.primario.sintetizza(r, signal);
        if (tentativo > 1) this.log.warn({ id: r.id, voce: r.voce, tentativo }, 'voce fish: riuscita al ritentativo');
        return flusso;
      } catch (err) {
        if (signal.aborted) throw err;
        ultimo = err as Error;
        const stato = err instanceof ErroreVoce ? err.stato : 0;
        // Voce assente dal registro: lo gestisce la pipeline (voce del narratore), non è un guasto.
        if (stato === 404) throw err;
        const ancora = tentativo < this.tentativi && !NON_RITENTABILI.has(stato);
        this.log.error(
          { id: r.id, voce: r.voce, tentativo, stato, err: (err as Error).message, poi: ancora ? 'ritento' : 'riserva' },
          'voce fish: richiesta fallita',
        );
        if (!ancora) break;
      }
    }
    const riserva = this.riserva();
    if (riserva) {
      this.log.warn({ id: r.id, voce: r.voce, riserva: riserva.nome }, `VOCE DI RISERVA: ${riserva.nome} per questa frase (drama-3 non risponde)`);
      const flusso = await riserva.sintetizza({ id: r.id, voce: r.voce, testo: r.testo }, signal);
      return { ...flusso, motore: riserva.nome };
    }
    this.log.error({ id: r.id, voce: r.voce }, 'voce fish: nessuna riserva pronta, la frase resta solo testo');
    throw new ErroreVoce(`drama-3 non disponibile e nessuna riserva: ${ultimo?.message ?? '?'}`, 503);
  }
}
