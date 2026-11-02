/**
 * Screen Wake Lock: tiene acceso lo schermo del telefono (e del portatile del proiettore)
 * mentre la pagina è in primo piano.
 *
 * - Esiste solo in contesti sicuri (https o localhost): su http://<ip-lan> non c'è e si ignora.
 * - Il blocco cade da solo quando la pagina va in secondo piano: lo si richiede di nuovo a ogni
 *   `visibilitychange` verso «visible» e al primo tocco (alcuni browser vogliono un gesto).
 */
import { useEffect } from 'react';
import { creaLog } from './log';

const log = creaLog('schermo-acceso');

export function useSchermoAcceso(attivo = true): void {
  useEffect(() => {
    if (!attivo || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let blocco: WakeLockSentinel | null = null;
    let smontato = false;
    let inCorso = false;

    const richiedi = async () => {
      if (smontato || inCorso || document.visibilityState !== 'visible') return;
      if (blocco && !blocco.released) return;
      inCorso = true;
      try {
        blocco = await navigator.wakeLock.request('screen');
        log.debug('Schermo tenuto acceso');
        if (smontato) void blocco.release();
      } catch (errore) {
        // Rifiuto previsto (batteria scarica, permessi, nessun gesto): si riprova più tardi.
        log.debug('Wake lock rifiutato', errore);
      } finally {
        inCorso = false;
      }
    };

    const suVisibilita = () => {
      if (document.visibilityState === 'visible') void richiedi();
    };
    const suTocco = () => void richiedi();

    void richiedi();
    document.addEventListener('visibilitychange', suVisibilita);
    document.addEventListener('pointerdown', suTocco);
    return () => {
      smontato = true;
      document.removeEventListener('visibilitychange', suVisibilita);
      document.removeEventListener('pointerdown', suTocco);
      if (blocco && !blocco.released) void blocco.release().catch(() => undefined);
    };
  }, [attivo]);
}
