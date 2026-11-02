/**
 * Orologio iniettabile: tempo monotono, epoch e timer. In produzione quello di sistema, nei test
 * uno finto che si fa avanzare a mano (scenari deterministici).
 */
export interface Orologio {
  /** Millisecondi monotoni (performance.now in produzione). */
  ora(): number;
  /** Epoch ms (per i client). */
  adesso(): number;
  /** Programma una richiamata; restituisce la funzione che la annulla. */
  dopo(ms: number, cb: () => void): () => void;
}

export const orologioDiSistema: Orologio = {
  ora: () => performance.now(),
  adesso: () => Date.now(),
  dopo: (ms, cb) => {
    const t = setTimeout(cb, ms);
    return () => clearTimeout(t);
  },
};
