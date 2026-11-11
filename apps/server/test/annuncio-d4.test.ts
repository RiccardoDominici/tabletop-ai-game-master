/**
 * D4 della prova finale (docs/e2e-finale.md): gli annunci del lettore minimo uscivano vuoti, o dicevano
 * solo le prime parole («Dico agli altri»), o si fermavano a metà («…la sentinella con»). Casi veri delle
 * partite del profilo A (esperimenti/risultati/e2e-finale/*-A), in italiano e in inglese.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { impostaLingua } from '../src/lingua';
import { annuncioBreve } from '../src/llm/annuncio';

const NON_FINALI_IT = /\b(il|lo|la|i|gli|le|un|una|di|a|da|in|con|su|per|tra|fra|del|della|dei|degli|delle|al|alla|ai|agli|alle|dal|dalla|nel|nella|sul|sulla|e|o|ma|che|se|verso)»\.$/;

describe('annunci D4, italiano', () => {
  const casi: Array<[string, string, string]> = [
    ['Eliandro', 'Dico agli altri: i goblin non sanno fare lettere con il carbone. Chi ha scritto questa lavagna?', 'Eliandro: «Dico agli altri: i goblin non sanno fare lettere».'],
    ['Livia Sarti', 'Ugo, tu che sei del posto: chi qui sa scrivere così bene?', 'Livia Sarti: «Tu che sei del posto: chi qui sa scrivere».'],
    ['Fulco Granito', 'Chiedo a Ugo, al cancello, se ha visto luci o gente salire verso la torre.', 'Fulco Granito: «Chiedo a Ugo, al cancello, se ha visto luci».'],
    ['Nespola Tondi', 'Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta.', 'Nespola Tondi: «Scendo dalla roccia e colpisco alle spalle la sentinella».'],
    ['Nespola Tondi', 'Mi arrampico sulla roccia per vedere la torre prima degli altri.', 'Nespola Tondi: «Mi arrampico sulla roccia per vedere la torre prima».'],
    ['Fulco Granito', 'Tiro ancora con la fionda al goblin che scappa verso la cantina.', 'Fulco Granito: «Tiro ancora con la fionda al goblin che scappa».'],
    ['Fulco Granito', 'Porto a Ugo il pane del tempio e gli chiedo la strada: «Dimmi dove passano i goblin»', 'Fulco Granito: «Porto a Ugo il pane del tempio».'],
    ['Livia Sarti', 'Dietro di lei, spada in mano, guardo i rami sopra la testa.', 'Livia Sarti: «Spada in mano, guardo i rami sopra la testa».'],
    ['Livia Sarti', 'Scudo contro scudo, tiro la spada su quello in fondo.', 'Livia Sarti: «Scudo contro scudo, tiro la spada su quello in fondo».'],
    ['Livia Sarti', 'Anch’io, Ugo: parla, o la milizia ti trova in fretta.', 'Livia Sarti: «Parla, o la milizia ti trova in fretta».'],
    ['Nespola Tondi', 'Ugo! Mi devi tre argenti. Dimmi la strada per la torre o te li riscuoto davanti a tutti.', 'Nespola Tondi: «Mi devi tre argenti».'],
    ['Livia Sarti', "Berta, quando hai visto Tonio per l'ultima volta? E chi sapeva della chiave, oltre a te?", "Livia Sarti: «Quando hai visto Tonio per l'ultima volta»."],
    ['Nespola Tondi', 'Ne arriva un altro: lo colpisco di nuovo, poi gli passo alle spalle.', 'Nespola Tondi: «Ne arriva un altro: lo colpisco di nuovo».'],
  ];
  it.each(casi)('%s: «%s»', (nome, testo, atteso) => {
    const a = annuncioBreve(nome, testo);
    expect(a).toBe(atteso);
    expect(a).not.toMatch(NON_FINALI_IT);
    expect(a.split(' ').length).toBeLessThanOrEqual(12);
  });

  it('mai vuoto: senza niente da dire «Nome agisce.»; un ordine di una parola resta', () => {
    expect(annuncioBreve('Ida', 'ahah ok!!')).toBe('Ida agisce.');
    expect(annuncioBreve('Ida', '...')).toBe('Ida agisce.');
    expect(annuncioBreve('Ida', 'Parla!')).toBe('Ida: «Parla».');
  });
});

describe('annunci D4, inglese', () => {
  afterAll(() => impostaLingua('it'));
  it('abbreviazioni, inciso vuoto in testa, chiusa sensata, mai vuoto', () => {
    impostaLingua('en');
    expect(annuncioBreve('Mara', 'I walk up to the counter and ask Mr. Hale for two rooms for the night.')).toBe('Mara walks up to the counter.');
    expect(annuncioBreve('Mara', 'Me too, I nod at the guard and keep my hands away from my sword.')).toBe('Mara nods at the guard.');
    expect(annuncioBreve('Tobin', 'I sit by the fire and listen to what the guard says.')).toMatch(/^Tobin sits by the fire/);
    expect(annuncioBreve('Ginestra', 'I shoot an arrow at the goblin towards the gate of the old ruined tower')).not.toMatch(/\b(towards|the|at)\.$/);
    expect(annuncioBreve('Ida', 'lol ok')).toBe('Ida acts.');
  });
});
