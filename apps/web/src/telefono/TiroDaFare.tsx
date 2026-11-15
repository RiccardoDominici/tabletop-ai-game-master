/**
 * «Fai un tiro di Furtività» on the phone (manual rolls, docs/prove.md §8): a full-screen card while one of my rolls
 * is open. It says what to roll (1d20, 2d20 with advantage and which one counts, 1d100 on a roll-under, 2d6), the
 * player's own bonus, and has one field per die: the player types what the die shows and the phone adds the bonus and
 * shows the total. Never the DC: the phone does not receive it. «Fatto» sends the dice; a dictation («ho fatto 14»)
 * fills the fields from the transcript (the microphone of the action box, docs/ascolto.md). A private action's roll
 * is here too, and only here.
 */
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { totaleRichiesta, type RichiestaTiro } from '@tabletop-ai-gm/shared';
import { t } from '../lingua';
import { creaLog } from '../lib/log';
import { conSegno } from '../lib/tiri';
import { useTelefono } from '../store/telefono';
import { inserisciTiro } from './sessione';
import { PulsanteMicrofono } from './Microfono';
import { suDettatoTiro } from './dettato';
import { valoriDettati } from './numeriDettati';

const log = creaLog('tiro');

/** The first open roll of my PC, if any. */
export function TiroDaFare() {
  const richieste = useTelefono((s) => s.richiesteTiro);
  const r = richieste[0];
  if (!r) return null;
  return <Carta key={r.id} r={r} altri={richieste.length - 1} />;
}

/** How to roll, in words: «Tira 2d20 e tieni il più alto», «Tira 1d100: più basso è meglio», «Tira 2d6 e sommali». */
export function comeTirare(r: Pick<RichiestaTiro, 'facce' | 'quanti' | 'tieni' | 'somma' | 'sotto_soglia'>): string {
  const dadi = `${r.quanti}d${r.facce}`;
  if (r.somma) return t('telefono.tiro.come_somma', { dadi });
  if (r.quanti > 1) return t(r.tieni === 'basso' ? 'telefono.tiro.come_basso' : 'telefono.tiro.come_alto', { dadi });
  return t(r.sotto_soglia ? 'telefono.tiro.come_sotto' : 'telefono.tiro.come_uno', { dadi });
}

function Carta({ r, altri }: { r: RichiestaTiro; altri: number }) {
  const occupato = useTelefono((s) => s.occupato);
  const errore = useTelefono((s) => s.errore);
  const [campi, setCampi] = useState<string[]>(() => Array.from({ length: r.quanti }, () => ''));
  const [dettato, setDettato] = useState<string | null>(null);
  const primo = useRef<HTMLInputElement>(null);
  const valori = campi.map((c) => Number(c));
  const totale = campi.every((c) => c.trim() !== '') ? totaleRichiesta(r, valori) : null;

  useEffect(() => {
    primo.current?.focus();
    // While this roll is open the dictation fills its fields instead of the action box.
    suDettatoTiro((testo) => {
      const v = valoriDettati(testo, r.quanti, r.facce);
      log.info('Dictated roll', { id: r.id, testo, valori: v });
      if (!v) {
        setDettato(t('telefono.tiro.dettato_non_capito', { testo }));
        return;
      }
      setCampi(v.map(String));
      setDettato(t('telefono.tiro.dettato_capito', { testo }));
    });
    return () => suDettatoTiro(null);
  }, [r.id, r.quanti, r.facce]);

  const invia = () => {
    if (totale === null) return;
    void inserisciTiro(r.id, valori, dettato !== null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tiro-titolo"
      data-testid="tiro-da-fare"
      data-richiesta={r.id}
      className="sicuro-lati fixed inset-0 z-50 flex flex-col bg-notte/97 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)] backdrop-blur-md"
    >
      <form
        className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 overflow-y-auto pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          invia();
        }}
      >
        <p className="self-start rounded-full bg-candela px-3 py-1 text-sm font-bold tracking-wide text-notte uppercase">
          {r.dal_master ? t('telefono.tiro.dal_master') : t('telefono.tiro.tocca_a_te')}
        </p>
        <h2 id="tiro-titolo" data-testid="tiro-etichetta" className="font-titolo text-3xl leading-tight font-semibold text-pergamena">
          {r.etichetta}
        </h2>
        <p data-testid="tiro-come" className="text-[1.25rem] leading-snug text-pergamena">
          {comeTirare(r)}
          {r.vantaggio && (
            <span className="block text-pergamena-2">
              {t(r.vantaggio === 'vantaggio' ? 'telefono.tiro.con_vantaggio' : 'telefono.tiro.con_svantaggio')}
              {r.motivo_vantaggio ? `: ${r.motivo_vantaggio}` : ''}
            </span>
          )}
        </p>
        {r.privata && <p className="text-sm text-cenere">{t('telefono.tiro.privato')}</p>}

        <div className="flex flex-wrap items-end gap-3">
          {campi.map((c, i) => (
            <label key={i} className="flex flex-col gap-1 text-sm text-pergamena-2">
              {r.quanti > 1 ? t('telefono.tiro.dado_n', { n: i + 1 }) : t('telefono.tiro.dado')}
              <input
                ref={i === 0 ? primo : undefined}
                data-testid={`tiro-dado-${i}`}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                value={c}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                  setCampi((x) => x.map((y, k) => (k === i ? v : y)));
                  setDettato(null);
                }}
                aria-label={t('telefono.tiro.aria_dado', { n: i + 1, facce: r.facce })}
                className="h-16 w-24 rounded-xl border-2 border-pergamena-2/60 bg-notte-2 text-center font-titolo text-3xl text-pergamena tabular-nums focus:border-candela focus:outline-none"
              />
            </label>
          ))}
          {!r.sotto_soglia && (
            <p className="pb-4 text-lg text-pergamena-2" data-testid="tiro-bonus">
              {t('telefono.tiro.bonus', { bonus: conSegno(r.modificatore) })}
            </p>
          )}
        </div>
        <p data-testid="tiro-totale" aria-live="polite" className={clsx('font-titolo text-2xl', totale === null ? 'text-cenere' : 'text-candela')}>
          {totale === null ? t('telefono.tiro.scrivi_dadi', { facce: r.facce }) : t('telefono.tiro.totale', { totale })}
        </p>
        {dettato && <p className="text-pergamena-2">{dettato}</p>}
        {altri > 0 && <p className="text-sm text-cenere">{t('telefono.tiro.altri', { n: altri })}</p>}
        {errore && (
          <p role="alert" className="rounded-lg bg-sangue/10 px-3 py-2 text-sangue">
            {errore}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-4">
          <button
            type="submit"
            data-testid="tiro-invia"
            disabled={occupato || totale === null}
            className="min-h-16 flex-1 rounded-2xl bg-candela text-xl font-bold text-notte active:scale-[0.98] disabled:opacity-50"
          >
            {t('telefono.tiro.fatto')}
          </button>
          <PulsanteMicrofono disabilitato={occupato} />
        </div>
      </form>
    </div>
  );
}
