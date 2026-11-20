/**
 * Data check of the Basic Fantasy r142 rule set against the manual (CC BY-SA 4.0; the brief of the rules-engine work:
 * «for every table, a test that a few rows match the manual»). This is NOT a behaviour test — those run on invented
 * fixtures (test/poteri.test.ts, salvezze.test.ts…) — but the check that the numbers copied into
 * campagne/torre-mozza/regole/regole.yaml are the manual's, page by page, so a typo in a table is caught. Each expected
 * value below was read in the manual (printed page in the comment).
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaRegole } from '../src/regole/caricatore';
import { rigaAlLivello } from '../src/regole/salvezze';
import type { SistemaRegole } from '../src/regole/tipi';

const BF = path.join(import.meta.dirname, '..', '..', '..', 'campagne', 'torre-mozza');

function set(): SistemaRegole {
  const r = caricaRegole(BF);
  // A broken set falls back to the SRD at runtime: make sure this one loads as itself.
  expect(r.sistema.id).toBe('basic-fantasy-r142');
  return r.sistema;
}

const slot = (s: SistemaRegole, classe: string, livello: number): number[] => rigaAlLivello(s.classi!.find((c) => c.id === classe)!.incantesimiAlGiorno, livello)!.slot;

describe('spells per day (Basic Fantasy pp. 7–8)', () => {
  it('Magic-User', () => {
    const s = set();
    expect(slot(s, 'mago', 1)).toEqual([1]);
    expect(slot(s, 'mago', 3)).toEqual([2, 1]);
    expect(slot(s, 'mago', 10)).toEqual([4, 3, 3, 2, 2]);
    expect(slot(s, 'mago', 20)).toEqual([6, 5, 5, 4, 4, 3]);
  });
  it('Cleric: none at 1st level', () => {
    const s = set();
    expect(slot(s, 'chierico', 1)).toEqual([]);
    expect(slot(s, 'chierico', 2)).toEqual([1]);
    expect(slot(s, 'chierico', 12)).toEqual([4, 4, 3, 2, 2, 1]);
    expect(slot(s, 'chierico', 20)).toEqual([6, 5, 5, 4, 3, 3]);
  });
});

describe('the level-1 and level-2 Cleric and Magic-User spells (pp. 15–41)', () => {
  it('every spell of the four lists is a power of the set (37: four are on both lists)', () => {
    const p = set().poteri!;
    expect(p).toHaveLength(37);
    const livelli = (id: string) => p.find((x) => x.id === id)?.livello;
    // p. 15–16: one entry per spell, with each class's level.
    expect(livelli('individuare_il_magico')).toEqual({ chierico: 1, mago: 1 });
    expect(livelli('individuare_il_male')).toEqual({ chierico: 1, mago: 2 });
    expect(livelli('blocca_persone')).toEqual({ chierico: 2, mago: 3 });
    expect(livelli('leggere_il_magico')).toEqual({ mago: 1 });
    expect(p.filter((x) => x.livello['chierico'] === 1).length).toBe(8);
    expect(p.filter((x) => x.livello['chierico'] === 2).length).toBe(8);
    expect(p.filter((x) => x.livello['mago'] === 1).length).toBe(13);
    expect(p.filter((x) => x.livello['mago'] === 2).length).toBe(12);
  });

  it('the numbers of the spells with typed effects', () => {
    const p = set().poteri!;
    const di = (id: string) => p.find((x) => x.id === id)!;
    // Magic Missile, p. 29: 1d6+1, one more missile every three levels beyond the 1st, at most 5.
    expect(di('dardo_incantato').effetti[0]).toMatchObject({ tipo: 'danno', dadi: { numero: 1, facce: 6, bonus: 1 }, colpi: { ogni: 3, massimo: 5 } });
    // Sleep, p. 36: creatures of 3 HD or less, or one of 4; 5 rounds per level; save vs Spells; undead immune.
    expect(di('sonno')).toMatchObject({ dadiVitaMax: 3, oppureUnoFinoA: 4, salvezza: { abilita: 'ts_incantesimi', esito: 'annulla' } });
    expect(di('sonno').immuni).toContain('non_morto');
    expect(di('sonno').effetti[0]).toMatchObject({ tipo: 'condizione', condizione: 'addormentato', durata: { tipo: 'round', perLivello: 5 }, finisceSeFerito: true });
    // Cure Light Wounds, p. 20: 1d6+1.
    expect(di('cura_ferite_leggere').effetti[0]).toMatchObject({ tipo: 'cura', dadi: { numero: 1, facce: 6, bonus: 1 } });
    // Shield, p. 36: +3 AC against melee, +6 against missiles, 5 rounds + 1 per level; blocks magic missiles.
    expect(di('scudo').effetti).toMatchObject([
      { tipo: 'bonus', a: 'difesa', valore: 3, contro: 'mischia', durata: { tipo: 'round', dadi: { bonus: 5 }, perLivello: 1 } },
      { tipo: 'bonus', a: 'difesa', valore: 6, contro: 'distanza' },
      { tipo: 'immunita', a: ['dardo_incantato'] },
    ]);
    // Hold Person, p. 25: a humanoid; one target saves at −2; 2d8 turns (no game clock: the scene).
    expect(di('blocca_persone')).toMatchObject({ soloTipi: ['umanoide'], salvezza: { modificatore: -2 } });
    // Charm Person, p. 18: a humanoid of 4 HD or less, save vs Spells.
    expect(di('charme')).toMatchObject({ soloTipi: ['umanoide'], dadiVitaMax: 4, salvezza: { abilita: 'ts_incantesimi' } });
    // Bless, p. 17: +1 to attack rolls for 1 minute per level (6 rounds).
    expect(di('benedizione').effetti[0]).toMatchObject({ tipo: 'bonus', a: 'attacchi', valore: 1, durata: { perLivello: 6 } });
  });
});
