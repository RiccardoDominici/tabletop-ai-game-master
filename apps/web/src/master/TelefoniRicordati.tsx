/**
 * Telefoni ricordati e il loro PG: in una campagna a più sessioni i telefoni ritrovano il PG della
 * sessione prima, ma il master deve poterlo cambiare (un giocatore che non viene, uno nuovo che
 * entra). Il cambio vale dal prossimo collegamento di quel telefono; «Dimentica» gli fa scegliere di
 * nuovo il PG.
 */
import type { PgPubblico, SessioneMaster } from '@tabletop-ai-gm/shared';
import { useInCorso } from '../store/master';
import { abbreviaDispositivo } from './pacchetti';
import { inviaComando } from './sessione';
import { classePulsante } from './stili';
import { t } from '../lingua';

export function TelefoniRicordati({ telefoni, pg }: { telefoni: NonNullable<SessioneMaster['telefoni']>; pg: PgPubblico[] }) {
  const inCorso = useInCorso('dispositivo');
  if (telefoni.length === 0) return null;
  return (
    <div data-testid="master-telefoni" className="flex flex-col gap-1">
      <p className="text-xs text-cenere">{t('master.telefoni.titolo')}</p>
      <ul className="flex flex-col gap-1">
        {telefoni.map((tel) => (
          <li key={tel.dispositivo} data-testid="master-telefono" data-dispositivo={tel.dispositivo} className="flex items-center gap-2 text-sm">
            <span className={tel.collegato ? 'text-muschio' : 'text-cenere'} title={tel.collegato ? t('master.stato.collegato') : t('master.stato.non_collegato')}>
              {tel.collegato ? '●' : '○'}
            </span>
            <span className="font-mono text-xs text-pergamena-2" title={tel.dispositivo}>
              {abbreviaDispositivo(tel.dispositivo)}
            </span>
            <select
              aria-label={t('master.telefoni.pg_aria', { telefono: abbreviaDispositivo(tel.dispositivo) })}
              data-testid="master-telefono-pg"
              value={tel.id_pg}
              disabled={inCorso}
              onChange={(e) => void inviaComando({ tipo: 'dispositivo', dispositivo: tel.dispositivo, id_pg: e.target.value }, t('master.telefoni.descr'))}
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
              onClick={() => void inviaComando({ tipo: 'dispositivo', dispositivo: tel.dispositivo, id_pg: null }, t('master.telefoni.descr_dimentica'))}
              className={classePulsante('tenue', 'piccolo')}
            >
              {t('master.telefoni.dimentica')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
