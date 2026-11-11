/**
 * Intestazione del pannello: titolo della scena, fase, turno, pausa, narrazione in corso, motore
 * voce, schermo e modalità; a destra i comandi principali; sotto, l'ultimo errore.
 */
import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { StatoMaster } from '@tabletop-ai-gm/shared';
import { t } from '../lingua';
import { Chip } from './Chip';
import { ComandiPrincipali, UltimoErrore } from './ComandiPrincipali';
import { InterruttoreSpoiler } from './InterruttoreSpoiler';
import {
  ETICHETTA_FASE_MASTER,
  etichettaModo,
  etichettaPausa,
  etichettaTurno,
  etichettaVoce,
  TONO_FASE,
  tonoPausa,
} from './etichette';

export function Intestazione({ stato }: { stato: StatoMaster }) {
  const { tavolo, pausa } = stato;
  return (
    <header className="shrink-0 border-b border-bordo bg-notte-2/95 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="min-w-0 max-w-[28rem]">
          <p className="text-[0.7rem] tracking-[0.3em] text-candela/90 uppercase">{t('master.intestazione.sottotitolo')}</p>
          <h1 data-testid="master-titolo" className="truncate font-titolo text-xl leading-tight font-semibold" title={tavolo.scena.titolo}>
            {tavolo.scena.titolo}
          </h1>
        </div>

        <dl className="flex flex-wrap items-end gap-x-4 gap-y-1.5">
          <Dato etichetta={t('master.dato.fase')}>
            <span data-testid="master-fase" data-fase={tavolo.fase}>
              <Chip tono={TONO_FASE[tavolo.fase]} className="text-sm">
                {ETICHETTA_FASE_MASTER[tavolo.fase]}
              </Chip>
            </span>
          </Dato>
          <Dato etichetta={t('master.dato.turno')}>
            <span data-testid="master-turno" className="font-semibold tabular-nums">
              {etichettaTurno(tavolo.turno)}
            </span>
          </Dato>
          <Dato etichetta={t('master.dato.pausa')}>
            <span
              data-testid="master-stato-pausa"
              data-richiesta={String(pausa.richiesta)}
              data-attiva={String(pausa.attiva)}
            >
              <Chip tono={tonoPausa(pausa)} className="text-sm">
                {etichettaPausa(pausa)}
              </Chip>
            </span>
          </Dato>
          <Dato etichetta={t('master.dato.narratore')}>
            <span
              data-testid="master-narrazione"
              data-in-corso={String(stato.narrazione_in_corso)}
              className={clsx('inline-flex items-center gap-1.5 text-sm font-semibold', stato.narrazione_in_corso ? 'text-brace' : 'text-cenere')}
            >
              <span
                aria-hidden
                className={clsx('inline-block size-2 rounded-full', stato.narrazione_in_corso ? 'animate-pulse bg-brace' : 'bg-cenere/50')}
              />
              {stato.narrazione_in_corso ? t('master.narrazione.in_corso') : t('master.narrazione.silenzio')}
            </span>
          </Dato>
          <Dato etichetta={t('master.dato.voce')}>
            <span data-testid="master-voce" className="text-sm">
              {etichettaVoce(tavolo.voce_motore)}
            </span>
          </Dato>
          <Dato etichetta={t('master.dato.schermo')}>
            <span className={clsx('text-sm', tavolo.schermo_connesso ? 'text-muschio' : 'text-sangue')}>
              {tavolo.schermo_connesso ? t('master.stato.collegato') : t('master.stato.non_collegato')}
            </span>
          </Dato>
          <Dato etichetta={t('master.dato.modalita')}>
            <span className="text-sm">{etichettaModo(stato.modo)}</span>
          </Dato>
          <Dato etichetta={t('master.dato.spoiler')}>
            <InterruttoreSpoiler />
          </Dato>
        </dl>

        <div className="ml-auto">
          <ComandiPrincipali stato={stato} />
        </div>
      </div>
      <div className="mt-2 empty:hidden">
        <UltimoErrore />
      </div>
    </header>
  );
}

/** Coppia etichetta/valore dell'intestazione. */
function Dato({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.65rem] tracking-[0.18em] text-cenere uppercase">{etichetta}</dt>
      <dd className="leading-tight">{children}</dd>
    </div>
  );
}
