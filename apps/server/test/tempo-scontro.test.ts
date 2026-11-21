/**
 * The window that opens a fight (R2's leftover, docs/prove.md §11): it is the fight's first moment, not a turn of
 * exploring, so it costs one round of the game clock and a bonus drunk or cast just before (Shield, a potion of a few
 * rounds) is still on when the blows fall. A window of exploring still costs the set's turn. On the cripta fixture.
 */
import { describe, expect, it } from 'vitest';
import { azione, motoreCripta } from './aiuti/cripta';

describe('a window that opens a fight', () => {
  it('costs a round: the potion drunk in the window before still adds to the attack', async () => {
    const m = motoreCripta({ 20: [10], 6: [3] });
    await m.risolvi(1, [azione('pg_gaia', 'Bevo la pozione di eroismo')]);
    expect(m.attivi.bonus('pg_gaia', 'attacchi')).toBe(2);
    const prima = m.tempo.trascorsi;
    const r = await m.risolvi(2, [azione('pg_gaia', 'Colpisco Ossa con la lancia')]);
    // Gaia: attack +1 (table), Forza 15 (+1), the potion +2.
    expect(r.tiri.find((t) => t.chi === 'pg_gaia' && t.tipo === 'attacco')!.modificatore).toBe(4);
    expect(m.attivi.bonus('pg_gaia', 'attacchi')).toBe(2);
    expect(m.tempo.trascorsi - prima).toBe(10);
  });

  it('a window of exploring still costs a turn: the same potion is gone by then', async () => {
    const m = motoreCripta({ 20: [10], 6: [3] });
    await m.risolvi(1, [azione('pg_gaia', 'Bevo la pozione di eroismo')]);
    const prima = m.tempo.trascorsi;
    await m.risolvi(2, [azione('pg_gaia', 'Guardo le nicchie')]);
    expect(m.tempo.trascorsi - prima).toBe(600);
    expect(m.attivi.bonus('pg_gaia', 'attacchi')).toBe(0);
  });
});
