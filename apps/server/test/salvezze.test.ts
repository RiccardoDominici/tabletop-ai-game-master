/**
 * Saving throws as the manual rolls them (M5, docs/regole.md §2 «Tiri salvezza»; audit rows X-SV-03, C-CRE-11, X-SV-04):
 * pinned to their own number, never a difficulty rung or the arbiter's ±2; the class and level table's number when the
 * set has one; and a target's own save against a PC's power, rolled by the Engine on the Game Master's side. On the
 * invented bx fixture with two save abilities and a two-column table added.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import { DadiACopione } from '../src/prove/dadi';
import { risolviTurnoRegole, strumentiRegole } from '../src/prove/risolutore-regole';
import { StatoProve } from '../src/prove/stato';
import { leggiSistema } from '../src/regole/caricatore';
import { bersaglioSalvezza, rigaAlLivello } from '../src/regole/salvezze';
import { caricaSchedeGeneriche, leggiSchedaGenerica } from '../src/regole/schede';
import type { SistemaRegole } from '../src/regole/tipi';

const BX = path.join(import.meta.dirname, 'fixtures', 'campagne', 'bx');

/** bx with a sheet-bonus save (`salvezza: true`), two table saves and an invented two-column table for two classes. */
function setConSalvezze(ritocca: (d: Record<string, unknown>) => void = () => {}): SistemaRegole {
  const d = YAML.parse(fs.readFileSync(path.join(BX, 'regole', 'regole.yaml'), 'utf8')) as Record<string, unknown>;
  d['risoluzione'] = { tipo: 'd20_cd', dado: 20, critici: 'attacchi_e_salvezze' };
  d['abilita'] = [
    { id: 'ts_vecchio', nome: 'Salvezza della scheda', caratteristica: null, salvezza: true },
    { id: 'ts_veleno', nome: 'Salvezza contro veleno', caratteristica: 'forza', salvezza: 'morte' },
    { id: 'ts_magia', nome: 'Salvezza contro magia', caratteristica: 'potere', salvezza: 'magia' },
  ];
  d['tiri_salvezza'] = { colonne: [{ id: 'morte', nome: 'Morte' }, { id: 'magia', nome: 'Magia' }] };
  d['classi'] = [
    { id: 'guerriero', nome: 'Guerriero', tiri_salvezza: [{ da: 0, valori: [14, 17] }, { da: 1, valori: [12, 16] }, { da: 4, valori: [10, 14] }] },
    { id: 'mago', nome: 'Mago', tiri_salvezza: [{ da: 1, valori: [13, 14] }] },
  ];
  ritocca(d);
  const errori: string[] = [];
  const s = leggiSistema(d, errori, []);
  expect(errori).toEqual([]);
  return s!;
}

const base = (id: string, abilita: string, extra: Record<string, unknown> = {}) => ({ id, tipo: 'prova' as const, caratteristica: null, abilita, mossa: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null, ...extra });

describe('the class and level table', () => {
  it('a row holds from its level up; the table replaces the sheet’s own bonus, the characteristic still adds', () => {
    const s = setConSalvezze();
    expect(rigaAlLivello(s.tiriSalvezza!.classi['guerriero']!, 3)!.valori).toEqual([12, 16]);
    expect(rigaAlLivello(s.tiriSalvezza!.classi['guerriero']!, 0)!.valori).toEqual([14, 17]);
    // Forza 14 → +2 (srd modifier of bx); ts_veleno 9 on the sheet is ignored when the table gives the number.
    const sch = leggiSchedaGenerica(s, 'pg_x', 'X', false, { caratteristiche: { forza: 14, destrezza: 10, potere: 12 }, abilita: { ts_veleno: 9, ts_vecchio: 4 }, pf: 5, classe: 'guerriero', livello: 5 })!;
    expect(sch.avvisi).toEqual([]);
    expect(bersaglioSalvezza(s, sch, 'ts_veleno')).toEqual({ contro: 10, modificatore: 2, fonte: 'tabella', colonna: 'morte' });
    expect(bersaglioSalvezza(s, sch, 'ts_magia')).toEqual({ contro: 14, modificatore: 1, fonte: 'tabella', colonna: 'magia' });
    // A sheet-bonus save: the set's default difficulty (bx normale 13) and the sheet's bonus.
    expect(bersaglioSalvezza(s, sch, 'ts_vecchio')).toEqual({ contro: 13, modificatore: 4, fonte: 'scheda', colonna: null });
    // A monster that saves as a class and level; a sheet with no class falls back to its own bonus.
    const mostro = leggiSchedaGenerica(s, 'png_m', 'M', true, { caratteristiche: { forza: 10, destrezza: 10, potere: 10 }, pf: 9, salva_come: { classe: 'guerriero', livello: 4 } })!;
    expect(bersaglioSalvezza(s, mostro, 'ts_veleno')).toMatchObject({ contro: 10, fonte: 'tabella' });
    const senza = leggiSchedaGenerica(s, 'png_n', 'N', true, { caratteristiche: { forza: 10, destrezza: 10, potere: 10 }, abilita: { ts_veleno: 3 }, pf: 9 })!;
    expect(bersaglioSalvezza(s, senza, 'ts_veleno')).toEqual({ contro: 13, modificatore: 3, fonte: 'scheda', colonna: 'morte' });
  });

  it('the loader reports a save column the table lacks, rows of the wrong length, an unknown class on a sheet', () => {
    const errori: string[] = [];
    const d = YAML.parse(fs.readFileSync(path.join(BX, 'regole', 'regole.yaml'), 'utf8')) as Record<string, unknown>;
    d['abilita'] = [{ id: 'ts_x', nome: 'X', caratteristica: null, salvezza: 'fulmini' }];
    d['tiri_salvezza'] = { colonne: [{ id: 'morte', nome: 'Morte' }] };
    d['classi'] = [{ id: 'mago', tiri_salvezza: [{ da: 1, valori: [13, 14] }, { da: 1, valori: [12] }] }];
    leggiSistema(d, errori, []);
    expect(errori.join(' | ')).toMatch(/abilita\.ts_x\.salvezza: «fulmini» is not a column of tiri_salvezza/);
    expect(errori.join(' | ')).toMatch(/classi\.mago\.tiri_salvezza\[1\]: 2 values, the table has 1 columns/);
    expect(errori.join(' | ')).toMatch(/classi\.mago\.tiri_salvezza\[2\]: «da» grows row after row/);
    const sch = leggiSchedaGenerica(setConSalvezze(), 'pg_x', 'X', false, { caratteristiche: { forza: 10, destrezza: 10, potere: 10 }, pf: 5, classe: 'bardo', salva_come: { classe: 'drago' } })!;
    expect(sch.avvisi.join(' | ')).toMatch(/classe: «bardo» non è una classe del set/);
    expect(sch.avvisi.join(' | ')).toMatch(/salva_come: \{classe/);
  });
});

describe('a save is pinned to its own number', () => {
  it('neither a difficulty rung nor the arbiter’s advantage moves it; a condition of the fight still does', () => {
    const s = setConSalvezze();
    const c = caricaCampagna(BX);
    const schede = caricaSchedeGeneriche(s, c);
    // pg_corrado: forza 13 (+1), no class: ts_veleno is a sheet-bonus save against the default 13 (no bonus on the sheet).
    const r = risolviTurnoRegole({ turno: 1, sistema: s, schede, stato: new StatoProve(schede), dadi: new DadiACopione([12, 4]), proveScena: [], nome: (id: string) => id, esiste: () => true, log: loggerMuto(), azioni: [{ id: 'a1', autore: 'pg_corrado', testo: 'Resisto al veleno, al buio', privata: false }], decisioni: new Map([['a1', base('a1', 'ts_veleno', { difficolta: 'difficile', vantaggio: 'svantaggio', motivo: 'al buio' })]]) } as never);
    const t = r.tiri[0]!;
    // 12 + 1 = 13 against 13: saved. With the difficulty «difficile» (16) and the arbiter's −2 it would have failed.
    expect(t).toMatchObject({ tipo: 'salvezza', dado: 12, modificatore: 1, totale: 13, contro: { valore: 13 }, riuscita: true, vantaggio: null });
    // The fight's condition with `svantaggio_salvezze` counts (bx: −2 as its advantage size).
    const conCondizione = risolviTurnoRegole({ turno: 1, sistema: s, schede, stato: new StatoProve(schede), dadi: new DadiACopione([12]), proveScena: [], nome: (id: string) => id, esiste: () => true, log: loggerMuto(), condizioni: () => [{ nome: 'Avvelenato', effetti: ['svantaggio_salvezze'] }], azioni: [{ id: 'a1', autore: 'pg_corrado', testo: 'Resisto', privata: false }], decisioni: new Map([['a1', base('a1', 'ts_veleno')]]) } as never);
    expect(conCondizione.tiri[0]).toMatchObject({ totale: 11, riuscita: false, vantaggio: 'svantaggio' });
  });

  it('with a class and level on the sheet, the table’s number; the naturals of a save count', () => {
    const s = setConSalvezze();
    const c = caricaCampagna(BX);
    const schede = caricaSchedeGeneriche(s, c);
    const corrado = schede.get('pg_corrado')!;
    schede.set('pg_corrado', { ...corrado, classe: 'guerriero', livello: 1 });
    const tira = (dado: number) => risolviTurnoRegole({ turno: 1, sistema: s, schede, stato: new StatoProve(schede), dadi: new DadiACopione([dado]), proveScena: [], nome: (id: string) => id, esiste: () => true, log: loggerMuto(), azioni: [{ id: 'a1', autore: 'pg_corrado', testo: 'Resisto', privata: false }], decisioni: new Map([['a1', base('a1', 'ts_veleno')]]) } as never).tiri[0]!;
    // Guerriero 1, column morte: 12. 11 + 1 = 12: saved; 10 + 1: failed; a natural 1 fails whatever.
    expect(tira(11)).toMatchObject({ contro: { valore: 12 }, totale: 12, riuscita: true });
    expect(tira(10)).toMatchObject({ riuscita: false });
    expect(schede.get('pg_corrado')!.classe).toBe('guerriero');
  });
});

describe('a target’s own save against a PC’s power', () => {
  it('an NPC rolls with the Engine’s dice, against its own number, and its card is the Game Master’s', () => {
    const s = setConSalvezze();
    const c = caricaCampagna(BX);
    const schede = caricaSchedeGeneriche(s, c);
    schede.set('png_ruggero', { ...schede.get('png_ruggero')!, salvaCome: { classe: 'guerriero', livello: 1 } });
    const st = new StatoProve(schede);
    const strumenti = strumentiRegole({ turno: 2, sistema: s, schede, stato: st, dadi: new DadiACopione([1]), proveScena: [], nome: (id: string) => id, esiste: () => true, log: loggerMuto() } as never);
    // Ruggero: potere 8 (−1), guerriero 1 magia 16. 17 − 1 = 16: saved. With −2 from the power: failed.
    const salva = strumenti.salvezzaDelBersaglio('png_ruggero', 'ts_magia', 0, new DadiACopione([17]), false)!;
    expect(salva.e).toMatchObject({ totale: 16, contro: { valore: 16 }, riuscita: true });
    expect(salva.t).toMatchObject({ chi: 'png_ruggero', di_png: true, tipo: 'salvezza', nascosta: true });
    expect(strumenti.salvezzaDelBersaglio('png_ruggero', 'ts_magia', -2, new DadiACopione([17]), false)!.e.riuscita).toBe(false);
    expect(strumenti.salvezzaDelBersaglio('png_ruggero', 'mischia', 0, new DadiACopione([17]), false)).toBeNull();
    expect(strumenti.salvezzaDelBersaglio('png_nessuno', 'ts_magia', 0, new DadiACopione([17]), false)).toBeNull();
  });
});
