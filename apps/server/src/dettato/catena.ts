/**
 * From the `ascolto` configuration (provider/config.ts) to the chain of transcribers the dictation tries at every
 * recording: the chosen provider, then its reserves, up to `nessuno` (docs/ascolto.md, «Providers»). A reserve that
 * cannot work (OpenRouter without a key) is left out at start-up and the log says why.
 */
import type { Logger } from '../logger';
import { chiaveDisponibile, MODELLO_ASCOLTO_LOCALE, MODELLO_ASCOLTO_OPENROUTER, URL_ASCOLTO_LOCALE, type ConfigProvider, type NomeProviderConfig, type Scelta } from '../provider/config';
import { riavviaConScript, SentinellaLocale, type EsitoRiavvio } from '../provider/sentinella-locale';
import { DOLLARI_PER_MINUTO_OPENROUTER, WhisperApi, WhisperLocale, type Trascrittore } from './trascrittori';

export interface Catena {
  trascrittori: Trascrittore[];
  /** The watchdog of the local server, if there is one (stopped with the server). */
  sentinella: SentinellaLocale | null;
}

export function creaCatena(
  cfg: ConfigProvider,
  scelta: Scelta,
  o: { fileChiaveOpenRouter: string; log: Logger; riavvia?: (() => Promise<EsitoRiavvio>) | null; ambiente?: NodeJS.ProcessEnv },
): Catena {
  const v = cfg.componenti.ascolto;
  const tutta: NomeProviderConfig[] = [v.provider, ...(v.riserve ?? [])];
  const da = Math.max(0, tutta.indexOf(scelta.provider));
  const trascrittori: Trascrittore[] = [];
  let sentinella: SentinellaLocale | null = null;
  const saltati: string[] = [];
  for (const p of tutta.slice(da)) {
    if (p === 'nessuno') break;
    if (p === 'locale') {
      const url = (scelta.provider === 'locale' ? scelta.url : null) ?? v.url ?? URL_ASCOLTO_LOCALE;
      const riavvia = o.riavvia !== undefined ? o.riavvia : riavviaConScript(url, null, 120_000, { file: 'ascolto-avvio.sh', variabilePorta: 'ASCOLTO_PORTA' });
      sentinella = new SentinellaLocale({
        url,
        log: o.log.child({ modulo: 'sentinella-ascolto' }),
        riavvia,
        percorsoSalute: '/health',
        nome: 'local speech-to-text server',
        conseguenza: 'the phones use the next transcriber, or the players type',
        script: 'scripts/ascolto-avvio.sh',
      });
      trascrittori.push(new WhisperLocale({ url, modello: v.provider === 'locale' ? v.modello ?? MODELLO_ASCOLTO_LOCALE : MODELLO_ASCOLTO_LOCALE, sentinella }));
    } else if (p === 'openrouter') {
      if (!chiaveDisponibile('OPENROUTER_API_KEY', o.fileChiaveOpenRouter, o.ambiente)) {
        saltati.push('openrouter: OPENROUTER_API_KEY missing');
        continue;
      }
      trascrittori.push(
        new WhisperApi({
          provider: 'openrouter',
          url: cfg.backend.openrouter.url ?? 'https://openrouter.ai/api/v1',
          modello: v.provider === 'openrouter' ? v.modello ?? MODELLO_ASCOLTO_OPENROUTER : MODELLO_ASCOLTO_OPENROUTER,
          nomeChiave: 'OPENROUTER_API_KEY',
          fileChiave: o.fileChiaveOpenRouter,
          dollariPerMinuto: DOLLARI_PER_MINUTO_OPENROUTER,
        }),
      );
    } else if (p === 'openai') {
      const url = v.url ?? cfg.backend['openai']?.url;
      if (!url) {
        saltati.push('openai: url missing');
        continue;
      }
      trascrittori.push(new WhisperApi({ provider: 'openai', url, modello: v.modello ?? 'whisper-1', nomeChiave: v.chiave ?? cfg.backend['openai']?.chiave ?? null, dollariPerMinuto: 0 }));
    } else {
      saltati.push(`${p}: does not transcribe`);
    }
  }
  if (saltati.length) o.log.info({ saltati }, 'dictation: reserves left out');
  return { trascrittori, sentinella };
}
