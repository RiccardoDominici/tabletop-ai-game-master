/**
 * R-inesistente (coerenza/inesistenti.ts): a creature the ledger does not have in the scene, attacked or acting. The
 * coherence runs on 2a7697c fought «il goblin con la lancia», a goblin the campaign never had, for eight turns after the
 * real foes fell. Invented fixture: Ruggero the bandit (alias «bandito», «capobanda»), Bertoldo the toll-keeper, a
 * minion type «lupo».
 */
import { describe, expect, it } from 'vitest';
import { creatureAssenti, creatureNote, frasePresenti, guardiaInesistenti, nominateIn, rigaAssenti } from '../src/coerenza/inesistenti';
import type { EntitaRegistro, Registro, StatoEntita } from '../src/coerenza/registro';

const pg = (id: string, nome: string): EntitaRegistro => ({ id, tipo: 'pg', nome, nomi: [nome], stato: 'in_piedi', presenza: 'in_scena', uscito: null });
const png = (id: string, nome: string, alias: string[], stato: StatoEntita, presenza: EntitaRegistro['presenza'] = 'in_scena'): EntitaRegistro => ({
  id,
  tipo: 'png',
  nome,
  nomi: [nome, ...alias],
  stato,
  presenza,
  uscito: null,
});
const registro = (entita: EntitaRegistro[]): Registro => ({ turno: 5, scena: 'scena_ponte', entita, fatti: [], esiti: [], negati: [] });
const TIPI = [{ nome: 'lupo', parole: ['lupo', 'belva'] }];

function ledger(ruggero: StatoEntita, bertoldo: StatoEntita = 'in_piedi'): Registro {
  return registro([pg('pg_ida', 'Ida Marchi'), pg('pg_corrado', 'Corrado'), png('png_ruggero', 'Ruggero', ['bandito', 'capobanda'], ruggero), png('png_bertoldo', 'Bertoldo', ['pedaggiere'], bertoldo)]);
}

describe('the creature nouns come from the data', () => {
  it('aliases that are not the name, and the minion types; a PC name never', () => {
    const note = creatureNote(ledger('in_piedi').entita, TIPI);
    expect(note.map((n) => n.parola).sort()).toEqual(['bandito', 'belva', 'capobanda', 'lupo', 'pedaggiere']);
    expect(note.find((n) => n.parola === 'bandito')?.titolari).toEqual(['png_ruggero']);
    expect(note.find((n) => n.parola === 'lupo')?.titolari).toEqual([]);
  });

  it('a noun is absent when nobody it names is in the scene and in play; a hidden one is not revealed', () => {
    const note = creatureNote(ledger('fuggito').entita, TIPI);
    expect(creatureAssenti(ledger('fuggito'), note).map((a) => a.parola).sort()).toEqual(['bandito', 'belva', 'capobanda', 'lupo']);
    expect(creatureAssenti(ledger('ferito'), note).map((a) => a.parola).sort()).toEqual(['belva', 'lupo']);
    expect(creatureAssenti(ledger('nascosto'), note).map((a) => a.parola)).not.toContain('bandito');
    // Ruggero fled from this scene: he is the one the table hears about, also once the fled one left the presence.
    expect(creatureAssenti(ledger('fuggito'), note).find((a) => a.parola === 'bandito')?.caduti.map((e) => e.id)).toEqual(['png_ruggero']);
    const andato = registro([pg('pg_ida', 'Ida Marchi'), png('png_ruggero', 'Ruggero', ['bandito'], 'fuggito', 'altrove')]);
    expect(frasePresenti(andato, creatureAssenti(andato, creatureNote(andato.entita)))).toBe('Ruggero non è più qui. Oltre a voi, qui non si vede nessuno in piedi.');
  });
});

describe('what the table hears', () => {
  it('the fallen one the noun named, then who stands in sight besides the PCs', () => {
    const r = ledger('morto');
    const assenti = nominateIn('Colpisco il bandito con la lancia!', creatureAssenti(r, creatureNote(r.entita, TIPI)));
    expect(assenti.map((a) => a.parola)).toEqual(['bandito']);
    expect(frasePresenti(r, assenti)).toBe('Ruggero giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Bertoldo.');
    const vuoto = ledger('fuggito', 'morto');
    expect(frasePresenti(vuoto, nominateIn('Attacco il lupo.', creatureAssenti(vuoto, creatureNote(vuoto.entita, TIPI))))).toBe('Oltre a voi, qui non si vede nessuno in piedi.');
    expect(rigaAssenti(assenti)).toContain('«bandito»');
    // Two standing: the plural, «A e B».
    const due = registro([...ledger('morto').entita, png('png_ugo', 'Ugo Ferri', ['mugnaio'], 'ferito')]);
    expect(frasePresenti(due, nominateIn('Colpisco il bandito.', creatureAssenti(due, creatureNote(due.entita))))).toBe('Ruggero giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Bertoldo e Ugo.');
  });
});

describe('the narration guard', () => {
  const r = ledger('fuggito');
  const assenti = creatureAssenti(r, creatureNote(r.entita, TIPI)).filter((a) => a.parola === 'bandito');
  const frase = frasePresenti(r, assenti);
  const nuova = (giaDetta = false) => guardiaInesistenti({ assenti, nomiTitolari: ['Ruggero'], frase, giaDetta })!;

  it('the absent creature as subject, hit, wounded in a body part, or the goal of a move: the line, then dropped', () => {
    const g = nuova();
    expect(g('Il bandito con la lancia si lancia su Ida.')).toEqual({ testo: frase, motivo: 'creatura_inesistente' });
    expect(g('Ida colpisce il bandito al fianco.')).toEqual({ testo: '', motivo: 'creatura_inesistente' });
    expect(nuova()('Il pugnale di Corrado si pianta nella spalla del bandito.')?.testo).toBe(frase);
    expect(nuova()('Ida avanza verso l\'ultimo bandito, lo scudo alto.')?.testo).toBe(frase);
    expect(nuova()('Il primo bandito si volta di scatto.')?.testo).toBe(frase);
  });

  it('a subject pronoun right after carries it: «Quello cade contro il muro.»', () => {
    const g = nuova(true);
    expect(g('Il dardo trafigge il bandito.')).toEqual({ testo: '', motivo: 'creatura_inesistente' });
    expect(g('Quello cade contro il muro senza un suono.')).toEqual({ testo: '', motivo: 'creatura_inesistente' });
    expect(g('Il vento soffia sul ponte.')).toBeNull();
    expect(g('Quello è il punto più stretto del fiume.')).toBeNull();
  });

  it('left alone: the name (R-fuori\'s), a state, a negation, a place named after the creature, an aside', () => {
    const g = nuova();
    expect(g('Ruggero, il bandito, scappa oltre il ponte.')).toBeNull();
    expect(g('Il bandito giace a terra, immobile.')).toBeNull();
    expect(g('Nessun bandito sul ponte: solo il vento.')).toBeNull();
    expect(g('Il sentiero del bandito sale verso il bosco.')).toBeNull();
    expect(g('Ida ricorda le storie dei banditi della valle.')).toBeNull();
  });

  it('nothing absent: no guard', () => {
    expect(guardiaInesistenti({ assenti: [], nomiTitolari: [], frase: '' })).toBeNull();
  });
});
