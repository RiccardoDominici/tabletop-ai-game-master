/**
 * Telefoni ricordati e il loro PG: in una campagna a più sessioni i telefoni ritrovano il PG della
 * sessione prima, ma il master deve poterlo cambiare (un giocatore che non viene, uno nuovo che
 * entra). Il cambio vale dal prossimo collegamento di quel telefono; «Dimentica» gli fa scegliere di
 * nuovo il PG.
 */
import type { PgPubblico, SessioneMaster } from '@cantastorie/shared';
import { useInCorso } from '../store/master';
import { abbreviaDispositivo } from './pacchetti';
import { inviaComando } from './sessione';
import { classePulsante } from './stili';

export function TelefoniRicordati({ telefoni, pg }: { telefoni: NonNullable<SessioneMaster['telefoni']>; pg: PgPubblico[] }) {
  const inCorso = useInCorso('dispositivo');
  if (telefoni.length === 0) return null;
  return (
    <div data-testid="master-telefoni" className="flex flex-col gap-1">
      <p className="text-xs text-cenere">Telefoni ricordati (un cambio vale dal prossimo collegamento del telefono)</p>
      <ul className="flex flex-col gap-1">
        {telefoni.map((t) => (
          <li key={t.dispositivo} data-testid="master-telefono" data-dispositivo={t.dispositivo} className="flex items-center gap-2 text-sm">
            <span className={t.collegato ? 'text-muschio' : 'text-cenere'} title={t.collegato ? 'collegato' : 'non collegato'}>
              {t.collegato ? '●' : '○'}
            </span>
            <span className="font-mono text-xs text-pergamena-2" title={t.dispositivo}>
              {abbreviaDispositivo(t.dispositivo)}
            </span>
            <select
              aria-label={`PG del telefono ${abbreviaDispositivo(t.dispositivo)}`}
              data-testid="master-telefono-pg"
              value={t.id_pg}
              disabled={inCorso}
              onChange={(e) => void inviaComando({ tipo: 'dispositivo', dispositivo: t.dispositivo, id_pg: e.target.value }, 'PG del telefono')}
              className="rounded border border-bordo-chiaro bg-notte-3 px-1 py-0.5 text-sm text-pergamena"
            >
              {pg.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-testid="master-telefono-dimentica"
              disabled={inCorso}
              onClick={() => void inviaComando({ tipo: 'dispositivo', dispositivo: t.dispositivo, id_pg: null }, 'Dimentica il telefono')}
              className={classePulsante('tenue', 'piccolo')}
            >
              Dimentica
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
