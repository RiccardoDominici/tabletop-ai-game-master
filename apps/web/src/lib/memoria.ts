/**
 * localStorage protetto: in navigazione privata o con i dati del sito bloccati l'accesso può
 * lanciare eccezioni. Qui si salvano solo comodità (il PG scelto), mai stato importante.
 */
import { creaLog } from './log';

const log = creaLog('memoria');

export function leggiMemoria(chiave: string): string | null {
  try {
    return localStorage.getItem(chiave);
  } catch (errore) {
    log.debug('localStorage non leggibile', errore);
    return null;
  }
}

export function scriviMemoria(chiave: string, valore: string): void {
  try {
    localStorage.setItem(chiave, valore);
  } catch (errore) {
    log.debug('localStorage non scrivibile', errore);
  }
}

export function cancellaMemoria(chiave: string): void {
  try {
    localStorage.removeItem(chiave);
  } catch (errore) {
    log.debug('localStorage non scrivibile', errore);
  }
}

/** Chiavi usate dall'app (un solo posto, niente stringhe sparse). */
export const CHIAVI = {
  /** Id del PG scelto su questo telefono. */
  pg: 'cantastorie:pg',
} as const;
