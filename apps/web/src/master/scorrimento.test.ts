import { describe, expect, it } from 'vitest';
import { SOGLIA_FONDO_PX, vicinoAlFondo } from './scorrimento';

describe('vicinoAlFondo', () => {
  it('in fondo o quasi', () => {
    expect(vicinoAlFondo({ scrollHeight: 1000, scrollTop: 600, clientHeight: 400 })).toBe(true);
    expect(vicinoAlFondo({ scrollHeight: 1000, scrollTop: 600 - SOGLIA_FONDO_PX + 1, clientHeight: 400 })).toBe(true);
  });
  it('risalito a rileggere', () => {
    expect(vicinoAlFondo({ scrollHeight: 1000, scrollTop: 600 - SOGLIA_FONDO_PX, clientHeight: 400 })).toBe(false);
    expect(vicinoAlFondo({ scrollHeight: 1000, scrollTop: 0, clientHeight: 400 })).toBe(false);
  });
  it('contenuto più corto del contenitore: in fondo', () => {
    expect(vicinoAlFondo({ scrollHeight: 300, scrollTop: 0, clientHeight: 400 })).toBe(true);
  });
});
