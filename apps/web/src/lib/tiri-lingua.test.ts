/**
 * Riga del danno e date nella lingua giusta (docs/lingue.md): il tipo di danno arriva dal Motore già
 * nella lingua dei contenuti (`nome_tipo`) e si mette nella frase del dizionario dell'interfaccia; date e
 * ore usano il tag BCP 47 della lingua dell'interfaccia.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { impostaLinguaInterfaccia, localeInterfaccia } from '../lingua';
import { testoDanno } from './tiri';

afterEach(() => impostaLinguaInterfaccia('it'));

describe('riga del danno col nome del tipo dal Motore', () => {
  const danno = { formula: '1d8+2', dadi: [6], bonus: 2, totale: 8 };

  it('nome_tipo com’è, nella frase della lingua dell’interfaccia', () => {
    expect(testoDanno({ ...danno, tipo: 'fuoco', nome_tipo: 'da fuoco' })).toBe('Danni 1d8+2: 6 + 2 = 8 da fuoco');
    impostaLinguaInterfaccia('en');
    expect(testoDanno({ ...danno, tipo: 'perforante', nome_tipo: 'piercing' })).toBe('Damage 1d8+2: 6 + 2 = 8 piercing');
    expect(testoDanno({ ...danno, tipo: null, nome_tipo: null })).toBe('Damage 1d8+2: 6 + 2 = 8');
  });

  it('una carta senza nome_tipo ripiega sul tipo della scheda', () => {
    expect(testoDanno({ ...danno, tipo: 'perforante' })).toBe('Danni 1d8+2: 6 + 2 = 8 perforanti');
  });
});

describe('localeInterfaccia', () => {
  it('segue la lingua dell’interfaccia', () => {
    expect(localeInterfaccia()).toBe('it-IT');
    impostaLinguaInterfaccia('en');
    expect(localeInterfaccia()).toBe('en-GB');
    expect(new Date(2026, 10, 9).toLocaleDateString(localeInterfaccia())).toBe('09/11/2026');
  });
});
