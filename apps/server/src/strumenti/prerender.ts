/**
 * Pre-generazione dell'audio del repertorio: ogni riga di ogni battuta e di ogni variante passa
 * dal servizio voce con la STESSA normalizzazione del gioco (voce/cache-audio.ts → testoPerVoce)
 * e finisce in cache/audio/<sha>.pcm + indice.json. Le voci già presenti si saltano.
 *
 * Uso: npx tsx apps/server/src/strumenti/prerender.ts [--solo-conta]
 * Da lanciare quando il servizio voce NON viene misurato (occupa il worker per ~20 minuti).
 */
import { setTimeout as attendi } from 'node:timers/promises';
import { caricaCampagna } from '../campagna/caricatore';
import { caricaConfig } from '../config';
import { creaLogger } from '../logger';
import { caricaRepertorio } from '../repertorio/caricatore';
import { voceDi } from '../turni/narrazione';
import { CacheAudio, chiaveAudio, testoPerVoce } from '../voce/cache-audio';
import { MotoreVoceHttp } from '../voce/http';
import { creaPronunciatore } from '../voce/pronuncia';
import { ErroreVoce } from '../voce/tipi';

interface Voce {
  chiave: string;
  voce: string;
  testoVoce: string;
  dove: string;
}

async function main(): Promise<void> {
  const soloConta = process.argv.includes('--solo-conta');
  const config = caricaConfig();
  const log = creaLogger({ livello: 'info', cartellaLog: config.cartellaLog, nomeFile: 'prerender.jsonl' });
  const campagna = caricaCampagna(config.cartellaCampagna, log);
  const repertorio = caricaRepertorio(campagna, log);
  const pronuncia = creaPronunciatore(campagna);
  const cache = new CacheAudio(config.cacheAudio);
  const motore = new MotoreVoceHttp(config.voce.url, log);

  // Tutte le righe, senza doppioni (la stessa riga in due battute è un solo file).
  const voci = new Map<string, Voce>();
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

main().catch((err: unknown) => {
  console.error('prerender fallito:', (err as Error).message);
  process.exit(1);
});
