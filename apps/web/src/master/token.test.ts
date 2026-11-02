import { describe, expect, it, vi } from 'vitest';
import {
  CHIAVE_TOKEN,
  dimenticaToken,
  leggiTokenSalvato,
  pulisciToken,
  salvaToken,
  tokenDaUrl,
  tokenIniziale,
  urlHaToken,
  urlSenzaToken,
  type Archivio,
} from './token';

/** localStorage finto in memoria. */
function archivioFinto(iniziale: Record<string, string> = {}): Archivio & { dati: Map<string, string> } {
  const dati = new Map(Object.entries(iniziale));
  return {
    dati,
    getItem: (k) => dati.get(k) ?? null,
    setItem: (k, v) => void dati.set(k, v),
    removeItem: (k) => void dati.delete(k),
  };
}

/** localStorage che lancia a ogni accesso (navigazione privata, dati bloccati). */
const archivioRotto: Archivio = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

describe('pulisciToken', () => {
  it('toglie spazi, a capo e virgolette rimaste dalla copia', () => {
    expect(pulisciToken('  abc123\n')).toBe('abc123');
    expect(pulisciToken('"abc123"')).toBe('abc123');
    expect(pulisciToken('«abc123»')).toBe('abc123');
  });
  it('prende il parametro se si incolla tutto il link', () => {
    expect(pulisciToken('http://192.168.1.5:4610/master?token=xyz789')).toBe('xyz789');
    expect(pulisciToken('?token=xyz789&log=debug')).toBe('xyz789');
    expect(pulisciToken('token=xyz789')).toBe('xyz789');
    expect(pulisciToken('/master?log=debug&token=a%2Bb')).toBe('a+b');
  });
  it('null se non resta niente', () => {
    expect(pulisciToken('')).toBeNull();
    expect(pulisciToken('   ')).toBeNull();
    expect(pulisciToken(null)).toBeNull();
    expect(pulisciToken(undefined)).toBeNull();
    expect(pulisciToken('/master?token=')).toBeNull();
  });
});

describe('token nell’URL', () => {
  it('legge ?token=', () => {
    expect(tokenDaUrl('http://localhost:4612/master?token=abc')).toBe('abc');
    expect(tokenDaUrl('http://localhost:4612/master')).toBeNull();
    expect(tokenDaUrl('http://localhost:4612/master?token=')).toBeNull();
    expect(tokenDaUrl('non è un url')).toBeNull();
  });
  it('riconosce anche il parametro vuoto (va tolto comunque)', () => {
    expect(urlHaToken('http://h/master?token=')).toBe(true);
    expect(urlHaToken('http://h/master?log=debug')).toBe(false);
  });
  it('toglie solo il token, tiene gli altri parametri e l’hash', () => {
    expect(urlSenzaToken('http://h:1/master?token=abc')).toBe('/master');
    expect(urlSenzaToken('http://h:1/master?log=debug&token=abc#x')).toBe('/master?log=debug#x');
    expect(urlSenzaToken('http://h:1/master?token=abc&log=debug')).toBe('/master?log=debug');
  });
});

describe('archivio del token', () => {
  it('salva, legge e dimentica', () => {
    const archivio = archivioFinto();
    salvaToken('abc', archivio);
    expect(archivio.dati.get(CHIAVE_TOKEN)).toBe('abc');
    expect(leggiTokenSalvato(archivio)).toBe('abc');
    dimenticaToken(archivio);
    expect(leggiTokenSalvato(archivio)).toBeNull();
  });
  it('non lancia se localStorage è rotto o assente', () => {
    expect(() => salvaToken('abc', archivioRotto)).not.toThrow();
    expect(() => dimenticaToken(archivioRotto)).not.toThrow();
    expect(leggiTokenSalvato(archivioRotto)).toBeNull();
    expect(leggiTokenSalvato(null)).toBeNull();
    // In Node non c'è `window`: l'archivio predefinito è null, senza eccezioni.
    expect(leggiTokenSalvato()).toBeNull();
    expect(() => salvaToken('abc')).not.toThrow();
  });
});

describe('tokenIniziale', () => {
  it('prende il token dall’URL, lo salva e lo toglie dalla barra', () => {
    const archivio = archivioFinto({ [CHIAVE_TOKEN]: 'vecchio' });
    const sostituisciUrl = vi.fn();
    const token = tokenIniziale({ href: 'http://h/master?token=nuovo&log=debug', sostituisciUrl, archivio });
    expect(token).toBe('nuovo');
    expect(archivio.dati.get(CHIAVE_TOKEN)).toBe('nuovo');
    expect(sostituisciUrl).toHaveBeenCalledWith('/master?log=debug');
  });
  it('senza token nell’URL usa quello salvato e non tocca la barra', () => {
    const archivio = archivioFinto({ [CHIAVE_TOKEN]: 'salvato' });
    const sostituisciUrl = vi.fn();
    expect(tokenIniziale({ href: 'http://h/master', sostituisciUrl, archivio })).toBe('salvato');
    expect(sostituisciUrl).not.toHaveBeenCalled();
  });
  it('un ?token= vuoto si toglie dalla barra e si ripiega su quello salvato', () => {
    const archivio = archivioFinto({ [CHIAVE_TOKEN]: 'salvato' });
    const sostituisciUrl = vi.fn();
    expect(tokenIniziale({ href: 'http://h/master?token=', sostituisciUrl, archivio })).toBe('salvato');
    expect(sostituisciUrl).toHaveBeenCalledWith('/master');
  });
  it('null se non c’è da nessuna parte; regge archivio rotto e replaceState che lancia', () => {
    expect(tokenIniziale({ href: 'http://h/master', sostituisciUrl: vi.fn(), archivio: null })).toBeNull();
    const lancia = () => {
      throw new Error('SecurityError');
    };
    expect(tokenIniziale({ href: 'http://h/master?token=abc', sostituisciUrl: lancia, archivio: archivioRotto })).toBe('abc');
  });
});
