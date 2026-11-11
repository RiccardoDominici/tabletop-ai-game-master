/**
 * Pre-generazione dell'audio del repertorio. Due motori:
 *
 *   --motore qwen  (predefinito): ogni riga passa dal servizio voce locale e finisce in cache/audio.
 *   --motore fish : ogni riga passa da drama-3 (OpenRouter) e finisce in cache/audio-fish (chiave in
 *                   strumenti/prerender-fish.ts). Costa: $2 per milione di byte UTF-8.
 *
 * Uso:
 *   npx tsx apps/server/src/strumenti/prerender.ts [cartella] [--motore fish] [--dry-run] [--json] [--solo-conta]
 *
 *   cartella     campagna da usare (predefinita: TAGM_CARTELLA_CAMPAGNA o prova-f0)
 *   --dry-run    solo conteggio: righe, voci uniche, già in cache, byte e costo stimato. Non spende e non scrive.
 *   --json       con --dry-run, stampa il riassunto come una riga JSON (per strumenti/stato_preparazione.py)
 *   --solo-conta (Qwen) solo conteggio
 *
 * Le voci già presenti in cache si saltano. Log: logs/prerender.jsonl.
 */
import '../variabili-legacy';  // compatibilità CANTASTORIE_* → TAGM_*: deve precedere le letture dell'ambiente
import { parseArgs } from 'node:util';
import path from 'node:path';
import { setTimeout as attendi } from 'node:timers/promises';
import { caricaCampagna } from '../campagna/caricatore';
import { caricaConfig } from '../config';
import { impostaLingua } from '../lingua';
import { creaLogger } from '../logger';
import { caricaRepertorio } from '../repertorio/caricatore';
import { voceDi } from '../turni/narrazione';
import { CacheAudio, chiaveAudio, testoPerVoce } from '../voce/cache-audio';
import { MotoreVoceFish } from '../voce/fish';
import { MotoreVoceHttp } from '../voce/http';
import { creaPronunciatore } from '../voce/pronuncia';
import { caricaRegistroVoci } from '../voce/registro-voci';
import { ErroreVoce } from '../voce/tipi';
import { daGenerare, generaFish, pianoFish, riassuntoFish, vociSenzaFish } from './prerender-fish';

async function preGeneraQwen(campagna: ReturnType<typeof caricaCampagna>, repertorio: ReturnType<typeof caricaRepertorio>, config: ReturnType<typeof caricaConfig>, log: ReturnType<typeof creaLogger>, soloConta: boolean): Promise<void> {
  const pronuncia = creaPronunciatore(campagna);
  const cache = new CacheAudio(config.cacheAudio);
  const motore = new MotoreVoceHttp(config.voce.url, log);

  // Tutte le righe, senza doppioni (la stessa riga in due battute è un solo file).
  const voci = new Map<string, { chiave: string; voce: string; testoVoce: string; dove: string }>();
  let righe = 0;
  for (const b of repertorio.battute) {
    [b.testo, ...b.varianti].forEach((versione, v) =>
      versione.forEach((riga, i) => {
        righe++;
        const voce = voceDi(campagna, riga.etichetta).voce_id;
        const { voce: testoVoce } = testoPerVoce(riga.etichetta, riga.testo, pronuncia);
        const chiave = chiaveAudio(voce, testoVoce);
        if (!voci.has(chiave)) voci.set(chiave, { chiave, voce, testoVoce, dove: `${b.id}${v ? `/v${v}` : ''}#${i + 1}` });
      }),
    );
  }
  const mancanti = [...voci.values()].filter((v) => !cache.ha(v.chiave));
  console.log(`righe ${righe}, voci uniche ${voci.size}, già in cache ${voci.size - mancanti.length}, da generare ${mancanti.length}`);
  if (soloConta || mancanti.length === 0) return;

  const salute = await motore.salute();
  if (!salute.pronto) throw new Error('servizio voce non pronto');
  const inizio = performance.now();
  let secondiAudio = 0;
  let fatte = 0;
  for (const v of mancanti) {
    for (let tentativo = 1; ; tentativo++) {
      try {
        const t0 = performance.now();
        const flusso = await motore.sintetizza({ id: `pre-${v.chiave.slice(0, 12)}`, voce: v.voce, testo: v.testoVoce }, new AbortController().signal);
        const pezzi: Buffer[] = [];
        for await (const p of flusso.pezzi) pezzi.push(Buffer.from(p));
        let pcm = Buffer.concat(pezzi);
        if (pcm.length % 2) pcm = pcm.subarray(0, pcm.length - 1);
        cache.scrivi(v.chiave, pcm, { voce: v.voce, testo: v.testoVoce, sample_rate: flusso.sampleRate });
        const sec = pcm.length / 2 / flusso.sampleRate;
        secondiAudio += sec;
        fatte++;
        log.info({ chiave: v.chiave, dove: v.dove, voce: v.voce, secondi: sec, ms: Math.round(performance.now() - t0) }, 'prerender: voce generata');
        if (fatte % 10 === 0 || fatte === mancanti.length) {
          const min = (performance.now() - inizio) / 60_000;
          console.log(`${fatte}/${mancanti.length} · ${secondiAudio.toFixed(0)} s di audio · ${min.toFixed(1)} min`);
        }
        break;
      } catch (err) {
        // 503 = servizio in riscaldamento: si aspetta e si riprova. Altri errori: 3 tentativi.
        const stato = err instanceof ErroreVoce ? err.stato : 0;
        if (tentativo >= (stato === 503 ? 30 : 3)) {
          log.error({ chiave: v.chiave, dove: v.dove, err: (err as Error).message }, 'prerender: voce fallita');
          console.error(`fallita ${v.dove}: ${(err as Error).message}`);
          break;
        }
        await attendi(stato === 503 ? 2000 : 500);
      }
    }
  }
  const minuti = (performance.now() - inizio) / 60_000;
  console.log(`FATTO: ${fatte}/${mancanti.length} voci, ${(secondiAudio / 60).toFixed(1)} min di audio in ${minuti.toFixed(1)} min (RTF ${(minuti * 60 / Math.max(1, secondiAudio)).toFixed(2)})`);
  log.info({ fatte, mancanti: mancanti.length, secondiAudio, minuti }, 'prerender: fine');
  log.flush?.();
}

async function preGeneraFish(campagna: ReturnType<typeof caricaCampagna>, repertorio: ReturnType<typeof caricaRepertorio>, config: ReturnType<typeof caricaConfig>, log: ReturnType<typeof creaLogger>, dryRun: boolean, json: boolean): Promise<void> {
  const pronuncia = creaPronunciatore(campagna);
  const piano = pianoFish(campagna, repertorio, pronuncia);
  const cache = new CacheAudio(config.cacheAudio, config.voce.fish.cacheAudio);
  const fishCache = cache.fish!;
  const riassunto = riassuntoFish(piano, fishCache);

  if (dryRun) {
    if (json) {
      console.log(JSON.stringify(riassunto));
    } else {
      console.log(`righe ${riassunto.righe}, voci uniche ${riassunto.voci}, già in cache ${riassunto.in_cache}, da generare ${riassunto.da_generare}`);
      console.log(`byte da generare ${riassunto.byte_da_generare} · costo stimato ${riassunto.costo_da_generare_usd.toFixed(4)} $ (tariffa $2 per milione di byte)`);
      console.log(`byte totali ${riassunto.byte_totali} · costo totale stimato ${riassunto.costo_totale_usd.toFixed(4)} $`);
    }
    return;
  }

  const mancanti = daGenerare(piano, fishCache);
  console.log(`righe ${riassunto.righe}, voci uniche ${riassunto.voci}, già in cache ${riassunto.in_cache}, da generare ${mancanti.length}`);
  if (mancanti.length === 0) return;

  const voci = caricaRegistroVoci(config.voce.fish.registro);
  const senza = vociSenzaFish(piano, voci);
  if (senza.length) throw new Error(`voci senza reference_id Fish nel registro: ${senza.join(', ')}`);
  const motore = new MotoreVoceFish({ fileChiave: config.voce.fish.fileChiave, voci, log, primoByteMs: 60_000, silenzioMs: 60_000 });

  const inizio = performance.now();
  const esito = await generaFish(mancanti, { cache: fishCache, motore, voci, log });
  const minuti = (performance.now() - inizio) / 60_000;
  console.log(`FATTO: generate ${esito.generate}/${mancanti.length} · fallite ${esito.fallite} · byte ${esito.byte} · costo ${esito.usd.toFixed(4)} $ · ${minuti.toFixed(1)} min`);
  log.info({ generate: esito.generate, fallite: esito.fallite, byte: esito.byte, costo_usd: esito.usd, minuti }, 'prerender fish: fine');
  if (esito.fallite) process.exitCode = 1;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      motore: { type: 'string', default: 'qwen' },
      'dry-run': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      'solo-conta': { type: 'boolean', default: false },
    },
  });
  const motore = values.motore;
  if (motore !== 'qwen' && motore !== 'fish') throw new Error(`motore sconosciuto: ${motore} (qwen o fish)`);

  const cartella = positionals[0] ? path.resolve(positionals[0]) : undefined;
  const config = caricaConfig(cartella ? { ...process.env, TAGM_CARTELLA_CAMPAGNA: cartella } : process.env);
  const log = creaLogger({ livello: 'info', cartellaLog: config.cartellaLog, nomeFile: 'prerender.jsonl' });
  const campagna = caricaCampagna(config.cartellaCampagna, log, { linguaConfigurazione: config.lingua });
  // Lingua dei contenuti come la imposta il server (avvio.ts): quella della campagna, se no della
  // configurazione. Ne dipendono le voci (voce/registro-voci.ts sceglie quella della lingua) e quindi la
  // chiave in cache, che deve essere la stessa che calcola il server in partita.
  impostaLingua(campagna.lingua ?? config.lingua);
  const repertorio = caricaRepertorio(campagna, log);

  if (motore === 'fish') return preGeneraFish(campagna, repertorio, config, log, values['dry-run'], values.json);
  return preGeneraQwen(campagna, repertorio, config, log, values['solo-conta'] || values['dry-run']);
}

main().catch((err: unknown) => {
  console.error('prerender fallito:', (err as Error).message);
  process.exit(1);
});
