/**
 * The microphone of the action box (logic in ./dettato.ts, docs/ascolto.md): a round button in the box's bottom row,
 * and a status line under the box. Hold to talk, or tap once to start and once to stop. While recording the button
 * is red with a ring that follows the voice level; then «Trascrivo…»; then the corrected names are listed under the
 * box so the player checks them before sending. Hidden when the table has no dictation (`ascolto: nessuno`); over
 * plain http it stays, greyed, and explains where the https address and the certificate are.
 */
import clsx from 'clsx';
import { useEffect, useState, type PointerEvent } from 'react';
import { t } from '../lingua';
import { durata } from './dettatoPuro';
import { microfonoPossibile, premi, rilascia, useDettato } from './dettato';

function IconaMicrofono() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" fillOpacity="0.2" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </svg>
  );
}

export function PulsanteMicrofono({ disabilitato }: { disabilitato: boolean }) {
  const attivo = useDettato((s) => s.attivo);
  const fase = useDettato((s) => s.fase);
  const livello = useDettato((s) => s.livello);
  if (attivo !== true) return null;
  const possibile = microfonoPossibile();
  const registra = fase === 'registro';
  const giu = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabilitato || fase === 'trascrivo') return;
    e.preventDefault();
    // The release must reach this button even if the finger slides off it.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    void premi();
  };
  const su = () => void rilascia();
  return (
    <button
      type="button"
      data-testid="microfono"
      data-fase={fase}
      aria-label={registra ? t('telefono.dettato.ferma') : t('telefono.dettato.parla')}
      aria-pressed={registra}
      disabled={disabilitato || fase === 'trascrivo'}
      onPointerDown={giu}
      onPointerUp={su}
      onPointerCancel={su}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (registra) void rilascia(true);
        else void premi().then(() => useDettato.setState({ modo: 'tocco' }));
      }}
      className={clsx(
        'relative my-1 flex size-11 shrink-0 touch-none select-none items-center justify-center rounded-full border transition-colors disabled:opacity-40',
        registra ? 'border-sangue bg-sangue text-pergamena' : possibile === 'si' ? 'border-candela/70 text-candela' : 'border-bordo-chiaro text-cenere',
      )}
    >
      {registra && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-sangue/60"
          style={{ transform: `scale(${1 + livello * 0.35})`, transition: 'transform 70ms linear' }}
        />
      )}
      {fase === 'trascrivo' || fase === 'apro' ? <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <IconaMicrofono />}
    </button>
  );
}

/** Seconds since the recording started, refreshed while recording. */
function useTrascorso(inizio: number | null): number {
  const [ora, impostaOra] = useState(() => performance.now());
  useEffect(() => {
    if (inizio === null) return;
    const id = setInterval(() => impostaOra(performance.now()), 250);
    return () => clearInterval(id);
  }, [inizio]);
  return inizio === null ? 0 : Math.max(0, ora - inizio);
}

export function StatoMicrofono() {
  const attivo = useDettato((s) => s.attivo);
  const fase = useDettato((s) => s.fase);
  const modo = useDettato((s) => s.modo);
  const inizio = useDettato((s) => s.inizio);
  const livello = useDettato((s) => s.livello);
  const errore = useDettato((s) => s.errore);
  const correzioni = useDettato((s) => s.correzioni);
  const inviaSubito = useDettato((s) => s.inviaSubito);
  const impostaInviaSubito = useDettato((s) => s.impostaInviaSubito);
  const urlSicuro = useDettato((s) => s.urlSicuro);
  const urlCertificato = useDettato((s) => s.urlCertificato);
  const maxSecondi = useDettato((s) => s.maxSecondi);
  const trascorso = useTrascorso(inizio);
  if (attivo !== true) return null;
  const possibile = microfonoPossibile();

  if (possibile === 'non_sicuro') {
    return (
      <div data-testid="microfono-non-sicuro" className="rounded-lg bg-notte-2 px-3 py-2 text-[0.9rem] leading-snug text-pergamena-2">
        <p>{t('telefono.dettato.non_sicuro')}</p>
        {urlSicuro ? (
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <a className="font-semibold text-candela-2 underline" href={urlSicuro}>
              {t('telefono.dettato.apri_sicuro')}
            </a>
            {urlCertificato && (
              <a className="text-candela-2 underline" href={urlCertificato}>
                {t('telefono.dettato.certificato')}
              </a>
            )}
          </p>
        ) : (
          <p className="mt-1 text-cenere">{t('telefono.dettato.senza_https')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      {(fase === 'apro' || fase === 'registro') && (
        <div data-testid="microfono-registra" className="flex items-center gap-2 text-[0.95rem] text-pergamena">
          <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-sangue" />
          <span className="tabular-nums">
            {durata(trascorso)} / {durata(maxSecondi * 1000)}
          </span>
          <span className="min-w-0 flex-1 truncate text-cenere">
            {fase === 'apro' ? t('telefono.dettato.apro') : modo === 'tocco' ? t('telefono.dettato.registro_tocco') : t('telefono.dettato.registro_tieni')}
          </span>
          <span aria-hidden="true" className="h-1.5 w-16 overflow-hidden rounded-full bg-notte-4">
            <span className="block h-full bg-sangue transition-[width] duration-75" style={{ width: `${Math.round(livello * 100)}%` }} />
          </span>
        </div>
      )}
      {fase === 'trascrivo' && (
        <p data-testid="microfono-trascrivo" className="text-[0.95rem] text-pergamena-2">
          {t('telefono.dettato.trascrivo')}
        </p>
      )}
      {errore && fase === 'pronto' && (
        <p role="alert" data-testid="microfono-errore" className="rounded-lg bg-sangue/10 px-3 py-1.5 text-[0.9rem] text-sangue">
          {errore}
        </p>
      )}
      {correzioni.length > 0 && fase === 'pronto' && (
        <div data-testid="microfono-nomi" className="flex flex-wrap items-center gap-1.5 text-[0.85rem]">
          <span className="text-cenere">{t('telefono.dettato.nomi_corretti')}</span>
          {correzioni.map((c) => (
            <span key={`${c.sentito}>${c.scritto}`} className="rounded-md bg-candela/20 px-1.5 py-0.5 font-semibold text-candela" title={t('telefono.dettato.sentito', { sentito: c.sentito })}>
              {c.scritto}
            </span>
          ))}
          <span className="text-cenere">{t('telefono.dettato.controlla')}</span>
        </div>
      )}
      {possibile === 'si' && fase === 'pronto' && (
        <label className="flex items-center gap-2 self-start text-xs text-cenere">
          <input type="checkbox" data-testid="microfono-invia-subito" checked={inviaSubito} onChange={(e) => impostaInviaSubito(e.target.checked)} className="accent-candela" />
          {t('telefono.dettato.invia_subito')}
        </label>
      )}
    </div>
  );
}
