/**
 * Pannello «Regole» del telefono (docs/regole.md): il set di regole della campagna, come riassunto
 * dal suo manuale (o l'SRD 5.2). Copre la pagina come la scheda del personaggio.
 *
 * - All'apertura chiede il set con `regole:leggi` e lo mostra: nome, fonte, licenza, attribuzione e il
 *   riassunto (markdown sicuro, lib/markdown.ts).
 * - Se il set permette le domande («domande»), in fondo c'è «Chiedi una regola»: la risposta arriva solo
 *   a questo telefono (`regole:chiedi`), presa dai passi del manuale, e non si condivide col tavolo.
 * - Il socket e gli ack passano da `chiedi` (lib/socket.ts): timeout esplicito, nessun invio in coda.
 */
import { t } from '../lingua';
import { useEffect, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import type { RegolePubbliche, RispostaRegola } from '@tabletop-ai-gm/shared';
import { chiedi } from '../lib/socket';
import { creaLog } from '../lib/log';
import { leggiMarkdown, type BloccoMarkdown, type Frammento } from '../lib/markdown';

const log = creaLog('regole');

/** Lunghezza massima di una domanda (caratteri): una regola si chiede in una frase. */
export const MASSIMO_DOMANDA = 300;

type Caricamento = { stato: 'carico' } | { stato: 'pronto'; regole: RegolePubbliche } | { stato: 'errore' };

export interface PropsRegole {
  aperta: boolean;
  onChiudi: () => void;
}

export function Regole({ aperta, onChiudi }: PropsRegole) {
  const [caricamento, setCaricamento] = useState<Caricamento>({ stato: 'carico' });
  const [tentativo, setTentativo] = useState(0);

  // Esc chiude (come la scheda).
  useEffect(() => {
    if (!aperta) return;
    const tasto = (e: KeyboardEvent) => e.key === 'Escape' && onChiudi();
    window.addEventListener('keydown', tasto);
    return () => window.removeEventListener('keydown', tasto);
  }, [aperta, onChiudi]);

  // Ogni apertura (e ogni «Riprova») chiede il set; una risposta arrivata dopo la chiusura si scarta.
  useEffect(() => {
    if (!aperta) return;
    let annullata = false;
    setCaricamento({ stato: 'carico' });
    chiedi<RegolePubbliche>((s, fine) => s.emit('regole:leggi', fine)).then(
      (regole) => {
        if (annullata) return;
        if (regole) setCaricamento({ stato: 'pronto', regole });
        else {
          log.warn('Set di regole vuoto dal server');
          setCaricamento({ stato: 'errore' });
        }
      },
      (errore: unknown) => {
        if (annullata) return;
        log.warn('Regole non lette', { messaggio: errore instanceof Error ? errore.message : String(errore) });
        setCaricamento({ stato: 'errore' });
      },
    );
    return () => {
      annullata = true;
    };
  }, [aperta, tentativo]);

  if (!aperta) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titolo-regole"
      data-testid="pannello-regole"
      className="fixed inset-0 z-40 flex flex-col bg-notte/95 pt-[env(safe-area-inset-top)] backdrop-blur"
    >
      <header className="sicuro-lati flex items-center gap-3 border-b border-bordo py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-[0.18em] text-cenere uppercase">{t('telefono.tavolo.regole')}</p>
          <h2 id="titolo-regole" className="font-titolo text-xl leading-tight font-semibold break-words text-pergamena">
            {caricamento.stato === 'pronto' ? caricamento.regole.nome : t('telefono.regole.set')}
          </h2>
        </div>
        <button
          type="button"
          onClick={onChiudi}
          className="min-h-12 min-w-12 shrink-0 rounded-full border border-bordo-chiaro px-4 text-[0.95rem] text-pergamena-2 active:bg-notte-3"
        >
          {t('telefono.chiudi')}
        </button>
      </header>

      <div className="sicuro-lati sicuro-basso min-h-0 flex-1 overflow-y-auto py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {caricamento.stato === 'carico' && <p className="text-pergamena-2">{t('telefono.regole.carico')}</p>}

          {caricamento.stato === 'errore' && (
            <div className="flex flex-col items-start gap-3">
              <p role="alert" className="text-sangue">
                {t('telefono.regole.errore_lettura')}
              </p>
              <button
                type="button"
                onClick={() => setTentativo((n) => n + 1)}
                className="min-h-12 rounded-full border border-candela/60 px-5 text-[0.95rem] text-candela active:bg-notte-3"
              >
                {t('telefono.regole.riprova')}
              </button>
            </div>
          )}

          {caricamento.stato === 'pronto' && <SetRegole regole={caricamento.regole} />}
        </div>
      </div>
    </div>
  );
}

function SetRegole({ regole }: { regole: RegolePubbliche }) {
  const blocchi = leggiMarkdown(regole.riassunto);
  return (
    <>
      <section data-testid="fonte-regole" className="flex flex-col gap-1 text-sm text-cenere">
        <p>
          <span className="text-pergamena-2">{t('telefono.regole.fonte')}</span> {regole.fonte}
        </p>
        <p>
          <span className="text-pergamena-2">{t('telefono.regole.licenza')}</span> {regole.licenza}
        </p>
        {regole.attribuzione && (
          <p>
            <span className="text-pergamena-2">{t('telefono.regole.attribuzione')}</span> {regole.attribuzione}
          </p>
        )}
      </section>

      <article data-testid="riassunto-regole" className="flex flex-col gap-3 font-racconto text-[1.05rem] leading-snug text-pergamena">
        {blocchi.map((blocco, i) => (
          <BloccoRiassunto key={i} blocco={blocco} />
        ))}
      </article>

      {regole.domande && <ChiediRegola />}
    </>
  );
}

/** Un blocco del riassunto come elementi React: il testo esce escapato, nessun HTML. */
function BloccoRiassunto({ blocco }: { blocco: BloccoMarkdown }) {
  if (blocco.tipo === 'titolo') {
    const classe =
      blocco.livello === 1
        ? 'font-titolo text-lg font-semibold text-candela'
        : blocco.livello === 2
          ? 'font-titolo text-base font-semibold text-candela-2'
          : 'font-titolo text-sm font-semibold tracking-wide text-cenere uppercase';
    return (
      <h3 className={clsx('mt-2', classe)}>
        <Frammenti frammenti={blocco.frammenti} />
      </h3>
    );
  }
  if (blocco.tipo === 'elenco') {
    return (
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {blocco.voci.map((voce, i) => (
          <li key={i}>
            <Frammenti frammenti={voce} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p>
      <Frammenti frammenti={blocco.frammenti} />
    </p>
  );
}

function Frammenti({ frammenti }: { frammenti: Frammento[] }) {
  return (
    <>
      {frammenti.map((f, i) =>
        f.tipo === 'grassetto' ? (
          <strong key={i} className="font-bold text-pergamena">
            {f.testo}
          </strong>
        ) : (
          <span key={i}>{f.testo}</span>
        ),
      )}
    </>
  );
}

/** «Chiedi una regola»: una domanda alla volta; la risposta resta su questo telefono. */
function ChiediRegola() {
  const [domanda, setDomanda] = useState('');
  const [inviando, setInviando] = useState(false);
  const [risposta, setRisposta] = useState<RispostaRegola | null>(null);

  const testo = domanda.trim();
  const invia = (e: FormEvent) => {
    e.preventDefault();
    if (inviando || testo === '') return;
    setInviando(true);
    setRisposta(null);
    chiedi<RispostaRegola>((s, fine) => s.emit('regole:chiedi', { domanda: testo }, fine)).then(
      (r) => {
        setRisposta(r ?? { ok: false, errore: t('telefono.regole.errore_risposta') });
        setInviando(false);
      },
      (errore: unknown) => {
        log.warn('Domanda sulla regola non riuscita', { messaggio: errore instanceof Error ? errore.message : String(errore) });
        setRisposta({ ok: false, errore: t('telefono.regole.errore_risposta') });
        setInviando(false);
      },
    );
  };

  return (
    <section className="rounded-carta border border-candela/50 bg-candela-scura/15 p-4" data-testid="chiedi-regola-box">
      <h3 className="font-titolo text-base font-semibold text-candela">{t('telefono.regole.chiedi_titolo')}</h3>
      <form onSubmit={invia} className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-cenere">
          {t('telefono.regole.domanda')}
          <textarea
            value={domanda}
            onChange={(e) => setDomanda(e.target.value)}
            maxLength={MASSIMO_DOMANDA}
            rows={3}
            data-testid="domanda-regola"
            placeholder={t('telefono.regole.domanda_segnaposto')}
            className="resize-none rounded-lg border border-bordo-chiaro bg-notte-2 p-3 text-base text-pergamena placeholder:text-cenere/70 focus:border-candela focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-3">
          <span className="flex-1 text-xs text-cenere tabular-nums">
            {domanda.length}/{MASSIMO_DOMANDA}
          </span>
          <button
            type="submit"
            data-testid="invia-domanda"
            disabled={inviando || testo === ''}
            className="min-h-12 rounded-full border border-candela/60 px-5 text-[0.95rem] text-candela active:bg-notte-3 disabled:opacity-40"
          >
            {inviando ? t('telefono.regole.cerco') : t('telefono.regole.chiedi')}
          </button>
        </div>
      </form>

      {risposta && (
        <div className="mt-4 border-t border-bordo pt-3" data-testid="esito-domanda">
          {risposta.ok ? (
            <>
              <p data-testid="risposta-regola" className="font-racconto text-[1.05rem] leading-snug text-pergamena">
                {risposta.testo}
              </p>
              {risposta.fonti.length > 0 && (
                <p className="mt-2 text-sm text-cenere">{t('telefono.regole.dal_manuale', { fonti: risposta.fonti.join(' · ') })}</p>
              )}
            </>
          ) : (
            <p role="alert" data-testid="errore-regola" className="text-sangue">
              {risposta.errore}
            </p>
          )}
          <p className="mt-3 text-xs text-cenere">{t('telefono.regole.solo_telefono')}</p>
        </div>
      )}
    </section>
  );
}
