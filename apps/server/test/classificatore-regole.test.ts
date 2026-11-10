/**
 * Riserva a regole dell'arbitro delle prove (prove/classificatore-regole.ts): senza modello, o con un
 * modello locale troppo lento alla chiusura (prova sulla 4730, 10 novembre), il dado si tira lo stesso.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaRegole } from '../src/regole/caricatore';
import { classificaARegole, type IngressoClassificatore } from '../src/prove/classificatore-regole';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');

describe('classificatore a regole', () => {
  const c = caricaCampagna(path.join(FIX, 'prove'));
  const srd: IngressoClassificatore = {
    campagna: c,
    sistema: null,
    armi: (id) => (id === 'pg_corrado' ? ['balestra_leggera', 'spada_lunga'] : []),
    haScheda: () => true,
    proveScena: [{ id: 'p_guado', quando: 'un PG attraversa il fiume a guado, aggrappato alla corda' }],
  };
  const cl = (autore: string, testo: string) => classificaARegole({ id: 'a1', autore, testo }, srd);

  it('SRD: attacco con l’arma nominata, prova della scena, prova sociale verso un PNG, niente tiro altrimenti', () => {
    expect(cl('pg_corrado', 'Colpisco Ruggero con la spada')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' });
    expect(cl('pg_corrado', 'Tiro un dardo allo sgherro')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero' });
    expect(cl('pg_corrado', 'Attraverso il fiume aggrappato alla corda')).toMatchObject({ tipo: 'prova', prova_scena: 'p_guado' });
    expect(cl('pg_ida', 'Convinco Bertoldo a farci passare')).toMatchObject({ tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_bertoldo' });
    expect(cl('pg_ida', 'Minaccio il gabelliere')).toMatchObject({ tipo: 'prova', abilita: 'intimidire', bersaglio: 'png_bertoldo' });
    expect(cl('pg_teo', 'Sgattaiolo dietro il casotto senza farmi vedere')).toMatchObject({ tipo: 'prova', abilita: 'furtivita' });
    expect(cl('pg_ida', 'Saluto tutti e mi siedo')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('pg_ida', 'Convinco me stessa a restare calma')).toMatchObject({ tipo: 'nessuna' });
  });

  it('set a 2d6: la mossa del set il cui «quando» somiglia di più', () => {
    const pbta = caricaCampagna(path.join(FIX, 'pbta'));
    const s = caricaRegole(path.join(FIX, 'pbta')).sistema;
    const ing: IngressoClassificatore = { campagna: pbta, sistema: s, armi: () => [], haScheda: () => true, proveScena: [] };
    expect(classificaARegole({ id: 'a1', autore: 'pg_ida', testo: 'Convinco Bertoldo a lasciarci passare' }, ing)).toMatchObject({ tipo: 'prova', mossa: 'convincere', bersaglio: 'png_bertoldo' });
  });
});
