/**
 * Out-of-play guard (narrazione/guardia-fuori.ts): bug 2 of the third e2e pass (docs/e2e-finale-3.md), rebuilt on fixture
 * names. After the fight a dead NPC, called by its alias, looked at the cellar, answered a question and «parla piano»;
 * a goblin down since T11 «ride corto» at T21. The Engine's state line replaces the first such sentence, later ones are
 * dropped; sentences that describe the state, or whose subject is someone else, stay. Italian and English.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { impostaLingua } from '../src/lingua';
import { guardiaFuori } from '../src/narrazione/guardia-fuori';
import { guardiaEsiti } from '../src/narrazione/guardia-esiti';
import type { FuoriGioco } from '../src/prove/stato';

const NOMI = new Map<string, string[]>([
  ['pg_ida', ['Ida Ferraro', 'Ida']],
  ['pg_corrado', ['Corrado Lanzi', 'Corrado']],
  ['png_ruggero', ['ruggero lo sgherro', 'ruggero', 'sgherro', 'bandito']],
  ['png_bertoldo', ['bertoldo', 'gabelliere']],
]);
const NOME: Record<string, string> = { pg_ida: 'Ida Ferraro', pg_corrado: 'Corrado Lanzi', png_ruggero: 'Ruggero lo sgherro', png_bertoldo: 'Bertoldo' };

function guardia(fuori: Record<string, FuoriGioco>, nomi = NOMI) {
  return guardiaFuori({ nomi, nome: (id) => NOME[id] ?? id, fuoriDaPrima: (id) => fuori[id] ?? null })!;
}

describe('the out-of-play guard and the outcome guard in one process', () => {
  it('both compiled, in either order, and a clause that needs the pronouns works (rerun after the fixes: a crash)', () => {
    // The outcome guard compiles the shared section first, as in a live fight.
    const esiti = guardiaEsiti({ tiri: [], nomi: NOMI, conScheda: () => true, fuori: (id) => id === 'png_ruggero', nome: (id) => NOME[id] ?? id });
    expect(esiti('Ruggero ride.')).toBeNull();
    const g = guardia({ png_ruggero: 'morto' });
    expect(g('Corrado guarda Ruggero, che ride.')).toMatchObject({ id: 'png_ruggero' });
    expect(esiti('Ruggero crolla a terra.')).toBeNull();
  });
});

describe('out-of-play guard (Italian)', () => {
  it('the dead NPC that answers by its alias: the first sentence becomes its state, the next ones are dropped', () => {
    const g = guardia({ png_ruggero: 'morto' });
    expect(g('Il bandito alza gli occhi verso di lei, poi verso la cantina.')).toEqual({ testo: 'Ruggero giace a terra, senza vita.', motivo: 'fuori_gioco_agisce', id: 'png_ruggero' });
    // No subject named: «Parla piano» carries the one before; said once, so it is dropped.
    expect(g('Parla piano, in fretta, e la voce gli trema.')).toEqual({ testo: '', motivo: 'fuori_gioco_agisce', id: 'png_ruggero' });
    expect(g('Dice che il ragazzo è stato portato via.')).toEqual({ testo: '', motivo: 'fuori_gioco_agisce', id: 'png_ruggero' });
    // A sentence opening with a preposition does not carry him: the world goes on.
    expect(g('Dalla cantina arriva solo il respiro corto del ragazzo.')).toBeNull();
    // A sentence with a new subject of its own ends the carry (replay of the baseline, combat-auto T25).
    const h = guardia({ png_ruggero: 'morto' });
    expect(h('Ruggero sputa nel fiume.')).toMatchObject({ id: 'png_ruggero' });
    expect(h('Il ragazzo tiene gli occhi bassi e parla piano.')).toBeNull();
    expect(h('Dice che la decima non è pagata.')).toBeNull();
  });

  it('by name, with an opening word and a negation; someone else as subject stays', () => {
    const g = guardia({ png_ruggero: 'a_terra' });
    expect(g('Corrado preme il piede su Ruggero e chiede dove sia il ragazzo.')).toBeNull();
    expect(g('E poi Ruggero ride corto, senza fretta.')).toEqual({ testo: 'Ruggero giace a terra, senza sensi.', motivo: 'fuori_gioco_agisce', id: 'png_ruggero' });
    expect(guardia({ png_ruggero: 'morto' })('Ruggero non parla.')).toMatchObject({ testo: 'Ruggero giace a terra, senza vita.' });
    // A pronoun after a name: «…, e lei se ne va» is the last character named.
    expect(guardia({ pg_ida: 'a_terra' })('Corrado guarda Ida, che si rialza e corre.')).toMatchObject({ id: 'pg_ida' });
  });

  it('a sentence that describes the state, a clause that is only the name, and nobody out of play: left alone', () => {
    const g = guardia({ png_ruggero: 'morto' });
    expect(g('Ruggero giace sulla pietra, gli occhi aperti verso la cantina.')).toBeNull();
    expect(g('Il corpo di Ruggero non si muove.')).toBeNull();
    expect(g('Ida guarda Ruggero.')).toBeNull();
    expect(g('Ruggero.')).toBeNull();
    expect(guardiaFuori({ nomi: NOMI, nome: (id) => id, fuoriDaPrima: () => null })).toBeNull();
  });

  it('the state is judged per clause: a state word in one clause does not let another clause\'s act through', () => {
    const g = guardia({ png_ruggero: 'morto' });
    expect(g('Ruggero giace a terra, poi si rialza e corre verso la cantina.')).toMatchObject({ motivo: 'fuori_gioco_agisce', id: 'png_ruggero' });
    expect(guardia({ png_ruggero: 'morto' })('Ruggero giace a terra, immobile, il sangue sul selciato.')).toBeNull();
    // An impersonal perception carries nobody; a negated verb with the state told elsewhere in the sentence stays.
    expect(guardia({ png_ruggero: 'fuggito' })('Ruggero è già sparito verso il ponte: si sente solo il fiume.')).toBeNull();
    expect(guardia({ png_ruggero: 'morto' })('Ruggero non risponde: il suo corpo è immobile sulle pietre.')).toBeNull();
    expect(guardia({ png_ruggero: 'morto' })('Lo sgherro è già crollato contro il muro.')).toBeNull();
  });

  it('a part of the fallen one acts for him: «lo sguardo di Ruggero scivola…» (coherence run, combat T12)', () => {
    expect(guardia({ png_ruggero: 'fuggito' })('Lo sguardo di Ruggero scivola sulla spada di Ida, poi sul fuoco.')).toMatchObject({ testo: 'Ruggero non è più qui.' });
    // The part of someone else, or a thing of the fallen one, is not his act.
    expect(guardia({ png_ruggero: 'fuggito' })('Lo sguardo di Ida scivola su Ruggero.')).toBeNull();
    expect(guardia({ png_ruggero: 'morto' })('La spada di Ruggero giace nel fango.')).toBeNull();
  });

  it('a fled NPC, and an alias shared with a character still in play is not a sign of the fallen one', () => {
    expect(guardia({ png_ruggero: 'fuggito' })('Ruggero sputa nel fiume.')).toMatchObject({ testo: 'Ruggero non è più qui.' });
    const condivisi = new Map(NOMI);
    condivisi.set('png_bertoldo', ['bertoldo', 'gabelliere', 'bandito']);
    expect(guardia({ png_ruggero: 'morto' }, condivisi)('Il bandito alza la lancia.')).toBeNull();
  });
});

describe('out-of-play guard (English)', () => {
  beforeAll(() => impostaLingua('en'));
  afterAll(() => impostaLingua('it'));

  it('the dead NPC that keeps talking; the state described stays', () => {
    const g = guardia({ png_ruggero: 'morto' });
    expect(g('Then Ruggero raises his eyes towards the cellar.')).toEqual({ testo: 'Ruggero lies on the ground, lifeless.', motivo: 'fuori_gioco_agisce', id: 'png_ruggero' });
    expect(g('Ruggero lies motionless by the fire.')).toBeNull();
    expect(g('From the cellar comes a short breath.')).toBeNull();
  });
});

describe('a character losing the round (surprise…) is out for the sentences of that round (final round, attempt 4, PR T11/T13)', () => {
  const g = () => guardiaFuori({ nomi: NOMI, nome: (id) => NOME[id] ?? id, fuoriDaPrima: () => null, fermo: (id) => (id === 'png_ruggero' ? 'sorpreso' : null) })!;
  it('a sentence where it acts becomes the Engine\'s line, once; someone else acting on it stays', () => {
    const guardia = g();
    expect(guardia('Ruggero schiocca le dita e ride.')).toMatchObject({ testo: 'Ruggero perde questo round (sorpreso): non agisce.', id: 'png_ruggero' });
    expect(guardia('Ruggero dà un calcio al fuoco.')).toMatchObject({ testo: '' });
    expect(g()('Ida colpisce Ruggero alla spalla.')).toBeNull();
  });
  it('nobody out, nobody losing the round: no guard', () => {
    expect(guardiaFuori({ nomi: NOMI, nome: (id) => id, fuoriDaPrima: () => null, fermo: () => null })).toBeNull();
  });
});
