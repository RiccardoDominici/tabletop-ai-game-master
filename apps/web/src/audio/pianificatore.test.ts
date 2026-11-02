import { describe, expect, it } from 'vitest';
import { JITTER_S, Pianificatore } from './pianificatore';

describe('Pianificatore', () => {
  it('il primo pezzo parte dopo il jitter, i successivi senza fessure', () => {
    const p = new Pianificatore(0.15);
    const a = p.programma(10, 0.2, false);
    expect(a).toEqual({ inizio: 10.15, buco: false, ripartenza: true, silenzio: 0 });
    // Arriva mentre il primo è ancora in coda: comincia esattamente dove finisce il precedente.
    const b = p.programma(10.05, 0.2, true);
    expect(b.inizio).toBeCloseTo(10.35, 10);
    expect(b.buco).toBe(false);
    expect(b.ripartenza).toBe(false);
    expect(p.fineProgrammata).toBeCloseTo(10.55, 10);
  });

  it('jitter predefinito come costante con nome', () => {
    expect(JITTER_S).toBe(0.15);
    expect(new Pianificatore().programma(0, 0.1, false).inizio).toBe(JITTER_S);
  });

  it('pezzo in ritardo a metà turno: conta un buco e riparte col jitter', () => {
    const p = new Pianificatore(0.15);
    p.programma(0, 0.2, false); // suona 0,15 → 0,35
    const tardi = p.programma(0.5, 0.2, true); // prossimoInizio (0,35) già passato
    expect(tardi.buco).toBe(true);
    expect(tardi.ripartenza).toBe(true);
    expect(tardi.inizio).toBeCloseTo(0.65, 10);
  });

  it('ritardo all’inizio di un turno nuovo: si riparte ma non è un buco', () => {
    const p = new Pianificatore(0.15);
    p.programma(0, 0.2, false);
    const nuovoTurno = p.programma(5, 0.2, false);
    expect(nuovoTurno.buco).toBe(false);
    expect(nuovoTurno.ripartenza).toBe(true);
    expect(nuovoTurno.inizio).toBeCloseTo(5.15, 10);
  });

  it('arrivo esattamente alla fine del precedente: nessun buco', () => {
    const p = new Pianificatore(0.1);
    p.programma(0, 0.5, false); // fine a 0,6
    const puntuale = p.programma(0.6, 0.5, true);
    expect(puntuale.buco).toBe(false);
    expect(puntuale.inizio).toBeCloseTo(0.6, 10);
  });

  it('anticipo e azzeramento', () => {
    const p = new Pianificatore(0.15);
    expect(p.anticipo(3)).toBe(0);
    p.programma(1, 1, false); // 1,15 → 2,15
    expect(p.anticipo(1.15)).toBeCloseTo(1, 10);
    expect(p.anticipo(3)).toBe(0);
    p.azzera();
    expect(p.fineProgrammata).toBeNull();
    expect(p.programma(4, 0.1, true)).toEqual({ inizio: 4.15, buco: false, ripartenza: true, silenzio: 0 });
  });
});
