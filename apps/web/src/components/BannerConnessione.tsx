/**
 * Banner di connessione persa (telefono e schermo). Durante il primo collegamento compare solo
 * dopo un attimo, per non lampeggiare a ogni apertura della pagina.
 */
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useConnessione } from '../store/connessione';

/** Ritardo prima di mostrare «connessione…» al primo collegamento. */
const RITARDO_PRIMO_AVVISO_MS = 1500;

export function BannerConnessione({ grande = false }: { grande?: boolean }) {
  const stato = useConnessione((s) => s.stato);
  const tentativi = useConnessione((s) => s.tentativi);
  const [pazienzaFinita, setPazienzaFinita] = useState(false);

  useEffect(() => {
    if (stato !== 'connessione') return;
    const timer = window.setTimeout(() => setPazienzaFinita(true), RITARDO_PRIMO_AVVISO_MS);
    return () => window.clearTimeout(timer);
  }, [stato]);

  if (stato === 'connesso') return null;
  if (stato === 'connessione' && !pazienzaFinita) return null;

  const testo =
    stato === 'persa'
      ? `Connessione persa: riprovo${tentativi > 1 ? ` (tentativo ${tentativi})` : ''}…`
      : 'Collegamento al tavolo…';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="banner-connessione"
      className={clsx(
        'flex items-center justify-center gap-3 bg-sangue/90 font-semibold text-notte',
        grande ? 'px-6 py-3 text-2xl' : 'sicuro-lati shrink-0 py-2.5 text-base',
      )}
    >
      <span className="inline-block size-2.5 animate-pulse rounded-full bg-notte" aria-hidden />
      {testo}
    </div>
  );
}
