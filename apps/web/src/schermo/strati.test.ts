import { describe, expect, it } from 'vitest';
import {
  aggiornaSfondo,
  immagineCorrente,
  SFONDO_INIZIALE,
  serveSfondoUmore,
  type EventoSfondo,
  type StatoSfondo,
} from './strati';

const applica = (stato: StatoSfondo, ...eventi: EventoSfondo[]) => eventi.reduce(aggiornaSfondo, stato);
const A = '/api/immagini/luogo_a.jpg';
const B = '/api/immagini/luogo_b.jpg';

describe('strati dello sfondo del luogo', () => {
  it('prima immagine: entra sopra lo sfondo d’atmosfera, che resta finché non è piena', () => {
    const s1 = applica(SFONDO_INIZIALE, { tipo: 'pronta', src: A });
    expect(s1.strati).toEqual([{ chiave: 1, src: A, stato: 'entra' }]);
    expect(immagineCorrente(s1)).toBe(A);
    expect(serveSfondoUmore(s1)).toBe(true);

    const s2 = applica(s1, { tipo: 'fine', chiave: 1 });
    expect(s2.strati).toEqual([{ chiave: 1, src: A, stato: 'piena' }]);
    expect(serveSfondoUmore(s2)).toBe(false);
    expect(s2.transizioni).toBe(1);
  });

  it('dissolvenza incrociata: due strati, poi resta solo il nuovo', () => {
    const piena = applica(SFONDO_INIZIALE, { tipo: 'pronta', src: A }, { tipo: 'fine', chiave: 1 });
    const incrocio = applica(piena, { tipo: 'pronta', src: B });
    expect(incrocio.strati.map((s) => [s.src, s.stato])).toEqual([
      [A, 'piena'],
      [B, 'entra'],
    ]);
    expect(immagineCorrente(incrocio)).toBe(B);
    // Durante l'incrocio l'immagine vecchia copre ancora tutto: niente sfondo d'atmosfera.
    expect(serveSfondoUmore(incrocio)).toBe(false);

    const fine = applica(incrocio, { tipo: 'fine', chiave: 2 });
    expect(fine.strati).toEqual([{ chiave: 2, src: B, stato: 'piena' }]);
    expect(fine.transizioni).toBe(2);
  });

  it('stessa immagine di nuovo: nessuno strato in più', () => {
    const s = applica(SFONDO_INIZIALE, { tipo: 'pronta', src: A });
    expect(applica(s, { tipo: 'pronta', src: A })).toBe(s);
  });

  it('immagine nulla o fallita: gli strati escono e torna lo sfondo d’atmosfera', () => {
    const piena = applica(SFONDO_INIZIALE, { tipo: 'pronta', src: A }, { tipo: 'fine', chiave: 1 });
    const esce = applica(piena, { tipo: 'nessuna' });
    expect(esce.strati).toEqual([{ chiave: 1, src: A, stato: 'esce' }]);
    expect(immagineCorrente(esce)).toBeNull();
    expect(serveSfondoUmore(esce)).toBe(true);

    const fine = applica(esce, { tipo: 'fine', chiave: 1 });
    expect(fine.strati).toEqual([]);
    expect(fine.transizioni).toBe(2);
    // Senza strati «nessuna» non cambia nulla.
    expect(applica(fine, { tipo: 'nessuna' })).toBe(fine);
  });

  it('dopo lo sfondo d’atmosfera un’immagine torna con una dissolvenza', () => {
    const vuoto = applica(
      SFONDO_INIZIALE,
      { tipo: 'pronta', src: A },
      { tipo: 'fine', chiave: 1 },
      { tipo: 'nessuna' },
      { tipo: 'fine', chiave: 1 },
    );
    const torna = applica(vuoto, { tipo: 'pronta', src: A });
    expect(torna.strati).toEqual([{ chiave: 2, src: A, stato: 'entra' }]);
  });

  it('cambi a raffica: al massimo tre strati, eventi di strati spariti ignorati', () => {
    let s = SFONDO_INIZIALE;
    for (const src of ['/1.jpg', '/2.jpg', '/3.jpg', '/4.jpg']) s = aggiornaSfondo(s, { tipo: 'pronta', src });
    expect(s.strati.map((x) => x.src)).toEqual(['/2.jpg', '/3.jpg', '/4.jpg']);
    expect(aggiornaSfondo(s, { tipo: 'fine', chiave: 1 })).toBe(s);
    // Finisce quello in mezzo: si tolgono quelli sotto, resta quello che sta ancora entrando sopra.
    const mezzo = aggiornaSfondo(s, { tipo: 'fine', chiave: 3 });
    expect(mezzo.strati.map((x) => [x.src, x.stato])).toEqual([
      ['/3.jpg', 'piena'],
      ['/4.jpg', 'entra'],
    ]);
  });
});
