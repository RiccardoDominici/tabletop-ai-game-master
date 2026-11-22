/**
 * The PCs being built on the phones, in the Game Master's panel (docs/creazione.md): one card per phone with the steps
 * of the set (done, approved, the current one) and their summaries, the dice the player entered (to compare with the
 * real ones at the table), the Engine's remarks on the finished sheet. The Game Master approves or undoes a step (an
 * undo throws its dice away and resets the steps that read it), gives the book's spells when the set says so, and
 * approves the finished PC: the server restarts and the PC joins the table.
 */
import { useState } from 'react';
import type { CreazioneMaster, StatoMaster } from '@tabletop-ai-gm/shared';
import { t } from '../lingua';
import { useInCorso } from '../store/master';
import { Riquadro } from './Riquadro';
import { inviaComando } from './sessione';
import { classePulsante } from './stili';

export function SezioneCreazione({ stato }: { stato: StatoMaster }) {
  const bozze = stato.creazione ?? [];
  return (
    <Riquadro titolo={t('master.creazione.titolo')} conteggio={bozze.length} zona="creazione" data-testid="master-creazione">
      {bozze.length === 0 ? <p className="text-sm text-cenere">{t('master.creazione.vuoto')}</p> : bozze.map((b) => <Bozza key={b.id} b={b} />)}
    </Riquadro>
  );
}

function Bozza({ b }: { b: CreazioneMaster }) {
  const inCorso = useInCorso(`creazione:${b.id}`);
  const gravi = b.problemi.filter((p) => p.grave);
  const comanda = (azione: 'approva' | 'scarta' | 'approva_passo' | 'annulla_passo', passo?: CreazioneMaster['passi'][number]['id']) =>
    void inviaComando({ tipo: 'creazione', azione, id: b.id, ...(passo ? { passo } : {}) });
  return (
    <div data-testid={`master-creazione-${b.id}`} data-bozza={b.id} data-stato={b.stato} className="flex flex-col gap-1.5 rounded-lg border border-bordo bg-notte-3 p-2 text-sm">
      <p className="font-semibold text-pergamena">
        {b.descrizione.nome || t('master.creazione.senza_nome')} <span className="font-normal text-cenere">{t('master.creazione.telefono', { telefono: b.telefono, livello: b.livello })}</span>
        {b.stato === 'approvata' && <span className="ml-2 text-muschio">{t('master.creazione.approvata', { pg: b.id_pg ?? '' })}</span>}
      </p>
      <ol className="flex flex-col gap-0.5">
        {b.passi.map((p) => (
          <li key={p.id} data-testid={`master-creazione-${b.id}-${p.id}`} data-stato={p.stato} className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={p.id === b.corrente ? 'font-semibold text-candela' : p.stato === 'da_fare' ? 'text-cenere' : 'text-pergamena'}>{p.nome}</span>
            <span className="text-pergamena-2">{p.riassunto ?? ''}</span>
            {p.stato === 'approvato' && <span className="text-muschio">✓</span>}
            {p.stato === 'fatto' && b.stato !== 'approvata' && (
              <button type="button" data-testid={`master-creazione-${b.id}-${p.id}-approva`} disabled={inCorso} onClick={() => comanda('approva_passo', p.id)} className={classePulsante('normale', 'piccolo')}>
                {t('master.creazione.approva_passo')}
              </button>
            )}
            {p.stato !== 'da_fare' && b.stato !== 'approvata' && (
              <button type="button" data-testid={`master-creazione-${b.id}-${p.id}-annulla`} disabled={inCorso} onClick={() => comanda('annulla_passo', p.id)} className={classePulsante('tenue', 'piccolo')}>
                {t('master.creazione.annulla_passo')}
              </button>
            )}
          </li>
        ))}
      </ol>
      {b.corrente === 'incantesimi' && b.incantesimi && b.incantesimi.come === 'master' && <LibroDelMaster b={b} />}
      {b.tiri_inseriti.length > 0 && (
        <p className="text-xs text-pergamena-2" data-testid={`master-creazione-${b.id}-tiri`}>
          {t(b.manuale ? 'master.creazione.tiri_telefono' : 'master.creazione.tiri_motore')}{' '}
          {b.tiri_inseriti.map((x) => `${x.per} ${x.dadi.join('+') || '—'}`).join(' · ')}
        </p>
      )}
      {b.problemi.length > 0 && (
        <ul className="list-disc pl-4 text-xs" data-testid={`master-creazione-${b.id}-problemi`}>
          {b.problemi.map((p) => (
            <li key={p.codice} className={p.grave ? 'text-sangue' : 'text-candela'}>
              {p.testo}
            </li>
          ))}
        </ul>
      )}
      {b.stato !== 'approvata' && (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" data-testid={`master-creazione-${b.id}-approva`} disabled={inCorso || b.stato !== 'pronta' || gravi.length > 0} onClick={() => comanda('approva')} className={classePulsante('primario', 'piccolo')}>
            {t('master.creazione.approva')}
          </button>
          <button type="button" data-testid={`master-creazione-${b.id}-scarta`} disabled={inCorso} onClick={() => comanda('scarta')} className={classePulsante('pericolo', 'piccolo')}>
            {t('master.creazione.scarta')}
          </button>
        </div>
      )}
    </div>
  );
}

/** The set says the Game Master gives a caster's starting spells: pick them for the book. */
function LibroDelMaster({ b }: { b: CreazioneMaster }) {
  const s = b.incantesimi!;
  const [scelti, setScelti] = useState<string[]>([]);
  const inCorso = useInCorso(`creazione:${b.id}`);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs" data-testid={`master-creazione-${b.id}-libro`}>
      <span className="text-pergamena-2">{t('master.creazione.libro', { n: s.a_scelta })}</span>
      {s.scelte.map((x) => (
        <label key={x.id} className="flex items-center gap-1 text-pergamena">
          <input type="checkbox" checked={scelti.includes(x.id)} onChange={() => setScelti((l) => (l.includes(x.id) ? l.filter((y) => y !== x.id) : [...l, x.id]))} />
          {x.nome}
        </label>
      ))}
      <button
        type="button"
        disabled={inCorso || scelti.length !== s.a_scelta}
        onClick={() => void inviaComando({ tipo: 'creazione', azione: 'incantesimi', id: b.id, libro: [...s.fissi.map((f) => f.id), ...scelti] })}
        className={classePulsante('normale', 'piccolo')}
      >
        {t('master.creazione.dai_libro')}
      </button>
    </div>
  );
}
