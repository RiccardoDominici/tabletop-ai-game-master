/**
 * Tabella «tipo → testo» del pannello del master, letta nella lingua dell'interfaccia al momento
 * dell'accesso (non al caricamento del modulo: la lingua arriva dal server dopo). Ogni lettura di
 * `tabella[chiave]` chiama `t()`, così la tabella resta una mappa di stringhe come prima.
 */
import { t, type Chiave } from '../lingua';

export function tabella<K extends string>(chiavi: Record<K, Chiave>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const k of Object.keys(chiavi) as K[]) {
    Object.defineProperty(out, k, { enumerable: true, get: () => t(chiavi[k]) });
  }
  return out;
}
