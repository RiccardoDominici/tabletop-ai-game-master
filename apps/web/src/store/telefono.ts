/**
 * Stato proprio del telefono: quale PG ho scelto, la mia azione privata, l'esito dell'ultimo
 * comando. Lo stato del tavolo (pubblico) sta in `store/tavolo.ts`.
 */
import { create } from 'zustand';
import type { AzionePrivata } from '@cantastorie/shared';
import { CHIAVI, cancellaMemoria, leggiMemoria, scriviMemoria } from '../lib/memoria';

interface StoreTelefono {
  /**
   * PG ricordato su questo telefono (localStorage). Si riprende a ogni (ri)connessione,
   * anche prima che il server lo confermi.
   */
  idPg: string | null;
  /** Il server ha confermato la scelta (ack ok di `telefono:scegli_pg`). */
  confermato: boolean;
  /** Il giocatore ha chiesto di cambiare personaggio: si mostra di nuovo la scelta. */
  sceltaAperta: boolean;
  /** La mia azione, dall'evento `azione:mia` (null = nessuna). */
  miaAzione: AzionePrivata | null;
  /** Testo d'errore dell'ultimo comando (ack `ok:false`), da mostrare sotto la casella. */
  errore: string | null;
  /** Un comando è in attesa di ack: i pulsanti restano bloccati per evitare doppi invii. */
  occupato: boolean;

  ricordaPg(idPg: string): void;
  dimenticaPg(): void;
  impostaConfermato(confermato: boolean): void;
  apriScelta(aperta: boolean): void;
  impostaMiaAzione(azione: AzionePrivata | null): void;
  impostaErrore(errore: string | null): void;
  impostaOccupato(occupato: boolean): void;
}

export const useTelefono = create<StoreTelefono>()((set) => ({
  idPg: leggiMemoria(CHIAVI.pg),
  confermato: false,
  sceltaAperta: false,
  miaAzione: null,
  errore: null,
  occupato: false,

  ricordaPg: (idPg) => {
    scriviMemoria(CHIAVI.pg, idPg);
    set({ idPg, sceltaAperta: false, errore: null });
  },
  dimenticaPg: () => {
    cancellaMemoria(CHIAVI.pg);
    set({ idPg: null, confermato: false, miaAzione: null });
  },
  impostaConfermato: (confermato) => set({ confermato }),
  apriScelta: (sceltaAperta) => set({ sceltaAperta }),
  impostaMiaAzione: (miaAzione) => set({ miaAzione }),
  impostaErrore: (errore) => set({ errore }),
  impostaOccupato: (occupato) => set({ occupato }),
}));
