/**
 * Intestazione del pannello: titolo della scena, fase, turno, pausa, narrazione in corso, motore
 * voce, schermo e modalità; a destra i comandi principali; sotto, l'ultimo errore.
 */
import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { StatoMaster } from '@cantastorie/shared';
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
          <p className="text-[0.7rem] tracking-[0.3em] text-candela/90 uppercase">Cantastorie · Pannello master</p>
          <h1 data-testid="master-titolo" className="truncate font-titolo text-xl leading-tight font-semibold" title={tavolo.scena.titolo}>
            {tavolo.scena.titolo}
          </h1>
        </div>

        <dl className="flex flex-wrap items-end gap-x-4 gap-y-1.5">
          <Dato etichetta="Fase">
            <span data-testid="master-fase" data-fase={tavolo.fase}>
              <Chip tono={TONO_FASE[tavolo.fase]} className="text-sm">
                {ETICHETTA_FASE_MASTER[tavolo.fase]}
              </Chip>
            </span>
          </Dato>
          <Dato etichetta="Turno">
            <span data-testid="master-turno" className="font-semibold tabular-nums">
              {etichettaTurno(tavolo.turno)}
            </span>
          </Dato>
          <Dato etichetta="Pausa">
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
          <Dato etichetta="Narratore">
            <span
              data-testid="master-narrazione"
              data-in-corso={String(stato.narrazione_in_corso)}
              className={clsx('inline-flex items-center gap-1.5 text-sm font-semibold', stato.narrazione_in_corso ? 'text-brace' : 'text-cenere')}
            >
              <span
                aria-hidden
                className={clsx('inline-block size-2 rounded-full', stato.narrazione_in_corso ? 'animate-pulse bg-brace' : 'bg-cenere/50')}
              />
              {stato.narrazione_in_corso ? 'narrazione in corso' : 'in silenzio'}
            </span>
          </Dato>
          <Dato etichetta="Voce">
            <span data-testid="master-voce" className="text-sm">
              {etichettaVoce(tavolo.voce_motore)}
            </span>
          </Dato>
          <Dato etichetta="Schermo">
            <span className={clsx('text-sm', tavolo.schermo_connesso ? 'text-muschio' : 'text-sangue')}>
              {tavolo.schermo_connesso ? 'collegato' : 'non collegato'}
            </span>
          </Dato>
          <Dato etichetta="Modalità">
            <span className="text-sm">{etichettaModo(stato.modo)}</span>
          </Dato>
          <Dato etichetta="Spoiler">
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
