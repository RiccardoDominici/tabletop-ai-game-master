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
  pg: 'tabletop-ai-gm:pg',
  /** Token di questo telefono: il server lo lega al PG e lo riconosce anche dopo un riavvio. */
  dispositivo: 'tabletop-ai-gm:dispositivo',
} as const;

/** Token del dispositivo, creato la prima volta (casuale, senza dati personali). */
export function tokenDispositivo(): string {
  const salvato = leggiMemoria(CHIAVI.dispositivo);
  if (salvato && /^[A-Za-z0-9_-]{8,64}$/.test(salvato)) return salvato;
  const nuovo = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  scriviMemoria(CHIAVI.dispositivo, nuovo);
  return nuovo;
}
