/**
 * Riquadro di una sezione del pannello: titolo inciso, conteggio facoltativo, pulsanti a destra
 * dell'intestazione, contenuto e, in fondo, l'esito dell'ultimo comando della sua zona.
 * Gli altri attributi (data-testid, data-*) vanno sulla <section>.
 */
import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import clsx from 'clsx';
import type { ZonaComando } from './comandi';
import { EsitoZona } from './EsitoZona';

interface PropsRiquadro extends Omit<ComponentPropsWithoutRef<'section'>, 'title'> {
  titolo: string;
  /** Numero accanto al titolo (es. quante azioni). */
  conteggio?: ReactNode;
  /** Pulsanti nell'intestazione, a destra. */
  azioni?: ReactNode;
  /** Zona dei comandi di questa sezione: se data, l'esito compare in fondo. */
  zona?: ZonaComando;
  /** Classi del contenitore del contenuto (es. per farlo scorrere). */
  classeCorpo?: string;
}

export function Riquadro({ titolo, conteggio, azioni, zona, className, classeCorpo, children, ...resto }: PropsRiquadro) {
  const idTitolo = useId();
  return (
    <section
      aria-labelledby={idTitolo}
      // Niente min-h-0 qui: nelle colonne che scorrono i riquadri non devono schiacciarsi (si
      // sovrapporrebbero). Chi vuole un riquadro che scorre dentro di sé passa altezza e min-h-0.
      className={clsx('flex flex-col gap-2 rounded-xl border border-bordo bg-notte-2/85 p-3 shadow-profonda', className)}
      {...resto}
    >
      <header className="flex min-h-7 shrink-0 items-center gap-2">
        <h2 id={idTitolo} className="font-titolo text-sm font-semibold tracking-[0.14em] text-candela uppercase">
          {titolo}
        </h2>
        {conteggio !== undefined && <span className="text-sm text-cenere tabular-nums">{conteggio}</span>}
        {azioni && <div className="ml-auto flex items-center gap-2">{azioni}</div>}
      </header>
      <div className={clsx('flex min-h-0 flex-col gap-2', classeCorpo)}>{children}</div>
      {zona && <EsitoZona zona={zona} className="shrink-0" />}
    </section>
  );
}

/** Riga vuota leggibile («Nessuna azione»). */
export function Vuoto({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-cenere italic">{children}</p>;
}

/** Sottotitolo dentro un riquadro. */
export function Sottotitolo({ children }: { children: ReactNode }) {
  return <h3 className="mt-1 text-xs font-semibold tracking-[0.16em] text-cenere uppercase">{children}</h3>;
}
