import { describe, expect, it } from 'vitest';
import { ordinePulsanti } from './scelta';

describe('ordinePulsanti', () => {
  it('dipendenza rotta o conflitto perso: «Cambio» in evidenza', () => {
    expect(ordinePulsanti({ consigliato: 'cambio' })).toEqual({ primario: 'cambio', secondari: ['conferma', 'ritiro'] });
  });
  it('azione vecchia dubbia: «Confermo» in evidenza', () => {
    expect(ordinePulsanti({ consigliato: 'conferma' })).toEqual({ primario: 'conferma', secondari: ['cambio', 'ritiro'] });
  });
});
