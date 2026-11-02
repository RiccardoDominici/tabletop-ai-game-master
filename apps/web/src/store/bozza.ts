/**
 * La bozza dell'azione sul telefono: testo nella casella, interruttore «privata» e richieste di
 * fuoco. Sta in uno store (non nello stato locale della casella) perché la toccano anche la
 * sessione (che la riconcilia quando arriva `azione:mia`) e l'avviso «da decidere» («Cambio»
 * rimette il testo nella casella e ci porta il cursore).
 */
import { create } from 'zustand';

interface StoreBozza {
  testo: string;
  privata: boolean;
  /** Cresce a ogni richiesta di portare il cursore nella casella (la casella la osserva). */
  richiesteFuoco: number;
  impostaTesto(testo: string): void;
  impostaPrivata(privata: boolean): void;
  chiediFuoco(): void;
}

export const useBozza = create<StoreBozza>()((set, get) => ({
  testo: '',
  privata: false,
  richiesteFuoco: 0,
  impostaTesto: (testo) => set({ testo }),
  impostaPrivata: (privata) => set({ privata }),
  chiediFuoco: () => set({ richiesteFuoco: get().richiesteFuoco + 1 }),
}));
