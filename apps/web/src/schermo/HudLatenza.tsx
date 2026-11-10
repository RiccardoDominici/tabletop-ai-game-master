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
import { t, type Chiave } from '../lingua';

const AGGIORNAMENTO_MS = 250;
/** Il secondo clic su «Ricomincia» vale solo entro questo tempo (evita ripartenze per sbaglio). */
const FINESTRA_CONFERMA_MS = 3000;

/** Campi in ms delle misure, nell'ordine in cui accadono nel turno. */
const CAMPI_MS: ReadonlyArray<readonly [keyof MisureTurno, Chiave]> = [
  ['finestra_ms', 'schermo.hud.campo.finestra'],
  ['voce_sveglia', 'schermo.hud.campo.voce_sveglia'],
  ['llm_primo_token', 'schermo.hud.campo.llm_primo_token'],
  ['llm_prima_frase', 'schermo.hud.campo.llm_prima_frase'],
  ['voce_richiesta', 'schermo.hud.campo.voce_richiesta'],
  ['voce_primo_audio', 'schermo.hud.campo.voce_primo_audio'],
  ['schermo_inizio_audio', 'schermo.hud.campo.schermo_inizio_audio'],
  ['llm_fine', 'schermo.hud.campo.llm_fine'],
  ['audio_fine', 'schermo.hud.campo.audio_fine'],
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
        <h2 className="font-sans text-xl font-bold text-candela">{t('schermo.hud.titolo')}</h2>
        <span className="text-cenere">{t('schermo.hud.chiudi')}</span>
      </div>

      <Sezione titolo={metriche ? t('schermo.hud.turno', { turno: metriche.turno, voce: metriche.voce_motore }) : t('schermo.hud.nessun_turno')}>
        {metriche && (
          <>
            <Riga nome={t('schermo.hud.t0')} valore={new Date(metriche.ts).toLocaleTimeString('it-IT')} />
            {CAMPI_MS.map(([campo, chiave]) => (
              <Riga key={campo} nome={t(chiave)} valore={formattaMs(metriche[campo] as number | null)} />
            ))}
            <Riga
              nome={t('schermo.hud.token_in_out')}
              valore={`${metriche.token_ingresso} / ${metriche.token_uscita}`}
            />
            <Riga
              nome={t('schermo.hud.token_cache')}
              valore={`${metriche.token_cache_lettura} / ${metriche.token_cache_scrittura}`}
            />
            <Riga nome={t('schermo.hud.costo')} valore={formattaCosto(metriche.costo_usd)} />
            <Riga
              nome={t('schermo.hud.buchi')}
              valore={metriche.buchi === null ? '—' : `${metriche.buchi} (${metriche.buchi_in_frase} / ${metriche.buchi_tra_frasi})`}
              evidenzia={(metriche.buchi_in_frase ?? 0) > 0}
            />
            <Riga nome={t('schermo.hud.silenzio_buchi')} valore={formattaMs(metriche.silenzio_ms)} />
          </>
        )}
      </Sezione>

      <Sezione titolo={t('schermo.hud.lettore')}>
        <Riga nome="AudioContext" valore={`${audio.stato}${audio.sampleRate ? ` · ${audio.sampleRate} Hz` : ''}`} />
        <Riga nome={t('schermo.hud.latenza_uscita')} valore={`${fmt(audio.latenzaUscitaMs)} / ${fmt(audio.latenzaBaseMs)}`} />
        <Riga nome={t('schermo.hud.jitter')} valore={formattaMs(audio.jitterMs)} />
        <Riga nome={t('schermo.hud.coda')} valore={formattaMs(audio.anticipoMs)} />
        <Riga nome={t('schermo.hud.pezzi')} valore={`${audio.pezzi} (${(audio.byte / 1024).toFixed(0)} KiB)`} />
        <Riga nome={t('schermo.hud.secondi_programmati')} valore={audio.secondiProgrammati.toFixed(2)} />
        <Riga nome={t('schermo.hud.buchi_breve')} valore={String(audio.buchi)} evidenzia={audio.buchi > 0} />
        <Riga nome={t('schermo.hud.frasi_iniziate')} valore={String(debugSchermo.frasiIniziate)} />
        <Riga nome={t('schermo.hud.sorgenti')} valore={`${audio.sorgentiAttive} / ${audio.segniInAttesa}`} />
        {(audio.pezziSenzaFrase > 0 || audio.byteOrfani > 0) && (
          <Riga nome={t('schermo.hud.scartati')} valore={`${audio.pezziSenzaFrase} / ${audio.byteOrfani}`} evidenzia />
        )}
      </Sezione>

      <Sezione titolo={t('schermo.hud.tavolo')}>
        <Riga nome={t('schermo.hud.fase_turno')} valore={stato ? `${stato.fase} / ${stato.turno}` : '—'} />
        <Riga nome={t('schermo.hud.luogo')} valore={stato?.scena.luogo ?? '—'} />
        <Riga
          nome={t('schermo.hud.immagine')}
          valore={`${debugSchermo.immagine?.split('/').pop() ?? t('schermo.hud.atmosfera')} / ${debugSchermo.transizioni}`}
        />
        <Riga nome={t('schermo.hud.versioni')} valore={stato ? `${stato.versione_stato} / ${stato.versione_scena}` : '—'} />
        <Riga nome={t('schermo.hud.voce')} valore={stato?.voce_motore ?? '—'} />
      </Sezione>

      <div className="mt-3 grid grid-cols-2 gap-2 font-sans">
        <button
          type="button"
          data-testid="ferma-scena"
          onClick={() => void fermaScena()}
          className="min-h-11 rounded-lg border border-sangue/70 text-base font-bold text-sangue hover:bg-sangue/10"
        >
          {t('schermo.hud.ferma')}
        </button>
        <button
          type="button"
          data-testid="ricomincia-scena"
          onClick={ricomincia}
          className="min-h-11 rounded-lg border border-candela/70 text-base font-bold text-candela hover:bg-candela/10"
        >
          {confermaRicomincia ? t('schermo.hud.conferma_ricomincia') : t('schermo.hud.ricomincia')}
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
