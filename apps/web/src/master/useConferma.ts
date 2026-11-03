/**
 * Conferma col secondo clic entro pochi secondi, per i comandi che non si annullano (Nuova sessione,
 * Fine sessione, Prossima sessione). Niente window.confirm: il browser del proiettore o le prove lo
 * chiuderebbero da soli.
 */
import { useEffect, useState } from 'react';

/** Tempo per confermare col secondo clic. */
export const FINESTRA_CONFERMA_MS = 5000;

/** [daConfermare, clic]: il primo clic arma, il secondo (entro il tempo) esegue `azione`. */
export function useConferma(azione: () => void): [boolean, () => void] {
  const [daConfermare, setDaConfermare] = useState(false);
  useEffect(() => {
    if (!daConfermare) return;
    const t = window.setTimeout(() => setDaConfermare(false), FINESTRA_CONFERMA_MS);
    return () => window.clearTimeout(t);
  }, [daConfermare]);
  const clic = (): void => {
    if (!daConfermare) return setDaConfermare(true);
    setDaConfermare(false);
    azione();
  };
  return [daConfermare, clic];
}
