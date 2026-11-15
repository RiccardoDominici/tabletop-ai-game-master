/**
 * The clock pace that follows the evening (docs/mondo.md §1, `segno_almeno_ogni: serata`). E3: torre-mozza's
 * session clock was «one mark every 9 active turns» on 8 marks, so it never filled in a real evening. Here the
 * pace comes from the minutes left, the turns per hour (default, then observed), the share of scenes where the
 * clock is active and the marks left. Invented fixture: test/fixtures/campagne/mondo.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { conScena } from '../src/campagna/tipi';
import { almenoOgniDallaSerata, MIN_MINUTI_OSSERVATI, quotaScene, TURNI_PER_ORA, turniAttesi, turniPerOra } from '../src/mondo/ritmo';
import { StatoOrologi } from '../src/scena/orologi';

const MONDO = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mondo');

describe('mondo/ritmo: the pace from the evening', () => {
  it('uses the default rate until the evening has its own turns, then the observed one', () => {
    expect(turniPerOra({ ore: 2, minutiPassati: null, turniGiocati: 0 })).toBe(TURNI_PER_ORA);
    expect(turniPerOra({ ore: 2, minutiPassati: MIN_MINUTI_OSSERVATI - 1, turniGiocati: 30 })).toBe(TURNI_PER_ORA);
    expect(turniPerOra({ ore: 2, minutiPassati: 30, turniGiocati: 40 })).toBe(80);
    expect(turniAttesi({ ore: 2, minutiPassati: 30, turniGiocati: 40 })).toBe(120); // 90 minutes left at 80/h
    expect(turniAttesi({ ore: 1, minutiPassati: 75, turniGiocati: 40 })).toBe(0); // the planned time is over
  });

  it('the share of scenes where the clock is active', () => {
    const c = caricaCampagna(MONDO);
    expect(quotaScene('o_sera', c.scene)).toBeCloseTo(2 / 3);
    expect(quotaScene('o_piena', c.scene)).toBeCloseTo(1 / 3);
    expect(quotaScene('o_nessuno', c.scene)).toBe(1);
  });

  it('N = max(segno_al_massimo_ogni, floor(turns × share / marks left)); never below the maximum pace', () => {
    const inizio = { ore: 2, minutiPassati: null, turniGiocati: 0 }; // 76 turns ahead
    expect(almenoOgniDallaSerata(inizio, 2 / 3, 8, 2)).toBe(6); // the torre-mozza shape: floor(50.7 / 8)
    expect(almenoOgniDallaSerata(inizio, 1, 4, 2)).toBe(19);
    expect(almenoOgniDallaSerata({ ore: 0.5, minutiPassati: 25, turniGiocati: 20 }, 1, 4, 2)).toBe(2); // little time left
    expect(almenoOgniDallaSerata(inizio, 1, 0, 2)).toBeNull();
  });
});

describe('StatoOrologi with segno_almeno_ogni: serata', () => {
  it('starts from the default evening and follows aggiornaSerata; numeric clocks keep their pace', () => {
    const o = new StatoOrologi(caricaCampagna(MONDO));
    const sera = o.trova('o_sera')!;
    const piena = o.trova('o_piena')!;
    expect(sera).toMatchObject({ almenoOgniSerata: true, almenoOgni: 15 }); // 2.5 h × 38 = 95 turns × 2/3 / 4 marks
    expect(piena).toMatchObject({ almenoOgniSerata: false, almenoOgni: 6 });
    const cambi = o.aggiornaSerata({ ore: 1, minutiPassati: 30, turniGiocati: 20 }); // 40/h, 30 minutes left: 20 turns
    expect(cambi).toEqual([{ id: 'o_sera', da: 15, a: 3 }]); // floor(20 × 2/3 / 4) = 3
    expect(piena.almenoOgni).toBe(6);
    // A mark shown: fewer marks left, slower pace for the same time left.
    expect(o.avanza('o_sera', 10, false).ok).toBe(true);
    o.aggiornaSerata({ ore: 1, minutiPassati: 30, turniGiocati: 20 });
    expect(sera.almenoOgni).toBe(4); // floor(13.3 / 3)
  });

  it('the evening pace makes the mark due after N active turns, like a number', () => {
    const c = caricaCampagna(MONDO);
    const o = new StatoOrologi(c);
    o.aggiornaSerata({ ore: 0.5, minutiPassati: 20, turniGiocati: 12 }); // 36/h, 10 minutes left: 6 turns × 2/3 / 4 → 1 → max pace 2
    const sera = o.trova('o_sera')!;
    expect(sera.almenoOgni).toBe(2);
    expect(o.dovuto(sera, 1)).toBe(false);
    expect(o.dovuto(sera, 2)).toBe(true);
    // In a scene where it is not active it is never due.
    o.impostaScena(conScena(c, 'scena_ponte').scena, 3);
    expect(o.dovuto(sera, 10)).toBe(false);
  });
});
