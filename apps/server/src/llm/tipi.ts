/**
 * Interfaccia del narratore LLM, così il motore dei turni non dipende dall'SDK:
 * in produzione Haiku 5.5 (llm/haiku.ts), nei test un copione finto (llm/finto.ts).
 */
import type { Costo, UsoToken } from './costi';

export interface RichiestaNarrazione {
  turno: number;
  /** Blocchi di sistema STABILI, nell'ordine: prompt del narratore, contesto della campagna. */
  sistema: string[];
  /** Messaggio utente del turno (trascrizione + azioni). */
  messaggio: string;
  signal: AbortSignal;
}

export interface EsitoNarrazione {
  testo: string;
  modello: string;
  stopReason: string | null;
  uso: UsoToken;
  costo: Costo;
  idMessaggio: string | null;
}

export interface Narratore {
  readonly nome: 'haiku' | 'finto';
  readonly modello: string;
  /**
   * Narra in streaming: `onTesto` riceve ogni delta di testo appena arriva.
   * La promessa si risolve a stream finito (o rifiuta se interrotto o in errore).
   */
  narra(richiesta: RichiestaNarrazione, onTesto: (delta: string) => void): Promise<EsitoNarrazione>;
  /** Scrive in cache i blocchi di sistema prima del primo turno (facoltativo). */
  preriscalda?(sistema: string[]): Promise<EsitoNarrazione | null>;
}
