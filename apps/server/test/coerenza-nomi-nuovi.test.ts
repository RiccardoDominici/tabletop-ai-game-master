/**
 * Names the players invent (coerenza/nomi-nuovi.ts, docs/coerenza.md «Characters the players invent»): the blind
 * off-the-rails script addressed «Oreste» and «Madre Carla», and existing NPCs answered for them. Invented fixture.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { caricaCampagna } from '../src/campagna/caricatore';
import { nomiDellaCampagna, nomiNuovi, nomiRivolti } from '../src/coerenza/nomi-nuovi';
import { cartelle, scriviJson } from '../src/sceneggiatore/protocollo';
import { impostaLingua } from '../src/lingua';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';
import fs from 'node:fs';
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

describe('a name spoken to, not only mentioned (round 6: FB T7 «Chiedo a Oreste…», T11 «Madre Carla, sei…»)', () => {
  it('a vocative, a preposition of speech, a question; not a mention', () => {
    expect(nomiRivolti('Chiedo a Oreste se ha visto luci sulla collina.', ['Oreste'])).toEqual(['Oreste']);
    expect(nomiRivolti('Madre Carla, sei una vecchia ladra.', ['Madre Carla'])).toEqual(['Madre Carla']);
    expect(nomiRivolti('Ehi tu, pastore! Sei Oreste? Mi vendi un formaggio?', ['Oreste'])).toEqual(['Oreste']);
    expect(nomiRivolti('Chiedo del santuario di Brychan.', ['Brychan'])).toEqual([]);
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

  // Round 7: the lexicon learned in an earlier run had «Oreste» (unverified), and he counted as a campaign name.
  it.each([
    [false, true],
    [true, false],
  ])('a name of the lexicon learned in play counts as known only once verified (verificata %s → neutral line %s)', async (verificata, neutra) => {
    prova = new Prova();
    fs.mkdirSync(path.join(prova.cartella, 'log'), { recursive: true });
    fs.writeFileSync(path.join(prova.cartella, 'log', 'pronunce-gioco.yaml'), `lessico:\n  - {nome: Oreste, it: {grafia: Orèste}, verificata: ${verificata}}\n`);
    const { url } = await prova.avvia(prova.campagna('prove'), () => '[narratore] Il fiume rumoreggia.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const s = await inizia(schermo, ida);
    const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === s.turno + 1);
    await agisci(ida, 'pg_ida', 'Chiedo a Oreste se ha visto passare il carro.', s.versione_scena);
    const fine = await dopo;
    expect(fine.trascrizione.some((v) => v.testo === 'Oreste? Qui nessuno conosce questo nome.')).toBe(neutra);
  }, 20_000);

  it('with the scriptwriter on too: words to «Oreste» get the neutral line, no NPC answers for him, no subito', async () => {
    prova = new Prova();
    const radice = path.join(prova.cartella, 'sceneggiatore');
    scriviJson(cartelle(radice).vivo, { ts: Date.now(), pid: 0, modello: 'prova' });
    // The selector picks Bertoldo's line for Ida's question to «Oreste» (round 6: Ugo answered for him).
    const { url } = await prova.avvia(prova.campagna('prove'), (t) => (t === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : '[usa] bertoldo_saluto > pg_ida\n[invito] tutti'), {}, { sceneggiatore: { radice, tettoMs: 30_000 } });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const s = await inizia(schermo, ida);
    const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === s.turno + 1);
    // The action touches the themes of Bertoldo's line (ponte, pedaggio): it is in the catalogue, and still refused.
    await agisci(ida, 'pg_ida', 'Chiedo a Oreste del ponte e del pedaggio.', s.versione_scena);
    const fine = await dopo;
    expect(JSON.stringify(prova.narrazioni())).toContain('nessun PNG risponde al suo posto');
    const detto = fine.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo);
    expect(detto).toContain('Oreste? Qui nessuno conosce questo nome.');
    expect(detto).not.toContain('Due monete a testa, signori. Il ponte è vostro.');
    expect(fs.readdirSync(cartelle(radice).richieste).some((f) => f.startsWith('subito'))).toBe(false);
  }, 20_000);
});
