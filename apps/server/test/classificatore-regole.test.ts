/**
 * Arbitro delle prove a regole (prove/classificatore-regole.ts): il default del profilo tutto locale
 * e la riserva quando il modello manca o è lento (prova sulla 4730, 10 novembre).
 */
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { impostaLingua } from '../src/lingua';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaRegole } from '../src/regole/caricatore';
import { classificaARegole, type IngressoClassificatore } from '../src/prove/classificatore-regole';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');

describe('arbitro a regole, SRD', () => {
  const c = caricaCampagna(path.join(FIX, 'prove'));
  const ing: IngressoClassificatore = {
    campagna: c,
    regole: null,
    armi: (id) => (id === 'pg_corrado' ? ['balestra_leggera', 'spada_lunga'] : []),
    haScheda: () => true,
    proveScena: [{ id: 'p_guado', quando: 'un PG attraversa il fiume a guado, aggrappato alla corda' }, { id: 'p_cassetta', quando: 'un PG apre il lucchetto della cassetta del pedaggio', parole: ['cassetta'] }],
    altre: [{ id: 'x1', autore: 'pg_corrado' }],
  };
  const cl = (autore: string, testo: string) => classificaARegole({ id: 'a1', autore, testo }, ing);

  it('attacco (verbo o arma della scheda), prova della scena, aiuto, abilità per parole chiave, niente tiro altrimenti', () => {
    expect(cl('pg_corrado', 'Colpisco Ruggero con la spada')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' });
    expect(cl('pg_corrado', 'Punto la balestra contro lo sgherro')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' });
    expect(cl('pg_corrado', 'Attraverso il fiume aggrappato alla corda')).toMatchObject({ tipo: 'prova', prova_scena: 'p_guado' });
    expect(cl('pg_teo', 'Do un’occhiata alla cassetta, piano')).toMatchObject({ tipo: 'prova', prova_scena: 'p_cassetta' });
    expect(cl('pg_teo', 'Aiuto Corrado a reggersi')).toMatchObject({ tipo: 'aiuto', aiuta: 'x1' });
    expect(cl('pg_ida', 'Convinco Bertoldo a farci passare')).toMatchObject({ tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_bertoldo' });
    expect(cl('pg_ida', 'Minaccio il gabelliere')).toMatchObject({ tipo: 'prova', abilita: 'intimidire', bersaglio: 'png_bertoldo' });
    expect(cl('pg_teo', 'Sgattaiolo dietro Ruggero senza farmi vedere')).toMatchObject({ tipo: 'contrapposta', abilita: 'furtivita', bersaglio: 'png_ruggero', abilita_bersaglio: 'percezione' });
    expect(cl('pg_ida', 'Cerco di ricordare cosa si racconta del barone')).toMatchObject({ tipo: 'prova', abilita: 'storia' });
    expect(cl('pg_ida', 'Saluto tutti e mi siedo')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('pg_ida', 'Chiedo a Bertoldo da quanto tempo c’è lo sgherro')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('pg_ida', 'Convinco me stessa a restare calma')).toMatchObject({ tipo: 'nessuna' });
  });
});

describe('arbitro a regole, set del manuale', () => {
  const pbta = caricaCampagna(path.join(FIX, 'pbta'));
  const regole = caricaRegole(path.join(FIX, 'pbta'));
  const ing: IngressoClassificatore = { campagna: pbta, regole, armi: () => [], haScheda: () => true, proveScena: [], altre: [] };
  const cl = (testo: string) => classificaARegole({ id: 'a1', autore: 'pg_ida', testo }, ing);
  it('la mossa dalle parole dei passi (per:), da parole_chiave, dal quando; niente tiro senza parole', () => {
    expect(regole.estratti.find((e) => e.id === 'convincere')?.per).toBe('convincere');
    expect(cl('Convinco Bertoldo a lasciarci passare')).toMatchObject({ tipo: 'prova', mossa: 'convincere', bersaglio: 'png_bertoldo' });
    expect(cl('Osservo il ponte per capire chi comanda')).toMatchObject({ tipo: 'prova', mossa: 'leggere_la_situazione' });
    expect(cl('Saluto Bertoldo')).toMatchObject({ tipo: 'nessuna' });
  });
});

/*
 * Carte assurde della e2e finale del 10 novembre (profilo A, docs/e2e-finale.md, D1): 14 carte su 35. Le
 * stesse frasi, con le fixture: parole intere (non radici di cinque lettere), parole generiche, il parlato
 * che non è un gesto, domande gratis, l'abilità d'attacco senza bersaglio, e nel dubbio niente.
 */
describe('arbitro a regole: niente carte assurde (e2e finale)', () => {
  const c = caricaCampagna(path.join(FIX, 'prove'));
  const base = caricaRegole(path.join(FIX, 'pbta'));
  const regole = {
    ...base,
    estratti: [],
    sistema: {
      ...base.sistema,
      mosse: [],
      abilita: ['forzare', 'cercare', 'scalare', 'mischia', 'silenzio', 'scassinare'].map((id) => ({ id, nome: id, caratteristica: null })),
      sociale: { caratteristica: 'carisma', abilita: null, nota: null },
      paroleChiave: {
        forzare: ['forzo', 'spallata', 'sfondo'],
        cercare: ['cerco', 'frugo', 'passaggio'],
        scalare: ['scalo', 'scalare', 'arrampico'],
        mischia: ['spada', 'colpisco'],
        silenzio: ['silenzio', 'piano'],
        scassinare: ['lucchetto'],
        carisma: ['convinco', 'prometto'],
      },
    },
  } as typeof base;
  const ing: IngressoClassificatore = {
    campagna: c,
    regole,
    armi: (id) => (id === 'pg_corrado' ? ['spada_lunga'] : []),
    haScheda: () => true,
    proveScena: [
      { id: 'p_pedaggio', quando: 'un PG chiede a Bertoldo di abbassare il pedaggio', parole: ['pedaggio', 'sconto'], sociale: true },
      { id: 'p_cantina', quando: 'un PG sale dalla cantina senza farsi sentire', parole: ['piano', 'quatto'] },
    ],
    altre: [],
    attacchiPer: new Set(['mischia']),
  };
  const cl = (testo: string, autore = 'pg_corrado') => classificaARegole({ id: 'a1', autore, testo }, ing);

  it('parole intere e generiche: «spalla» non è «spallata», «scala» non è «scalare», «passaggio» da solo non dice niente', () => {
    expect(cl('Anch’io gli stringo la spalla e resto lì')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('Do una spallata alla porta')).toMatchObject({ tipo: 'prova', abilita: 'forzare' });
    expect(cl('Vado giù per la scala della cantina')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('Mi arrampico sul muro del cortile')).toMatchObject({ tipo: 'prova', abilita: 'scalare' });
    expect(cl('Scendo dietro di lui, scudo avanti, nel passaggio stretto')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('Cerco un passaggio dietro i rovi')).toMatchObject({ tipo: 'prova', abilita: 'cercare' });
  });

  it('il parlato non è un gesto: «dico agli altri: …», le virgolette', () => {
    expect(cl('Dico agli altri: sotto ogni torre c’è un passaggio, lo cerco io')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('Gli stringo la spalla e chiedo: «Chi ti ha mandato a forzare la porta?»')).toMatchObject({ tipo: 'nessuna' });
  });

  it('l’abilità d’attacco è un attacco: con un bersaglio con la scheda si colpisce, senza niente tiro; l’arma in mano non attacca', () => {
    expect(cl('Colpisco Ruggero con la spada')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' });
    expect(cl('Dietro di lei, spada in mano, guardo i rami sopra la testa')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('Scudo contro scudo, colpisco quello in fondo')).toMatchObject({ tipo: 'nessuna' });
    // La parola dell'arma (`spada` → mischia) col PNG nominato ma senza un gesto d'attacco: niente.
    expect(cl('Guardo Ruggero, la spada lunga in mano')).toMatchObject({ tipo: 'nessuna' });
  });

  it('prova sociale: rivolgersi al PNG, non solo nominarlo; chiedere è gratis', () => {
    expect(cl('Bertoldo, abbassa il pedaggio: ti pago domani')).toMatchObject({ tipo: 'prova', prova_scena: 'p_pedaggio', bersaglio: 'png_bertoldo' });
    expect(cl('Guardo il pedaggio che Bertoldo conta: sono monete vecchie?')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('Bertoldo, quanto costa il pedaggio?')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('Chiedo a Bertoldo quanto costa il pedaggio.')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('Convinco Bertoldo a farci passare')).toMatchObject({ tipo: 'prova', caratteristica: 'carisma', bersaglio: 'png_bertoldo' });
  });

  it('una parola sola della prova non basta; due id a pari merito: nel dubbio niente', () => {
    expect(cl('Dico piano a Ida che è ora di andare')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('Salgo dalla cantina piano piano, senza farmi sentire')).toMatchObject({ tipo: 'prova', prova_scena: 'p_cantina' });
    expect(cl('Frugo il lucchetto')).toMatchObject({ tipo: 'nessuna' });
  });
});

describe('arbitro a regole in inglese: parlato, domande, arma in mano', () => {
  const c = caricaCampagna(path.join(FIX, 'en-mini'));
  const ing: IngressoClassificatore = { campagna: c, regole: null, armi: (id) => (id === 'pg_mara' ? ['shortsword'] : []), haScheda: () => true, proveScena: [], altre: [] };
  const cl = (testo: string) => classificaARegole({ id: 'a1', autore: 'pg_mara', testo }, ing);
  beforeAll(() => impostaLingua('en'));
  afterAll(() => impostaLingua('it'));

  it('speech is not a deed, asking is free, a sword in hand is not an attack', () => {
    expect(cl('I search the cellar for the missing key')).toMatchObject({ tipo: 'prova', abilita: 'indagare' });
    expect(cl('I tell the others: we should search the cellar')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('Hale, how much for a room?')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('I look at Guard Lia, shortsword in hand')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('I strike Guard Lia with my shortsword')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_guard', arma: 'shortsword' });
  });
});
