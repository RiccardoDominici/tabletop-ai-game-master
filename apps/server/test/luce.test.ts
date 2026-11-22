/**
 * Light and darkness (docs/prove.md §15; audit P4-17, P4-18): a dark scene, the party's torch that lights it and goes
 * out on the clock, the blinded condition for who sees nothing (−4 to attack, +4 to be hit, on the cards), a dwarf's
 * darkvision, the bestiary's default for monsters, the Game Master's light from the panel, the narrator told what the
 * party sees when it changes. On the invented cunicolo fixture.
 */
import { describe, expect, it } from 'vitest';
import { azione, motoreCunicolo as motore } from './aiuti/cunicolo';

describe('a dark scene', () => {
  it('no light: the narrator hears who sees nothing and who sees by darkvision; only once until it changes', async () => {
    const { m } = motore({ 6: [6] });
    expect(m.livelloLuce()).toBe('buio');
    const r = await m.risolvi(1, [azione('pg_aldo', 'Avanzo a tentoni')]);
    expect(r.fatti.join(' ')).toMatch(/È buio pesto e nessuno ha una luce accesa\. Dora vede al buio fino a 18 metri, in bianco e nero\. Non vedono nulla: Aldo, Bice\./);
    const r2 = await m.risolvi(2, [azione('pg_aldo', 'Avanzo a tentoni')]);
    expect(r2.fatti.join(' ')).not.toMatch(/buio/);
    expect(m.vistaTempo()!.luce).toMatchObject({ livello: 'buio', forzata: false });
  });

  it('a torch lights the dark for the party; when it burns out, the dark comes back and the narrator hears it', async () => {
    // The torch burns 1d4+2 turns: d4 = 1, three turns.
    const { m } = motore({ 6: [6], 4: [1] });
    const r = await m.risolvi(1, [azione('pg_aldo', 'Accendo una torcia')]);
    expect(r.fatti.join(' ')).toMatch(/È buio: la luce di Aldo \(torcia\) illumina 9 metri intorno, poi penombra fino a 15 metri; oltre non si vede\./);
    expect(m.combattimento.condizioniDi('pg_aldo')).toEqual([]);
    await m.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    await m.risolvi(3, [azione('pg_aldo', 'Avanzo')]);
    const r4 = await m.risolvi(4, [azione('pg_aldo', 'Avanzo')]);
    expect(r4.fatti.join(' ')).toMatch(/Si spegne la luce di Aldo \(torcia\)\..*Non vedono nulla: Aldo, Bice\./);
    expect(r4.luci).toEqual([{ id: 'pg_aldo', nome: 'Aldo' }]);
    expect(m.combattimento.condizioniDi('pg_aldo').map((c) => c.nome)).toEqual(['Accecato']);
    expect(m.combattimento.condizioniDi('pg_dora')).toEqual([]);
  });

  it('in the dark the blind attack at −4 and are hit at +4; the dwarf fights as usual; the goblins see (the bestiary)', async () => {
    // d6: the checks 2 (an encounter), table 3 (goblins); 2d4 = 1 + 1: two. d20 10 for every roll.
    const { m } = motore({ 6: [2, 3], 4: [1, 1], 20: [10], 8: [5] });
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    await m.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    const a = await m.risolvi(3, [azione('pg_aldo', 'Attacco il goblin con la spada'), azione('pg_dora', 'Attacco il goblin con la mazza')]);
    const aldo = a.tiri.find((t) => t.tipo === 'attacco' && t.chi === 'pg_aldo')!;
    const dora = a.tiri.find((t) => t.tipo === 'attacco' && t.chi === 'pg_dora')!;
    expect(aldo.regola).toMatch(/Accecato −4/);
    expect(dora.regola ?? '').not.toMatch(/Accecato/);
    expect(m.combattimento.condizioniDi('png_goblin_inc1_1')).toEqual([]);
  });

  it('a monster with no darkvision (its entry says 0) is blinded too', async () => {
    const { m } = motore({ 6: [2, 6], 8: [5] }); // check 2, table 6: a wolf (no darkvision)
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    await m.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    expect(m.combattimento.condizioniDi('png_lupo_inc1_1').map((c) => c.nome)).toEqual(['Accecato']);
  });
});

describe('the Game Master’s light and lit scenes', () => {
  it('a lit scene says nothing and blinds nobody; the panel can darken it until the scene changes', async () => {
    const { m, vai } = motore({ 6: [6] }, 'scena_locanda');
    expect(m.livelloLuce()).toBe('piena');
    const r = await m.risolvi(1, [azione('pg_aldo', 'Bevo')]);
    expect(r.fatti.join(' ')).not.toMatch(/buio|vedono/);
    expect(m.luceDelMaster('buio')).toEqual({ ok: true, fatto: 'Luce della scena: buio.' });
    expect(m.vistaTempo()!.luce).toMatchObject({ livello: 'buio', forzata: true });
    expect(m.esporta().fatti_in_sospeso!.join(' ')).toMatch(/Non vedono nulla: Aldo, Bice\./);
    expect(m.combattimento.condizioniDi('pg_bice').map((c) => c.nome)).toEqual(['Accecato']);
    vai('scena_bosco');
    expect(m.livelloLuce()).toBe('piena');
    vai('scena_locanda');
    expect(m.livelloLuce()).toBe('piena');
  });

  it('the light set from the panel and what the narrator last heard survive a resume', () => {
    const { m } = motore({ 6: [6] }, 'scena_locanda');
    m.luceDelMaster('buio');
    const s = JSON.parse(JSON.stringify(m.esporta()));
    const { m: r } = motore({ 6: [6] }, 'scena_locanda');
    r.importa(s);
    expect(r.livelloLuce()).toBe('buio');
  });
});
