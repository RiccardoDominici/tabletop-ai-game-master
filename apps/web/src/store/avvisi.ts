/**
 * Avvisi brevi (evento `avviso` del server ed errori locali), mostrati come toast.
 */
import { create } from 'zustand';

export interface Avviso {
  id: number;
  livello: 'info' | 'errore';
  testo: string;
}

/** Quanto resta a schermo un avviso. */
const DURATA_MS = 6000;
/** Oltre questo numero i più vecchi spariscono: niente muri di toast. */
const MASSIMO = 3;

let prossimoId = 1;

interface StoreAvvisi {
  avvisi: Avviso[];
  aggiungi(livello: Avviso['livello'], testo: string): void;
  togli(id: number): void;
}

export const useAvvisi = create<StoreAvvisi>()((set, get) => ({
  avvisi: [],
  aggiungi: (livello, testo) => {
    const id = prossimoId++;
    set({ avvisi: [...get().avvisi, { id, livello, testo }].slice(-MASSIMO) });
    window.setTimeout(() => get().togli(id), DURATA_MS);
  },
  togli: (id) => set({ avvisi: get().avvisi.filter((a) => a.id !== id) }),
}));
