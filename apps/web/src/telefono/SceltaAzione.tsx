/**
 * Avviso a tutto schermo quando la mia azione è «da decidere» (docs/azioni-concorrenti.md):
 * qualcosa l'ha toccata (un'azione da cui dipendeva è cambiata, qualcuno è arrivato prima, la
 * scena è andata avanti) e il giocatore sceglie:
 * - `richiesta.conferma` («Confermo» o «Tengo») → `azione:conferma`;
 * - «Cambio» → l'avviso si mette da parte, il testo torna nella casella col cursore dentro;
 * - «Ritiro» → `azione:ritira`.
 *
 * Parole neutre (mai «Conflitto!»): il testo del server dice già cosa è successo. Conto alla
 * rovescia da `richiesta.scadenza_ms` (orologio del server, corretto dallo scarto); allo scadere il
 * server la rende «sospesa». Vibrazione all'apparire, se il telefono la permette.
 */
import { ordinePulsanti, type Scelta } from './scelta';
import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import type { AzionePrivata } from '@cantastorie/shared';
import { secondiRimasti } from '../lib/formato';
import { useOra } from '../lib/useOra';
import { creaLog } from '../lib/log';
import { useTelefono } from '../store/telefono';
import { cambiaAzione, confermaAzione, ritiraAzione } from './sessione';
import { chiaveRichiesta } from './vista';

const log = creaLog('scelta');

/** Schema di vibrazione: due colpi brevi, riconoscibili ma non fastidiosi. */
const VIBRAZIONE_MS = [180, 90, 180];

/**
 * Vibra solo se il giocatore ha già toccato la pagina: altrimenti Chrome blocca la chiamata e
 * scrive un avviso in console. Su iOS `navigator.vibrate` non esiste.
 */
function vibra(): void {
  try {
    const attivato = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (typeof navigator.vibrate !== 'function' || attivato?.hasBeenActive === false) return;
    navigator.vibrate(VIBRAZIONE_MS);
  } catch (errore) {
    log.debug('Vibrazione non disponibile', errore);
  }
}

/** L'avviso, se c'è una richiesta aperta e non messa da parte; altrimenti nulla. */
export function SceltaAzione() {
  const mia = useTelefono((s) => s.miaAzione);
  const rimandata = useTelefono((s) => s.sceltaRimandata);
  const chiave = chiaveRichiesta(mia);
  if (!mia || !mia.richiesta || chiave === null || chiave === rimandata) return null;
  return <Avviso key={chiave} azione={mia} />;
}

function Avviso({ azione }: { azione: AzionePrivata }) {
  const richiesta = azione.richiesta!;
  const occupato = useTelefono((s) => s.occupato);
  const errore = useTelefono((s) => s.errore);
  const primo = useRef<HTMLButtonElement>(null);

  // Una volta per richiesta (il componente ha come key la chiave della richiesta).
  useEffect(() => {
    vibra();
    primo.current?.focus();
  }, []);

  const scadenza = richiesta.scadenza_ms;
  const ora = useOra(scadenza !== null);
  const secondi = scadenza !== null ? secondiRimasti(scadenza, ora) : null;

  const ordine = ordinePulsanti(richiesta);
  /** Un pulsante della scelta: il primario è pieno, gli altri contornati. */
  const Pulsante = ({ scelta, primario = false, rif }: { scelta: Scelta; primario?: boolean; rif?: typeof primo }) => {
    const dati = {
      conferma: { testid: 'scelta-conferma', etichetta: richiesta.conferma, azione: () => void confermaAzione() },
      cambio: { testid: 'scelta-cambio', etichetta: 'Cambio', azione: cambiaAzione },
      ritiro: { testid: 'scelta-ritiro', etichetta: 'Ritiro', azione: () => void ritiraAzione() },
    }[scelta];
    return (
      <button
        ref={rif}
        type="button"
        data-testid={dati.testid}
        data-primario={primario ? 'si' : 'no'}
        disabled={occupato}
        onClick={dati.azione}
        className={clsx(
          'min-h-16 rounded-2xl text-xl font-bold active:scale-[0.98] disabled:opacity-50',
          primario
            ? 'bg-candela text-notte'
            : scelta === 'ritiro'
              ? 'border-2 border-bordo-chiaro text-pergamena-2'
              : 'border-2 border-pergamena-2/70 text-pergamena',
        )}
      >
        {dati.etichetta}
      </button>
    );
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="scelta-titolo"
      aria-describedby="scelta-testo"
      data-testid="scelta-azione"
      className="sicuro-lati fixed inset-0 z-50 flex flex-col bg-notte/97 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)] backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 overflow-y-auto pt-4">
        <p className="self-start rounded-full bg-candela px-3 py-1 text-sm font-bold tracking-wide text-notte uppercase">
          Da decidere
        </p>
        <h2 id="scelta-titolo" className="font-titolo text-2xl leading-tight font-semibold text-pergamena">
          Qualcosa è cambiato
        </h2>
        <p id="scelta-testo" data-testid="scelta-testo" className="font-racconto text-[1.3rem] leading-relaxed text-pergamena">
          {richiesta.testo}
        </p>
        <p className="rounded-xl border border-bordo bg-notte-2 px-4 py-3 text-pergamena-2">
          <span className="font-semibold text-pergamena">La tua azione: </span>«{azione.testo}»
        </p>

        {secondi !== null && (
          <div data-testid="scelta-conto" aria-live="polite" className="flex items-center gap-3 text-pergamena-2">
            <span className="font-titolo text-4xl leading-none font-bold text-candela tabular-nums">{secondi}</span>
            <span className="leading-snug">
              {secondi > 0
                ? `second${secondi === 1 ? 'o' : 'i'} per scegliere, poi l’azione resta fuori da questo turno`
                : 'Tempo finito: l’azione resta fuori da questo turno'}
            </span>
          </div>
        )}

        {errore && (
          <p role="alert" className="rounded-lg bg-sangue/10 px-3 py-2 text-sangue">
            {errore}
          </p>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 pt-4">
        {/* In evidenza la scelta consigliata dal server (vedi scelta.ts); le altre due sotto. */}
        <Pulsante scelta={ordine.primario} primario rif={primo} />
        <div className="grid grid-cols-2 gap-3">
          <Pulsante scelta={ordine.secondari[0]} />
          <Pulsante scelta={ordine.secondari[1]} />
        </div>
      </div>
    </div>
  );
}
