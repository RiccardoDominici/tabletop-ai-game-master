import { describe, expect, it } from 'vitest';
import { misuraFughe } from '../src/esperimenti/fughe';
import { regexDaPython } from '../src/repertorio/segreti';

const parole = [{ parola: 'botola', sorgente: 'botol', regex: regexDaPython('botol'), pubblica_dopo: ['nar_cantina'], fatti: [] }];
const turno = (n: number, azioni: string[], uscita: unknown[]) => ({ tipo: 'turno', turno: n, azioni: azioni.map((testo) => ({ id_pg: 'pg_x', testo })), uscita });

describe('misuraFughe', () => {
  it('fuga se la parola esce prima della battuta che la rende pubblica', () => {
    const f = misuraFughe([turno(1, ['guardo in giro'], [{ tipo: 'improvvisata', etichetta: 'narratore', testo: 'C’è una botola.' }])], parole, null);
    expect(f).toMatchObject([{ turno: 1, origine: 'improvvisata', parola: 'botola' }]);
  });
  it('nessuna fuga dopo la battuta, né se l’ha scritta un giocatore', () => {
    const dopoBattuta = misuraFughe(
      [turno(1, ['scendo'], [{ tipo: 'usa', id: 'nar_cantina', righe: [{ etichetta: 'narratore', testo: 'Sopra di te, una botola.' }] }, { tipo: 'improvvisata', etichetta: 'narratore', testo: 'La botola cigola.' }])],
      parole,
      null,
    );
    expect(dopoBattuta).toEqual([]);
    const giocatore = misuraFughe([turno(1, ['cerco una BOTOLA'], [{ tipo: 'improvvisata', etichetta: 'narratore', testo: 'La botola è lì.' }])], parole, null);
    expect(giocatore).toEqual([]);
  });
});
