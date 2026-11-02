import { describe, expect, it } from 'vitest';
import { righeLegami, testoConflitto, testoDipendenze } from './legami';

describe('testoDipendenze', () => {
  it('uno, due, tre nomi; senza doppioni', () => {
    expect(testoDipendenze([{ id: 'a1', nome: 'Ginestra' }])).toBe('dipende da Ginestra');
    expect(
      testoDipendenze([
        { id: 'a1', nome: 'Ginestra' },
        { id: 'a2', nome: 'Corrado' },
      ]),
    ).toBe('dipende da Ginestra e Corrado');
    expect(
      testoDipendenze([
        { id: 'a1', nome: 'Ginestra' },
        { id: 'a3', nome: 'Ginestra' },
        { id: 'a2', nome: 'Corrado' },
        { id: 'a4', nome: 'Bruno' },
      ]),
    ).toBe('dipende da Ginestra, Corrado e Bruno');
  });
  it('null se non dipende da nessuno; id se il nome è vuoto', () => {
    expect(testoDipendenze([])).toBeNull();
    expect(testoDipendenze([{ id: 'a9', nome: ' ' }])).toBe('dipende da a9');
  });
});

describe('testoConflitto', () => {
  it('esclusivo: vince o perde', () => {
    expect(testoConflitto({ id: 'a2', nome: 'Corrado', esclusivo: true, vince: true })).toBe(
      'in conflitto con Corrado · esclusivo · vince',
    );
    expect(testoConflitto({ id: 'a2', nome: 'Corrado', esclusivo: true, vince: false })).toBe(
      'in conflitto con Corrado · esclusivo · perde',
    );
  });
  it('non esclusivo: niente vince/perde (il narratore li risolve insieme)', () => {
    expect(testoConflitto({ id: 'a2', nome: 'Corrado', esclusivo: false, vince: true })).toBe(
      'in conflitto con Corrado · non esclusivo',
    );
  });
});

describe('righeLegami', () => {
  it('dipendenze prima, poi i conflitti; segna quelli persi', () => {
    const righe = righeLegami({
      dipende_da: [{ id: 'a1', nome: 'Ginestra' }],
      conflitti: [
        { id: 'a2', nome: 'Corrado', esclusivo: true, vince: false },
        { id: 'a3', nome: 'Bruno', esclusivo: false, vince: false },
      ],
    });
    expect(righe.map((r) => r.tipo)).toEqual(['dipendenza', 'conflitto', 'conflitto']);
    expect(righe.map((r) => r.perde)).toEqual([false, true, false]);
  });
  it('vuoto senza legami', () => {
    expect(righeLegami({ dipende_da: [], conflitti: [] })).toEqual([]);
  });
});
