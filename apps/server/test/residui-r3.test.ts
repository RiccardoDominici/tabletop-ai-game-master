/**
 * Two leftovers of R3's live check (R4 brief, item 5): a PC at 0 when the fight ends before its step still rolls its death
 * save, at once in the pass (the player's die with manual rolls) or at the next window after the panel ended the fight;
 * an attack on undead already turned does not open a fight that closes again at once.
 */
import { describe, expect, it } from 'vitest';
import { DadiPerFacce, azione, motoreCripta } from './aiuti/cripta';
import { motoreTana } from './aiuti/tana';

describe('a PC at 0 when the fight ends before its step', () => {
  it('rolls its death save when the fight ends', async () => {
    // Order: Varo 6, Bruna 4, Dario 2. Turn 1: Dario's opening shot (d6 1), Varo strikes him down (d8 8). Turn 2: Bruna
    // kills Varo (1 HP left) before Dario's step: Dario's save vs. death now (d20 15 against 13: made, dying).
    const m = motoreTana(new DadiPerFacce({ 6: [1, 1, 4, 6, 6, 1, 1], 8: [8, 8], 20: [20, 20, 20, 15], 10: [5] }), { gregari: [] }, ['pg_dario', 'pg_bruna'], undefined, ['png_capo']);
    await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco a Varo")]);
    expect(m.stato.puntiFerita('pg_dario')!.attuali).toBe(0);
    m.impostaPf('png_capo', 1);
    const r = await m.risolvi(2, [azione('pg_bruna', 'Colpisco Varo con la spada')]);
    expect(m.combattimento.attivo).toBe(false);
    const salvezza = r.tiri.find((t) => t.chi === 'pg_dario' && t.tipo === 'salvezza');
    expect(salvezza).toMatchObject({ dado: 15, riuscita: true });
    expect(m.morenti.tutti()).toContain('pg_dario');
  });

  it('ended from the panel: the save comes at the next closed window', async () => {
    const m = motoreTana(new DadiPerFacce({ 6: [1, 1, 4, 6, 6, 1, 1], 8: [8], 20: [20, 20, 3], 10: [5] }), { gregari: [] }, ['pg_dario', 'pg_bruna'], undefined, ['png_capo']);
    await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco a Varo")]);
    expect(m.terminaCombattimento()).toBe(true);
    // The snapshot keeps the owed save (a resume, the manual-roll dry run).
    expect(m.esporta().zero_da_tirare).toEqual(['pg_dario']);
    const r = await m.risolvi(2, [azione('pg_bruna', 'Mi guardo intorno')]);
    expect(r.tiri.find((t) => t.chi === 'pg_dario' && t.tipo === 'salvezza')).toMatchObject({ dado: 3, riuscita: false });
    expect(m.stato.fuoriGioco('pg_dario')).toBe('morto');
  });
});

describe('an attack on undead already turned', () => {
  it('resolves, but opens no fight that would close at once', async () => {
    // Oreste turns both (d20 15, 2d6 hit dice 2 + 1); then Gaia strikes the turned skeleton.
    const m = motoreCripta({ 20: [15, 20], 6: [2, 1, 6], 4: [2] });
    await m.risolvi(1, [azione('pg_oreste', 'Scaccio i non morti col simbolo sacro')]);
    expect(m.combattimento.attivo).toBe(false);
    const r = await m.risolvi(2, [azione('pg_gaia', 'Colpisco Ossa con la lancia')]);
    expect(r.fatti.join(' ')).toMatch(/Gaia: attacco con Lancia a Ossa/);
    expect(r.fatti.join(' ')).not.toMatch(/Inizia il combattimento/);
    expect(m.combattimento.attivo).toBe(false);
  });
});
