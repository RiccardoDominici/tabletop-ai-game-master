/**
 * Progression by class and level (M1, docs/regole.md §2 «Progressione»; audit rows C-CLS-01…15, C-THF-01, X-AB-01,
 * C-HP-03/04, C-RACE-21): XP thresholds, hit dice by level, the attack bonus and the ability values that grow with the
 * level, read from `classi[]` and derived onto the sheet by its class and level; a value the sheet writes stays as an
 * override. On the invented bx fixture with two invented classes (numbers chosen for the test, not any manual's).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { leggiSistema } from '../src/regole/caricatore';
import { limitiPuntiFerita, livelloDaPx, puntiFeritaDelLivello, sogliaPx, tettoPx } from '../src/regole/progressione';
import { pxDelTesoro, pxDiScheda } from '../src/regole/esperienza';
import { derivaAbilita, leggiSchedaGenerica, trattiDi, valoreCaratteristica } from '../src/regole/schede';
import { bonusEsperienza } from '../src/regole/tratti';
import type { SistemaRegole } from '../src/regole/tipi';

const BX = path.join(import.meta.dirname, 'fixtures', 'campagne', 'bx');
/** Shared with strumenti/test_valida_progressione.py: the same invented tables, the same expected numbers. */
const CASI = YAML.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'progressione', 'casi.yaml'), 'utf8')) as {
  set: Record<string, unknown>;
  schede: Array<{ scheda: Record<string, unknown>; abilita: Record<string, number>; pf: [number, number] | null }>;
  livelli: Array<{ classe: string; px: number; livello: number; tetto: number | null }>;
};

/** bx with the shared invented progression (two classes, two races, XP by hit dice, treasure). */
export function setConProgressione(ritocca: (d: Record<string, unknown>) => void = () => {}): SistemaRegole {
  const d = YAML.parse(fs.readFileSync(path.join(BX, 'regole', 'regole.yaml'), 'utf8')) as Record<string, unknown>;
  Object.assign(d, structuredClone(CASI.set));
  ritocca(d);
  const errori: string[] = [];
  const s = leggiSistema(d, errori, []);
  expect(errori).toEqual([]);
  return s!;
}

describe('the shared cases (the same file the validator\'s test reads)', () => {
  it('each sheet gets the abilities and the hit-point bounds the file says', () => {
    const s = setConProgressione();
    for (const c of CASI.schede) {
      const sch = leggiSchedaGenerica(s, 'pg_x', 'X', false, { pf: 5, ...c.scheda })!;
      expect(sch.abilita, JSON.stringify(c.scheda)).toEqual(c.abilita);
      const classe = s.classi!.find((x) => x.id === c.scheda['classe'])!.progressione;
      const lim = limitiPuntiFerita(s.progressione, classe, sch.livello ?? 1, valoreCaratteristica(s, sch, 'forza'), trattiDi(s, sch));
      expect(lim ? [lim.min, lim.max] : null, JSON.stringify(c.scheda)).toEqual(c.pf);
    }
  });
  it('the level an XP total reaches, and the one-level cap', () => {
    const s = setConProgressione();
    for (const c of CASI.livelli) {
      const classe = s.classi!.find((x) => x.id === c.classe)!.progressione;
      expect(livelloDaPx(classe, c.px), JSON.stringify(c)).toBe(c.livello);
      expect(tettoPx(classe, c.livello, s.progressione!.unLivelloPerAvventura), JSON.stringify(c)).toBe(c.tetto);
    }
  });
});

const scheda = (s: SistemaRegole, extra: Record<string, unknown>, di_png = false) => leggiSchedaGenerica(s, 'pg_x', 'X', di_png, { caratteristiche: { forza: 14, destrezza: 12, potere: 10 }, pf: 8, ...extra })!;

describe('the class tables are read', () => {
  it('XP thresholds: the level an XP total reaches, and one level a time', () => {
    const s = setConProgressione();
    const lama = s.classi!.find((c) => c.id === 'lama')!.progressione;
    expect(sogliaPx(lama, 1)).toBe(0);
    expect(sogliaPx(lama, 3)).toBe(300);
    expect(sogliaPx(lama, 9)).toBeNull();
    expect(livelloDaPx(lama, 0)).toBe(1);
    expect(livelloDaPx(lama, 299)).toBe(2);
    expect(livelloDaPx(lama, 99_999)).toBe(4);
    // A 1st-level character stops one short of the 3rd level's threshold (one level per adventure).
    expect(tettoPx(lama, 1, true)).toBe(299);
    expect(tettoPx(lama, 1, false)).toBeNull();
    expect(tettoPx(lama, 3, true)).toBeNull();
  });

  it('hit dice by level: a die with the characteristic (at least 1), then fixed hit points without it', () => {
    const s = setConProgressione();
    const lama = s.classi!.find((c) => c.id === 'lama')!.progressione;
    expect(puntiFeritaDelLivello(s.progressione, lama, 2, 2, [])).toEqual({ dado: { numero: 1, facce: 10, bonus: 0 }, fissi: 0, bonus: 2, minimo: 1 });
    expect(puntiFeritaDelLivello(s.progressione, lama, 3, 2, [])).toEqual({ dado: null, fissi: 2, bonus: 0, minimo: 0 });
    // A race that never rolls more than a d6.
    expect(puntiFeritaDelLivello(s.progressione, lama, 1, 0, [{ tipo: 'dado_vita', facce: 6 }])!.dado!.facce).toBe(6);
    // Bounds of the maximum: level 2 with −2: each die at least 1; level 3 adds the fixed 2.
    expect(limitiPuntiFerita(s.progressione, lama, 2, -2, [])).toEqual({ min: 2, max: 16 });
    expect(limitiPuntiFerita(s.progressione, lama, 3, 1, [])).toEqual({ min: 6, max: 24 });
  });

  it('a malformed table is reported, not guessed', () => {
    const errori: string[] = [];
    const d = YAML.parse(fs.readFileSync(path.join(BX, 'regole', 'regole.yaml'), 'utf8')) as Record<string, unknown>;
    d['classi'] = [{ id: 'lama', nome: 'Lama', px: [0, 100, 50], dadi_vita: [{ da: 1, dado: '2d6' }], attacco: [{ da: 1, bonus: 1 }], abilita: { colonne: ['nessuna'], righe: [{ da: 1, valori: [1] }] }, tabelle: { scacciare: [{ da: 1, valori: ['No'] }] } }];
    leggiSistema(d, errori, []);
    expect(errori.join('\n')).toMatch(/px\[3\]: XP grow/);
    expect(errori.join('\n')).toMatch(/dadi_vita\[1\]: \{da, dado: "1d8"\}/);
    expect(errori.join('\n')).toMatch(/abilita.colonne: not abilities of the set: nessuna/);
    expect(errori.join('\n')).toMatch(/tabelle.scacciare\[1\].valori: one cell per column/);
    expect(errori.join('\n')).toMatch(/attack or hit-dice rows need the set's progressione/);
  });
});

describe('the sheet takes its numbers from its class and level', () => {
  it('attack bonus to the attack abilities (plus the sneak’s fixed extra) and the ability table by level', () => {
    const s = setConProgressione();
    const a = scheda(s, { classe: 'ombra', livello: 2, px: 60 });
    expect(a.abilita).toMatchObject({ colpo: 1, tiro: 1, pugnalata: 4, origliare: 28, sgattaiolare: 22 });
    expect(a.px).toBe(60);
    expect(a.avvisi).toEqual([]);
    const b = scheda(s, { classe: 'lama', livello: 3 });
    expect(b.abilita).toEqual({ colpo: 3, tiro: 3, pugnalata: 6 });
    // Level 0 (a «normal man») takes the row from 0.
    expect(scheda(s, { classe: 'lama', livello: 0 }).abilita['colpo']).toBe(0);
  });

  it('a race’s own threshold wins when better (the small folk hide at 60)', () => {
    const s = setConProgressione();
    expect(scheda(s, { classe: 'ombra', livello: 1, razza: 'piccolo' }).abilita['sgattaiolare']).toBe(60);
    expect(scheda(s, { classe: 'lama', livello: 1, razza: 'piccolo' }).abilita['sgattaiolare']).toBe(60);
  });

  it('a written value is an override: it stays, and a disagreement is reported', () => {
    const s = setConProgressione();
    const a = scheda(s, { classe: 'ombra', livello: 1, abilita: { origliare: 45, tiro: 1 } });
    expect(a.abilita['origliare']).toBe(45);
    expect(a.avvisi.join(' ')).toMatch(/abilita\.origliare: 45 scritto a mano, la tabella della classe dà 20 al livello 1/);
    // The same number as the table is not an override.
    expect(a.avvisi.join(' ')).not.toMatch(/abilita\.tiro/);
  });

  it('a new level derives everything again; the override stays', () => {
    const s = setConProgressione();
    const a = scheda(s, { classe: 'ombra', livello: 1, abilita: { origliare: 45 } });
    a.livello = 2;
    derivaAbilita(s, a);
    expect(a.abilita).toMatchObject({ origliare: 45, sgattaiolare: 22, colpo: 1 });
  });

  it('a sheet without a class or without tables keeps what it writes', () => {
    const s = setConProgressione();
    expect(scheda(s, { abilita: { colpo: 2 } }).abilita).toEqual({ colpo: 2 });
  });
});

describe('experience points', () => {
  it('a creature’s worth: its own, else by hit dice and asterisks, above the table by the extra row', () => {
    const s = setConProgressione();
    expect(pxDiScheda(s.esperienza, scheda(s, { dadi_vita: 1 }, true))).toBe(20);
    expect(pxDiScheda(s.esperienza, scheda(s, { dadi_vita: 2, speciali: 2 }, true))).toBe(40);
    expect(pxDiScheda(s.esperienza, scheda(s, { dadi_vita: 0 }, true))).toBe(5);
    expect(pxDiScheda(s.esperienza, scheda(s, { dadi_vita: 5, speciali: 1 }, true))).toBe(90 + 200 + 20 + 10);
    expect(pxDiScheda(s.esperienza, scheda(s, { dadi_vita: 1, px: 33 }, true))).toBe(33);
    // A classed NPC counts as the larger of its hit dice and its level.
    expect(pxDiScheda(s.esperienza, scheda(s, { dadi_vita: 1, classe: 'lama', livello: 3 }, true))).toBe(90);
    expect(pxDiScheda(s.esperienza, scheda(s, {}, true))).toBeNull();
  });

  it('treasure by the set’s rate, in whole coins of the rate', () => {
    const s = setConProgressione();
    expect(pxDelTesoro(s.esperienza, s.monete, 125)).toBe(12);
    expect(pxDelTesoro(null, s.monete, 125)).toBeNull();
  });

  it('a race’s XP bonus is a trait', () => {
    const s = setConProgressione();
    expect(bonusEsperienza(trattiDi(s, scheda(s, { razza: 'comune' })))).toBe(10);
  });
});
