/**
 * Scelta del personaggio: una carta grande per PG (tutta toccabile), con un'etichetta se un altro
 * telefono l'ha già preso. Scegliere un PG già preso è permesso (il server conta i telefoni):
 * l'etichetta serve solo a evitare doppioni per sbaglio.
 */
import clsx from 'clsx';
import type { StatoTavolo } from '@cantastorie/shared';
import { useTelefono } from '../store/telefono';
import { scegliPg } from './sessione';

export function SceltaPersonaggio({ stato }: { stato: StatoTavolo }) {
  const idPg = useTelefono((s) => s.idPg);
  const confermato = useTelefono((s) => s.confermato);
  const sceltaAperta = useTelefono((s) => s.sceltaAperta);
  const occupato = useTelefono((s) => s.occupato);
  const errore = useTelefono((s) => s.errore);
  const apriScelta = useTelefono((s) => s.apriScelta);

  return (
    <main className="sicuro-basso sicuro-lati mx-auto flex min-h-full max-w-lg flex-col gap-5 pt-3">
      <header className="pt-2">
        <p className="text-sm tracking-[0.2em] text-candela uppercase">Tabletop AI Game Master</p>
        <h1 className="mt-1 font-titolo text-[1.75rem] leading-tight font-semibold">Scegli il tuo personaggio</h1>
        <p className="mt-2 text-pergamena-2">
          Scena: <span className="font-racconto italic">{stato.scena.titolo}</span>
        </p>
      </header>

      {stato.pg.length === 0 ? (
        <p className="rounded-carta border border-bordo bg-notte-2 p-5 text-pergamena-2">
          Nessun personaggio in questa scena: chiedi al master di caricarla.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {stato.pg.map((pg) => {
            const mio = confermato && pg.id === idPg;
            const presoDaAltri = pg.telefoni - (mio ? 1 : 0) > 0;
            return (
              <li key={pg.id}>
                <button
                  type="button"
                  data-testid={`scelta-pg-${pg.id}`}
                  disabled={occupato}
                  onClick={() => void scegliPg(pg.id)}
                  className={clsx(
                    'flex min-h-20 w-full flex-col gap-1 rounded-carta border px-5 py-4 text-left transition',
                    'active:scale-[0.99] disabled:opacity-60',
                    mio
                      ? 'border-candela bg-notte-3 shadow-candela'
                      : 'border-bordo bg-notte-2 hover:border-bordo-chiaro hover:bg-notte-3',
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-titolo text-xl font-semibold text-pergamena">{pg.nome}</span>
                    {mio ? (
                      <Etichetta tono="candela">il tuo</Etichetta>
                    ) : presoDaAltri ? (
                      <Etichetta tono="cenere">già scelto</Etichetta>
                    ) : null}
                  </span>
                  {pg.descrizione && <span className="text-pergamena-2">{pg.descrizione}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {errore && (
        <p role="alert" className="rounded-xl border border-sangue/50 bg-sangue/10 px-4 py-3 text-sangue">
          {errore}
        </p>
      )}

      {sceltaAperta && confermato && (
        <button
          type="button"
          onClick={() => apriScelta(false)}
          className="min-h-12 self-center rounded-full px-6 text-pergamena-2 underline underline-offset-4"
        >
          Annulla, resto con il mio personaggio
        </button>
      )}

      <p className="mt-auto text-center text-sm text-cenere">
        La scelta resta salvata su questo telefono: puoi cambiarla in qualsiasi momento.
      </p>
    </main>
  );
}

function Etichetta({ tono, children }: { tono: 'candela' | 'cenere'; children: string }) {
  return (
    <span
      className={clsx(
        'shrink-0 rounded-full px-3 py-1 text-sm font-semibold',
        tono === 'candela' ? 'bg-candela text-notte' : 'border border-bordo-chiaro text-pergamena-2',
      )}
    >
      {children}
    </span>
  );
}
