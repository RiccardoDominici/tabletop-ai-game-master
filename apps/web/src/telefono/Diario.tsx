/**
 * Pannello «Diario» del telefono: il diario della campagna e i miei esiti privati.
 *
 * - «Finora stasera»: le righe pubbliche della serata in corso (diario.stasera).
 * - Le serate chiuse, dalla più recente (il server le manda dalla più vecchia).
 * - «I tuoi esiti privati»: gli esiti delle MIE azioni, dallo store del telefono (privato:esiti).
 *   Non passano mai dallo stato pubblico: ogni telefono vede solo i suoi.
 *
 * Stesso schema di Regole.tsx: copre la pagina, si chiude con «Chiudi» o con Esc.
 */
import { t } from '../lingua';
import { useEffect } from 'react';
import type { DiarioPubblico } from '@tabletop-ai-gm/shared';
import { useTelefono } from '../store/telefono';
import { DiarioSerata } from './DiarioSerata';

export interface PropsDiario {
  aperta: boolean;
  diario: DiarioPubblico | undefined;
  onChiudi: () => void;
}

export function Diario({ aperta, diario, onChiudi }: PropsDiario) {
  const privati = useTelefono((s) => s.esitiPrivati);

  // Esc chiude (come le Regole e la scheda).
  useEffect(() => {
    if (!aperta) return;
    const tasto = (e: KeyboardEvent) => e.key === 'Escape' && onChiudi();
    window.addEventListener('keydown', tasto);
    return () => window.removeEventListener('keydown', tasto);
  }, [aperta, onChiudi]);

  if (!aperta) return null;
  const stasera = diario?.stasera ?? [];
  const serate = [...(diario?.serate ?? [])].reverse();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titolo-diario"
      data-testid="diario"
      className="fixed inset-0 z-40 flex flex-col bg-notte/95 pt-[env(safe-area-inset-top)] backdrop-blur"
    >
      <header className="sicuro-lati flex items-center gap-3 border-b border-bordo py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-[0.18em] text-cenere uppercase">{t('telefono.tavolo.diario')}</p>
          <h2 id="titolo-diario" className="font-titolo text-xl leading-tight font-semibold text-pergamena">
            {t('telefono.diario.titolo')}
          </h2>
        </div>
        <button
          type="button"
          onClick={onChiudi}
          data-testid="chiudi-diario"
          className="min-h-12 min-w-12 shrink-0 rounded-full border border-bordo-chiaro px-4 text-[0.95rem] text-pergamena-2 active:bg-notte-3"
        >
          {t('telefono.chiudi')}
        </button>
      </header>

      <div className="sicuro-lati sicuro-basso min-h-0 flex-1 overflow-y-auto py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <section className="flex flex-col gap-2">
            <h3 className="font-titolo text-base font-semibold text-candela">{t('telefono.diario.stasera')}</h3>
            {stasera.length > 0 ? (
              <ul className="flex flex-col gap-1.5 text-[0.98rem] text-pergamena">
                {stasera.map((riga, i) => (
                  <li key={i}>{riga}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-cenere">{t('telefono.diario.stasera_vuota')}</p>
            )}
          </section>

          {serate.map((serata, i) => (
            <DiarioSerata key={`${serata.quando}-${i}`} serata={serata} />
          ))}

          <section className="flex flex-col gap-2 border-t border-bordo pt-4" data-testid="diario-privati">
            <h3 className="font-titolo text-base font-semibold text-candela">{t('telefono.diario.privati')}</h3>
            {privati.length > 0 ? (
              <ul className="flex flex-col gap-2 text-[0.98rem] text-pergamena-2">
                {privati.map((esito) => (
                  <li key={esito.id}>
                    <span className="text-xs tracking-wide text-cenere uppercase">
                      {t('telefono.turno', { n: esito.turno })} · {esito.nome}
                    </span>
                    <p className="text-pergamena">{esito.testo}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-cenere">{t('telefono.diario.privati_vuoti')}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
