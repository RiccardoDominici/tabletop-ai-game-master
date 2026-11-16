/**
 * The rules' carried subject when the judge is late (coerenza/portato.ts): a sentence right after one judged a
 * violation continues its subject when it names nobody and refers back to a third person. Invented fixture: Ida Marchi
 * (PC) and Ruggero the bandit.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { continuaDopo } from '../src/coerenza/portato';
import { impostaLingua } from '../src/lingua';

const nomi = [['Ida Marchi', 'Ida'], ['Ruggero', 'bandito']];

beforeEach(() => impostaLingua('it'));

describe('the carried subject of the rules', () => {
  it('refers back: no subject of its own, a subject pronoun, an object pronoun after a subject noun', () => {
    expect(continuaDopo('Il colpo lo coglie di fianco e lo stende sulle pietre.', nomi)).toBe(true);
    expect(continuaDopo('Non si rialza.', nomi)).toBe(true);
    expect(continuaDopo('Parla piano, in fretta, e la voce gli trema.', nomi)).toBe(true);
    expect(continuaDopo('La lama trova il fianco scoperto, e lui si affloscia a terra.', nomi)).toBe(true);
  });

  it('a subject of its own: a name, an article after a verb, a question, the first or second person', () => {
    expect(continuaDopo('Ida guarda il fiume.', nomi)).toBe(false);
    expect(continuaDopo('Sui gradini il ragazzo stringe la corda ai polsi.', nomi)).toBe(false);
    expect(continuaDopo('Lo scudo sbatte sul legno del ponte.', nomi)).toBe(false);
    expect(continuaDopo('Che fai?', nomi)).toBe(false);
    expect(continuaDopo('Tu aspetti la sua risposta, scudo alzato.', nomi)).toBe(false);
    expect(continuaDopo('Dalla cantina non arriva nessun rumore.', nomi)).toBe(false);
  });

  it('in English', () => {
    impostaLingua('en');
    expect(continuaDopo('The blow catches him on the side.', nomi)).toBe(true);
    expect(continuaDopo('Ida looks at the river.', nomi)).toBe(false);
    expect(continuaDopo('What do you do?', nomi)).toBe(false);
  });
});
