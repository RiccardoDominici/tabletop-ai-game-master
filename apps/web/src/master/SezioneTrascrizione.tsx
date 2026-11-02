/**
 * Trascrizione pubblica (tavolo.trascrizione): le righe più nuove in fondo, scorrimento automatico
 * solo se il master non è risalito a rileggere (useSegueFondo). Narratore, PNG, azioni e sistema
 * hanno stili diversi; tra un turno e l'altro c'è un separatore.
 */
import clsx from 'clsx';
import type { VoceTrascrizione } from '@cantastorie/shared';
import { virgolettato } from '../lib/formato';
import { Riquadro } from './Riquadro';
import { useSegueFondo } from './useSegueFondo';
import { etichettaTurno } from './etichette';

export function SezioneTrascrizione({ voci, className }: { voci: VoceTrascrizione[]; className?: string }) {
  const ultima = voci[voci.length - 1]?.id ?? null;
  const { ref, suScorrimento, nuove, vaiInFondo } = useSegueFondo<HTMLDivElement>(ultima);

  return (
    <Riquadro titolo="Trascrizione" conteggio={voci.length} className={className} classeCorpo="relative flex-1">
      <div
        ref={ref}
        onScroll={suScorrimento}
        data-testid="master-trascrizione"
        role="log"
        aria-label="Trascrizione pubblica della scena"
        className="h-full min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
      >
        {voci.length === 0 ? (
          <p className="py-6 text-center text-sm text-cenere italic">Ancora niente: la scena non è cominciata.</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {voci.map((voce, i) => {
              const precedente = voci[i - 1];
              const cambioTurno = precedente === undefined || precedente.turno !== voce.turno;
              return (
                <li key={voce.id}>
                  {cambioTurno && <Separatore turno={voce.turno} />}
                  <Riga voce={voce} />
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {nuove && (
        <button
          type="button"
          onClick={vaiInFondo}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-candela px-4 py-1 text-sm font-bold text-notte shadow-profonda"
        >
          ↓ Nuove righe
        </button>
      )}
    </Riquadro>
  );
}

function Separatore({ turno }: { turno: number }) {
  return (
    <div className="my-1 flex items-center gap-2 text-[0.65rem] tracking-[0.2em] text-cenere uppercase" aria-hidden>
      <span className="h-px flex-1 bg-bordo" />
      {etichettaTurno(turno)}
      <span className="h-px flex-1 bg-bordo" />
    </div>
  );
}

/** Una voce: narratore in serif, PNG con barra brace e caporali, azioni in riquadro, sistema in grigio. */
function Riga({ voce }: { voce: VoceTrascrizione }) {
  const base = 'text-[0.95rem] leading-snug';
  switch (voce.tipo) {
    case 'narrazione':
      return (
        <p data-tipo="narrazione" className={clsx(base, 'font-racconto text-pergamena')}>
          <strong className="font-sans font-bold text-pergamena-2">{voce.nome}</strong> {voce.testo}
        </p>
      );
    case 'battuta':
      return (
        <p data-tipo="battuta" className={clsx(base, 'border-l-2 border-brace/70 pl-2 font-racconto')}>
          <strong className="font-sans font-bold text-brace">{voce.nome}</strong>{' '}
          <span className="italic text-pergamena">{virgolettato(voce.testo)}</span>
        </p>
      );
    case 'azione':
      return (
        <p data-tipo="azione" className={clsx(base, 'ml-4 rounded-md border border-candela/30 bg-notte-3 px-2.5 py-1')}>
          <strong className="font-bold text-candela">{voce.nome}</strong> <span className="text-pergamena">{voce.testo}</span>
        </p>
      );
    case 'sistema':
      return (
        <p data-tipo="sistema" className="text-center text-xs text-cenere italic">
          <strong className="font-semibold">{voce.nome}:</strong> {voce.testo}
        </p>
      );
  }
}
