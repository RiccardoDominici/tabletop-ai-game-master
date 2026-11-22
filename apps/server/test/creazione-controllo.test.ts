/**
 * The creation check (mechanism M7; regole/controllo-pg.ts; docs/regole.md §2 «Creazione»; audit C-CRE-05, C-ABI-02,
 * C-RACE-02/08/16/23, C-LANG-01): race and class requirements and allow-lists, scores, hit points, XP, forbidden gear,
 * money, starting spells and languages. The cases live in fixtures/creazione/casi.yaml, which the validator's test
 * (strumenti/test_valida_creazione.py) reads too, so the Engine and the validator judge every sheet the same way.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { leggiSistema } from '../src/regole/caricatore';
import { controllaPersonaggio } from '../src/regole/controllo-pg';
import { costoPunti, intervalloDelMetodo, leggiCreazione, punteggioDaDadi } from '../src/regole/creazione';
import { leggiSchedaGenerica } from '../src/regole/schede';

const CASI = path.join(import.meta.dirname, 'fixtures', 'creazione', 'casi.yaml');
const dati = YAML.parse(fs.readFileSync(CASI, 'utf8'), { merge: true }) as { set: Record<string, unknown>; casi: Array<{ nome: string; creato: boolean; scheda: Record<string, unknown>; problemi: string[] }> };

function sistema() {
  const errori: string[] = [];
  const s = leggiSistema(dati.set, errori, []);
  expect(errori).toEqual([]);
  return s!;
}

describe('creation check: the shared cases (fixtures/creazione/casi.yaml)', () => {
  const s = sistema();
  for (const c of dati.casi) {
    it(c.nome, () => {
      const sch = leggiSchedaGenerica(s, 'pg_prova', 'Prova', false, c.scheda)!;
      const codici = controllaPersonaggio(s, sch, { creato: c.creato }).map((p) => p.codice);
      expect([...new Set(codici)].sort()).toEqual([...c.problemi].sort());
    });
  }
});

describe('creation data: the procedure as the set writes it', () => {
  it('reads the steps, the methods, the options, the money and the spells of the fixture', () => {
    const cr = sistema().creazione!;
    expect(cr.passi[0]).toBe('caratteristiche');
    expect(cr.metodi.map((m) => m.id)).toEqual(['in_ordine']);
    expect(cr.opzioni[0]).toMatchObject({ tipo: 'punti', togli: 2, aggiungi: 1, minimo: 9 });
    expect(cr.monete).toEqual({ dadi: { numero: 3, facce: 6, bonus: 0 }, per: 10, moneta: 'mo' });
    expect(cr.incantesimi[0]).toEqual({ classe: 'arcano', fissi: ['leggere_rune'], aScelta: 1, livello: 1, come: 'scelta' });
    expect(cr.senzaSperanza).toEqual({ rimedi: ['ritira', 'ribalta'], ribalta: 21 });
  });

  it('expresses the SRD 5.2 methods too: 4d6 keep the best three, the standard array, the 27-point buy', () => {
    const errori: string[] = [];
    const cr = leggiCreazione(
      {
        punti_ferita: 'massimo',
        passi: ['caratteristiche', 'descrizione'],
        caratteristiche: {
          metodi: [
            { id: 'quattro_dadi', dadi: '4d6', tieni: 3, ordine: 'libero' },
            { id: 'schiera', valori: [15, 14, 13, 12, 10, 8] },
            { id: 'punti', punti: 27, costi: [8, 9, 10, 11, 12, 13, 14, 15].map((valore, i) => ({ valore, costo: i <= 5 ? i : i === 6 ? 7 : 9 })) },
          ],
        },
      },
      { caratteristiche: new Set(['for', 'des', 'cos', 'int', 'sag', 'car']), classi: new Set(), monete: null, incantesimi: new Map() },
      errori,
    )!;
    expect(errori).toEqual([]);
    const [quattro, schiera, punti] = cr.metodi;
    expect(quattro!.tipo === 'dadi' && punteggioDaDadi(quattro!, [1, 6, 4, 5])).toBe(15);
    expect(intervalloDelMetodo(quattro!)).toEqual({ min: 3, max: 18 });
    expect(intervalloDelMetodo(schiera!)).toEqual({ min: 8, max: 15 });
    // The SRD's standard array costs exactly the 27 points of its point buy (15: 9, 14: 7, 13: 5, 12: 4, 10: 2, 8: 0).
    expect(punti!.tipo === 'punti' && costoPunti(punti!, [15, 14, 13, 12, 10, 8])).toBe(27);
    expect(cr.puntiFerita).toBe('massimo');
  });

  it('refuses a misspelt step, a method without dice or values, a coin and a spell the set lacks', () => {
    const errori: string[] = [];
    leggiCreazione(
      { passi: ['razza', 'caratteristiche', 'volare'], caratteristiche: { metodi: [{ id: 'x' }] }, monete: { dadi: '3d6', per: 10, moneta: 'mp' }, incantesimi: [{ classe: 'lama', fissi: ['nulla'] }] },
      { caratteristiche: new Set(['forza']), classi: new Set(['lama']), monete: new Set(['mo']), incantesimi: new Map() },
      errori,
    );
    expect(errori.join('\n')).toMatch(/«volare» is not a step/);
    expect(errori.join('\n')).toMatch(/caratteristiche comes before razza/);
    expect(errori.join('\n')).toMatch(/dadi \(rolled\), valori/);
    expect(errori.join('\n')).toMatch(/«mp» is not a coin/);
    expect(errori.join('\n')).toMatch(/«nulla» is not a spell of the set for lama/);
  });

  it('a race naming a class or a language the set lacks is an error of the set', () => {
    const errori: string[] = [];
    const set = structuredClone(dati.set) as { razze: Array<Record<string, unknown>> };
    set.razze[1] = { ...set.razze[1], classi: ['lama', 'paladino'], lingue: ['comune', 'elfico'] };
    leggiSistema(set, errori, []);
    expect(errori.join('\n')).toMatch(/razze\.piccolo\.classi: «paladino» is not a class/);
    expect(errori.join('\n')).toMatch(/razze\.piccolo\.lingue: «elfico» is not a language/);
  });
});
