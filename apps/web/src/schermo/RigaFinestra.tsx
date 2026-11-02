/**
 * Riga compatta dello stato della finestra, in basso a sinistra: chi è invitato, chi ha scritto,
 * chi è pronto, e il conto alla rovescia della chiusura automatica.
 */
import clsx from 'clsx';
import type { StatoTavolo } from '@cantastorie/shared';
import { secondiRimasti } from '../lib/formato';
import { useOra } from '../lib/useOra';

const ETICHETTA_FASE: Record<StatoTavolo['fase'], string> = {
  attesa: 'In attesa di cominciare',
  apertura: 'Il narratore apre la scena',
  finestra: 'Il narratore ascolta',
  narrazione: 'Il narratore sta parlando',
  fermata: 'Scena fermata',
};

export function RigaFinestra({ stato }: { stato: StatoTavolo }) {
  const { finestra } = stato;
  const aperta = stato.fase === 'finestra' && finestra.aperta;
  const ora = useOra(aperta && finestra.chiusura_prevista_ms !== null);

  if (!aperta) {
    return (
      <p data-testid="riga-finestra" className="text-[1.5vw] text-pergamena-2 drop-shadow-[0_2px_6px_rgb(0_0_0/0.9)]">
        {ETICHETTA_FASE[stato.fase]}
      </p>
    );
  }

  const tutti = finestra.invitati.includes('tutti');
  const invitati = tutti ? stato.pg.map((p) => p.id) : finestra.invitati;
  const secondi = finestra.chiusura_prevista_ms !== null ? secondiRimasti(finestra.chiusura_prevista_ms, ora) : null;

  return (
    <div data-testid="riga-finestra" className="flex flex-wrap items-center gap-[0.8vw] text-[1.45vw]">
      <span className="font-semibold text-pergamena drop-shadow-[0_2px_6px_rgb(0_0_0/0.9)]">Tocca a:</span>
      {invitati.map((id) => {
        const pg = stato.pg.find((p) => p.id === id);
        const azione = finestra.azioni.find((a) => a.id_pg === id);
        const pronto = azione?.pronto ?? false;
        const scritta = azione?.scritta ?? false;
        return (
          <span
            key={id}
            className={clsx(
              'rounded-full border px-[0.9vw] py-[0.3vh]',
              pronto ? 'border-muschio/70 bg-muschio/20 text-muschio' : 'border-bordo-chiaro bg-notte/80 text-pergamena',
            )}
          >
            <span className="font-semibold">{pg?.nome.split(' ')[0] ?? id}</span>
            <span className="ml-[0.5vw] opacity-90">{pronto ? '✓ pronto' : scritta ? '✎ ha scritto' : 'pensa…'}</span>
          </span>
        );
      })}
      {secondi !== null && (
        <span className="ml-[0.5vw] rounded-full bg-candela px-[0.9vw] py-[0.3vh] font-bold text-notte tabular-nums">
          {secondi} s
        </span>
      )}
    </div>
  );
}
