/**
 * Immagini del proiettore: manifest (solo voci con il file), URL di luoghi e ritratti, rotta
 * statica sicura, cambio di luogo con immagine o senza (sfondo d'atmosfera).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@cantastorie/shared';
import { costruisciServer, type ServerCantastorie } from '../src/avvio';
import { CatalogoImmagini } from '../src/campagna/immagini';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';

const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'immagini');

describe('CatalogoImmagini', () => {
  it('usa solo le voci del manifest con il file; URL e percorsi sicuri', () => {
    const c = new CatalogoImmagini(FIXTURE);
    expect(c.numero).toBe(5); // la voce senza file è ignorata
    expect(c.luogo('scena_forno_vecchio')).toBe('/api/immagini/luogo_scena_forno_vecchio.jpg');
    expect(c.luogo('n_mulino_valsecca')).toBeNull();
    expect(c.ritratto('png_ottavia')).toBe('/api/immagini/ritratto_png_ottavia.jpg');
    expect(c.ritratto('png_mancante')).toBeNull();
    expect(c.percorso('../manifest.json')).toBeNull();
    expect(c.percorso('manifest.json')).toBeNull();
    expect(c.percorso('ritratto_png_ottavia.jpg')).toBe(path.join(FIXTURE, 'ritratto_png_ottavia.jpg'));
  });

  it('senza manifest: nessuna immagine, nessun errore', () => {
    expect(new CatalogoImmagini(os.tmpdir()).numero).toBe(0);
  });
});

describe('rotte delle immagini e cambio di luogo', () => {
  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-img-'));
  let server: ServerCantastorie;
  let url: string;
  beforeAll(async () => {
    const config = caricaConfig({
      PORT: '0',
      HOST: '127.0.0.1',
      CANTASTORIE_LOG: cartella,
      CANTASTORIE_CARTELLA_CAMPAGNA: path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini'),
      CANTASTORIE_PROMPT_NARRATORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
      CANTASTORIE_TTS: 'mock',
      CANTASTORIE_IMMAGINI: FIXTURE,
    } as NodeJS.ProcessEnv);
    server = await costruisciServer(config, loggerMuto(), { narratore: new NarratoreFinto({ idPng: [], idPg: [] }), arbitro: null });
    await server.avvia();
    url = `http://127.0.0.1:${(server.app.http.server.address() as { port: number }).port}`;
  });
  afterAll(async () => {
    await server.chiudi();
    fs.rmSync(cartella, { recursive: true, force: true });
  });

  it('serve i file del manifest come immagini, e nient’altro', async () => {
    const r = await fetch(`${url}/api/immagini/luogo_n_piazza.jpg`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('image/jpeg');
    expect((await r.arrayBuffer()).byteLength).toBe(fs.statSync(path.join(FIXTURE, 'luogo_n_piazza.jpg')).size);
    expect((await fetch(`${url}/api/immagini/manifest.json`)).status).toBe(404);
    expect((await fetch(`${url}/api/immagini/..%2Fmanifest.json`)).status).toBe(404);
  });

  it('lo stato porta luogo, immagine (o null), ritratti e prossime; il cambio di luogo la aggiorna', async () => {
    const stato = async () => (await (await fetch(`${url}/api/salute`)).json()) as Record<string, unknown>;
    expect(await stato()).toMatchObject({ immagini: 5 });
    const leggi = (): StatoTavolo => server.regia.stato();
    expect(leggi().scena).toMatchObject({ luogo: 'scena_locanda', immagine: null, ritratti: {} });
    const post = (luogo: string) => fetch(`${url}/api/scena/luogo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ luogo }) });
    expect(await (await post('n_piazza')).json()).toEqual({ ok: true });
    expect(leggi().scena).toMatchObject({ luogo: 'n_piazza', immagine: '/api/immagini/luogo_n_piazza.jpg' });
    expect((await post('../etc')).status).toBe(400);
  });
});
