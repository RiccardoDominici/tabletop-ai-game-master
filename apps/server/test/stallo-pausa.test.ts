/**
 * Stallo senza nessuno che gioca (bug della notte del 2 novembre: una mossa ogni ~70 s per ore, con
 * frasi come «nessuno dei PG ha ancora scelto»):
 * - dopo due mosse contro lo stallo di fila il tavolo va in pausa da solo, e riparte alla prima azione;
 * - senza telefoni collegati lo stallo non scatta;
 * - le frasi fuori dalla finzione si scartano prima della voce, e il Motore rimedia (mossa morbida
 *   pronta, o in modalità B il segno dovuto / un riempitivo).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type { Esito, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoTavolo } from '@cantastorie/shared';
import { costruisciServer } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import { fuoriDallaFinzione } from '../src/narrazione/finzione';
import { TESTO_PAUSA_AUTOMATICA } from '../src/scena/regia';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');
const daChiudere: Array<() => Promise<void>> = [];
afterAll(async () => {
  for (const f of daChiudere) await f();
});
const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
function attendiStato(c: Client, cond: (s: StatoTavolo) => boolean, ms = 8000): Promise<StatoTavolo> {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('stato atteso non arrivato')), ms);
    const f = (s: StatoTavolo): void => {
      if (cond(s)) {
        clearTimeout(t);
        c.off('stato', f);
        ok(s);
      }
    };
    c.on('stato', f);
  });
}

/** Lo stallo della notte: frasi sul tavolo invece che sul mondo. */
const STALLO_FUORI_FINZIONE = "[narratore] Il silenzio sul ponte pesa, e nessuno dei PG ha ancora scelto.\n[png_oste] Nessuno parla? Allora il ponte decide per voi.\n[invito] tutti";

async function avvia(modo: 'improvvisa' | 'repertorio') {
  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-stallo2-'));
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    CANTASTORIE_LOG: cartella,
    CANTASTORIE_CARTELLA_CAMPAGNA: MINI,
    CANTASTORIE_PROMPT_NARRATORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_PROMPT_SELETTORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_CACHE_AUDIO: path.join(cartella, 'cache'),
    CANTASTORIE_MODO: modo,
    CANTASTORIE_TTS: 'mock',
    CANTASTORIE_MOCK_SCALA: '0.02',
    CANTASTORIE_MARGINE_AUDIO_MS: '50',
    CANTASTORIE_STALLO_MS: '300',
    CANTASTORIE_SESSIONI: 'off',
  } as NodeJS.ProcessEnv);
  const messaggi: string[] = [];
  const narratore = new NarratoreFinto({
    idPng: [],
    idPg: [],
    primoTokenMs: 5,
    msPerPezzo: 1,
    copione: (turno) => (turno <= 2 ? STALLO_FUORI_FINZIONE : '[narratore] La pioggia batte. Anna, cosa fai?\n[invito] tutti'),
  });
  const narra = narratore.narra.bind(narratore);
  narratore.narra = (r, cb) => {
    messaggi.push(r.messaggio);
    return narra(r, cb);
  };
  const server = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null });
  await server.avvia();
  const url = `http://127.0.0.1:${(server.app.http.server.address() as { port: number }).port}`;
  const client: Client[] = [];
  daChiudere.push(async () => {
    for (const c of client) c.disconnect();
    await server.chiudi();
    fs.rmSync(cartella, { recursive: true, force: true });
  });
  const nuovo = (): Client => {
    const c: Client = connetti(url, { transports: ['websocket'], forceNew: true });
    client.push(c);
    return c;
  };
  const schermo = nuovo();
  await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
  schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
  return { server, nuovo, schermo, messaggi };
}

describe('guardia della finzione', () => {
  it('le frasi della notte sono fuori dalla finzione, quelle di gioco no', () => {
    expect(fuoriDallaFinzione('La Lenta lambisce il parapetto, e nessuno dei PG ha ancora parlato.')).toBe('PG');
    expect(fuoriDallaFinzione('Il silenzio sul ponte resta, e nessuno dei pg ha ancora scelto.')).not.toBeNull();
    expect(fuoriDallaFinzione('Nessuno parla? Allora il ponte decide per voi.')).not.toBeNull();
    expect(fuoriDallaFinzione('Nessuno di voi ha toccato la catena.')).toBe('nessuno di voi');
    expect(fuoriDallaFinzione('I giocatori aspettano.')).toBe('giocatori');
    expect(fuoriDallaFinzione('Non avete ancora deciso chi passa.')).toBe('non avete ancora…');
    for (const buona of ['Tullio stringe la chiave della manovella.', 'Il fiume supera il parapetto in un punto.', 'Dalla cappella il canto si interrompe.', 'Ottavia vi guarda: chi di voi ha fame?']) {
      expect(fuoriDallaFinzione(buona)).toBeNull();
    }
  });
});

describe('stallo con nessuno che gioca', () => {
  it('modalità A: frasi fuori dalla finzione scartate, mossa morbida al loro posto; due stalli → pausa; un’azione → si riparte', async () => {
    const { nuovo, schermo, messaggi } = await avvia('improvvisa');
    const tel = nuovo();
    await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
    await emetti<Esito>((cb) => tel.emit('telefono:scegli_pg', { id_pg: 'pg_anna' }, cb));
    const avvisi: string[] = [];
    tel.on('avviso', (a) => avvisi.push(a.testo));
    await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
    const pausa = await attendiStato(tel, (s) => s.fase === 'pausa', 10_000);
    expect(pausa).toMatchObject({ pausa_automatica: true, turno: 2 });
    const testi = pausa.trascrizione.map((v) => v.testo).join('\n');
    expect(testi).not.toMatch(/\bPG\b|decide per voi|nessuno dei/);
    expect(testi).toContain('Un ceppo crolla nel camino.'); // mossa morbida pronta, al posto delle frasi scartate
    expect(pausa.trascrizione.at(-1)).toMatchObject({ tipo: 'sistema', testo: TESTO_PAUSA_AUTOMATICA });
    expect(avvisi).toContain(TESTO_PAUSA_AUTOMATICA);
    // In pausa niente terza mossa, anche aspettando più dello stallo.
    await new Promise((r) => setTimeout(r, 900));
    expect(messaggi).toHaveLength(2);
    // Un'azione dal telefono: il tavolo riparte e l'azione entra nella finestra.
    const ripresa = attendiStato(tel, (s) => s.fase === 'finestra' && s.turno === 3);
    expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Bussiamo alla porta.', versione_vista: pausa.versione_scena }, cb))).toEqual({ ok: true });
    const r = await ripresa;
    expect(r.pausa_automatica).toBe(false);
    expect(r.finestra.azioni.find((a) => a.id_pg === 'pg_anna')).toMatchObject({ scritta: true });
    const narrata = attendiStato(tel, (s) => s.fase === 'finestra' && s.turno === 4);
    await emetti<Esito>((cb) => tel.emit('azione:pronto', { id_pg: 'pg_anna', pronto: true }, cb));
    await narrata;
    expect(messaggi.at(-1)).toContain('Bussiamo alla porta.');
  }, 20_000);

  it('senza telefoni collegati lo stallo non scatta', async () => {
    const { schermo, messaggi } = await avvia('improvvisa');
    const finestra = attendiStato(schermo, (s) => s.fase === 'finestra' && s.turno === 1);
    await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
    await finestra;
    await new Promise((r) => setTimeout(r, 1200)); // quattro volte il tempo dello stallo
    expect(messaggi).toHaveLength(0);
  }, 20_000);

  it('modalità B: la frase fuori dalla finzione si scarta anche dal selettore, e il Motore rimedia', async () => {
    const { nuovo, schermo } = await avvia('repertorio');
    const tel = nuovo();
    await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
    await emetti<Esito>((cb) => tel.emit('telefono:scegli_pg', { id_pg: 'pg_anna' }, cb));
    await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
    const dopo = await attendiStato(tel, (s) => s.fase === 'pausa', 10_000);
    const testi = dopo.trascrizione.map((v) => v.testo).join('\n');
    expect(testi).not.toMatch(/\bPG\b|decide per voi/);
    // Turno 1: niente segno dovuto né riempitivi nella mini → mossa morbida; turno 2: il segno dovuto.
    expect(testi).toContain('Un ceppo crolla nel camino.');
    expect(testi).toContain('Un tuono lontano'); // nar_tuono, il segno dovuto
  }, 20_000);
});
