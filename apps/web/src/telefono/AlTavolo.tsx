/**
 * «Al tavolo»: le azioni pubbliche in attesa degli ALTRI giocatori (nome, testo, stato, e
 * «con Ginestra» se si appoggiano a un'altra). Serve a coordinarsi come al tavolo vero
 * («anch'io»). Le azioni private non arrivano mai qui (le filtra il server).
 *
 * Compatta per non schiacciare la casella su 390×844: una riga per azione (testo troncato) e al
 * massimo `RIGHE_CHIUSA` righe; un tocco la apre (testi interi) o la richiude.
 */
import { useState } from 'react';
import clsx from 'clsx';
import type { AzioneAlTavolo, StatoTavolo } from '@cantastorie/shared';
import { altriAlTavolo, conChi, ETICHETTA_STATO_AZIONE } from './vista';

/** Righe visibili a sezione chiusa. */
const RIGHE_CHIUSA = 2;

export function AlTavolo({ stato, idPg }: { stato: StatoTavolo; idPg: string }) {
  const [aperta, setAperta] = useState(false);
  const altre = altriAlTavolo(stato, idPg);
  if (altre.length === 0) return null;

  const visibili = aperta ? altre : altre.slice(0, RIGHE_CHIUSA);
  const nascoste = altre.length - visibili.length;
  const alterna = () => setAperta((a) => !a);

  return (
    <section
      data-testid="al-tavolo"
      aria-label="Azioni degli altri al tavolo"
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
        <span>Al tavolo</span>
        <span className="tracking-normal normal-case">
          {aperta ? 'tocca per ridurre' : nascoste > 0 ? `+${nascoste} · tocca per vedere` : 'tocca per leggere tutto'}
        </span>
      </div>
      <ul className={clsx('mt-1 flex flex-col', aperta ? 'max-h-[40dvh] gap-2 overflow-y-auto' : 'gap-0.5')}>
        {visibili.map((a) => (
          <RigaAlTavolo key={a.id} azione={a} intera={aperta} turnoAperto={stato.finestra.aperta ? stato.finestra.turno : null} />
        ))}
      </ul>
    </section>
  );
}

function RigaAlTavolo({ azione, intera, turnoAperto }: { azione: AzioneAlTavolo; intera: boolean; turnoAperto: number | null }) {
  const con = conChi(azione.dipende_da);
  // Scritta mentre il narratore parlava (o a finestra chiusa): entra nel turno dopo.
  const prossimo = turnoAperto === null || azione.turno > turnoAperto;
  const daDecidere = azione.stato === 'da_confermare';
  const nome = azione.nome.split(' ')[0] ?? azione.nome;
  return (
    <li
      data-testid={`al-tavolo-${azione.id_pg}`}
      data-stato={azione.stato}
      className={clsx('flex gap-2 text-[0.95rem] leading-snug', intera ? 'flex-wrap items-baseline' : 'min-h-7 items-center')}
    >
      <strong className="shrink-0 font-bold text-pergamena">{nome}</strong>
      <span className={clsx('min-w-0 flex-1 text-pergamena-2', intera ? 'break-words' : 'truncate')}>{azione.testo}</span>
      {con && <span className="shrink-0 text-sm text-lago">{con}</span>}
      <span
        className={clsx(
          'shrink-0 rounded-full px-2 py-px text-xs font-bold',
          daDecidere ? 'bg-candela/90 text-notte' : 'border border-pergamena-2/50 text-pergamena-2',
        )}
      >
        {ETICHETTA_STATO_AZIONE[azione.stato]}
        {prossimo && azione.stato === 'in_coda' ? ' · prossimo turno' : ''}
      </span>
    </li>
  );
}
