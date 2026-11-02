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
  // Selettore a copione (protocollo B2). Le richieste di riparazione hanno un copione a parte.
  const copione = (turno: number) =>
    turno === 1
      ? '[usa] oste_saluto > pg_anna\n[narratore] Anna, l’oste ti guarda.\n[usa] oste_confessa > pg_anna\n[usa] nar_tuono\n[invito] pg_anna'
      : turno === 2
        ? // Il segno è dovuto ma il selettore lo dimentica: lo aggiunge il Motore prima dell'invito.
          '[narratore] Il vento soffia sulle imposte.\n[narratore] Anna, cosa guardi?\n[invito] pg_anna'
        : // Nessuna risposta all'azione di Anna: riparazione.
          '[narratore] Il fuoco crepita.\n[invito] pg_anna';
  const narratore = new NarratoreFinto({ idPng: ['png_oste'], idPg: ['pg_anna', 'pg_bruno'], primoTokenMs: 20, msPerPezzo: 1, copione });
  const riparatore = new NarratoreFinto({
    idPng: ['png_oste'],
    idPg: ['pg_anna', 'pg_bruno'],
    primoTokenMs: 20,
    msPerPezzo: 1,
    copione: () => '[usa] nar_brocca > pg_anna\n[narratore] Anna, la brocca è lì.',
  });
  const narra = narratore.narra.bind(narratore);
  narratore.narra = (r, cb) => {
    messaggi.push(r.messaggio);
    return r.messaggio.includes('## Azioni rimaste senza risposta') ? riparatore.narra(r, cb) : narra(r, cb);
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
  it('B2: [usa] legato all’azione, catalogo pertinente, segno dovuto, rifiuti, riparazione', async () => {
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

    // --- Turno 1: «Saluto l'oste.»
    const f2 = attendiStato(tel, (s) => s.fase === 'finestra' && s.turno === 2);
    expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Saluto l’oste.', versione_vista: 1 }, cb))).toEqual({ ok: true });
    expect(await emetti<Esito>((cb) => tel.emit('azione:pronto', { id_pg: 'pg_anna', pronto: true }, cb))).toEqual({ ok: true });
    const s2 = await f2;
    // Catalogo pertinente: il saluto (temi) sì; la confessione (condizioni) e il tuono (segno non dovuto) no.
    expect(messaggi[0]).toContain('## Catalogo: battute pertinenti a questo turno');
    expect(messaggi[0]).toContain("- oste_saluto · png_oste · saluto · i PG entrano o salutano l'oste");
    expect(messaggi[0]).not.toContain('oste_confessa ·');
    expect(messaggi[0]).not.toContain('nar_tuono ·');
    expect(s2.trascrizione.filter((v) => v.turno === 1).map((v) => [v.chi, v.testo])).toEqual([
      ['pg_anna', 'Saluto l’oste.'],
      ['narratore', "L'oste si pulisce le mani."],
      ['png_oste', 'Benvenuti, foresti. Accomodatevi.'],
      ['narratore', 'Anna, l’oste ti guarda.'],
    ]);

    // --- Turno 2: segno dovuto e dimenticato → il Motore mette nar_tuono prima della domanda finale.
    const f3 = attendiStato(tel, (s) => s.fase === 'finestra' && s.turno === 3);
    await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Guardo fuori dalla finestra.', versione_vista: 2 }, cb));
    await emetti<Esito>((cb) => tel.emit('azione:pronto', { id_pg: 'pg_anna', pronto: true }, cb));
    const s3 = await f3;
    expect(messaggi[1]).toContain('Mostralo in questa risposta.');
    expect(messaggi[1]).toContain('- nar_tuono · narratore · segno_orologio');
    expect(s3.trascrizione.filter((v) => v.turno === 2).map((v) => v.testo)).toEqual([
      'Guardo fuori dalla finestra.',
      'Il vento soffia sulle imposte.',
      'Un tuono lontano fa tremare i vetri.',
      'Anna, cosa guardi?',
    ]);

    // --- Turno 3: l'azione di Anna resta senza risposta → riparazione con la battuta della brocca.
    const f4 = attendiStato(tel, (s) => s.fase === 'finestra' && s.turno === 4);
    await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Guardo dietro il banco.', versione_vista: 3 }, cb));
    await emetti<Esito>((cb) => tel.emit('azione:pronto', { id_pg: 'pg_anna', pronto: true }, cb));
    const s4 = await f4;
    expect(messaggi[2]).not.toContain('Mostralo in questa risposta.'); // segno appena mostrato
    expect(messaggi[2]).toContain('- nar_brocca · narratore · indizio');
    expect(messaggi[3]).toContain('## Azioni rimaste senza risposta\n- Anna Rossi (pg_anna): Guardo dietro il banco.');
    expect(s4.trascrizione.filter((v) => v.turno === 3).map((v) => v.testo)).toEqual([
      'Guardo dietro il banco.',
      'Il fuoco crepita.',
      "Dietro il banco c'è una brocca d'acqua, accanto alla botte.",
      'Anna, la brocca è lì.',
    ]);

    const narr = fs.readFileSync(path.join(cartella, 'narrazioni.jsonl'), 'utf8').trim().split('\n').map((r) => JSON.parse(r));
    const n1 = narr.find((x) => x.turno === 1);
    expect(n1).toMatchObject({ modo: 'repertorio', righe_prescritte: 2, righe_improvvisate: 1, usa_rifiutati: 2, azioni_senza_risposta: 0, riparazioni: 0 });
    expect(n1.uscita.map((u: { tipo: string; id?: string; per?: string | null }) => `${u.tipo}:${u.id ?? ''}>${u.per ?? ''}`)).toEqual([
      'usa:oste_saluto>pg_anna',
      'improvvisata:>',
      'usa_rifiutato:oste_confessa>pg_anna',
      'usa_rifiutato:nar_tuono>',
    ]);
    const n2 = narr.find((x) => x.turno === 2);
    expect(n2).toMatchObject({ segno_aggiunto: 'nar_tuono', righe_prescritte: 1, righe_improvvisate: 2, riparazioni: 0, azioni_senza_risposta: 0 });
    expect(n2.uscita.map((u: { tipo: string; id?: string; motore?: boolean }) => `${u.tipo}:${u.id ?? ''}${u.motore ? '(motore)' : ''}`)).toEqual([
      'improvvisata:',
      'usa:nar_tuono(motore)',
      'improvvisata:',
    ]);
    expect(n2.stato_repertorio.orologi).toEqual({ o_temporale: '1/2' });
    const n3 = narr.find((x) => x.turno === 3);
    expect(n3).toMatchObject({ segno_aggiunto: null, righe_prescritte: 1, righe_improvvisate: 2, usa_rifiutati: 0, azioni_pubbliche: 1, azioni_senza_risposta: 0, riparazioni: 1 });
    const turni = fs.readFileSync(path.join(cartella, 'turni.jsonl'), 'utf8').trim().split('\n').map((r) => JSON.parse(r));
    expect(turni.find((x) => x.turno === 3)).toMatchObject({ modo: 'repertorio', riparazioni: 1, azioni_senza_risposta: 0 });
    const salute = (await (await fetch(`${url}/api/salute`)).json()) as { modo: string; sessione: string };
    expect(salute).toMatchObject({ modo: 'repertorio' });
  }, 30_000);
});
