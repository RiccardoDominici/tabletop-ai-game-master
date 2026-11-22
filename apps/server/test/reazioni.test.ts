/**
 * Reaction rolls (rules-engine package R5; regole/reazioni.ts, prove/motore.ts reazioneDelMaster; audit P5-05, P4-31,
 * C-ABI-12): the Game Master's roll of how someone reacts, by the set's table — the table's dice with the Engine's dice,
 * + the lead PC's characteristic bonus + the Game Master's adjustment, read on the bands; the band goes to the narrator
 * in the next turn, the card stays the Game Master's, the attitude follows the band. On the invented fucina fixture.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaRegole, leggiSistema } from '../src/regole/caricatore';
import { fasciaReazione, leggiReazioni } from '../src/regole/reazioni';
import { FIX, az, motoreSet } from './aiuti/motori-prove';

const FUCINA = path.join(FIX, 'fucina');

describe('reaction tables as data', () => {
  it('the bands from the lowest, each up to its fino_a, the last for the rest', () => {
    const t = caricaRegole(FUCINA).sistema.reazioni![0]!;
    expect(t).toMatchObject({ id: 'reazione', dadi: { numero: 2, facce: 6, bonus: 0 }, caratteristica: 'mente' });
    expect([2, 4, 5, 9, 10, 15].map((n) => fasciaReazione(t, n).nome)).toEqual(['Ostile', 'Ostile', 'Diffidente', 'Diffidente', 'Cordiale', 'Cordiale']);
  });

  it('refuses bands out of order, a last band with a limit, an unknown characteristic or attitude', () => {
    const errori: string[] = [];
    leggiReazioni([{ id: 'x', dadi: '2d6', caratteristica: 'fortuna', fasce: [{ fino_a: 7, nome: 'a' }, { fino_a: 5, nome: 'b', atteggiamento: 'furioso' }] }], new Set(['mente']), errori);
    const msg = errori.join(' | ');
    expect(msg).toMatch(/«fortuna» is not a characteristic/);
    expect(msg).toMatch(/atteggiamento: ostile, indifferente, amichevole/);
    expect(msg).toMatch(/«fino_a» grows band after band/);
    expect(msg).toMatch(/the last band has fino_a: null/);
    const e2: string[] = [];
    leggiSistema({ id: 'x', nome: 'x', licenza: { libera: true }, risoluzione: { tipo: 'd20_cd' }, caratteristiche: [{ id: 'forza' }], difficolta: [{ id: 'n', valore: 10 }], reazioni: 'no' }, e2, []);
    expect(e2.join(' | ')).toMatch(/reazioni: a list/);
  });
});

describe('the Game Master rolls a reaction', () => {
  it('2d6 + the lead PC\'s bonus + the adjustment; the band to the narrator next turn, the card the Game Master\'s', async () => {
    // Brina's Mente 10: +0. Dice 3 + 4 = 7, adjustment +3 = 10: «Cordiale».
    const m = motoreSet(FUCINA, {}, [3, 4]);
    const r = m.reazioneDelMaster({ tabella: 'reazione', pg: 'pg_brina', png: 'png_orsola', aggiustamento: 3 }, 1);
    expect(r).toMatchObject({ ok: true, atteggiamento: 'amichevole' });
    const carta = m.tiriDelMaster().at(-1)!;
    expect(carta).toMatchObject({ etichetta: "Reazione all'incontro", dadi: [3, 4], modificatore: 3, totale: 10, del_master: true, nascosta: true, regola: '2d6 +3 = 10: Cordiale' });
    // The narrator hears it with the next turn's facts.
    const turno = await m.risolvi(1, [az('a1', 'pg_brina', 'Saluto Orsola')]);
    expect(turno.fatti.join(' ')).toMatch(/Tiro di reazione del master \(Reazione all'incontro\): Orsola verso Brina, Cordiale \(2d6 \+3 = 10: Cordiale\)/);
  });

  it('the low band; a table or a PC the Engine does not know, or an adjustment past ±10, is refused', () => {
    const m = motoreSet(FUCINA, {}, [1, 2]);
    expect(m.reazioneDelMaster({ tabella: 'reazione', pg: 'pg_brina', png: null, aggiustamento: 0 }, 1)).toMatchObject({ ok: true, atteggiamento: 'ostile' });
    expect(m.reazioneDelMaster({ tabella: 'nessuna', pg: 'pg_brina', png: null, aggiustamento: 0 }, 1)).toEqual({ ok: false });
    expect(m.reazioneDelMaster({ tabella: 'reazione', pg: 'pg_nessuno', png: null, aggiustamento: 0 }, 1)).toEqual({ ok: false });
    expect(m.reazioneDelMaster({ tabella: 'reazione', pg: 'pg_brina', png: null, aggiustamento: 11 }, 1)).toEqual({ ok: false });
  });
});
