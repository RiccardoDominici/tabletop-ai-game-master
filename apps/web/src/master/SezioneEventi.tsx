/**
 * Registro dei comandi del master (StatoMaster.eventi, il più recente per ultimo dal server): qui
 * si mostra il più recente IN ALTO, così l'ultimo comando si legge senza scorrere.
 */
import clsx from 'clsx';
import type { EventoMaster } from '@cantastorie/shared';
import { Riquadro, Vuoto } from './Riquadro';
import { Chip } from './Chip';
import { etichettaComando } from './comandi';
import { oraBreve } from './etichette';

export function SezioneEventi({ eventi, className }: { eventi: EventoMaster[]; className?: string }) {
  const recentiPrima = [...eventi].reverse();
  return (
    <Riquadro
      titolo="Registro"
      conteggio={eventi.length}
      data-testid="master-eventi"
      className={className}
      classeCorpo="overflow-y-auto pr-1"
    >
      {recentiPrima.length === 0 ? (
        <Vuoto>Nessun comando ancora.</Vuoto>
      ) : (
        <ol className="flex flex-col divide-y divide-bordo/60 text-sm">
          {recentiPrima.map((e, i) => (
            <li
              key={`${e.ts}-${eventi.length - i}`}
              data-testid="master-evento"
              data-comando={e.comando}
              data-ok={String(e.ok)}
              className="flex items-baseline gap-2 py-1"
            >
              <time className="shrink-0 text-xs text-cenere tabular-nums" dateTime={e.ts}>
                {oraBreve(e.ts)}
              </time>
              <span className="shrink-0 font-semibold">{etichettaComando(e.comando)}</span>
              {e.automatico && (
                <span data-testid="master-evento-automatico" title="Deciso dal Motore (narratore o battuta), non dal pannello">
                  <Chip tono="lago">auto</Chip>
                </span>
              )}
              <Chip tono={e.ok ? 'muschio' : 'sangue'}>{e.ok ? 'ok' : 'rifiutato'}</Chip>
              <span className={clsx('min-w-0 flex-1 break-words', e.ok ? 'text-pergamena-2' : 'text-sangue')}>{e.dettagli}</span>
            </li>
          ))}
        </ol>
      )}
    </Riquadro>
  );
}
