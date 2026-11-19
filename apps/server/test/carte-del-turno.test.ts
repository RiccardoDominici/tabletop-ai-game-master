/**
 * The cards of an earlier turn (prove/motore.ts, carteDelTurno): a `subito` line is checked against the cards of its own
 * turn when it is said later (repertorio/stato.ts, motivoEsitoPer). Final round, attempt 6, CA T10: a line written for
 * T7 and said at T10 found no cards at all, «no card of this turn says so», and its true miss was refused.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaSchede } from '../src/campagna/schede';
import { loggerMuto } from '../src/logger';
import { DadiACopione } from '../src/prove/dadi';
import { MotoreProve } from '../src/prove/motore';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { orologioDiSistema } from '../src/turni/orologio';

const c = caricaCampagna(path.join(import.meta.dirname, 'fixtures', 'campagne', 'prove'));
const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
class Arbitro implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    return Object.fromEntries(i.azioni.map((a) => [a.id, /pane/i.test(a.testo) ? { ...base(a.id), tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_bertoldo' } : base(a.id)]));
  }
}

describe('the cards of an earlier turn', () => {
  it('are still there a few turns later, each with its own turn', async () => {
    const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
    const m = new MotoreProve({ schede: caricaSchede(c), arbitro: new Arbitro(), log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_ida', 'pg_teo'], nome }), dadi: new DadiACopione([2, 18, 5]) });
    const azione = (turno: number) => [{ id: `a${turno}`, autore: 'pg_ida', testo: 'Porto a Bertoldo il pane del tempio e gli chiedo la strada.', privata: false, revisione: 1 }];
    for (const t of [1, 2, 3]) await m.risolvi(t, azione(t));
    expect(m.carteDelTurno(3).map((x) => x.turno)).toEqual([3]);
    const prima = m.carteDelTurno(1);
    expect(prima.length).toBe(1);
    expect(prima[0]!.turno).toBe(1);
    expect(m.carteDelTurno(2).map((x) => x.turno)).toEqual([2]);
    // Its own outcome, not the last turn's.
    expect(prima[0]!.totale).not.toBe(m.carteDelTurno(2)[0]!.totale);
    expect(m.carteDelTurno(9)).toEqual([]);
  });
});
