/**
 * Stato del collegamento Socket.IO. Scritto da `lib/socket.ts`, letto dal banner di connessione.
 */
import { create } from 'zustand';

export type StatoConnessione =
  /** Primo tentativo in corso (all'apertura della pagina). */
  | 'connessione'
  | 'connesso'
  /** Collegamento perso dopo essere stati connessi: Socket.IO riprova da solo. */
  | 'persa';

interface StoreConnessione {
  stato: StatoConnessione;
  /** Tentativi di riconnessione dall'ultima caduta (per il banner). */
  tentativi: number;
  imposta(stato: StatoConnessione, tentativi?: number): void;
}

export const useConnessione = create<StoreConnessione>()((set) => ({
  stato: 'connessione',
  tentativi: 0,
  imposta: (stato, tentativi = 0) => set({ stato, tentativi }),
}));
