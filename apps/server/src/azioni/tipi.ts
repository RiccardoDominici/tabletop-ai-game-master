/**
 * Azioni simultanee dei giocatori (docs/azioni-concorrenti.md): modello lato server.
 */
import type { RichiestaScelta, StatoAzione } from '@cantastorie/shared';

export interface Conflitto {
  /** Id dell'altra azione. */
  con: string;
  esclusivo: boolean;
  /** Id dell'azione che vince (prima inviata; pareggi entro 1 s a rotazione). */
  vince: string;
}

export interface Azione {
  id: string;
  autore: string;
  testo: string;
  privata: boolean;
  /** Epoch ms del primo invio: l'ordine di risoluzione. */
  inviata_alle: number;
  modificata_alle: number;
  versione_vista: number;
  /** Turno (finestra) in cui entra. */
  turno: number;
  stato: StatoAzione;
  motivo: string | null;
  richiesta: RichiestaScelta | null;
  pronto: boolean;
  dipende_da: string[];
  conflitti: Conflitto[];
  /** Cresce a ogni modifica: un giudizio dell'arbitro su una revisione vecchia si ignora. */
  revisione: number;
  /** Radice della catena che l'ha messa «da confermare» (una volta sola per catena). */
  causa: string | null;
}

/** Stati in cui un'azione è ancora viva nella finestra (conta e può essere toccata). */
export const STATI_VIVI: ReadonlySet<StatoAzione> = new Set(['in_coda', 'da_confermare']);

/** Azione come la vede l'arbitro. */
export interface AzioneArbitro {
  id: string;
  autore: string;
  nome: string;
  testo: string;
  privata: boolean;
}

export interface EsitoRelazioni {
  dipende_da: string[];
  conflitti: Array<{ con: string; esclusivo: boolean }>;
  fonte: 'regole' | 'modello' | 'nessuna';
}

export type Giudizio = 'valida' | 'dubbia' | 'impossibile';

export interface ContestoArbitro {
  /** Ultima narrazione pubblica. */
  narrazione: string;
  /** Riassunto pubblico della scena (luogo, PNG, PG). */
  scena: string;
}

/**
 * L'arbitro consiglia, il Motore decide. Tutte le chiamate sono asincrone e non bloccano l'invio.
 */
export interface Arbitro {
  relazioni(input: ContestoArbitro & { nuova: AzioneArbitro; coda: AzioneArbitro[] }): Promise<EsitoRelazioni>;
  vecchie(input: ContestoArbitro & { azioni: AzioneArbitro[] }): Promise<Record<string, { giudizio: Giudizio; motivo: string }>>;
  cambio(input: ContestoArbitro & { prima: AzioneArbitro; dopo: AzioneArbitro; dipendenti: AzioneArbitro[] }): Promise<Record<string, { toccata: boolean }>>;
}
