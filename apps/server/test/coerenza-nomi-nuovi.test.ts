/**
 * Names the players invent (coerenza/nomi-nuovi.ts, docs/coerenza.md «Characters the players invent»): the blind
 * off-the-rails script addressed «Oreste» and «Madre Carla», and existing NPCs answered for them. Invented fixture.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { caricaCampagna } from '../src/campagna/caricatore';
import { nomiDellaCampagna, nomiNuovi } from '../src/coerenza/nomi-nuovi';
import { impostaLingua } from '../src/lingua';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';
import path from 'node:path';

beforeAll(() => impostaLingua('it'));

describe('the names the campaign does not know', () => {
  const c = caricaCampagna(path.join(__dirname, 'fixtures', 'campagne', 'prove'));
  const n = nomiDellaCampagna(c, 'it');

  it('a capitalised word in mid-sentence nobody knows; not a PC, an NPC, an alias, nor an ordinary word', () => {
    expect(nomiNuovi('Ehi tu, pastore! Sei Oreste? Mi vendi un formaggio?', n)).toEqual(['Oreste']);
    expect(nomiNuovi('Chiedo a Bertoldo se Ruggero è passato dal ponte.', n)).toEqual([]);
    expect(nomiNuovi('Madre Carla, dove vai col carretto?', n)).toEqual(['Carla']);
    // The first word of a sentence is no evidence; a word in capitals is a shout.
    expect(nomiNuovi('Oreste! Vieni qui.', n)).toEqual([]);
    expect(nomiNuovi('Grido FERMI a tutti.', n)).toEqual([]);
  });
});

describe('with the whole server, mode B', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the Engine says nobody here has the name, once a visit, and the block tells the selector', async () => {
    prova = new Prova();
    const { url, messaggi } = await prova.avvia(prova.campagna('prove'), (t) => (t === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : '[narratore] Il vento soffia sul ponte.\n[invito] tutti'));
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    let s = await inizia(schermo, ida);
    for (const testo of ['Chiedo a Oreste se ha visto passare il carro.', 'Insisto: Oreste, rispondi!']) {
      const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === s.turno + 1);
      await agisci(ida, 'pg_ida', testo, s.versione_scena);
      s = await dopo;
    }
    const detto = (t: number): string[] => s.trascrizione.filter((v) => v.turno === t && v.tipo === 'narrazione').map((v) => v.testo);
    // Neutral: a person or a place the players named, nobody here knows it.
    expect(detto(1)).toContain('Oreste? Qui nessuno conosce questo nome.');
    expect(detto(2)).not.toContain('Oreste? Qui nessuno conosce questo nome.');
    expect(messaggi[1]).toContain('Nessuno in scena si chiama Oreste');
  }, 20_000);
});
