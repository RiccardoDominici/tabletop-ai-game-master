/**
 * Costo in dollari di una chiamata, calcolato dall'oggetto `usage` della risposta.
 *
 * Prezzi di Claude Haiku 5.5 (skill claude-api, shared/models.md e model-migration.md):
 * - prompt ≤ 100K token: $0,10 / MTok in ingresso, $0,50 / MTok in uscita;
 * - prompt > 100K token: $0,50 / MTok in ingresso, $2,50 / MTok in uscita;
 * - lettura dalla cache: 0,1× il prezzo d'ingresso;
 * - scrittura in cache: 1,25× (TTL 5 minuti) oppure 2× (TTL 1 ora).
 * «Prompt» = tutti i token d'ingresso: non in cache + letti dalla cache + scritti in cache.
 */

export interface UsoToken {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  /** Dettaglio per TTL, quando l'API lo fornisce. */
  cache_creation?: { ephemeral_5m_input_tokens?: number | null; ephemeral_1h_input_tokens?: number | null } | null;
}

export interface Tariffa {
  /** $/MTok in ingresso, per prompt fino alla soglia. */
  ingresso: number;
  uscita: number;
  /** Soglia (token di prompt) oltre la quale vale la tariffa alta; null = tariffa unica. */
  soglia: number | null;
  ingressoAlto: number;
  uscitaAlta: number;
  moltiplicatoreLetturaCache: number;
  moltiplicatoreScrittura5m: number;
  moltiplicatoreScrittura1h: number;
}

export const TARIFFE: Record<string, Tariffa> = {
  'claude-haiku-5-5': {
    ingresso: 0.1,
    uscita: 0.5,
    soglia: 100_000,
    ingressoAlto: 0.5,
    uscitaAlta: 2.5,
    moltiplicatoreLetturaCache: 0.1,
    moltiplicatoreScrittura5m: 1.25,
    moltiplicatoreScrittura1h: 2,
  },
};

export interface Costo {
  costo_usd: number;
  token_ingresso: number;
  token_uscita: number;
  token_cache_lettura: number;
  token_cache_scrittura: number;
  /** Token totali di prompt usati per scegliere la tariffa. */
  token_prompt: number;
  tariffa_alta: boolean;
}

export function calcolaCosto(modello: string, uso: UsoToken): Costo {
  const t = TARIFFE[modello];
  if (!t) throw new Error(`tariffa sconosciuta per il modello ${modello}`);
  const lettura = uso.cache_read_input_tokens ?? 0;
  const scrittura = uso.cache_creation_input_tokens ?? 0;
  // Se c'è il dettaglio per TTL lo si usa; altrimenti si assume il TTL predefinito di 5 minuti.
  const scrittura1h = uso.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const scrittura5m = uso.cache_creation ? (uso.cache_creation.ephemeral_5m_input_tokens ?? 0) : scrittura;
  const prompt = uso.input_tokens + lettura + scrittura;
  const alta = t.soglia !== null && prompt > t.soglia;
  const pIn = (alta ? t.ingressoAlto : t.ingresso) / 1e6;
  const pOut = (alta ? t.uscitaAlta : t.uscita) / 1e6;
  const costo =
    uso.input_tokens * pIn +
    uso.output_tokens * pOut +
    lettura * pIn * t.moltiplicatoreLetturaCache +
    scrittura5m * pIn * t.moltiplicatoreScrittura5m +
    scrittura1h * pIn * t.moltiplicatoreScrittura1h;
  return {
    costo_usd: arrotonda(costo),
    token_ingresso: uso.input_tokens,
    token_uscita: uso.output_tokens,
    token_cache_lettura: lettura,
    token_cache_scrittura: scrittura,
    token_prompt: prompt,
    tariffa_alta: alta,
  };
}

/** 8 decimali bastano (un token d'uscita di Haiku vale 5e-7 $). */
function arrotonda(x: number): number {
  return Math.round(x * 1e8) / 1e8;
}
