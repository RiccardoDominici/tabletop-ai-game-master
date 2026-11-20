/**
 * The script feeder of the experiments harness (esperimenti/alimentatore.ts, bug C4 of docs/e2e-finale.md): in
 * turn-based combat only the PCs on turn get their action; the others wait for their own turn, in script order.
 */
import { describe, expect, it } from 'vitest';
import { AlimentatoreCopione } from '../src/esperimenti/alimentatore';
import type { Passo } from '../src/esperimenti/copione';

const az = (pg: string, azione: string): Passo => ({ tipo: 'azione', pg, azione, privata: false });

describe('AlimentatoreCopione', () => {
  it('a Game Master command of the script turn comes with its scene changes, before the actions', () => {
    const f = new AlimentatoreCopione([[{ tipo: 'master', comando: { tipo: 'riposo', riposo: 'notte' } }, az('pg_a', 'lancio il dardo')]]);
    const p = f.prossimo(null);
    expect(p.master).toEqual([{ tipo: 'riposo', riposo: 'notte' }]);
    expect(p.azioni.map((a) => a.azione)).toEqual(['lancio il dardo']);
  });

  it('out of combat: one script turn per window, scene changes first', () => {
    const f = new AlimentatoreCopione([[{ tipo: 'scena', scena: 'scena_b' }, az('pg_a', 'uno'), az('pg_b', 'due')], [az('pg_a', 'tre')]]);
    const p1 = f.prossimo(null);
    expect(p1.scene).toEqual(['scena_b']);
    expect(p1.azioni.map((a) => a.azione)).toEqual(['uno', 'due']);
    expect(p1.turnoCopione).toBe(1);
    const p2 = f.prossimo(null);
    expect(p2.azioni.map((a) => a.azione)).toEqual(['tre']);
    expect(f.finito).toBe(true);
  });

  it('in combat: only the PC on turn acts, the others wait for their turn', () => {
    const f = new AlimentatoreCopione([[az('pg_a', 'colpisco'), az('pg_b', 'scocco'), az('pg_c', 'mi riparo')], [az('pg_a', 'colpisco ancora')]]);
    const p1 = f.prossimo(['pg_b']);
    expect(p1.azioni.map((a) => a.pg)).toEqual(['pg_b']);
    expect(p1.inAttesa.sort()).toEqual(['pg_a', 'pg_c']);
    // pg_c's turn: its queued action from the same script turn, nothing new is loaded.
    const p2 = f.prossimo(['pg_c']);
    expect(p2.azioni.map((a) => a.azione)).toEqual(['mi riparo']);
    expect(p2.turnoCopione).toBe(1);
    const p3 = f.prossimo(['pg_a']);
    expect(p3.azioni.map((a) => a.azione)).toEqual(['colpisco']);
    // pg_b is on turn again with nothing queued: the next script turn is loaded; it has nothing for pg_b, so it passes.
    const p4 = f.prossimo(['pg_b']);
    expect(p4.turnoCopione).toBe(2);
    expect(p4.azioni).toEqual([]);
    expect(p4.passano).toEqual(['pg_b']);
    expect(p4.inAttesa).toEqual(['pg_a']);
    expect(f.prossimo(['pg_a']).azioni.map((a) => a.azione)).toEqual(['colpisco ancora']);
    expect(f.finito).toBe(true);
  });

  it('loads script turns until a PC on turn has something to do', () => {
    const f = new AlimentatoreCopione([[az('pg_a', 'uno')], [az('pg_a', 'due')], [az('pg_b', 'tre')]]);
    const p = f.prossimo(['pg_b']);
    expect(p.turnoCopione).toBe(3);
    expect(p.azioni.map((a) => a.azione)).toEqual(['tre']);
    // pg_a's two actions keep their order.
    expect(f.prossimo(['pg_a']).azioni.map((a) => a.azione)).toEqual(['uno']);
    expect(f.prossimo(['pg_a']).azioni.map((a) => a.azione)).toEqual(['due']);
    expect(f.finito).toBe(true);
  });

  it('a dead PC\'s queued actions are dropped: it never comes on turn again', () => {
    const f = new AlimentatoreCopione([[az('pg_a', 'uno'), az('pg_b', 'due')], [az('pg_a', 'tre'), az('pg_b', 'quattro')]]);
    f.prossimo(['pg_a']);
    const p = f.prossimo(['pg_a'], new Set(['pg_b']));
    expect(p.scartate).toBe(1);
    expect(p.azioni.map((a) => a.azione)).toEqual(['tre']);
    // Loading script turn 2 for pg_a queued pg_b's next action too: it goes at the next window.
    expect(p.inAttesa).toEqual(['pg_b']);
    expect(f.prossimo(['pg_a'], new Set(['pg_b'])).scartate).toBe(1);
    expect(f.finito).toBe(true);
  });

  it('after the combat the queued actions go out before the next script turn', () => {
    const f = new AlimentatoreCopione([[az('pg_a', 'uno'), az('pg_b', 'due')], [az('pg_a', 'tre'), az('pg_b', 'quattro')]]);
    f.prossimo(['pg_a']);
    const fuori = f.prossimo(null);
    expect(fuori.azioni.map((a) => a.azione)).toEqual(['due']);
    expect(fuori.turnoCopione).toBe(1);
    expect(f.prossimo(null).azioni.map((a) => a.azione)).toEqual(['tre', 'quattro']);
  });
});
