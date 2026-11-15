/**
 * The difficulty of a check that no data sets (docs/prove.md §4, «Difficulty from signals»): the rules arbiter starts
 * from the set's default rung and moves one rung for what makes the action easier or harder, in its own words or, when
 * it says nothing, in a sentence of the scene that touches it; routine moves roll only when something makes them hard.
 * Invented fixtures: `prove` (SRD 5.2), `bx` (d20 ladder), `soglia` (roll-under ladder), `pbta` (2d6 ladder).
 */
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { impostaLingua } from '../src/lingua';
import { classificaARegole, type IngressoClassificatore } from '../src/prove/classificatore-regole';
import { difficoltaDa, frasiDi, scalaDifficolta, segnaliDifficolta } from '../src/prove/difficolta';
import { caricaRegole } from '../src/regole/caricatore';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');
afterEach(() => impostaLingua('it'));

describe('the ladder of the rule set', () => {
  it('SRD from medium; a d20 set by DC, a roll-under set by divisor, a 2d6 set by modifier, each from its default', () => {
    expect(scalaDifficolta(null)).toEqual({ ids: ['molto_facile', 'facile', 'media', 'difficile', 'molto_difficile', 'quasi_impossibile'], predefinita: 2 });
    expect(scalaDifficolta(caricaRegole(path.join(FIX, 'bx')).sistema)).toEqual({ ids: ['facile', 'normale', 'difficile'], predefinita: 1 });
    expect(scalaDifficolta(caricaRegole(path.join(FIX, 'soglia')).sistema)).toEqual({ ids: ['normale', 'difficile', 'estrema'], predefinita: 0 });
    expect(scalaDifficolta(caricaRegole(path.join(FIX, 'pbta')).sistema)).toEqual({ ids: ['normale', 'rischiosa'], predefinita: 0 });
    const srd = scalaDifficolta(null);
    expect([difficoltaDa(srd, -1), difficoltaDa(srd, 0), difficoltaDa(srd, 1)]).toEqual(['facile', null, 'difficile']);
    // At the edge of a ladder nothing moves past it.
    expect(difficoltaDa(scalaDifficolta(caricaRegole(path.join(FIX, 'soglia')).sistema), -1)).toBeNull();
  });
});

describe('signals', () => {
  it('the action\'s own words move one rung, whatever the count; a help moves it down', () => {
    expect(segnaliDifficolta('Mi arrampico sul pilone viscido').gradini).toBe(1);
    expect(segnaliDifficolta('Cammino in equilibrio sul parapetto stretto e bagnato').gradini).toBe(1);
    expect(segnaliDifficolta('Salto il fosso con la rincorsa').gradini).toBe(-1);
    expect(segnaliDifficolta('Accendo un fuoco sotto la pioggia').gradini).toBe(0); // a nuisance is not an obstacle
  });

  it('a hard sentence of the scene counts only when it touches the action and the action says nothing', () => {
    const scena = frasiDi('[narratore] Il fiume è gonfio, piove. Ruggero sbarra il ponte con la mazza.');
    expect(scena).toEqual(['Il fiume è gonfio, piove', 'Ruggero sbarra il ponte con la mazza']);
    expect(segnaliDifficolta('Nuoto fino alla riva del fiume', scena)).toMatchObject({ gradini: 1, scena: ['gonfi'] });
    expect(segnaliDifficolta('Ricordo una leggenda sul barone', scena).gradini).toBe(0); // nothing in common
    expect(segnaliDifficolta('Nuoto controcorrente nel fiume', scena).gradini).toBe(1); // not on top of its own signal
  });
});

describe('the rules arbiter with the signals', () => {
  const ingresso = (narrazione = ''): IngressoClassificatore => ({
    campagna: caricaCampagna(path.join(FIX, 'prove')),
    regole: null,
    armi: () => [],
    haScheda: () => true,
    proveScena: [],
    altre: [],
    scena: frasiDi(narrazione),
  });
  const cl = (testo: string, narrazione = '') => classificaARegole({ id: 'a1', autore: 'pg_teo', testo }, ingresso(narrazione));

  it('SRD: the check\'s difficulty follows the action and the scene', () => {
    expect(cl('Mi arrampico sul pilone viscido di muschio')).toMatchObject({ tipo: 'prova', abilita: 'atletica', difficolta: 'difficile' });
    expect(cl('Salto il fosso con la rincorsa')).toMatchObject({ tipo: 'prova', abilita: 'atletica', difficolta: 'facile' });
    expect(cl('Nuoto fino all\'altra riva del fiume', 'Il fiume è gonfio.')).toMatchObject({ abilita: 'atletica', difficolta: 'difficile' });
    expect(cl('Esamino il sigillo della lettera')).toMatchObject({ abilita: 'indagare', difficolta: null }); // the default: medium
  });

  it('a routine move rolls only when something makes it hard', () => {
    expect(cl('Salgo sul grande salice per guardare la valle')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('Salgo sul tetto coperto di tegole bagnate')).toMatchObject({ tipo: 'prova', abilita: 'atletica', difficolta: 'difficile' });
    expect(cl('Corro sul ponte che crolla')).toMatchObject({ tipo: 'prova', abilita: 'atletica', difficolta: 'difficile' });
  });

  it('a manual\'s set: the signals move the check on the set\'s own ladder', () => {
    const c = caricaCampagna(path.join(FIX, 'bx'));
    const regole = caricaRegole(path.join(FIX, 'bx'));
    // One keyword of the set for its first characteristic, as a manual's regole.yaml writes them.
    const car = regole.sistema.caratteristiche[0]!.id;
    const conParola = { ...regole, sistema: { ...regole.sistema, paroleChiave: { [car]: ['spingo'] } } };
    const ing: IngressoClassificatore = { campagna: c, regole: conParola, armi: () => [], haScheda: () => true, proveScena: [], altre: [] };
    const cls = (testo: string) => classificaARegole({ id: 'a1', autore: c.pg[0]!.id, testo }, ing);
    expect(cls('Spingo il masso al buio')).toMatchObject({ tipo: 'prova', caratteristica: car, difficolta: 'difficile' });
    expect(cls('Spingo il masso con una leva')).toMatchObject({ tipo: 'prova', caratteristica: car, difficolta: 'facile' });
    expect(cls('Spingo il masso')).toMatchObject({ tipo: 'prova', caratteristica: car, difficolta: null });
  });

  it('English: the same signals in the English pack', () => {
    impostaLingua('en');
    expect(segnaliDifficolta('I climb the slippery pier').gradini).toBe(1);
    expect(segnaliDifficolta('I jump the ditch with a run-up').gradini).toBe(-1);
    expect(cl('I climb onto the roof of wet broken tiles')).toMatchObject({ tipo: 'prova', abilita: 'atletica', difficolta: 'difficile' });
    expect(cl('I go up the hill to look down the valley')).toMatchObject({ tipo: 'nessuna' }); // routine: no roll
    expect(cl('I go up the icy steps')).toMatchObject({ tipo: 'prova', abilita: 'atletica', difficolta: 'difficile' });
  });
});
