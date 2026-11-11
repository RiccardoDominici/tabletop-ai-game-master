/**
 * Combat outcome guard (narrazione/guardia-esiti.ts): the two cases of the second pass of the final end-to-end
 * run, rebuilt on fixture names. A standing NPC «cade» with no Engine fact; a miss on the card told as a hit.
 * The Engine's line replaces the sentence. Italian and English.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { impostaLingua } from '../src/lingua';
import { guardiaEsiti } from '../src/narrazione/guardia-esiti';
import { fattiMancanti } from '../src/prove/fatti-dovuti';

const attacco = (chi: string, bersaglio: string, riuscita: boolean): TiroMostrato => ({ id: 't', tipo: 'attacco', chi, nome: chi, bersaglio: { id: bersaglio, nome: bersaglio }, riuscita, privata: false }) as TiroMostrato;

const NOMI = new Map<string, string[]>([
  ['pg_ida', ['Ida Ferraro', 'Ida']],
  ['pg_corrado', ['Corrado Lanzi', 'Corrado']],
  ['png_ruggero', ['ruggero lo sgherro', 'ruggero', 'sgherro']],
  ['png_bertoldo', ['bertoldo', 'gabelliere']],
]);
const NOME: Record<string, string> = { pg_ida: 'Ida Ferraro', pg_corrado: 'Corrado Lanzi', png_ruggero: 'Ruggero lo sgherro', png_bertoldo: 'Bertoldo' };

function guardia(tiri: TiroMostrato[], fuori: string[] = []) {
  return guardiaEsiti({ tiri, nomi: NOMI, conScheda: (id) => id === 'png_ruggero' || id.startsWith('pg_'), fuori: (id) => fuori.includes(id), nome: (id) => NOME[id] ?? id });
}

describe('guardia degli esiti (italiano)', () => {
  it('il caso della partita: la carta dice mancato, il narratore dice colpito → «Ruggero manca Ida.»', () => {
    const g = guardia([attacco('png_ruggero', 'pg_ida', false)]);
    expect(g('Ruggero si alza di scatto, la mazza in pugno, e colpisce Ida di lato: la botta le lascia il braccio intorpidito.')).toEqual({ testo: 'Ruggero manca Ida.', motivo: 'colpo_contrario' });
    // Detto giusto: la frase resta.
    expect(g('La mazza di Ruggero passa accanto a Ida e batte sul muro.')).toBeNull();
    // Il contrario: la carta dice colpito, il narratore dice mancato.
    expect(guardia([attacco('png_ruggero', 'pg_ida', true)])('La mazza di Ruggero manca Ida di un soffio.')).toEqual({ testo: 'Ruggero colpisce Ida.', motivo: 'colpo_contrario' });
    // Una negazione davanti al colpo vale mancato.
    expect(guardia([attacco('png_ruggero', 'pg_ida', true)])('Ruggero non colpisce Ida.')).toEqual({ testo: 'Ruggero colpisce Ida.', motivo: 'colpo_contrario' });
  });

  it('il caso della partita: un PNG in piedi «cade» senza il fatto del Motore → la riga del Motore', () => {
    const colpito = guardia([attacco('pg_corrado', 'png_ruggero', true)]);
    expect(colpito('Il dardo di Corrado colpisce lo sgherro in pieno petto, e quello cade sui gradini con un rantolo.')).toEqual({ testo: 'Ruggero incassa il colpo, ma resta in piedi.', motivo: 'caduta_senza_fatto' });
    // Davvero a terra per il Motore: la frase resta.
    expect(guardia([attacco('pg_corrado', 'png_ruggero', true)], ['png_ruggero'])('Lo sgherro cade sui gradini con un rantolo.')).toBeNull();
    // Senza una carta su di lui: «è ancora in piedi».
    expect(guardia([])('Ruggero crolla a terra, senza vita.')).toEqual({ testo: 'Ruggero è ancora in piedi.', motivo: 'caduta_senza_fatto' });
    // Un PNG senza scheda non cade per il Motore: niente correzione.
    expect(guardia([])('Bertoldo cade dallo sgabello per lo spavento.')).toBeNull();
    // Niente parole di sconfitta: niente correzione.
    expect(guardia([])('Ruggero ride e fa un passo indietro.')).toBeNull();
  });
  it('shares the combat-fact stems: after the guard the combat facts still work (one compilation per section)', () => {
    guardia([])('Ruggero crolla a terra.');
    expect(fattiMancanti([{ tipo: 'colpito', id: 'png_ruggero', nome: 'Ruggero lo sgherro' }], ['Ruggero incassa il colpo.'])).toEqual([]);
  });
});

describe('guardia degli esiti (inglese)', () => {
  beforeAll(() => impostaLingua('en'));
  afterAll(() => impostaLingua('it'));

  it('a hit told against a miss card, and a standing NPC that «collapses»', () => {
    const g = guardia([attacco('png_ruggero', 'pg_ida', false)]);
    expect(g('Ruggero swings his club and strikes Ida on the shoulder.')).toEqual({ testo: 'Ruggero misses Ida.', motivo: 'colpo_contrario' });
    expect(guardia([attacco('pg_corrado', 'png_ruggero', true)])('Corrado’s bolt hits Ruggero, who collapses on the steps.')).toEqual({ testo: 'Ruggero takes the blow but stays on their feet.', motivo: 'caduta_senza_fatto' });
  });
});
