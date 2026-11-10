/**
 * Arbitro delle prove a regole (prove/classificatore-regole.ts): il default del profilo tutto locale
 * e la riserva quando il modello manca o è lento (prova sulla 4730, 10 novembre).
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
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
