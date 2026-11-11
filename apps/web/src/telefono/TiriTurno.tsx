/**
 * Carte dei tiri sul telefono (docs/prove.md).
 *
 * - `TiriTurno`: «Tiri del turno», le carte PUBBLICHE dell'ultimo turno (`stato.tiri`), sopra la
 *   trascrizione. Come «Al tavolo» è compatta per non schiacciare la casella su 390×844: chiusa, una
 *   riga per carta (al massimo RIGHE_CHIUSA); un tocco la apre con le carte intere. Le carte della
 *   mia azione non si ripetono qui: sono già in «La tua azione» (MiaAzione), confrontate per id.
 * - `TiriMiaAzione`: le carte della mia azione (`azione.tiri`), anche quella di un'azione PRIVATA,
 *   che arriva solo a questo telefono. Anche qui una riga per carta; un tocco le apre intere.
 * Le carte si animano (una volta per id) solo mentre si narra il loro turno.
 * Senza carte non si mostra niente: le campagne senza schede restano com'erano.
 */
import { t } from '../lingua';
import { useState } from 'react';
import clsx from 'clsx';
import type { StatoTavolo, TiroMostrato } from '@tabletop-ai-gm/shared';
import { CartaTiro } from '../components/CartaTiro';
import { tiriPubbliciSenzaMiei, tiriRecenti, turnoInNarrazione } from '../lib/tiri';
import { useTelefono } from '../store/telefono';

/** Carte visibili a sezione chiusa. */
const RIGHE_CHIUSA = 2;

/** La carta è fresca (il suo turno si sta narrando): si anima. */
function fresca(stato: StatoTavolo, tiro: TiroMostrato): boolean {
  return turnoInNarrazione({ fase: stato.fase, turno: stato.turno, finestraAperta: stato.finestra.aperta }, tiro.turno);
}

export function TiriTurno({ stato }: { stato: StatoTavolo }) {
  const [aperta, setAperta] = useState(false);
  const mieiTiri = useTelefono((s) => s.miaAzione?.tiri);
  const tiri = tiriRecenti(tiriPubbliciSenzaMiei(stato.tiri, mieiTiri), stato.turno);
  if (tiri.length === 0) return null;

  const visibili = aperta ? tiri : tiri.slice(0, RIGHE_CHIUSA);
  const nascoste = tiri.length - visibili.length;
  const alterna = () => setAperta((a) => !a);

  return (
    <section
      data-testid="tiri-turno"
      aria-label={t('telefono.tiri.titolo')}
      aria-expanded={aperta}
      role="button"
      tabIndex={0}
      onClick={alterna}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          alterna();
        }
      }}
      className="cursor-pointer rounded-xl border border-bordo bg-notte-2/80 px-3 py-2 select-none"
    >
      <div className="flex items-center justify-between text-xs tracking-[0.16em] text-cenere uppercase">
        <span>{t('telefono.tiri.titolo')}</span>
        <span className="tracking-normal normal-case">
          {aperta ? t('telefono.sezione.riduci') : nascoste > 0 ? t('telefono.sezione.nascoste', { n: nascoste }) : t('telefono.tiri.dettagli')}
        </span>
      </div>
      <ul className={clsx('mt-1 flex flex-col', aperta ? 'max-h-[40dvh] gap-2 overflow-y-auto' : 'gap-1')}>
        {visibili.map((tiro, i) => (
          <li key={tiro.id}>
            <CartaTiro tiro={tiro} variante="telefono" compatta={!aperta} indice={i} anima={fresca(stato, tiro)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TiriMiaAzione({ tiri, stato }: { tiri: TiroMostrato[]; stato: StatoTavolo }) {
  // Compatte (una riga per carta) per non schiacciare la casella; un tocco le apre intere.
  const [aperta, setAperta] = useState(false);
  if (tiri.length === 0) return null;
  const alterna = () => setAperta((a) => !a);
  return (
    <ul
      data-testid="tiri-mia-azione"
      aria-label={t('telefono.tiri.mia_aria')}
      aria-expanded={aperta}
      role="button"
      tabIndex={0}
      onClick={alterna}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          alterna();
        }
      }}
      className="flex cursor-pointer flex-col gap-1.5 select-none"
    >
      {tiri.map((tiro, i) => (
        <li key={tiro.id}>
          <CartaTiro tiro={tiro} variante="telefono" compatta={!aperta} indice={i} anima={fresca(stato, tiro)} />
        </li>
      ))}
    </ul>
  );
}
