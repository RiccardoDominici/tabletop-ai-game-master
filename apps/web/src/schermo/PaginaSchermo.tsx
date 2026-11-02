/**
 * Pagina /schermo (proiettore, 1920×1080, letta da 3 m).
 *
 * Sotto tutto, l'immagine del luogo con un lento Ken Burns (o, senza immagine, lo sfondo
 * d'atmosfera); un'immagine di situazione, quando c'è, prende il suo posto con la stessa dissolvenza. Prima di «Inizia sessione»: titolo, QR e pulsante (SchermataInizio). Dopo:
 * titolo della scena, ritratto + parlante + sottotitolo al centro, stato della finestra in basso
 * a sinistra, QR in basso a destra. Niente `backdrop-filter` qui: sopra un'immagine che si muove
 * andrebbe ricalcolato a ogni fotogramma. Tasto «L» (o il pulsantino in alto) per l'HUD di latenza,
 * «A» per i volumi dell'audio, «C» per i crediti dei brani.
 * Le misure tipografiche sono in vw: la pagina si adatta a qualunque risoluzione del proiettore.
 */
import { useEffect } from 'react';
import type { InfoServer, StatoTavolo } from '@cantastorie/shared';
import { BannerConnessione } from '../components/BannerConnessione';
import { Avvisi } from '../components/Avvisi';
import { Qr } from '../components/Qr';
import { useSchermoAcceso } from '../lib/schermoAcceso';
import { useTavolo } from '../store/tavolo';
import { useSchermo } from '../store/schermo';
import { esponiDebugSchermo } from './debug';
import { avviaSchermo } from './sessione';
import { SfondoLuogo } from './SfondoLuogo';
import { usePrecaricamentoScena } from './immaginiScena';
import { SchermataInizio } from './SchermataInizio';
import { Narrazione } from './Narrazione';
import { RigaFinestra } from './RigaFinestra';
import { HudLatenza } from './HudLatenza';
import { CreditiAudio, PannelloAudio, PulsanteAudio, useTastiAudio } from './audio/PannelloAudio';

export function PaginaSchermo() {
  useEffect(() => {
    esponiDebugSchermo();
    document.title = 'Cantastorie · Schermo';
  }, []);
  useEffect(() => avviaSchermo(), []);
  useSchermoAcceso(true);
  useTastoHud();
  useTastiAudio();

  const stato = useTavolo((s) => s.stato);
  const info = useTavolo((s) => s.info);
  const audioSbloccato = useSchermo((s) => s.audioSbloccato);
  const hudAperto = useSchermo((s) => s.hudAperto);
  usePrecaricamentoScena(stato?.scena ?? null);

  return (
    <div className="relative h-dvh overflow-hidden bg-notte">
      {/* Un'immagine di situazione (dopo una rivelazione, o dal master) prende il posto del luogo. */}
      <SfondoLuogo
        immagine={stato?.scena.situazione ?? stato?.scena.immagine ?? null}
        umore={stato?.scena.umore ?? null}
        intensita={stato?.scena.intensita ?? null}
      />
      <div className="fixed inset-x-0 top-0 z-40">
        <BannerConnessione grande />
      </div>

      {!audioSbloccato || !stato ? (
        <SchermataInizio stato={stato} info={info} />
      ) : (
        <Scena stato={stato} info={info} />
      )}

      <PulsanteHud />
      {hudAperto && <HudLatenza />}
      {/* Audio: volumi per bus (tasto A) e crediti dei brani (tasto C). */}
      <PulsanteAudio />
      <PannelloAudio />
      <CreditiAudio />
      <Avvisi grande />
    </div>
  );
}

function Scena({ stato, info }: { stato: StatoTavolo; info: InfoServer | null }) {
  return (
    <main className="relative z-10 grid h-dvh grid-rows-[auto_1fr_auto] gap-[2vh] px-[3.5vw] pt-[4vh] pb-[4vh]">
      <header className="max-w-[70vw]">
        <p className="text-[1.1vw] tracking-[0.35em] text-candela/90 uppercase drop-shadow-[0_2px_6px_rgb(0_0_0/0.9)]">
          Cantastorie
        </p>
        <h1
          data-testid="titolo-scena"
          className="font-titolo text-[2.6vw] leading-tight font-semibold text-pergamena drop-shadow-[0_3px_12px_rgb(0_0_0/0.9)]"
        >
          {stato.scena.titolo}
        </h1>
      </header>

      <div className="flex min-h-0 items-end justify-center pb-[2vh]">
        <Narrazione stato={stato} />
      </div>

      <footer className="flex items-end justify-between gap-[3vw]">
        <div className="min-w-0 flex-1 pb-[0.5vh]">
          <RigaFinestra stato={stato} />
        </div>
        {info && (
          <div className="flex shrink-0 items-end gap-[1vw]">
            <p className="pb-[0.4vh] text-right text-[1.05vw] leading-snug whitespace-nowrap text-pergamena-2 drop-shadow-[0_2px_6px_rgb(0_0_0/0.9)]">
              Unisciti col telefono
              <br />
              <span className="font-mono text-candela-2">{info.url_telefono}</span>
            </p>
            <Qr svg={info.qr_svg} className="size-[8.5vw] p-[0.5vw]" />
          </div>
        )}
      </footer>
    </main>
  );
}

/** Pulsantino discreto in alto a destra che apre/chiude l'HUD. */
function PulsanteHud() {
  const hudAperto = useSchermo((s) => s.hudAperto);
  const alternaHud = useSchermo((s) => s.alternaHud);
  if (hudAperto) return null;
  return (
    <button
      type="button"
      data-testid="apri-hud"
      onClick={alternaHud}
      title="Latenza (tasto L)"
      className="fixed top-4 right-4 z-30 rounded-lg border border-bordo/60 bg-notte/80 px-3 py-1.5 font-mono text-sm text-cenere opacity-60 transition hover:opacity-100"
    >
      L · latenza
    </button>
  );
}

/** Tasto «L» (senza modificatori) per l'HUD. */
function useTastoHud(): void {
  useEffect(() => {
    const suTasto = (evento: KeyboardEvent) => {
      if (evento.repeat || evento.ctrlKey || evento.metaKey || evento.altKey) return;
      const bersaglio = evento.target as HTMLElement | null;
      if (bersaglio && (bersaglio.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(bersaglio.tagName))) return;
      if (evento.key === 'l' || evento.key === 'L') useSchermo.getState().alternaHud();
    };
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, []);
}
