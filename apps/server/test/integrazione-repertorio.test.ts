/**
 * Modalità repertorio (B) col server intero: il selettore a copione usa [usa], la regia
 * controlla l'elenco del turno, applica gli effetti, manda le righe alla voce (dalla cache se
 * c'è, dal vivo altrimenti) e registra conteggi e uscita del turno.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type { Esito, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoTavolo } from '@cantastorie/shared';
import { costruisciServer, type ServerCantastorie } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import { CacheAudio, chiaveAudio } from '../src/voce/cache-audio';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');
const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-rep-'));
const cartellaCache = path.join(cartella, 'cache');
let server: ServerCantastorie;
let url: string;
const client: Client[] = [];
const messaggi: string[] = [];

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

beforeAll(async () => {
  // Una riga pre-generata: la seconda riga di oste_saluto (voce vincent, «Òste»/«Brùno» non compaiono).
  new CacheAudio(cartellaCache).scrivi(chiaveAudio('vincent', 'Benvenuti, foresti. Accomodatevi.'), Buffer.alloc(24000), {
    voce: 'vincent',
    testo: 'Benvenuti, foresti. Accomodatevi.',
    sample_rate: 24000,
  });
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    CANTASTORIE_LOG: cartella,
    CANTASTORIE_CARTELLA_CAMPAGNA: MINI,
    CANTASTORIE_PROMPT_SELETTORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_MODO: 'repertorio',
    CANTASTORIE_CACHE_AUDIO: cartellaCache,
    CANTASTORIE_TTS: 'mock',
    CANTASTORIE_MOCK_SCALA: '0.02',
    CANTASTORIE_FINESTRA_TUTTI: '1',
  } as NodeJS.ProcessEnv);
  const narratore = new NarratoreFinto({
    idPng: ['png_oste'],
    idPg: ['pg_anna', 'pg_bruno'],
    primoTokenMs: 20,
    msPerPezzo: 1,
    copione: (turno) =>
      turno === 1
        ? '[usa] oste_saluto\n[narratore] Anna, l’oste ti guarda.\n[usa] oste_confessa\n[usa] nar_tuono\n[invito] pg_anna'
        : '[usa] oste_saluto\n[orologio] o_temporale\n[invito] pg_anna',
  });
  const narra = narratore.narra.bind(narratore);
  narratore.narra = (r, cb) => {
    messaggi.push(r.messaggio);
    return narra(r, cb);
  };
  server = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null });
  await server.avvia();
  url = `http://127.0.0.1:${(server.app.http.server.address() as { port: number }).port}`;
});

afterAll(async () => {
  for (const c of client) c.disconnect();
  await server.chiudi();
  fs.rmSync(cartella, { recursive: true, force: true });
});

describe('modalità repertorio', () => {
  it('[usa]: elenco del turno, effetti, varianti, rifiuti, cache, conteggi', async () => {
    const schermo: Client = connetti(url, { transports: ['websocket'], forceNew: true });
    const tel: Client = connetti(url, { transports: ['websocket'], forceNew: true });
    client.push(schermo, tel);
    await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
    schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
    await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
    expect(await emetti<Esito>((cb) => tel.emit('telefono:scegli_pg', { id_pg: 'pg_anna' }, cb))).toEqual({ ok: true });

    const f1 = attendiStato(tel, (s) => s.fase === 'finestra' && s.turno === 1);
    await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
    await f1;
    const f2 = attendiStato(tel, (s) => s.fase === 'finestra' && s.turno === 2);
    expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Saluto l’oste.', versione_vista: 1 }, cb))).toEqual({ ok: true });
    expect(await emetti<Esito>((cb) => tel.emit('azione:pronto', { id_pg: 'pg_anna', pronto: true }, cb))).toEqual({ ok: true });
    const s2 = await f2;

    // Il messaggio del turno 1 elencava le battute disponibili, senza il loro testo.
    expect(messaggi[0]).toContain('## Battute disponibili (id · chi · tipo · quando)');
    expect(messaggi[0]).toContain("- oste_saluto · png_oste · saluto · i PG entrano o salutano l'oste");
    expect(messaggi[0]).not.toContain('oste_confessa');
    expect(messaggi[0]).not.toContain('Benvenuti');

    // Trascrizione pubblica: righe della battuta + raccordo improvvisato.
    const t1 = s2.trascrizione.filter((v) => v.turno === 1).map((v) => [v.chi, v.testo]);
    expect(t1).toEqual([
      ['pg_anna', 'Saluto l’oste.'],
      ['narratore', "L'oste si pulisce le mani."],
      ['png_oste', 'Benvenuti, foresti. Accomodatevi.'],
      ['narratore', 'Anna, l’oste ti guarda.'],
      ['narratore', 'Un tuono lontano fa tremare i vetri.'],
    ]);

    const f3 = attendiStato(tel, (s) => s.fase === 'finestra' && s.turno === 3);
    await emetti<Esito>((cb) => tel.emit('azione:pronto', { id_pg: 'pg_anna', pronto: true }, cb));
    const s3 = await f3;
    expect(s3.trascrizione.filter((v) => v.turno === 2).map((v) => v.testo)).toEqual(['Ancora voi? Sedete.']); // variante 1
    // Turno 2: il tuono è uscito, quindi l'orologio è a 1 e il messaggio lo dice.
    expect(messaggi[1]).toContain('segni mostrati 1 di 2');

    const narr = fs.readFileSync(path.join(cartella, 'narrazioni.jsonl'), 'utf8').trim().split('\n').map((r) => JSON.parse(r));
    const n1 = narr.find((x) => x.turno === 1);
    expect(n1).toMatchObject({ modo: 'repertorio', righe_prescritte: 3, righe_improvvisate: 1, usa_rifiutati: 1 });
    expect(n1.uscita.map((u: { tipo: string; id?: string }) => `${u.tipo}:${u.id ?? ''}`)).toEqual(['usa:oste_saluto', 'improvvisata:', 'usa_rifiutato:oste_confessa', 'usa:nar_tuono']);
    expect(n1.stato_repertorio.orologi).toEqual({ o_temporale: '1/2' });
    const n2 = narr.find((x) => x.turno === 2);
    expect(n2.stato_repertorio.orologi).toEqual({ o_temporale: '1/2' }); // [orologio] ignorata in modalità B
    const turni = fs.readFileSync(path.join(cartella, 'turni.jsonl'), 'utf8').trim().split('\n').map((r) => JSON.parse(r));
    expect(turni.find((x) => x.turno === 1)).toMatchObject({ modo: 'repertorio', righe_prescritte: 3, righe_improvvisate: 1, usa_rifiutati: 1 });
    const salute = (await (await fetch(`${url}/api/salute`)).json()) as { modo: string; sessione: string };
    expect(salute).toMatchObject({ modo: 'repertorio' });
    expect(salute.sessione).toMatch(/^\d{4}-/);
  }, 30_000);
});
