/**
 * Riga compatta dello stato della finestra, in basso a sinistra: chi è chiamato, chi ha già inviato
 * (inviare = ha finito), «Aspettiamo: Paolo e Giulia», e il conto alla rovescia SOLO al ritmo
 * concitato. A finestra chiusa dice cosa succede, con il nome di chi parla davvero (etichettaFase).
 */
import clsx from 'clsx';
import type { StatoTavolo } from '@cantastorie/shared';
import { testoAttesa } from '../lib/attesa';
import { secondiRimasti } from '../lib/formato';
import { useOra } from '../lib/useOra';
import { useSchermo } from '../store/schermo';
import { etichettaFase } from './etichettaFase';
import { t } from '../lingua';

export function RigaFinestra({ stato }: { stato: StatoTavolo }) {
  const { finestra } = stato;
  const aperta = stato.fase === 'finestra' && finestra.aperta;
  const ora = useOra(aperta && finestra.chiusura_prevista_ms !== null);
  // Chi suona ADESSO sulla linea del tempo audio (non chi è arrivato dal server).
  const inOnda = useSchermo((s) => s.inOnda);

  if (!aperta) {
    return (
      <p data-testid="riga-finestra" className="text-[1.5vw] text-pergamena-2 drop-shadow-[0_2px_6px_rgb(0_0_0/0.9)]">
        {etichettaFase(stato.fase, inOnda)}
      </p>
    );
  }

  const tutti = finestra.invitati.includes('tutti');
  const invitati = tutti ? stato.pg.map((p) => p.id) : finestra.invitati;
  const secondi = finestra.chiusura_prevista_ms !== null ? secondiRimasti(finestra.chiusura_prevista_ms, ora) : null;
  const attesa = testoAttesa(stato);

  return (
    <div data-testid="riga-finestra" data-ritmo={stato.ritmo} className="flex flex-col gap-[0.6vh]">
      <div className="flex flex-wrap items-center gap-[0.8vw] text-[1.45vw]">
        <span className="font-semibold text-pergamena drop-shadow-[0_2px_6px_rgb(0_0_0/0.9)]">{t('schermo.finestra.tocca_a')}</span>
        {invitati.map((id) => {
          const pg = stato.pg.find((p) => p.id === id);
          const scritta = finestra.azioni.find((a) => a.id_pg === id)?.scritta ?? false;
          return (
            <span
              key={id}
              data-testid={`schermo-invitato-${id}`}
              data-scritta={scritta}
              className={clsx(
                'rounded-full border px-[0.9vw] py-[0.3vh]',
                scritta ? 'border-muschio/70 bg-muschio/20 text-muschio' : 'border-bordo-chiaro bg-notte/80 text-pergamena',
              )}
            >
              <span className="font-semibold">{pg?.nome.split(' ')[0] ?? id}</span>
              <span className="ml-[0.5vw] opacity-90">{scritta ? t('schermo.finestra.ha_scritto') : t('schermo.finestra.pensa')}</span>
            </span>
          );
        })}
        {secondi !== null && (
          // Solo al ritmo concitato: la narrazione ha chiesto di fare in fretta.
          <span data-testid="schermo-conto" className="ml-[0.5vw] rounded-full bg-candela px-[0.9vw] py-[0.3vh] font-bold text-notte tabular-nums">
            {t('schermo.finestra.conto', { secondi })}
          </span>
        )}
      </div>
      {attesa && (
        <p data-testid="schermo-aspettiamo" className="text-[1.35vw] text-pergamena-2 drop-shadow-[0_2px_6px_rgb(0_0_0/0.9)]">
          {attesa}
        </p>
      )}
    </div>
  );
}
