/**
 * Combination classes (docs/regole.md §2 «Classi combinate»; regole/combinazioni.ts; audit C-RACE-26, C-RACE-27): a class
 * that names two bases takes both requirements, the better save and attack bonus at each level, the XP summed, the
 * caster's spells and starting book, the thief's percentages and sneak attack; it writes its own hit die. On an invented
 * minimal set; Basic Fantasy's elves are in manuale-basic-fantasy.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { espandiCombinazioni } from '../src/regole/combinazioni';
import { leggiSistema } from '../src/regole/caricatore';

const base = {
  id: 'combinate-prova',
  licenza: { nome: 'CC0', libera: true },
  risoluzione: { tipo: 'd20_cd', dado: 20 },
  caratteristiche: [{ id: 'forza' }, { id: 'mente' }, { id: 'agilita' }],
  abilita: [
    { id: 'mischia', caratteristica: 'forza' },
    { id: 'furtivo', caratteristica: 'forza' },
    { id: 'scassinare', caratteristica: null, soglia: { dado: 100 } },
    { id: 'ts_a', caratteristica: null, salvezza: 'a' },
    { id: 'ts_b', caratteristica: null, salvezza: 'b' },
  ],
  difficolta: [{ id: 'normale', valore: 15 }],
  tiri_salvezza: { colonne: [{ id: 'a' }, { id: 'b' }] },
  progressione: { attacco: ['mischia', { abilita: 'furtivo', piu: 4, classi: ['ombra'] }], punti_ferita: { caratteristica: null, minimo: 1 } },
  classi: [
    { id: 'lama', requisiti: { forza: 9 }, px: [0, 2000, 4000], dadi_vita: [{ da: 1, dado: '1d8' }], attacco: [{ da: 0, bonus: 0 }, { da: 1, bonus: 1 }, { da: 2, bonus: 2 }], tiri_salvezza: [{ da: 0, valori: [14, 16] }, { da: 1, valori: [12, 15] }, { da: 3, valori: [10, 14] }] },
    { id: 'arcano', requisiti: { mente: { min: 9 } }, px: [0, 2500, 5000], dadi_vita: [{ da: 1, dado: '1d4' }], attacco: [{ da: 1, bonus: 1 }, { da: 4, bonus: 2 }], tiri_salvezza: [{ da: 1, valori: [13, 12] }, { da: 2, valori: [12, 11] }], incantesimi_al_giorno: [{ da: 1, slot: [1] }, { da: 2, slot: [2] }] },
    { id: 'ombra', requisiti: { agilita: 9 }, px: [0, 1250, 2500], dadi_vita: [{ da: 1, dado: '1d4' }], attacco: [{ da: 1, bonus: 1 }], tiri_salvezza: [{ da: 1, valori: [13, 14] }], abilita: { colonne: ['scassinare'], righe: [{ da: 1, valori: [25] }, { da: 2, valori: [30] }] } },
    { id: 'lama_arcano', combinazione: ['lama', 'arcano'], dadi_vita: [{ da: 1, dado: '1d6' }] },
    { id: 'arcano_ombra', combinazione: ['arcano', 'ombra'], dadi_vita: [{ da: 1, dado: '1d4' }], requisiti: { agilita: { min: 11 } } },
  ],
  poteri: [{ id: 'scintilla', nome: 'Scintilla', tipo: 'incantesimo', livello: { arcano: 1 }, bersaglio: 'uno', descrittivo: true }],
  creazione: { livello: 1, passi: ['caratteristiche', 'classe', 'incantesimi'], caratteristiche: { metodi: [{ id: 'x', dadi: '3d6', ordine: 'fisso' }] }, incantesimi: [{ classe: 'arcano', fissi: ['scintilla'], a_scelta: 0, livello: 1, come: 'scelta' }] },
};

describe('a combination class as the set reads it', () => {
  const errori: string[] = [];
  const s = leggiSistema(structuredClone(base), errori, [])!;
  const c = (id: string) => s.classi!.find((x) => x.id === id)!;

  it('loads without errors', () => expect(errori).toEqual([]));

  it('both requirements; XP summed level by level', () => {
    expect(c('lama_arcano').requisiti).toEqual({ forza: { min: 9, max: null }, mente: { min: 9, max: null } });
    expect(c('lama_arcano').progressione.px).toEqual([0, 4500, 9000]);
    // Its own requirement on top of the bases' (a higher minimum).
    expect(c('arcano_ombra').requisiti).toMatchObject({ mente: { min: 9 }, agilita: { min: 11 } });
  });

  it('the better save (lower) and attack bonus (higher) at every level, from the level both classes have', () => {
    expect(c('lama_arcano').tiriSalvezza).toEqual([
      { da: 1, valori: [12, 12] },
      { da: 2, valori: [12, 11] },
      { da: 3, valori: [10, 11] },
    ]);
    expect(c('lama_arcano').progressione.attacco).toEqual([
      { da: 1, bonus: 1 },
      { da: 2, bonus: 2 },
      { da: 4, bonus: 2 },
    ]);
  });

  it('the caster’s spells per day and its powers; the thief’s percentages; its own hit die', () => {
    expect(c('lama_arcano').incantesimiAlGiorno).toEqual([
      { da: 1, slot: [1] },
      { da: 2, slot: [2] },
    ]);
    expect(s.poteri!.find((p) => p.id === 'scintilla')!.livello).toEqual({ arcano: 1, lama_arcano: 1, arcano_ombra: 1 });
    expect(c('arcano_ombra').progressione.abilita).toEqual({ colonne: ['scassinare'], righe: [{ da: 1, valori: [25] }, { da: 2, valori: [30] }] });
    expect(c('lama_arcano').progressione.dadiVita[0]!.dado).toEqual({ numero: 1, facce: 6, bonus: 0 });
  });

  it('the base’s starting book and the thief’s sneak attack extend to the combination', () => {
    expect(s.creazione!.incantesimi.map((x) => x.classe)).toEqual(['arcano', 'lama_arcano', 'arcano_ombra']);
    expect(s.progressione!.attacco.find((a) => a.abilita === 'furtivo')!.classi).toEqual(['ombra', 'arcano_ombra']);
  });
});

describe('a broken combination', () => {
  it('a base that is not a single class of the set, a combination without its own hit die', () => {
    const errori: string[] = [];
    const d = structuredClone(base) as { classi: Array<Record<string, unknown>> };
    d.classi.push({ id: 'doppia', combinazione: ['lama_arcano', 'ombra'], dadi_vita: [{ da: 1, dado: '1d6' }] }, { id: 'senza_dado', combinazione: ['lama', 'ombra'] }, { id: 'fantasma', combinazione: ['lama', 'paladino'], dadi_vita: [{ da: 1, dado: '1d6' }] });
    espandiCombinazioni(d, errori);
    expect(errori).toEqual([
      'classi.doppia.combinazione: two single classes of the set (lama_arcano, ombra)',
      'classi.senza_dado.dadi_vita: a combination class writes its own hit dice (the manual gives it a die of its own)',
      'classi.fantasma.combinazione: two single classes of the set (lama, paladino)',
    ]);
  });

  it('a set without combinations comes back unchanged (the same object)', () => {
    const d = { ...structuredClone(base), classi: base.classi.slice(0, 3) };
    expect(espandiCombinazioni(d, [])).toBe(d);
  });
});
