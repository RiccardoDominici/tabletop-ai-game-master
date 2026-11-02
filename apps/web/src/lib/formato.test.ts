import { describe, expect, it } from 'vitest';
import { elencoNomi, formattaCosto, formattaMs, secondiRimasti, virgolettato } from './formato';

describe('formato', () => {
  it('formattaMs', () => {
    expect(formattaMs(null)).toBe('—');
    expect(formattaMs(undefined)).toBe('—');
    expect(formattaMs(Number.NaN)).toBe('—');
    expect(formattaMs(612.4)).toBe('612 ms');
    expect(formattaMs(10607)).toBe('10\u202f607 ms');
    expect(formattaMs(1234567)).toBe('1\u202f234\u202f567 ms');
  });

  it('virgolettato non raddoppia le virgolette', () => {
    expect(virgolettato('Restate uniti')).toBe('«Restate uniti»');
    expect(virgolettato(' «Restate uniti.» ')).toBe('«Restate uniti.»');
    expect(virgolettato('"Ciao"')).toBe('"Ciao"');
  });

  it('formattaCosto', () => {
    expect(formattaCosto(0.00231)).toBe('$0.00231');
    expect(formattaCosto(0.0421)).toBe('$0.0421');
    expect(formattaCosto(null)).toBe('—');
  });

  it('secondiRimasti arrotonda per eccesso e non va sotto zero', () => {
    expect(secondiRimasti(10_000, 0)).toBe(10);
    expect(secondiRimasti(10_000, 9_001)).toBe(1);
    expect(secondiRimasti(10_000, 12_000)).toBe(0);
  });

  it('elencoNomi', () => {
    expect(elencoNomi([])).toBe('');
    expect(elencoNomi(['Aldo'])).toBe('Aldo');
    expect(elencoNomi(['Aldo', 'Bea'])).toBe('Aldo e Bea');
    expect(elencoNomi(['Aldo', 'Bea', 'Cosimo'])).toBe('Aldo, Bea e Cosimo');
  });
});
