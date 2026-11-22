/**
 * The creation screen of the phone (docs/creazione.md): it covers the choice of PC while the player builds one. On top
 * the steps of the set in order (done, approved by the Game Master, the current one), then the current step's screen,
 * the dice to roll when the step waits for some, the Engine's refusal when there is one. When every step is done the
 * phone waits for the Game Master's approval; approved, the server restarts and the phone takes the new PC.
 */
import clsx from 'clsx';
import { useEffect } from 'react';
import type { VistaCreazione } from '@tabletop-ai-gm/shared';
import { t } from '../../lingua';
import { azioneCreazione, useCreazione } from './stato';
import { DadiDaInserire } from './Dadi';
import { PassoAcquisti } from './Acquisti';
import { PassoCaratteristiche, PassoDescrizione, PassoIncantesimi, PassoLingue, PassoScelta, Titolo, secondario } from './Passi';

export function CreaPersonaggio() {
  const bozza = useCreazione((s) => s.bozza);
  const errore = useCreazione((s) => s.errore);
  const apri = useCreazione((s) => s.apri);
  // Opening the screen asks for this phone's draft (a new one, or the one it was building).
  useEffect(() => {
    void azioneCreazione({ tipo: 'inizia' });
  }, []);
  return (
    <main data-testid="creazione" className="sicuro-basso sicuro-lati mx-auto flex min-h-full max-w-lg flex-col gap-4 pt-3">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <p className="text-sm tracking-[0.2em] text-candela uppercase">{t('telefono.creazione.marchio')}</p>
          <h1 className="font-titolo text-[1.75rem] leading-tight font-semibold">{bozza?.descrizione.nome || t('telefono.creazione.titolo')}</h1>
          {bozza && <p className="text-pergamena-2">{t('telefono.creazione.livello', { n: bozza.livello })}</p>}
        </div>
        <button type="button" data-testid="creazione-chiudi" onClick={() => apri(false)} className="min-h-12 shrink-0 rounded-full border border-bordo-chiaro px-3 text-pergamena-2">
          {t('telefono.creazione.chiudi')}
        </button>
      </header>
      {bozza && <ElencoPassi b={bozza} />}
      {errore && (
        <p role="alert" data-testid="creazione-errore" className="rounded-xl border border-sangue/50 bg-sangue/10 px-4 py-3 text-sangue">
          {errore}
        </p>
      )}
      {bozza && <Corpo b={bozza} />}
    </main>
  );
}

/** The steps in order, each with its state and summary; a done step can be redone (the server says when not). */
function ElencoPassi({ b }: { b: VistaCreazione }) {
  const occupato = useCreazione((s) => s.occupato);
  return (
    <ol className="flex flex-col gap-1" data-testid="creazione-passi">
      {b.passi.map((p) => (
        <li key={p.id} data-testid={`creazione-stato-${p.id}`} data-stato={p.stato} className={clsx('flex items-center gap-2 rounded-lg px-2 py-1 text-sm', p.id === b.corrente ? 'bg-notte-3 text-pergamena' : 'text-pergamena-2')}>
          <span aria-hidden className={clsx('inline-block size-2.5 shrink-0 rounded-full', p.stato === 'approvato' ? 'bg-muschio' : p.stato === 'fatto' ? 'bg-candela' : p.id === b.corrente ? 'border border-candela' : 'border border-cenere')} />
          <span className="font-semibold">{p.nome}</span>
          <span className="min-w-0 flex-1 truncate text-pergamena-2">{p.riassunto ?? ''}</span>
          {/* Rolled dice are redone only by the Game Master (the server refuses it anyway): no «rifai» there. */}
          {p.stato === 'fatto' && b.stato !== 'approvata' && p.id !== 'punti_ferita' && p.id !== 'monete' && (
            <button type="button" data-testid={`creazione-indietro-${p.id}`} disabled={occupato} onClick={() => void azioneCreazione({ tipo: 'indietro', passo: p.id })} className="shrink-0 text-xs text-cenere underline underline-offset-2">
              {t('telefono.creazione.indietro')}
            </button>
          )}
          {p.stato === 'approvato' && <span className="shrink-0 text-xs text-muschio">{t('telefono.creazione.approvato')}</span>}
        </li>
      ))}
    </ol>
  );
}

function Corpo({ b }: { b: VistaCreazione }) {
  const tiro = b.da_tirare && <DadiDaInserire tiro={b.da_tirare} manuale={b.manuale} />;
  switch (b.corrente) {
    case 'caratteristiche':
      return (
        <>
          {tiro}
          <PassoCaratteristiche b={b} />
        </>
      );
    case 'razza':
      return <PassoScelta passo="razza" voci={b.razze} />;
    case 'classe':
      return <PassoScelta passo="classe" voci={b.classi} />;
    case 'incantesimi':
      return <PassoIncantesimi b={b} />;
    case 'punti_ferita':
      return (
        <section data-testid="creazione-passo-punti_ferita" className="flex flex-col gap-3">
          <Titolo>{t('telefono.creazione.pf.titolo')}</Titolo>
          <p className="text-pergamena-2">{t('telefono.creazione.pf.come', { dado: b.punti_ferita.dado ?? '—', bonus: b.punti_ferita.bonus, minimo: b.punti_ferita.minimo })}</p>
          {tiro}
        </section>
      );
    case 'monete':
      return (
        <section data-testid="creazione-passo-monete" className="flex flex-col gap-3">
          <Titolo>{t('telefono.creazione.monete.titolo')}</Titolo>
          <p className="text-pergamena-2">{t('telefono.creazione.monete.come', { formula: b.monete.formula ?? '—' })}</p>
          {tiro}
        </section>
      );
    case 'acquisti':
      return <PassoAcquisti b={b} />;
    case 'lingue':
      return <PassoLingue b={b} />;
    case 'descrizione':
      return <PassoDescrizione b={b} />;
    default:
      return <Riepilogo b={b} />;
  }
}

/** All done: the sheet in short, the Engine's remarks, and the wait for the Game Master's approval. */
function Riepilogo({ b }: { b: VistaCreazione }) {
  const apri = useCreazione((s) => s.apri);
  const gravi = b.problemi.filter((p) => p.grave);
  return (
    <section data-testid="creazione-riepilogo" data-stato={b.stato} className="flex flex-col gap-3 rounded-carta border border-candela/60 bg-notte-2 p-4">
      <Titolo>{b.stato === 'approvata' ? t('telefono.creazione.riepilogo.approvata') : gravi.length ? t('telefono.creazione.riepilogo.problemi') : t('telefono.creazione.riepilogo.pronta')}</Titolo>
      <p className="text-pergamena-2">
        {t('telefono.creazione.riepilogo.pf', { pf: b.punti_ferita.totale ?? '—', difesa: b.acquisti?.difesa ?? '—' })}
      </p>
      {b.problemi.length > 0 && (
        <ul className="list-disc pl-5 text-sm" data-testid="creazione-problemi">
          {b.problemi.map((p) => (
            <li key={p.codice} className={p.grave ? 'text-sangue' : 'text-candela'}>
              {p.testo}
            </li>
          ))}
        </ul>
      )}
      {b.stato === 'approvata' && (
        <button type="button" className={secondario} onClick={() => apri(false)}>
          {t('telefono.creazione.riepilogo.al_tavolo')}
        </button>
      )}
    </section>
  );
}
