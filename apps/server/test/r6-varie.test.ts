/**
 * The R6 leftovers (docs/combattimento.md, docs/prove.md §13; audit P5-46, P4-11): the Game Master's adjustment to a
 * morale score within the set's limit and never to a 12; a locked door forced on the stuck door's range, on another die
 * (`soglia.come`). On the invented cunicolo fixture; Basic Fantasy's numbers in manuale-basic-fantasy.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { azione, motoreCunicolo as motore } from './aiuti/cunicolo';

describe('the Game Master’s morale adjustment', () => {
  it('within ±2, on the panel and on the roll; 0 clears it; a 12 is never adjusted; beyond the limit refused', async () => {
    // Goblins arrive (check 2, table 3, 2d4 = 1 + 1); their morale is 7.
    const { m } = motore({ 6: [2, 3], 4: [1, 1], 8: [5] });
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    await m.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    expect(m.combattimentoMaster().morale).toMatchObject({ massimo: 2, png: [{ id: 'png_goblin_inc1_1', base: 7, aggiustamento: 0, ora: 7 }, { id: 'png_goblin_inc1_2', base: 7, ora: 7 }] });
    expect(m.moraleDelMaster('png_goblin_inc1_1', 2)).toEqual({ ok: true, fatto: "Morale di Goblin 1: 7, con l'aggiustamento del master +2 ora 9." });
    expect(m.combattimentoMaster().morale!.png[0]).toMatchObject({ aggiustamento: 2, ora: 9 });
    expect(m.moraleDelMaster('png_goblin_inc1_1', 3)).toEqual({ ok: false, motivo: 'fuori_limite' });
    expect(m.moraleDelMaster('pg_aldo', 1)).toEqual({ ok: false, motivo: 'senza_morale' });
    // It rides the snapshot; 0 clears it.
    const s = JSON.parse(JSON.stringify(m.esporta()));
    const { m: r } = motore({ 6: [6] });
    r.importa(s);
    expect(r.combattimentoMaster().morale!.png[0]).toMatchObject({ aggiustamento: 2, ora: 9 });
    expect(r.moraleDelMaster('png_goblin_inc1_1', 0)).toMatchObject({ ok: true });
    expect(r.combattimentoMaster().morale!.png[0]).toMatchObject({ aggiustamento: 0, ora: 7 });
  });
});

describe('a locked door on the stuck door’s range, on 1d10', () => {
  it('the range derived from the sheet (1 + Strength) and rolled on the ability’s own die', async () => {
    // Aldo, Strength 15: +1 → a stuck door on 1–2 of 1d6, a locked one on 1–2 of 1d10.
    const { m } = motore({ 6: [6], 10: [2] }, 'scena_locanda');
    const r = await m.risolvi(1, [azione('pg_aldo', 'Sfondo la porta chiusa a chiave della cantina')]);
    const t = r.tiri.find((x) => x.chi === 'pg_aldo')!;
    expect(t).toMatchObject({ facce: 10, dadi: [2], riuscita: true, contro: { tipo: 'soglia', valore: 2 } });
  });
});
