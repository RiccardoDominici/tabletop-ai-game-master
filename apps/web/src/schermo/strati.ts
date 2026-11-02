/**
 * Strati dello sfondo del luogo: macchina a stati PURA della dissolvenza incrociata (testata in
 * strati.test.ts). Il componente (SfondoLuogo.tsx) fa solo da guscio: carica e decodifica
 * l'immagine, poi manda qui gli eventi e disegna gli strati che ne escono.
 *
 * Ogni strato è un'immagine a tutto schermo:
 * - `entra`: appena aggiunto, sale d'opacità sopra quelli vecchi (animazione CSS di ~1,5 s);
 * - `piena`: dissolvenza finita: è lo sfondo, gli strati sotto si tolgono;
 * - `esce`: l'immagine non c'è più (null o caricamento fallito): scende d'opacità e scopre lo
 *   sfondo d'atmosfera.
 * Al massimo due strati in movimento: la GPU è condivisa con i modelli locali.
 */

export type StatoStrato = 'entra' | 'piena' | 'esce';

export interface Strato {
  chiave: number;
  src: string;
  stato: StatoStrato;
}

export interface StatoSfondo {
  strati: Strato[];
  prossimaChiave: number;
  /** Dissolvenze completate (verso un'immagine o verso lo sfondo d'atmosfera). */
  transizioni: number;
}

export type EventoSfondo =
  /** Una nuova immagine è caricata e decodificata: entra sopra le altre. */
  | { tipo: 'pronta'; src: string }
  /** Nessuna immagine (null o caricamento fallito): tutto esce, torna lo sfondo d'atmosfera. */
  | { tipo: 'nessuna' }
  /** L'animazione dello strato `chiave` è finita. */
  | { tipo: 'fine'; chiave: number };

/** Oltre questo numero gli strati più vecchi spariscono subito (cambi di luogo a raffica). */
const MASSIMO_STRATI = 3;

export const SFONDO_INIZIALE: StatoSfondo = { strati: [], prossimaChiave: 1, transizioni: 0 };

export function aggiornaSfondo(stato: StatoSfondo, evento: EventoSfondo): StatoSfondo {
  switch (evento.tipo) {
    case 'pronta': {
      const cima = stato.strati[stato.strati.length - 1];
      // Stessa immagine già in cima (in entrata o piena): niente da fare.
      if (cima && cima.src === evento.src && cima.stato !== 'esce') return stato;
      const nuovo: Strato = { chiave: stato.prossimaChiave, src: evento.src, stato: 'entra' };
      const strati = [...stato.strati, nuovo].slice(-MASSIMO_STRATI);
      return { ...stato, strati, prossimaChiave: stato.prossimaChiave + 1 };
    }
    case 'nessuna': {
      if (stato.strati.length === 0 || stato.strati.every((s) => s.stato === 'esce')) return stato;
      return { ...stato, strati: stato.strati.map((s) => (s.stato === 'esce' ? s : { ...s, stato: 'esce' })) };
    }
    case 'fine': {
      const indice = stato.strati.findIndex((s) => s.chiave === evento.chiave);
      const strato = stato.strati[indice];
      if (!strato) return stato;
      if (strato.stato === 'entra') {
        // Entrata finita: è lo sfondo; quelli sotto non si vedono più e si tolgono.
        const strati = [{ ...strato, stato: 'piena' as const }, ...stato.strati.slice(indice + 1)];
        return { ...stato, strati, transizioni: stato.transizioni + 1 };
      }
      if (strato.stato === 'esce') {
        const strati = stato.strati.filter((s) => s.chiave !== evento.chiave);
        // L'ultima uscita completa il passaggio allo sfondo d'atmosfera.
        const completata = strati.length === 0;
        return { ...stato, strati, transizioni: stato.transizioni + (completata ? 1 : 0) };
      }
      return stato;
    }
  }
}

/** L'immagine di riferimento: quella in cima che non sta uscendo (null = sfondo d'atmosfera). */
export function immagineCorrente(stato: StatoSfondo): string | null {
  for (let i = stato.strati.length - 1; i >= 0; i--) {
    const s = stato.strati[i];
    if (s && s.stato !== 'esce') return s.src;
  }
  return null;
}

/**
 * Lo sfondo d'atmosfera serve solo se nessuna immagine copre tutto lo schermo: durante la prima
 * entrata, durante un'uscita o senza immagini. Altrimenti si smonta (tre strati animati in meno).
 */
export function serveSfondoUmore(stato: StatoSfondo): boolean {
  return !stato.strati.some((s) => s.stato === 'piena');
}
