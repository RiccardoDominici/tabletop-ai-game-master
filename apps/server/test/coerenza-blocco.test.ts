/**
 * «Cosa è vero adesso» (coerenza/blocco.ts, docs/coerenza.md §2): the ledger's rows for the narrator, only what the
 * table may know. Invented fixture names, Italian and English.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { impostaLingua } from '../src/lingua';
import { bloccoVeroAdesso, righeVeroAdesso } from '../src/coerenza/blocco';
import { costruisciRegistro, type FontiRegistro } from '../src/coerenza/registro';

const carta = (o: Partial<TiroMostrato>): TiroMostrato => ({ id: 't', turno: 2, chi: 'pg_ida', nome: 'Ida Ferraro', di_png: false, tipo: 'attacco', etichetta: 'Spada', dadi: [12], dado: 12, vantaggio: null, motivo_vantaggio: null, modificatore: 3, totale: 15, contro: { tipo: 'CA', valore: 13, descrizione: null }, bersaglio: { id: 'png_ruggero', nome: 'Ruggero lo sgherro' }, riuscita: true, critico: false, fallimento_critico: false, danno: null, a_terra: false, privata: false, avversario: null, ...o }) as TiroMostrato;

function fonti(o: Partial<FontiRegistro> = {}): FontiRegistro {
  return {
    turno: 2,
    scena: 'ponte',
    pg: [{ id: 'pg_ida', nome: 'Ida Ferraro', nomi: ['Ida'] }, { id: 'pg_teo', nome: 'Teo', nomi: ['Teo'] }],
    png: [
      { id: 'png_ruggero', nome: 'Ruggero lo sgherro', nomi: ['ruggero'], nascosto: false },
      { id: 'png_bertoldo', nome: 'Bertoldo', nomi: ['bertoldo'], nascosto: false },
      { id: 'png_ombra', nome: 'Ombra', nomi: ['ombra'], nascosto: true },
    ],
    gregari: [],
    presenti: new Set(['png_ruggero', 'png_ombra']),
    usciti: new Map([['png_bertoldo', { turno: 1, verso: 'il mulino' }]]),
    pf: (id) => (id === 'png_ruggero' ? { attuali: 2, massimi: 12 } : null),
    fuori: () => null,
    morenti: new Set(),
    fatti: [{ chiave: 'privato:1:0', testo: 'Il lucchetto cede.', turno: 1, pubblico: false, conosciutoDa: ['pg_teo'] }],
    carte: [carta({}), carta({ chi: 'pg_teo', nome: 'Teo', privata: true, riuscita: false })],
    negati: [],
    ...o,
  };
}

describe('the block «Cosa è vero adesso»', () => {
  it('who is in the scene and how, who left and when, the PCs, the public outcomes; no hidden NPC, no private card or fact', () => {
    const b = bloccoVeroAdesso(costruisciRegistro(fonti()))!;
    expect(b.titolo).toMatch(/^## Cosa è vero adesso/);
    expect(b.righe).toEqual([
      'In scena: Ruggero lo sgherro ferito gravemente.',
      'Usciti dalla scena: Bertoldo (al turno 1, verso il mulino). Qui non parlano né agiscono.',
      'PG: Ida Ferraro in piedi; Teo in piedi.',
      'In questo turno: Ida colpisce Ruggero.',
    ]);
    expect(b.righe.join(' ')).not.toMatch(/Ombra|lucchetto|Teo manca/);
  });

  it('a character losing the round in progress (surprise…) says so in its row; only in play, never for the fallen', () => {
    // The set names it with a capital («Sorpreso»): mid-sentence it is lowercase (final round, attempt 5).
    const righe = righeVeroAdesso(costruisciRegistro(fonti({ fermo: (id) => (id === 'png_ruggero' ? 'Sorpreso' : null) })));
    expect(righe[0]).toBe('In scena: Ruggero lo sgherro ferito gravemente (sorpreso: in questo round non agisce né parla).');
    // Hurt (any lost hit point) is the ledger's `ferite`, the `ferito` class of richiede.stati; no sheet, no flag.
    const r = costruisciRegistro(fonti());
    expect(r.entita.find((e) => e.id === 'png_ruggero')?.ferite).toBe(true);
    expect(r.entita.find((e) => e.id === 'pg_ida')?.ferite).toBeUndefined();
    const morto = costruisciRegistro(fonti({ fuori: (id) => (id === 'png_ruggero' ? 'morto' : null), fermo: () => 'sorpreso' }));
    expect(morto.entita.find((e) => e.id === 'png_ruggero')?.fermo).toBeUndefined();
  });

  it('who gave way to a passed social check, toward whom: public only (final round, FB T2)', () => {
    const righe = righeVeroAdesso(costruisciRegistro(fonti({ convinti: [{ png: 'png_ruggero', autore: 'pg_ida', privata: false }, { png: 'png_ruggero', autore: 'pg_teo', privata: true }] })));
    expect(righe.at(-1)).toBe('Hanno ceduto in questo turno, dopo una prova sociale riuscita (non rifiutano e non respingono chi li ha convinti): Ruggero lo sgherro a Ida.');
    expect(righe.join(' ')).not.toMatch(/a Teo/);
  });

  it('the fallen are rows like the others; nothing to say, no block', () => {
    const morto = righeVeroAdesso(costruisciRegistro(fonti({ fuori: (id) => (id === 'png_ruggero' ? 'morto' : null), carte: [], usciti: new Map() })));
    expect(morto[0]).toBe('In scena: Ruggero lo sgherro non è più in vita: non parla né agisce, il corpo è lì.');
    expect(bloccoVeroAdesso(costruisciRegistro(fonti({ pg: [], presenti: new Set(), usciti: new Map(), carte: [] })))).toBeNull();
  });

  describe('in English', () => {
    beforeAll(() => impostaLingua('en'));
    afterAll(() => impostaLingua('it'));
    it('the same rows from the English pack', () => {
      expect(righeVeroAdesso(costruisciRegistro(fonti()))).toEqual([
        'In the scene: Ruggero lo sgherro badly wounded.',
        'Gone from the scene: Bertoldo (at turn 1, towards il mulino). Here they neither speak nor act.',
        'PCs: Ida Ferraro standing; Teo standing.',
        'This turn: Ida hits Ruggero.',
      ]);
    });
  });
});
