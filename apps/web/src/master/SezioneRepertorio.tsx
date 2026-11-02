/**
 * Repertorio delle battute (solo modalità B): battute già uscite (usi/max_usi), disponibili adesso
 * (id · chi · tipo · quando), quante non lo sono e gli indizi già rivelati. Liste pieghevoli
 * (<details>): le disponibili aperte, il resto chiuso, per non occupare il pannello.
 * Senza spoiler: delle disponibili solo quante per chi parla; delle uscite niente id e tipo neutro.
 */
import type { ReactNode } from 'react';
import type { BattutaMaster, RepertorioMaster } from '@cantastorie/shared';
import { Riquadro, Vuoto } from './Riquadro';
import { useSenzaSpoiler } from '../store/master';
import { contaPerParlante, tipoBattuta } from './spoiler';

export function SezioneRepertorio({ repertorio }: { repertorio: RepertorioMaster }) {
  const { usate, disponibili, non_disponibili: nonDisponibili, indizi_rivelati: indizi } = repertorio;
  const senzaSpoiler = useSenzaSpoiler();
  return (
    <Riquadro titolo="Repertorio" conteggio={`${disponibili.length} disponibili`} data-testid="master-repertorio">
      <Piega titolo="Disponibili adesso" numero={disponibili.length} aperta testid="master-repertorio-disponibili">
        {disponibili.length === 0 ? (
          <Vuoto>Nessuna battuta disponibile adesso.</Vuoto>
        ) : senzaSpoiler ? (
          <ContiPerParlante battute={disponibili} />
        ) : (
          <ListaBattute battute={disponibili} senzaSpoiler={false} />
        )}
      </Piega>
      <Piega titolo="Già uscite" numero={usate.length} testid="master-repertorio-usate">
        {usate.length === 0 ? <Vuoto>Nessuna battuta ancora uscita.</Vuoto> : <ListaBattute battute={usate} senzaSpoiler={senzaSpoiler} />}
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

/** Senza spoiler: delle battute non uscite si dice solo quante ce ne sono per chi parla. */
function ContiPerParlante({ battute }: { battute: BattutaMaster[] }) {
  return (
    <ul data-testid="master-repertorio-conti" className="flex flex-wrap gap-1.5 text-sm">
      {contaPerParlante(battute).map(({ chi, quante }) => (
        <li key={chi} className="rounded border border-bordo px-1.5 py-px">
          <strong className="font-semibold">{chi}</strong> <span className="text-cenere tabular-nums">{quante}</span>
        </li>
      ))}
    </ul>
  );
}

function ListaBattute({ battute, senzaSpoiler }: { battute: BattutaMaster[]; senzaSpoiler: boolean }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {battute.map((b) => (
        <li key={b.id} data-testid={`master-battuta-${b.id}`} className="flex items-baseline gap-2 leading-snug">
          <span className="min-w-0 flex-1">
            {!senzaSpoiler && (
              <>
                <span className="font-mono text-xs text-candela-2">{b.id}</span>
                <span className="text-cenere"> · </span>
              </>
            )}
            <strong className="font-semibold">{b.chi}</strong>
            <span className="text-cenere"> · {tipoBattuta(b.tipo, senzaSpoiler)} · </span>
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
