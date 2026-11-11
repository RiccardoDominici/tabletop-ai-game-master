import { describe, expect, it } from 'vitest';
import { allineaVariabiliLegacy } from '../src/variabili-legacy';

describe('compatibilità CANTASTORIE_* → TAGM_*', () => {
  it('copia il nome vecchio sul nuovo e toglie il vecchio', () => {
    const env: NodeJS.ProcessEnv = { CANTASTORIE_PORTA: '4710', CANTASTORIE_LLM: 'finto' };
    const usate = allineaVariabiliLegacy(env);
    expect(env['TAGM_PORTA']).toBe('4710');
    expect(env['TAGM_LLM']).toBe('finto');
    expect(env['CANTASTORIE_PORTA']).toBeUndefined();
    expect(usate.sort()).toEqual(['CANTASTORIE_LLM', 'CANTASTORIE_PORTA']);
  });

  it('il nome nuovo vince se entrambi sono impostati', () => {
    const env: NodeJS.ProcessEnv = { CANTASTORIE_PORTA: '4710', TAGM_PORTA: '4720' };
    allineaVariabiliLegacy(env);
    expect(env['TAGM_PORTA']).toBe('4720');
    expect(env['CANTASTORIE_PORTA']).toBeUndefined();
  });

  it('senza nomi vecchi non cambia nulla e non avvisa', () => {
    const env: NodeJS.ProcessEnv = { TAGM_PORTA: '4710', PATH: '/bin' };
    expect(allineaVariabiliLegacy(env)).toEqual([]);
    expect(env).toEqual({ TAGM_PORTA: '4710', PATH: '/bin' });
  });
});
