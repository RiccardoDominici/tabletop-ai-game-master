/**
 * Dictation through the whole server (docs/ascolto.md): the phone posts a recording to /api/dettato (only for the PC it
 * chose on its connection), ffmpeg converts it, a fake transcriber stands in for Whisper, the campaign names come back
 * corrected; the action sent with its transcript teaches a name, which the next dictation corrects and prompts, and
 * which is written to the session registry. Needs ffmpeg (a project requirement): skipped without it.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type { Esito, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoTavolo } from '@tabletop-ai-gm/shared';
import { costruisciServer, type ServerTagm } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import type { RichiestaTrascrizione, Trascrittore } from '../src/dettato/trascrittori';
import type { RispostaDettato } from '../src/dettato/servizio';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');
const conFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-dettato-'));
const client: Client[] = [];
const server: ServerTagm[] = [];

afterAll(async () => {
  for (const c of client) c.disconnect();
  for (const s of server) await s.chiudi().catch(() => undefined);
  fs.rmSync(cartella, { recursive: true, force: true });
});

/** A fake Whisper: answers the queued texts and keeps the requests (prompt, language). */
class TrascrittoreFinto implements Trascrittore {
  readonly provider = 'finto';
  readonly modello = 'copione';
  readonly richieste: RichiestaTrascrizione[] = [];
  constructor(private readonly risposte: string[]) {}
  disponibile(): boolean {
    return true;
  }
  async trascrivi(r: RichiestaTrascrizione) {
    this.richieste.push(r);
    return { testo: this.risposte.shift() ?? '', costo_usd: 0 };
  }
}

/** One second of 16 kHz mono WAV: a tone (`ampiezza` > 0) or silence. */
function wav(ampiezza: number): Buffer {
  const n = 16_000;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(16_000, 24);
  b.writeUInt32LE(32_000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((i / 16_000) * 2 * Math.PI * 440) * ampiezza * 32767), 44 + i * 2);
  return b;
}

async function avvia(trascrittori: Trascrittore[]): Promise<{ s: ServerTagm; url: string }> {
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    TAGM_LOG: path.join(cartella, String(server.length)),
    TAGM_CARTELLA_CAMPAGNA: MINI,
    TAGM_MODO: 'repertorio',
    TAGM_PROMPT_SELETTORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    TAGM_CACHE_AUDIO: path.join(cartella, 'cache'),
    TAGM_TTS: 'mock',
    TAGM_ASSESTAMENTO_MS: '20',
    TAGM_MOCK_SCALA: '0.02',
    TAGM_MARGINE_AUDIO_MS: '50',
    TAGM_PRERISCALDA: '0',
  } as NodeJS.ProcessEnv);
  const narratore = new NarratoreFinto({ idPng: [], idPg: [], primoTokenMs: 5, msPerPezzo: 1, copione: (t) => `[narratore] Turno ${t}. Che fate?\n[invito] tutti` });
  const s = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null, trascrittori });
  await s.avvia();
  server.push(s);
  return { s, url: `http://127.0.0.1:${(s.app.http.server.address() as { port: number }).port}` };
}

function nuovo(url: string): Client {
  const c: Client = connetti(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  client.push(c);
  return c;
}
const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));

async function telefono(url: string, idPg: string): Promise<Client> {
  const t = nuovo(url);
  await new Promise<void>((ok) => t.on('connect', () => ok()));
  await emetti<StatoTavolo>((cb) => t.emit('telefono:entra', cb));
  expect(await emetti<Esito>((cb) => t.emit('telefono:scegli_pg', { id_pg: idPg, dispositivo: `tel-${idPg}-0123456789` }, cb))).toEqual({ ok: true });
  return t;
}

const detta = (url: string, socket: string, idPg: string, corpo: Buffer) =>
  fetch(`${url}/api/dettato`, { method: 'POST', headers: { 'content-type': 'audio/wav', 'x-tagm-socket': socket, 'x-tagm-pg': idPg }, body: new Uint8Array(corpo) });

describe.skipIf(!conFfmpeg)('dictation through the server', () => {
  it('corrects the names, checks the phone, learns from the sent action and remembers it', async () => {
    const finto = new TrascrittoreFinto(['Chiedo a Brunelo di seguire Sorvac fino alla cantina.', 'Seguo sorvac e chiamo Brunello.']);
    const { s, url } = await avvia([finto]);
    expect(await (await fetch(`${url}/api/dettato`)).json()).toMatchObject({ attivo: true, provider: 'finto', max_secondi: 30 });

    const schermo = nuovo(url);
    await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
    schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
    const tel = await telefono(url, 'pg_anna');
    const finestra = new Promise<StatoTavolo>((ok) => tel.on('stato', (st) => st.fase === 'finestra' && ok(st)));
    await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
    const st = await finestra;

    // Only for the PC chosen on that connection.
    expect((await detta(url, 'nessuno', 'pg_anna', wav(0.3))).status).toBe(403);
    expect((await detta(url, tel.id!, 'pg_bruno', wav(0.3))).status).toBe(403);

    // Silence never reaches Whisper.
    const muto = await detta(url, tel.id!, 'pg_anna', wav(0));
    expect(await muto.json()).toMatchObject({ testo: '', silenzio: true });
    expect(finto.richieste).toHaveLength(0);

    const r1 = (await (await detta(url, tel.id!, 'pg_anna', wav(0.3))).json()) as RispostaDettato;
    expect(r1).toMatchObject({ testo: 'Chiedo a Brunello di seguire Sorvac fino alla cantina.', provider: 'finto', correzioni: [{ sentito: 'Brunelo', scritto: 'Brunello', motivo: 'fonetica' }] });
    expect(r1.secondi).toBeCloseTo(1, 1);
    expect(finto.richieste[0]!.lingua).toBe('it');
    expect(finto.richieste[0]!.prompt).toContain('Anna Rossi');
    expect(finto.richieste[0]!.prompt).not.toContain('Zorvak');

    // The player retypes the unknown name and sends: the server learns Sorvac → Zorvak.
    const inviato = 'Chiedo a Brunello di seguire Zorvak fino alla cantina.';
    expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo: inviato, versione_vista: st.versione_scena, trascrizione: r1.testo }, cb))).toEqual({ ok: true });

    const r2 = (await (await detta(url, tel.id!, 'pg_anna', wav(0.3))).json()) as RispostaDettato;
    expect(r2.testo).toBe('Seguo Zorvak e chiamo Brunello.');
    expect(r2.correzioni).toEqual([{ sentito: 'sorvac', scritto: 'Zorvak', motivo: 'appreso' }]);
    expect(finto.richieste[1]!.prompt).toContain('Zorvak');

    // In the session registry: a resumed session knows Zorvak too.
    const sessione = s.sessioni.memoria!.info()!.id;
    const eventi = s.sessioni.archivio!.eventi(sessione).filter((e) => e.tipo === 'dettato');
    expect(eventi.at(-1)!.dati).toMatchObject({ appresi: [{ scritto: 'Zorvak', sentiti: ['Sorvac'] }], rifiutate: [] });
  }, 30_000);

  it('with no transcriber the microphone is off', async () => {
    const { url } = await avvia([]);
    expect(await (await fetch(`${url}/api/dettato`)).json()).toMatchObject({ attivo: false, provider: 'nessuno' });
    const tel = await telefono(url, 'pg_anna');
    const r = await detta(url, tel.id!, 'pg_anna', wav(0.3));
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ codice: 'spento' });
  });
});
