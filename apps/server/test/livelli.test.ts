/**
 * The level-up between sessions (M1, docs/prove.md §12; audit rows C-HP-03, C-HP-04, C-CLS-02/07/10/15, C-CRE-03): a
 * package's `livello`, `pf_massimi` and `pf_da_tirare` (written by strumenti/tra_sessioni.py) start the PC at its new
 * level, with the class tables' numbers and the new spell slots at once, and the hit points of the level gained rolled
 * by the player at the first closed window (manual rolls: the phone asks; automatic: the Engine), never twice. On the
 * invented cripta fixture.
 */
import { describe, expect, it } from 'vitest';
import type { TiroInserito } from '../src/prove/richieste';
import type { RichiestaTiroMaster } from '@tabletop-ai-gm/shared';
import { bersaglioSalvezza } from '../src/regole/salvezze';
import { pgAllaFine } from '../src/sessione/stato-pg';
import { azione, motoreCripta } from './aiuti/cripta';

const pacchetto = (pg: Record<string, Record<string, unknown>>) => ({ allInizio: { pg: pg as never, tempo: null } });
const oreste2 = { pg_oreste: { px: 162, livello: 2, pf_massimi: 6, pf: 4, pf_da_tirare: [2] } };
const inserito = (r: RichiestaTiroMaster, valori: number[] | null): [string, TiroInserito] => [r.id, { richiesta: r, valori, da: 'telefono' }];

describe('the PC starts at the package’s level', () => {
  it('saves, spell slots and XP of the new level at once; the hit points wait for the roll', () => {
    const m = motoreCripta({}, pacchetto(oreste2));
    const s = m.esporta();
    expect(s.livelli!.pg.find(([id]) => id === 'pg_oreste')![1]).toEqual({ livello: 2, pfMassimi: 6, daTirare: [2] });
    expect(m.stato.puntiFerita('pg_oreste')).toEqual({ attuali: 4, massimi: 6 });
    // The cleric's 2nd-level row: one spell of the 1st level a day (none at the 1st).
    expect(s.risorse!.contatori.find(([id]) => id === 'pg_oreste')![1]).toContainEqual(['slot_1', 1]);
    expect(m.vistaEsperienza()!.pg.find((x) => x.id === 'pg_oreste')).toMatchObject({ px: 162, livello: 2, prossimo: 300, sale: false });
  });

  it('a thief’s values and saves follow the new level', () => {
    const m = motoreCripta({}, pacchetto({ pg_tessa: { px: 130, livello: 2, pf_da_tirare: [2] } }));
    // The class row of the 2nd level: origliare 35 (was 30); the save row 12/13 (was 13/14).
    const sch = (m as unknown as { generico: { schede: Map<string, { abilita: Record<string, number> }> } }).generico.schede.get('pg_tessa')!;
    expect(sch.abilita).toMatchObject({ origliare: 35, trappole: 25, sgattaiolare: 50, borseggiare: 35, furtivo: 5 });
    const g = (m as unknown as { generico: { regole: { sistema: never }; schede: Map<string, never> } }).generico;
    expect(bersaglioSalvezza(g.regole.sistema, g.schede.get('pg_tessa')!, 'ts_morte')!.contro).toBe(12);
  });
});

describe('the level-up’s hit points', () => {
  it('automatic rolls: the Engine rolls them at the first window, with the Constitution bonus; the narrator hears it first', async () => {
    const m = motoreCripta({ 6: [4] }, pacchetto(oreste2));
    const r = await m.risolvi(1, [azione('pg_gaia', 'Guardo le nicchie')]);
    // 1d6 4 + Constitution 13 (+1) = 5: 6 → 11, and the current 4 → 9.
    expect(m.stato.puntiFerita('pg_oreste')).toEqual({ attuali: 9, massimi: 11 });
    expect(r.fatti[0]).toBe('Oreste passa al 2° livello (2° livello: 1d6 4 +1 = 5): 5 punti ferita in più, 11 in tutto.');
    // Never twice: the next window rolls nothing more.
    await m.risolvi(2, [azione('pg_gaia', 'Guardo le nicchie')]);
    expect(m.stato.puntiFerita('pg_oreste')!.massimi).toBe(11);
    expect(pgAllaFine(m.esporta(), ['pg_oreste'])).toEqual([expect.objectContaining({ id: 'pg_oreste', livello: 2, pf_massimi: 11, px: 162 })]);
  });

  it('manual rolls: the player’s phone is asked the die (the bonus shown), the value entered is used', async () => {
    const m = motoreCripta({ 6: [6] }, pacchetto(oreste2));
    const d = await m.decidi(1, [azione('pg_gaia', 'Guardo le nicchie')]);
    const rs = m.richiesteGiocatori(d);
    const r = rs.find((x) => x.chi === 'pg_oreste')!;
    expect(r).toMatchObject({ etichetta: 'Punti ferita del 2° livello', facce: 6, quanti: 1, modificatore: 1, per: 'punti_ferita' });
    // The dry run changed nothing.
    expect(m.stato.puntiFerita('pg_oreste')!.massimi).toBe(6);
    m.completa(d, new Map([inserito(r, [2])]), true);
    expect(m.stato.puntiFerita('pg_oreste')).toEqual({ attuali: 7, massimi: 9 });
  });

  it('a window with no action still asks it; the die gives at least 1 with a Constitution penalty', async () => {
    const m = motoreCripta({ 6: [1] }, pacchetto({ pg_tessa: { px: 130, livello: 2, pf_da_tirare: [2] } }));
    const d = await m.decidi(1, []);
    expect(m.richiesteGiocatori(d).map((x) => x.chi)).toEqual(['pg_tessa']);
    // Tessa: Constitution 12 (+0), 1d6 at most for a folletto (the class die is a d4): 1 → 1.
    m.completa(d);
    expect(m.stato.puntiFerita('pg_tessa')!.massimi).toBe(5);
  });

  it('a resume keeps the roll taken (or still owed); «Ricomincia» starts the level-up again', async () => {
    const prima = motoreCripta({ 6: [4] }, pacchetto(oreste2));
    const ancora = motoreCripta({ 6: [4] }, pacchetto(oreste2));
    ancora.importa(prima.esporta());
    expect(ancora.esporta().livelli!.pg.find(([id]) => id === 'pg_oreste')![1].daTirare).toEqual([2]);
    await prima.risolvi(1, [azione('pg_gaia', 'Guardo le nicchie')]);
    const ripresa = motoreCripta({ 6: [1] }, pacchetto(oreste2));
    ripresa.importa(prima.esporta());
    expect(ripresa.stato.puntiFerita('pg_oreste')).toEqual({ attuali: 9, massimi: 11 });
    await ripresa.risolvi(2, [azione('pg_gaia', 'Guardo le nicchie')]);
    expect(ripresa.stato.puntiFerita('pg_oreste')!.massimi).toBe(11);
    prima.azzera();
    expect(prima.stato.puntiFerita('pg_oreste')).toEqual({ attuali: 4, massimi: 6 });
    expect(prima.esporta().livelli!.pg.find(([id]) => id === 'pg_oreste')![1]).toEqual({ livello: 2, pfMassimi: 6, daTirare: [2] });
  });

  it('the next session (no level-up) starts at the level the log wrote, with its slots', () => {
    const m = motoreCripta({}, pacchetto({ pg_oreste: { px: 162, livello: 2, pf_massimi: 11, pf: 11, contatori: { slot_1: 0 } } }));
    expect(m.stato.puntiFerita('pg_oreste')).toEqual({ attuali: 11, massimi: 11 });
    expect(m.esporta().risorse!.contatori.find(([id]) => id === 'pg_oreste')![1]).toContainEqual(['slot_1', 0]);
    expect(m.esporta().livelli!.pg.find(([id]) => id === 'pg_oreste')![1].daTirare).toEqual([]);
  });
});

describe('the new level’s spells', () => {
  it('a spell the package prepares in the new slot is found by its words and cast from it', async () => {
    const m = motoreCripta({ 6: [4] }, pacchetto({ pg_oreste: { ...oreste2.pg_oreste, incantesimi: ['cura_ferite'] }, pg_gaia: { pf: 3 } }));
    const r = await m.risolvi(1, [azione('pg_oreste', 'Uso cura ferite su Gaia')]);
    expect(r.fatti.join(' ')).toMatch(/Oreste usa Cura ferite \(incantesimo di 1° livello: gliene restano 0 di quel livello per oggi\)/);
    expect(m.stato.puntiFerita('pg_gaia')!.attuali).toBe(8);
    // Spent: refused by name, nothing cast; a rest gives back the package's spell.
    const r2 = await m.risolvi(2, [azione('pg_oreste', 'Uso ancora cura ferite su Gaia')]);
    expect(r2.fatti.join(' ')).toMatch(/Oreste non ha Cura ferite tra gli incantesimi preparati per oggi/);
    expect(m.riposo('notte')!.ok).toBe(true);
    const r3 = await m.risolvi(3, [azione('pg_oreste', 'Uso cura ferite su Gaia')]);
    expect(r3.fatti.join(' ')).toMatch(/Oreste usa Cura ferite/);
  });
});

describe('manual rolls after a level-up', () => {
  it('the dry run sees the package’s prepared spell: the new hit die and the cure’s die are asked together', async () => {
    const m = motoreCripta({ 6: [4] }, pacchetto({ pg_oreste: { ...oreste2.pg_oreste, incantesimi: ['cura_ferite'] }, pg_tessa: { pf: 2 } }));
    const d = await m.decidi(1, [azione('pg_oreste', 'Uso cura ferite su Tessa')]);
    expect(m.richiesteGiocatori(d).map((r) => r.etichetta)).toEqual(['Punti ferita del 2° livello', 'Cura ferite']);
    // A resume keeps the prepared spell of a sheet that prepares none.
    const s = m.esporta();
    const r = motoreCripta({}, pacchetto({ pg_oreste: { ...oreste2.pg_oreste } }));
    r.importa(s);
    expect(r.esporta().risorse!.preparati).toContainEqual(['pg_oreste', ['cura_ferite']]);
  });
});
