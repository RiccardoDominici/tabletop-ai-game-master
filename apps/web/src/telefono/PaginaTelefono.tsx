/**
 * Pagina /telefono (giocatori, mobile-first).
 *
 * Disposizione «da chat»: in alto chi sono, il banner di stato e «Al tavolo» (le azioni degli
 * altri), al centro la trascrizione che scorre, in basso il pannello dell'azione. L'avviso «da
 * decidere» copre tutto lo schermo quando serve. Altezza = 100dvh, così con la tastiera aperta (Chrome
 * Android, `interactive-widget=resizes-content`) il pannello resta sopra la tastiera.
 * Il banner di connessione è nel flusso, sopra tutto: non copre l'intestazione.
 */
import { useEffect } from 'react';
import type { StatoTavolo } from '@cantastorie/shared';
import { BannerConnessione } from '../components/BannerConnessione';
import { Avvisi } from '../components/Avvisi';
import { useSchermoAcceso } from '../lib/schermoAcceso';
import { useTavolo } from '../store/tavolo';
import { useTelefono } from '../store/telefono';
import { avviaTelefono } from './sessione';
import { SceltaPersonaggio } from './SceltaPersonaggio';
import { BannerStato } from './BannerStato';
import { Trascrizione } from './Trascrizione';
import { CasellaAzione } from './CasellaAzione';
import { SchedaPersonaggio } from './SchedaPersonaggio';
import { AlTavolo } from './AlTavolo';
import { SceltaAzione } from './SceltaAzione';

export function PaginaTelefono() {
  useEffect(() => avviaTelefono(), []);
  useSchermoAcceso(true);

  useEffect(() => {
    document.title = 'Cantastorie · Telefono';
  }, []);

  const stato = useTavolo((s) => s.stato);
  const idPg = useTelefono((s) => s.idPg);
  const sceltaAperta = useTelefono((s) => s.sceltaAperta);

  let contenuto;
  if (!stato) {
    contenuto = <Attesa />;
  } else if (!idPg || sceltaAperta || !stato.pg.some((p) => p.id === idPg)) {
    contenuto = <SceltaPersonaggio stato={stato} />;
  } else {
    contenuto = <Tavolo stato={stato} idPg={idPg} />;
  }

  // La zona sicura in alto (notch) si gestisce una volta sola qui: il banner di connessione sta
  // nel flusso sopra il contenuto (non lo copre) e sotto il notch.
  return (
    <div className="flex h-dvh flex-col pt-[env(safe-area-inset-top)]">
      <BannerConnessione />
      <div className="min-h-0 flex-1 overflow-y-auto">{contenuto}</div>
      <Avvisi />
    </div>
  );
}

function Attesa() {
  return (
    <main className="sicuro-lati flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="font-titolo text-3xl font-semibold text-candela">Cantastorie</p>
      <p className="text-pergamena-2">Mi collego al tavolo…</p>
    </main>
  );
}

function Tavolo({ stato, idPg }: { stato: StatoTavolo; idPg: string }) {
  const pg = stato.pg.find((p) => p.id === idPg);
  const apriScelta = useTelefono((s) => s.apriScelta);
  const apriScheda = useTelefono((s) => s.apriScheda);
  const haScheda = useTelefono((s) => s.scheda?.id_pg === idPg);

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <header className="sicuro-lati flex items-center gap-3 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-[0.18em] text-cenere uppercase">Giochi come</p>
          <p className="line-clamp-2 font-titolo text-xl leading-tight font-semibold" data-testid="nome-pg">
            {pg?.nome ?? idPg}
          </p>
        </div>
        {haScheda && (
          <button
            type="button"
            onClick={() => apriScheda(true)}
            data-testid="apri-scheda"
            className="min-h-12 min-w-12 shrink-0 rounded-full border border-candela/60 px-4 text-[0.95rem] text-candela active:bg-notte-3"
          >
            Scheda
          </button>
        )}
        <button
          type="button"
          onClick={() => apriScelta(true)}
          aria-label="Cambia personaggio"
          className="min-h-12 min-w-12 shrink-0 rounded-full border border-bordo-chiaro px-4 text-[0.95rem] text-pergamena-2 active:bg-notte-3"
        >
          Cambia
        </button>
      </header>

      <div className="sicuro-lati flex flex-col gap-2">
        <BannerStato stato={stato} idPg={idPg} />
        <AlTavolo stato={stato} idPg={idPg} />
      </div>

      <Trascrizione voci={stato.trascrizione} className="sicuro-lati mt-1 min-h-0 flex-1" />

      <section className="sicuro-lati sicuro-basso flex flex-col gap-2 border-t border-bordo bg-notte-2/95 pt-2.5 backdrop-blur">
        <CasellaAzione stato={stato} />
      </section>
      <SchedaPersonaggio />
      <SceltaAzione />
    </div>
  );
}
