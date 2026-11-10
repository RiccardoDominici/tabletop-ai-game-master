/**
 * Prima di «Inizia sessione»: titolo della scena, QR + link per i telefoni e il pulsante enorme
 * che sblocca l'audio (i browser non suonano nulla senza un gesto dell'utente).
 */
import type { InfoServer, StatoTavolo } from '@cantastorie/shared';
import { Qr } from '../components/Qr';
import { elencoNomi } from '../lib/formato';
import { useSchermo } from '../store/schermo';
import { iniziaSessione } from './sessione';

export function SchermataInizio({ stato, info }: { stato: StatoTavolo | null; info: InfoServer | null }) {
  const errore = useSchermo((s) => s.erroreAvvio);
  const collegati = (stato?.pg ?? []).filter((p) => p.telefoni > 0).map((p) => p.nome.split(' ')[0] ?? p.nome);

  return (
    <main className="relative z-10 flex h-dvh flex-col items-center justify-center gap-[4vh] px-[5vw] text-center">
      <header>
        <p className="text-[1.6vw] tracking-[0.35em] text-candela uppercase">Tabletop AI Game Master</p>
        <h1 data-testid="titolo-scena" className="mt-[1vh] font-titolo text-[4.6vw] leading-tight font-semibold text-pergamena [text-shadow:0_0_3px_rgb(0_0_0),0_4px_14px_rgb(0_0_0/0.95),0_0_40px_rgb(0_0_0/0.8)]">
          {stato?.scena.titolo ?? 'Collegamento al tavolo…'}
        </h1>
      </header>

      <section className="flex items-center gap-[3vw] rounded-[2vw] border border-bordo/70 bg-notte/80 p-[2vw]">
        {info ? (
          <Qr svg={info.qr_svg} className="size-[19vw] max-h-[42vh] max-w-[42vh]" />
        ) : (
          <div className="size-[19vw] max-h-[42vh] max-w-[42vh] animate-pulse rounded-xl bg-notte-3" data-testid="qr" />
        )}
        <div className="max-w-[34vw] text-left">
          <p className="text-[2vw] font-semibold text-pergamena">Inquadra il codice col telefono</p>
          <p className="mt-[0.6vh] text-[1.4vw] text-pergamena-2">oppure apri:</p>
          <p className="mt-[0.6vh] font-mono text-[1.7vw] break-all text-candela-2">{info?.url_telefono ?? '…'}</p>
          <p className="mt-[2vh] text-[1.4vw] text-pergamena-2">
            {collegati.length === 0
              ? 'Nessun giocatore collegato per ora.'
              : `Collegati: ${elencoNomi(collegati)}.`}
          </p>
        </div>
      </section>

      <button
        type="button"
        data-testid="inizia-sessione"
        // Sincrono dentro il click: l'AudioContext deve nascere nel gesto dell'utente.
        onClick={() => iniziaSessione()}
        className="rounded-full bg-candela px-[5vw] py-[2.2vh] font-titolo text-[3vw] font-bold text-notte shadow-candela transition hover:bg-candela-2 active:scale-[0.98]"
      >
        Inizia sessione
      </button>

      {errore && (
        <p role="alert" className="text-[1.5vw] text-sangue">
          {errore}
        </p>
      )}
    </main>
  );
}
