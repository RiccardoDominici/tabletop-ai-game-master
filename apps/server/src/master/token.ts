/**
 * Token del pannello del master: chi lo conosce entra nella stanza Socket.IO "master" e comanda
 * il tavolo. Si genera a ogni avvio (o si fissa con CANTASTORIE_MASTER_TOKEN) e si stampa nel log
 * del server: sta sul Mac, i telefoni non lo vedono mai (non è nel QR né in nessuno stato).
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';

/** Token casuale, leggibile e senza caratteri ambigui per un URL (base64url, 16 caratteri). */
export function nuovoToken(): string {
  return randomBytes(12).toString('base64url');
}

/** Il token fissato da configurazione, se valido (almeno 12 caratteri sicuri per un URL). */
export function tokenDaConfig(valore: string | undefined): string | null {
  const t = valore?.trim();
  return t && /^[A-Za-z0-9_-]{12,128}$/.test(t) ? t : null;
}

/** Confronto a tempo costante: un token sbagliato non rivela quanti caratteri erano giusti. */
export function tokenValido(atteso: string, dato: unknown): boolean {
  if (typeof dato !== 'string' || dato.length !== atteso.length) return false;
  return timingSafeEqual(Buffer.from(dato), Buffer.from(atteso));
}
