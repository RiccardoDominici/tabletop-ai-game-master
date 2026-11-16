/**
 * Unnamed actors (coerenza/attori.ts): an attack on a PC or a flight told with no name for who does it inherits the
 * actor from the visit's cards and flights; an actor out of play since before the turn gets R-fuori's state line.
 * Invented fixture: at the mill, Ida Marchi and Corrado (PCs) fought Ruggero the bandit (dead since turn 4) and
 * Bertoldo (fled at turn 5); Nives the miller stands in the scene and never fought.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { attoreImplicito, guardiaAttori, type DatiAttori } from '../src/coerenza/attori';
import { VerificaTurno } from '../src/coerenza/verifica';
import type { EntitaRegistro } from '../src/coerenza/registro';
import { impostaLingua } from '../src/lingua';
import { DadiACopione } from '../src/prove/dadi';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

const e = (id: string, nomi: string[], stato: EntitaRegistro['stato'], presenza: EntitaRegistro['presenza'] = 'in_scena'): EntitaRegistro => ({
  id,
  tipo: id.startsWith('pg_') ? 'pg' : 'png',
  nome: nomi[0]!,
  nomi,
  stato,
  presenza,
  uscito: null,
});
const entita = [
  e('pg_ida', ['Ida Marchi', 'Ida'], 'in_piedi'),
  e('pg_corrado', ['Corrado'], 'in_piedi'),
  e('png_ruggero', ['Ruggero', 'bandito'], 'morto'),
  e('png_bertoldo', ['Bertoldo'], 'fuggito', 'altrove'),
  e('png_nives', ['Nives', 'mugnaia'], 'in_piedi'),
];
const dati = (o: Partial<DatiAttori> = {}): DatiAttori => ({
  turno: 7,
  entita,
  storia: {
    carte: [
      { turno: 3, chi: 'png_bertoldo', bersaglio: 'pg_ida' },
      { turno: 4, chi: 'pg_corrado', bersaglio: 'png_ruggero' },
    ],
    fughe: [{ turno: 5, id: 'png_bertoldo' }],
  },
  fuoriOra: new Set(),
  ...o,
});

beforeEach(() => impostaLingua('it'));

describe('a flight with no name', () => {
  it('after a relative, or in a clause that names nobody: the last one who fled', () => {
    expect(attoreImplicito('Dal muro Corrado lancia un sasso verso la figura che scappa nel bosco.', dati())).toEqual({ atto: 'fuga', id: 'png_bertoldo' });
    expect(attoreImplicito('Ida si volta: il rumore dei passi si allontana verso il fiume.', dati())).toEqual({ atto: 'fuga', id: 'png_bertoldo' });
  });

  it('not a zero subject (it carries the sentence before) nor a thing', () => {
    expect(attoreImplicito('Poi scappa verso il mulino, senza voltarsi.', dati())).toBeNull();
    expect(attoreImplicito('Le lanterne si allontanano lungo il fiume.', dati())).toBeNull();
  });

  it('not when a PC is the subject, a character is named, the flight is this turn\'s, or nobody fled', () => {
    expect(attoreImplicito('Ida si allontana dalla ruota del mulino.', dati())).toBeNull();
    expect(attoreImplicito('Nives scappa verso la casa.', dati())).toBeNull();
    expect(attoreImplicito('La figura che scappa sparisce tra gli alberi.', dati({ turno: 5, storia: { ...dati().storia, fughe: [{ turno: 5, id: 'png_bertoldo' }] }, fuoriOra: new Set(['png_bertoldo']) }))).toBeNull();
    expect(attoreImplicito('La figura che scappa sparisce tra gli alberi.', dati({ storia: { ...dati().storia, fughe: [] } }))).toBeNull();
  });
});

describe('an attack on a PC with no attacker named', () => {
  it('no card on that PC this turn and nobody of the fight standing here: the last foe of the cards', () => {
    expect(attoreImplicito('Ida para la lancia con lo scudo: il legno geme, ma regge.', dati())).toEqual({ atto: 'attacco', id: 'png_ruggero' });
    expect(attoreImplicito('Ida alza lo scudo e il colpo della lancia rimbalza sul bordo.', dati())).toEqual({ atto: 'attacco', id: 'png_ruggero' });
  });

  it('not with a card on that PC this turn, a foe of the fight standing, a PC\'s own weapon, or no blow coming', () => {
    expect(attoreImplicito('Ida para la lancia con lo scudo.', dati({ storia: { ...dati().storia, carte: [...dati().storia.carte, { turno: 7, chi: 'png_nives', bersaglio: 'pg_ida' }] } }))).toBeNull();
    const inPiedi = entita.map((x) => (x.id === 'png_ruggero' ? { ...x, stato: 'ferito' as const } : x));
    expect(attoreImplicito('Ida para la lancia con lo scudo.', dati({ entita: inPiedi }))).toBeNull();
    expect(attoreImplicito('Ida alza lo scudo, e la lama di Corrado rimbalza sulla pietra.', dati())).toBeNull();
    expect(attoreImplicito('Ida alza lo scudo e avanza verso la ruota.', dati())).toBeNull();
    // «para» as a word, not a stem: the parapet is no parry.
    expect(attoreImplicito('Ida si appoggia al parapetto, la lancia in mano.', dati())).toBeNull();
  });

  it('no fight in this visit: nothing is judged', () => {
    expect(guardiaAttori(dati({ storia: { carte: [], fughe: [] } }))).toBeNull();
  });
});

describe('prewritten lines', () => {
  it('a repertoire row is checked with `prescritta`: the unnamed-actor rule leaves it to its author', () => {
    const g = guardiaAttori(dati())!;
    const v = new VerificaTurno({ turno: 7, idPng: new Set(), nomiPg: [], correggiEsito: (t, opz) => (opz?.prescritta ? null : g(t)) }, () => undefined);
    expect(v.verificaBattuta('nar_segno', { etichetta: 'narratore', testo: 'Fuori si sentono passi che scappano verso il bosco.' })).toBeNull();
    expect(v.verifica({ etichetta: 'narratore', testo: 'Fuori si sentono passi che scappano verso il bosco.', voce: '', segmento: 0 })).toMatchObject({ tipo: 'dici', testo: 'Bertoldo non è più qui.' });
  });
});

describe('the guard of the turn', () => {
  it('the state line of the inherited actor once, then the sentence dropped', () => {
    const g = guardiaAttori(dati())!;
    expect(g('Ida para la lancia con lo scudo.')).toEqual({ testo: 'Ruggero giace a terra, senza vita.', motivo: 'attore_implicito', id: 'png_ruggero' });
    expect(g('Corrado alza lo scudo contro la lancia che arriva.')).toEqual({ testo: '', motivo: 'attore_implicito', id: 'png_ruggero' });
    expect(g('Il rumore dei passi si allontana verso il fiume.')).toEqual({ testo: 'Bertoldo non è più qui.', motivo: 'attore_implicito', id: 'png_bertoldo' });
    expect(g('Nives guarda il fiume.')).toBeNull();
  });

  it('in English, from the same data', () => {
    impostaLingua('en');
    const en = entita.map((x) => (x.id === 'png_ruggero' ? { ...x, nomi: ['Ruggero', 'bandit'] } : x));
    expect(attoreImplicito('Ida parries the spear with her shield.', dati({ entita: en }))).toEqual({ atto: 'attacco', id: 'png_ruggero' });
    expect(attoreImplicito('Corrado throws a stone at the figure who flees into the woods.', dati({ entita: en }))).toEqual({ atto: 'fuga', id: 'png_bertoldo' });
    expect(guardiaAttori(dati({ entita: en }))!('The sound of steps moves away toward the river.')).toMatchObject({ testo: 'Bertoldo is no longer here.' });
  });
});

class ArbitroColpo implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
    return Object.fromEntries(i.azioni.map((a) => [a.id, /colpisco/i.test(a.testo) ? { ...base(a.id), tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' } : base(a.id)]));
  }
}

describe('unnamed actors with the whole server (the rules, no judge)', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('after the fight, a parried spear nobody throws becomes the state of the last foe', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    const copione = (t: number): string =>
      t === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : t === 2 ? '[narratore] Ida para la lancia con lo scudo: il legno geme, ma regge.\n[narratore] Corrado guarda il fiume.\n[invito] tutti' : '[narratore] Il ferro suona sul ponte.\n[invito] tutti';
    // T1: Corrado kills Ruggero; T2: nobody of the fight is standing, and the narration has a spear thrown at Ida.
    const { url } = await prova.avvia(cartella, copione, {}, { arbitroProve: new ArbitroColpo(), dadi: new DadiACopione([10, 8, 15, 5, 10]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const corrado = await prova.telefono(url, 'pg_corrado');
    let s = await inizia(schermo, ida);
    for (const [perCorrado, perIda] of [['Colpisco Ruggero con la spada', 'Guardo il fiume'], ['Guardo il fiume', 'Alzo lo scudo']] as const) {
      const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === s.turno + 1);
      await agisci(corrado, 'pg_corrado', perCorrado, s.versione_scena);
      await agisci(ida, 'pg_ida', perIda, s.versione_scena);
      s = await dopo;
    }
    const t2 = s.trascrizione.filter((v) => v.turno === 2 && v.tipo === 'narrazione').map((v) => v.testo).join(' ');
    expect(t2).toContain('Ruggero giace a terra, senza vita.');
    expect(t2).not.toContain('para la lancia');
    expect(t2).toContain('Corrado guarda il fiume.');
  }, 20_000);
});
