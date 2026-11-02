import { describe, expect, it } from 'vitest';
import { parametriSfondo, tavolozzaPerUmore } from './umori';

describe('umori dello sfondo', () => {
  it('tag del vocabolario: corrispondenza esatta', () => {
    expect(tavolozzaPerUmore('esplorazione_tesa').nome).toBe('esplorazione_tesa');
    expect(tavolozzaPerUmore('taverna_calda').nome).toBe('taverna_calda');
    expect(tavolozzaPerUmore('rito_sacro').nome).toBe('rito_sacro');
    expect(tavolozzaPerUmore('combattimento_epico').nome).toBe('combattimento_epico');
    expect(tavolozzaPerUmore('lutto').nome).toBe('lutto');
    expect(tavolozzaPerUmore('Mistero ').nome).toBe('mistero');
  });

  it('tag nuovi: per parola chiave', () => {
    expect(tavolozzaPerUmore('battaglia_finale').nome).toBe('combattimento_epico');
    expect(tavolozzaPerUmore('locanda_rumorosa').nome).toBe('taverna_calda');
    expect(tavolozzaPerUmore('esplorazione_serena').nome).toBe('esplorazione_tesa');
    expect(tavolozzaPerUmore('attesa_tesa').nome).toBe('tensione');
  });

  it('sconosciuto o vuoto → predefinito', () => {
    expect(tavolozzaPerUmore('xyz').nome).toBe('predefinito');
    expect(tavolozzaPerUmore('').nome).toBe('predefinito');
    expect(tavolozzaPerUmore(null).nome).toBe('predefinito');
  });

  it('intensità: più alta, più veloce e più satura; fuori scala si limita', () => {
    const calma = parametriSfondo('mistero', 1);
    const climax = parametriSfondo('mistero', 5);
    expect(calma.durataS).toBe(48);
    expect(climax.durataS).toBe(20);
    expect(climax.opacita).toBeGreaterThan(calma.opacita);
    expect(parametriSfondo('mistero', 9)).toEqual(climax);
    expect(parametriSfondo('mistero', null)).toEqual(parametriSfondo('mistero', 3));
  });
});
