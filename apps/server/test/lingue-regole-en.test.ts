/**
 * Regole linguistiche del Motore in inglese (lingue/en/motore.yaml, docs/lingue.md): collegamenti tra azioni,
 * divisore di frasi, annuncio in terza persona, guardia della finzione, guardia dei numeri, nomi brevi,
 * prompt e messaggi ai modelli. E il lettore minimo che legge il turno come DATI: lo stesso turno in
 * italiano e in inglese dà lo stesso ingresso, e uguale a quello letto dal testo italiano di sempre.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { relazioniDaRegole } from '../src/azioni/regole';
import { nomeBreve } from '../src/campagna/nomi';
import { impostaLingua, testo } from '../src/lingua';
import { prompt } from '../src/lingua/motore';
import { annuncioBreve, leggiTurno, NarratoreMinimo, turnoDaDati } from '../src/llm/minimo';
import type { ModelloLinguaggio, RichiestaModello } from '../src/llm/modello';
import { loggerMuto } from '../src/logger';
import { fuoriDallaFinzione } from '../src/narrazione/finzione';
import { dividiTesto } from '../src/narrazione/frasi';
import { compilaMessaggioTurno, type DatiMessaggioTurno } from '../src/narrazione/messaggio';
import { togliNumeriRegole } from '../src/narrazione/numeri-regole';
import { destinatarioPrivato, guardiaPrivate } from '../src/narrazione/privato';

beforeAll(() => impostaLingua('en'));
afterAll(() => impostaLingua('it'));

const nomi = new Map([
  ['corrado', 'pg_corrado'],
  ['ginestra', 'pg_ginestra'],
  ['ida', 'pg_ida'],
]);
const azione = (id: string, autore: string, t: string, privata = false) => ({ id, autore, nome: autore.slice(3), testo: t, privata });

describe('collegamenti tra azioni in inglese', () => {
  const corrado = azione('a1', 'pg_corrado', 'I open the cellar door');
  const ginestra = azione('a2', 'pg_ginestra', 'I search the bar');

  it('«me too» e «I follow him» con una sola azione candidata: dipendenza certa', () => {
    expect(relazioniDaRegole(azione('a3', 'pg_ida', 'Me too'), [corrado], nomi)).toEqual({ dipende_da: ['a1'], certo: true, formula: 'anch_io' });
    expect(relazioniDaRegole(azione('a3', 'pg_ida', 'Same here, I go'), [corrado], nomi)).toMatchObject({ dipende_da: ['a1'], certo: true });
    expect(relazioniDaRegole(azione('a3', 'pg_ida', 'I follow him down'), [corrado], nomi)).toEqual({ dipende_da: ['a1'], certo: true, formula: 'seguo_pronome' });
    expect(relazioniDaRegole(azione('a3', 'pg_ida', 'I give her a hand'), [corrado], nomi)).toMatchObject({ dipende_da: ['a1'], certo: true });
  });

  it('«I follow Corrado», «I cover Ginestra»: il PG nominato, anche con due azioni in coda', () => {
    expect(relazioniDaRegole(azione('a3', 'pg_ida', 'I follow Corrado into the cellar'), [corrado, ginestra], nomi)).toEqual({ dipende_da: ['a1'], certo: true, formula: 'legame_con_nome' });
    expect(relazioniDaRegole(azione('a3', 'pg_ida', 'I cover Ginestra while she searches'), [corrado, ginestra], nomi)).toEqual({ dipende_da: ['a2'], certo: true, formula: 'legame_con_nome' });
    expect(relazioniDaRegole(azione('a3', 'pg_ida', 'I stick close to Corrado’s back'), [corrado, ginestra], nomi)).toMatchObject({ dipende_da: ['a1'], certo: true });
  });

  it('nominare, parlare a un PG o «me too» con due candidati non è certo', () => {
    expect(relazioniDaRegole(azione('a3', 'pg_ida', 'I ask Corrado what he saw'), [corrado], nomi)).toEqual({ dipende_da: [], certo: false, formula: null });
    expect(relazioniDaRegole(azione('a3', 'pg_ida', 'me too'), [corrado, ginestra], nomi)).toEqual({ dipende_da: [], certo: false, formula: 'anch_io' });
    // «me too» in mezzo a una frase lunga è un paragone: lo decide il modello.
    expect(relazioniDaRegole(azione('a3', 'pg_ida', 'I am hungry me too but I go to the back room alone'), [corrado], nomi)).toEqual({ dipende_da: [], certo: false, formula: 'anch_io' });
  });
});

describe('frasi inglesi per la voce', () => {
  it('abbreviazioni e iniziali non spezzano, la frase sì', () => {
    expect(dividiTesto('Mr. Smith arrives. He waits.')).toEqual(['Mr. Smith arrives.', 'He waits.']);
    expect(dividiTesto('Dr. Vane and St. Clare cross the bridge. J. R. Hale follows!')).toEqual(['Dr. Vane and St. Clare cross the bridge.', 'J. R. Hale follows!']);
    expect(dividiTesto('“Stop.” The guard raises a hand. Wait... maybe not.')).toEqual(['“Stop.”', 'The guard raises a hand.', 'Wait... maybe not.']);
    // «No.» chiude la frase: in inglese «no» non è un'abbreviazione.
    expect(dividiTesto('No. Not tonight.')).toEqual(['No.', 'Not tonight.']);
  });
});

describe('annuncio in terza persona', () => {
  it('«I open the door» → «Ginestra opens the door.»', () => {
    expect(annuncioBreve('Ginestra', 'I open the door')).toBe('Ginestra opens the door.');
    expect(annuncioBreve('Ginestra', 'ok so I try to pick the lock, quietly')).toBe('Ginestra tries to pick the lock.');
    expect(annuncioBreve('Corrado', 'I search the room for my dagger')).toBe('Corrado searches the room for their dagger.');
    expect(annuncioBreve('Ida', "I'm going down the stairs")).toBe('Ida is going down the stairs.');
    expect(annuncioBreve('Ida', 'I’ll wait by the fire')).toBe('Ida will wait by the fire.');
    expect(annuncioBreve('Ida', 'I quickly grab the rope and the lantern')).toBe('Ida quickly grabs the rope and the lantern.');
    expect(annuncioBreve('Ida', 'I carry the barrel and I watch the door')).toBe('Ida carries the barrel and watches the door.');
    expect(annuncioBreve('Ida', 'I do not trust him')).toBe('Ida does not trust him.');
  });

  it('il verbo senza soggetto dopo «and» non si coniuga: la frase si ferma prima', () => {
    expect(annuncioBreve('Ginestra', 'I open the door and look inside')).toBe('Ginestra opens the door.');
    expect(annuncioBreve('Ginestra', 'I try and climb the wall')).toBe('Ginestra: “I try and climb the wall.”');
  });

  it('quando non si può voltare con certezza si cita il giocatore; al massimo 12 parole', () => {
    expect(annuncioBreve('Ginestra', 'the door, I kick it open')).toBe('Ginestra: “The door.”');
    expect(annuncioBreve('Ginestra', 'Quietly towards the stairs')).toBe('Ginestra: “Quietly towards the stairs.”');
    // Le parole tra virgolette restano del giocatore: si volta solo ciò che viene prima.
    expect(annuncioBreve('Ginestra', 'I tell the innkeeper "I need a room"')).toBe('Ginestra tells the innkeeper "I need a room".');
    expect(annuncioBreve('Ginestra', '"Open up!" I shout')).toBe('Ginestra: “Open up.”');
    expect(annuncioBreve('Ida', 'haha ok!!')).toBeNull();
    const lungo = annuncioBreve('Ida', 'I walk slowly along the wall of the great hall towards the kitchen door without being seen')!;
    expect(lungo.split(' ').length).toBeLessThanOrEqual(12);
    expect(lungo).toMatch(/^Ida walks slowly along the wall/);
  });
});

describe('guardie in inglese', () => {
  it('la finzione: frasi sul tavolo scartate, frasi di gioco no', () => {
    expect(fuoriDallaFinzione('None of the players has spoken yet.')).not.toBeNull();
    expect(fuoriDallaFinzione('Nobody has decided yet, so the bridge decides for you.')).not.toBeNull();
    expect(fuoriDallaFinzione('The PCs stand still.')).toBe('PC');
    expect(fuoriDallaFinzione('We are still waiting for you.')).not.toBeNull();
    expect(fuoriDallaFinzione('A gust of wind slams the shutters; the lanterns sway.')).toBeNull();
    expect(fuoriDallaFinzione('The NPC innkeeper wipes a mug.')).toBeNull();
  });

  it('i numeri delle regole perdono il numero, il resto resta', () => {
    expect(togliNumeriRegole('The blow staggers him: four hit points left.').testo).toBe('The blow staggers him: some hit points left.');
    expect(togliNumeriRegole('Corrado has 7 hit points out of 12.').testo).toBe('Corrado has some hit points.');
    expect(togliNumeriRegole('Ida is at 0 hit points.').testo).toBe('Ida is down.');
    expect(togliNumeriRegole('He has zero hit points.').testo).toBe('He has no hit points.');
    expect(togliNumeriRegole('Only 3/11 HP remain.').testo).toBe('Only some hit points remain.');
    expect(togliNumeriRegole("The bolt beats Ruggero's AC 15.").testo).toBe("The bolt beats Ruggero's armor.");
    expect(togliNumeriRegole('It slips past the AC of 15.').testo).toBe('It slips past the armor.');
    expect(togliNumeriRegole('Make a DC 15 Dexterity saving throw.').testo).toBe('Make a Dexterity saving throw.');
    expect(togliNumeriRegole('You needed to beat the DC 12.').testo).toBe('You needed to beat the difficulty.');
    expect(togliNumeriRegole('Twenty-one Hit points, he says.').testo).toBe('Some hit points, he says.');
    expect(togliNumeriRegole('Three coins and seven steps: the chest is two yards away.')).toEqual({ testo: 'Three coins and seven steps: the chest is two yards away.', tolti: [] });
  });

  it('azioni private: le parole vuote inglesi non contano come contenuto in comune', () => {
    const priv = [{ id_pg: 'pg_teo', nomi: ['Teo'], testo: 'I quietly force the padlock of the toll box' }];
    expect(destinatarioPrivato('Teo kneels by the toll box and works at the padlock.', priv, new Set(['teo']))).toMatchObject({ id_pg: 'pg_teo' });
    expect(destinatarioPrivato('Teo looks around quietly, while the others wait.', priv, new Set(['teo']))).toBeNull();
  });

  it('azioni private: la risposta del PNG a cui si parla in privato va al telefono, anche in inglese', () => {
    const nomiPng = new Map([
      ['png_keeper', ['hob the keeper', 'hob', 'keeper']],
      ['png_guard', ['wren the guard', 'wren', 'guard']],
    ]);
    const azioni = [
      { id_pg: 'pg_mara', testo: 'Hob, aside, quietly: «Which road leads to the tower, and who goes up at night?»', privata: true },
      { id_pg: 'pg_tobin', testo: 'Wren, give me the key: I will bring the boy back before midnight.', privata: false },
    ];
    const g = guardiaPrivate(azioni, (id) => (id === 'pg_mara' ? ['Mara Quill', 'Mara'] : ['Tobin Ash', 'Tobin']), new Set(['mara quill', 'tobin ash', 'hob the keeper', 'wren the guard']), nomiPng)!;
    expect(g('The path runs behind the charcoal pit. At night only the goblins take it.', 1, 'png_keeper')?.id_pg).toBe('pg_mara');
    expect(g('I give you nothing, soldier.', 2, 'png_guard')).toBeNull();
    expect(g('Tobin holds out his hand to Wren.', 3, 'narratore')).toBeNull();
    // A private question and a public action to the same NPC: the reply goes where its words come from.
    const stesso = [
      { id_pg: 'pg_mara', testo: 'Hob, quietly: does anyone in the village talk to the goblins?', privata: true },
      { id_pg: 'pg_tobin', testo: 'Hob, give me the key: I will bring the boy back.', privata: false },
    ];
    const g2 = guardiaPrivate(stesso, (id) => (id === 'pg_mara' ? ['Mara Quill', 'Mara'] : ['Tobin Ash', 'Tobin']), new Set(['mara quill', 'tobin ash', 'hob the keeper']), nomiPng)!;
    expect(g2('Here we talk to everyone. Not to the goblins.', 4, 'png_keeper')?.id_pg).toBe('pg_mara');
    expect(g2('The key stays with me until you bring the boy back.', 5, 'png_keeper')).toBeNull();
  });

  it('nomi brevi: titoli inglesi saltati', () => {
    expect(nomeBreve('Sister Teodora')).toBe('Teodora');
    expect(nomeBreve('Mr. Hale')).toBe('Hale');
    expect(nomeBreve('Corrado Vane')).toBe('Corrado');
  });
});

describe('prompt e messaggi ai modelli in inglese', () => {
  it('i prompt estratti esistono in inglese con lo stesso protocollo', () => {
    expect(prompt('arbitro-azioni')).toMatch(/^You are the action referee/);
    expect(prompt('arbitro-azioni')).toMatch(/«valida»/);
    expect(prompt('riassunto')).toMatch(/«FILO:»/);
    expect(prompt('lettore-minimo')).toContain('{"risposte":[{"pg":"pg_…","battuta":"…"}]}');
    expect(prompt('lettore-minimo', 'it')).toMatch(/^Sei il lettore/);
    expect(testo('modelli.json.istruzione', { schema: '{}' })).toBe('Answer ONLY with a JSON object valid for this schema, with no text before or after, no comments:\n{}');
  });
});

describe('lettore minimo: il turno come dati, uguale in ogni lingua', () => {
  const dati: DatiMessaggioTurno = {
    turno: 3,
    trascrizione: [],
    azioni: [
      { id_pg: 'pg_ida', nome: 'Ida', testo: 'I look at the little box up close', numero: 1 },
      { id_pg: 'pg_livia', nome: 'Livia', testo: 'I follow the footprints', numero: 2, privata: true },
      { id_pg: 'pg_vanda', nome: 'Vanda', testo: null },
    ],
    pgAlTavolo: [{ id: 'pg_ida', nome: 'Ida' }],
    repertorio: {
      fattiScoperti: [],
      indicate: ['- pg_ida (Ida): [usa] nar_scatolina > pg_ida oppure [usa] nar_velluto > pg_ida'],
      battuteDisponibili: ['- nar_scatolina · narratore · indizio · a PC looks at the little box', '- nar_velluto · narratore · indizio · a PC touches the velvet', '- nar_impronte · narratore · indizio · a PC follows the footprints'].join('\n'),
      attesa: '- nar_neve · narratore · momento · the snow falls',
    },
  };

  it('stesso ingresso in italiano e in inglese, e uguale a quello letto dal testo italiano', () => {
    const en = turnoDaDati(dati);
    impostaLingua('it');
    const it_ = turnoDaDati(dati);
    const dalTesto = leggiTurno(compilaMessaggioTurno(dati));
    impostaLingua('en');
    expect(en).toEqual(it_);
    expect(en).toEqual(dalTesto);
    expect(en.azioni.map((a) => [a.id_pg, a.privata])).toEqual([['pg_ida', false], ['pg_livia', true]]);
    expect(en.indicate.get('pg_ida')).toEqual(['nar_scatolina', 'nar_velluto']);
    expect(en.attesa).toEqual(['nar_neve']);
  });

  it('in inglese: prompt e messaggio inglesi, annuncio in terza persona, riparazione dal campo', async () => {
    const viste: RichiestaModello[] = [];
    const m = {
      provider: 'openai',
      modello: 'm',
      descrizione: 'finto',
      capacita: { strutturato: false, preriscalda: false },
      async chiedi(r: RichiestaModello) {
        viste.push(r);
        return { testo: '{"risposte":[{"pg":"pg_ida","battuta":"nessuna"},{"pg":"pg_livia","battuta":"nar_impronte"}]}', modello: 'm', stopReason: 'end_turn', uso: { input_tokens: 1, output_tokens: 1 }, costo: { costo_usd: 0 }, id: null };
      },
    } as unknown as ModelloLinguaggio;
    const n = new NarratoreMinimo(m, { log: loggerMuto() });
    // Il testo del messaggio non serve: il lettore usa i dati.
    const e = await n.narra({ turno: 3, sistema: [], messaggio: '(ignored)', dati, signal: new AbortController().signal }, () => undefined);
    expect(e.testo).toBe('[narratore] Ida looks at the little box up close.\n[usa] nar_neve > pg_ida\n[usa] nar_impronte > pg_livia\n[invito] tutti\n');
    expect(viste[0]!.sistema[0]!.testo).toMatch(/^You are the reader of a D&D game in English/);
    expect(viste[0]!.messaggi[0]!.testo).toMatch(/^Actions of the turn:\n1\. Ida \(pg_ida\): I look at the little box up close\n {3}Candidates \(id: when\):/);
    expect(viste[0]!.messaggi[0]!.testo).toContain('Livia (pg_livia) [PRIVATE]: I follow the footprints');
    expect(viste[0]!.messaggi[0]!.testo).toContain('Answer ONLY with a JSON object');
    const r = await n.narra({ turno: 3, sistema: [], messaggio: '', dati: { ...dati, riparazione: true }, signal: new AbortController().signal }, () => undefined);
    expect(r.testo).toBe('[invito] tutti\n');
  });
});
