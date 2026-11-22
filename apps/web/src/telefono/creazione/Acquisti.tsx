/**
 * Buying the starting equipment on the phone (docs/creazione.md; Basic Fantasy p. 3): the catalog with each item's
 * price and weight, what is bought, the coins left, the load band and movement, the AC and attack lines the gear gives
 * — all from the Engine's own inventory, the one play uses. A forbidden item is shown with the reason and cannot be
 * bought; one with a penalty shows it.
 */
import clsx from 'clsx';
import { useState } from 'react';
import type { VistaCreazione, VoceAcquisto } from '@tabletop-ai-gm/shared';
import { t } from '../../lingua';
import { azioneCreazione, useCreazione } from './stato';
import { primario, Titolo } from './Passi';

const TIPI: Array<VoceAcquisto['tipo']> = ['arma', 'armatura', 'scudo', 'munizione', 'attrezzo'];

export function PassoAcquisti({ b }: { b: VistaCreazione }) {
  const a = b.acquisti!;
  const occupato = useCreazione((s) => s.occupato);
  const [tipo, setTipo] = useState<VoceAcquisto['tipo']>('arma');
  const monete = a.monete.map((m) => `${m.quante} ${m.id}`).join(', ') || '0';
  return (
    <section data-testid="creazione-passo-acquisti" className="flex flex-col gap-3">
      <Titolo>{t('telefono.creazione.acquisti.titolo')}</Titolo>
      <div className="sticky top-0 z-10 grid grid-cols-2 gap-2 rounded-xl border border-bordo bg-notte-2/95 p-3 text-sm backdrop-blur">
        <p data-testid="creazione-monete">
          <span className="block text-pergamena-2">{t('telefono.creazione.acquisti.restano')}</span>
          <span className="font-titolo text-xl text-candela">{monete}</span>
        </p>
        <p data-testid="creazione-difesa">
          <span className="block text-pergamena-2">{t('telefono.creazione.acquisti.difesa')}</span>
          <span className="font-titolo text-xl text-pergamena">{a.difesa ?? '—'}</span>
        </p>
        <p data-testid="creazione-carico" className="col-span-2 text-pergamena-2">
          {t('telefono.creazione.acquisti.peso', { peso: a.peso, unita: a.unita ?? '' })}
          {a.carico && ` · ${a.carico.nome}${a.carico.movimento !== null ? ` · ${t('telefono.creazione.acquisti.movimento', { m: a.carico.movimento, unita: a.unita_movimento ?? '' })}` : ''}`}
        </p>
        {a.attacchi.length > 0 && (
          <p data-testid="creazione-attacchi" className="col-span-2 text-pergamena-2">
            {t('telefono.creazione.acquisti.attacchi', { attacchi: a.attacchi.join(', ') })}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {TIPI.filter((x) => a.voci.some((v) => v.tipo === x)).map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={tipo === x}
            data-testid={`creazione-tipo-${x}`}
            onClick={() => setTipo(x)}
            className={clsx('min-h-11 rounded-full border px-3 text-sm', tipo === x ? 'border-candela bg-candela text-notte' : 'border-bordo-chiaro text-pergamena-2')}
          >
            {t(`telefono.creazione.acquisti.tipo_${x}`)}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {a.voci
          .filter((v) => v.tipo === tipo)
          .map((v) => (
            <li key={v.id} data-testid={`creazione-voce-${v.id}`} className={clsx('flex items-center gap-2 rounded-xl border px-3 py-2', v.vietato ? 'border-bordo/50 text-cenere' : 'border-bordo bg-notte-2')}>
              <div className="min-w-0 flex-1">
                <p className={clsx('font-semibold', v.vietato ? 'text-cenere' : 'text-pergamena')}>
                  {v.nome}
                  {v.quante > 0 && <span className="ml-2 text-candela">×{v.quante}</span>}
                </p>
                <p className="text-sm text-pergamena-2">
                  {v.costo}
                  {v.confezione > 1 ? ` / ${v.confezione}` : ''} · {t('telefono.creazione.acquisti.peso_voce', { peso: v.peso, unita: a.unita ?? '' })}
                </p>
                {(v.vietato || v.penalita) && <p className={clsx('text-sm', v.vietato ? 'text-sangue' : 'text-candela')}>{v.vietato ?? v.penalita}</p>}
              </div>
              <button type="button" data-testid={`creazione-vendi-${v.id}`} aria-label={t('telefono.creazione.acquisti.vendi', { oggetto: v.nome })} disabled={occupato || v.quante === 0} onClick={() => void azioneCreazione({ tipo: 'vendi', id: v.id, quante: 1 })} className="size-11 rounded-full border border-bordo-chiaro text-xl text-pergamena-2 disabled:opacity-30">
                −
              </button>
              <button
                type="button"
                data-testid={`creazione-compra-${v.id}`}
                aria-label={t('telefono.creazione.acquisti.compra', { oggetto: v.nome })}
                aria-disabled={!!v.vietato}
                disabled={occupato}
                onClick={() => void azioneCreazione({ tipo: 'compra', id: v.id, quante: 1 })}
                className={clsx('size-11 rounded-full text-xl font-bold', v.vietato ? 'border border-bordo/50 text-cenere' : 'bg-candela text-notte')}
              >
                +
              </button>
            </li>
          ))}
      </ul>
      <button type="button" data-testid="creazione-conferma" disabled={occupato} className={primario} onClick={() => void azioneCreazione({ tipo: 'conferma', passo: 'acquisti' })}>
        {t('telefono.creazione.acquisti.conferma')}
      </button>
    </section>
  );
}
