/**
 * «Qui con voi» (richiesta 2 del 9 novembre): i ritratti piccoli dei PNG presenti nella scena, da
 * toccare per rivolgersi a loro (il nome va all'inizio della casella, se è vuota), e la lista
 * «Altrove» dei PNG già incontrati ma non in scena, attenuati. Mai i PNG mai incontrati (lo decide
 * il server, niente spoiler).
 */
import clsx from 'clsx';
import type { PersonaggioScena, StatoTavolo } from '@cantastorie/shared';
import { useBozza } from '../store/bozza';
import { cambiaBozza } from './sessione';
import { altrove, apriConNome, presentiQui } from './presenzePersonaggi';
import { primoNome } from '../schermo/etichettaFase';

export function QuiConVoi({ stato }: { stato: StatoTavolo }) {
  const presenti = presentiQui(stato.scena.personaggi);
  const assenti = altrove(stato.scena.personaggi);
  if (presenti.length === 0 && assenti.length === 0) return null;

  const rivolgiti = (p: PersonaggioScena) => {
    // Lettura al momento del tocco (non dallo stato del render): la bozza può essere cambiata nel frattempo.
    const nuova = apriConNome(useBozza.getState().testo, p.nome);
    if (nuova !== null) cambiaBozza(nuova);
  };

  return (
    <section data-testid="qui-con-voi" aria-label="Personaggi della scena" className="flex flex-col gap-2 rounded-xl border border-bordo bg-notte-2/80 px-3 py-2">
      {presenti.length > 0 && (
        <div>
          <p className="text-xs tracking-[0.16em] text-cenere uppercase">Qui con voi</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {presenti.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  data-testid={`qui-con-voi-${p.id}`}
                  onClick={() => rivolgiti(p)}
                  aria-label={`Rivolgiti a ${p.nome}`}
                  className="flex min-h-11 w-[4.25rem] flex-col items-center gap-0.5 rounded-lg active:bg-notte-3"
                >
                  <Avatar personaggio={p} className="size-12 ring-2 ring-candela/70" />
                  <span className="w-full truncate text-center text-xs text-pergamena">{primoNome(p.nome)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {assenti.length > 0 && (
        <div data-testid="altrove" className="opacity-60">
          <p className="text-xs tracking-[0.16em] text-cenere uppercase">Altrove</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {assenti.map((p) => (
              <li key={p.id} data-testid={`altrove-${p.id}`} className="flex items-center gap-1.5 text-sm text-cenere">
                <Avatar personaggio={p} className="size-7 grayscale" />
                <span>{p.nome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Ritratto rotondo, o l'iniziale se manca. */
function Avatar({ personaggio, className }: { personaggio: PersonaggioScena; className: string }) {
  return (
    <span className={clsx('flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-notte-3', className)} aria-hidden>
      {personaggio.ritratto ? (
        <img src={personaggio.ritratto} alt="" draggable={false} className="size-full object-cover" />
      ) : (
        <span className="font-titolo text-lg font-semibold text-pergamena">{personaggio.nome.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
