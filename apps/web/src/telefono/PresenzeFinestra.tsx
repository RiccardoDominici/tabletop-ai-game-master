/**
 * Chi è chiamato nella finestra corrente: per ogni PG invitato, se ha scritto e se è pronto.
 * Il testo delle azioni altrui resta privato (il server manda solo il riepilogo).
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
    <ul className="flex flex-wrap gap-2" aria-label="Personaggi chiamati ad agire">
      {invitati.map((id) => {
        const pg = stato.pg.find((p) => p.id === id);
        const azione = finestra.azioni.find((a) => a.id_pg === id);
        const pronto = azione?.pronto ?? false;
        const scritta = azione?.scritta ?? false;
        const nome = pg?.nome.split(' ')[0] ?? id;
        return (
          <li
            key={id}
            data-testid={`presenza-${id}`}
            data-pronto={pronto}
            data-scritta={scritta}
            className={clsx(
              'flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-[0.95rem]',
              pronto ? 'border-muschio/60 bg-muschio/15 text-muschio' : 'border-bordo bg-notte-3 text-pergamena-2',
            )}
          >
            <span className="font-semibold">
              {nome}
              {id === idPg && <span className="font-normal opacity-75"> (tu)</span>}
            </span>
            <span aria-hidden>·</span>
            <span>{pronto ? (scritta ? 'pronto ✓' : 'passa ✓') : scritta ? 'ha scritto ✎' : 'pensa…'}</span>
          </li>
        );
      })}
    </ul>
  );
}
