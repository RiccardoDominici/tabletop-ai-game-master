/**
 * Configurazione del server, tutta da variabili d'ambiente con valori predefiniti di F0.
 *
 * Sicurezza: la chiave Anthropic NON sta qui. Qui c'è solo il percorso del file da cui
 * `llm/chiave.ts` legge la singola riga ANTHROPIC_API_KEY=… al momento dell'uso.
 */
import path from 'node:path';
import { PORTA_SERVER, PORTA_VOCE } from '@cantastorie/shared';
import { CARTELLA_LOG, RADICE_REPO } from './percorsi';
import { tokenDaConfig } from './master/token';

/** Quale motore vocale usare: il servizio locale, il finto, o scegliere da solo. */
export type ModoVoce = 'qwen' | 'mock' | 'auto';

/** Quale narratore usare: Haiku vero oppure un copione finto (test e prove senza spesa). */
export type ModoLlm = 'haiku' | 'finto';

/** Modalità del narratore: A = improvvisa tutto (F0), B = sceglie battute pre-scritte dal repertorio. */
export type ModoNarratore = 'improvvisa' | 'repertorio';

export interface ConfigServer {
  porta: number;
  host: string;
  livelloLog: string;
  cartellaLog: string;
  /** Cartella della campagna (campagne/<id>). */
  cartellaCampagna: string;
  /** Prompt di sistema del narratore (prompts/narratore.md). */
  filePromptNarratore: string;
  /** Override dell'IP LAN mostrato nel QR. */
  ipLan?: string;
  /** Modalità del narratore per la sessione (CANTASTORIE_MODO). */
  modo: ModoNarratore;
  /** Prompt di sistema del selettore (modalità repertorio). */
  filePromptSelettore: string;
  /** Cartella dell'audio pre-generato del repertorio. */
  cacheAudio: string;
  /** Immagini della campagna (manifest.json + file); default campagne/<id>/immagini. */
  cartellaImmagini: string;

  /** Token fisso del pannello del master (CANTASTORIE_MASTER_TOKEN); se manca se ne crea uno a ogni avvio. */
  tokenMaster?: string;

  /** Arbitro delle azioni simultanee: regole + Haiku, oppure solo regole. */
  arbitro: 'haiku' | 'regole';
  llm: {
    modo: ModoLlm;
    modello: string;
    /** File da cui leggere SOLO la riga ANTHROPIC_API_KEY=… */
    fileChiave: string;
    /** Fissato: mai il proxy locale di ANTHROPIC_BASE_URL. */
    baseURL: 'https://api.anthropic.com';
    maxTokens: number;
    /** Riscalda la cache del prompt all'avvio della scena (richiesta max_tokens: 0). */
    preriscalda: boolean;
  };

  voce: {
    modo: ModoVoce;
    url: string;
    /** Ogni quanto controllare /salute in modo auto. */
    intervalloSaluteMs: number;
    /** Fattore di tempo del finto TTS (1 = tempi realistici, 0.05 = test veloci). */
    scalaTempoMock: number;
  };

  turni: {
    /** Chiusura automatica dopo la prima azione (contratto: 10 s). */
    chiusuraDopoPrimaAzioneMs: number;
    /** Margine oltre la durata stimata dell'audio, se lo schermo non avvisa la fine. */
    margineFineAudioMs: number;
    /** Voci della trascrizione tenute nello stato mandato ai client. */
    trascrizioneMax: number;
    /**
     * Esperimenti: la finestra si apre sempre per tutti i PG al tavolo (l'invito resta nel log),
     * così un copione fisso di azioni si può dare identico a due narratori.
     */
    finestraATutti: boolean;
    /** Finestra aperta senza nessun input per questo tempo → mossa contro lo stallo (0 = mai). */
    stalloMs: number;
  };
}

function numero(valore: string | undefined, predefinito: number): number {
  const n = valore === undefined || valore.trim() === '' ? NaN : Number(valore);
  return Number.isFinite(n) ? n : predefinito;
}

function testo(valore: string | undefined): string | undefined {
  const t = valore?.trim();
  return t ? t : undefined;
}

function scelta<T extends string>(valore: string | undefined, ammessi: readonly T[], predefinito: T): T {
  const t = testo(valore) as T | undefined;
  return t && ammessi.includes(t) ? t : predefinito;
}

export function caricaConfig(env: NodeJS.ProcessEnv = process.env): ConfigServer {
  const campagna = testo(env['CANTASTORIE_CAMPAGNA']) ?? 'prova-f0';
  const cartellaCampagna = testo(env['CANTASTORIE_CARTELLA_CAMPAGNA']) ?? path.join(RADICE_REPO, 'campagne', campagna);
  const ipLan = testo(env['CANTASTORIE_IP']);
  const tokenMaster = tokenDaConfig(env['CANTASTORIE_MASTER_TOKEN']);
  return {
    porta: numero(env['PORT'], PORTA_SERVER),
    host: testo(env['HOST']) ?? '0.0.0.0',
    livelloLog: testo(env['LOG_LEVEL']) ?? 'info',
    cartellaLog: testo(env['CANTASTORIE_LOG']) ?? CARTELLA_LOG,
    cartellaCampagna,
    filePromptNarratore:
      testo(env['CANTASTORIE_PROMPT_NARRATORE']) ?? path.join(RADICE_REPO, 'prompts', 'narratore.md'),
    ...(ipLan ? { ipLan } : {}),
    ...(tokenMaster ? { tokenMaster } : {}),
    modo: scelta(env['CANTASTORIE_MODO'], ['improvvisa', 'repertorio'] as const, 'improvvisa'),
    // Con il narratore a copione (test, prove senza spesa) l'arbitro usa solo le regole.
    arbitro: scelta(env['CANTASTORIE_ARBITRO'], ['haiku', 'regole'] as const, env['CANTASTORIE_LLM'] === 'finto' ? 'regole' : 'haiku'),
    filePromptSelettore: testo(env['CANTASTORIE_PROMPT_SELETTORE']) ?? path.join(RADICE_REPO, 'prompts', 'selettore.md'),
    cacheAudio: testo(env['CANTASTORIE_CACHE_AUDIO']) ?? path.join(RADICE_REPO, 'cache', 'audio'),
    // I percorsi relativi valgono dalla radice del repo (il server gira in apps/server).
    cartellaImmagini: path.resolve(RADICE_REPO, testo(env['CANTASTORIE_IMMAGINI']) ?? path.join(cartellaCampagna, 'immagini')),
    llm: {
      modo: scelta(env['CANTASTORIE_LLM'], ['haiku', 'finto'] as const, 'haiku'),
      modello: testo(env['CANTASTORIE_MODELLO']) ?? 'claude-haiku-5-5',
      fileChiave: testo(env['ANTHROPIC_KEY_FILE']) ?? '/Users/riccardo/Developer/godExperiment/backend/.env',
      baseURL: 'https://api.anthropic.com',
      maxTokens: numero(env['CANTASTORIE_MAX_TOKENS'], 1024),
      preriscalda: testo(env['CANTASTORIE_PRERISCALDA']) !== '0',
    },
    voce: {
      modo: scelta(env['CANTASTORIE_TTS'], ['qwen', 'mock', 'auto'] as const, 'auto'),
      url: testo(env['CANTASTORIE_VOCE_URL']) ?? `http://127.0.0.1:${PORTA_VOCE}`,
      intervalloSaluteMs: numero(env['CANTASTORIE_VOCE_SALUTE_MS'], 5000),
      scalaTempoMock: numero(env['CANTASTORIE_MOCK_SCALA'], 1),
    },
    turni: {
      chiusuraDopoPrimaAzioneMs: numero(env['CANTASTORIE_FINESTRA_MS'], 10_000),
      margineFineAudioMs: numero(env['CANTASTORIE_MARGINE_AUDIO_MS'], 2500),
      trascrizioneMax: numero(env['CANTASTORIE_TRASCRIZIONE_MAX'], 80),
      finestraATutti: testo(env['CANTASTORIE_FINESTRA_TUTTI']) === '1',
      stalloMs: numero(env['CANTASTORIE_STALLO_MS'], 45_000),
    },
  };
}
