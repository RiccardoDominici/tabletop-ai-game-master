/**
 * Exploration over days (docs/prove.md §14; audit P4-22, P4-23, P4-27, P8-03): a day's food and water at each midnight
 * where the party lives off its supplies, the damage and the lost healing of going without, a town that feeds everyone;
 * an exploration rest rule (the fixture's: Basic Fantasy has none); a journey's wandering checks on the terrain's table,
 * stopping at the encounter, and the leader's secret check against getting lost. On the invented cunicolo fixture.
 */
import { describe, expect, it } from 'vitest';
import { azione, motoreCunicolo as motore } from './aiuti/cunicolo';

const oggetti = (m: ReturnType<typeof motore>['m'], id: string, oggetto: string): number => m.inventario!.oggetti(id).find((x) => x.id === oggetto)?.quante ?? 0;

describe('a day’s food and water', () => {
  it('each midnight underground costs a ration day and a waterskin; a pack of three days lasts three', () => {
    const { m } = motore({ 6: [6] }, 'scena_galleria', { pg: ['pg_aldo'] });
    expect(m.tempo.testoOra()).toBe('giorno 1, 18:00');
    m.tempoDelMaster({ cosa: 'avanza', durata: { ora: 8 } }); // past midnight: day 1's meal
    expect(oggetti(m, 'pg_aldo', 'razioni')).toBe(0); // the pack is opened: two days left in it
    expect(oggetti(m, 'pg_aldo', 'otre')).toBe(1);
    expect(m.provviste!.vista('pg_aldo')).toEqual({ senza: { cibo: 0, acqua: 0 }, porzioni: { cibo: 2, acqua: 0 } });
    const e = m.tempoDelMaster({ cosa: 'avanza', durata: { giorno: 2 } })!;
    // Day 2: the pack's second day and the last waterskin; day 3: the pack's last day, no water (1d4 from the first day).
    expect(e.fatto).toMatch(/Aldo ha consumato l'ultimo giorno di acqua \(otre pieno\)\./);
    expect(e.fatto).toMatch(/Aldo ha consumato l'ultimo giorno di cibo \(razioni per tre giorni\)\./);
    expect(e.fatto).toMatch(/Aldo è senza acqua da 1 giorni: perde 1 punti ferita e le ferite non guariscono da sole\./);
    expect(m.stato.puntiFerita('pg_aldo')!.attuali).toBe(8);
  });

  it('without food two days pass harmless, then 1 a day; no natural healing until a day with food', () => {
    const { m } = motore({ 4: [2] }, 'scena_galleria', { pg: ['pg_bice'] });
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'oggetto', oggetto: 'otre', quante: 5 });
    const e = m.tempoDelMaster({ cosa: 'avanza', durata: { giorno: 3 } })!;
    expect(e.fatto).toMatch(/Bice passa un giorno senza cibo \(1\)\./);
    expect(e.fatto).toMatch(/Bice passa un giorno senza cibo \(2\)\./);
    expect(e.fatto).toMatch(/Bice è senza cibo da 3 giorni: perde 1 punti ferita e le ferite non guariscono da sole\./);
    expect(m.stato.puntiFerita('pg_bice')!.attuali).toBe(3);
    // The night heals nobody without food; and it crosses midnight: a fourth day without, 1 more.
    const r = m.riposo('notte');
    expect(r.ok && r.fatto).toMatch(/Bice non guarisce riposando: è senza cibo\./);
    expect(m.stato.puntiFerita('pg_bice')!.attuali).toBe(2);
    // Food again (a pack bought or found): the next midnight she eats, and healing comes back.
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'oggetto', oggetto: 'razioni' });
    const d = m.tempoDelMaster({ cosa: 'avanza', durata: { giorno: 1 } })!;
    expect(d.fatto).toMatch(/Bice ha di nuovo cibo: le ferite tornano a guarire\./);
    expect(m.provviste!.senzaGuarigione('pg_bice')).toBeNull();
  });

  it('a village feeds the party: its days spend nothing, and a day there ends the hunger', () => {
    const { m, vai } = motore({ 4: [2] }, 'scena_galleria', { pg: ['pg_bice'] });
    m.inventarioDelMaster({ tipo: 'inventario', id: 'pg_bice', cosa: 'oggetto', oggetto: 'otre', quante: 5 });
    m.tempoDelMaster({ cosa: 'avanza', durata: { giorno: 3 } });
    expect(m.provviste!.senzaGuarigione('pg_bice')).toBe('Cibo');
    vai('scena_locanda');
    const e = m.tempoDelMaster({ cosa: 'avanza', durata: { giorno: 1 } })!;
    expect(e.fatto).toMatch(/Bice mangia e beve a sazietà: le ferite tornano a guarire\./);
    expect(oggetti(m, 'pg_bice', 'otre')).toBe(3); // six: three drunk underground, none at the inn
  });

  it('the days without ride the snapshot', () => {
    const { m } = motore({ 4: [2] }, 'scena_galleria', { pg: ['pg_bice'] });
    m.tempoDelMaster({ cosa: 'avanza', durata: { giorno: 1 } });
    const s = JSON.parse(JSON.stringify(m.esporta()));
    const { m: r } = motore({ 4: [2] }, 'scena_galleria', { pg: ['pg_bice'] });
    r.importa(s);
    expect(r.provviste!.vista('pg_bice').senza).toEqual({ cibo: 1, acqua: 0 });
  });
});

describe('an exploration rest rule (the fixture’s; Basic Fantasy has none)', () => {
  it('past an hour without a rest the PCs are weary (−1 to attacks); «ci riposiamo» takes a turn and clears it', async () => {
    const { m } = motore({ 6: [6], 20: [10] });
    for (let k = 1; k <= 6; k++) await m.risolvi(k, [azione('pg_aldo', 'Avanzo nel buio')]);
    expect(m.vistaTempo()!.incontri!.fatica).toBe('Riposo: l\'ultimo 1 ora fa; ne serve uno di 1 turno ogni 1 ora');
    const r7 = await m.risolvi(7, [azione('pg_aldo', 'Avanzo nel buio')]);
    expect(r7.fatti.join(' ')).toMatch(/i personaggi sono stanchi \(affaticato\) finché non riposano/);
    // In the dark tunnel Aldo is also blinded (no light lit): the two conditions together.
    expect(m.combattimento.condizioniDi('pg_aldo').map((c) => c.nome)).toEqual(['Affaticato', 'Accecato']);
    const r8 = await m.risolvi(8, [azione('pg_bice', 'Ci riposiamo un momento contro la parete')]);
    expect(r8.fatti.join(' ')).toMatch(/Il gruppo si ferma a riprendere fiato: la stanchezza passa\./);
    expect(m.combattimento.condizioniDi('pg_aldo').map((c) => c.nome)).toEqual(['Accecato']);
  });

  it('a weary attacker rolls at −1, said on the card', async () => {
    const { m } = motore({ 6: [2, 3], 4: [1, 1], 20: [10] });
    m.fatica.passa(3601);
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    await m.risolvi(2, [azione('pg_aldo', 'Avanzo')]); // goblins arrive
    const a = await m.risolvi(3, [azione('pg_aldo', 'Attacco il goblin con la spada')]);
    expect(a.tiri.find((t) => t.tipo === 'attacco')!.regola).toMatch(/Affaticato −1/);
  });
});

describe('a journey through the wilderness', () => {
  it('its wandering checks on the terrain’s table; the first encounter stops it there, with the distance covered', () => {
    // Bice's 12 m a round (no armor, light load) × 2 × 0.5 in the woods = 12 miles a day: 24 miles take two days. Checks
    // every 3 hours from 18:00: 21:00 (6: none), 00:00 (1: an encounter) — six hours on the road at 1.5 miles an hour, 9
    // miles; woods table 1d4 = 2 (goblins), 1d6 = 3 of them, surprise in advance 5 (not surprised: an ambush). The
    // leader keeps the course (d20 = 15).
    const { m } = motore({ 6: [6, 1, 3, 5], 4: [2], 20: [15] }, 'scena_locanda', { pg: ['pg_bice'] });
    const e = m.tempoDelMaster({ cosa: 'viaggio', distanza: 24, terreno: 'bosco', guida: 'pg_bice' })!;
    expect(e.fatto).toMatch(/^Il gruppo percorre 9 delle 24 miglia \(bosco\): ora è giorno 2, 00:00\./);
    expect(m.esporta().fatti_in_sospeso!.join(' ')).toMatch(/arrivano 3 creature, goblin\. Si sono accorti del gruppo per primi e hanno teso un agguato\./);
    expect(m.gregariDellaScena()).toHaveLength(3);
    expect(m.vistaTempo()!.incontri!.orientamento).toBe('Bice tiene la rotta (tiro del master).');
    expect(m.tiriDelMaster().filter((t) => t.del_master).map((t) => [t.etichetta, t.nascosta])).toEqual([
      ['Orientarsi (Bice)', true],
      ['Mostri erranti (Terre selvagge)', true],
      ['Mostri erranti (Terre selvagge)', true],
      ['Tabella degli incontri', true],
      ['Quanti', true],
      ['Sorpresa, in anticipo', true],
    ]);
  });

  it('a journey without an encounter goes the whole way; on the road nobody checks the course', () => {
    const { m } = motore({ 6: [6], 20: [15] }, 'scena_locanda', { pg: ['pg_bice'] });
    const e = m.tempoDelMaster({ cosa: 'viaggio', distanza: 18, terreno: 'strada' })!;
    expect(e.fatto).toMatch(/^Il viaggio di 18 miglia \(strada\) dura 4 ore: 36 miglia al giorno/);
    expect(m.vistaTempo()!.incontri?.orientamento).toBeUndefined();
  });

  it('the leader’s check fails in secret: only the panel says the party is lost', () => {
    const { m } = motore({ 6: [6], 20: [2] }, 'scena_locanda', { pg: ['pg_aldo', 'pg_bice'] });
    const e = m.tempoDelMaster({ cosa: 'viaggio', distanza: 6, terreno: 'bosco', guida: 'pg_aldo' })!;
    expect(e.fatto).not.toMatch(/strada|smarrit|perso/);
    expect(m.vistaTempo()!.incontri!.orientamento).toBe('Aldo ha perso la strada (tiro del master): decidi tu dove arriva il gruppo.');
    expect(m.esporta().fatti_in_sospeso ?? []).not.toContainEqual(expect.stringMatching(/perso la strada/));
  });

  it('the journey eats and drinks at each midnight', () => {
    const { m } = motore({ 6: [6], 20: [15] }, 'scena_locanda', { pg: ['pg_dora'] });
    // Dora: 9 m (light armor), 9 × 2 × 0.5 = 9 miles a day; 18 miles: two days, two midnights on the way.
    const e = m.tempoDelMaster({ cosa: 'viaggio', distanza: 18, terreno: 'bosco' })!;
    expect(e.fatto).toMatch(/Dora ha consumato l'ultimo giorno di acqua/);
    expect(oggetti(m, 'pg_dora', 'otre')).toBe(0);
  });
});
