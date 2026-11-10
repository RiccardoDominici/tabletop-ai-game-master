/**
 * Pannello «La tua scheda»: chi è il PG, cosa sa fare e, in evidenza, ciò che sa SOLO lui
 * (conoscenze private). Copre la pagina come un foglio: si legge con calma e si chiude.
 * Le conoscenze private non compaiono mai altrove (né al tavolo né sullo schermo): il giocatore
 * decide se e quando raccontarle.
 */
import { t } from '../lingua';
import { useEffect } from 'react';
import { useTelefono } from '../store/telefono';

export function SchedaPersonaggio() {
  const idPg = useTelefono((s) => s.idPg);
  const scheda = useTelefono((s) => (s.scheda?.id_pg === idPg ? s.scheda : null));
  const aperta = useTelefono((s) => s.schedaAperta);
  const apriScheda = useTelefono((s) => s.apriScheda);

  // Esc chiude (utile anche con una tastiera collegata al telefono o su desktop).
  useEffect(() => {
    if (!aperta) return;
    const tasto = (e: KeyboardEvent) => e.key === 'Escape' && apriScheda(false);
    window.addEventListener('keydown', tasto);
    return () => window.removeEventListener('keydown', tasto);
  }, [aperta, apriScheda]);

  if (!aperta || !scheda) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titolo-scheda"
      data-testid="scheda-pg"
      className="fixed inset-0 z-40 flex flex-col bg-notte/95 pt-[env(safe-area-inset-top)] backdrop-blur"
    >
      <header className="sicuro-lati flex items-center gap-3 border-b border-bordo py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-[0.18em] text-cenere uppercase">{t('telefono.scheda.etichetta')}</p>
          <h2 id="titolo-scheda" className="font-titolo text-xl leading-tight font-semibold text-pergamena">
            {scheda.nome}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => apriScheda(false)}
          className="min-h-12 min-w-12 shrink-0 rounded-full border border-bordo-chiaro px-4 text-[0.95rem] text-pergamena-2 active:bg-notte-3"
        >
          {t('telefono.chiudi')}
        </button>
      </header>
      <div className="sicuro-lati sicuro-basso min-h-0 flex-1 overflow-y-auto py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {scheda.descrizione && <p className="font-racconto text-lg leading-snug text-pergamena-2">{scheda.descrizione}</p>}

          {scheda.conoscenze_private.length > 0 && (
            <section className="rounded-carta border border-candela/50 bg-candela-scura/15 p-4" data-testid="conoscenze-private">
              <h3 className="font-titolo text-base font-semibold text-candela">{t('telefono.scheda.solo_tu')}</h3>
              <p className="mt-1 text-sm text-cenere">{t('telefono.scheda.decidi')}</p>
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 font-racconto text-[1.05rem] leading-snug text-pergamena">
                {scheda.conoscenze_private.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {scheda.sezioni.map((s) => (
            <section key={s.titolo}>
              <h3 className="font-titolo text-base font-semibold text-candela-2">{s.titolo}</h3>
              {s.righe.length === 1 ? (
                <p className="mt-1 font-racconto text-[1.05rem] leading-snug text-pergamena">{s.righe[0]}</p>
              ) : (
                <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 font-racconto text-[1.05rem] leading-snug text-pergamena">
                  {s.righe.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {scheda.situazione_comune && (
            <section>
              <h3 className="font-titolo text-base font-semibold text-candela-2">{t('telefono.scheda.gruppo')}</h3>
              <p className="mt-1 font-racconto text-[1.05rem] leading-snug text-pergamena-2">{scheda.situazione_comune}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
