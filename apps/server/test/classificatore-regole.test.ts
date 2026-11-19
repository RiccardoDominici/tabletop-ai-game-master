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

  // Round 5 (profile A): «Lo colpisco ancora», «Carico quello al centro» got «nessun tiro» in a fight.
  it('in a fight, the PC\'s own attack with no target named goes to its last target; a claim is not an attack', () => {
    const lotta: IngressoClassificatore = { ...ing, bersaglioImplicito: (pg) => (pg === 'pg_corrado' ? 'png_ruggero' : null) };
    const cf = (testo: string) => classificaARegole({ id: 'a1', autore: 'pg_corrado', testo }, lotta);
    expect(cf('Lo colpisco ancora, poi mi sposto.')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero' });
    expect(cf('Carico quello al centro, spada in pugno!')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero' });
    expect(cf('Il goblin mi colpisce alla spalla, sento sangue.')).not.toMatchObject({ tipo: 'attacco' });
    // Round 6: a go-on with no verb, alone or after a weapon of the sheet.
    expect(cf('Ancora!')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero' });
    expect(cf('Balestra ancora, poi mi riparo.')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero' });
    expect(cf('Ancora non capisco cosa vuole.')).not.toMatchObject({ tipo: 'attacco' });
    expect(cf('Fiume ancora.')).not.toMatchObject({ tipo: 'attacco' });
    // Round 7, CA T11: the same go-on with an enemy named in a later clause («Pugnale ancora, il goblin si gira verso di
    // me») went down the named-target path, which wanted an attack verb: no roll. «sgherro» is Ruggero's alias.
    expect(cf('Spada ancora, lo sgherro si gira verso di me.')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' });
    // A target named in the go-on's own clause is where the blow goes; a bare go-on keeps the last target, whoever is
    // named later (Bertoldo has a sheet too: never hit for being named).
    const contro: IngressoClassificatore = { ...ing, bersaglioImplicito: () => 'png_bertoldo' };
    const cc = (testo: string) => classificaARegole({ id: 'a1', autore: 'pg_corrado', testo }, contro);
    expect(cc('Ancora contro lo sgherro!')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero' });
    expect(cc('Di nuovo su Ruggero, con la spada')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero' });
    expect(cc('Ancora una volta contro Ruggero')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero' });
    expect(cf('Ancora! Bertoldo, scappa.')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero' });
    expect(cf('Tiro ancora a Ruggero.')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero' });
    // Not a go-on: other words in its clause, or a target that is not one.
    expect(cf('Ancora non capisco Ruggero.')).not.toMatchObject({ tipo: 'attacco' });
    // A negated attack verb is no attack (final round, attempt 6, CM T17 and CA T14 rolled one at the last target).
    expect(cf('Non lo colpisco ancora, aspetto la risposta.')).not.toMatchObject({ tipo: 'attacco' });
    expect(cc('Non colpisco Ruggero: aspetto che parli.')).not.toMatchObject({ tipo: 'attacco' });
    expect(cf('Non scappo: lo colpisco ancora.')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero' });
    expect(cf('Ancora contro il fiume.')).not.toMatchObject({ tipo: 'attacco' });
    expect(cf('Ancora contro Ruggero e Bertoldo.')).not.toMatchObject({ tipo: 'attacco' });
    // Outside a fight (no implicit target) nothing changes: the first-person words do not make a named NPC a target.
    expect(cl('pg_corrado', 'Lo colpisco ancora, poi mi sposto.')).not.toMatchObject({ tipo: 'attacco' });
    expect(cl('pg_corrado', 'Tiro ancora la corda verso Ruggero')).not.toMatchObject({ tipo: 'attacco' });
    expect(cl('pg_corrado', 'Ancora contro Ruggero!')).not.toMatchObject({ tipo: 'attacco' });
  });

  // 17 November, live on ponte-lanterne: «Resto vicino al camino» rolled Perception against a check about a rope
  // «appesa vicino al camino»: two shared nouns, no look. A scene check needs its intent: its action word or its parole.
  it('a scene check needs the action word of its quando (or one of its parole), not shared nouns alone', () => {
    const conCorda: IngressoClassificatore = { ...ing, proveScena: [...ing.proveScena, { id: 'p_corda', quando: 'un PG guarda la corda a nodi appesa vicino al camino' }, { id: 'p_tetto', quando: 'un PG sale sul tetto del casotto' }] };
    const cc = (testo: string) => classificaARegole({ id: 'a1', autore: 'pg_teo', testo }, conCorda);
    expect(cc('Resto vicino al camino')).not.toMatchObject({ prova_scena: 'p_corda' });
    expect(cc('Guardo la corda appesa vicino al camino')).toMatchObject({ tipo: 'prova', prova_scena: 'p_corda' });
    // An irregular verb still matches by its root («salgo» for «sale»); the others of this file are unchanged.
    expect(cc('Salgo sul tetto del casotto')).toMatchObject({ tipo: 'prova', prova_scena: 'p_tetto' });
    expect(cc('Do un’occhiata alla cassetta, piano')).toMatchObject({ tipo: 'prova', prova_scena: 'p_cassetta' });
  });

  /*
   * DC choice on twenty actions (docs/prove-verifica.md §5, 15 November): four ordinary checks found no keyword and
   * rolled nothing with the rules arbiter.
   */
  it('listening, deciphering, pulling a rope, appraising: the checks the keyword table missed', () => {
    expect(cl('pg_corrado', "Tendo l'orecchio per sentire se qualcuno arriva dalla strada")).toMatchObject({ tipo: 'prova', abilita: 'percezione' });
    expect(cl('pg_ida', 'Decifro le rune antiche incise sul pilone del ponte')).toMatchObject({ tipo: 'prova', abilita: 'storia' });
    expect(cl('pg_corrado', 'Tiro la cima per riportare a riva la barca alla deriva')).toMatchObject({ tipo: 'prova', abilita: 'atletica' });
    expect(cl('pg_teo', "Stimo quanto vale l'anello d'oro che ho trovato")).toMatchObject({ tipo: 'prova', abilita: 'indagare' });
    // A crossbow bolt is still an attack, not Athletics.
    expect(cl('pg_corrado', 'Tiro un dardo a Ruggero')).toMatchObject({ tipo: 'attacco' });
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
    const lotta: IngressoClassificatore = { ...ing, bersaglioImplicito: () => 'png_guard' };
    expect(classificaARegole({ id: 'a1', autore: 'pg_mara', testo: 'I hit him again' }, lotta)).toMatchObject({ tipo: 'attacco', bersaglio: 'png_guard' });
    expect(classificaARegole({ id: 'a1', autore: 'pg_mara', testo: 'The guard hits me hard' }, lotta)).not.toMatchObject({ tipo: 'attacco' });
    expect(classificaARegole({ id: 'a1', autore: 'pg_mara', testo: "I don't hit him yet, I wait for the answer" }, lotta)).not.toMatchObject({ tipo: 'attacco' });
    // The go-on (`attacco_ancora`, `attacco_verso` of the English pack), with an enemy named in its clause or later.
    const contro: IngressoClassificatore = { ...ing, bersaglioImplicito: () => 'png_keeper' };
    expect(classificaARegole({ id: 'a1', autore: 'pg_mara', testo: 'Shortsword again, Guard Lia turns to me' }, lotta)).toMatchObject({ tipo: 'attacco', bersaglio: 'png_guard', arma: 'shortsword' });
    expect(classificaARegole({ id: 'a1', autore: 'pg_mara', testo: 'Again at Guard Lia!' }, contro)).toMatchObject({ tipo: 'attacco', bersaglio: 'png_guard' });
    expect(classificaARegole({ id: 'a1', autore: 'pg_mara', testo: 'Again I do not understand Guard Lia' }, contro)).not.toMatchObject({ tipo: 'attacco' });
  });
});
