import { describe, expect, it } from 'vitest';
import type { OrologioMaster } from '@tabletop-ai-gm/shared';
import {
  caselleOrologio,
  frazioneOrologio,
  orologioCompleto,
  pieniSicuri,
  puoArretrare,
  puoAvanzare,
  testoUltimoSegno,
} from './orologi';

function orologio(parziale: Partial<OrologioMaster> = {}): OrologioMaster {
  return {
    id: 'o_colpevole',
    nome: 'Il colpevole fugge',
    pieni: 2,
    segmenti: 4,
    segni: ['impronte nel fango', 'una porta socchiusa', 'il cavallo manca', 'la stalla vuota'],
    prossimo: 'il cavallo manca',
    partito: true,
    dovuto: false,
    ultimo_turno: 3,
    al_completo: 'Il colpevole è lontano',
    ...parziale,
  };
}

describe('caselleOrologio', () => {
  it('piene, poi la prossima evidenziata, poi vuote, con il testo dei segni', () => {
    const caselle = caselleOrologio(orologio());
    expect(caselle.map((c) => c.stato)).toEqual(['pieno', 'pieno', 'prossimo', 'vuoto']);
    expect(caselle[2]?.segno).toBe('il cavallo manca');
    expect(caselle[3]?.segno).toBe('la stalla vuota');
  });
  it('a orologio completo non c’è un prossimo', () => {
    const caselle = caselleOrologio(orologio({ pieni: 4, prossimo: null }));
    expect(caselle.every((c) => c.stato === 'pieno')).toBe(true);
  });
  it('segni più corti dei segmenti: il prossimo viene da `prossimo`, gli altri senza testo', () => {
    const caselle = caselleOrologio(orologio({ segni: ['uno'], pieni: 1, prossimo: 'due' }));
    expect(caselle.map((c) => c.segno)).toEqual(['uno', 'due', null, null]);
  });
  it('pieni fuori misura non rompono la riga', () => {
    expect(caselleOrologio(orologio({ pieni: 9 })).filter((c) => c.stato === 'pieno')).toHaveLength(4);
    expect(caselleOrologio(orologio({ pieni: -2 }))[0]?.stato).toBe('prossimo');
    expect(pieniSicuri({ pieni: 9, segmenti: 4 })).toBe(4);
  });
});

describe('frazione e pulsanti', () => {
  it('frazione', () => {
    expect(frazioneOrologio(orologio())).toBe('2/4');
    expect(frazioneOrologio({ pieni: 7, segmenti: 6 })).toBe('6/6');
  });
  it('+1 fino al completo, −1 da almeno un segno', () => {
    expect(puoAvanzare({ pieni: 3, segmenti: 4 })).toBe(true);
    expect(puoAvanzare({ pieni: 4, segmenti: 4 })).toBe(false);
    expect(puoArretrare({ pieni: 0, segmenti: 4 })).toBe(false);
    expect(puoArretrare({ pieni: 1, segmenti: 4 })).toBe(true);
    expect(orologioCompleto({ pieni: 4, segmenti: 4 })).toBe(true);
    expect(orologioCompleto({ pieni: 0, segmenti: 0 })).toBe(false);
  });
  it('ultimo segno', () => {
    expect(testoUltimoSegno({ ultimo_turno: null })).toBe('nessun segno ancora');
    expect(testoUltimoSegno({ ultimo_turno: 4 })).toBe('ultimo segno al turno 4');
  });
});
