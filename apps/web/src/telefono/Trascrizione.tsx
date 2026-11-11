/**
 * Trascrizione pubblica dal vivo: le righe più nuove in fondo. Gli esiti delle MIE azioni private
 * (`[privato pg_x]`, solo su questo telefono) stanno in fondo al loro turno, con «Solo per te».
 *
 * Scorrimento automatico «educato»: si scende da soli solo se si era già in fondo (o quasi); se il
 * giocatore è risalito a rileggere non lo si strattona, e compare un pulsante «nuove righe».
 */
import { t } from '../lingua';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { EsitoPrivato, VoceTrascrizione } from '@tabletop-ai-gm/shared';
import { virgolettato } from '../lib/formato';
import { useTelefono } from '../store/telefono';

type Voce = { tipo: 'pubblica'; v: VoceTrascrizione } | { tipo: 'privata'; v: EsitoPrivato };

/** Pubbliche e private in ordine di turno; dentro un turno le private dopo (ordinamento stabile). */
export function uniscoVoci(voci: readonly VoceTrascrizione[], privati: readonly EsitoPrivato[]): Voce[] {
  const tutte: Voce[] = [...voci.map((v) => ({ tipo: 'pubblica' as const, v })), ...privati.map((v) => ({ tipo: 'privata' as const, v }))];
  return tutte.sort((a, b) => a.v.turno - b.v.turno || (a.tipo === b.tipo ? 0 : a.tipo === 'pubblica' ? -1 : 1));
}

/** Entro questa distanza dal fondo si considera «in fondo». */
const SOGLIA_FONDO_PX = 80;

export function Trascrizione({ voci: pubbliche, className }: { voci: VoceTrascrizione[]; className?: string }) {
  const privati = useTelefono((s) => s.esitiPrivati);
  const voci = uniscoVoci(pubbliche, privati);
  const contenitore = useRef<HTMLDivElement>(null);
  const eraInFondo = useRef(true);
  const [nuove, setNuove] = useState(false);
  const ultima = voci[voci.length - 1];
  const ultimaId = ultima ? `${ultima.tipo}:${ultima.v.id}:${ultima.v.testo.length}` : null;

  // Prima del render successivo si decide se seguire il fondo; dopo, si scorre.
  useLayoutEffect(() => {
    const el = contenitore.current;
    if (!el) return;
    if (eraInFondo.current) {
      el.scrollTop = el.scrollHeight;
      setNuove(false);
    } else if (ultimaId !== null) {
      setNuove(true);
    }
  }, [ultimaId]);

  // Se la tastiera o il pannello cambiano l'altezza, si resta in fondo.
  useEffect(() => {
    const el = contenitore.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const osservatore = new ResizeObserver(() => {
      if (eraInFondo.current) el.scrollTop = el.scrollHeight;
    });
    osservatore.observe(el);
    return () => osservatore.disconnect();
  }, []);

  const suScorrimento = () => {
    const el = contenitore.current;
    if (!el) return;
    eraInFondo.current = el.scrollHeight - el.scrollTop - el.clientHeight < SOGLIA_FONDO_PX;
    if (eraInFondo.current) setNuove(false);
  };

  const vaiInFondo = () => {
    const el = contenitore.current;
    if (!el) return;
    eraInFondo.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setNuove(false);
  };

  return (
    <div className={clsx('relative', className)}>
      <div
        ref={contenitore}
        onScroll={suScorrimento}
        data-testid="trascrizione"
        role="log"
        aria-label={t('telefono.trascrizione.aria')}
        // Bordo alto sfumato: la riga tagliata sotto il banner non sembra un errore di layout.
        className="h-full overflow-y-auto overscroll-contain px-1 pt-4 pb-3 [mask-image:linear-gradient(to_bottom,transparent_0,black_1.5rem)]"
      >
        {voci.length === 0 ? (
          <p className="px-3 py-8 text-center text-cenere">{t('telefono.trascrizione.vuota')}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {voci.map((voce, i) => {
              const precedente = voci[i - 1];
              const cambioTurno = precedente !== undefined && precedente.v.turno !== voce.v.turno;
              return (
                <li key={`${voce.tipo}:${voce.v.id}`}>
                  {cambioTurno && <SeparatoreTurno turno={voce.v.turno} />}
                  {voce.tipo === 'pubblica' ? <RigaTrascrizione voce={voce.v} /> : <RigaPrivata esito={voce.v} />}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {nuove && (
        <button
          type="button"
          onClick={vaiInFondo}
          className="absolute bottom-3 left-1/2 min-h-12 -translate-x-1/2 rounded-full bg-candela px-5 font-bold text-notte shadow-profonda"
        >
          ↓ {t('telefono.trascrizione.nuove')}
        </button>
      )}
    </div>
  );
}

function SeparatoreTurno({ turno }: { turno: number }) {
  return (
    <div className="my-2 flex items-center gap-3 text-xs tracking-[0.2em] text-cenere uppercase" aria-hidden>
      <span className="h-px flex-1 bg-bordo" />
      {turno === 0 ? t('telefono.trascrizione.apertura') : t('telefono.turno', { n: turno })}
      <span className="h-px flex-1 bg-bordo" />
    </div>
  );
}

/** L'esito di una mia azione privata: il tavolo non l'ha sentito, si vede solo qui. */
function RigaPrivata({ esito }: { esito: EsitoPrivato }) {
  return (
    <div data-tipo="privato" className="mx-2 rounded-xl border border-dashed border-candela/50 bg-notte-2 px-4 py-2.5">
      <p className="text-xs font-semibold tracking-[0.16em] text-candela uppercase">{t('telefono.trascrizione.solo_per_te')}</p>
      <p className="font-racconto text-[1.0625rem] leading-relaxed text-pergamena">
        {esito.chi !== 'narratore' && <strong className="font-sans font-bold text-brace">{esito.nome} </strong>}
        {esito.chi !== 'narratore' ? virgolettato(esito.testo) : esito.testo}
      </p>
    </div>
  );
}

/** Una riga: nome in grassetto + testo; le azioni dei giocatori hanno un riquadro tutto loro. */
function RigaTrascrizione({ voce }: { voce: VoceTrascrizione }) {
  switch (voce.tipo) {
    case 'azione':
      return (
        <p
          data-tipo="azione"
          className="ml-6 rounded-xl border border-candela/30 bg-notte-3 px-4 py-2.5 text-[1.0625rem] leading-relaxed"
        >
          <strong className="font-bold text-candela">{voce.nome}</strong>{' '}
          <span className="text-pergamena">{voce.testo}</span>
        </p>
      );
    case 'battuta':
      return (
        <p data-tipo="battuta" className="border-l-2 border-brace/70 px-3 font-racconto text-[1.0625rem] leading-relaxed">
          <strong className="font-sans font-bold text-brace">{voce.nome}</strong>{' '}
          <span className="text-pergamena italic">{virgolettato(voce.testo)}</span>
        </p>
      );
    case 'sistema':
      return (
        <p data-tipo="sistema" className="px-3 text-center text-sm text-cenere italic">
          <strong className="font-semibold">{voce.nome}:</strong> {voce.testo}
        </p>
      );
    case 'narrazione':
      return (
        <p data-tipo="narrazione" className="px-3 font-racconto text-[1.0625rem] leading-relaxed text-pergamena">
          <strong className="font-sans font-bold text-pergamena-2">{voce.nome}</strong> {voce.testo}
        </p>
      );
  }
}
