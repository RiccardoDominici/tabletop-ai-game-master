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
  it('un rilascio uscito per un’azione che non gli è pertinente è una fuga, non una rivelazione (B2)', () => {
    // La battuta di rilascio nar_cantina esce per «guardo in giro», che non ne ha i temi: la botola è rivelata
    // fuori contesto, quindi le sue righe contano come fughe. Per un'azione pertinente la stessa battuta è legittima.
    const fuoriContesto = (id: string, azione: string) => id === 'nar_cantina' && azione.includes('guardo');
    const uscita = [{ tipo: 'usa', id: 'nar_cantina', per: 'pg_x', righe: [{ etichetta: 'narratore', testo: 'Sopra di te, una botola.' }] }];
    const sbagliata = misuraFughe([turno(1, ['guardo in giro'], uscita)], parole, null, fuoriContesto);
    expect(sbagliata).toMatchObject([{ turno: 1, origine: 'prescritta', battuta: 'nar_cantina', parola: 'botola' }]);
    const giusta = misuraFughe([turno(1, ['scendo'], uscita)], parole, null, fuoriContesto);
    expect(giusta).toEqual([]);
  });
});
