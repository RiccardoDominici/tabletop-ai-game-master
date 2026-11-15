/** The pure part of the phone dictation (dettatoPuro.ts): format choice, gestures, insertion, error sentences. */
import { describe, expect, it } from 'vitest';
import { DIZIONARI } from '../lingua';
import { durata, erroreMicrofono, erroreServer, inserisci, modoPressione, scegliFormato } from './dettatoPuro';

describe('phone dictation, pure part', () => {
  it('picks webm/opus where it exists, mp4 on an older Safari, the browser default otherwise', () => {
    expect(scegliFormato((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(scegliFormato((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(scegliFormato(() => false)).toBe('');
    expect(scegliFormato(() => { throw new Error('odd browser'); })).toBe('');
  });
  it('tells a hold from a tap', () => {
    expect(modoPressione(120)).toBe('tocco');
    expect(modoPressione(900)).toBe('tieni');
  });
  it('adds the transcript after what is in the box, never over it', () => {
    expect(inserisci('', ' Chiedo a Zelmira. ', 500)).toBe('Chiedo a Zelmira.');
    expect(inserisci('Mi avvicino.  ', 'Chiedo a Zelmira.', 500)).toBe('Mi avvicino. Chiedo a Zelmira.');
    expect(inserisci('abc', '   ', 500)).toBe('abc');
    expect(inserisci('x'.repeat(498), 'lungo', 500)).toHaveLength(500);
  });
  it('has an interface sentence, in every language, for every error', () => {
    const chiavi = [...['NotAllowedError', 'NotFoundError', 'NotReadableError', 'Strano'].map(erroreMicrofono), ...['scegli_pg', 'troppo_lungo', 'occupato', 'formato', 'spento', undefined].map(erroreServer)];
    for (const d of Object.values(DIZIONARI)) for (const k of chiavi) expect(d[k]).toBeTruthy();
    expect(erroreMicrofono('NotAllowedError')).toBe('telefono.dettato.errore_permesso');
    expect(erroreServer('spento')).toBe('telefono.dettato.errore_non_disponibile');
  });
  it('shows the time as m:ss', () => {
    expect(durata(0)).toBe('0:00');
    expect(durata(29_900)).toBe('0:29');
    expect(durata(61_000)).toBe('1:01');
  });
});
