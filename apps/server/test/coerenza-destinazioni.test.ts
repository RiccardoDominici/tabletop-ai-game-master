/**
 * «Go» to a place the campaign does not have (coerenza/destinazioni.ts, docs/coerenza.md «After round 6»): round 6's
 * off-the-rails players «went» to a mill and a ford the campaign never had, and those words reset the stall's counter
 * every turn. Invented words and fixture.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { destinazioniIgnote, luoghiMenzionatiIgnoti, senzaDestinazioniIgnote, versoUnLuogoIgnoto } from '../src/coerenza/destinazioni';
import { impegna } from '../src/mondo/stallo';
import { impostaLingua } from '../src/lingua';
import fs from 'node:fs';
import path from 'node:path';
import { cartelle, leggiJson, scriviJson, type RichiestaSceneggiatore } from '../src/sceneggiatore/protocollo';
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

describe('going «there», toward a place nobody knows (round 7, FB T8)', () => {
  const noti = new Set(['torre', 'bosco', 'sentiero', 'collina']);
  it('a mentioned place nobody knows, then «vado lì»; not a known one, not a question', () => {
    expect(luoghiMenzionatiIgnoti("Oreste dice che sulla collina c'è una grotta con il fuoco acceso.", noti)).toEqual(['grotta']);
    expect(versoUnLuogoIgnoto("Oreste dice che sulla collina c'è una grotta con il fuoco acceso. Vado lì, adesso.", noti)).toBe(true);
    expect(versoUnLuogoIgnoto('Sulla collina si vede la torre. Vado lì, adesso.', noti)).toBe(false);
    expect(versoUnLuogoIgnoto("C'è una grotta? Vado lì.", noti)).toBe(false);
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

  it('words to someone the campaign does not have commit to nothing: «Madre Carla, il carretto lo sequestro» is a stall', async () => {
    prova = new Prova();
    const { url } = await prova.avvia(prova.campagna('mondo'), () => '[narratore] Anna, la ruota cigola.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    for (const testo of ['Mi siedo e aspetto.', 'Ci penso su.', 'Madre Carla, il carretto lo sequestro, e prendo le redini.']) s = await turno(tel, 'pg_anna', s, testo);
    expect(prova.turni().filter((r) => r['stallo']).map((r) => r['turno'])).toEqual([3]);
  });

  it('the scriptwriter hears that the invented place does not exist («Cosa è vero adesso»)', async () => {
    prova = new Prova();
    const radice = path.join(prova.cartella, 'sceneggiatore');
    scriviJson(cartelle(radice).vivo, { ts: Date.now(), pid: 0, modello: 'prova' });
    const { url } = await prova.avvia(prova.campagna('mondo'), () => '[narratore] Anna, la ruota cigola.\n[invito] tutti', {}, { sceneggiatore: { radice, tettoMs: 30_000 } });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const s = await inizia(schermo, tel);
    await turno(tel, 'pg_anna', s, 'Vado alla grotta delle fate.');
    const richieste = fs.readdirSync(cartelle(radice).richieste).map((f) => leggiJson<RichiestaSceneggiatore>(path.join(cartelle(radice).richieste, f))!);
    expect(richieste.some((r) => (r.vero_adesso ?? []).some((x) => /nessun luogo come grotta/.test(x)))).toBe(true);
  });
});
