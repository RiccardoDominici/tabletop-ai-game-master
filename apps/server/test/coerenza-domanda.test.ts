/**
 * The candidate checker's question (coerenza/domanda.ts): built from the ledger and the mentions the filter found, one
 * yes/no per sentence, read from the model's structured answer. Invented fixture (Ruggero the bandit, dead).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { chiedi, domandaPer } from '../src/coerenza/domanda';
import type { Registro } from '../src/coerenza/registro';
import { impostaLingua } from '../src/lingua';
import type { ModelloLinguaggio, RichiestaModello } from '../src/llm/modello';

const registro: Registro = {
  turno: 4,
  scena: 'scena_ponte',
  entita: [
    { id: 'pg_ida', tipo: 'pg', nome: 'Ida Marchi', nomi: ['Ida Marchi', 'Ida'], stato: 'in_piedi', presenza: 'in_scena', uscito: null },
    { id: 'png_ruggero', tipo: 'png', nome: 'Ruggero', nomi: ['ruggero', 'bandito'], stato: 'morto', presenza: 'in_scena', uscito: null },
    { id: 'png_bertoldo', tipo: 'png', nome: 'Bertoldo', nomi: ['bertoldo'], stato: 'in_piedi', presenza: 'altrove', uscito: null },
  ],
  fatti: [],
  esiti: [],
  negati: [],
};

function modello(risposta: string, viste: RichiestaModello[] = []): ModelloLinguaggio {
  const r = { testo: risposta, modello: 'finto', stopReason: 'end_turn', uso: { input_tokens: 0, output_tokens: 0 }, costo: { usd: 0 }, id: null };
  return {
    provider: 'finto',
    modello: 'finto',
    capacita: { strutturato: true, preriscalda: false },
    descrizione: 'finto',
    chiedi: async (q) => {
      viste.push(q);
      return r as never;
    },
    flusso: async () => r as never,
  };
}

beforeAll(() => impostaLingua('it'));

describe('the yes/no question of the candidate checker', () => {
  it('asks about each flagged character once, with its state and the ledger rows', () => {
    const q = domandaPer({ registro, frase: 'Ruggero alza la testa e ride.', prima: 'Ida si china.', menzioni: ['fuori:png_ruggero', 'nome:bandito', 'assente:png_bertoldo'] })!;
    expect(q.messaggio).toContain('«Ruggero alza la testa e ride.»');
    expect(q.messaggio).toContain('Ruggero (Ruggero non è più in vita');
    expect(q.messaggio).toContain('un «bandito»');
    expect(q.messaggio).toContain('Bertoldo (non è in questa scena)');
    expect(q.messaggio).toContain('Frase precedente: «Ida si china.»');
  });

  it('nothing to ask: null', () => {
    expect(domandaPer({ registro, frase: 'Il vento soffia.', prima: '', menzioni: [] })).toBeNull();
  });

  it('reads «si» and «no» from the structured answer, and asks for the schema', async () => {
    const viste: RichiestaModello[] = [];
    const q = domandaPer({ registro, frase: 'Ruggero ride.', prima: '', menzioni: ['fuori:png_ruggero'] })!;
    expect((await chiedi(modello('{"risposta":"si"}', viste), q)).si).toBe(true);
    expect((await chiedi(modello('{"risposta":"no"}'), q)).si).toBe(false);
    expect(viste[0]?.schema).toBeDefined();
    expect(viste[0]?.maxTokens).toBeLessThanOrEqual(20);
  });
});
