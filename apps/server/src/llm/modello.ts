/**
 * L'interfaccia unica dei modelli di linguaggio (docs/provider.md). Tutto ciò che nel gioco chiede
 * qualcosa a un modello (lettore, arbitri, «la volta scorsa», «Chiedi una regola») passa da qui, così
 * il provider si sceglie in configurazione: in locale (mlx-lm, llama.cpp, Ollama: API compatibile
 * OpenAI), Anthropic, OpenRouter, un URL compatibile OpenAI qualsiasi, o il finto dei test.
 *
 * - `chiedi`: una risposta intera; con `schema`, uscita strutturata (JSON).
 * - `flusso`: la stessa cosa in streaming, delta per delta (il narratore).
 * - `capacita`: cosa il provider sa fare davvero. Dove l'uscita strutturata non c'è (i modelli
 *   locali), `chiediStrutturato` (llm/strutturato.ts) valida, ritenta una volta e poi usa un ripiego
 *   deterministico.
 */
import type { Costo, UsoToken } from './costi';

export type NomeProvider = 'anthropic' | 'openai' | 'finto';

export interface BloccoSistema {
  testo: string;
  /**
   * Il blocco è stabile e va in cache. Anthropic: cache_control su QUESTO blocco. I provider con la
   * cache del prefisso (mlx-lm, llama.cpp) riusano da soli il prefisso comune: lì è solo un'indicazione.
   */
  cache?: boolean;
}

export interface RichiestaModello {
  sistema: BloccoSistema[];
  messaggi: Array<{ ruolo: 'user' | 'assistant'; testo: string }>;
  maxTokens: number;
  signal?: AbortSignal;
  /** Uscita strutturata: lo schema JSON della risposta (solo dove `capacita.strutturato`). */
  schema?: Record<string, unknown>;
}

export interface RispostaModello {
  testo: string;
  modello: string;
  stopReason: string | null;
  uso: UsoToken;
  costo: Costo;
  id: string | null;
}

export interface Capacita {
  /** Uscita strutturata garantita dal provider (json_schema). */
  strutturato: boolean;
  /** Ammette una richiesta a 0 token d'uscita per scrivere la cache (Anthropic). */
  preriscalda: boolean;
}

export interface ModelloLinguaggio {
  readonly provider: NomeProvider;
  readonly modello: string;
  readonly capacita: Capacita;
  /** Descrizione per i log («anthropic claude-haiku-5-5», «openai http://127.0.0.1:4613/v1 qwen…»). */
  readonly descrizione: string;
  chiedi(r: RichiestaModello): Promise<RispostaModello>;
  flusso(r: RichiestaModello, onDelta: (delta: string) => void): Promise<RispostaModello>;
}

/** Costo zero (modelli locali, finti, o senza tariffa nota). */
export function costoZero(uso: UsoToken): Costo {
  const prompt = uso.input_tokens + (uso.cache_read_input_tokens ?? 0) + (uso.cache_creation_input_tokens ?? 0);
  return {
    costo_usd: 0,
    token_ingresso: uso.input_tokens,
    token_uscita: uso.output_tokens,
    token_cache_lettura: uso.cache_read_input_tokens ?? 0,
    token_cache_scrittura: uso.cache_creation_input_tokens ?? 0,
    token_prompt: prompt,
    tariffa_alta: false,
  };
}
