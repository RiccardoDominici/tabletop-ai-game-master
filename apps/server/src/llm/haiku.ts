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
import { calcolaCosto, type UsoToken } from './costi';
import type { EsitoNarrazione, Narratore, RichiestaNarrazione } from './tipi';

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

export class NarratoreHaiku implements Narratore {
  readonly nome = 'haiku' as const;
  readonly modello: string;
  private client: Anthropic | null = null;

  constructor(private readonly o: OpzioniHaiku) {
    this.modello = o.modello;
  }

  /** Client creato al primo uso: la chiave si legge solo quando serve davvero. */
  private cliente(): Anthropic {
    if (this.client) return this.client;
    this.client = creaClientAnthropic(this.o.fileChiave, this.o.log);
    return this.client;
  }

  private parametri(sistema: string[]) {
    return {
      model: this.modello,
      thinking: { type: 'disabled' as const },
      output_config: { effort: 'low' as const },
      system: sistema.map((text) => ({ type: 'text' as const, text, cache_control: { type: 'ephemeral' as const } })),
    };
  }

  async narra(r: RichiestaNarrazione, onTesto: (delta: string) => void): Promise<EsitoNarrazione> {
    const client = this.cliente();
    const stream = client.messages.stream(
      {
        ...this.parametri(r.sistema),
        max_tokens: this.o.maxTokens,
        messages: [{ role: 'user', content: r.messaggio }],
      },
      { signal: r.signal },
    );
    let testo = '';
    for await (const evento of stream) {
      if (evento.type === 'content_block_delta' && evento.delta.type === 'text_delta') {
        testo += evento.delta.text;
        onTesto(evento.delta.text);
      }
    }
    const finale = await stream.finalMessage();
    const uso = finale.usage as unknown as UsoToken;
    return {
      testo,
      modello: finale.model,
      stopReason: finale.stop_reason ?? null,
      uso,
      costo: calcolaCosto(this.modello, uso),
      idMessaggio: finale.id,
    };
  }

  /**
   * Pre-riscaldamento della cache (prompt-caching.md, «Pre-warming»): una richiesta con
   * max_tokens 0, NON in streaming (combinazione rifiutata), con gli stessi parametri dei turni,
   * scrive in cache i blocchi di sistema; il primo turno vero li legge invece di scriverli.
   */
  async preriscalda(sistema: string[]): Promise<EsitoNarrazione | null> {
    const client = this.cliente();
    const risposta = await client.messages.create({
      ...this.parametri(sistema),
      max_tokens: 0,
      messages: [{ role: 'user', content: 'Preriscaldamento della cache: non rispondere.' }],
    });
    const uso = risposta.usage as unknown as UsoToken;
    return {
      testo: '',
      modello: risposta.model,
      stopReason: risposta.stop_reason ?? null,
      uso,
      costo: calcolaCosto(this.modello, uso),
      idMessaggio: risposta.id,
    };
  }
}
