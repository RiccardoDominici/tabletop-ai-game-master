/**
 * Narratore su Claude Haiku 5.5 con l'SDK ufficiale @anthropic-ai/sdk (skill claude-api):
 * - modello claude-haiku-5-5, thinking disattivato ({type:'disabled'} è ammesso a effort ≤ high),
 *   output_config.effort 'low', streaming; niente temperature/top_p/top_k, niente prefill;
 * - i blocchi di sistema stabili (prompt del narratore, poi contesto della campagna) hanno
 *   cache_control: la parte variabile del turno sta nel messaggio utente, dopo;
 * - baseURL FISSATO a https://api.anthropic.com: la shell ha ANTHROPIC_BASE_URL verso un proxy
 *   locale (:4000) che NON va usato, e ANTHROPIC_CUSTOM_HEADERS che l'SDK aggiungerebbe da solo.
 *   Per questo le due variabili vengono tolte dall'ambiente del processo prima di creare il client.
 * - la chiave arriva da llm/chiavi.ts: prima ANTHROPIC_API_KEY dell'ambiente, poi la riga del .env
 *   alla radice, poi (ripiego) la riga del file indicato in configurazione. Mai stampata.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { Logger } from '../logger';
import { cercaChiave, descriviChiave, type SorgentiChiave } from './chiavi';
import { ModelloAnthropic } from './anthropic';
import { NarratoreModello } from './narratore';

const URL_API = 'https://api.anthropic.com';

/** Variabili d'ambiente della shell che l'SDK leggerebbe e che qui non devono valere. */
const VARIABILI_IGNORATE = ['ANTHROPIC_BASE_URL', 'ANTHROPIC_CUSTOM_HEADERS', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY'];

export function neutralizzaAmbienteAnthropic(log: Logger): void {
  const tolte = VARIABILI_IGNORATE.filter((n) => process.env[n] !== undefined);
  for (const n of tolte) delete process.env[n];
  // Solo i nomi, mai i valori.
  if (tolte.length) log.info({ tolte }, 'llm: variabili ANTHROPIC_* della shell ignorate (baseURL fisso su api.anthropic.com)');
}

/**
 * Client Anthropic con la chiave letta dal file (una sola riga) e baseURL fisso: usato dal
 * narratore e dagli strumenti (conteggio dei token).
 */
export function creaClientAnthropic(filePrecedente: string, log: Logger, sorgenti: SorgentiChiave = {}): Anthropic {
  // La chiave si cerca PRIMA di neutralizzare l'ambiente: ANTHROPIC_API_KEY, se c'è, è la prima fonte.
  const chiave = cercaChiave('ANTHROPIC_API_KEY', { filePrecedente, ...sorgenti });
  neutralizzaAmbienteAnthropic(log);
  log.info({ chiave: descriviChiave(chiave.valore), origine: chiave.origine, baseURL: URL_API }, 'llm: client Anthropic pronto');
  return new Anthropic({ apiKey: chiave.valore, authToken: null, baseURL: URL_API, maxRetries: 1, timeout: 60_000 });
}

export interface OpzioniHaiku {
  modello: string;
  maxTokens: number;
  /** File di ripiego con la riga ANTHROPIC_API_KEY= (dopo ambiente e .env alla radice). */
  fileChiave: string;
  log: Logger;
}

/**
 * Il narratore di sempre su Haiku: ora è il narratore generico (llm/narratore.ts) sul provider
 * Anthropic (llm/anthropic.ts), con le stesse richieste di prima. Il client si crea al primo uso.
 */
export class NarratoreHaiku extends NarratoreModello {
  constructor(o: OpzioniHaiku) {
    let client: Anthropic | null = null;
    super('haiku', new ModelloAnthropic(() => (client ??= creaClientAnthropic(o.fileChiave, o.log)), o.modello), o.maxTokens);
  }
}
