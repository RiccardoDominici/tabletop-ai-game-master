/**
 * HTTPS for the phones (trasporto/https.ts, docs/ascolto.md): one port answers both http and https; the phone address
 * becomes https, the certificate page stays on http; only the public root certificate is ever served; Socket.IO works
 * over both. The certificate is a throw-away self-signed one made by openssl (skipped without openssl).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { io as connetti } from 'socket.io-client';
import type { InfoServer, StatoTavolo } from '@tabletop-ai-gm/shared';
import { costruisciServer, type ServerTagm } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import { caricaCertificato, FILE_CA, FILE_CERTIFICATO, FILE_CHIAVE } from '../src/trasporto/https';

const conOpenssl = spawnSync('openssl', ['version']).status === 0;
const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-https-'));
const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');
const server: ServerTagm[] = [];

afterAll(async () => {
  for (const s of server) await s.chiudi().catch(() => undefined);
  fs.rmSync(cartella, { recursive: true, force: true });
});

function certificatoDiProva(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  const r = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(dir, FILE_CHIAVE), '-out', path.join(dir, FILE_CERTIFICATO), '-days', '2', '-subj', '/CN=prova', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost']);
  if (r.status !== 0) throw new Error(String(r.stderr));
  // Self-signed: the certificate is its own root.
  fs.copyFileSync(path.join(dir, FILE_CERTIFICATO), path.join(dir, FILE_CA));
}

function scarica(url: string, ca: Buffer): Promise<{ stato: number; tipo: string; corpo: string }> {
  return new Promise((ok, ko) => {
    https.get(url, { ca }, (r) => {
      let corpo = '';
      r.on('data', (d) => (corpo += String(d)));
      r.on('end', () => ok({ stato: r.statusCode ?? 0, tipo: String(r.headers['content-type'] ?? ''), corpo }));
    }).on('error', ko);
  });
}

describe.skipIf(!conOpenssl)('https for the phones', () => {
  it('answers http and https on the same port, serves only the public certificate, Socket.IO on both', async () => {
    const dir = path.join(cartella, 'https');
    certificatoDiProva(dir);
    const config = caricaConfig({
      PORT: '0',
      HOST: '127.0.0.1',
      TAGM_IP: '127.0.0.1',
      TAGM_LOG: path.join(cartella, 'log'),
      TAGM_CARTELLA_CAMPAGNA: MINI,
      TAGM_HTTPS: 'si',
      TAGM_CERTIFICATI: dir,
      TAGM_TTS: 'mock',
      TAGM_SESSIONI: 'off',
    } as NodeJS.ProcessEnv);
    const s = await costruisciServer(config, loggerMuto(), { narratore: new NarratoreFinto({ idPng: [], idPg: [] }), arbitro: null, trascrittori: [] });
    await s.avvia();
    server.push(s);
    const porta = (s.app.http.server.address() as { port: number }).port;
    const ca = fs.readFileSync(path.join(dir, FILE_CA));

    const info = (await (await fetch(`http://127.0.0.1:${porta}/api/info`)).json()) as InfoServer;
    expect(info).toMatchObject({ https: true, url_telefono: `https://127.0.0.1:${porta}/telefono`, url_certificato: `http://127.0.0.1:${porta}/certificato` });

    const salute = await scarica(`https://127.0.0.1:${porta}/api/salute`, ca);
    expect(salute.stato).toBe(200);
    expect(JSON.parse(salute.corpo)).toMatchObject({ ok: true });

    const crt = await (await fetch(`http://127.0.0.1:${porta}/api/certificato.crt`)).text();
    expect(crt).toBe(ca.toString('utf8'));
    expect(crt).not.toMatch(/PRIVATE KEY/);

    for (const [url, opzioni] of [[`http://127.0.0.1:${porta}`, {}], [`https://127.0.0.1:${porta}`, { ca }]] as const) {
      const c = connetti(url, { transports: ['websocket'], forceNew: true, reconnection: false, ...opzioni });
      const stato = await new Promise<StatoTavolo>((ok, ko) => {
        c.on('connect_error', ko);
        c.on('connect', () => c.emit('telefono:entra', ok));
      });
      expect(stato.pg.length).toBeGreaterThan(0);
      c.disconnect();
    }
  }, 20_000);

  it('never serves a root file that holds a private key', () => {
    const dir = path.join(cartella, 'chiave');
    certificatoDiProva(dir);
    fs.writeFileSync(path.join(dir, FILE_CA), fs.readFileSync(path.join(dir, FILE_CHIAVE)));
    expect(caricaCertificato(dir, loggerMuto())).toBeNull();
    expect(caricaCertificato(path.join(cartella, 'manca'), loggerMuto())).toBeNull();
  });
});
