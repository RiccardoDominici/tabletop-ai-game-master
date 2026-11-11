/**
 * Manuali diversi (docs/regole.md, docs/e2e-finale.md §2 e §7): ciò che il set di Basic Fantasy non poteva
 * dire. Ogni regola dell'SRD che il Motore applicava a tutti i set ora è del set, con l'SRD come
 * predefinito quando il set tace. Sulla fixture B/X (d20 contro la difesa).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import { GestoreCombattimento } from '../src/prove/combattimento';
import { DadiACopione } from '../src/prove/dadi';
import { strumentiRegole } from '../src/prove/risolutore-regole';
import { StatoProve } from '../src/prove/stato';
import { leggiSistema } from '../src/regole/caricatore';
import { combattimentoSrd, leggiCombattimento } from '../src/regole/combattimento';
import { tiraCol } from '../src/regole/risoluzione';
import { bonusDaTabella, caratteristicaPredefinita, caricaSchedeGeneriche, valoreCaratteristica } from '../src/regole/schede';
import type { SistemaRegole } from '../src/regole/tipi';

const BX = path.join(import.meta.dirname, 'fixtures', 'campagne', 'bx');
const grezzo = (): Record<string, unknown> => YAML.parse(fs.readFileSync(path.join(BX, 'regole', 'regole.yaml'), 'utf8')) as Record<string, unknown>;

/** Il set B/X della fixture, con dei ritocchi al YAML. */
function setBx(ritocca: (d: Record<string, unknown>) => void = () => {}): SistemaRegole {
  const d = grezzo();
  ritocca(d);
  const errori: string[] = [];
  const s = leggiSistema(d, errori, []);
  expect(errori).toEqual([]);
  return s!;
}

describe('tiri contro la morte: il 20 e l’1 naturali sono del set', () => {
  it('SRD: 20 rimette in piedi, 1 conta due fallimenti; il set li può togliere', () => {
    const srd = combattimentoSrd().danni.tiriMorte!;
    expect([srd.ventiRialza, srd.unoDoppio]).toEqual([true, true]);
    const errori: string[] = [];
    const bf = leggiCombattimento({ danni: { a_zero: { pg: 'tiri_morte' }, tiri_morte: { cd: 10, successi: 1, fallimenti: 1, venti_rialza: false, uno_doppio: false } } }, combattimentoSrd(), new Set(['forza']), errori);
    expect(errori).toEqual([]);
    expect(bf.danni.tiriMorte).toEqual({ cd: 10, successi: 1, fallimenti: 1, ventiRialza: false, unoDoppio: false });
    // Senza le due chiavi: le regole dell'SRD.
    const tace = leggiCombattimento({ danni: { tiri_morte: { cd: 10 } } }, combattimentoSrd(), new Set(['forza']), []);
    expect([tace.danni.tiriMorte!.ventiRialza, tace.danni.tiriMorte!.unoDoppio]).toEqual([true, true]);
    leggiCombattimento({ danni: { tiri_morte: { venti_rialza: 'sì' } } }, combattimentoSrd(), new Set(['forza']), errori);
    expect(errori.join(' ')).toMatch(/venti_rialza: true o false/);
  });

  it('senza le regole dell’SRD un 20 è solo un successo e un 1 un fallimento', () => {
    const regole = combattimentoSrd();
    regole.danni.tiriMorte = { cd: 10, successi: 3, fallimenti: 3, ventiRialza: false, unoDoppio: false };
    const stato = new StatoProve(new Map(['pg_a', 'pg_b', 'png_x'].map((id) => [id, { id, pf_massimi: 10 }])));
    // Iniziativa: x 18 + 1, a 10 + 2, b 5. Il PNG butta a terra a (20 danni), poi il turno di a: tiro contro la morte 1.
    const dadi = new DadiACopione([10, 5, 18, 1]);
    const g = new GestoreCombattimento({ regole, stato, dadi: () => dadi, nome: (id) => id, attacca: (png, pg) => (stato.danneggia(pg, 20), { t: { tipo: 'attacco', bersaglio: { id: pg, nome: pg }, riuscita: true } as never, testo: '' }), morale: () => null, nuovoIdTiro: () => 't', log: loggerMuto() });
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 2 }, { id: 'pg_b', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 1 }];
    const r = g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(r.fatti.join(' ')).toMatch(/tiro salvezza contro la morte 1 contro CD 10 → fallito \(successi 0, fallimenti 1\)/);
    expect(r.tiri.find((t) => t.chi === 'pg_a')?.fallimento_critico).toBe(false);
  });
});

describe('critici del d20: del set, l’SRD se il set tace', () => {
  it('negli attacchi il 20 colpisce sempre e l’1 manca sempre; nelle prove no', () => {
    const s = setBx();
    expect([s.risoluzione.critico, s.risoluzione.disastro, s.risoluzione.critici]).toEqual([20, 1, 'attacchi']);
    expect(tiraCol(s, new DadiACopione([20]), 0, null, null, 'Spada', true)).toMatchObject({ riuscita: true, grado: { id: 'critico' } });
    expect(tiraCol(s, new DadiACopione([1]), 40, null, null, 'Spada', true)).toMatchObject({ riuscita: false, grado: { id: 'disastro' } });
    // Una prova col 20 naturale contro una CD troppo alta fallisce (critici solo negli attacchi).
    const alta = s.difficolta.reduce((a, b) => ((b.valore ?? 0) > (a.valore ?? 0) ? b : a)).id;
    expect(tiraCol(s, new DadiACopione([20]), -10, alta, null, 'Forza').riuscita).toBe(false);
  });

  it('il set toglie i naturali (null) o li vuole in tutti i tiri', () => {
    const senza = setBx((d) => Object.assign(d['risoluzione'] as object, { critico: null, disastro: null }));
    expect(tiraCol(senza, new DadiACopione([20]), 0, null, null, 'Spada', true)).toMatchObject({ grado: null });
    const tutti = setBx((d) => Object.assign(d['risoluzione'] as object, { critici: 'tutti' }));
    expect(tiraCol(tutti, new DadiACopione([20]), -10, null, null, 'Forza')).toMatchObject({ riuscita: true, grado: { id: 'critico' } });
    const errori: string[] = [];
    const d = grezzo();
    Object.assign(d['risoluzione'] as object, { critico: 30 });
    leggiSistema(d, errori, []);
    expect(errori.join(' ')).toMatch(/risoluzione\.critico/);
  });

  it('danno del critico (doppio o normale) e danno minimo, dal set', () => {
    const c = caricaCampagna(BX);
    const colpo = (s: SistemaRegole, dadi: number[]) => {
      const schede = caricaSchedeGeneriche(s, c);
      const stato = new StatoProve(schede);
      const o = { turno: 1, sistema: s, schede, stato, dadi: new DadiACopione(dadi), proveScena: [], nome: (id: string) => id, esiste: () => true, log: loggerMuto() };
      return strumentiRegole(o).attacca('pg_corrado', 'png_ruggero', null, [], false)!.t;
    };
    // SRD (il set tace): col 20 i dadi del danno raddoppiano (1d8 → due dadi).
    expect(colpo(setBx(), [20, 3, 5]).danno?.dadi).toHaveLength(2);
    // Basic Fantasy: il 20 colpisce, i dadi restano quelli.
    const bf = setBx((d) => Object.assign((d['attacchi'] ??= {}) as object, { danno_critico: 'normale', danno_minimo: 1 }));
    expect(colpo(bf, [20, 3]).danno?.dadi).toHaveLength(1);
    expect(bf.attacchi).toMatchObject({ dannoCritico: 'normale', dannoMinimo: 1 });
  });
});

describe('modificatore a tabella (Basic Fantasy: 13–15 = +1)', () => {
  const BF = [
    { da: 3, mod: -3 },
    { da: 4, mod: -2 },
    { da: 6, mod: -1 },
    { da: 9, mod: 0 },
    { da: 13, mod: 1 },
    { da: 16, mod: 2 },
    { da: 18, mod: 3 },
  ];

  it('la scheda scrive il punteggio, il Motore ne ricava il bonus dalla tabella del set', () => {
    const s = setBx((d) => (d['modificatore'] = { tipo: 'tabella', tabella: BF }));
    expect(s.modificatore).toBe('tabella');
    expect(s.tabellaModificatori).toEqual(BF);
    const scheda = (forza: number) => ({ id: 'x', nome: 'x', di_png: false, caratteristiche: { forza }, abilita: {}, pf_massimi: 1, difesa: 10, armatura: 0, attacchi: [], avvisi: [] }) as unknown as Parameters<typeof valoreCaratteristica>[1];
    expect([3, 5, 8, 12, 13, 15, 16, 18, 2, 20].map((v) => valoreCaratteristica(s, scheda(v), 'forza'))).toEqual([-3, -2, -1, 0, 1, 1, 2, 3, -3, 3]);
    expect(bonusDaTabella(BF, 14)).toBe(1);
    // Una caratteristica che manca vale il punteggio che dà +0.
    expect(caratteristicaPredefinita(s)).toBe(9);
  });

  it('righe sbagliate: errori del caricatore', () => {
    for (const tabella of [[], [{ da: 3 }], [{ da: 9, mod: 0 }, { da: 4, mod: -2 }]]) {
      const errori: string[] = [];
      const d = grezzo();
      d['modificatore'] = { tipo: 'tabella', tabella };
      leggiSistema(d, errori, []);
      expect(errori.join(' ')).toMatch(/modificatore\.tabella/);
    }
  });
});
