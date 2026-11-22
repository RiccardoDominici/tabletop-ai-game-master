/**
 * R6's panel commands with the whole server (master/comandi.ts → scena/regia.ts → prove/motore.ts): the scene's light
 * (`luce`), an encounter rolled now (`incontro`), the Game Master's morale adjustment (`morale`). The browser run of the
 * live check found them refused as unknown commands: the command list did not name them. Invented cunicolo fixture, copied
 * to a temporary folder.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type { ComandoMaster, Esito, EsitoEntrataMaster, EventiClientVersoServer, EventiServerVersoClient, StatoMaster } from '@tabletop-ai-gm/shared';
import { ServerConCiclo } from '../src/ciclo-server';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import type { ServerTagm } from '../src/avvio';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'campagne', 'cunicolo');
const TOKEN = 'token_di_prova_esplorazione';
const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-esplorazione-'));
const client: Client[] = [];
const cicli: ServerConCiclo[] = [];

afterAll(async () => {
  for (const c of client) c.disconnect();
  for (const s of cicli) await s.chiudi().catch(() => undefined);
  fs.rmSync(radice, { recursive: true, force: true });
});

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));

async function avvia(): Promise<ServerConCiclo> {
  const campagna = path.join(radice, 'cunicolo');
  fs.cpSync(FIXTURE, campagna, { recursive: true });
  const log = path.join(radice, 'log');
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    TAGM_LOG: log,
    TAGM_CARTELLA_CAMPAGNA: campagna,
    TAGM_MODO: 'improvvisa',
    TAGM_CACHE_AUDIO: path.join(log, 'cache'),
    TAGM_TTS: 'mock',
    TAGM_ASSESTAMENTO_MS: '20',
    TAGM_MOCK_SCALA: '0.02',
    TAGM_MARGINE_AUDIO_MS: '50',
    TAGM_PRERISCALDA: '0',
    TAGM_MASTER_TOKEN: TOKEN,
    TAGM_TIRI_GIOCATORI: 'manuale',
    TAGM_SEME_DADI: '0123456789abcdef',
  } as NodeJS.ProcessEnv);
  const narratore = new NarratoreFinto({ idPng: [], idPg: [], primoTokenMs: 5, msPerPezzo: 1, copione: () => '[narratore] Gocce nel buio.\n[invito] tutti' });
  const c = await ServerConCiclo.avvia(config, loggerMuto(), { narratore, arbitro: null, arbitroProve: null });
  cicli.push(c);
  return c;
}

const url = (s: ServerTagm): string => `http://127.0.0.1:${(s.app.http.server.address() as { port: number }).port}`;

async function master(u: string): Promise<{ comanda: (c: ComandoMaster) => Promise<Esito>; stato: () => Promise<StatoMaster> }> {
  const c: Client = connetti(u, { transports: ['websocket'], forceNew: true, reconnection: false });
  client.push(c);
  const entra = () => emetti<EsitoEntrataMaster>((cb) => c.emit('master:entra', { token: TOKEN }, cb));
  if (!(await entra()).ok) throw new Error('master non entrato');
  return {
    comanda: (x) => emetti<Esito>((cb) => c.emit('master:comando', x, cb)),
    stato: async () => {
      const r = await entra();
      if (!r.ok) throw new Error('master');
      return r.stato;
    },
  };
}

describe('the panel’s exploration commands over the socket', () => {
  it('the scene’s light, an encounter on a table, a morale adjustment: accepted and seen in the panel’s state', async () => {
    const s = await avvia();
    const m = await master(url(s.corrente));
    // The inn is lit; the Game Master darkens it.
    expect(await m.comanda({ tipo: 'luce', livello: 'buio' })).toEqual({ ok: true });
    expect((await m.stato()).combattimento!.tempo!.luce).toMatchObject({ livello: 'buio', forzata: true, testo: expect.stringMatching(/Dora vede al buio/) });
    // An encounter on the woods' table: the creatures join the scene, the panel says who.
    expect(await m.comanda({ tipo: 'incontro', tabella: 'bosco' })).toEqual({ ok: true });
    const st = await m.stato();
    expect(st.combattimento!.tempo!.incontri!.ultimo!.testo).toMatch(/Mostri erranti \(tiro del master\)/);
    const png = st.combattimento!.morale!.png[0]!;
    // The Game Master's adjustment within ±2; beyond it, refused.
    expect(await m.comanda({ tipo: 'morale', id: png.id, valore: 1 })).toEqual({ ok: true });
    expect((await m.stato()).combattimento!.morale!.png[0]).toMatchObject({ id: png.id, aggiustamento: 1, ora: png.base + 1 });
    expect(await m.comanda({ tipo: 'morale', id: png.id, valore: 3 })).toMatchObject({ ok: false });
    // An unknown table is refused.
    expect(await m.comanda({ tipo: 'incontro', tabella: 'palude' })).toMatchObject({ ok: false });
  });
});
