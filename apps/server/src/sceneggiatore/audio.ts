/**
 * L'audio delle battute scritte al volo (docs/sceneggiatore.md, «Audio»): quando una battuta delle
 * `prossime` entra nel repertorio, la sua sintesi drama-3 va in coda in sottofondo, nella stessa cache e
 * con la stessa chiave della pre-generazione (strumenti/prerender-fish.ts). Così, quando il lettore la
 * sceglie, la voce parte dalla cache invece di sintetizzare dal vivo. Una sintesi alla volta; un errore
 * si registra e non ferma le altre. Solo con la voce drama-3 (con le altre voci la coda non c'è).
 */
import type { Campagna } from '../campagna/tipi';
import type { Logger } from '../logger';
import type { Battuta } from '../repertorio/tipi';
import { daGenerare, generaFish, pianoFish } from '../strumenti/prerender-fish';
import type { CacheAudio } from '../voce/cache-audio';
import type { MotoreVoceFish } from '../voce/fish';
import type { Pronunciatore } from '../voce/pronuncia';
import type { VoceRegistro } from '../voce/registro-voci';

export interface OpzioniCodaAudio {
  campagna: Campagna;
  pronuncia: Pronunciatore;
  /** La cache di drama-3 (cache/audio-fish), quella che legge la pipeline. */
  cache: CacheAudio;
  motore: Pick<MotoreVoceFish, 'sintetizza'>;
  voci: Map<string, VoceRegistro>;
  log: Logger;
  /** Pausa fra i tentativi di generaFish (le prove la abbassano). */
  attesaMs?: number;
}

/** La coda: si chiama con le battute appena entrate; ritorna la promessa della coda (per le prove). */
export function codaAudioFish(o: OpzioniCodaAudio): (battute: readonly Battuta[]) => Promise<void> {
  let catena: Promise<void> = Promise.resolve();
  return (battute) => {
    const piano = pianoFish(o.campagna, { battute: [...battute], perId: new Map(battute.map((b) => [b.id, b])), avvisi: [] }, o.pronuncia);
    const righe = daGenerare(piano, o.cache);
    if (!righe.length) return catena;
    catena = catena
      .then(async () => {
        const e = await generaFish(righe, { cache: o.cache, motore: o.motore as MotoreVoceFish, voci: o.voci, log: o.log, ...(o.attesaMs !== undefined ? { attesaMs: o.attesaMs } : {}) });
        o.log.info({ battute: battute.map((b) => b.id), righe: righe.length, generate: e.generate, fallite: e.fallite, usd: e.usd }, 'sceneggiatore: audio delle battute nuove in cache');
      })
      .catch((err: unknown) => o.log.warn({ err: (err as Error).message }, 'sceneggiatore: audio delle battute nuove non generato'));
    return catena;
  };
}
