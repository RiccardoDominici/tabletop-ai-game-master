/**
 * Banner dello stato della scena per il telefono: dice al giocatore se tocca a lui, se ascoltare
 * o se aspettare (e che può comunque scrivere). Con la chiusura automatica fissata mostra il conto
 * alla rovescia (orologio del server); a finestra aperta, sotto, chi è chiamato e chi è pronto.
 */
import clsx from 'clsx';
import type { StatoTavolo } from '@cantastorie/shared';
import { secondiRimasti } from '../lib/formato';
import { useOra } from '../lib/useOra';
import { bannerTelefono, type TipoBanner } from './vista';
import { PresenzeFinestra } from './PresenzeFinestra';

const STILE: Record<TipoBanner, string> = {
  tocca_a_te: 'border-candela bg-candela/15 text-candela-2 shadow-candela',
  narratore: 'border-lago/40 bg-lago/10 text-lago',
  non_chiamato: 'border-bordo bg-notte-2 text-pergamena-2',
  attesa: 'border-bordo bg-notte-2 text-pergamena-2',
  fermata: 'border-sangue/50 bg-sangue/10 text-sangue',
  pausa: 'border-candela-scura bg-notte-2 text-candela-2',
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
      className={clsx('flex flex-col gap-2 rounded-carta border px-4 py-2.5', STILE[banner.tipo])}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-lg leading-snug font-bold">{banner.titolo}</p>
          {banner.dettaglio && <p className="mt-0.5 text-[0.95rem] leading-snug opacity-85">{banner.dettaglio}</p>}
        </div>
        {secondi !== null && (
          <div
            className="flex shrink-0 items-baseline gap-1 rounded-lg bg-notte/60 px-2.5 py-1"
            aria-label={`La finestra si chiude tra ${secondi} secondi`}
          >
            <span className="font-titolo text-2xl leading-none font-bold tabular-nums">{secondi}</span>
            <span className="text-xs opacity-80">s</span>
          </div>
        )}
      </div>
      {/* Chi è chiamato e chi è pronto: una riga a tutta larghezza, sotto il titolo. */}
      <PresenzeFinestra stato={stato} idPg={idPg} />
    </section>
  );
}
