import { describe, expect, it } from 'vitest';
import { avvisoFineVicina, dataLeggibile, oreValide, testoMinuti, testoOre } from './serata';

describe('testoMinuti', () => {
  it('minuti sotto l’ora e ore con i minuti a due cifre', () => {
    expect(testoMinuti(35)).toBe('35 min');
    expect(testoMinuti(65)).toBe('1 h 05 min');
    expect(testoMinuti(120)).toBe('2 h');
  });

  it('sotto zero dice quanto si è oltre la fine prevista', () => {
    expect(testoMinuti(-5)).toBe('oltre di 5 min');
    expect(testoMinuti(-61)).toBe('oltre di 1 h 01 min');
  });

  it('arrotonda ai minuti interi', () => {
    expect(testoMinuti(14.6)).toBe('15 min');
  });
});

describe('testoOre', () => {
  it('virgola decimale e singolare', () => {
    expect(testoOre(2)).toBe('2 ore');
    expect(testoOre(2.5)).toBe('2,5 ore');
    expect(testoOre(2.25)).toBe('2,25 ore');
    expect(testoOre(1)).toBe('1 ora');
  });
});

describe('oreValide', () => {
  it('accetta da mezz’ora a otto ore, a passi di un quarto d’ora', () => {
    expect(oreValide(0.5)).toBe(true);
    expect(oreValide(2.75)).toBe(true);
    expect(oreValide(8)).toBe(true);
  });

  it('rifiuta fuori intervallo, fuori passo e valori non numerici', () => {
    expect(oreValide(0.25)).toBe(false);
    expect(oreValide(8.25)).toBe(false);
    expect(oreValide(2.1)).toBe(false);
    expect(oreValide(Number.NaN)).toBe(false);
  });
});

describe('avvisoFineVicina', () => {
  it('dice quanti minuti mancano', () => {
    expect(avvisoFineVicina(12, false)).toBe('Mancano 12 minuti: avviati alla chiusura');
    expect(avvisoFineVicina(1, false)).toBe('Manca 1 minuto: avviati alla chiusura');
  });

  it('con un climax aggiunge che il narratore aspetta', () => {
    expect(avvisoFineVicina(3, true)).toContain("c'è un climax in corso: il narratore aspetta");
  });
});

describe('dataLeggibile', () => {
  it('una data in italiano, stringa vuota se non si legge', () => {
    expect(dataLeggibile('2026-11-09T20:30:00')).toMatch(/9 novembre 2026/);
    expect(dataLeggibile('non una data')).toBe('');
  });
});
