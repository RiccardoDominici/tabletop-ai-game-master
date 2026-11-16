/**
 * Combat outcome guard (narrazione/guardia-esiti.ts): the two cases of the second pass of the final end-to-end
 * run, rebuilt on fixture names. A standing NPC «cade» with no Engine fact; a miss on the card told as a hit.
 * The Engine's line replaces the sentence. Italian and English.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { impostaLingua } from '../src/lingua';
import { guardiaEsiti } from '../src/narrazione/guardia-esiti';
import { fattiMancanti } from '../src/prove/fatti-dovuti';

const NOMI = new Map<string, string[]>([
  ['pg_ida', ['Ida Ferraro', 'Ida']],
  ['pg_corrado', ['Corrado Lanzi', 'Corrado']],
  ['png_ruggero', ['ruggero lo sgherro', 'ruggero', 'sgherro']],
  ['png_bertoldo', ['bertoldo', 'gabelliere']],
]);
const NOME: Record<string, string> = { pg_ida: 'Ida Ferraro', pg_corrado: 'Corrado Lanzi', png_ruggero: 'Ruggero lo sgherro', png_bertoldo: 'Bertoldo' };

/** A public attack card, with the display names the Engine writes on it. */
const attacco = (chi: string, bersaglio: string, riuscita: boolean, danno = riuscita ? 5 : 0): TiroMostrato =>
  ({ id: 't', tipo: 'attacco', chi, nome: NOME[chi] ?? chi, bersaglio: { id: bersaglio, nome: NOME[bersaglio] ?? bersaglio }, riuscita, danno: riuscita ? { totale: danno } : null, privata: false }) as TiroMostrato;

function guardia(tiri: TiroMostrato[], fuori: string[] = []) {
  return guardiaEsiti({ tiri, nomi: NOMI, conScheda: (id) => id === 'png_ruggero' || id.startsWith('pg_'), fuori: (id) => fuori.includes(id), nome: (id) => NOME[id] ?? id });
}

describe('guardia degli esiti (italiano)', () => {
  it('il caso della partita: la carta dice mancato, il narratore dice colpito → «Ruggero manca Ida.»', () => {
    const g = guardia([attacco('png_ruggero', 'pg_ida', false)]);
    expect(g('Ruggero si alza di scatto, la mazza in pugno, e colpisce Ida di lato: la botta le lascia il braccio intorpidito.')).toEqual({ testo: 'Ruggero manca Ida.', motivo: 'colpo_contrario' });
    // Detto giusto: la frase resta.
    expect(g('La mazza di Ruggero passa accanto a Ida e batte sul muro.')).toBeNull();
    // Il contrario: la carta dice colpito, il narratore dice mancato.
    expect(guardia([attacco('png_ruggero', 'pg_ida', true)])('La mazza di Ruggero manca Ida di un soffio.')).toEqual({ testo: 'Ruggero colpisce Ida.', motivo: 'colpo_contrario' });
    // Una negazione davanti al colpo vale mancato.
    expect(guardia([attacco('png_ruggero', 'pg_ida', true)])('Ruggero non colpisce Ida.')).toEqual({ testo: 'Ruggero colpisce Ida.', motivo: 'colpo_contrario' });
  });

  it('il caso della partita: un PNG in piedi «cade» senza il fatto del Motore → la riga del Motore', () => {
    const colpito = guardia([attacco('pg_corrado', 'png_ruggero', true)]);
    expect(colpito('Il dardo di Corrado colpisce lo sgherro in pieno petto, e quello cade sui gradini con un rantolo.')).toEqual({ testo: 'Ruggero incassa il colpo, ma resta in piedi.', motivo: 'caduta_senza_fatto' });
    // Davvero a terra per il Motore: la frase resta.
    expect(guardia([attacco('pg_corrado', 'png_ruggero', true)], ['png_ruggero'])('Lo sgherro cade sui gradini con un rantolo.')).toBeNull();
    // Senza una carta su di lui: «è ancora in piedi».
    expect(guardia([])('Ruggero crolla a terra, senza vita.')).toEqual({ testo: 'Ruggero è ancora in piedi.', motivo: 'caduta_senza_fatto' });
    // Un PNG senza scheda non cade per il Motore: niente correzione.
    expect(guardia([])('Bertoldo cade dallo sgabello per lo spavento.')).toBeNull();
    // Niente parole di sconfitta: niente correzione.
    expect(guardia([])('Ruggero ride e fa un passo indietro.')).toBeNull();
    // A relative clause with another verb before the fall: «…sullo sgherro, che grida e cade all'indietro».
    expect(guardia([attacco('pg_corrado', 'png_ruggero', true)])('La spada di Corrado cala sullo sgherro, che grida e cade all’indietro.')).toEqual({ testo: 'Ruggero incassa il colpo, ma resta in piedi.', motivo: 'caduta_senza_fatto' });
  });

  it('a blow that hurt, told as absorbed or missed by the target alone (coherence run, off the rails T13) → the hit', () => {
    const g = guardia([attacco('png_ruggero', 'pg_ida', true, 3)]);
    expect(g('Il pugno le scivola sulla spalla di Ida, ma il colpo è corto e la pietra lo assorbe.')).toEqual({ testo: 'Ruggero colpisce Ida.', motivo: 'colpo_contrario' });
    expect(g('La mazza passa accanto a Ida e batte sul muro.')).toEqual({ testo: 'Ruggero colpisce Ida.', motivo: 'colpo_contrario' });
    // A hit word in the sentence, or the attacker named (the pair rule judges it), or no damage: left to the other rules.
    expect(g('La mazza la colpisce di striscio, Ida barcolla.')).toBeNull();
    expect(guardia([attacco('png_ruggero', 'pg_ida', true, 0)])('La pietra assorbe il colpo e Ida resta salda.')).toBeNull();
    // Round 2, combat-auto T6: a negated absorption, and the target as the subject of something else, are not it.
    expect(g('Lo scudo di Ida non regge del tutto: la lama le apre il fianco.')).toBeNull();
    expect(g('Corrado si sposta di lato, e il sasso che Ida aveva puntato rimbalza sulla pietra.')).toBeNull();
    // The target struck too this turn: a miss told about her may be her own blow.
    expect(guardia([attacco('png_ruggero', 'pg_ida', true, 3), attacco('pg_ida', 'png_ruggero', false)])('Ida tira il pugnale, che va a vuoto.')).toBeNull();
  });

  it('a standing PC told down because the player said so (third e2e pass, bug 3) → «Ida è ancora in piedi.»', () => {
    // The player wrote «I see Ida down»; for the Engine she stands at 1 hit point.
    expect(guardia([])('Ida è a terra, e la spalla le sanguina.')).toEqual({ testo: 'Ida è ancora in piedi.', motivo: 'caduta_senza_fatto' });
    expect(guardia([attacco('png_ruggero', 'pg_ida', true, 1)])('Ida barcolla e cade in ginocchio.')).toEqual({ testo: 'Ida incassa il colpo, ma resta in piedi.', motivo: 'caduta_senza_fatto' });
    // Really down for the Engine, or going to the ground on purpose: the sentence stays.
    expect(guardia([], ['pg_ida'])('Ida è a terra, senza sensi.')).toBeNull();
    expect(guardia([])('Ida si getta a terra dietro la pietra.')).toBeNull();
    // Rerun after the fixes, T7: the subject of the fall is another, unnamed one («che il compagno è a terra»).
    expect(guardia([])('Ida si accorge che il compagno è a terra e si muove verso di lui.')).toBeNull();
    expect(guardia([])('Ruggero vede che la mula è a terra.')).toBeNull();
    // A PC who puts something on the ground is not falling (an announcement).
    expect(guardia([])('Ida posa il quaderno a terra e guarda Ruggero.')).toBeNull();
    // An NPC keeps the plain rule.
    expect(guardia([])('Ruggero è a terra.')).toEqual({ testo: 'Ruggero è ancora in piedi.', motivo: 'caduta_senza_fatto' });
  });
  it('shares the combat-fact stems: after the guard the combat facts still work (one compilation per section)', () => {
    guardia([])('Ruggero crolla a terra.');
    expect(fattiMancanti([{ tipo: 'colpito', id: 'png_ruggero', nome: 'Ruggero lo sgherro' }], ['Ruggero incassa il colpo.'])).toEqual([]);
  });
});

/*
 * Pass 2b of the final run (torre-mozza-indagine-B-pass2b), rebuilt on fixture names:
 * - T13: «Zirrà colpisce Fulco di striscio, ma la cotta di maglia regge» for a miss became «Narratore manca Zirrà.»:
 *   the attacker came from the speaker, and the reverse pair (Fulco's sling on Zirrà, also a miss) was taken;
 * - T14: the announcement «Eliandro … tira il pugnale al primo goblin che scappa» was replaced: «pugnale» counted as
 *   a hit and the sentence tells no outcome.
 */
describe('pass 2b: names from the card, direction, announcements, near-hits', () => {
  const duelloMancato = [attacco('pg_corrado', 'png_ruggero', false), attacco('png_ruggero', 'pg_corrado', false)];

  it('the attacker and the target come from the card, in the right direction, never «Narratore»', () => {
    expect(guardia(duelloMancato)('Ruggero colpisce Corrado al fianco.')).toEqual({ testo: 'Ruggero manca Corrado.', motivo: 'colpo_contrario' });
    expect(guardia(duelloMancato)('Il sasso di Corrado colpisce Ruggero alla spalla.')).toEqual({ testo: 'Corrado manca Ruggero.', motivo: 'colpo_contrario' });
    // With a verb of receiving the target comes first.
    expect(guardia(duelloMancato)('Corrado incassa il colpo di Ruggero.')).toEqual({ testo: 'Ruggero manca Corrado.', motivo: 'colpo_contrario' });
  });

  it('a near-hit absorbed by armour fits a miss, and a hit with no damage: not replaced', () => {
    expect(guardia(duelloMancato)('Ruggero colpisce Corrado di striscio, ma la cotta di maglia regge e il nano barcolla appena.')).toBeNull();
    expect(guardia([attacco('png_ruggero', 'pg_corrado', true, 0)])('Ruggero colpisce Corrado di striscio, ma l’armatura regge.')).toBeNull();
  });

  it('an action announced is not an outcome: only a sentence that tells the result is judged', () => {
    const g = guardia([attacco('pg_corrado', 'png_ruggero', false)]);
    expect(g('Corrado si tiene dietro la pietra e tira il pugnale al primo sgherro che scappa.')).toBeNull();
    expect(g('Corrado carica Ruggero per colpirlo.')).toBeNull();
    expect(g('Corrado tira il pugnale e colpisce Ruggero alla spalla.')).toEqual({ testo: 'Corrado manca Ruggero.', motivo: 'colpo_contrario' });
  });
});

/*
 * N3, second pass (pressione-B pass2b T6): «Berta non risponde: il suo sguardo cade un attimo sul cancello» became
 * «Berta è ancora in piedi.». A fall needs the creature as the subject of a physical defeat verb, not an idiom.
 */
describe('N3: idioms and other subjects are not a fall', () => {
  const g = guardia([]);
  it('«lo sguardo cade», «cade il silenzio», «lascia cadere la mazza» are left alone', () => {
    expect(g('Ruggero non risponde: il suo sguardo cade un attimo sul cancello, poi torna al bosco.')).toBeNull();
    expect(g('Cade il silenzio, e Ruggero guarda il fiume.')).toBeNull();
    expect(g('Ruggero lascia cadere la mazza a terra.')).toBeNull();
    expect(g('Cala la sera su Ruggero, che resta sul ponte.')).toBeNull();
    // Who sees someone fall is not the one falling (canary on 97121cb, T16: «Zirrà ti vede cadere e il suo colpo passa…»).
    expect(g('Ruggero ti vede cadere e il suo colpo passa a un palmo da Ida.')).toBeNull();
  });
  it('the creature itself falling is still corrected, also through a pronoun', () => {
    expect(g('Ruggero cade sui gradini con un rantolo.')).toEqual({ testo: 'Ruggero è ancora in piedi.', motivo: 'caduta_senza_fatto' });
    expect(g('Corrado spinge lo sgherro, e quello crolla nel fango.')).toEqual({ testo: 'Ruggero è ancora in piedi.', motivo: 'caduta_senza_fatto' });
  });
});

describe('guardia degli esiti (inglese)', () => {
  beforeAll(() => impostaLingua('en'));
  afterAll(() => impostaLingua('it'));

  it('a hit told against a miss card, and a standing NPC that «collapses»', () => {
    const g = guardia([attacco('png_ruggero', 'pg_ida', false)]);
    expect(g('Ruggero swings his club and strikes Ida on the shoulder.')).toEqual({ testo: 'Ruggero misses Ida.', motivo: 'colpo_contrario' });
    expect(guardia([attacco('pg_corrado', 'png_ruggero', true)])('Corrado’s bolt hits Ruggero, who collapses on the steps.')).toEqual({ testo: 'Ruggero takes the blow but stays on their feet.', motivo: 'caduta_senza_fatto' });
  });

  it('pass 2b in English: card names and direction, announcements and near-hits are left alone', () => {
    const duello = [attacco('pg_corrado', 'png_ruggero', false), attacco('png_ruggero', 'pg_corrado', false)];
    expect(guardia(duello)('Ruggero strikes Corrado in the side.')).toEqual({ testo: 'Ruggero misses Corrado.', motivo: 'colpo_contrario' });
    expect(guardia(duello)('Corrado takes a blow from Ruggero.')).toEqual({ testo: 'Ruggero misses Corrado.', motivo: 'colpo_contrario' });
    expect(guardia(duello)('Ruggero’s blade grazes Corrado, but the armour holds.')).toBeNull();
    expect(guardia(duello)('Corrado ducks behind the stone and throws the dagger at the first guard who runs.')).toBeNull();
  });

  it('N3 in English: «her gaze falls», «silence falls» are not a fall; «he collapses» is', () => {
    const g = guardia([]);
    expect(g('Ruggero says nothing; his gaze falls on the gate for a moment.')).toBeNull();
    expect(g('Silence falls, and Ruggero looks at the river.')).toBeNull();
    expect(g('Ruggero staggers and collapses on the steps.')).toEqual({ testo: 'Ruggero is still on their feet.', motivo: 'caduta_senza_fatto' });
  });
});
