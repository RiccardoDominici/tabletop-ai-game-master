/**
 * Experience points in the Game Master panel (docs/prove.md §12): each PC's XP and level, the XP of the next level and
 * whether it is reached (the level-up is taken between sessions), the treasure found and not yet back to safety with
 * the button that marks it safe (when the set counts treasure XP then), an award form (to one PC or to the party, with
 * a reason), and this session's awards. The Engine counts everything (prove/esperienza.ts); the panel only asks.
 */
import { useState } from 'react';
import type { EsperienzaMaster as Vista } from '@tabletop-ai-gm/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { classePulsante } from './stili';
import { t } from '../lingua';

export function EsperienzaMaster({ esperienza }: { esperienza: Vista }) {
  const [px, setPx] = useState('');
  const [pg, setPg] = useState('');
  const [motivo, setMotivo] = useState('');
  const inCorso = useInCorso('esperienza');
  const n = Number(px);
  const valido = px.trim() !== '' && Number.isInteger(n) && n !== 0 && Math.abs(n) <= 1_000_000;
  const assegna = () => {
    void inviaComando({ tipo: 'esperienza', cosa: 'assegna', px: n, ...(pg ? { pg } : {}), ...(motivo.trim() ? { motivo: motivo.trim() } : {}) });
    setPx('');
    setMotivo('');
  };
  return (
    <div data-testid="master-esperienza" className="flex flex-col gap-1 rounded-lg border border-bordo bg-notte-3 p-2 text-sm">
      <p className="font-semibold text-pergamena">{t('master.esperienza.titolo')}</p>
      <ul className="flex flex-col gap-0.5">
        {esperienza.pg.map((x) => (
          <li key={x.id} data-testid={`master-esperienza-${x.id}`} className="text-xs text-pergamena-2">
            {t('master.esperienza.pg', { nome: x.nome, px: x.px, livello: x.livello })}{' '}
            {x.prossimo !== null && <span className="text-cenere">{t('master.esperienza.prossimo', { livello: x.livello + 1, px: x.prossimo })}</span>}{' '}
            {x.sale && <span className="font-semibold text-candela">{t('master.esperienza.sale')}</span>}
          </li>
        ))}
      </ul>
      {esperienza.tesoro && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-candela" data-testid="master-esperienza-tesoro">
          {t('master.esperienza.tesoro', { valore: esperienza.tesoro })}
          <button type="button" data-testid="master-esperienza-al-sicuro" disabled={inCorso} onClick={() => void inviaComando({ tipo: 'esperienza', cosa: 'tesoro' })} className={classePulsante('normale', 'piccolo')}>
            {t('master.esperienza.al_sicuro')}
          </button>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <input data-testid="master-esperienza-px" aria-label={t('master.esperienza.quanti')} type="number" value={px} placeholder={t('master.esperienza.quanti')} onChange={(e) => setPx(e.target.value)} className="w-24 rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-right text-xs text-pergamena" />
        <select data-testid="master-esperienza-pg" aria-label={t('master.esperienza.a_chi')} value={pg} onChange={(e) => setPg(e.target.value)} className="rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-xs text-pergamena">
          <option value="">{t('master.esperienza.gruppo')}</option>
          {esperienza.pg.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nome}
            </option>
          ))}
        </select>
        <input data-testid="master-esperienza-motivo" aria-label={t('master.esperienza.motivo')} value={motivo} placeholder={t('master.esperienza.motivo')} onChange={(e) => setMotivo(e.target.value)} className="min-w-0 flex-1 rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-xs text-pergamena" />
        <button type="button" data-testid="master-esperienza-assegna" disabled={!valido || inCorso} onClick={assegna} className={classePulsante('normale', 'piccolo')}>
          {t('master.esperienza.assegna')}
        </button>
      </div>
      {esperienza.guadagni.length > 0 && (
        <div className="text-xs text-cenere" data-testid="master-esperienza-guadagni">
          <p>{t('master.esperienza.guadagni')}</p>
          <ul>
            {esperienza.guadagni.map((g, i) => (
              <li key={i}>{g.testo}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
