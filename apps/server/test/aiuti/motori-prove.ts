/**
 * Engines of checks for the manual-roll tests (docs/prove.md §8): the invented fixtures `prove` (SRD 5.2) and the
 * rule-set fixtures (`bx`, `soglia`, `pbta`), an arbiter that answers by the action's text, scripted Engine dice.
 */
import path from 'node:path';
import type { RichiestaTiroMaster } from '@tabletop-ai-gm/shared';
import { caricaCampagna } from '../../src/campagna/caricatore';
import { caricaSchede } from '../../src/campagna/schede';
import { loggerMuto } from '../../src/logger';
import { DadiACopione } from '../../src/prove/dadi';
import { MotoreProve, dadiAttivi, type AzionePerProve } from '../../src/prove/motore';
import type { TiroInserito } from '../../src/prove/richieste';
import type { ArbitroProve, DecisioneProva, DecisioneRegole, IngressoArbitroProve } from '../../src/prove/tipi';
import { caricaRegole } from '../../src/regole/caricatore';
import { caricaSchedeGeneriche } from '../../src/regole/schede';
import { orologioDiSistema } from '../../src/turni/orologio';

export const FIX = path.join(import.meta.dirname, '..', 'fixtures', 'campagne');
export const az = (id: string, autore: string, testo: string, privata = false): AzionePerProve => ({ id, autore, testo, privata, revisione: 1 });

export const vuotaSrd = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
export const vuotaSet = (id: string): DecisioneRegole => ({ ...vuotaSrd(id), mossa: null });

/** An arbiter that answers by the action's text (the rest of the decision empty). */
export function arbitro<D extends DecisioneProva | DecisioneRegole>(vuota: (id: string) => D, regole: Record<string, Partial<D>>): ArbitroProve<D> {
  return {
    async classifica(i: IngressoArbitroProve): Promise<Record<string, D>> {
      return Object.fromEntries(i.azioni.map((a) => [a.id, { ...vuota(a.id), ...(regole[a.testo] ?? {}) }]));
    },
  };
}

export function motoreSrd(regole: Record<string, Partial<DecisioneProva>>, dadi: number[]): MotoreProve {
  const c = caricaCampagna(path.join(FIX, 'prove'));
  const schede = caricaSchede(c);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({
    schede,
    arbitro: arbitro(vuotaSrd, regole),
    log: loggerMuto(),
    orologio: orologioDiSistema,
    attivo: dadiAttivi(c, schede).attivo,
    conIndizi: false,
    contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_ida', 'pg_corrado', 'pg_teo'], nome }),
    dadi: new DadiACopione(dadi),
  });
}

export function motoreSet(cartella: string, regoleArbitro: Record<string, Partial<DecisioneRegole>>, dadi: number[]): MotoreProve {
  const c = caricaCampagna(cartella);
  const regole = caricaRegole(cartella);
  const schede = caricaSchedeGeneriche(regole.sistema, c);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({
    schede: new Map(),
    regole: { regole, schede },
    arbitro: arbitro(vuotaSet, regoleArbitro),
    log: loggerMuto(),
    orologio: orologioDiSistema,
    attivo: true,
    conIndizi: false,
    contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: c.pg.map((p) => p.id), nome }),
    dadi: new DadiACopione(dadi),
  });
}

export const inserito = (r: RichiestaTiroMaster, valori: number[] | null, da: TiroInserito['da'] = 'telefono'): [string, TiroInserito] => [r.id, { richiesta: r, valori, da }];

