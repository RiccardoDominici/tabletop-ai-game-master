/**
 * Roll numbers the set derives (rules-engine package R5, docs/regole.md §2; audit X-OPT-05, C-RACE-10, C-RACE-05):
 * - a check's number falls with the character's level (`difficolta_per_livello`; Basic Fantasy's Ability Rolls, p. 189),
 *   every rung moving by the same amount, saves and thresholds untouched, a monster (no class) at the rungs as written;
 * - x-in-6 chances from the sheet (`soglia.piu` and the traits; Basic Fantasy pp. 43–44): a stuck door 1 + Strength, a
 *   secret door one more with Intelligence 15 and one more for an elf.
 * On the invented fucina fixture.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { caricaRegole } from '../src/regole/caricatore';
import { sistemaAlLivello, spostamentoAlLivello } from '../src/regole/prove-livello';
import { leggiSchedaGenerica, valoriDaSoglie } from '../src/regole/schede';
import { FIX, az, motoreSet } from './aiuti/motori-prove';

const FUCINA = path.join(FIX, 'fucina');
const s = caricaRegole(FUCINA).sistema;
const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-livello-'));
afterAll(() => fs.rmSync(radice, { recursive: true, force: true }));

const scheda = (o: Record<string, unknown>) => leggiSchedaGenerica(s, 'pg_x', 'X', false, { caratteristiche: { forza: 10, mente: 10, agilita: 10, tempra: 10 }, pf: 5, ...o })!;

describe('a check\'s number by the level', () => {
  it('the rungs move with the row of the level: 15 at the 1st, 14 at the 2nd and 3rd, 12 from the 4th', () => {
    expect(s.id).toBe('fucina-prova');
    expect([0, 1, 2, 3, 4, 9].map((l) => spostamentoAlLivello(s, l))).toEqual([0, 0, -1, -1, -3, -3]);
    const al = (o: Record<string, unknown>) => sistemaAlLivello(s, scheda(o)).difficolta.map((d) => d.valore);
    expect(al({ classe: 'lama', livello: 1 })).toEqual([11, 15, 18]);
    expect(al({ classe: 'lama', livello: 2 })).toEqual([10, 14, 17]);
    expect(al({ classe: 'lama', livello: 5 })).toEqual([8, 12, 15]);
    // A monster's hit dice are not a level: no class, the rungs as written.
    expect(al({ livello: 5 })).toEqual([11, 15, 18]);
  });

  it('the Engine rolls a 2nd-level PC\'s check against 14, the 1st-level one against 15; a save keeps its own number', async () => {
    const dest = path.join(radice, 'fucina');
    fs.cpSync(FUCINA, dest, { recursive: true });
    const pg = YAML.parse(fs.readFileSync(path.join(dest, 'pg.yaml'), 'utf8')) as { personaggi: Array<{ scheda: Record<string, unknown> }> };
    const brina = pg.personaggi[0]!;
    const prova = { 'Sollevo la trave': { tipo: 'prova' as const, caratteristica: 'forza' }, 'Resisto al fumo': { tipo: 'prova' as const, abilita: 'ts_morte' } };
    // d20 13 + Forza 14 (+1) = 14: short of 15 at the 1st level, enough at the 2nd.
    const m1 = motoreSet(FUCINA, prova, [13]);
    const r1 = await m1.risolvi(1, [az('a1', 'pg_brina', 'Sollevo la trave')]);
    expect(r1.tiri[0]).toMatchObject({ totale: 14, riuscita: false, contro: { valore: 15 } });
    brina.scheda = { ...brina.scheda, livello: 2, px: 1000, pf: 12 };
    fs.writeFileSync(path.join(dest, 'pg.yaml'), YAML.stringify(pg));
    const m2 = motoreSet(dest, prova, [13, 12]);
    const r2 = await m2.risolvi(1, [az('a1', 'pg_brina', 'Sollevo la trave')]);
    expect(r2.tiri[0]).toMatchObject({ totale: 14, riuscita: true, contro: { valore: 14 } });
    // The save is the class table's 12, whatever the level's row.
    const r3 = await m2.risolvi(2, [az('a2', 'pg_brina', 'Resisto al fumo')]);
    expect(r3.tiri[0]).toMatchObject({ tipo: 'salvezza', contro: { valore: 12 } });
  });
});

describe('x-in-6 chances from the sheet', () => {
  it('a stuck door is 1 + the Forza bonus; a hidden door 1, +1 with Mente 15, +1 for the small race', () => {
    expect(valoriDaSoglie(s, scheda({ caratteristiche: { forza: 16, mente: 10, agilita: 10, tempra: 10 } }))).toEqual({ forzare: 3, cercare: 1 });
    expect(valoriDaSoglie(s, scheda({ caratteristiche: { forza: 5, mente: 15, agilita: 10, tempra: 10 } }))).toEqual({ forzare: 0, cercare: 2 });
    expect(valoriDaSoglie(s, scheda({ razza: 'piccolo', caratteristiche: { forza: 12, mente: 16, agilita: 12, tempra: 10 } }))).toEqual({ forzare: 1, cercare: 3 });
    // On the sheet the Engine reads, unless the sheet writes its own (an override).
    expect(scheda({ razza: 'piccolo' }).abilita).toMatchObject({ forzare: 1, cercare: 2 });
    expect(scheda({ abilita: { forzare: 4 } }).abilita['forzare']).toBe(4);
  });

  it('rolled under the derived value: Brina (Forza 14) forces a door on 1–2', async () => {
    const m = motoreSet(FUCINA, { 'Sfondo la porta': { tipo: 'prova', abilita: 'forzare' } }, [2]);
    const r = await m.risolvi(1, [az('a1', 'pg_brina', 'Sfondo la porta')]);
    expect(r.tiri[0]).toMatchObject({ dado: 2, riuscita: true, risoluzione: 'sotto_soglia', facce: 6 });
  });

  it('without the value, the set\'s other die: a non-thief listens on 1 in 1d6, the Game Master\'s secret roll (p. 43)', async () => {
    const m = motoreSet(FUCINA, { 'Origlio alla porta': { tipo: 'prova', abilita: 'origliare' } }, [1]);
    const r = await m.risolvi(1, [az('a1', 'pg_brina', 'Origlio alla porta')]);
    expect(r.tiri[0]).toMatchObject({ dado: 1, riuscita: true, risoluzione: 'sotto_soglia', facce: 6, nascosta: true });
  });
});
