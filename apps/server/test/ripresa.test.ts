/**
 * Persistenza col server intero: si gioca (modalità repertorio, selettore a copione, voce finta),
 * il processo «muore» a metà di una narrazione, un server nuovo sullo stesso registro riprende la
 * sessione. Trascrizione, orologi, battute usate e indizi, note di regia, luogo: come prima. Il
 * telefono ritrova il suo PG col token del dispositivo; l'azione del turno interrotto torna al
 * giocatore; il proiettore fa ripartire il gioco senza rileggere l'apertura; il turno si rigioca.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type { AzionePrivata, ComandoMaster, Esito, EsitoEntrataMaster, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoMaster, StatoTavolo } from '@cantastorie/shared';
import { costruisciServer, type ServerCantastorie } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import { MOTIVO_RIPRESA } from '../src/scena/regia';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');
const TOKEN = 'token_di_prova_ripresa';
const DISPOSITIVO = 'tel-anna-0123456789';

const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-ripresa-'));
const client: Client[] = [];
const server: ServerCantastorie[] = [];
const messaggi: string[] = [];
let lento = false;

afterAll(async () => {
  for (const c of client) c.disconnect();
  for (const s of server) await s.chiudi().catch(() => undefined);
  fs.rmSync(cartella, { recursive: true, force: true });
});

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
function attendi<T>(c: Client, ev: 'stato' | 'master:stato', cond: (s: T) => boolean, ms = 8000): Promise<T> {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error(`${ev} atteso non arrivato`)), ms);
    const f = (s: T): void => {
      if (cond(s)) {
        clearTimeout(t);
        c.off(ev, f as never);
        ok(s);
      }
    };
    c.on(ev, f as never);
  });
}

async function avvia(): Promise<{ s: ServerCantastorie; url: string }> {
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    CANTASTORIE_LOG: cartella, // stesso registro (cartella/sessioni.sqlite) per i due server
    CANTASTORIE_CARTELLA_CAMPAGNA: MINI,
    CANTASTORIE_MODO: 'repertorio',
    CANTASTORIE_PROMPT_SELETTORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_CACHE_AUDIO: path.join(cartella, 'cache'),
    CANTASTORIE_TTS: 'mock',
    CANTASTORIE_MOCK_SCALA: '0.02',
    CANTASTORIE_MARGINE_AUDIO_MS: '50',
    CANTASTORIE_STALLO_MS: '0',
    CANTASTORIE_PRERISCALDA: '0',
    CANTASTORIE_MASTER_TOKEN: TOKEN,
  } as NodeJS.ProcessEnv);
  const narratore = new NarratoreFinto({
    idPng: [],
    idPg: [],
    primoTokenMs: 5,
    msPerPezzo: 1,
    copione: (turno) =>
      turno === 1 ? '[usa] nar_brocca > pg_anna\n[narratore] Anna, cosa fai?\n[invito] tutti' : `[narratore] Turno ${turno}: piove ancora. Anna?\n[invito] tutti`,
  });
  const narra = narratore.narra.bind(narratore);
  narratore.narra = async (r, cb) => {
    messaggi.push(r.messaggio);
    if (lento) await new Promise((x) => setTimeout(x, 3000)); // il processo muore qui dentro
    return narra(r, cb);
  };
  const s = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null });
  await s.avvia();
  server.push(s);
  return { s, url: `http://127.0.0.1:${(s.app.http.server.address() as { port: number }).port}` };
}

function nuovo(url: string): Client {
  const c: Client = connetti(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  client.push(c);
  return c;
}

/** Proiettore che avvisa la fine dell'audio, come quello vero. */
async function proiettore(url: string): Promise<Client> {
  const p = nuovo(url);
  await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => p.emit('schermo:osserva', cb));
  p.on('audio:fine_turno', (f) => p.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
  return p;
}

async function agisci(tel: Client, testo: string, versione: number): Promise<void> {
  expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo, versione_vista: versione }, cb))).toEqual({ ok: true });
  expect(await emetti<Esito>((cb) => tel.emit('azione:pronto', { id_pg: 'pg_anna', pronto: true }, cb))).toEqual({ ok: true });
}

describe('sessione ripresa dopo un riavvio a metà partita', () => {
  it('stato uguale, PG ritrovato, azione interrotta restituita, turno rigiocato', async () => {
    // --- Primo server: due turni giocati, poi muore a metà del terzo.
    const a = await avvia();
    const master = nuovo(a.url);
    await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
    const comanda = (c: ComandoMaster) => emetti<Esito>((cb) => master.emit('master:comando', c, cb));
    const schermo = await proiettore(a.url);
    const tel = nuovo(a.url);
    await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
    expect(await emetti<{ id_pg: string | null }>((cb) => tel.emit('telefono:dispositivo', { dispositivo: DISPOSITIVO }, cb))).toEqual({ id_pg: null });
    expect(await emetti<Esito>((cb) => tel.emit('telefono:scegli_pg', { id_pg: 'pg_anna', dispositivo: DISPOSITIVO }, cb))).toEqual({ ok: true });

    const finestra1 = attendi<StatoTavolo>(tel, 'stato', (s) => s.fase === 'finestra' && s.turno === 1);
    await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
    await finestra1;
    expect(await comanda({ tipo: 'nota', testo: 'Frasi corte.', turni: 5 })).toEqual({ ok: true });
    const finestra2 = attendi<StatoTavolo>(tel, 'stato', (s) => s.fase === 'finestra' && s.turno === 2);
    await agisci(tel, 'Guardo dietro il banco.', 1);
    await finestra2;
    const finestra3 = attendi<StatoTavolo>(tel, 'stato', (s) => s.fase === 'finestra' && s.turno === 3);
    await agisci(tel, 'Bevo il vino.', 2);
    await finestra3;
    expect(await comanda({ tipo: 'orologio', id: 'o_temporale', passo: 1 })).toEqual({ ok: true });
    const prima = await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
    if (!prima.ok) throw new Error('master');
    expect(prima.stato.repertorio!.usate.map((b) => b.id)).toContain('nar_brocca');
    expect(prima.stato.sessione).toMatchObject({ id: expect.any(String), ripresa: null, in_attesa_di_ripresa: null });

    // Turno 3: l'azione parte, il narratore è lento, e il processo «muore».
    lento = true;
    const narrazione = attendi<StatoTavolo>(tel, 'stato', (s) => s.fase === 'narrazione' && s.turno === 3);
    await agisci(tel, 'Apro la porta della cantina.', 3);
    await narrazione;
    a.s.sessioni.memoria!.sospendi(); // da qui il primo processo non scrive più niente (è «morto»)
    for (const c of [master, schermo, tel]) c.disconnect();
    lento = false;

    // --- Secondo server sullo stesso registro.
    const b = await avvia();
    const master2 = nuovo(b.url);
    const entrata = await emetti<EsitoEntrataMaster>((cb) => master2.emit('master:entra', { token: TOKEN }, cb));
    if (!entrata.ok) throw new Error('master2');
    const s2 = entrata.stato;
    // Prima del proiettore: in attesa, con tutto lo stato già al suo posto.
    expect(s2.tavolo.fase).toBe('attesa');
    expect(s2.sessione).toMatchObject({ id: prima.stato.sessione!.id, in_attesa_di_ripresa: { turno: 3 } });
    expect(s2.tavolo.trascrizione.map((v) => v.testo)).toEqual(prima.stato.tavolo.trascrizione.map((v) => v.testo));
    expect(s2.orologi).toEqual(prima.stato.orologi);
    expect(s2.note).toEqual(prima.stato.note);
    expect(s2.repertorio!.usate).toEqual(prima.stato.repertorio!.usate);
    expect(s2.repertorio!.indizi_rivelati).toEqual(prima.stato.repertorio!.indizi_rivelati);
    expect(s2.tavolo.scena.luogo).toBe(prima.stato.tavolo.scena.luogo);

    // Il telefono rientra: il server riconosce il dispositivo e gli ridà Anna; l'azione interrotta torna.
    const tel2 = nuovo(b.url);
    const mie: Array<AzionePrivata | null> = [];
    tel2.on('azione:mia', (x) => mie.push(x));
    await emetti<StatoTavolo>((cb) => tel2.emit('telefono:entra', cb));
    expect(await emetti<{ id_pg: string | null }>((cb) => tel2.emit('telefono:dispositivo', { dispositivo: DISPOSITIVO }, cb))).toEqual({ id_pg: 'pg_anna' });
    expect(await emetti<Esito>((cb) => tel2.emit('telefono:scegli_pg', { id_pg: 'pg_anna', dispositivo: DISPOSITIVO }, cb))).toEqual({ ok: true });
    expect(mie.at(-1)).toMatchObject({ stato: 'superata', motivo: MOTIVO_RIPRESA, testo: 'Apro la porta della cantina.' });

    // Il proiettore fa ripartire: niente apertura riletta, si rigioca il turno 3.
    const frasi: string[] = [];
    const schermo2 = await proiettore(b.url);
    schermo2.on('audio:frase', (f) => frasi.push(f.testo));
    const ripresa = attendi<StatoMaster>(master2, 'master:stato', (s) => s.tavolo.fase === 'finestra');
    await emetti<Esito>((cb) => schermo2.emit('schermo:inizia', cb));
    const r = await ripresa;
    expect(r.tavolo.turno).toBe(3);
    expect(r.sessione).toMatchObject({ ripresa: { turno: 3 }, in_attesa_di_ripresa: null });
    expect(r.tavolo.trascrizione.at(-1)).toMatchObject({ tipo: 'sistema', testo: 'La sessione riprende da dove si era fermata.' });

    const finestra4 = attendi<StatoTavolo>(tel2, 'stato', (s) => s.fase === 'finestra' && s.turno === 4);
    await agisci(tel2, 'Apro la porta della cantina.', r.tavolo.versione_scena);
    const s4 = await finestra4;
    expect(frasi.join(' ')).not.toContain('La locanda è piena di fumo'); // apertura non riletta
    expect(frasi.join(' ')).toContain('Turno 3');
    const ids = s4.trascrizione.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length); // nessun id ripetuto
    expect(messaggi.at(-1)).toContain('Frasi corte.'); // la nota di regia c'è ancora
  }, 30_000);
});
