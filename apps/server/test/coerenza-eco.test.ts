/**
 * R-eco (coerenza/eco.ts, docs/coerenza.md): a sentence that restates a player's words beyond the announcement. Round 7
 * (off the rails, T4): «Il mulino sul fiume ha la ruota rotta da mesi» came back as «Nano, la ruota è rotta da mesi.».
 * Invented sentences.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { ecoDi } from '../src/coerenza/eco';
import { VerificaTurno, type Violazione } from '../src/coerenza/verifica';
import { impostaLingua } from '../src/lingua';

beforeAll(() => impostaLingua('it'));
const VUOTE = new Set(['della', 'dalla', 'sulla', 'nella', 'questa', 'quella']);

describe("an echo of the player's words", () => {
  it("most of the sentence's content words come from one clause of an action", () => {
    expect(ecoDi('Nano, la ruota del mulino è rotta da mesi.', ['Il mulino sul fiume ha la ruota rotta da mesi, vado a benedirla.'], VUOTE)).toBe('Il mulino sul fiume ha la ruota rotta da mesi');
  });
  it('an answer that reuses a noun or two is not an echo', () => {
    expect(ecoDi("La lavagna l'ha scritta mio figlio, con il carbone del camino.", ['Berta, chi ha scritto la lavagna?'], VUOTE)).toBeNull();
    expect(ecoDi('Il fiume è lontano.', ['Il mulino sul fiume ha la ruota rotta da mesi.'], VUOTE)).toBeNull();
  });
});

describe('the checker drops the echo, never the announcement', () => {
  const regole = { turno: 2, idPng: new Set<string>(), nomiPg: [], eco: { azioni: ['Il mulino sul fiume ha la ruota rotta da mesi, vado a benedirla.'], vuote: VUOTE } };
  it('R-eco on a narrator sentence; the attributed announcement passes', () => {
    const viste: Violazione[] = [];
    const v = new VerificaTurno(regole, (x) => viste.push(x));
    expect(v.verifica({ etichetta: 'narratore', testo: 'La ruota del mulino è rotta da mesi.', voce: '', segmento: 1 })).toEqual({ tipo: 'togli' });
    expect(viste).toEqual([expect.objectContaining({ regola: 'R-eco', azione: 'tolta' })]);
    expect(v.verifica({ etichetta: 'narratore', testo: 'Fulco dice: «Il mulino sul fiume ha la ruota rotta da mesi».', voce: '', segmento: 2, attribuita: true }).tipo).toBe('dici');
  });
});

describe('catchphrases and tics (B3 of the final e2e pass; round 7: «Le pecore non aspettano.» at T2 and T6)', () => {
  it('a sentence heard in this visit is not said again, even after the three-turn window; an NPC\'s tic just heard neither', () => {
    const viste: Violazione[] = [];
    const v = new VerificaTurno(
      { turno: 6, idPng: new Set(['png_berta']), nomiPg: [], giàSentite: new Set(), giàSentiteVisita: new Set(['le pecore non aspettano']), ticVietati: new Map([['png_berta', ['ride corto']]]) },
      (x) => viste.push(x),
    );
    expect(v.verifica({ etichetta: 'png_berta', testo: 'Le pecore non aspettano.', voce: '', segmento: 1 })).toEqual({ tipo: 'togli' });
    expect(v.verifica({ etichetta: 'png_berta', testo: 'Berta ride corto e scuote la testa.', voce: '', segmento: 2 })).toEqual({ tipo: 'togli' });
    expect(v.verifica({ etichetta: 'png_berta', testo: 'Il fieno è bagnato, stanotte.', voce: '', segmento: 3 }).tipo).toBe('dici');
    expect(viste.map((x) => x.regola)).toEqual(['R-ripetuta', 'R-ripetuta']);
  });
});
