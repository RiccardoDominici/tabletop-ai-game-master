import { describe, expect, it } from 'vitest';
import { calcolaCosto } from '../src/llm/costi';

describe('calcolaCosto (Haiku 5.5)', () => {
  it('solo ingresso e uscita, tariffa bassa', () => {
    const c = calcolaCosto('claude-haiku-5-5', { input_tokens: 50_000, output_tokens: 10_000 });
    expect(c.costo_usd).toBeCloseTo(50_000 * 0.1e-6 + 10_000 * 0.5e-6, 8);
    expect(c.tariffa_alta).toBe(false);
  });

  it('lettura cache a 0,1× e scrittura a 1,25× (5 minuti)', () => {
    const c = calcolaCosto('claude-haiku-5-5', {
      input_tokens: 2000,
      output_tokens: 300,
      cache_read_input_tokens: 20_000,
      cache_creation_input_tokens: 10_000,
    });
    const atteso = 2000 * 0.1e-6 + 300 * 0.5e-6 + 20_000 * 0.01e-6 + 10_000 * 0.125e-6;
    expect(c.costo_usd).toBeCloseTo(atteso, 8);
    expect(c.token_cache_lettura).toBe(20_000);
    expect(c.token_cache_scrittura).toBe(10_000);
    expect(c.token_prompt).toBe(32_000);
  });

  it('usa il dettaglio per TTL quando c’è (1 ora = 2×)', () => {
    const c = calcolaCosto('claude-haiku-5-5', {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 1000,
      cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 1000 },
    });
    expect(c.costo_usd).toBeCloseTo(1000 * 0.2e-6, 10);
  });

  it('oltre 100K token di prompt vale la tariffa alta', () => {
    const c = calcolaCosto('claude-haiku-5-5', { input_tokens: 100_001, output_tokens: 1000 });
    expect(c.tariffa_alta).toBe(true);
    expect(c.costo_usd).toBeCloseTo(100_001 * 0.5e-6 + 1000 * 2.5e-6, 8);
  });

  it('modello sconosciuto → errore', () => {
    expect(() => calcolaCosto('boh', { input_tokens: 1, output_tokens: 1 })).toThrow();
  });
});
