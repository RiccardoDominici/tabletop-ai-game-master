/**
 * Logger del browser con livelli, per @cantastorie/web.
 *
 * - Livello minimo predefinito: `info` in sviluppo, `warn` nella build.
 * - Si cambia senza ricompilare: `?log=debug` nell'URL oppure localStorage
 *   `cantastorie:log` = 'debug' | 'info' | 'warn' | 'error' | 'silenzio'.
 * - `error` è riservato ai guasti veri: l'e2e fallisce su qualunque errore in console, quindi
 *   situazioni previste (server giù, ack scaduto, pezzo audio orfano) vanno a `warn`.
 * Il resto dell'app non chiama mai `console.*` direttamente: passa da `log`.
 */

export type LivelloLog = 'debug' | 'info' | 'warn' | 'error';

const ORDINE: Record<LivelloLog | 'silenzio', number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silenzio: 100,
};

const CHIAVE_MEMORIA = 'cantastorie:log';

function livelloValido(valore: string | null | undefined): valore is LivelloLog | 'silenzio' {
  return valore != null && valore in ORDINE;
}

/** Letto una volta all'avvio (URL > localStorage > predefinito). */
function livelloIniziale(): LivelloLog | 'silenzio' {
  try {
    const daUrl = new URLSearchParams(window.location.search).get('log');
    if (livelloValido(daUrl)) {
      localStorage.setItem(CHIAVE_MEMORIA, daUrl);
      return daUrl;
    }
    const salvato = localStorage.getItem(CHIAVE_MEMORIA);
    if (livelloValido(salvato)) return salvato;
  } catch {
    // localStorage non disponibile (navigazione privata): si usa il predefinito.
  }
  return import.meta.env.DEV ? 'info' : 'warn';
}

let soglia = ORDINE[livelloIniziale()];

function scrivi(livello: LivelloLog, ambito: string, messaggio: string, contesto?: unknown): void {
  if (ORDINE[livello] < soglia) return;
  const testa = `[cantastorie:${ambito}] ${messaggio}`;
  const metodo = livello === 'debug' ? 'debug' : livello;
  if (contesto === undefined) console[metodo](testa);
  else console[metodo](testa, contesto);
}

export interface Logger {
  debug(messaggio: string, contesto?: unknown): void;
  info(messaggio: string, contesto?: unknown): void;
  warn(messaggio: string, contesto?: unknown): void;
  error(messaggio: string, contesto?: unknown): void;
}

/** Logger con un ambito fisso (es. 'socket', 'audio', 'telefono') nel prefisso. */
export function creaLog(ambito: string): Logger {
  return {
    debug: (m, c) => scrivi('debug', ambito, m, c),
    info: (m, c) => scrivi('info', ambito, m, c),
    warn: (m, c) => scrivi('warn', ambito, m, c),
    error: (m, c) => scrivi('error', ambito, m, c),
  };
}

/** Cambia il livello a runtime (comodo dalla console: non persistito). */
export function impostaLivelloLog(livello: LivelloLog | 'silenzio'): void {
  soglia = ORDINE[livello];
}
