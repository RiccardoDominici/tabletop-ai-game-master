/**
 * Modulo del token: compare quando non c'è un token (né nell'URL né salvato) o quando il server
 * l'ha rifiutato. Il token è stampato nel log del server all'avvio; si può incollare anche tutto
 * il link `/master?token=…` (master/token.ts lo ripulisce).
 */
import { useId, useState, type FormEvent } from 'react';
import { useMaster } from '../store/master';
import { usaToken } from './sessione';
import { classePulsante } from './stili';
import { t } from '../lingua';

export function FormToken() {
  const [testo, setTesto] = useState('');
  const [vuoto, setVuoto] = useState(false);
  const erroreEntrata = useMaster((s) => s.erroreEntrata);
  const entrata = useMaster((s) => s.entrata);
  const idCampo = useId();

  const invia = (evento: FormEvent) => {
    evento.preventDefault();
    const ok = usaToken(testo);
    setVuoto(!ok);
    if (ok) setTesto('');
  };

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        data-testid="master-token-form"
        onSubmit={invia}
        className="flex w-full max-w-lg flex-col gap-4 rounded-carta border border-bordo bg-notte-2/90 p-6 shadow-profonda"
      >
        <div>
          <p className="text-xs tracking-[0.3em] text-candela/90 uppercase">{t('master.marchio')}</p>
          <h1 className="font-titolo text-2xl font-semibold">{t('master.token.titolo')}</h1>
        </div>
        <p className="text-pergamena-2">
          {t('master.token.serve')} <strong className="text-pergamena">{t('master.token.tipo')}</strong>{t('master.token.serve_2')} <code className="rounded bg-notte px-1 text-candela-2">/master?token=…</code>{t('master.token.serve_3')}
        </p>
        {entrata === 'rifiutato' && erroreEntrata && (
          <p role="alert" data-testid="master-token-errore" className="rounded-lg border border-sangue/60 bg-sangue/10 px-3 py-2 text-sangue">
            {t('master.token.rifiutato', { errore: erroreEntrata })}
            <span className="mt-1 block text-sm text-pergamena-2">
              {t('master.token.riavviato')}
            </span>
          </p>
        )}
        <label htmlFor={idCampo} className="sr-only">
          {t('master.token.campo')}
        </label>
        <div className="flex gap-2">
          <input
            id={idCampo}
            data-testid="master-token-input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            value={testo}
            onChange={(e) => {
              setTesto(e.target.value);
              setVuoto(false);
            }}
            placeholder={t('master.token.placeholder')}
            className="min-w-0 flex-1 rounded-lg border border-bordo-chiaro bg-notte px-3 py-2 font-mono text-pergamena placeholder:font-sans placeholder:text-cenere/70 focus:border-candela"
          />
          <button type="submit" data-testid="master-token-invia" className={classePulsante('primario', 'grande')}>
            {t('master.token.entra')}
          </button>
        </div>
        {vuoto && <p className="text-sm text-sangue">{t('master.token.vuoto')}</p>}
        <p className="text-xs text-cenere">
          {t('master.token.nota')}
        </p>
      </form>
    </main>
  );
}
