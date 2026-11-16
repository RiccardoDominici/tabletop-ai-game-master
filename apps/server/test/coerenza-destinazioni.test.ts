/**
 * «Go» to a place the campaign does not have (coerenza/destinazioni.ts, docs/coerenza.md «After round 6»): round 6's
 * off-the-rails players «went» to a mill and a ford the campaign never had, and those words reset the stall's counter
 * every turn. Invented words and fixture.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { destinazioniIgnote, senzaDestinazioniIgnote } from '../src/coerenza/destinazioni';
import { impegna } from '../src/mondo/stallo';
import { impostaLingua } from '../src/lingua';
import { inizia, Prova, turno } from './aiuti/partita';

beforeAll(() => impostaLingua('it'));

describe('a movement to a destination nobody knows', () => {
  const noti = new Set(['torre', 'bosco', 'sentiero', 'carbonaia']);
  it('found when none of its words is known; not for a known place, a question, or no destination', () => {
    expect(destinazioniIgnote('Anch\'io vado al mulino.', noti)).toEqual(['mulino']);
    expect(destinazioniIgnote('Andiamo al guado, mi hanno detto che c\'è un pastore.', noti)).toEqual(['guado']);
    expect(destinazioniIgnote('Andiamo alla torre, adesso.', noti)).toEqual([]);
    expect(destinazioniIgnote('Corro avanti sul sentiero.', noti)).toEqual([]);
    expect(destinazioniIgnote('Andiamo al mulino?', noti)).toEqual([]);
    expect(destinazioniIgnote('Vado lì, adesso.', noti)).toEqual([]);
  });

  it('what is left may still commit: «prendo la chiave e vado al mulino» commits, «vado al mulino» does not', () => {
    expect(impegna(senzaDestinazioniIgnote('Vado al mulino.', noti))).toBe(false);
    expect(impegna(senzaDestinazioniIgnote('Prendo la chiave e vado al mulino.', noti))).toBe(true);
    expect(impegna(senzaDestinazioniIgnote('Andiamo alla torre.', noti))).toBe(true);
  });
});

describe('with the whole server, mode B', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the Engine says the real roads, and going nowhere known does not stop the stall', async () => {
    prova = new Prova();
    const { url } = await prova.avvia(prova.campagna('mondo'), () => '[narratore] Anna, la ruota cigola.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    for (const testo of ['Vado alla grotta delle fate.', 'Vado alla grotta delle fate, di nuovo.', 'Andiamo al lago incantato.']) s = await turno(tel, 'pg_anna', s, testo);
    const detto = s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo);
    expect(detto.some((t) => /^Da qui (le strade che conoscete portano soltanto verso|non parte nessuna strada)/.test(t))).toBe(true);
    // T1 and T2 brought nothing new and committed to nothing: T3 is a stall.
    expect(prova.turni().filter((r) => r['stallo']).map((r) => r['turno'])).toEqual([3]);
  });
});
