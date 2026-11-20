/**
 * Death and dying by the set's rule (docs/combattimento.md §3.3, docs/regole.md §2 `tiri_morte`; audit row P8-14):
 * the PC rolls its own save (Basic Fantasy's save vs. Death Ray, p. 188) instead of a fixed 10; a success leaves it
 * dying for 2d10 rounds, and it dies unless its wounds are bound or it is healed; each round is a fact; a caster who
 * survives loses its prepared spells. In and out of a fight. The SRD's three saves are unchanged. On the magia fixture.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import { GestoreCombattimento } from '../src/prove/combattimento';
import type { FonteDadi } from '../src/prove/dadi';
import { MotoreProve } from '../src/prove/motore';
import { StatoProve } from '../src/prove/stato';
import { caricaRegole } from '../src/regole/caricatore';
import { combattimentoSrd, leggiCombattimento } from '../src/regole/combattimento';
import { caricaSchedeGeneriche } from '../src/regole/schede';
import { orologioDiSistema } from '../src/turni/orologio';

const MAGIA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'magia');

class DadiPerFacce implements FonteDadi {
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

function motore(dadi: Record<number, number[]>): MotoreProve {
  const c = caricaCampagna(MAGIA);
  const regole = caricaRegole(MAGIA);
  const schede = caricaSchedeGeneriche(regole.sistema, c);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({ schede: new Map(), regole: { regole, schede }, arbitro: null, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_ilaria', 'pg_bruno', 'pg_sara'], nome }), dadi: new DadiPerFacce(dadi) });
}

let n = 0;
const azione = (autore: string, testo: string) => ({ id: `a${++n}`, autore, testo, privata: false, revisione: 1 });

describe('the death rule reads the set', () => {
  it('abilita, finestra and perde_incantesimi; the SRD keeps its three saves', () => {
    const errori: string[] = [];
    const bf = leggiCombattimento({ danni: { a_zero: { pg: 'tiri_morte' }, tiri_morte: { cd: 10, successi: 1, fallimenti: 1, abilita: 'ts_morte', finestra: '2d10', perde_incantesimi: true } } }, combattimentoSrd(), new Set(['forza']), errori);
    expect(errori).toEqual([]);
    expect(bf.danni.tiriMorte).toMatchObject({ abilita: 'ts_morte', finestra: { numero: 2, facce: 10, bonus: 0 }, perdeIncantesimi: true });
    expect(combattimentoSrd().danni.tiriMorte).toEqual({ cd: 10, successi: 3, fallimenti: 3, ventiRialza: true, unoDoppio: true });
    leggiCombattimento({ danni: { tiri_morte: { finestra: 'presto', perde_incantesimi: 'sì' } } }, combattimentoSrd(), new Set(), errori);
    expect(errori.join(' | ')).toMatch(/tiri_morte\.finestra: rounds as a formula/);
    expect(errori.join(' | ')).toMatch(/tiri_morte\.perde_incantesimi: true o false/);
  });
});

describe('outside a fight: a trap drops a PC to 0', () => {
  it('its own save at once; made, it is dying for 2d10 rounds, each one a fact; bound in time, it is stable', async () => {
    // d20 15 against Ilaria's death save (mago 2, morte 13): made. 2d10 = 2 + 1 = 3 rounds.
    const m = motore({ 20: [15], 10: [2, 1], 6: [3] });
    m.stato.danneggia('pg_ilaria', 2);
    const fatti = m.effettoDelMaster('pg_ilaria', 'danno', 5, 'Frana', 1)!.fatti.join(' ');
    expect(fatti).toMatch(/Ilaria è a terra fuori da uno scontro: tiro salvezza contro la morte 15 contro 13 → riuscito: è vivo ma svenuto, e sta morendo/);
    expect(fatti).toMatch(/Ilaria ha 3 round perché qualcuno gli fasci le ferite/);
    // A caster who survives 0 loses its prepared spells (Basic Fantasy p. 189).
    expect(fatti).toMatch(/Ilaria perde gli incantesimi preparati/);
    expect(m.morenti.restanti('pg_ilaria')).toBe(3);
    // The next window: one round goes by (a fact), then Bruno binds her wounds.
    const r = await m.risolvi(2, [azione('pg_bruno', 'Fascio le ferite di Ilaria')]);
    expect(r.fatti.join(' ')).toMatch(/Ilaria sta morendo: restano 2 round/);
    expect(r.fatti.join(' ')).toMatch(/Fasciare le ferite: Ilaria è fasciato e stabile a zero punti ferita/);
    expect(m.morenti.restanti('pg_ilaria')).toBeNull();
    expect(m.stato.fuoriGioco('pg_ilaria')).toBe('a_terra');
  });

  it('nobody binds the wounds: the PC dies when the rounds run out; a failed save kills at once', async () => {
    const m = motore({ 20: [15, 3], 10: [1, 1], 6: [3] });
    m.effettoDelMaster('pg_ilaria', 'danno', 5, 'Frana', 1);
    expect(m.morenti.restanti('pg_ilaria')).toBe(2);
    await m.risolvi(2, []);
    const r = await m.risolvi(3, []);
    expect(r.fatti.join(' ')).toMatch(/Ilaria muore: nessuno gli ha fasciato le ferite in tempo/);
    expect(m.stato.fuoriGioco('pg_ilaria')).toBe('morto');
    // Sara: 3 + Constitution 0 + folletto +2 against guerriero 1 morte 12: failed, dead.
    const f = m.effettoDelMaster('pg_sara', 'danno', 9, 'Frana', 4)!.fatti.join(' ');
    expect(f).toMatch(/Sara è a terra fuori da uno scontro: tiro salvezza contro la morte 5 contro 12 → fallimenti 1 su 1: è MORTO/);
    expect(m.stato.fuoriGioco('pg_sara')).toBe('morto');
  });

  it('healing above 0 ends the dying window', async () => {
    const m = motore({ 20: [15], 10: [5, 5], 6: [4] });
    m.effettoDelMaster('pg_ilaria', 'danno', 5, 'Frana', 1);
    expect(m.morenti.restanti('pg_ilaria')).toBe(10);
    m.effettoDelMaster('pg_ilaria', 'cura', '1d6', 'Erbe', 1);
    expect(m.morenti.restanti('pg_ilaria')).toBeNull();
    expect(m.stato.puntiFerita('pg_ilaria')!.attuali).toBe(4);
  });
});

describe('in a fight', () => {
  it('the PC rolls its own save at its step; made, the window starts (no instant «stable»)', () => {
    const regole = combattimentoSrd();
    regole.danni.tiriMorte = { cd: 10, successi: 1, fallimenti: 1, ventiRialza: false, unoDoppio: false, abilita: 'ts_morte', finestra: { numero: 2, facce: 10, bonus: 0 } };
    const stato = new StatoProve(new Map(['pg_a', 'png_x'].map((id) => [id, { id, pf_massimi: 10 }])));
    const dadi: FonteDadi = { seme: 'x', contatore: 0, tira: (f: number) => (f === 20 ? 11 : 2) };
    const morenti: string[] = [];
    const g = new GestoreCombattimento({
      regole,
      stato,
      dadi: () => dadi,
      nome: (id) => id,
      attacca: (png, pg) => (stato.danneggia(pg, 20), { t: { tipo: 'attacco', bersaglio: { id: pg, nome: pg }, riuscita: true } as never, testo: '' }),
      morale: () => null,
      nuovoIdTiro: () => 't',
      // The PC's own save: 9 to reach with +0 (an 11 makes it; a fixed DC 10 would make it too, so the number shows).
      salvezzaMorte: () => ({ contro: 9, modificatore: 0, naturali: true }),
      morente: (id, fatti) => (morenti.push(id), fatti.push(`${id} morente`)),
      log: loggerMuto(),
    });
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 5 }];
    const r = g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'png_x', bersaglio: 'pg_a' }], autori: [], candidati: () => cand });
    const f = r.fatti.join(' ');
    expect(f).toMatch(/tiro salvezza contro la morte 11 contro CD 9 → riuscito: è vivo ma svenuto, e sta morendo/);
    expect(morenti).toEqual(['pg_a']);
    expect(r.morte).toEqual([{ id: 'pg_a', nome: 'pg_a', esito: 'morente' }]);
  });
});
