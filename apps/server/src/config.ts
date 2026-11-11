/**
 * Configurazione del server, tutta da variabili d'ambiente con valori predefiniti di F0.
 *
 * Sicurezza: la chiave Anthropic NON sta qui. Qui c'è solo il percorso del file da cui
 * `llm/chiavi.ts` cerca la chiave al momento dell'uso: ambiente, poi .env alla radice, poi il file di ripiego.
 */
import type { Lingua } from './lingua';
import path from 'node:path';
import { PORTA_SERVER, PORTA_VOCE } from '@tabletop-ai-gm/shared';
import { allineaVariabiliLegacy } from './variabili-legacy';
import { CARTELLA_LOG, CARTELLA_WEB_DIST, RADICE_REPO } from './percorsi';
import { tokenDaConfig } from './master/token';
import { caricaConfigProvider, type ConfigProvider } from './provider/config';

/**
 * Quale motore vocale usare: drama-3 via OpenRouter (fish), il servizio locale (qwen), il finto
 * (mock), o scegliere da solo tra qwen e finto (auto).
 */
export type ModoVoce = 'fish' | 'qwen' | 'mock' | 'auto';

/** Quale narratore usare: Haiku vero oppure un copione finto (test e prove senza spesa). */
export type ModoLlm = 'haiku' | 'finto';

/** Modalità del narratore: A = improvvisa tutto (F0), B = sceglie battute pre-scritte dal repertorio. */
export type ModoNarratore = 'improvvisa' | 'repertorio';

export interface ConfigServer {
  porta: number;
  /** Provider di ogni componente (config/*.yaml + variabili, docs/provider.md), letti dallo STESSO ambiente. */
  provider: ConfigProvider;
  host: string;
  livelloLog: string;
  cartellaLog: string;
  /** Cartella della campagna (campagne/<id>). */
  cartellaCampagna: string;
  /** Lingua della configurazione (interfaccia; contenuti se la campagna non ne dichiara una). */
  lingua: Lingua;
  /** Prompt di sistema del narratore; null = prompts/<lingua dei contenuti>/narratore.md. */
  filePromptNarratore: string | null;
  /** Override dell'IP LAN mostrato nel QR. */
  ipLan?: string;
  /** Modalità del narratore per la sessione (TAGM_MODO). */
  modo: ModoNarratore;
  /** Prompt di sistema del selettore (modalità repertorio); null = prompts/<lingua>/selettore.md. */
  filePromptSelettore: string | null;
  /** Cartella dell'audio pre-generato del repertorio. */
  cacheAudio: string;
  /** Immagini della campagna (manifest.json + file); default campagne/<id>/immagini. */
  cartellaImmagini: string;
  /**
   * Pagine web compilate da servire (TAGM_WEB; default apps/web/dist). Un'istanza di prova su
   * un'altra porta ha la sua build: ricompilare apps/web/dist cambierebbe le pagine della partita vera.
   */
  cartellaWeb: string;
  /** Audio della campagna (manifest.json + file, docs/audio.md); default campagne/<id>/audio. */
  cartellaAudio: string;

  /** Token fisso del pannello del master (TAGM_MASTER_TOKEN); se manca se ne crea uno a ogni avvio. */
  tokenMaster?: string;
  /**
   * Registro delle sessioni (SQLite). TAGM_SESSIONI: percorso del file, oppure «off» per non
   * salvare. Predefinito: <cartella dei log>/sessioni.sqlite, così ogni istanza (prove comprese) ha il suo.
   */
  fileSessioni: string | null;
  /** TAGM_NUOVA_SESSIONE=1 (partita.sh --nuova): all'avvio non si riprende la sessione in corso. */
  nuovaSessione: boolean;
  /**
   * Campagna a pacchetti: numero della sessione da giocare (TAGM_SESSIONE, partita.sh
   * --sessione). null = la sceglie il server dall'archivio (sessione/scelta-pacchetto.ts).
   */
  sessione: number | null;

  /** Arbitro delle azioni simultanee: regole + Haiku, oppure solo regole. */
  arbitro: 'haiku' | 'regole';
  /**
   * Seme fisso dei dadi (TAGM_SEME_DADI, esadecimale): rifà la stessa sequenza di una partita.
   * Assente = un seme nuovo a ogni sessione (salvato nell'archivio).
   */
  semeDadi: string | null;
  llm: {
    modo: ModoLlm;
    modello: string;
    /** File di ripiego (ANTHROPIC_KEY_FILE): usato solo se ANTHROPIC_API_KEY non è nell'ambiente né nel .env. */
    fileChiave: string;
    /** Fissato: mai il proxy locale di ANTHROPIC_BASE_URL. */
    baseURL: 'https://api.anthropic.com';
    maxTokens: number;
    /** Riscalda la cache del prompt all'avvio della scena (richiesta max_tokens: 0). */
    preriscalda: boolean;
    /** Narratore finto: copione da un file (blocchi per turno separati da «---»), per le prove e2e. */
    copioneFinto?: string;
  };

  voce: {
    modo: ModoVoce;
    /** Servizio Qwen locale (anche riserva di fish). */
    url: string;
    /** drama-3 via OpenRouter (modo fish). */
    fish: {
      /** File di ripiego (TAGM_CHIAVE_OPENROUTER): dopo OPENROUTER_API_KEY dell'ambiente e il .env alla radice. */
      fileChiave: string;
      /** Registro delle voci con i reference_id Fish (assets/voci/voci.yaml). */
      registro: string;
      /** Attesa massima del primo pezzo di audio, poi ritentativo/riserva (TAGM_FISH_PRIMO_MS). */
      primoByteMs: number;
      /**
       * Riserva Qwen per frase se drama-3 non risponde (TAGM_VOCE_RISERVA=qwen|no). Predefinita
       * solo sulla porta della partita vera: le istanze di prova non toccano mai il servizio su 4611.
       */
      riservaQwen: boolean;
      /** Audio pre-generato delle battute con drama-3 (separato da quello di Qwen: voci diverse). */
      cacheAudio: string;
    };
    /** Ogni quanto controllare /salute in modo auto. */
    intervalloSaluteMs: number;
    /** Fattore di tempo del finto TTS (1 = tempi realistici, 0.05 = test veloci). */
    scalaTempoMock: number;
  };

  turni: {
    /**
     * Attesa dopo che hanno inviato tutti gli invitati, prima che il turno parta: per un «anch'io»
     * o una correzione (contratto: 2,5 s). Nessuna scadenza in condizioni normali.
     */
    assestamentoMs: number;
    /** Ritmo concitato (lo chiede la narrazione): la finestra si chiude da sola dopo questo tempo. */
    concitatoMs: number;
    /**
     * Sorvegliante: se apertura o narrazione non danno segni di vita (LLM, voce, audio) per questo
     * tempo, il gioco registra la causa e riparte con una finestra nuova (0 = spento).
     */
    sorveglianteMs: number;
    /** Margine oltre la durata stimata dell'audio, se lo schermo non avvisa la fine. */
    margineFineAudioMs: number;
    /** Voci della trascrizione tenute nello stato mandato ai client. */
    trascrizioneMax: number;
    /**
     * Esperimenti: la finestra si apre sempre per tutti i PG al tavolo (l'invito resta nel log),
     * così un copione fisso di azioni si può dare identico a due narratori.
     */
    finestraATutti: boolean;
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

/**
 * TAGM_VOCE=fish|qwen|finta (scripts/partita.sh --voce) vince su TAGM_TTS=qwen|mock|auto
 * (il nome vecchio, che resta per gli script e i test che lo usano).
 */
function modoVoce(env: NodeJS.ProcessEnv): ModoVoce {
  const nuovo = testo(env['TAGM_VOCE']);
  if (nuovo === 'fish' || nuovo === 'qwen') return nuovo;
  if (nuovo === 'finta' || nuovo === 'mock') return 'mock';
  return scelta(env['TAGM_TTS'], ['qwen', 'mock', 'auto', 'fish'] as const, 'auto');
}

export function caricaConfig(env: NodeJS.ProcessEnv = process.env): ConfigServer {
  allineaVariabiliLegacy(env);
  const provider = caricaConfigProvider(env);
  const campagna = testo(env['TAGM_CAMPAGNA']) ?? 'prova-f0';
  const cartellaCampagna = testo(env['TAGM_CARTELLA_CAMPAGNA']) ?? path.join(RADICE_REPO, 'campagne', campagna);
  const ipLan = testo(env['TAGM_IP']);
  const tokenMaster = tokenDaConfig(env['TAGM_MASTER_TOKEN']);
  const cartellaLog = testo(env['TAGM_LOG']) ?? CARTELLA_LOG;
  const sessioni = testo(env['TAGM_SESSIONI']);
  return {
    porta: numero(env['PORT'], PORTA_SERVER),
    provider,
    lingua: provider.lingua,
    host: testo(env['HOST']) ?? '0.0.0.0',
    livelloLog: testo(env['LOG_LEVEL']) ?? 'info',
    cartellaLog,
    cartellaCampagna,
    filePromptNarratore: testo(env['TAGM_PROMPT_NARRATORE']) ?? null,
    ...(ipLan ? { ipLan } : {}),
    ...(tokenMaster ? { tokenMaster } : {}),
    fileSessioni: sessioni === 'off' ? null : path.resolve(RADICE_REPO, sessioni ?? path.join(cartellaLog, 'sessioni.sqlite')),
    nuovaSessione: testo(env['TAGM_NUOVA_SESSIONE']) === '1',
    sessione: /^\d+$/.test(testo(env['TAGM_SESSIONE']) ?? '') ? Number(testo(env['TAGM_SESSIONE'])) : null,
    modo: scelta(env['TAGM_MODO'], ['improvvisa', 'repertorio'] as const, 'improvvisa'),
    // Con il narratore a copione (test, prove senza spesa) l'arbitro usa solo le regole.
    arbitro: scelta(env['TAGM_ARBITRO'], ['haiku', 'regole'] as const, env['TAGM_LLM'] === 'finto' ? 'regole' : 'haiku'),
    semeDadi: /^[0-9a-f]{8,128}$/i.test(testo(env['TAGM_SEME_DADI']) ?? '') ? testo(env['TAGM_SEME_DADI'])! : null,
    filePromptSelettore: testo(env['TAGM_PROMPT_SELETTORE']) ?? null,
    cacheAudio: testo(env['TAGM_CACHE_AUDIO']) ?? path.join(RADICE_REPO, 'cache', 'audio'),
    // I percorsi relativi valgono dalla radice del repo (il server gira in apps/server).
    cartellaImmagini: path.resolve(RADICE_REPO, testo(env['TAGM_IMMAGINI']) ?? path.join(cartellaCampagna, 'immagini')),
    cartellaWeb: path.resolve(RADICE_REPO, testo(env['TAGM_WEB']) ?? CARTELLA_WEB_DIST),
    cartellaAudio: path.resolve(RADICE_REPO, testo(env['TAGM_AUDIO']) ?? path.join(cartellaCampagna, 'audio')),
    llm: {
      modo: scelta(env['TAGM_LLM'], ['haiku', 'finto'] as const, 'haiku'),
      modello: testo(env['TAGM_MODELLO']) ?? 'claude-haiku-5-5',
      fileChiave: testo(env['ANTHROPIC_KEY_FILE']) ?? '/Users/riccardo/Developer/godExperiment/backend/.env',
      baseURL: 'https://api.anthropic.com',
      maxTokens: numero(env['TAGM_MAX_TOKENS'], 1024),
      preriscalda: testo(env['TAGM_PRERISCALDA']) !== '0',
      ...(testo(env['TAGM_COPIONE_FINTO']) ? { copioneFinto: path.resolve(RADICE_REPO, testo(env['TAGM_COPIONE_FINTO'])!) } : {}),
    },
    voce: {
      modo: modoVoce(env),
      url: testo(env['TAGM_VOCE_URL']) ?? `http://127.0.0.1:${PORTA_VOCE}`,
      fish: {
        fileChiave: testo(env['TAGM_CHIAVE_OPENROUTER']) ?? '/Users/riccardo/Developer/agora/.env',
        registro: path.resolve(RADICE_REPO, testo(env['TAGM_VOCI']) ?? path.join('assets', 'voci', 'voci.yaml')),
        primoByteMs: numero(env['TAGM_FISH_PRIMO_MS'], 6000),
        riservaQwen:
          scelta(env['TAGM_VOCE_RISERVA'], ['qwen', 'no'] as const, numero(env['PORT'], PORTA_SERVER) === PORTA_SERVER ? 'qwen' : 'no') === 'qwen',
        cacheAudio: testo(env['TAGM_CACHE_AUDIO_FISH']) ?? path.join(RADICE_REPO, 'cache', 'audio-fish'),
      },
      intervalloSaluteMs: numero(env['TAGM_VOCE_SALUTE_MS'], 5000),
      scalaTempoMock: numero(env['TAGM_MOCK_SCALA'], 1),
    },
    turni: {
      assestamentoMs: numero(env['TAGM_ASSESTAMENTO_MS'], 2500),
      concitatoMs: numero(env['TAGM_CONCITATO_MS'], 25_000),
      sorveglianteMs: numero(env['TAGM_SORVEGLIANTE_MS'], 60_000),
      margineFineAudioMs: numero(env['TAGM_MARGINE_AUDIO_MS'], 2500),
      trascrizioneMax: numero(env['TAGM_TRASCRIZIONE_MAX'], 80),
      finestraATutti: testo(env['TAGM_FINESTRA_TUTTI']) === '1',
    },
  };
}
