/**
 * Stato dell'interfaccia audio del proiettore: volumi e muti dei bus (ricordati in localStorage),
 * pannello del mixer (tasto «A»), crediti (tasto «C») e le righe d'attribuzione del catalogo.
 * Il ponte (ponte.ts) ascolta le impostazioni e le porta sul mixer.
 */
import { create } from 'zustand';
import { caricaImpostazioni, salvaImpostazioni, type ImpostazioneBus, type ImpostazioniMixer, type NomeBus } from './impostazioni';

interface StoreAudio {
  impostazioni: ImpostazioniMixer;
  pannelloAperto: boolean;
  creditiAperti: boolean;
  /** Attribuzioni (CC BY) del manifest audio. */
  crediti: string[];
  /** Il mixer esiste (dopo «Inizia sessione»). */
  pronto: boolean;

  impostaBus(nome: NomeBus, parziale: Partial<ImpostazioneBus>): void;
  alternaPannello(): void;
  alternaCrediti(): void;
  impostaCrediti(crediti: string[]): void;
  impostaPronto(pronto: boolean): void;
}

export const useAudioSchermo = create<StoreAudio>()((set, get) => ({
  impostazioni: caricaImpostazioni(),
  pannelloAperto: false,
  creditiAperti: false,
  crediti: [],
  pronto: false,

  impostaBus: (nome, parziale) => {
    const attuale = get().impostazioni;
    const impostazioni = { ...attuale, [nome]: { ...attuale[nome], ...parziale } };
    salvaImpostazioni(impostazioni);
    set({ impostazioni });
  },
  alternaPannello: () => set({ pannelloAperto: !get().pannelloAperto }),
  alternaCrediti: () => set({ creditiAperti: !get().creditiAperti }),
  impostaCrediti: (crediti) => set({ crediti }),
  impostaPronto: (pronto) => set({ pronto }),
}));
