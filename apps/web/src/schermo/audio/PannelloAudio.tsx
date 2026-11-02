/**
 * Controlli audio del proiettore, discreti: un pulsantino «A · audio» in alto a destra e, col
 * tasto «A», un pannello con volume e muto per bus (voce, musica, ambienti, temi, effetti),
 * ricordati in localStorage. Il tasto «C» apre i crediti (CC BY) del manifest audio.
 * Lo stato del regista (brano, strati) si rilegge due volte al secondo solo a pannello aperto.
 */
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useSchermo } from '../../store/schermo';
import { debugSchermo } from '../debug';
import { BUS, NOMI_BUS } from './impostazioni';
import type { StatoRegista } from './regista';
import { useAudioSchermo } from './store';

const AGGIORNAMENTO_MS = 500;

export function PulsanteAudio() {
  const aperto = useAudioSchermo((s) => s.pannelloAperto);
  const alterna = useAudioSchermo((s) => s.alternaPannello);
  const hudAperto = useSchermo((s) => s.hudAperto);
  if (aperto) return null;
  return (
    <button
      type="button"
      data-testid="apri-audio"
      onClick={alterna}
      title="Volumi (tasto A) · crediti (tasto C)"
      className={clsx(
        'fixed top-4 z-30 rounded-lg border border-bordo/60 bg-notte/80 px-3 py-1.5 font-mono text-sm text-cenere opacity-60 transition hover:opacity-100',
        hudAperto ? 'right-[32rem]' : 'right-36',
      )}
    >
      A · audio
    </button>
  );
}

export function PannelloAudio() {
  const aperto = useAudioSchermo((s) => s.pannelloAperto);
  const hudAperto = useSchermo((s) => s.hudAperto);
  if (!aperto) return null;
  return <Pannello spostato={hudAperto} />;
}

function Pannello({ spostato }: { spostato: boolean }) {
  const impostazioni = useAudioSchermo((s) => s.impostazioni);
  const impostaBus = useAudioSchermo((s) => s.impostaBus);
  const pronto = useAudioSchermo((s) => s.pronto);
  const alternaCrediti = useAudioSchermo((s) => s.alternaCrediti);
  const [regista, setRegista] = useState<StatoRegista | null>(() => debugSchermo.audio?.stato() ?? null);

  useEffect(() => {
    const timer = window.setInterval(() => setRegista(debugSchermo.audio?.stato() ?? null), AGGIORNAMENTO_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <aside
      data-testid="pannello-audio"
      className={clsx(
        'fixed top-4 z-30 w-[22rem] rounded-2xl border border-bordo-chiaro bg-notte/95 p-4 text-[15px] text-pergamena shadow-profonda',
        spostato ? 'right-[32rem]' : 'right-4',
      )}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xl font-bold text-candela">Audio</h2>
        <span className="font-mono text-cenere">A per chiudere</span>
      </div>
      {!pronto && <p className="mb-2 text-cenere">Parte dopo «Inizia sessione».</p>}
      <ul className="grid gap-2">
        {BUS.map((nome) => {
          const b = impostazioni[nome];
          return (
            <li key={nome} className="grid grid-cols-[5.5rem_1fr_3rem_2.75rem] items-center gap-2">
              <span className={b.muto ? 'text-cenere line-through' : ''}>{NOMI_BUS[nome]}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(b.volume * 100)}
                data-testid={`volume-${nome}`}
                aria-label={`Volume ${NOMI_BUS[nome]}`}
                onChange={(e) => impostaBus(nome, { volume: Number(e.target.value) / 100 })}
                className="accent-candela"
              />
              <span className="text-right font-mono tabular-nums text-pergamena-2">{Math.round(b.volume * 100)}%</span>
              <button
                type="button"
                data-testid={`muto-${nome}`}
                aria-pressed={b.muto}
                onClick={() => impostaBus(nome, { muto: !b.muto })}
                className={clsx(
                  'min-h-8 rounded-md border px-1 font-mono text-xs',
                  b.muto ? 'border-sangue/70 text-sangue' : 'border-bordo-chiaro text-cenere hover:text-pergamena',
                )}
              >
                {b.muto ? 'muto' : 'on'}
              </button>
            </li>
          );
        })}
      </ul>
      {regista && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t border-bordo pt-2 font-mono text-xs text-pergamena-2">
          <dt className="text-cenere">musica</dt>
          <dd className="truncate">
            {regista.musica ?? '—'}
            {regista.musicaPendente !== undefined && ` → ${regista.musicaPendente ?? 'silenzio'} (attesa)`}
          </dd>
          <dt className="text-cenere">ambienti</dt>
          <dd className="truncate">{regista.ambienti.join(', ') || '—'}</dd>
          <dt className="text-cenere">sotto voce</dt>
          <dd>{regista.sottoVoce ? 'sì' : 'no'}</dd>
        </dl>
      )}
      <button
        type="button"
        data-testid="apri-crediti"
        onClick={alternaCrediti}
        className="mt-3 w-full rounded-lg border border-bordo-chiaro py-1.5 text-pergamena-2 hover:text-pergamena"
      >
        Crediti (C)
      </button>
    </aside>
  );
}

/** «Crediti»: le attribuzioni (CC BY) dei brani della campagna, a tutto schermo leggibili da lontano. */
export function CreditiAudio() {
  const aperti = useAudioSchermo((s) => s.creditiAperti);
  const crediti = useAudioSchermo((s) => s.crediti);
  const alterna = useAudioSchermo((s) => s.alternaCrediti);
  if (!aperti) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-[4vw]" onClick={alterna}>
      <section
        data-testid="crediti"
        className="max-h-[80vh] w-full max-w-[60vw] overflow-y-auto rounded-[1vw] border border-bordo-chiaro bg-notte/95 px-[3vw] py-[3vh] shadow-profonda"
      >
        <div className="mb-[2vh] flex items-baseline justify-between gap-4">
          <h2 className="font-titolo text-[2.4vw] font-semibold text-candela">Crediti</h2>
          <span className="font-mono text-[1vw] text-cenere">C per chiudere</span>
        </div>
        {crediti.length === 0 ? (
          <p className="text-[1.4vw] text-pergamena-2">Nessun brano con attribuzione in questa campagna.</p>
        ) : (
          <ul className="grid gap-[1vh] text-[1.4vw] leading-snug text-pergamena">
            {crediti.map((riga) => (
              <li key={riga}>{riga}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Tasti «A» (pannello audio) e «C» (crediti), senza modificatori e fuori dai campi di testo. */
export function useTastiAudio(): void {
  useEffect(() => {
    const suTasto = (evento: KeyboardEvent) => {
      if (evento.repeat || evento.ctrlKey || evento.metaKey || evento.altKey) return;
      const bersaglio = evento.target as HTMLElement | null;
      if (bersaglio && (bersaglio.isContentEditable || ['TEXTAREA', 'SELECT'].includes(bersaglio.tagName))) return;
      if (bersaglio?.tagName === 'INPUT' && (bersaglio as HTMLInputElement).type !== 'range') return;
      const tasto = evento.key.toLowerCase();
      if (tasto === 'a') useAudioSchermo.getState().alternaPannello();
      else if (tasto === 'c') useAudioSchermo.getState().alternaCrediti();
    };
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, []);
}
