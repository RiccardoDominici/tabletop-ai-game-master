/**
 * Dizionari dell'interfaccia (docs/lingue.md): ogni lingua ha le chiavi dell'italiano (lo garantisce
 * anche `satisfies` nei file) con gli stessi segnaposto {nome}, e nessun testo vuoto.
 */
import { describe, expect, it } from 'vitest';
import { DIZIONARI, elenco, impostaLinguaInterfaccia, t, type Chiave } from './index';

const segnaposto = (s: string): string => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('dizionari dell’interfaccia', () => {
  it('ogni lingua ha tutte le chiavi dell’italiano, con gli stessi segnaposto', () => {
    const rif = DIZIONARI.it;
    for (const [lingua, d] of Object.entries(DIZIONARI)) {
      expect(Object.keys(d).sort(), lingua).toEqual(Object.keys(rif).sort());
      for (const k of Object.keys(rif) as Chiave[]) {
        expect(d[k]?.length, `${lingua}: ${k} vuoto`).toBeGreaterThan(0);
        expect(segnaposto(d[k]), `${lingua}: ${k}`).toBe(segnaposto(rif[k]));
      }
    }
  });

  it('t() sostituisce i segnaposto; elenco() usa la congiunzione della lingua', () => {
    impostaLinguaInterfaccia('it');
    expect(elenco(['Paolo', 'Giulia', 'Anna'])).toBe('Paolo, Giulia e Anna');
    impostaLinguaInterfaccia('en');
    expect(elenco(['Paolo', 'Giulia'])).toBe('Paolo and Giulia');
    impostaLinguaInterfaccia('xx');
    expect(t('comune.elenco.e')).toBe(' and ');
    impostaLinguaInterfaccia('it');
  });
});
