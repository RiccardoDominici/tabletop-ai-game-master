import { describe, expect, it } from 'vitest';
import type { PacchettiMaster } from '@cantastorie/shared';
import { abbreviaDispositivo, rigaPacchetto, statoProssima } from './pacchetti';

const base: PacchettiMaster = {
  corrente: { numero: 1, etichetta: '01', titolo: 'La locanda' },
  elenco: [
    { numero: 1, etichetta: '01' },
    { numero: 2, etichetta: '02' },
  ],
  prossima: { numero: 2, etichetta: '02', titolo: 'Il guado', pronta: true, motivo: null },
  avviso: null,
};

describe('pacchetti nel pannello', () => {
  it('riga del pacchetto in corso', () => {
    expect(rigaPacchetto(base)).toBe('Sessione 01 di 2 · La locanda');
  });
  it('prossima pronta, preparata a metà, assente', () => {
    expect(statoProssima(base)).toMatchObject({ abilitato: true, testo: 'Prossima: sessione 02 · Il guado' });
    const rotta = statoProssima({ ...base, prossima: { numero: 2, etichetta: '02', titolo: null, pronta: false, motivo: 'scene cita «x»' } });
    expect(rotta).toMatchObject({ abilitato: false, testo: 'Prossima: 02' });
    expect(rotta.spiegazione).toContain('scene cita «x»');
    expect(statoProssima({ ...base, prossima: null })).toMatchObject({ abilitato: false });
  });
  it('telefono abbreviato', () => {
    expect(abbreviaDispositivo('tel-anna-0123456789')).toBe('tel-anna…');
    expect(abbreviaDispositivo('corto')).toBe('corto');
  });
});
