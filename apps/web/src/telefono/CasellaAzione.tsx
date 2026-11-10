/**
 * Casella dell'azione: scrivi, invia (poi «Aggiorna», o «Invia di nuovo» dopo una superata),
 * ritira, e l'interruttore «privata». Solo due pulsanti (richieste del 9 novembre, punto 7):
 * inviare vuol dire «ho finito», non c'è un «Pronto» da premere dopo.
 *
 * - Si scrive SEMPRE a scena in corso (anche mentre il narratore parla o prepara, o se non si è
 *   invitati): quello che arriva a finestra chiusa entra nel turno successivo.
 * - Quando hanno inviato tutti gli invitati il turno parte da solo dopo un attimo (per un
 *   «anch'io» o una correzione); fino ad allora si può cambiare o ritirare.
 * - La bozza sta in `store/bozza.ts`: la sessione la riconcilia con `azione:mia` e l'avviso
 *   «da decidere» ci rimette il testo con «Cambio» (qui si osserva la richiesta di fuoco).
 */
import { t } from '../lingua';
import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import type { StatoTavolo } from '@cantastorie/shared';
import { useTelefono } from '../store/telefono';
import { useBozza } from '../store/bozza';
import {
  MASSIMO_CARATTERI_AZIONE,
  cambiaBozza,
  inviaAzione,
  ritiraAzione,
} from './sessione';
import { azioneViva, etichettaInvio, finestraAperta, possoScrivere } from './vista';
import { MiaAzione } from './MiaAzione';

export function CasellaAzione({ stato }: { stato: StatoTavolo }) {
  const idPg = useTelefono((s) => s.idPg);
  const miaAzione = useTelefono((s) => s.miaAzione);
  const occupato = useTelefono((s) => s.occupato);
  const errore = useTelefono((s) => s.errore);
  const bozza = useBozza((s) => s.testo);
  const privata = useBozza((s) => s.privata);
  const impostaPrivata = useBozza((s) => s.impostaPrivata);
  const richiesteFuoco = useBozza((s) => s.richiesteFuoco);

  const casella = useRef<HTMLTextAreaElement>(null);

  // «Cambio» / «Riscrivi»: cursore in fondo al testo della casella.
  useEffect(() => {
    if (richiesteFuoco === 0) return;
    const el = casella.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.scrollIntoView({ block: 'nearest' });
  }, [richiesteFuoco]);

  const scrivibile = possoScrivere(stato, idPg);
  const viva = azioneViva(miaAzione) ? miaAzione : null;

  const pulita = bozza.trim();
  // Si può (ri)inviare se c'è testo e qualcosa cambia rispetto all'azione viva (testo o «privata»).
  const cambiata = !viva || pulita !== viva.testo.trim() || privata !== viva.privata;
  const puoInviare = scrivibile && !occupato && pulita.length > 0 && cambiata;

  const invia = (evento?: FormEvent) => {
    evento?.preventDefault();
    if (puoInviare) void inviaAzione();
  };

  // Ctrl/Cmd+Invio invia (comodo con la tastiera fisica); Invio semplice va a capo.
  const suTasto = (evento: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.key === 'Enter' && (evento.metaKey || evento.ctrlKey)) invia();
  };

  const segnaposto = finestraAperta(stato) ? t('telefono.casella.segnaposto_aperta') : t('telefono.casella.segnaposto_chiusa');

  return (
    <form onSubmit={invia} className="flex flex-col gap-2" aria-label={t('telefono.casella.aria')}>
      {miaAzione && <MiaAzione azione={miaAzione} stato={stato} />}

      {!scrivibile && (
        <p className="py-1 text-center text-[0.95rem] text-cenere" data-testid="casella-chiusa">
          {stato.fase === 'fermata'
            ? t('telefono.casella.fermata')
            : t('telefono.casella.chiusa')}
        </p>
      )}

      {/* A scena non in corso i comandi restano nel DOM (testid stabili, `disabled`) ma nascosti. */}
      <div className={scrivibile ? 'contents' : 'hidden'}>
        <div
          className={clsx(
            'rounded-xl border bg-notte-2 transition-colors',
            'focus-within:border-candela focus-within:ring-2 focus-within:ring-candela/40',
            privata ? 'border-lago/70' : 'border-bordo-chiaro',
          )}
        >
          <label htmlFor="testo-azione" className="sr-only">
            {t('telefono.casella.campo')}
          </label>
          <textarea
            ref={casella}
            id="testo-azione"
            data-testid="testo-azione"
            value={bozza}
            onChange={(e) => cambiaBozza(e.target.value)}
            onKeyDown={suTasto}
            maxLength={MASSIMO_CARATTERI_AZIONE}
            disabled={!scrivibile}
            rows={3}
            enterKeyHint="send"
            placeholder={segnaposto}
            className="block w-full resize-none rounded-t-xl bg-transparent px-4 pt-3 pb-1 text-[1.0625rem] leading-snug text-pergamena placeholder:text-cenere focus:outline-none"
          />
          <div className="flex items-center gap-2 pr-3 pl-1">
            <button
              type="button"
              role="switch"
              aria-checked={privata}
              data-testid="azione-privata"
              disabled={!scrivibile}
              onClick={() => impostaPrivata(!privata)}
              className={clsx(
                'flex min-h-11 items-center gap-2 rounded-lg px-2 text-[0.95rem] font-semibold',
                privata ? 'text-lago' : 'text-cenere',
              )}
            >
              <span
                aria-hidden
                className={clsx(
                  'relative inline-block h-5 w-9 rounded-full transition-colors',
                  privata ? 'bg-lago' : 'bg-notte-4',
                )}
              >
                <span
                  className={clsx(
                    'absolute top-0.5 size-4 rounded-full bg-pergamena transition-[left]',
                    privata ? 'left-[1.125rem]' : 'left-0.5',
                  )}
                />
              </span>
              {t('telefono.casella.privata')}
            </button>
            <span className="min-w-0 flex-1 truncate text-xs text-cenere">{t('telefono.casella.solo_master')}</span>
            <span
              className={clsx(
                'shrink-0 text-xs tabular-nums',
                bozza.length > MASSIMO_CARATTERI_AZIONE * 0.9 ? 'text-brace' : 'text-cenere',
              )}
              aria-hidden
            >
              {bozza.length}/{MASSIMO_CARATTERI_AZIONE}
            </span>
          </div>
        </div>

        {errore && (
          <p role="alert" data-testid="errore-azione" className="rounded-lg bg-sangue/10 px-3 py-2 text-[0.95rem] text-sangue">
            {errore}
          </p>
        )}

        {/* Solo due pulsanti, su una riga: il pannello resta basso e la trascrizione respira. */}
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <button
            type="button"
            data-testid="ritira-azione"
            disabled={!scrivibile || !viva || occupato}
            onClick={() => void ritiraAzione()}
            className="min-h-13 rounded-xl border border-bordo-chiaro px-2 font-semibold text-pergamena-2 transition active:scale-[0.98] disabled:opacity-40"
          >
            {t('telefono.casella.ritira')}
          </button>
          <button
            type="submit"
            data-testid="invia-azione"
            disabled={!puoInviare}
            className="min-h-13 rounded-xl bg-candela px-2 text-lg leading-tight font-bold text-notte transition active:scale-[0.98] disabled:bg-notte-4 disabled:text-cenere"
          >
            {etichettaInvio(miaAzione, bozza)}
          </button>
        </div>
      </div>

      {/* Errori anche a scena ferma (es. un invio arrivato tardi). */}
      {!scrivibile && errore && (
        <p role="alert" className="rounded-lg bg-sangue/10 px-3 py-2 text-[0.95rem] text-sangue">
          {errore}
        </p>
      )}
    </form>
  );
}
