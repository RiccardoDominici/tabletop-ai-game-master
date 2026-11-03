/**
 * Mossa contro lo stallo col server intero (timeout accorciato via config): in modalità A il
 * narratore riceve «## Stallo» (S1, poi S2 al secondo stallo di fila), in modalità B il catalogo
 * con lo stallo segnalato; la finestra si riapre dopo la mossa.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type { Esito, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoTavolo } from '@cantastorie/shared';
import { costruisciServer, type ServerCantastorie } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');
const daChiudere: Array<() => Promise<void>> = [];
afterAll(async () => {
  for (const f of daChiudere) await f();
});

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
function attendiStato(c: Client, cond: (s: StatoTavolo) => boolean, ms = 8000): Promise<StatoTavolo> {
  return new Promise((risolvi, rifiuta) => {
    const t = setTimeout(() => rifiuta(new Error('stato atteso non arrivato')), ms);
    const f = (s: StatoTavolo): void => {
      if (cond(s)) {
        clearTimeout(t);
        c.off('stato', f);
        risolvi(s);
      }
    };
    c.on('stato', f);
  });
}

async function avvia(modo: 'improvvisa' | 'repertorio'): Promise<{ server: ServerCantastorie; url: string; messaggi: string[]; cartella: string }> {
  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-stallo-'));
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    CANTASTORIE_LOG: cartella,
    CANTASTORIE_CARTELLA_CAMPAGNA: MINI,
    CANTASTORIE_PROMPT_NARRATORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_PROMPT_SELETTORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_MODO: modo,
    CANTASTORIE_TTS: 'mock',
    CANTASTORIE_MOCK_SCALA: '0.02',
    CANTASTORIE_STALLO_MS: '300',
    CANTASTORIE_CACHE_AUDIO: path.join(cartella, 'cache'),
  } as NodeJS.ProcessEnv);
  const messaggi: string[] = [];
  const narratore = new NarratoreFinto({ idPng: ['png_oste'], idPg: ['pg_anna'], primoTokenMs: 10, msPerPezzo: 1, copione: () => '[narratore] Un ceppo crolla nel camino. Anna, cosa fai?\n[invito] pg_anna' });
  const narra = narratore.narra.bind(narratore);
  narratore.narra = (r, cb) => {
    messaggi.push(r.messaggio);
    return narra(r, cb);
  };
  const server = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null });
  await server.avvia();
  daChiudere.push(async () => {
    await server.chiudi();
    fs.rmSync(cartella, { recursive: true, force: true });
  });
  return { server, url: `http://127.0.0.1:${(server.app.http.server.address() as { port: number }).port}`, messaggi, cartella };
}

async function scenaSenzaInput(url: string): Promise<Client> {
  const schermo: Client = connetti(url, { transports: ['websocket'], forceNew: true });
  const tel: Client = connetti(url, { transports: ['websocket'], forceNew: true });
  daChiudere.push(async () => {
    schermo.disconnect();
    tel.disconnect();
  });
  await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
  schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
  await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
  expect(await emetti<Esito>((cb) => tel.emit('telefono:scegli_pg', { id_pg: 'pg_anna' }, cb))).toEqual({ ok: true });
  await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
  return tel;
}

describe('mossa contro lo stallo', () => {
  it('modalità A: due stalli di fila → S1 poi S2, poi il tavolo va in pausa da solo', async () => {
    const { url, messaggi, cartella } = await avvia('improvvisa');
    const tel = await scenaSenzaInput(url);
    const pausa = await attendiStato(tel, (s) => s.fase === 'pausa', 10_000); // turni 1 e 2 chiusi per stallo
    expect(pausa).toMatchObject({ pausa_automatica: true, turno: 2 });
    expect(messaggi[0]).toContain('## Mossa del mondo\nFai succedere qualcosa nella scena: un segno visibile della minaccia (S1)');
    expect(messaggi[0]).not.toMatch(/nessuno scrive|45 secondi/);
    expect(messaggi[1]).toContain('indizio proattivo (S2)');
    const narr = fs.readFileSync(path.join(cartella, 'narrazioni.jsonl'), 'utf8').trim().split('\n').map((r) => JSON.parse(r));
    expect(narr.filter((x) => x.tipo === 'turno').slice(0, 2).map((x) => x.chiusura)).toEqual(['stallo', 'stallo']);
  }, 20_000);

  it('modalità B: lo stallo è segnalato al selettore (riempitivi e segno dovuto nel catalogo)', async () => {
    const { url, messaggi } = await avvia('repertorio');
    const tel = await scenaSenzaInput(url);
    await attendiStato(tel, (s) => s.fase === 'finestra' && s.turno === 2, 10_000);
    expect(messaggi[0]).toContain("Stallo: in questo turno non c'è nessuna azione da risolvere.");
    expect(messaggi[0]).toContain('non nominare giocatori o PG');
    expect(messaggi[0]).not.toContain('## Stallo\nDa 45'); // il testo di A non va al selettore
  }, 20_000);
});
