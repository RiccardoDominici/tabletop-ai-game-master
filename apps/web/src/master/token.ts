/**
 * Token del pannello del master (docs/architettura.md, «Pannello master»).
 *
 * Il server stampa il token nel suo log all'avvio (di solito come link `/master?token=…`). Al primo
 * caricamento lo si legge da `?token=`, lo si salva in localStorage e lo si toglie SUBITO dalla barra
 * degli indirizzi (history.replaceState): così non resta nella cronologia, nei segnalibri o in una
 * foto dello schermo. Senza token (o con un token rifiutato) la pagina mostra un modulo per incollarlo.
 *
 * Ogni accesso a localStorage è in try/catch: in navigazione privata o con i dati del sito bloccati
 * può lanciare eccezioni (anche solo leggere `window.localStorage`). Il token non si scrive MAI nel log.
 *
 * Tutto ciò che non tocca il browser è puro e testato in token.test.ts; l'ambiente (URL, history,
 * archivio) si passa come parametro, così i test non hanno bisogno di un DOM.
 */
import { creaLog } from '../lib/log';

const log = creaLog('master');

/** Chiave di localStorage del token (separata da quelle del telefono). */
export const CHIAVE_TOKEN = 'tabletop-ai-gm:master:token';
/** Parametro dell'URL che porta il token (`/master?token=…`). */
export const PARAMETRO_TOKEN = 'token';

/** Le tre operazioni di localStorage che servono (sostituibili nei test). */
export interface Archivio {
  getItem(chiave: string): string | null;
  setItem(chiave: string, valore: string): void;
  removeItem(chiave: string): void;
}

/** Ciò che serve a leggere e ripulire il token all'avvio: URL corrente, replaceState, archivio. */
export interface AmbienteToken {
  href: string;
  sostituisciUrl(url: string): void;
  archivio: Archivio | null;
}

/** Virgolette (dritte, curve, caporali) che possono restare attaccate a un token copiato dal log. */
const VIRGOLETTE_AI_BORDI = /^["'«“‘`]+|["'»”’`]+$/g;

/**
 * Ripulisce un token incollato a mano: spazi e a capo ai bordi, virgolette rimaste dalla copia.
 * Se si incolla l'intero link (`http://…/master?token=abc`, o solo `?token=abc`) prende il parametro.
 * Restituisce null se non resta niente.
 */
export function pulisciToken(grezzo: string | null | undefined): string | null {
  if (grezzo == null) return null;
  let testo = grezzo.trim().replace(VIRGOLETTE_AI_BORDI, '').trim();
  // Link completo o pezzo di query: si prende il valore del parametro.
  const conParametro = /(?:^|[?&])token=([^&#\s]*)/.exec(testo);
  if (conParametro) {
    try {
      testo = decodeURIComponent(conParametro[1] ?? '');
    } catch {
      testo = conParametro[1] ?? '';
    }
  }
  testo = testo.trim();
  return testo.length > 0 ? testo : null;
}

/** Token presente in `?token=` dell'URL (null se manca o è vuoto, o se l'URL non è valido). */
export function tokenDaUrl(href: string): string | null {
  try {
    return pulisciToken(new URL(href).searchParams.get(PARAMETRO_TOKEN));
  } catch {
    return null;
  }
}

/** L'URL ha il parametro `token` (anche vuoto): va ripulito comunque. */
export function urlHaToken(href: string): boolean {
  try {
    return new URL(href).searchParams.has(PARAMETRO_TOKEN);
  } catch {
    return false;
  }
}

/**
 * Lo stesso indirizzo senza `token`, relativo all'origine (percorso + query + hash), pronto per
 * history.replaceState. Gli altri parametri (es. `?log=debug`) restano.
 */
export function urlSenzaToken(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(PARAMETRO_TOKEN);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** localStorage del browser, o null se non c'è o non è accessibile (anche nei test in Node). */
export function archivioDelBrowser(): Archivio | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Token salvato in precedenza, o null (archivio assente, illeggibile o vuoto). */
export function leggiTokenSalvato(archivio: Archivio | null = archivioDelBrowser()): string | null {
  if (!archivio) return null;
  try {
    return pulisciToken(archivio.getItem(CHIAVE_TOKEN));
  } catch (errore) {
    log.debug('Token del master non leggibile da localStorage', errore);
    return null;
  }
}

/** Salva il token (se l'archivio non è scrivibile, resterà solo in memoria per questa pagina). */
export function salvaToken(token: string, archivio: Archivio | null = archivioDelBrowser()): void {
  if (!archivio) return;
  try {
    archivio.setItem(CHIAVE_TOKEN, token);
  } catch (errore) {
    log.debug('Token del master non scrivibile in localStorage', errore);
  }
}

/** Dimentica il token salvato (es. dopo un rifiuto del server: era di un avvio precedente). */
export function dimenticaToken(archivio: Archivio | null = archivioDelBrowser()): void {
  if (!archivio) return;
  try {
    archivio.removeItem(CHIAVE_TOKEN);
  } catch (errore) {
    log.debug('Token del master non cancellabile da localStorage', errore);
  }
}

/**
 * Token da usare all'apertura della pagina:
 * 1. quello nell'URL, che si salva e si toglie dalla barra degli indirizzi;
 * 2. altrimenti quello salvato in precedenza;
 * 3. altrimenti null (la pagina mostra il modulo).
 * Un `?token=` vuoto si toglie comunque dalla barra.
 */
export function tokenIniziale(ambiente: AmbienteToken): string | null {
  const daUrl = tokenDaUrl(ambiente.href);
  if (urlHaToken(ambiente.href)) {
    try {
      ambiente.sostituisciUrl(urlSenzaToken(ambiente.href));
    } catch (errore) {
      // Non grave: il token resta visibile nella barra, ma la pagina funziona.
      log.warn('Non riesco a togliere il token dalla barra degli indirizzi', errore);
    }
  }
  if (daUrl) {
    salvaToken(daUrl, ambiente.archivio);
    return daUrl;
  }
  return leggiTokenSalvato(ambiente.archivio);
}

/** L'ambiente reale del browser (URL corrente, history, localStorage). */
export function ambienteDelBrowser(): AmbienteToken {
  return {
    href: window.location.href,
    sostituisciUrl: (url) => window.history.replaceState(window.history.state, '', url),
    archivio: archivioDelBrowser(),
  };
}
