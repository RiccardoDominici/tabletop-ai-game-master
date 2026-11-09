/**
 * Fila dei ritratti dei PNG presenti nella scena, sotto il titolo del proiettore (richiesta 2 del
 * 9 novembre): da 3 m si deve capire con chi si può parlare. Ogni ritratto è rotondo, almeno 128 px
 * su un 1920, con il nome sotto. Chi parla adesso ha un anello dorato e una scala più grande.
 * Gli assenti (già incontrati e altrove) non si mostrano qui: restano sul telefono.
 *
 * Senza ritratto (o se non si carica) il cerchio mostra l'iniziale: mai un'immagine rotta a schermo.
 */
import { useState } from 'react';
import clsx from 'clsx';
import type { PersonaggioScena } from '@cantastorie/shared';
import { primoNome } from './etichettaFase';

export function FilaPersonaggi({ personaggi, parlante }: { personaggi: readonly PersonaggioScena[] | undefined; parlante: string | null }) {
  const presenti = (personaggi ?? []).filter((p) => p.presente);
  if (presenti.length === 0) return null;
  return (
    <ul data-testid="fila-personaggi" aria-label="Chi c'è in scena" className="flex flex-wrap items-start gap-[2vw]">
      {presenti.map((p) => (
        <li key={p.id} data-testid={`personaggio-${p.id}`} data-parla={String(p.id === parlante)} className="flex w-[max(9vw,11rem)] flex-col items-center gap-[1vh]">
          <Ritratto personaggio={p} parla={p.id === parlante} />
          <span
            className={clsx(
              'max-w-full truncate font-titolo text-[1.5vw] leading-none font-semibold [text-shadow:0_0_2px_rgb(0_0_0),0_2px_8px_rgb(0_0_0/0.95)]',
              p.id === parlante ? 'text-[#ff9a6b]' : 'text-pergamena',
            )}
          >
            {primoNome(p.nome)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Ritratto rotondo; chi parla ha l'anello e un leggero ingrandimento (solo d'opacità e scala). */
function Ritratto({ personaggio, parla }: { personaggio: PersonaggioScena; parla: boolean }) {
  const [rotto, setRotto] = useState(false);
  const mostra = personaggio.ritratto && !rotto;
  return (
    <div
      className={clsx(
        'flex size-[max(9vw,11rem)] items-center justify-center overflow-hidden rounded-full bg-notte-3 transition-transform duration-300',
        parla
          ? 'scale-110 ring-[0.6vw] ring-[#ff9a6b] shadow-[0_0_3vw_rgb(255_154_107/0.7),0_1vh_3vh_rgb(0_0_0/0.8)]'
          : 'ring-[0.3vw] ring-[#e8c98a]/70 shadow-[0_1vh_3vh_rgb(0_0_0/0.8)] opacity-90',
      )}
    >
      {mostra ? (
        <img
          src={personaggio.ritratto!}
          alt={`Ritratto di ${personaggio.nome}`}
          draggable={false}
          onError={() => setRotto(true)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden className="font-titolo text-[4.5vw] font-semibold text-pergamena">
          {personaggio.nome.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
