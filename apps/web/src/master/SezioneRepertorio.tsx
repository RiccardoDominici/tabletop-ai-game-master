/**
 * Repertorio delle battute (solo modalità B): battute già uscite (usi/max_usi), disponibili adesso
 * (id · chi · tipo · quando), quante non lo sono e gli indizi già rivelati. Liste pieghevoli
 * (<details>): le disponibili aperte, il resto chiuso, per non occupare il pannello.
 */
import type { ReactNode } from 'react';
import type { BattutaMaster, RepertorioMaster } from '@cantastorie/shared';
import { Riquadro, Vuoto } from './Riquadro';

export function SezioneRepertorio({ repertorio }: { repertorio: RepertorioMaster }) {
  const { usate, disponibili, non_disponibili: nonDisponibili, indizi_rivelati: indizi } = repertorio;
  return (
    <Riquadro titolo="Repertorio" conteggio={`${disponibili.length} disponibili`} data-testid="master-repertorio">
      <Piega titolo="Disponibili adesso" numero={disponibili.length} aperta testid="master-repertorio-disponibili">
        {disponibili.length === 0 ? <Vuoto>Nessuna battuta disponibile adesso.</Vuoto> : <ListaBattute battute={disponibili} />}
      </Piega>
      <Piega titolo="Già uscite" numero={usate.length} testid="master-repertorio-usate">
        {usate.length === 0 ? <Vuoto>Nessuna battuta ancora uscita.</Vuoto> : <ListaBattute battute={usate} />}
      </Piega>
      <Piega titolo="Indizi rivelati" numero={indizi.length} testid="master-repertorio-indizi">
        {indizi.length === 0 ? (
          <Vuoto>Nessun indizio rivelato.</Vuoto>
        ) : (
          <ul className="flex flex-wrap gap-1">
            {indizi.map((id) => (
              <li key={id} className="rounded border border-muschio/50 px-1.5 py-px font-mono text-xs text-muschio">
                {id}
              </li>
            ))}
          </ul>
        )}
      </Piega>
      <p className="text-sm text-cenere">
        Non disponibili adesso: <strong className="text-pergamena-2 tabular-nums">{nonDisponibili}</strong>{' '}
        <span className="text-xs">(condizioni false, esaurite o di un’altra scena)</span>
      </p>
    </Riquadro>
  );
}

function Piega({
  titolo,
  numero,
  aperta = false,
  testid,
  children,
}: {
  titolo: string;
  numero: number;
  aperta?: boolean;
  testid: string;
  children: ReactNode;
}) {
  return (
    <details open={aperta} data-testid={testid} className="group rounded-lg border border-bordo bg-notte-3/40 px-2.5 py-1.5">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold select-none">
        <span className="text-cenere transition-transform group-open:rotate-90" aria-hidden>
          ▸
        </span>
        {titolo}
        <span className="text-cenere tabular-nums">{numero}</span>
      </summary>
      <div className="mt-1.5 max-h-64 overflow-y-auto pr-1">{children}</div>
    </details>
  );
}

function ListaBattute({ battute }: { battute: BattutaMaster[] }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {battute.map((b) => (
        <li key={b.id} data-testid={`master-battuta-${b.id}`} className="flex items-baseline gap-2 leading-snug">
          <span className="min-w-0 flex-1">
            <span className="font-mono text-xs text-candela-2">{b.id}</span>
            <span className="text-cenere"> · </span>
            <strong className="font-semibold">{b.chi}</strong>
            <span className="text-cenere"> · {b.tipo} · </span>
            <span className="text-pergamena-2">{b.quando}</span>
            {b.scena && <span className="text-xs text-cenere"> · scena {b.scena}</span>}
          </span>
          <span className="shrink-0 text-xs text-cenere tabular-nums" title="usi / massimo">
            {b.usi}/{b.max_usi}
          </span>
        </li>
      ))}
    </ul>
  );
}
