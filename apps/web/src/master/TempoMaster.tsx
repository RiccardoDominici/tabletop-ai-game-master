/**
 * The game clock in the Game Master panel (docs/prove.md §11): the day and time, how long the session has played in
 * game time, the lights burning with the time left (a Game Master roll), buttons to let one unit of the set's clock pass
 * (a turn, an hour, a day) and a journey (distance and terrain, when the set has travel rules). Hidden while a fight
 * is on: its rounds are the clock. Where the scene explores (docs/prove.md §14), when the next wandering monster check
 * falls and the session's last encounter.
 */
import { useState } from 'react';
import type { CombattimentoMaster } from '@tabletop-ai-gm/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { classePulsante } from './stili';
import { t } from '../lingua';

export function TempoMaster({ tempo, attivo, nomi }: { tempo: NonNullable<CombattimentoMaster['tempo']>; attivo: boolean; nomi: ReadonlyMap<string, string> }) {
  const [distanza, setDistanza] = useState('');
  const [terreno, setTerreno] = useState(tempo.terreni[0]?.id ?? '');
  const [guida, setGuida] = useState('');
  const inCorso = useInCorso('tempo');
  const d = Number(distanza);
  const dValida = distanza.trim() !== '' && d > 0 && d <= 100000;
  // The round is the fight's own unit: the buttons start from the next one.
  const unita = tempo.unita.slice(1);
  return (
    <div data-testid="master-tempo" className="flex flex-col gap-1 rounded-lg border border-bordo bg-notte-3 p-2 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-pergamena" data-testid="master-tempo-ora">
          {t('master.tempo.ora', { ora: tempo.ora })}
        </span>
        {tempo.trascorso && <span className="text-xs text-cenere">{t('master.tempo.trascorso', { quanto: tempo.trascorso })}</span>}
      </p>
      {tempo.luci.length > 0 && (
        <p className="text-xs text-candela" data-testid="master-tempo-luci">
          {tempo.luci.map((l) => t('master.tempo.luce', { chi: nomi.get(l.chi) ?? l.chi, nome: l.nome, restante: l.restante })).join(' · ')}
        </p>
      )}
      {tempo.luce && (
        <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="master-tempo-luce">
          <label className="flex items-center gap-1 text-pergamena-2">
            {t('master.tempo.luce_scena')}
            <select data-testid="master-tempo-luce-livello" aria-label={t('master.tempo.luce_scena')} value={tempo.luce.forzata ? tempo.luce.livello : ''} onChange={(e) => void inviaComando({ tipo: 'luce', livello: (e.target.value || null) as 'piena' | 'fioca' | 'buio' | null })} className="rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-xs text-pergamena">
              <option value="">{t('master.tempo.luce_della_scena', { livello: t(`master.tempo.luce_${tempo.luce.livello}`) })}</option>
              {(['piena', 'fioca', 'buio'] as const).map((l) => (
                <option key={l} value={l}>
                  {t(`master.tempo.luce_${l}`)}
                </option>
              ))}
            </select>
          </label>
          {tempo.luce.testo && <span className="text-candela">{tempo.luce.testo}</span>}
        </div>
      )}
      {tempo.incontri?.ambiente && (
        <p className="text-xs text-cenere" data-testid="master-tempo-incontri">
          {tempo.incontri.in_attesa
            ? t('master.tempo.incontri_attesa', { ambiente: tempo.incontri.ambiente })
            : t('master.tempo.incontri', { ambiente: tempo.incontri.ambiente, tabella: tempo.incontri.tabella ? `, ${tempo.incontri.tabella}` : '', prossimo: tempo.incontri.prossimo ?? '', ogni: tempo.incontri.ogni ?? '', probabilita: tempo.incontri.probabilita ?? '' })}
        </p>
      )}
      {[tempo.incontri?.fatica, tempo.incontri?.orientamento, ...(tempo.incontri?.provviste ?? [])].filter(Boolean).map((r, i) => (
        <p key={i} className="text-xs text-candela" data-testid="master-tempo-esplorazione">
          {r}
        </p>
      ))}
      {tempo.incontri?.ultimo && (
        <p className="text-xs text-pergamena-2" data-testid="master-tempo-incontro">
          {t('master.tempo.incontro_ultimo', { ora: tempo.incontri.ultimo.ora, testo: tempo.incontri.ultimo.testo })}
        </p>
      )}
      {!attivo && (
        <div className="flex flex-wrap items-center gap-1.5">
          {unita.map((u) => (
            <button key={u.id} type="button" data-testid={`master-tempo-avanza-${u.id}`} disabled={inCorso} onClick={() => void inviaComando({ tipo: 'tempo', cosa: 'avanza', durata: { [u.id]: 1 } })} className={classePulsante('normale', 'piccolo')}>
              {t('master.tempo.avanza', { unita: u.nome.toLowerCase() })}
            </button>
          ))}
          {tempo.terreni.length > 0 && (
            <>
              <input data-testid="master-tempo-distanza" aria-label={t('master.tempo.distanza')} type="number" min={1} value={distanza} placeholder={tempo.unita_viaggio ?? ''} onChange={(e) => setDistanza(e.target.value)} className="w-20 rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-right text-xs text-pergamena" />
              <select data-testid="master-tempo-terreno" aria-label={t('master.tempo.terreno')} value={terreno} onChange={(e) => setTerreno(e.target.value)} className="rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-xs text-pergamena">
                {tempo.terreni.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </select>
              {tempo.guide && tempo.guide.length > 0 && (
                <select data-testid="master-tempo-guida" aria-label={t('master.tempo.guida')} value={guida} onChange={(e) => setGuida(e.target.value)} className="rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-xs text-pergamena">
                  <option value="">{t('master.tempo.guida_prima')}</option>
                  {tempo.guide.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                    </option>
                  ))}
                </select>
              )}
              <button type="button" data-testid="master-tempo-viaggio" disabled={!dValida || !terreno || inCorso} onClick={() => { void inviaComando({ tipo: 'tempo', cosa: 'viaggio', distanza: d, terreno, ...(guida ? { guida } : {}) }); setDistanza(''); }} className={classePulsante('normale', 'piccolo')}>
                {t('master.tempo.viaggio')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
