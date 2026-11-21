/**
 * Morale as the manual times it (R4; Basic Fantasy p. 57; audit P5-44, P5-45, P5-46, P6-12, P6-29): at the first
 * opposition and at half strength (by numbers, or by hit points for a lone monster), one 2d6 for the side read against
 * each creature's own score, the Game Master's roll (hidden unless `tiri_master` shows it), a giant ant's 7 before it is
 * engaged and 12 after, flight or surrender. Invented fixture: test/fixtures/campagne/tana.
 */
import { describe, expect, it } from 'vitest';
import type { MotoreProve } from '../src/prove/motore';
import { DadiPerFacce, azione } from './aiuti/cripta';
import { motoreTana } from './aiuti/tana';

const solo = (png: string, pg: string[], dadi: Record<number, number[]>, extra = {}): MotoreProve => motoreTana(new DadiPerFacce(dadi), { gregari: [], ...extra }, pg, undefined, [png]);
const carteMorale = (tiri: Array<{ etichetta: string; nascosta?: boolean }>) => tiri.filter((t) => t.etichetta === 'Morale');

describe('when morale is checked', () => {
  it('at the first opposition: the PC\'s opening shot; above its morale the beast flees and the fight ends', async () => {
    // d6: the shot 1, Dario 1 (+1), the beast 1, surprise 6, then the morale 5 + 6 = 11 against 9.
    const m = solo('png_artigliatore', ['pg_dario'], { 6: [1, 1, 1, 6, 5, 6], 20: [20] });
    const r = await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero")]);
    expect(m.stato.fuoriGioco('png_artigliatore')).toBe('fuggito');
    expect(r.fatti.join(' ')).toMatch(/Morale dei nemici: 11 contro 9 → CEDONO e fuggono \(Artiglio Nero\)/);
    // The Game Master's roll: a card, hidden from the table by default.
    expect(carteMorale(r.tiri)).toEqual([expect.objectContaining({ dadi: [5, 6], totale: 11, nascosta: true })]);
    expect(m.combattimento.attivo).toBe(false);
  });

  it('one die for the side, read against each one\'s own score: the raiders (7) break at 8, the beast (9) holds', async () => {
    // The sword's d8 1; d6: Bruna, the beast and the three raiders 1, surprise 6, the morale 4 + 4.
    const m = motoreTana(new DadiPerFacce({ 8: [1], 6: [1, 1, 1, 1, 1, 6, 4, 4], 20: [20] }), {}, ['pg_bruna'], undefined, ['png_artigliatore']);
    const r = await m.risolvi(1, [azione('pg_bruna', 'Colpisco Artiglio Nero con la spada')]);
    expect(r.fatti.join(' ')).toMatch(/Morale dei nemici: 8 su 2d6\. Tengono: Artiglio Nero \(9\)\. CEDONO e fuggono: predone 1 \(7\), predone 2 \(7\), predone 3 \(7\)\./);
    expect(m.stato.fuoriGioco('png_artigliatore')).toBeNull();
    expect(m.stato.fuoriGioco('png_predone_tana_1')).toBe('fuggito');
  });

  it('a lone monster at half its hit points is checked again, once', async () => {
    // Turn 1: the shot 1, Dario 6 (+1), the beast 1, surprise 6, morale 2 + 2 (holds). Turn 2: the shot 1, morale 6 + 6.
    const m = solo('png_artigliatore', ['pg_dario'], { 6: [1, 6, 1, 6, 2, 2, 1, 6, 6], 20: [20] });
    const r1 = await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero")]);
    expect(r1.fatti.join(' ')).toMatch(/Morale dei nemici: 4 contro 9 → tengono/);
    const pf = m.stato.puntiFerita('png_artigliatore')!;
    m.impostaPf('png_artigliatore', Math.floor(pf.massimi / 2) + 1);
    const r2 = await m.risolvi(2, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero")]);
    expect(r2.fatti.join(' ')).toMatch(/Morale dei nemici: 12 contro 9 → CEDONO/);
  });

  it('before it is engaged and after: a giant ant\'s 4 at the first check, then 12 (it never breaks)', async () => {
    // Turn 1: the shot 1, Dario 6, the ant 1, surprise 6, morale 1 + 2 = 3 against 4 (holds). Turn 2 at half its hit
    // points: 6 + 6 = 12 against its 12 now: it holds.
    const m = solo('png_formica', ['pg_dario'], { 6: [1, 6, 1, 6, 1, 2, 1, 6, 6], 20: [20] });
    const r1 = await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco a Zampa Rossa")]);
    expect(r1.fatti.join(' ')).toMatch(/Morale dei nemici: 3 contro 4 → tengono/);
    m.impostaPf('png_formica', Math.floor(m.stato.puntiFerita('png_formica')!.massimi / 2) + 1);
    const r2 = await m.risolvi(2, [azione('pg_dario', "Tiro con l'arco a Zampa Rossa")]);
    expect(r2.fatti.join(' ')).toMatch(/Morale dei nemici: 12 contro 12 → tengono/);
    expect(m.stato.fuoriGioco('png_formica')).toBeNull();
  });
});

describe('what a broken morale does', () => {
  it('an NPC that surrenders (`si_arrende`): the set\'s condition for the scene, out of the fight, defeated for XP', async () => {
    // The sword's d8 1; d6: Bruna 1, Varo 1, surprise 6, morale 6 + 6 against 8.
    const m = solo('png_capo', ['pg_bruna'], { 8: [1], 6: [1, 1, 6, 6, 6], 20: [20] });
    const r = await m.risolvi(1, [azione('pg_bruna', 'Colpisco Varo con la spada')]);
    expect(r.fatti.join(' ')).toMatch(/Varo si arrende/);
    expect(m.attivi.condizioni('png_capo')).toEqual(['arreso']);
    expect(m.stato.fuoriGioco('png_capo')).toBeNull();
    expect(m.combattimento.attivo).toBe(false);
    expect(m.vistaEsperienza()!.guadagni.map((g) => g.motivo)).toContain('Varo');
  });

  it('the table sees the morale roll when the campaign shows the Game Master\'s rolls', async () => {
    const m = solo('png_artigliatore', ['pg_dario'], { 6: [1, 1, 1, 6, 5, 6], 20: [20] }, { tiriMaster: () => 'visibili' as const });
    const r = await m.risolvi(1, [azione('pg_dario', "Tiro con l'arco ad Artiglio Nero")]);
    expect(carteMorale(r.tiri)[0]!.nascosta).toBeUndefined();
  });
});
