/**
 * D4 della prova finale (docs/e2e-finale.md): gli annunci del lettore minimo uscivano vuoti, o dicevano
 * solo le prime parole («Dico agli altri»), o si fermavano a metà («…la sentinella con»). Casi veri delle
 * partite del profilo A (esperimenti/risultati/e2e-finale/*-A), in italiano e in inglese.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { impostaLingua } from '../src/lingua';
import { annuncioBreve, senzaVirgolette } from '../src/llm/annuncio';

const NON_FINALI_IT = /\b(il|lo|la|i|gli|le|un|una|di|a|da|in|con|su|per|tra|fra|del|della|dei|degli|delle|al|alla|ai|agli|alle|dal|dalla|nel|nella|sul|sulla|e|o|ma|che|se|verso)»\.$/;

describe('annunci D4, italiano', () => {
  const casi: Array<[string, string, string]> = [
    ['Eliandro', 'Dico agli altri: i goblin non sanno fare lettere con il carbone. Chi ha scritto questa lavagna?', 'Eliandro: «Dico agli altri: i goblin non sanno fare lettere con il carbone».'],
    ['Livia Sarti', 'Ugo, tu che sei del posto: chi qui sa scrivere così bene?', 'Livia Sarti dice: «Tu che sei del posto: chi qui sa scrivere così bene?».'],
    ['Fulco Granito', 'Chiedo a Ugo, al cancello, se ha visto luci o gente salire verso la torre.', 'Fulco Granito: «Chiedo a Ugo, al cancello, se ha visto luci o gente salire verso la torre».'],
    ['Nespola Tondi', 'Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta.', 'Nespola Tondi: «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta».'],
    ['Nespola Tondi', 'Mi arrampico sulla roccia per vedere la torre prima degli altri.', 'Nespola Tondi: «Mi arrampico sulla roccia per vedere la torre prima degli altri».'],
    ['Fulco Granito', 'Tiro ancora con la fionda al goblin che scappa verso la cantina.', 'Fulco Granito: «Tiro ancora con la fionda al goblin che scappa verso la cantina».'],
    ['Fulco Granito', 'Porto a Ugo il pane del tempio e gli chiedo la strada: «Dimmi dove passano i goblin»', 'Fulco Granito: «Porto a Ugo il pane del tempio e gli chiedo la strada».'],
    ['Livia Sarti', 'Dietro di lei, spada in mano, guardo i rami sopra la testa.', 'Livia Sarti: «Spada in mano, guardo i rami sopra la testa».'],
    ['Livia Sarti', 'Scudo contro scudo, tiro la spada su quello in fondo.', 'Livia Sarti: «Scudo contro scudo, tiro la spada su quello in fondo».'],
    ['Livia Sarti', 'Anch’io, Ugo: parla, o la milizia ti trova in fretta.', 'Livia Sarti dice: «Parla, o la milizia ti trova in fretta».'],
    ['Nespola Tondi', 'Ugo! Mi devi tre argenti. Dimmi la strada per la torre o te li riscuoto davanti a tutti.', 'Nespola Tondi dice: «Mi devi tre argenti».'],
    ['Livia Sarti', "Berta, quando hai visto Tonio per l'ultima volta? E chi sapeva della chiave, oltre a te?", "Livia Sarti dice: «Quando hai visto Tonio per l'ultima volta?»."],
  ];
  it.each(casi)('%s: «%s»', (nome, testo, atteso) => {
    const a = annuncioBreve(nome, testo);
    expect(a).toBe(atteso);
    expect(a).not.toMatch(NON_FINALI_IT);
    // Whole clauses: up to six words past the twelve rather than a quote cut mid-phrase (round 6).
    expect(a.split(' ').length).toBeLessThanOrEqual(18);
  });

  // Round 4 of the coherence layer in profile A (docs/coerenza.md): 7 of 8 high-severity sentences were the
  // announcement voicing a player's claim. Only the PC's own act is announced, and as the player's words.
  it.each([
    ['Livia Sarti', 'Il goblin mi tira la lancia, la paro con lo scudo. Resisto.', 'Livia Sarti: «La paro con lo scudo. Resisto».'],
    // The PC's own state is a claim too (final round, CM T15 / CA T14: «Non mi reggo più» was said for an unhurt PC).
    ['Nespola Tondi', 'Ho zero punti ferita, sono a terra. Non mi reggo più, striscio dietro la pietra.', 'Nespola Tondi: «Striscio dietro la pietra».'],
    ['Nespola Tondi', 'Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.', 'Nespola Tondi: «Indietreggio ma resto in piedi».'],
    ['Livia Sarti', 'Vedo tre goblin davanti alla porta. Io carico dopo di lei, scudo avanti.', 'Livia Sarti: «Io carico dopo di lei, scudo avanti».'],
    ['Livia Sarti', 'Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.', 'Livia Sarti: «Non lo colpisco ancora, aspetto la risposta».'],
    ['Livia Sarti', 'Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!', 'Livia Sarti dice: «Chi vi paga?».'],
  ])('claims and someone else\'s acts are not announced: %s, «%s»', (nome, testo, atteso) => {
    expect(annuncioBreve(nome, testo)).toBe(atteso);
  });

  // The final round's second judge (docs/coerenza.md, «Final round»): the filter kept a world clause and dropped the PC's
  // own act or question. The act stays, the world goes; never the other way round.
  it.each([
    // Someone else's arrival is not the PC's act (PR T13).
    ['Nespola Tondi', 'Ne arriva un altro: lo colpisco di nuovo, poi gli passo alle spalle.', 'Nespola Tondi: «Lo colpisco di nuovo, poi gli passo alle spalle».'],
    // What the PC says it sees after a looking clause's colon is a claim; the act in the next sentence is said (PR T12).
    ['Nespola Tondi', 'Guardo dentro la porta: tre o quattro goblin. Tiro il dardo al più vicino!', 'Nespola Tondi: «Tiro il dardo al più vicino».'],
    ['Nespola Tondi', 'Guardo dentro la porta: tre o quattro goblin.', 'Nespola Tondi: «Guardo dentro la porta».'],
    // An encounter makes someone exist; a call before the question is only a call (FB T9).
    ['Livia Sarti', 'Sulla strada della grotta incontro una viandante con un carretto. Madre Carla? Dove vai con quel carico?', 'Livia Sarti dice: «Dove vai con quel carico?».'],
    // Going towards someone is a movement, not an encounter; a colon after a speech verb is still the PC's words.
    ['Livia Sarti', 'Vado incontro a Berta e le chiedo della chiave.', 'Livia Sarti: «Vado incontro a Berta e le chiedo della chiave».'],
    ['Eliandro', 'Dico agli altri: i goblin non sanno fare lettere con il carbone.', 'Eliandro: «Dico agli altri: i goblin non sanno fare lettere con il carbone».'],
    // A question after a looking clause asks what the PC would see; a capitalised first word is not a call.
    ['Fulco Granito', 'Guardo la chiave che Berta stringe: è ferro vecchio, o lavoro di nano?', 'Fulco Granito: «Guardo la chiave che Berta stringe: è ferro vecchio, o lavoro di nano?».'],
    ['Livia Sarti', 'Ehi tu, pastore! Sei Oreste? Mi vendi un formaggio, dai?', 'Livia Sarti dice: «Sei Oreste?».'],
  ])('the act stays, the world clause goes: %s, «%s»', (nome, testo, atteso) => {
    expect(annuncioBreve(nome, testo)).toBe(atteso);
  });

  // Round 5 (docs/coerenza.md): «Io sono lento» and «Io sono la più veloce di tutti» were announced; a question lost its «?».
  it.each([
    ['Eliandro', 'Io sono lento, resto dietro la pietra.', 'Eliandro: «Resto dietro la pietra».'],
    ['Nespola Tondi', 'Io sono la più veloce di tutti, vado per prima: passo di lato.', 'Nespola Tondi: «Vado per prima: passo di lato».'],
    ['Nespola Tondi', 'Sono il capo qui. Apro la porta.', 'Nespola Tondi: «Apro la porta».'],
    ['Fulco Granito', 'Sei Oreste?', 'Fulco Granito dice: «Sei Oreste?».'],
  ])('identity and status claims are left out; a question keeps its «?»: %s, «%s»', (nome, testo, atteso) => {
    expect(annuncioBreve(nome, testo)).toBe(atteso);
  });

  // Round 6: a later clause by someone else or about the world was announced; quotes were cut mid-phrase.
  it.each([
    ['Eliandro', 'Pugnale ancora, il goblin si gira verso di me.', 'Eliandro: «Pugnale ancora».'],
    ['Livia Sarti', "Oreste dice che sulla collina c'è una grotta con il fuoco acceso. Vado lì, adesso.", 'Livia Sarti: «Vado lì, adesso».'],
    ['Livia Sarti', 'Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.', 'Livia Sarti: «Finisco quello con la lancia, colpo di spada lunga».'],
    ['Eliandro', 'Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!', 'Eliandro: «Lancio il dardo incantato al goblin che la sta per colpire».'],
    ['Livia Sarti', "Anch'io vado al mulino. E tu, Berta, se tuo figlio è morto è colpa tua.", "Livia Sarti: «Anch'io vado al mulino»."],
    ['Nespola Tondi', "Andiamo al guado, mi hanno detto che c'è un pastore sotto il salice.", 'Nespola Tondi: «Andiamo al guado».'],
  ])('only the PC\'s own words, and whole clauses: %s, «%s»', (nome, testo, atteso) => {
    expect(annuncioBreve(nome, testo)).toBe(atteso);
  });

  it('a PC out of play: «Nome non agisce.», never what the player wrote', () => {
    expect(annuncioBreve('Eliandro', '(non agisce, è a terra, privo di sensi.)', true)).toBe('Eliandro non agisce.');
  });

  it('virgolette del giocatore dentro la frase: una sola citazione, chiusa una volta', () => {
    // Caso vero (e2e-finale, D4): «Blocco un goblin ferito contro il muro: «Dov'è il ragazzo».»
    const a = annuncioBreve('Livia Sarti', 'Blocco un goblin ferito contro il muro: «Dov’è il ragazzo»?');
    // A sentence a little past the twelve words is said whole (round 6: never a quote cut mid-phrase).
    expect(a).toBe('Livia Sarti: «Blocco un goblin ferito contro il muro: Dov’è il ragazzo?».');
    expect(a.match(/«/g)).toHaveLength(1);
    expect(a.match(/»/g)).toHaveLength(1);
    expect(senzaVirgolette('Dico «ciao» e «basta»')).toBe('Dico ciao e basta');
  });

  it('mai vuoto: senza niente da dire «Nome agisce.»; un ordine di una parola resta', () => {
    expect(annuncioBreve('Ida', 'ahah ok!!')).toBe('Ida agisce.');
    expect(annuncioBreve('Ida', '...')).toBe('Ida agisce.');
    expect(annuncioBreve('Ida', 'Parla!')).toBe('Ida dice: «Parla».');
  });
});

describe('annunci D4, inglese', () => {
  afterAll(() => impostaLingua('it'));
  it('abbreviazioni, inciso vuoto in testa, chiusa sensata, mai vuoto', () => {
    impostaLingua('en');
    expect(annuncioBreve('Mara', 'I walk up to the counter and ask Mr. Hale for two rooms for the night.')).toBe('Mara: “I walk up to the counter and ask Mr. Hale for two rooms for the night.”');
    expect(annuncioBreve('Mara', 'Me too, I nod at the guard and keep my hands away from my sword.')).toBe('Mara: “I nod at the guard and keep my hands away from my sword.”');
    expect(annuncioBreve('Tobin', 'I sit by the fire and listen to what the guard says.')).toBe('Tobin: “I sit by the fire and listen to what the guard says.”');
    expect(annuncioBreve('Ginestra', 'I shoot an arrow at the goblin towards the gate of the old ruined tower')).not.toMatch(/\b(towards|the|at)\.$/);
    expect(annuncioBreve('Ida', 'lol ok')).toBe('Ida acts.');
    // «I'm» + an -ing verb is an act; anything else after it is a claim. A question keeps «?», with no «?.».
    expect(annuncioBreve('Mara', "I'm the fastest, I go first.")).toBe('Mara: “I go first.”');
    expect(annuncioBreve('Mara', "I'm going down the stairs.")).toBe("Mara: “I'm going down the stairs.”");
    expect(annuncioBreve('Mara', 'Who pays you?')).toBe('Mara says: “Who pays you?”');
  });
  it('the act stays, the world clause goes (final round)', () => {
    impostaLingua('en');
    expect(annuncioBreve('Mara', 'I look through the door: three or four goblins. I shoot the nearest one!')).toBe('Mara: “I shoot the nearest one.”');
    expect(annuncioBreve('Mara', 'On the road I meet a traveller with a cart. I ask her where she is going.')).toBe('Mara: “I ask her where she is going.”');
    expect(annuncioBreve('Mara', "I can't stand any more, I crawl behind the stone.")).toBe('Mara: “I crawl behind the stone.”');
  });
});
