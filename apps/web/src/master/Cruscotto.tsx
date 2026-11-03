/**
 * Griglia del pannello per lo schermo del Mac (1440–1920 px): tre colonne che scorrono ciascuna
 * per conto suo, così i comandi in alto restano sempre visibili.
 * - sinistra: scena e luogo, audio (musica, umori, effetti), situazioni, orologi (cosa c'è sul
 *   proiettore e cosa incombe);
 * - centro: finestra, azioni, trascrizione (cosa succede adesso al tavolo);
 * - destra: note di regia, repertorio (solo modalità B), sessione salvata, registro dei comandi.
 * Sotto i 1280 px le colonne diventano due e la pagina scorre intera.
 */
import type { StatoMaster } from '@cantastorie/shared';
import { SezioneScena } from './SezioneScena';
import { SezioneSituazioni } from './SezioneSituazioni';
import { SezioneAudio } from './SezioneAudio';
import { SezioneOrologi } from './SezioneOrologi';
import { SezioneFinestra } from './SezioneFinestra';
import { SezioneAzioni } from './SezioneAzioni';
import { SezioneTrascrizione } from './SezioneTrascrizione';
import { SezioneNote } from './SezioneNote';
import { SezioneRepertorio } from './SezioneRepertorio';
import { SezioneEventi } from './SezioneEventi';
import { SezioneSessione } from './SezioneSessione';

const COLONNA = 'flex min-h-0 flex-col gap-3 xl:overflow-y-auto xl:pr-1';

export function Cruscotto({ stato }: { stato: StatoMaster }) {
  return (
    <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className={COLONNA}>
        <SezioneScena stato={stato} />
        <SezioneAudio stato={stato} />
        <SezioneSituazioni stato={stato} />
        <SezioneOrologi stato={stato} />
      </div>

      {/* Colonna centrale: le azioni scorrono dentro il loro riquadro, la trascrizione prende il resto. */}
      <div className="flex min-h-0 flex-col gap-3 xl:overflow-hidden">
        <SezioneFinestra stato={stato} />
        <SezioneAzioni stato={stato} className="max-h-[45vh] min-h-0 shrink-0 xl:max-h-[42%]" />
        <SezioneTrascrizione voci={stato.tavolo.trascrizione} className="h-[32rem] min-h-0 xl:h-auto xl:min-h-64 xl:flex-1" />
      </div>

      <div className={`${COLONNA} lg:col-span-2 xl:col-span-1`}>
        <SezioneNote stato={stato} />
        {stato.repertorio !== null && <SezioneRepertorio repertorio={stato.repertorio} />}
        <SezioneSessione stato={stato} />
        {/* Il registro prende lo spazio che resta e scorre dentro di sé (almeno 14rem). */}
        <SezioneEventi eventi={stato.eventi} className="max-h-[60vh] min-h-56 xl:max-h-none xl:flex-1" />
      </div>
    </main>
  );
}
