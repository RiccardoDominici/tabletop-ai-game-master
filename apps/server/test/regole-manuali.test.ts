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
import { risolviTurnoRegole, strumentiRegole } from '../src/prove/risolutore-regole';
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

describe('iniziativa individuale ritirata a ogni round (ogni_round)', () => {
  it('Basic Fantasy: 1d6 + Destrezza a ogni round, per ciascuno; il nuovo ordine vale dal round dopo', () => {
    const regole = combattimentoSrd();
    regole.iniziativa = { tipo: 'individuale', dado: 6, caratteristica: 'destrezza', ogniRound: true };
    const stato = new StatoProve(new Map(['pg_a', 'pg_b', 'png_x'].map((id) => [id, { id, pf_massimi: 30 }])));
    // Round 1: a 5, b 3, x 1 → a, b, x. Round 2: a 1, b 2, x 6 → x, b, a.
    const dadi = new DadiACopione([5, 3, 1, 1, 2, 6]);
    const attacchi: string[] = [];
    const g = new GestoreCombattimento({ regole, stato, dadi: () => dadi, nome: (id) => id.replace(/^(pg|png)_/, ''), attacca: (png, pg) => (attacchi.push(`${png}>${pg}`), null), morale: () => null, nuovoIdTiro: () => 't', log: loggerMuto() });
    const cand = ['pg_a', 'pg_b', 'png_x'].map((id) => ({ id, lato: (id.startsWith('pg_') ? 'pg' : 'png') as 'pg' | 'png', mod: 0 }));
    const r1 = g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(r1.fatti[0]).toBe('Inizia il combattimento. Iniziativa: a 5, b 3, x 1.');
    expect(r1.invitati).toEqual(['pg_a']);
    g.dopoAzioni({ turno: 2, attacchi: [], autori: ['pg_a'], candidati: () => cand });
    // Dopo b tocca a x, poi il round 2 col nuovo ordine: prima x (attacca), poi b.
    const r3 = g.dopoAzioni({ turno: 3, attacchi: [], autori: ['pg_b'], candidati: () => cand });
    expect(r3.fatti).toContain('Round 2, iniziativa ritirata: x 6, b 2, a 1.');
    expect(r3.invitati).toEqual(['pg_b']);
    expect(g.vista(() => null)!.combattenti.map((c) => c.id)).toEqual(['png_x', 'pg_b', 'pg_a']);
  });

  it('senza ogni_round (SRD) l’ordine resta quello del primo round', () => {
    const regole = combattimentoSrd();
    expect(regole.iniziativa.ogniRound).toBe(false);
  });
});

describe('abilità sotto soglia (percentuali, «x su 6») e attacchi che colpiscono sempre', () => {
  const conSoglie = () =>
    setBx((d) => {
      const ab = (d['abilita'] as Array<Record<string, unknown>> | undefined) ?? [];
      ab.push({ id: 'scalare', nome: 'Scalare pareti', caratteristica: null, soglia: { dado: 100 } });
      ab.push({ id: 'porte', nome: 'Porte segrete', caratteristica: null, soglia: { dado: 6, predefinita: 1 } });
      d['abilita'] = ab;
    });

  it('il caricatore legge la soglia; un dado che non c’è è un errore', () => {
    const s = conSoglie();
    expect(s.abilita.find((a) => a.id === 'scalare')?.soglia).toEqual({ dado: 100, predefinita: null });
    expect(s.abilita.find((a) => a.id === 'porte')?.soglia).toEqual({ dado: 6, predefinita: 1 });
    const errori: string[] = [];
    const d = grezzo();
    d['abilita'] = [{ id: 'x', nome: 'X', soglia: { dado: 8 } }];
    leggiSistema(d, errori, []);
    expect(errori.join(' ')).toMatch(/abilita\.x\.soglia/);
  });

  it('d100 sotto la percentuale della scheda, d6 sotto il numero; senza valore: la predefinita o la prova normale', () => {
    const s = conSoglie();
    const c = caricaCampagna(BX);
    const prova = (sch: Record<string, number>, abilita: string, dadi: number[]) => {
      const schede = caricaSchedeGeneriche(s, c);
      const ida = schede.get('pg_ida')!;
      schede.set('pg_ida', { ...ida, abilita: sch });
      const o = { turno: 1, sistema: s, schede, stato: new StatoProve(schede), dadi: new DadiACopione(dadi), proveScena: [], nome: (id: string) => id, esiste: () => true, log: loggerMuto() };
      return risolviTurnoRegole({ ...o, azioni: [{ id: 'a1', autore: 'pg_ida', testo: 'x', privata: false }], decisioni: new Map([['a1', { id: 'a1', tipo: 'prova', abilita, caratteristica: null, mossa: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, vantaggio: null, motivo: '', aiuta: null, reazione: null, reazione_png: null, reazione_quando: 'nessuna' } as never]]) }).tiri[0]!;
    };
    // 80%: d100 = decine 7, unità 3 → 74 ≤ 80, riesce; decine 8, unità 5 → 86, no.
    expect(prova({ scalare: 80 }, 'scalare', [4, 8])).toMatchObject({ risoluzione: 'sotto_soglia', facce: 100, riuscita: true, contro: { tipo: 'soglia', valore: 80 } });
    expect(prova({ scalare: 80 }, 'scalare', [6, 9])).toMatchObject({ riuscita: false });
    // «2 su 6»: un 2 riesce, un 3 no; senza valore vale «1 su 6».
    expect(prova({ porte: 2 }, 'porte', [2])).toMatchObject({ facce: 6, riuscita: true });
    expect(prova({ porte: 2 }, 'porte', [3])).toMatchObject({ riuscita: false });
    expect(prova({}, 'porte', [1])).toMatchObject({ facce: 6, riuscita: true, contro: { valore: 1 } });
    // Una percentuale che la scheda non ha (chi non è ladro): la prova normale del set, d20 contro la CD.
    expect(prova({}, 'scalare', [15])).toMatchObject({ risoluzione: 'd20_cd', facce: 20 });
  });

  it('un’arma «automatico» colpisce sempre: niente tiro per colpire, solo il danno', () => {
    const s = setBx();
    const c = caricaCampagna(BX);
    const schede = caricaSchedeGeneriche(s, c);
    const corrado = schede.get('pg_corrado')!;
    schede.set('pg_corrado', { ...corrado, attacchi: [{ ...corrado.attacchi[0]!, id: 'dardo', nome: 'Dardo incantato', automatico: true }] });
    const o = { turno: 1, sistema: s, schede, stato: new StatoProve(schede), dadi: new DadiACopione([4]), proveScena: [], nome: (id: string) => id, esiste: () => true, log: loggerMuto() };
    const r = strumentiRegole(o).attacca('pg_corrado', 'png_ruggero', 'dardo', [], false)!;
    expect(r.t).toMatchObject({ riuscita: true, contro: { descrizione: 'colpisce sempre' } });
    expect(r.t.danno?.totale).toBeGreaterThan(0);
    expect(r.testo).toMatch(/COLPISCE/);
  });
});
