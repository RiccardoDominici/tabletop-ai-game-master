/**
 * The invented cunicolo fixture (R6: exploration on the clock) as a ready Engine for the tests: dice by faces, a scene to
 * start in and a way to change scene, the three PCs at the table. Used by esplorazione*.test.ts and luce.test.ts.
 */
import path from 'node:path';
import { caricaCampagna } from '../../src/campagna/caricatore';
import { conScena, type Campagna } from '../../src/campagna/tipi';
import { loggerMuto } from '../../src/logger';
import type { FonteDadi } from '../../src/prove/dadi';
import { MotoreProve } from '../../src/prove/motore';
import type { TiriMaster } from '../../src/prove/modalita';
import { caricaRegole } from '../../src/regole/caricatore';
import { caricaSchedeGeneriche } from '../../src/regole/schede';
import { orologioDiSistema } from '../../src/turni/orologio';

export const CUNICOLO = path.join(import.meta.dirname, '..', 'fixtures', 'campagne', 'cunicolo');

/** Dice by faces: each face count has its own sequence (cycled); anything else rolls 1. Copyable for the dry run. */
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
  clona(): DadiPerFacce {
    const d = new DadiPerFacce(this.valori);
    for (const [k, v] of this.i) d.i.set(k, v);
    d.contatore = this.contatore;
    return d;
  }
}

/** The Engine on the fixture, in the scene `scena` (switchable through `vai`), with these PCs at the table. */
export function motoreCunicolo(dadi: Record<number, number[]>, scena = 'scena_galleria', o: { pg?: string[]; tiriMaster?: TiriMaster } = {}): { m: MotoreProve; vai: (id: string) => void; c: () => Campagna } {
  const base = caricaCampagna(CUNICOLO);
  const regole = caricaRegole(CUNICOLO);
  if (regole.sistema.id !== 'cunicolo-prova') throw new Error(`the fixture's set did not load: ${regole.avvisi.join('; ')}`);
  const schede = caricaSchedeGeneriche(regole.sistema, base);
  let c = conScena(base, scena);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? id;
  const pgAlTavolo = o.pg ?? ['pg_aldo', 'pg_bice', 'pg_dora'];
  const m = new MotoreProve({ schede: new Map(), regole: { regole, schede }, arbitro: null, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo, nome }), dadi: new DadiPerFacce(dadi), ...(o.tiriMaster ? { tiriMaster: () => o.tiriMaster! } : {}) });
  return { m, vai: (id) => void (c = conScena(base, id)), c: () => c };
}

let n = 0;
/** A public action of `autore`. */
export const azione = (autore: string, testo: string) => ({ id: `a${++n}`, autore, testo, privata: false, revisione: 1 });
