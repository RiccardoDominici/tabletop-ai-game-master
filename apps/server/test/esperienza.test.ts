/**
 * Experience points in play (M1, docs/prove.md §12; audit rows P4-38 … P4-42, P6-05, P6-14, P8-20, C-RACE-24): the
 * Engine counts what the defeated creatures are worth by the set's table, divides it among the PCs at the table, adds
 * a race's bonus, holds it one short of the level after next, counts treasure once it is back to safety, takes the
 * Game Master's award, and keeps it all in the snapshot and the session log. On the invented cripta fixture.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import { MotoreProve } from '../src/prove/motore';
import { caricaRegole } from '../src/regole/caricatore';
import { caricaSchedeGeneriche } from '../src/regole/schede';
import { pgAllaFine } from '../src/sessione/stato-pg';
import { orologioDiSistema } from '../src/turni/orologio';
import { azione, motoreCripta } from './aiuti/cripta';

const px = (m: MotoreProve) => Object.fromEntries(m.vistaEsperienza()!.pg.map((x) => [x.id, x.px]));

describe('XP for the defeated', () => {
  it('each enemy down is worth its hit dice once, shared by the PCs at the table, humans +10%', async () => {
    // d20 20: every attack hits; Gaia's spear 1d6+1 = 7: the skeleton (6 HP) falls at once, the putrid one (11) at two.
    const m = motoreCripta({ 20: [20], 6: [6], 8: [1] });
    await m.risolvi(1, [azione('pg_gaia', 'Colpisco Ossa con la lancia')]);
    // Ossa: 1 HD = 20 XP, three PCs: 6 each (trunc), the two humans 6 × 1.1 = 6.
    expect(m.stato.fuoriGioco('png_ossa')).toBe('morto');
    expect(px(m)).toEqual({ pg_tessa: 6, pg_oreste: 106, pg_gaia: 6 });
    // The same creature is never counted twice, in later passes.
    await m.risolvi(2, [azione('pg_gaia', 'Colpisco Putrido con la lancia')]);
    await m.risolvi(3, [azione('pg_gaia', 'Colpisco Putrido con la lancia')]);
    // Putrido: 2 HD = 40 XP: 13 each, the humans 14.
    expect(m.stato.fuoriGioco('png_putrido')).toBe('morto');
    expect(px(m)).toEqual({ pg_tessa: 19, pg_oreste: 120, pg_gaia: 20 });
    const g = m.vistaEsperienza()!.guadagni;
    expect(g.map((x) => [x.fonte, x.motivo, x.totale])).toEqual([['sconfitto', 'Ossa', 20], ['sconfitto', 'Putrido', 40]]);
    expect(g[0]!.testo).toBe('PX per Ossa: 20 in tutto (Tessa 6, Oreste 6, Gaia 6).');
  });

  it('every PC of the session shares, whatever phones are connected; the dead do not', async () => {
    const m = motoreCripta({ 20: [20], 6: [6] }, {}, ['pg_gaia']);
    m.stato.segnaUscito('pg_tessa', 'morto');
    await m.risolvi(1, [azione('pg_gaia', 'Colpisco Ossa con la lancia')]);
    // 20 XP by two: 10 each, the two humans 11.
    expect(px(m)).toEqual({ pg_tessa: 0, pg_oreste: 111, pg_gaia: 11 });
  });
});

describe('treasure and the Game Master’s award', () => {
  it('coins found count once the Game Master marks them back to safety (al_sicuro)', () => {
    const m = motoreCripta({});
    expect(m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_tessa', cosa: 'monete', monete: { mo: 30 } })!.ok).toBe(true);
    expect(m.vistaEsperienza()!.tesoro).toBe('30 mo');
    expect(px(m)).toEqual({ pg_tessa: 0, pg_oreste: 100, pg_gaia: 0 });
    const r = m.esperienzaDelMaster({ cosa: 'tesoro' }, 4)!;
    expect(r).toEqual({ ok: true, fatto: 'PX per tesoro portato al sicuro: 30 in tutto (Tessa 10, Oreste 11, Gaia 11).' });
    expect(m.vistaEsperienza()!.tesoro).toBeNull();
    expect(m.esperienzaDelMaster({ cosa: 'tesoro' }, 5)).toEqual({ ok: false, fatto: 'Nessun tesoro in attesa di tornare al sicuro.' });
  });

  it('an award to one PC, held one short of the level after next (one level per adventure)', () => {
    const m = motoreCripta({});
    // Oreste (cleric 1, 100 XP): the 3rd level is at 300, so he stops at 299; his +10% applies first.
    expect(m.esperienzaDelMaster({ cosa: 'assegna', px: 500, pg: 'pg_oreste', motivo: 'il patto col mugnaio' }, 2)!.fatto).toBe('PX per il patto col mugnaio: 500 in tutto (Oreste 199).');
    const o = m.vistaEsperienza()!.pg.find((x) => x.id === 'pg_oreste')!;
    expect(o).toMatchObject({ px: 299, livello: 1, prossimo: 150, sale: true });
    // A negative award corrects a mistake.
    m.esperienzaDelMaster({ cosa: 'assegna', px: -9, pg: 'pg_oreste' }, 2);
    expect(px(m)['pg_oreste']).toBe(290);
  });
});

describe('the snapshot and the session log', () => {
  it('XP, counted creatures and waiting treasure survive a resume; the log writes each PC’s total', async () => {
    const m = motoreCripta({ 20: [20], 6: [6] });
    await m.risolvi(1, [azione('pg_gaia', 'Colpisco Ossa con la lancia')]);
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_gaia', cosa: 'monete', monete: { mo: 3 } });
    const s = m.esporta();
    const r = motoreCripta({ 20: [20], 6: [6] });
    r.importa(s);
    expect(px(r)).toEqual(px(m));
    expect(r.vistaEsperienza()!.tesoro).toBe('3 mo');
    // The skeleton is not counted again.
    await r.risolvi(2, [azione('pg_tessa', 'Aspetto')]);
    expect(px(r)).toEqual(px(m));
    expect(pgAllaFine(s, ['pg_tessa', 'pg_oreste', 'pg_gaia'])!.map((x) => [x.id, x.px])).toEqual([['pg_tessa', 6], ['pg_oreste', 106], ['pg_gaia', 6]]);
    expect(s.esperienza!.guadagni).toHaveLength(1);
  });

  it('a package sets where each PC’s XP start', () => {
    const m = motoreCripta({}, { allInizio: { pg: { pg_tessa: { px: 77 } }, tempo: null } });
    expect(px(m)['pg_tessa']).toBe(77);
    m.azzera();
    expect(px(m)['pg_tessa']).toBe(77);
  });

  it('a set without XP rules shows and counts nothing', () => {
    const c = caricaCampagna(path.join(import.meta.dirname, 'fixtures', 'campagne', 'magia'));
    const regole = caricaRegole(path.join(import.meta.dirname, 'fixtures', 'campagne', 'magia'));
    const m = new MotoreProve({ schede: new Map(), regole: { regole, schede: caricaSchedeGeneriche(regole.sistema, c) }, arbitro: null, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: [], nome: (id) => id }) });
    expect(m.vistaEsperienza()).toBeNull();
    expect(m.esporta().esperienza).toBeUndefined();
  });
});
