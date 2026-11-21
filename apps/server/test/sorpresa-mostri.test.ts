/**
 * Surprise per creature (R4; Basic Fantasy pp. 50, 75, 84…; audit P5-04, P6-28): a monster that surprises its foes on
 * more faces (`sorprende: 4`) and one hard to surprise (a trait `{sorpresa: -1}`: only on a 1), each read against the
 * side's one die. Invented fixture: tana (the ash snake hides in the ashes, the lantern wraith is never caught unawares).
 */
import { describe, expect, it } from 'vitest';
import { DadiPerFacce } from './aiuti/cripta';
import { motoreTana } from './aiuti/tana';

const condizioni = (m: ReturnType<typeof motoreTana>, id: string) => m.vistaCombattimento()!.combattenti.find((c) => c.id === id)!.condizioni.map((c) => c.id);

describe('surprise by the stat block', () => {
  it('an ambusher: the PCs are surprised on 1–4 when it is among their foes', () => {
    // d6: initiative Bruna 1, the snake 1; the PCs' surprise die 3, the enemies' 6.
    const m = motoreTana(new DadiPerFacce({ 6: [1, 1, 3, 6] }), { gregari: [] }, ['pg_bruna'], undefined, ['png_serpe']);
    m.iniziaCombattimento();
    expect(condizioni(m, 'pg_bruna')).toContain('sorpreso');
    // The same die with an ordinary foe: 3 is above 1–2.
    const n = motoreTana(new DadiPerFacce({ 6: [1, 1, 3, 6] }), { gregari: [] }, ['pg_bruna'], undefined, ['png_artigliatore']);
    n.iniziaCombattimento();
    expect(condizioni(n, 'pg_bruna')).not.toContain('sorpreso');
  });

  it('hard to surprise: the wraith is caught only on a 1', () => {
    // d6: initiative 1 and 1; the PCs' die 6, the enemies' 2.
    const m = motoreTana(new DadiPerFacce({ 6: [1, 1, 6, 2] }), { gregari: [] }, ['pg_bruna'], undefined, ['png_spettro']);
    m.iniziaCombattimento();
    expect(condizioni(m, 'png_spettro')).not.toContain('sorpreso');
  });
});
