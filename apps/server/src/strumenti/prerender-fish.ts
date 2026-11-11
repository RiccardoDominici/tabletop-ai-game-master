/**
 * Pre-generazione delle battute del repertorio con drama-3 (fish-audio/drama-3 via OpenRouter).
 *
 * Ogni riga produce la STESSA chiave che il server cerca quando la battuta esce
 * (voce/pipeline.ts → cachePer → chiaveAudioEspressiva), calcolata con le stesse funzioni:
 *   testo di voce   = testoPerVoce (pulizia + pronuncia, come regia.ts)
 *   testo espressivo = testoEspressivoDi (guardia + direzione predefinita di chi parla)
 *   chiave           = sha256("fish:<voce_id>\n<testo espressivo>")
 * Così il file scritto qui è quello che la pipeline trova al gioco. Le righe già in cache si saltano:
 * una riga già detta non si paga due volte.
 */
import type { Campagna } from '../campagna/tipi';
import type { Repertorio } from '../repertorio/tipi';
import type { Logger } from '../logger';
import { voceDi } from '../turni/narrazione';
import { CacheAudio, chiaveAudioEspressiva, testoPerVoce, type MotivoDaGenerare } from '../voce/cache-audio';
import { direzionePredefinita, soloParole, testoEspressivoDi } from '../voce/espressione';
import { costoFish, DOLLARI_PER_BYTE, MotoreVoceFish } from '../voce/fish';
import type { Pronunciatore } from '../voce/pronuncia';
import type { VoceRegistro } from '../voce/registro-voci';
import { ErroreVoce } from '../voce/tipi';

/** Una riga del repertorio, unica per chiave (la stessa riga in due battute è un solo file). */
export interface RigaFish {
  chiave: string;
  voce: string;
  /** Battuta e posizione, per il log (es. «soglia/v1#2»). */
  dove: string;
  /** Testo mostrato (senza markup). */
  mostrato: string;
  /** Testo che va a drama-3: direzione, suoni, tag e pronuncia dei nomi. */
  espressivo: string;
  byte: number;
  usd: number;
}

export interface PianoFish {
  righe: number;
  unici: RigaFish[];
}

/** Piano del repertorio: tutte le righe, deduplicate per chiave, con byte e costo stimato. */
export function pianoFish(campagna: Campagna, repertorio: Repertorio, pronuncia: Pronunciatore): PianoFish {
  const unici = new Map<string, RigaFish>();
  let righe = 0;
  for (const b of repertorio.battute) {
    [b.testo, ...b.varianti].forEach((versione, v) =>
      versione.forEach((riga, i) => {
        righe++;
        const voce = voceDi(campagna, riga.etichetta).voce_id;
        const { mostrato, voce: testoVoce } = testoPerVoce(riga.etichetta, riga.testo, pronuncia);
        // Stesso parlante che usa la pipeline (frase.parlante = etichetta della riga).
        const { espressivo } = testoEspressivoDi(testoVoce, direzionePredefinita(campagna, riga.etichetta));
        const chiave = chiaveAudioEspressiva('fish', voce, espressivo);
        if (unici.has(chiave)) return;
        const { byte, usd } = costoFish(espressivo);
        unici.set(chiave, {
          chiave,
          voce,
          dove: `${b.id}${v ? `/v${v}` : ''}#${i + 1}`,
          mostrato: soloParole(mostrato),
          espressivo,
          byte,
          usd,
        });
      }),
    );
  }
  return { righe, unici: [...unici.values()] };
}

/** Righe del piano che non hanno ancora il file in cache (le sole che si pagano). */
export function daGenerare(piano: PianoFish, cache: CacheAudio): RigaFish[] {
  return piano.unici.filter((r) => !cache.ha(r.chiave));
}

export interface RiassuntoFish {
  righe: number;
  voci: number;
  in_cache: number;
  da_generare: number;
  byte_totali: number;
  costo_totale_usd: number;
  byte_da_generare: number;
  costo_da_generare_usd: number;
  tariffa_usd_per_byte: number;
  /** Why the lines to generate are missing: never generated, a respelling changed by the lexicon, another direction. */
  da_generare_per_motivo: Record<MotivoDaGenerare, number>;
  /** A few lines whose pronunciation changed (shown text), for the report. */
  esempi_pronuncia: string[];
}

/** Lines to generate counted by why they are missing (CacheAudio.motivo), with a few lexicon-change examples. */
export function perMotivo(righe: ReadonlyArray<{ voce: string; mostrato: string; testoVoce: string }>, cache: CacheAudio): { da_generare_per_motivo: Record<MotivoDaGenerare, number>; esempi_pronuncia: string[] } {
  const conti: Record<MotivoDaGenerare, number> = { nuova: 0, pronuncia: 0, direzione: 0 };
  const esempi: string[] = [];
  for (const r of righe) {
    const m = cache.motivo(r.voce, r.mostrato, r.testoVoce);
    conti[m] += 1;
    if (m === 'pronuncia' && esempi.length < 3) esempi.push(r.mostrato.slice(0, 80));
  }
  return { da_generare_per_motivo: conti, esempi_pronuncia: esempi };
}

export function riassuntoFish(piano: PianoFish, cache: CacheAudio): RiassuntoFish {
  const mancanti = daGenerare(piano, cache);
  const somma = (rs: RigaFish[], campo: 'byte' | 'usd') => rs.reduce((a, r) => a + r[campo], 0);
  return {
    righe: piano.righe,
    voci: piano.unici.length,
    in_cache: piano.unici.length - mancanti.length,
    da_generare: mancanti.length,
    byte_totali: somma(piano.unici, 'byte'),
    costo_totale_usd: somma(piano.unici, 'usd'),
    byte_da_generare: somma(mancanti, 'byte'),
    costo_da_generare_usd: somma(mancanti, 'usd'),
    tariffa_usd_per_byte: DOLLARI_PER_BYTE,
    ...perMotivo(mancanti.map((r) => ({ voce: r.voce, mostrato: r.mostrato, testoVoce: r.espressivo })), cache),
  };
}

export interface OpzioniGenerazioneFish {
  /** Cache di drama-3 (cache/audio-fish): la stessa che legge il server. */
  cache: CacheAudio;
  motore: MotoreVoceFish;
  voci: Map<string, VoceRegistro>;
  log: Logger;
  /** Pausa tra un tentativo e l'altro (ms); per i test si abbassa. */
  attesaMs?: number;
}

/** Errori che non vale la pena ritentare (crediti finiti, chiave rifiutata). */
const FERMA_TUTTO = new Set([401, 402, 403]);

export interface EsitoGenerazioneFish {
  generate: number;
  fallite: number;
  byte: number;
  usd: number;
}

/**
 * Genera le righe mancanti una alla volta e le scrive nella cache di drama-3. Un errore su una riga
 * non ferma le altre (si riparte dalla cache); un errore di credito o di chiave ferma tutto.
 */
export async function generaFish(righe: RigaFish[], opz: OpzioniGenerazioneFish): Promise<EsitoGenerazioneFish> {
  const esito: EsitoGenerazioneFish = { generate: 0, fallite: 0, byte: 0, usd: 0 };
  const attesa = opz.attesaMs ?? 2000;
  for (const [i, r] of righe.entries()) {
    const t0 = performance.now();
    for (let tentativo = 1; ; tentativo++) {
      try {
        const flusso = await opz.motore.sintetizza(
          { id: `pre-${r.chiave.slice(0, 12)}`, voce: r.voce, testo: soloParole(r.espressivo), espressivo: r.espressivo },
          new AbortController().signal,
        );
        const pezzi: Buffer[] = [];
        for await (const p of flusso.pezzi) pezzi.push(Buffer.from(p));
        let pcm = Buffer.concat(pezzi);
        if (pcm.length % 2) pcm = pcm.subarray(0, pcm.length - 1);
        if (pcm.length === 0) throw new ErroreVoce('audio vuoto', 502);
        opz.cache.scrivi(r.chiave, pcm, { voce: r.voce, testo: r.espressivo, mostrato: r.mostrato, sample_rate: flusso.sampleRate });
        const secondi = pcm.length / 2 / flusso.sampleRate;
        esito.generate++;
        esito.byte += r.byte;
        esito.usd += r.usd;
        opz.log.info(
          { chiave: r.chiave, dove: r.dove, voce: r.voce, byte_testo: r.byte, secondi: Math.round(secondi * 100) / 100, costo_usd: r.usd, ms: Math.round(performance.now() - t0) },
          'prerender fish: riga generata',
        );
        console.log(`  [${i + 1}/${righe.length}] ${r.dove} · ${r.voce} · ${secondi.toFixed(1)} s · ${r.byte} byte`);
        break;
      } catch (err) {
        const stato = err instanceof ErroreVoce ? err.stato : 0;
        if (FERMA_TUTTO.has(stato)) throw err;
        if (tentativo >= (stato === 503 || stato === 429 ? 10 : 3)) {
          esito.fallite++;
          opz.log.error({ chiave: r.chiave, dove: r.dove, err: (err as Error).message }, 'prerender fish: riga fallita');
          console.error(`  fallita ${r.dove}: ${(err as Error).message}`);
          break;
        }
        await new Promise((res) => setTimeout(res, attesa));
      }
    }
  }
  return esito;
}

/** Controlla che ogni voce del piano abbia il reference_id Fish, prima di spendere. */
export function vociSenzaFish(piano: PianoFish, voci: Map<string, VoceRegistro>): string[] {
  const usate = [...new Set(piano.unici.map((r) => r.voce))];
  return usate.filter((v) => !voci.get(v)?.fish);
}
