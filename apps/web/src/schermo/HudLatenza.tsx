/**
 * HUD di latenza (tasto «L» o pulsante): l'ultima riga di `metriche:turno` (tutti i campi) e i
 * contatori del lettore audio, più i comandi «Ferma» / «Ricomincia».
 * I contatori del lettore si leggono 4 volte al secondo solo mentre l'HUD è aperto.
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { MisureTurno } from '@cantastorie/shared';
import { formattaCosto, formattaMs } from '../lib/formato';
import { useTavolo } from '../store/tavolo';
import { useSchermo } from '../store/schermo';
import { statisticheAudio } from './audioSchermo';
import { debugSchermo } from './debug';
import { fermaScena, ricominciaScena } from './sessione';

const AGGIORNAMENTO_MS = 250;
/** Il secondo clic su «Ricomincia» vale solo entro questo tempo (evita ripartenze per sbaglio). */
const FINESTRA_CONFERMA_MS = 3000;

/** Campi in ms delle misure, nell'ordine in cui accadono nel turno. */
const CAMPI_MS: ReadonlyArray<readonly [keyof MisureTurno, string]> = [
  ['finestra_ms', 'finestra'],
  ['voce_sveglia', 'voce sveglia'],
  ['llm_primo_token', 'LLM primo token'],
  ['llm_prima_frase', 'LLM prima frase'],
  ['voce_richiesta', 'voce richiesta'],
  ['voce_primo_audio', 'voce primo audio'],
  ['schermo_inizio_audio', 'schermo inizio audio'],
  ['llm_fine', 'LLM fine'],
  ['audio_fine', 'audio fine'],
];

export function HudLatenza() {
  const metriche = useTavolo((s) => s.metriche);
  const stato = useTavolo((s) => s.stato);
  const esitoComando = useSchermo((s) => s.esitoComando);
  const [audio, setAudio] = useState(() => statisticheAudio());
  const [confermaRicomincia, setConfermaRicomincia] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setAudio(statisticheAudio()), AGGIORNAMENTO_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!confermaRicomincia) return;
    const timer = window.setTimeout(() => setConfermaRicomincia(false), FINESTRA_CONFERMA_MS);
    return () => window.clearTimeout(timer);
  }, [confermaRicomincia]);

  const ricomincia = () => {
    if (!confermaRicomincia) {
      setConfermaRicomincia(true);
      return;
    }
    setConfermaRicomincia(false);
    void ricominciaScena();
  };

  return (
    <aside
      data-testid="hud"
      className="fixed top-4 right-4 z-30 max-h-[calc(100dvh-12vw)] w-[30rem] overflow-y-auto rounded-2xl border border-bordo-chiaro bg-notte/95 p-4 font-mono text-[15px] text-pergamena shadow-profonda"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-sans text-xl font-bold text-candela">Latenza</h2>
        <span className="text-cenere">L per chiudere</span>
      </div>

      <Sezione titolo={metriche ? `Turno ${metriche.turno} · voce ${metriche.voce_motore}` : 'Nessun turno misurato'}>
        {metriche && (
          <>
            <Riga nome="t0 (chiusura finestra)" valore={new Date(metriche.ts).toLocaleTimeString('it-IT')} />
            {CAMPI_MS.map(([campo, nome]) => (
              <Riga key={campo} nome={nome} valore={formattaMs(metriche[campo] as number | null)} />
            ))}
            <Riga
              nome="token in/out"
              valore={`${metriche.token_ingresso} / ${metriche.token_uscita}`}
            />
            <Riga
              nome="token cache lett./scritt."
              valore={`${metriche.token_cache_lettura} / ${metriche.token_cache_scrittura}`}
            />
            <Riga nome="costo" valore={formattaCosto(metriche.costo_usd)} />
            <Riga
              nome="buchi (in frase / tra frasi)"
              valore={metriche.buchi === null ? '—' : `${metriche.buchi} (${metriche.buchi_in_frase} / ${metriche.buchi_tra_frasi})`}
              evidenzia={(metriche.buchi_in_frase ?? 0) > 0}
            />
            <Riga nome="silenzio dai buchi" valore={formattaMs(metriche.silenzio_ms)} />
          </>
        )}
      </Sezione>

      <Sezione titolo="Lettore audio">
        <Riga nome="AudioContext" valore={`${audio.stato}${audio.sampleRate ? ` · ${audio.sampleRate} Hz` : ''}`} />
        <Riga nome="latenza uscita / base" valore={`${fmt(audio.latenzaUscitaMs)} / ${fmt(audio.latenzaBaseMs)}`} />
        <Riga nome="jitter iniziale" valore={formattaMs(audio.jitterMs)} />
        <Riga nome="audio in coda" valore={formattaMs(audio.anticipoMs)} />
        <Riga nome="pezzi ricevuti" valore={`${audio.pezzi} (${(audio.byte / 1024).toFixed(0)} KiB)`} />
        <Riga nome="secondi programmati" valore={audio.secondiProgrammati.toFixed(2)} />
        <Riga nome="buchi" valore={String(audio.buchi)} evidenzia={audio.buchi > 0} />
        <Riga nome="frasi iniziate" valore={String(debugSchermo.frasiIniziate)} />
        <Riga nome="sorgenti attive / segni" valore={`${audio.sorgentiAttive} / ${audio.segniInAttesa}`} />
        {(audio.pezziSenzaFrase > 0 || audio.byteOrfani > 0) && (
          <Riga nome="scartati (senza frase / byte orfani)" valore={`${audio.pezziSenzaFrase} / ${audio.byteOrfani}`} evidenzia />
        )}
      </Sezione>

      <Sezione titolo="Tavolo">
        <Riga nome="fase / turno" valore={stato ? `${stato.fase} / ${stato.turno}` : '—'} />
        <Riga nome="luogo" valore={stato?.scena.luogo ?? '—'} />
        <Riga
          nome="immagine / dissolvenze"
          valore={`${debugSchermo.immagine?.split('/').pop() ?? 'atmosfera'} / ${debugSchermo.transizioni}`}
        />
        <Riga nome="versione stato / scena" valore={stato ? `${stato.versione_stato} / ${stato.versione_scena}` : '—'} />
        <Riga nome="voce" valore={stato?.voce_motore ?? '—'} />
      </Sezione>

      <div className="mt-3 grid grid-cols-2 gap-2 font-sans">
        <button
          type="button"
          data-testid="ferma-scena"
          onClick={() => void fermaScena()}
          className="min-h-11 rounded-lg border border-sangue/70 text-base font-bold text-sangue hover:bg-sangue/10"
        >
          Ferma
        </button>
        <button
          type="button"
          data-testid="ricomincia-scena"
          onClick={ricomincia}
          className="min-h-11 rounded-lg border border-candela/70 text-base font-bold text-candela hover:bg-candela/10"
        >
          {confermaRicomincia ? 'Conferma: ricomincia' : 'Ricomincia'}
        </button>
      </div>
      {esitoComando && <p className="mt-2 font-sans text-base text-pergamena-2">{esitoComando}</p>}
    </aside>
  );
}

function fmt(ms: number | null): string {
  return ms === null ? '—' : `${ms.toFixed(1)} ms`;
}

function Sezione({ titolo, children }: { titolo: string; children?: ReactNode }) {
  return (
    <section className="mt-3 border-t border-bordo pt-2">
      <h3 className="mb-1 font-sans text-base font-bold text-pergamena-2">{titolo}</h3>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">{children}</dl>
    </section>
  );
}

function Riga({ nome, valore, evidenzia = false }: { nome: string; valore: string; evidenzia?: boolean }) {
  return (
    <>
      <dt className="text-cenere">{nome}</dt>
      <dd className={evidenzia ? 'text-right font-bold text-brace' : 'text-right tabular-nums'}>{valore}</dd>
    </>
  );
}
