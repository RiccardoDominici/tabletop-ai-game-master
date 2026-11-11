import { describe, expect, it } from 'vitest';
import type { BattutaMaster } from '@tabletop-ai-gm/shared';
import { CHIAVE_SENZA_SPOILER, contaPerParlante, leggiSenzaSpoiler, nomeOrologio, salvaSenzaSpoiler, tipoBattuta } from './spoiler';
import type { Archivio } from './token';

function archivioFinto(iniziale: Record<string, string> = {}): Archivio & { dati: Map<string, string> } {
  const dati = new Map(Object.entries(iniziale));
  return { dati, getItem: (k) => dati.get(k) ?? null, setItem: (k, v) => void dati.set(k, v), removeItem: (k) => void dati.delete(k) };
}
const rotto: Archivio = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('SecurityError');
  },
  removeItem: () => undefined,
};

describe('modalità senza spoiler', () => {
  it('attiva per default, anche senza archivio o con archivio rotto', () => {
    expect(leggiSenzaSpoiler(archivioFinto())).toBe(true);
    expect(leggiSenzaSpoiler(null)).toBe(true);
    expect(leggiSenzaSpoiler(rotto)).toBe(true);
  });

  it('la scelta resta salvata', () => {
    const a = archivioFinto();
    salvaSenzaSpoiler(false, a);
    expect(a.dati.get(CHIAVE_SENZA_SPOILER)).toBe('no');
    expect(leggiSenzaSpoiler(a)).toBe(false);
    salvaSenzaSpoiler(true, a);
    expect(leggiSenzaSpoiler(a)).toBe(true);
    expect(() => salvaSenzaSpoiler(false, rotto)).not.toThrow();
  });

  it('orologi neutri e tipi che non svelano', () => {
    expect(nomeOrologio('Il paese vuole un colpevole', 0, true)).toBe('Orologio 1');
    expect(nomeOrologio('Il paese vuole un colpevole', 0, false)).toBe('Il paese vuole un colpevole');
    expect(tipoBattuta('menzogna', true)).toBe('risposta');
    expect(tipoBattuta('confessione', true)).toBe('risposta');
    expect(tipoBattuta('indizio', true)).toBe('indizio');
    expect(tipoBattuta('menzogna', false)).toBe('menzogna');
  });

  it('battute non uscite: solo quante per chi parla', () => {
    const b = (id: string, chi: string): BattutaMaster => ({ id, chi, tipo: 'menzogna', quando: 'segreto', usi: 0, max_usi: 1, scena: null });
    expect(contaPerParlante([b('a', 'png_ottavia'), b('b', 'narratore'), b('c', 'png_ottavia')])).toEqual([
      { chi: 'png_ottavia', quante: 2 },
      { chi: 'narratore', quante: 1 },
    ]);
  });
});
