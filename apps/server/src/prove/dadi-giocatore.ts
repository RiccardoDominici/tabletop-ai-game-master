/**
 * The dice a player rolled at the table (docs/prove.md §8, «Manual rolls»), as a FonteDadi for one action's test.
 *
 * The resolvers draw physical dice (`tira(20)`, `tira(6)`, two `tira(10)` for a percentile): this source serves the
 * values the player entered, in order, for the dice of the request, and falls back to the Engine's dice for anything
 * else the same roll needs afterwards (the damage of a hit, the opponent's die in a contest between two PCs). A die of
 * the request the resolver did not ask for (the shape changed: a target already down) is left unused. MotoreProve
 * compares the dice on the card with the values entered and logs a warning when they differ: a player's die is never
 * replaced silently.
 */
import type { Logger } from '../logger';
import type { FonteDadi } from './dadi';

interface DadoFisico {
  facce: number;
  valore: number;
}

/** A percentile value 1–100 as the two d10 the resolver draws: units first, then tens (00 + 0 = 100). */
function percentuale(v: number, conUnita: boolean): DadoFisico[] {
  const unita = v % 10;
  const decine = Math.floor((v % 100) / 10);
  return conUnita ? [{ facce: 10, valore: unita + 1 }, { facce: 10, valore: decine + 1 }] : [{ facce: 10, valore: decine + 1 }];
}

export class DadiDelGiocatore implements FonteDadi {
  private readonly coda: DadoFisico[];

  constructor(
    private readonly base: FonteDadi,
    /** Faces of the request's dice (100 = percentile). */
    private readonly facce: number,
    valori: readonly number[],
    private readonly log: Logger,
    private readonly etichetta: string,
  ) {
    // A percentile with a bonus die: the second value shares the units of the first, only its tens count.
    this.coda = facce === 100 ? valori.flatMap((v, i) => percentuale(v, i === 0)) : valori.map((v) => ({ facce, valore: v }));
  }

  get seme(): string {
    return this.base.seme;
  }

  get contatore(): number {
    return this.base.contatore;
  }

  tira(facce: number): number {
    const prossimo = this.coda[0];
    if (prossimo && prossimo.facce === facce) {
      this.coda.shift();
      this.log.debug({ dado: `d${facce}`, valore: prossimo.valore, prova: this.etichetta }, 'dice: player roll');
      return prossimo.valore;
    }
    return this.base.tira(facce);
  }

  /** Values the resolver never asked for (logged by the caller). */
  get inutilizzati(): number {
    return this.coda.length;
  }
}
