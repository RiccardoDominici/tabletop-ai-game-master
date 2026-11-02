/**
 * Hook dello scorrimento «educato» (scorrimento.ts): a ogni voce nuova si scende in fondo solo se
 * si era già in fondo; altrimenti si accende `nuove` e il componente mostra «↓ Nuove righe».
 * Se il contenitore cambia altezza (finestra ridimensionata) e si era in fondo, ci si resta.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { vicinoAlFondo } from './scorrimento';

export function useSegueFondo<T extends HTMLElement>(ultimaChiave: string | number | null) {
  const ref = useRef<T>(null);
  const eraInFondo = useRef(true);
  const [nuove, setNuove] = useState(false);

  // Dopo il render con la voce nuova (prima del disegno): si scende o si avvisa.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (eraInFondo.current) {
      el.scrollTop = el.scrollHeight;
      setNuove(false);
    } else if (ultimaChiave !== null) {
      setNuove(true);
    }
  }, [ultimaChiave]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const osservatore = new ResizeObserver(() => {
      if (eraInFondo.current) el.scrollTop = el.scrollHeight;
    });
    osservatore.observe(el);
    return () => osservatore.disconnect();
  }, []);

  const suScorrimento = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    eraInFondo.current = vicinoAlFondo(el);
    if (eraInFondo.current) setNuove(false);
  }, []);

  const vaiInFondo = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    eraInFondo.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setNuove(false);
  }, []);

  return { ref, suScorrimento, nuove, vaiInFondo };
}
