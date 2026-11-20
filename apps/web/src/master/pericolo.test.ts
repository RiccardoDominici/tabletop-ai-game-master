/** Valori di pericolo digitati dal master (pericolo.ts): formule di dadi, numeri interi, altezze di caduta. */
import { describe, expect, it } from 'vitest';
import { valorePericolo } from './pericolo';

describe('valorePericolo', () => {
  it('danno e cura: accetta formule di dadi e le restituisce minuscole senza spazi', () => {
    expect(valorePericolo('danno', '2d6')).toBe('2d6');
    expect(valorePericolo('danno', 'd20')).toBe('d20');
    expect(valorePericolo('cura', '1d8+2')).toBe('1d8+2');
    expect(valorePericolo('danno', '2D6 + 3')).toBe('2d6+3');
    expect(valorePericolo('cura', '3d4 - 1')).toBe('3d4-1');
    expect(valorePericolo('danno', '1d100')).toBe('1d100');
  });

  it('danno e cura: accetta interi da 0 a 999 e li restituisce come numero', () => {
    expect(valorePericolo('danno', '0')).toBe(0);
    expect(valorePericolo('cura', '5')).toBe(5);
    expect(valorePericolo('danno', ' 999 ')).toBe(999);
    expect(valorePericolo('cura', '1000')).toBeNull();
  });

  it('danno e cura: rifiuta dadi non standard, formule incomplete e testo libero', () => {
    expect(valorePericolo('danno', 'd7')).toBeNull();
    expect(valorePericolo('danno', '2d6+')).toBeNull();
    expect(valorePericolo('cura', '2d')).toBeNull();
    expect(valorePericolo('danno', '2d6 o altezza')).toBeNull();
    expect(valorePericolo('cura', '1e3')).toBeNull();
    expect(valorePericolo('danno', '-5')).toBeNull();
    expect(valorePericolo('cura', '1.5')).toBeNull();
  });

  it('caduta: accetta altezze decimali con virgola o punto e le restituisce come numero', () => {
    expect(valorePericolo('caduta', '1,5')).toBe(1.5);
    expect(valorePericolo('caduta', '1.5')).toBe(1.5);
    expect(valorePericolo('caduta', '0')).toBe(0);
    expect(valorePericolo('caduta', '10000')).toBe(10000);
  });

  it('caduta: rifiuta valori fuori intervallo, negativi, formule e testo', () => {
    expect(valorePericolo('caduta', '10001')).toBeNull();
    expect(valorePericolo('caduta', '-1')).toBeNull();
    expect(valorePericolo('caduta', '2d6')).toBeNull();
    expect(valorePericolo('caduta', 'alto')).toBeNull();
    expect(valorePericolo('caduta', '1e3')).toBeNull();
  });

  it('testo vuoto o solo spazi: null per ogni tipo', () => {
    expect(valorePericolo('danno', '')).toBeNull();
    expect(valorePericolo('cura', '   ')).toBeNull();
    expect(valorePericolo('caduta', '')).toBeNull();
  });
});
