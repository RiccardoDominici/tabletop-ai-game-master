/**
 * Banner dello stato della scena per il telefono: dice al giocatore se tocca a lui, se ascoltare
 * o se aspettare. Con la chiusura automatica fissata mostra il conto alla rovescia.
 */
import clsx from 'clsx';
import type { StatoTavolo } from '@cantastorie/shared';
import { secondiRimasti } from '../lib/formato';
import { useOra } from '../lib/useOra';
import { bannerTelefono, type TipoBanner } from './vista';

const STILE: Record<TipoBanner, string> = {
  tocca_a_te: 'border-candela bg-candela/15 text-candela-2 shadow-candela',
  narratore: 'border-lago/40 bg-lago/10 text-lago',
  non_chiamato: 'border-bordo bg-notte-2 text-pergamena-2',
  attesa: 'border-bordo bg-notte-2 text-pergamena-2',
  fermata: 'border-sangue/50 bg-sangue/10 text-sangue',
};

export function BannerStato({ stato, idPg }: { stato: StatoTavolo; idPg: string | null }) {
  const banner = bannerTelefono(stato, idPg);
  const ora = useOra(banner.scadenzaMs !== null);
  const secondi = banner.scadenzaMs !== null ? secondiRimasti(banner.scadenzaMs, ora) : null;

  return (
    <section
      data-testid="banner-stato"
      data-tipo={banner.tipo}
      role="status"
      aria-live="polite"
      className={clsx('flex items-center gap-4 rounded-carta border px-4 py-3', STILE[banner.tipo])}
    >
      <div className="min-w-0 flex-1">
        <p className="text-lg leading-snug font-bold">{banner.titolo}</p>
        {banner.dettaglio && <p className="mt-0.5 text-[0.95rem] leading-snug opacity-85">{banner.dettaglio}</p>}
      </div>
      {secondi !== null && (
        <div
          className="flex shrink-0 flex-col items-center rounded-xl bg-notte/60 px-3 py-1"
          aria-label={`La finestra si chiude tra ${secondi} secondi`}
        >
          <span className="font-titolo text-3xl leading-none font-bold tabular-nums">{secondi}</span>
          <span className="text-xs tracking-wide uppercase opacity-80">sec</span>
        </div>
      )}
    </section>
  );
}
