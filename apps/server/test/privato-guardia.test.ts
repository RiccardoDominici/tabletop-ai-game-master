/**
 * Guardia delle azioni private (narrazione/privato.ts): il caso di Teo dalla partita sulla 4720. La
 * riga al tavolo che nomina Teo e riprende cassetta e lucchetto va al suo telefono, non si scarta;
 * l'invito a Teo, una riga su un altro PG e un'azione pubblica dello stesso PG restano al tavolo.
 * Poi lo stesso caso col server intero: trascrizione pubblica pulita, esito privato sul telefono.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { EsitoPrivato, StatoTavolo } from '@tabletop-ai-gm/shared';
import { destinatarioPrivato, guardiaPrivate, radici, rispostaPrivataPng } from '../src/narrazione/privato';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

const TEO = { id_pg: 'pg_teo', nomi: ['Teo'], testo: 'Mentre Bertoldo guarda Ida, apro di nascosto il lucchetto della cassetta del pedaggio' };
const NOMI = new Set(['teo', 'ida ferraro', 'ida', 'bertoldo', 'ruggero lo sgherro', 'ruggero']);

describe('guardia delle azioni private', () => {
  it('la riga che racconta lo scasso di Teo va al suo telefono', () => {
    const r = destinatarioPrivato('Teo, con le mani in tasca, si china verso la cassetta del pedaggio.', [TEO], NOMI);
    expect(r?.id_pg).toBe('pg_teo');
    expect(r?.comuni.sort()).toEqual(['casse', 'pedag']);
    expect(destinatarioPrivato('Mentre Bertoldo guarda Ida, Teo sfila le dita nel buio della cassetta e il lucchetto cede senza un rumore.', [TEO], NOMI)?.id_pg).toBe('pg_teo');
  });

  it('restano al tavolo: l’invito, una riga senza il nome, un’altra cosa, i nomi dei personaggi non contano', () => {
    expect(destinatarioPrivato('Teo, cosa fai adesso?', [TEO], NOMI)).toBeNull();
    expect(destinatarioPrivato('Il lucchetto della cassetta cede in silenzio.', [TEO], NOMI)).toBeNull();
    expect(destinatarioPrivato('Teo guarda Bertoldo e Ida.', [TEO], NOMI)).toBeNull();
    expect(radici('Bertoldo guarda Ida', new Set(['bertoldo', 'ida'])).has('berto')).toBe(false);
  });

  it('il resto del segmento spostato segue la prima frase; un PG con un’azione pubblica non si tocca', () => {
    const g = guardiaPrivate([{ id_pg: 'pg_teo', testo: TEO.testo, privata: true }], () => ['Teo'], NOMI)!;
    expect(g('Teo si china verso la cassetta del pedaggio.', 3)?.id_pg).toBe('pg_teo');
    expect(g('Il lucchetto cede in silenzio.', 3)?.id_pg).toBe('pg_teo');
    expect(g('Il vento soffia sul ponte.', 4)).toBeNull();
    expect(guardiaPrivate([{ id_pg: 'pg_teo', testo: TEO.testo, privata: true }, { id_pg: 'pg_teo', testo: 'Saluto', privata: false }], () => ['Teo'], NOMI)).toBeNull();
    expect(guardiaPrivate([{ id_pg: 'pg_ida', testo: 'Canto', privata: false }], () => ['Ida'], NOMI)).toBeNull();
  });
});

/*
 * Le risposte dei PNG a un'azione privata (e2e finale del 10 novembre): un PG chiedeva in privato a un
 * PNG la strada, un altro parlava in pubblico a un secondo PNG; la riga del narratore andava al
 * telefono, la risposta [png_…] si sentiva al tavolo. Stesso caso con i nomi della fixture.
 */
const NOMI_PNG = new Map([
  ['png_bertoldo', ['bertoldo', 'gabelliere', 'pedaggiere']],
  ['png_ruggero', ['ruggero lo sgherro', 'ruggero']],
]);
const CASO = [
  { id_pg: 'pg_teo', testo: 'Bertoldo, a parte, a bassa voce: «Dove passa la strada per il mulino, e chi sale di notte?»', privata: true },
  { id_pg: 'pg_ida', testo: 'Ruggero, dammi la chiave: ti riporto il ragazzo prima di mezzanotte.', privata: false },
  { id_pg: 'pg_corrado', testo: null },
];
const RISPOSTA = 'Il sentiero passa dietro la carbonaia. Di notte ci vanno i lupi, e io non ci vado più.';

describe('risposte dei PNG alle azioni private', () => {
  it('il caso della partita: la risposta del PNG a cui Teo parla in privato va al telefono di Teo', () => {
    expect(rispostaPrivataPng(RISPOSTA, 'png_bertoldo', CASO, NOMI_PNG)).toBe('pg_teo');
    // Il PNG a cui parla Ida in pubblico resta al tavolo.
    expect(rispostaPrivataPng('Non ti do niente, ragazza.', 'png_ruggero', CASO, NOMI_PNG)).toBeNull();
    // Anche per soprannome («il gabelliere»).
    const perAlias = [{ ...CASO[0]!, testo: 'Al gabelliere, sottovoce: chi sale di notte?' }, CASO[1]!];
    expect(rispostaPrivataPng(RISPOSTA, 'png_bertoldo', perAlias, NOMI_PNG)).toBe('pg_teo');
  });

  it('con un’azione pubblica rivolta allo stesso PNG decide ciò che la riga riprende', () => {
    const anchePubblica = [...CASO, { id_pg: 'pg_corrado', testo: 'Bertoldo, apri il cancello!', privata: false }];
    // La strada di notte è la domanda privata di Teo; il cancello è l'azione pubblica di Corrado.
    expect(rispostaPrivataPng(RISPOSTA, 'png_bertoldo', anchePubblica, NOMI_PNG)).toBe('pg_teo');
    expect(rispostaPrivataPng('Il cancello resta chiuso, signori.', 'png_bertoldo', anchePubblica, NOMI_PNG)).toBeNull();
    // Un’azione pubblica rinviata (combattimento a turni) non riceve risposta: non conta.
    const rinviata = [...CASO, { id_pg: 'pg_corrado', testo: 'Bertoldo, apri il cancello!', sospesa: true }];
    expect(rispostaPrivataPng(RISPOSTA, 'png_bertoldo', rinviata, NOMI_PNG)).toBe('pg_teo');
  });

  it('solo azioni private di un PG nel turno: ogni riga di PNG è la risposta a lui', () => {
    const soloTeo = [{ id_pg: 'pg_teo', testo: 'Mi avvicino al banco e chiedo piano chi è passato stanotte.', privata: true }, { id_pg: 'pg_ida', testo: null }];
    expect(rispostaPrivataPng('Nessuno, ve lo giuro.', 'png_ruggero', soloTeo, NOMI_PNG)).toBe('pg_teo');
    // Con un’azione pubblica nel turno, una riga di un PNG non nominato resta al tavolo.
    expect(rispostaPrivataPng('Nessuno, ve lo giuro.', 'png_ruggero', [...soloTeo, { id_pg: 'pg_ida', testo: 'Guardo il fiume.', privata: false }], NOMI_PNG)).toBeNull();
    // Il narratore non è un PNG.
    expect(rispostaPrivataPng('Nessuno risponde.', 'narratore', soloTeo, NOMI_PNG)).toBeNull();
  });

  it('due PG parlano in privato allo stesso PNG: va a chi ha più parole in comune con la risposta', () => {
    const due = [
      { id_pg: 'pg_teo', testo: 'Bertoldo, sottovoce: dove passa la strada per il mulino?', privata: true },
      { id_pg: 'pg_ida', testo: 'Bertoldo, in segreto: quanto costa il pedaggio?', privata: true },
    ];
    expect(rispostaPrivataPng('Il pedaggio costa due soldi, a testa.', 'png_bertoldo', due, NOMI_PNG)).toBe('pg_ida');
    expect(rispostaPrivataPng('La strada del mulino passa dietro la carbonaia.', 'png_bertoldo', due, NOMI_PNG)).toBe('pg_teo');
  });

  it('nella guardia del turno: la riga del narratore e la risposta del PNG vanno da Teo, il resto resta', () => {
    const g = guardiaPrivate(CASO, (id) => (id === 'pg_teo' ? ['Teo'] : id === 'pg_ida' ? ['Ida Ferraro', 'Ida'] : ['Corrado Lanzi', 'Corrado']), NOMI, NOMI_PNG)!;
    expect(g('Teo si avvicina a Bertoldo, e a bassa voce gli chiede dove passa la strada per il mulino e chi sale di notte.', 0, 'narratore')?.id_pg).toBe('pg_teo');
    expect(g(RISPOSTA, 1, 'png_bertoldo')?.id_pg).toBe('pg_teo');
    expect(g('Bertoldo sputa per terra e guarda il bosco.', 2, 'narratore')).toBeNull();
    expect(g('Ida tende la mano a Ruggero.', 3, 'narratore')).toBeNull();
    expect(g('Non ti do niente, ragazza.', 4, 'png_ruggero')).toBeNull();
    // Senza i nomi dei PNG (chiamata vecchia) la risposta resta al tavolo come prima.
    expect(guardiaPrivate(CASO, () => ['Teo'], NOMI)!(RISPOSTA, 1, 'png_bertoldo')).toBeNull();
  });
});

/*
 * La fuga rimasta dopo 16fe790 (e2e finale, pressione-B2 T6): una domanda privata e un'azione pubblica
 * allo stesso PNG nello stesso turno. La riga del narratore sulla domanda andava al telefono, la risposta
 * del PNG si sentiva al tavolo perché anche l'azione pubblica era rivolta a lui. Stesso caso, nomi della fixture.
 */
describe('una domanda privata e un’azione pubblica allo stesso PNG', () => {
  const STESSO = [
    { id_pg: 'pg_teo', testo: 'Bertoldo, qualcuno al ponte parla con lo sgherro?', privata: true },
    { id_pg: 'pg_ida', testo: 'Bertoldo, dammi la chiave: ti riporto il ragazzo prima di mezzanotte, parola di soldato.', privata: false },
  ];
  const nomiDi = (id: string) => (id === 'pg_teo' ? ['Teo'] : ['Ida Ferraro', 'Ida']);

  it('la risposta dopo la riga spostata va al telefono di chi ha chiesto in privato', () => {
    const g = guardiaPrivate(STESSO, nomiDi, NOMI, NOMI_PNG)!;
    expect(g('Teo chiede a Bertoldo se qualcuno al ponte parla con lo sgherro.', 0, 'narratore')?.id_pg).toBe('pg_teo');
    expect(g('Qui si parla con tutti. Con lo sgherro no.', 1, 'png_bertoldo')?.id_pg).toBe('pg_teo');
    expect(g('Ida tende la mano verso il laccio al collo di Bertoldo.', 2, 'narratore')).toBeNull();
    expect(g('Tu prometti in fretta, soldata.', 3, 'png_bertoldo')).toBeNull();
  });

  it('senza la riga prima: decide quale azione la riga riprende di più', () => {
    expect(rispostaPrivataPng('Qui si parla con tutti, ma con lo sgherro no.', 'png_bertoldo', STESSO, NOMI_PNG, NOMI)).toBe('pg_teo');
    expect(rispostaPrivataPng('È fredda, la chiave. Riportami il ragazzo.', 'png_bertoldo', STESSO, NOMI_PNG, NOMI)).toBeNull();
    // Niente in comune con nessuna delle due: resta al tavolo (nel dubbio la sente chi ha parlato in pubblico).
    expect(rispostaPrivataPng('Hm.', 'png_bertoldo', STESSO, NOMI_PNG, NOMI)).toBeNull();
  });
});

describe('guardia delle azioni private col server intero', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('la riga del selettore che racconta lo scasso va al telefono di Teo, non nella trascrizione', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    const copione = (turno: number): string =>
      turno === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : '[narratore] Teo, con le mani in tasca, si china verso la cassetta del pedaggio. Il lucchetto cede in silenzio.\n[narratore] Il vento porta odore di fango.\n[invito] tutti';
    const { url } = await prova.avvia(cartella, copione);
    const schermo = await prova.proiettore(url);
    const teo = await prova.telefono(url, 'pg_teo');
    const privati: EsitoPrivato[][] = [];
    teo.on('privato:esiti', (e) => privati.push(e));
    const s1 = await inizia(schermo, teo);
    await agisci(teo, 'pg_teo', TEO.testo, s1.versione_scena, true);
    const dopo: StatoTavolo = await attendi(teo, (x) => x.fase === 'finestra' && x.turno === 2);
    const pubblico = dopo.trascrizione.map((v) => v.testo).join(' ');
    expect(pubblico).toContain('odore di fango');
    expect(pubblico).not.toMatch(/cassetta|lucchetto/);
    expect(privati.at(-1)?.map((e) => e.testo).join(' ')).toMatch(/cassetta del pedaggio\. Il lucchetto cede in silenzio\./);
  });

  it('la risposta del PNG all’azione privata di Teo va al suo telefono; quella all’azione pubblica di Ida resta al tavolo', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    const copione = (turno: number): string =>
      turno === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : [
            '[narratore] Teo si avvicina a Bertoldo, e a bassa voce gli chiede dove passa la strada per il mulino e chi sale di notte.',
            `[png_bertoldo] ${RISPOSTA}`,
            '[narratore] Ida tende la mano a Ruggero.',
            '[png_ruggero] Non ti do niente, ragazza.',
            '[invito] tutti',
          ].join('\n');
    const { url } = await prova.avvia(cartella, copione);
    const schermo = await prova.proiettore(url);
    const teo = await prova.telefono(url, 'pg_teo');
    const ida = await prova.telefono(url, 'pg_ida');
    const privati: EsitoPrivato[][] = [];
    teo.on('privato:esiti', (e) => privati.push(e));
    const s1 = await inizia(schermo, teo);
    const dopo = attendi(teo, (x) => x.fase === 'finestra' && x.turno === 2);
    await agisci(teo, 'pg_teo', CASO[0]!.testo!, s1.versione_scena, true);
    await agisci(ida, 'pg_ida', CASO[1]!.testo!, s1.versione_scena);
    const pubblico = (await dopo).trascrizione.map((v) => v.testo).join(' ');
    expect(pubblico).toContain('Non ti do niente');
    expect(pubblico).not.toMatch(/carbonaia|mulino/);
    expect(privati.at(-1)?.map((e) => e.testo).join(' ')).toContain('carbonaia');
  });
});
