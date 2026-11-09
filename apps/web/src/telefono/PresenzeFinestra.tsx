/**
 * Chi è chiamato nella finestra corrente: per ogni PG invitato, se ha già inviato (inviare = ha
 * finito) o se ci sta ancora pensando. Sta dentro il banner di stato (riga di chip piccoli) per non
 * rubare altezza al pannello dell'azione. I testi delle azioni sono in «Al tavolo».
 */
import clsx from 'clsx';
import type { StatoTavolo } from '@cantastorie/shared';

export function PresenzeFinestra({ stato, idPg }: { stato: StatoTavolo; idPg: string | null }) {
  const { finestra } = stato;
  if (!finestra.aperta) return null;

  const tutti = finestra.invitati.includes('tutti');
  const invitati = tutti ? stato.pg.map((p) => p.id) : finestra.invitati;
  if (invitati.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Personaggi chiamati ad agire">
      {invitati.map((id) => {
        const pg = stato.pg.find((p) => p.id === id);
        const azione = finestra.azioni.find((a) => a.id_pg === id);
        const scritta = azione?.scritta ?? false;
        const nome = pg?.nome.split(' ')[0] ?? id;
        return (
          <li
            key={id}
            data-testid={`presenza-${id}`}
            data-scritta={scritta}
            className={clsx(
              'flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm',
              scritta ? 'border-muschio/60 bg-muschio/15 text-muschio' : 'border-bordo bg-notte-3 text-pergamena-2',
            )}
          >
            <span className="font-semibold">
              {nome}
              {id === idPg && <span className="font-normal opacity-75"> (tu)</span>}
            </span>
            {/* Segni brevi (la riga deve stare su una linea); la parola intera va ai lettori di schermo. */}
            <span aria-label={scritta ? 'ha inviato' : 'sta pensando'}>{scritta ? '✓' : '…'}</span>
          </li>
        );
      })}
    </ul>
  );
}
