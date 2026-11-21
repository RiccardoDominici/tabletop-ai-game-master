/**
 * The invented cripta fixture (R3: progression, XP, secret rolls, Turn Undead) as an Engine for the tests: dice by
 * faces, the three PCs at the table, the fixture's set and sheets.
 */
import path from 'node:path';
import { caricaCampagna } from '../../src/campagna/caricatore';
import { loggerMuto } from '../../src/logger';
import type { FonteDadi } from '../../src/prove/dadi';
import { MotoreProve } from '../../src/prove/motore';
import { caricaRegole } from '../../src/regole/caricatore';
import { caricaSchedeGeneriche } from '../../src/regole/schede';
import { orologioDiSistema } from '../../src/turni/orologio';

export const CRIPTA = path.join(import.meta.dirname, '..', 'fixtures', 'campagne', 'cripta');

/** Dice by faces, each list in a loop (a d20 always 20: every attack hits). */
export class DadiPerFacce implements FonteDadi {
  readonly seme = 'facce';
  contatore = 0;
  private readonly i = new Map<number, number>();
  constructor(private readonly valori: Record<number, number[]>) {}
  tira(facce: number): number {
    this.contatore++;
    const l = this.valori[facce];
    if (!l?.length) return 1;
    const k = this.i.get(facce) ?? 0;
    this.i.set(facce, k + 1);
    return l[k % l.length]!;
  }
}

export function motoreCripta(dadi: Record<number, number[]>, extra: Partial<ConstructorParameters<typeof MotoreProve>[0]> = {}, pgAlTavolo = ['pg_tessa', 'pg_oreste', 'pg_gaia']): MotoreProve {
  const c = caricaCampagna(CRIPTA);
  const regole = caricaRegole(CRIPTA);
  const schede = caricaSchedeGeneriche(regole.sistema, c);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({ schede: new Map(), regole: { regole, schede }, arbitro: null, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo, nome }), dadi: new DadiPerFacce(dadi), ...extra });
}

let n = 0;
export const azione = (autore: string, testo: string) => ({ id: `a${++n}`, autore, testo, privata: false, revisione: 1 });

