/**
 * Stato proprio dello schermo/proiettore: audio sbloccato, chi parla e cosa dice (sottotitolo,
 * guidato dalla linea del tempo audio), HUD di latenza.
 */
import { create } from 'zustand';

export interface FraseInOnda {
  idFrase: string;
  turno: number;
  parlante: string;
  nome: string;
  testo: string;
}

interface StoreSchermo {
  /** «Inizia sessione» premuto: l'AudioContext esiste e il server ci manda l'audio. */
  audioSbloccato: boolean;
  /** Errore dello sblocco o dell'avvio (mostrato sotto il pulsante). */
  erroreAvvio: string | null;
  /** Frase che sta suonando adesso (null = silenzio). */
  inOnda: FraseInOnda | null;
  hudAperto: boolean;
  /** Esito dell'ultimo comando dell'HUD (Ferma/Ricomincia). */
  esitoComando: string | null;

  impostaSbloccato(sbloccato: boolean): void;
  impostaErroreAvvio(errore: string | null): void;
  mettiInOnda(frase: FraseInOnda): void;
  /** Toglie il sottotitolo solo se è ancora quello della frase indicata (o qualunque, se null). */
  togliDaOnda(idFrase: string | null): void;
  alternaHud(): void;
  impostaEsitoComando(testo: string | null): void;
}

export const useSchermo = create<StoreSchermo>()((set, get) => ({
  audioSbloccato: false,
  erroreAvvio: null,
  inOnda: null,
  hudAperto: false,
  esitoComando: null,

  impostaSbloccato: (audioSbloccato) => set({ audioSbloccato }),
  impostaErroreAvvio: (erroreAvvio) => set({ erroreAvvio }),
  mettiInOnda: (inOnda) => set({ inOnda }),
  togliDaOnda: (idFrase) => {
    const attuale = get().inOnda;
    if (attuale && (idFrase === null || attuale.idFrase === idFrase)) set({ inOnda: null });
  },
  alternaHud: () => set({ hudAperto: !get().hudAperto }),
  impostaEsitoComando: (esitoComando) => set({ esitoComando }),
}));
