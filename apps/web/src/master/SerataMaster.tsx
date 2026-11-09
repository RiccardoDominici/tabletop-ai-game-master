/**
 * Il riquadro «Serata» nella sezione Sessione: quanto dura la serata prevista e da dove viene, quanto
 * tempo è passato e quanto manca, il preavviso di fine (con il climax che la trattiene), la durata da
 * impostare a mano e «Chiudi la sessione» (chiusura guidata: narrazione di chiusura e riassunto).
 * «Chiudi la sessione» si conferma col secondo clic, come «Fine sessione».
 */
import { useEffect, useState } from 'react';
import type { SerataMaster } from '@cantastorie/shared';
import { avvisoFineVicina, MAX_ORE_SERATA, MIN_ORE_SERATA, oreValide, PASSO_ORE_SERATA, testoMinuti, testoOre } from '../lib/serata';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { classePulsante } from './stili';
import { useConferma } from './useConferma';

const ORIGINE: Record<SerataMaster['origine_ore'], string> = {
  brief: 'dal brief',
  predefinito: 'predefinita',
  master: 'impostata dal master',
};

export function SerataMasterRiquadro({ serata }: { serata: SerataMaster }) {
  const durataInCorso = useInCorso('durata_sessione');
  const chiudiInCorso = useInCorso('chiudi_sessione');
  const [confermaChiudi, clicChiudi] = useConferma(() => void inviaComando({ tipo: 'chiudi_sessione' }, 'Chiudi la sessione'));
  const [oreTesto, setOreTesto] = useState(String(serata.ore));

  // Quando il server cambia la durata (comando, o brief ricaricato) il campo segue.
  useEffect(() => setOreTesto(String(serata.ore)), [serata.ore]);

  const ore = Number(oreTesto.replace(',', '.'));
  const oreOk = oreTesto.trim() !== '' && oreValide(ore);
  const imposta = () => {
    if (!oreOk) return;
    void inviaComando({ tipo: 'durata_sessione', ore }, `Durata della serata: ${testoOre(ore)}`);
  };

  return (
    <div data-testid="master-serata" className="flex flex-col gap-2 rounded-lg border border-bordo bg-notte/60 p-2.5">
      <h3 className="font-titolo text-xs font-semibold tracking-[0.14em] text-candela uppercase">Serata</h3>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        <dt className="text-cenere">durata</dt>
        <dd data-testid="master-serata-durata" className="tabular-nums">
          {testoOre(serata.ore)} <span className="text-cenere">({ORIGINE[serata.origine_ore]})</span>
        </dd>
        <dt className="text-cenere">passati</dt>
        <dd data-testid="master-serata-passati" className="tabular-nums">
          {serata.minuti_passati === null ? 'la serata non è ancora cominciata' : testoMinuti(serata.minuti_passati)}
        </dd>
        <dt className="text-cenere">rimasti</dt>
        <dd data-testid="master-serata-rimasti" className="tabular-nums">
          {serata.minuti_rimasti === null ? '—' : testoMinuti(serata.minuti_rimasti)}
        </dd>
      </dl>

      {serata.fine_vicina && serata.minuti_rimasti !== null && (
        <p
          role="status"
          data-testid="master-serata-avviso"
          className="rounded-md border border-candela/70 bg-candela/15 px-2 py-1 text-sm font-semibold text-candela-2"
        >
          {avvisoFineVicina(serata.minuti_rimasti, serata.climax)}
        </p>
      )}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          imposta();
        }}
      >
        <label className="flex items-center gap-1.5 text-sm text-cenere">
          ore
          <input
            type="number"
            inputMode="decimal"
            data-testid="master-serata-ore"
            min={MIN_ORE_SERATA}
            max={MAX_ORE_SERATA}
            step={PASSO_ORE_SERATA}
            value={oreTesto}
            onChange={(e) => setOreTesto(e.target.value)}
            className="w-20 rounded-md border border-bordo-chiaro bg-notte-3 px-2 py-1 text-sm tabular-nums text-pergamena"
          />
        </label>
        <button
          type="submit"
          data-testid="master-serata-imposta"
          disabled={!oreOk || durataInCorso}
          className={classePulsante('normale', 'piccolo')}
        >
          Imposta durata
        </button>
      </form>

      <button
        type="button"
        data-testid="chiudi-sessione"
        data-conferma={String(confermaChiudi)}
        disabled={!serata.chiudibile || serata.chiusura_in_corso || chiudiInCorso}
        onClick={clicChiudi}
        title="Chiusura guidata: il narratore chiude la scena e il proiettore mostra «Cosa è successo stasera»"
        className={classePulsante(confermaChiudi ? 'pericolo' : 'primario', 'medio')}
      >
        {confermaChiudi ? 'Confermi la chiusura della serata?' : 'Chiudi la sessione'}
      </button>
      {serata.chiusura_in_corso && <p className="text-xs text-cenere">Chiusura in corso: il narratore scrive il riassunto.</p>}
      {serata.chiusa && <p className="text-xs text-cenere">Serata chiusa: «Riprendi» la riapre; la sessione resta salvata.</p>}
    </div>
  );
}
