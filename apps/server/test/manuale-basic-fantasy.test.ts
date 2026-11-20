/**
 * Data check of the Basic Fantasy r142 rule set against the manual (CC BY-SA 4.0; the brief of the rules-engine work:
 * «for every table, a test that a few rows match the manual»). This is NOT a behaviour test — those run on invented
 * fixtures (test/poteri.test.ts, salvezze.test.ts…) — but the check that the numbers copied into
 * campagne/torre-mozza/regole/regole.yaml are the manual's, page by page, so a typo in a table is caught. Each expected
 * value below was read in the manual (printed page in the comment).
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaRegole } from '../src/regole/caricatore';
import { bersaglioSalvezza, rigaAlLivello } from '../src/regole/salvezze';
import { caricaSchedeGeneriche, trattiDi } from '../src/regole/schede';
import { bonusTratti } from '../src/regole/tratti';
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
    // Charm Person, p. 18: a humanoid of 4 HD or less, save vs Spells (with Wisdom against charm, p. 60).
    expect(di('charme')).toMatchObject({ soloTipi: ['umanoide'], dadiVitaMax: 4, salvezza: { abilita: 'ts_charme' } });
    // Bless, p. 17: +1 to attack rolls for 1 minute per level (6 rounds).
    expect(di('benedizione').effetti[0]).toMatchObject({ tipo: 'bonus', a: 'attacchi', valore: 1, durata: { perLivello: 6 } });
  });
});

const ts = (s: SistemaRegole, classe: string, livello: number): number[] => rigaAlLivello(s.tiriSalvezza!.classi[classe]!, livello)!.valori;

describe('saving throws by class and level (p. 61): Death Ray or Poison, Wands, Paralysis, Breath, Spells', () => {
  it('a few rows of each class', () => {
    const s = set();
    expect(s.tiriSalvezza!.colonne.map((c) => c.id)).toEqual(['morte', 'bacchette', 'paralisi', 'soffio', 'incantesimi']);
    expect(ts(s, 'guerriero', 0)).toEqual([13, 14, 15, 16, 18]);
    expect(ts(s, 'guerriero', 1)).toEqual([12, 13, 14, 15, 17]);
    expect(ts(s, 'guerriero', 3)).toEqual([11, 12, 14, 15, 16]);
    expect(ts(s, 'guerriero', 20)).toEqual([5, 6, 8, 9, 10]);
    expect(ts(s, 'chierico', 1)).toEqual([11, 12, 14, 16, 15]);
    expect(ts(s, 'chierico', 20)).toEqual([5, 6, 9, 11, 10]);
    expect(ts(s, 'mago', 11)).toEqual([11, 10, 9, 13, 11]);
    expect(ts(s, 'mago', 20)).toEqual([8, 6, 5, 11, 8]);
    expect(ts(s, 'ladro', 1)).toEqual([13, 14, 13, 16, 15]);
    expect(ts(s, 'ladro', 20)).toEqual([6, 8, 8, 6, 8]);
  });

  it('race traits (pp. 5–6) and the exceptions of p. 60', () => {
    const s = set();
    const razza = (id: string) => s.razze!.find((r) => r.id === id)!.tratti;
    expect(bonusTratti(razza('nano'), { tipo: 'salvezza', colonna: 'morte' })).toBe(4);
    expect(bonusTratti(razza('nano'), { tipo: 'salvezza', colonna: 'soffio' })).toBe(3);
    expect(bonusTratti(razza('elfo'), { tipo: 'salvezza', colonna: 'incantesimi' })).toBe(2);
    expect(bonusTratti(razza('elfo'), { tipo: 'salvezza', colonna: 'paralisi' })).toBe(1);
    expect(bonusTratti(razza('halfling'), { tipo: 'iniziativa' })).toBe(1);
    expect(bonusTratti(razza('halfling'), { tipo: 'abilita', abilita: 'distanza' })).toBe(1);
    expect(s.abilita.find((a) => a.id === 'ts_veleno')).toMatchObject({ caratteristica: 'costituzione', salvezza: 'morte' });
    expect(s.abilita.find((a) => a.id === 'ts_charme')).toMatchObject({ caratteristica: 'saggezza', salvezza: 'incantesimi' });
    expect(s.abilita.find((a) => a.id === 'ts_illusioni')).toMatchObject({ caratteristica: 'intelligenza', salvezza: 'incantesimi' });
  });

  it('the four pregenerated PCs save as they did before the tables (the same odds), now from the table and the race', () => {
    const s = set();
    const schede = caricaSchedeGeneriche(s, caricaCampagna(BF));
    const tiro = (pg: string, abilita: string) => {
      const sch = schede.get(pg)!;
      const t = bersaglioSalvezza(s, sch, abilita, bonusTratti(trattiDi(s, sch), { tipo: 'salvezza', colonna: s.abilita.find((a) => a.id === abilita)!.salvezza as string }))!;
      // The number the d20 alone must reach.
      return t.contro - t.modificatore;
    };
    // Before: the sheet's bonus against 17 (Livia ts_morte 5 → 12, Fulco 10 → 7, Nespola ts_soffio 4 → 13, Eliandro ts_incantesimi 4 → 13).
    expect(tiro('pg_livia', 'ts_morte')).toBe(12);
    expect(tiro('pg_fulco', 'ts_morte')).toBe(7);
    expect(tiro('pg_nespola', 'ts_soffio')).toBe(13);
    expect(tiro('pg_eliandro', 'ts_incantesimi')).toBe(13);
    // Zirrà saves as a level-3 fighter (11 12 14 15 16).
    expect(bersaglioSalvezza(s, schede.get('png_zirra')!, 'ts_incantesimi')).toMatchObject({ contro: 16, fonte: 'tabella' });
  });
});
