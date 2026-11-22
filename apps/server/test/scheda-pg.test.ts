/**
 * The phone's «Scheda» (campagna/scheda.ts; R6 item 4): besides the Preparer's text, the sections the PC's data gives —
 * race, class and level, the scores, the languages, the spellbook — named by the rule set. A PC built at the table has
 * no Preparer's text: before, its sheet showed only its gear. On the invented fucina fixture (a created PC's shape).
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { schedaPg } from '../src/campagna/scheda';
import type { Campagna } from '../src/campagna/tipi';

const FUCINA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'fucina');

describe('the phone’s sheet from the PC’s data', () => {
  it('a PC built at the table (no Preparer’s text): race, class, level, scores, languages and book, by the set’s names', () => {
    const c = caricaCampagna(FUCINA);
    const creato = { id: 'pg_nuovo', nome: 'Nuovo', descrizione: '', privato: [], pubblico: { specie: 'Umano', classe: 'Arcano', livello: 1, scheda: { caratteristiche: { forza: 9, mente: 14 }, lingue: ['comune', 'antico'], libro: ['leggere_rune', 'scintilla'] } } };
    const conPg = { ...c, pg: [...c.pg, creato] } as unknown as Campagna;
    const s = schedaPg(conPg, 'pg_nuovo', { caratteristiche: [{ id: 'mente', nome: 'Mente' }, { id: 'forza', nome: 'Forza' }], lingue: [{ id: 'comune', nome: 'Comune' }, { id: 'antico', nome: 'Antico' }], poteri: [{ id: 'leggere_rune', nome: 'Leggere le rune' }, { id: 'scintilla', nome: 'Scintilla' }] })!;
    expect(s.sezioni).toEqual([
      { titolo: 'Razza, classe e livello', righe: ['Umano, Arcano, 1° livello'] },
      { titolo: 'Caratteristiche', righe: ['Mente 14 · Forza 9'] },
      { titolo: 'Lingue', righe: ['Comune, Antico'] },
      { titolo: 'Libro degli incantesimi', righe: ['Leggere le rune', 'Scintilla'] },
    ]);
  });

  it('a pregenerated PC keeps its text first; without the set the ids are shown as written', () => {
    const c = caricaCampagna(FUCINA);
    const pg = c.pg[0]!;
    const s = schedaPg(c, pg.id)!;
    expect(s.sezioni[0]!.titolo).toBe('Chi sei');
    expect(s.sezioni.some((x) => x.titolo === 'Razza, classe e livello')).toBe(true);
  });
});
