/**
 * Audio dal pannello del master: lo stato porta musica, umori ed effetti del catalogo; il comando
 * «umore» cambia la musica della scena (null = auto), «effetto» arriva al proiettore che ha
 * l'audio acceso, e solo a lui. Server vero su porta casuale, fixture test/fixtures/audio.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type { ComandoMaster, Esito, EsitoEntrataMaster, EventiClientVersoServer, EventiServerVersoClient, StatoMaster } from '@cantastorie/shared';
import { costruisciServer, type ServerCantastorie } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const TOKEN = 'token_di_prova_audio_master_1';
const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'audio');

let cartella: string;
let server: ServerCantastorie;
let url: string;
const client: Client[] = [];

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
function nuovoClient(): Client {
  const c: Client = connetti(url, { transports: ['websocket'], forceNew: true });
  client.push(c);
  return c;
}
const comanda = (m: Client, c: ComandoMaster): Promise<Esito> => emetti<Esito>((cb) => m.emit('master:comando', c, cb));
async function entraMaster(): Promise<{ master: Client; stato: StatoMaster }> {
  const master = nuovoClient();
  const e = await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
  if (!e.ok) throw new Error(e.errore);
  return { master, stato: e.stato };
}

beforeAll(async () => {
  cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-audio-master-'));
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    CANTASTORIE_LOG: cartella,
    CANTASTORIE_CARTELLA_CAMPAGNA: path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini'),
    CANTASTORIE_PROMPT_NARRATORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_TTS: 'mock',
    CANTASTORIE_MOCK_SCALA: '0.02',
    CANTASTORIE_STALLO_MS: '0',
    CANTASTORIE_MASTER_TOKEN: TOKEN,
    CANTASTORIE_AUDIO: FIXTURE,
  } as NodeJS.ProcessEnv);
  server = await costruisciServer(config, loggerMuto(), {
    narratore: new NarratoreFinto({ idPng: [], idPg: [], primoTokenMs: 5, msPerPezzo: 1, copione: () => '[narratore] La pioggia batte.\n[invito] tutti' }),
    arbitro: null,
  });
  await server.avvia();
  url = `http://127.0.0.1:${(server.app.http.server.address() as { port: number }).port}`;
});

afterAll(async () => {
  for (const c of client) c.disconnect();
  await server.chiudi();
  fs.rmSync(cartella, { recursive: true, force: true });
});

describe('audio dal pannello del master', () => {
  it('lo stato del pannello porta musica, umori ed effetti del catalogo', async () => {
    const { stato } = await entraMaster();
    expect(stato.audio).toEqual({ musica: null, umore: null, umori: ['esplorazione_tesa', 'tensione'], effetti: ['sfx_campana'], ambienti: [] });
  });

  it('umore: cambia la musica della scena e torna in automatico; un umore senza brano si rifiuta', async () => {
    const { master } = await entraMaster();
    expect(await comanda(master, { tipo: 'umore', umore: 'tensione' })).toEqual({ ok: true });
    expect(server.regia.stato().scena.audio?.umore).toBe('umore_tensione');
    const dopo = await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
    expect(dopo.ok && dopo.stato.audio?.umore).toBe('tensione');
    expect(dopo.ok && dopo.stato.eventi.at(-1)).toMatchObject({ comando: 'umore', ok: true, dettagli: 'umore della musica auto → tensione' });
    expect(await comanda(master, { tipo: 'umore', umore: 'battaglia' })).toMatchObject({ ok: false });
    expect(await comanda(master, { tipo: 'umore', umore: '../x' })).toEqual({ ok: false, errore: 'Umore non valido.' });
    expect(await comanda(master, { tipo: 'umore', umore: null })).toEqual({ ok: true });
    expect(server.regia.stato().scena.audio?.umore).toBeNull();
  });

  it('effetto: rifiutato senza proiettore o se sconosciuto; col proiettore arriva solo a lui', async () => {
    const { master } = await entraMaster();
    expect(await comanda(master, { tipo: 'effetto', id: 'sfx_campana' })).toEqual({ ok: false, errore: 'Nessun proiettore con l’audio acceso.' });
    const schermo = nuovoClient();
    const telefono = nuovoClient();
    await emetti<unknown>((cb) => telefono.emit('telefono:entra', cb));
    expect(await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb))).toEqual({ ok: true });
    const ricevuti: string[] = [];
    const alTelefono: string[] = [];
    schermo.on('audio:effetto', (e) => ricevuti.push(e.id));
    telefono.on('audio:effetto', (e) => alTelefono.push(e.id));
    expect(await comanda(master, { tipo: 'effetto', id: 'sfx_porta' })).toEqual({ ok: false, errore: 'Effetto sconosciuto.' });
    expect(await comanda(master, { tipo: 'effetto', id: 'sfx_campana' })).toEqual({ ok: true });
    await new Promise((r) => setTimeout(r, 100));
    expect(ricevuti).toEqual(['sfx_campana']);
    expect(alTelefono).toEqual([]);
  });
});
