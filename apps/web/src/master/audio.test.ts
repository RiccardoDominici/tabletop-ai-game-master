import { describe, expect, it } from 'vitest';
import { nomeEffetto, nomeTraccia, nomeUmore } from './audio';

describe('nomi dell’audio nel pannello', () => {
  it('tag, effetti e tracce in parole', () => {
    expect(nomeUmore('esplorazione_tesa')).toBe('esplorazione tesa');
    expect(nomeEffetto('sfx_porta_cigola')).toBe('porta cigola');
    expect(nomeEffetto('campana')).toBe('campana');
    expect(nomeTraccia('luogo_scena_borgo_basso')).toBe('scena borgo basso');
    expect(nomeTraccia('umore_lutto')).toBe('lutto');
    expect(nomeTraccia(null)).toBe('—');
  });
});
