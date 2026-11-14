/**
 * /certificato (docs/ascolto.md, «HTTPS»): how a phone trusts the table's local certificate, once, so the microphone
 * works on the https address. Opened on plain http on purpose (it must work before the phone trusts anything); the
 * file is the PUBLIC root certificate only (/api/certificato.crt). Without HTTPS on the server it says how to turn it on.
 */
import { useEffect, useState } from 'react';
import type { InfoServer } from '@tabletop-ai-gm/shared';
import { t } from '../lingua';
import { creaLog } from '../lib/log';

const log = creaLog('certificato');

export function PaginaCertificato() {
  const [info, impostaInfo] = useState<InfoServer | null>(null);
  useEffect(() => {
    document.title = t('telefono.certificato.titolo');
    fetch('/api/info')
      .then((r) => r.json())
      .then((i: InfoServer) => impostaInfo(i))
      .catch((e) => log.warn('Server info not read', e));
  }, []);
  const https = info?.https === true;
  const insicuro = info ? info.url_telefono.replace(/^https:/, 'http:') : '/telefono';
  return (
    <main className="sicuro-lati mx-auto flex min-h-dvh max-w-xl flex-col gap-4 py-6 text-pergamena">
      <h1 className="font-titolo text-2xl text-candela">{t('telefono.certificato.titolo')}</h1>
      <p className="text-pergamena-2">{t('telefono.certificato.intro')}</p>
      {info && !https && (
        <p data-testid="certificato-spento" className="rounded-lg bg-notte-2 px-3 py-2 text-pergamena-2">
          {t('telefono.certificato.non_attivo')}
        </p>
      )}
      {https && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">{t('telefono.certificato.passo_scarica')}</h2>
            <a data-testid="certificato-scarica" href="/api/certificato.crt" className="self-start rounded-xl bg-candela px-4 py-3 font-bold text-notte">
              {t('telefono.certificato.scarica')}
            </a>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">{t('telefono.certificato.passo_installa')}</h2>
            <div className="rounded-lg bg-notte-2 px-3 py-2">
              <h3 className="font-semibold text-candela-2">{t('telefono.certificato.android_titolo')}</h3>
              <p className="text-[0.95rem] leading-snug text-pergamena-2">{t('telefono.certificato.android')}</p>
            </div>
            <div className="rounded-lg bg-notte-2 px-3 py-2">
              <h3 className="font-semibold text-candela-2">{t('telefono.certificato.iphone_titolo')}</h3>
              <p className="text-[0.95rem] leading-snug text-pergamena-2">{t('telefono.certificato.iphone')}</p>
            </div>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">{t('telefono.certificato.passo_apri')}</h2>
            <a data-testid="certificato-apri" href={info.url_telefono} className="self-start rounded-xl border border-candela px-4 py-3 font-bold text-candela">
              {t('telefono.certificato.apri')}
            </a>
            <p className="text-[0.9rem] text-cenere">{t('telefono.certificato.avviso')}</p>
          </section>
        </>
      )}
      <p className="text-[0.9rem] text-cenere">
        {t('telefono.certificato.senza')}{' '}
        <a className="text-candela-2 underline" href={insicuro}>
          {t('telefono.certificato.gioca_scrivendo')}
        </a>
      </p>
    </main>
  );
}
