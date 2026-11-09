/**
 * Integrazione del server intero con client Socket.IO veri: schermo + due telefoni.
 * Narratore a copione e voce finta veloce: nessuna spesa, nessun servizio esterno.
 * Verifica il ciclo apertura → finestra → narrazione → finestra e il record in turni.jsonl.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type {
  AudioFrase,
  AzionePrivata,
  Esito,
  EventiClientVersoServer,
  EventiServerVersoClient,
  InfoServer,
  MisureTurno,
  SchedaPg,
  StatoTavolo,
} from '@cantastorie/shared';
import { costruisciServer, type ServerCantastorie } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;

const cartellaLog = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-int-'));
let server: ServerCantastorie;
let url: string;
const client: Client[] = [];

function nuovoClient(): Client {
  const c: Client = connetti(url, { transports: ['websocket'], forceNew: true });
  client.push(c);
  return c;
}

/** Aspetta uno stato che soddisfa la condizione (con scadenza). */
function attendiStato(c: Client, cond: (s: StatoTavolo) => boolean, ms = 8000): Promise<StatoTavolo> {
  return new Promise((risolvi, rifiuta) => {
    const t = setTimeout(() => {
      c.off('stato', f);
      rifiuta(new Error('stato atteso non arrivato'));
    }, ms);
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

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));

beforeAll(async () => {
  const env = {
    PORT: '0',
    HOST: '127.0.0.1',
    CANTASTORIE_LOG: cartellaLog,
    CANTASTORIE_CARTELLA_CAMPAGNA: path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini'),
    CANTASTORIE_PROMPT_NARRATORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_TTS: 'mock',
    CANTASTORIE_ASSESTAMENTO_MS: '20',
    CANTASTORIE_MOCK_SCALA: '0.02',
    CANTASTORIE_LLM: 'finto',
    CANTASTORIE_MASTER_TOKEN: 'token_integrazione_master_42',
    CANTASTORIE_IP: '192.168.1.50',
  };
  const config = caricaConfig(env as NodeJS.ProcessEnv);
  const narratore = new NarratoreFinto({
    idPng: ['png_oste'],
    idPg: ['pg_anna', 'pg_bruno'],
    primoTokenMs: 30,
    msPerPezzo: 2,
    copione: (turno) =>
      turno === 1
        ? '[narratore] L’oste posa due boccali. La pioggia batte sui vetri.\n[png_oste] Pagate prima, foresti.\n[ignoto] Frase da etichetta ignota.\n[invito] pg_bruno'
        : '[narratore] Silenzio.\n[invito] tutti',
  });
  server = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null });
  await server.avvia();
  const porta = (server.app.http.server.address() as { port: number }).port;
  url = `http://127.0.0.1:${porta}`;
});

afterAll(async () => {
  for (const c of client) c.disconnect();
  await server.chiudi();
  fs.rmSync(cartellaLog, { recursive: true, force: true });
});

describe('server F0 con client veri', () => {
  it('apertura, finestra, narrazione, audio allo schermo, misure del turno', async () => {
    // --- Schermo: osserva, poi «Inizia sessione». Simula il lettore: avvisa inizio e fine audio.
    const schermo = nuovoClient();
    const { stato: s0, info } = await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
    expect(s0.fase).toBe('attesa');
    expect(info.url_telefono).toMatch(/^http:\/\/192\.168\.1\.50:\d+\/telefono$/);
    expect(info.qr_svg).toContain('<svg');

    const frasiAudio: AudioFrase[] = [];
    const byteAudio = new Map<number, number>();
    const iniziati = new Set<number>();
    schermo.on('audio:frase', (f) => frasiAudio.push(f));
    schermo.on('audio:pezzo', (p) => {
      const turno = Number(p.id_frase.split('-')[0]!.slice(1));
      const n = (p.pcm as ArrayBuffer).byteLength;
      expect(n % 2).toBe(0);
      byteAudio.set(turno, (byteAudio.get(turno) ?? 0) + n);
      if (!iniziati.has(turno)) {
        iniziati.add(turno);
        schermo.emit('schermo:audio_iniziato', { turno, id_frase: p.id_frase, ritardo_ms: 0 });
      }
    });
    schermo.on('audio:fine_turno', (f) =>
      schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 1, buchi_in_frase: 0, buchi_tra_frasi: 1, silenzio_ms: 120 }),
    );
    const metriche: MisureTurno[] = [];
    schermo.on('metriche:turno', (m) => metriche.push(m));

    // --- Telefoni.
    const tel1 = nuovoClient();
    const tel2 = nuovoClient();
    await emetti<StatoTavolo>((cb) => tel1.emit('telefono:entra', cb));
    await emetti<StatoTavolo>((cb) => tel2.emit('telefono:entra', cb));
    const schede: SchedaPg[] = [];
    const schedeAltrui: SchedaPg[] = [];
    tel1.on('pg:scheda', (x) => schede.push(x));
    tel2.on('pg:scheda', (x) => schedeAltrui.push(x));
    expect(await emetti<Esito>((cb) => tel1.emit('telefono:scegli_pg', { id_pg: 'pg_anna' }, cb))).toEqual({ ok: true });
    expect(await emetti<Esito>((cb) => tel2.emit('telefono:scegli_pg', { id_pg: 'pg_bruno' }, cb))).toEqual({ ok: true });
    expect(await emetti<Esito>((cb) => tel2.emit('telefono:scegli_pg', { id_pg: 'pg_nessuno' }, cb))).toMatchObject({ ok: false });
    expect(schede.at(-1)).toMatchObject({ id_pg: 'pg_anna', conoscenze_private: ['SEGRETO_DI_ANNA'], situazione_comune: 'Siete in viaggio.' });
    expect(schedeAltrui.map((x) => x.id_pg)).toEqual(['pg_bruno']);
    expect(JSON.stringify(schedeAltrui)).not.toContain('SEGRETO_DI_ANNA');

    // --- Avvio: l'apertura viene letta, poi si apre la finestra per tutti.
    const finestra1 = attendiStato(tel1, (s) => s.fase === 'finestra' && s.turno === 1);
    expect(await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb))).toEqual({ ok: true });
    const s1 = await finestra1;
    expect(s1.finestra.invitati.sort()).toEqual(['pg_anna', 'pg_bruno']);
    expect(s1.versione_scena).toBe(1);
    expect(s1.trascrizione[0]).toMatchObject({ tipo: 'narrazione', turno: 0 });
    expect(frasiAudio.filter((f) => f.turno === 0)).toHaveLength(3);
    expect(byteAudio.get(0)).toBeGreaterThan(0);

    // --- Azioni: un telefono non può agire per un altro PG; modifica, ritiro; niente «pronto».
    expect(await emetti<Esito>((cb) => tel1.emit('azione:invia', { id_pg: 'pg_bruno', testo: 'X', versione_vista: 1 }, cb))).toMatchObject({ ok: false });
    const mia: AzionePrivata[] = [];
    tel1.on('azione:mia', (a) => a && mia.push(a));
    expect(await emetti<Esito>((cb) => tel1.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Ordino da bere.', versione_vista: 1 }, cb))).toEqual({ ok: true });
    expect(await emetti<Esito>((cb) => tel1.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Ordino vino caldo.', versione_vista: 1 }, cb))).toEqual({ ok: true });
    const conTimer = await emetti<StatoTavolo>((cb) => tel2.emit('stato:richiedi', cb));
    // Ritmo calmo: un'azione in coda non fa partire nessun conto alla rovescia; si aspetta Bruno.
    expect(conTimer.ritmo).toBe('calmo');
    expect(conTimer.finestra.chiusura_prevista_ms).toBeNull();
    expect(conTimer.finestra.aspettiamo).toEqual(['pg_bruno']);
    // Il tavolo vede le intenzioni pubbliche (docs/azioni-concorrenti.md, principio 2).
    expect(conTimer.al_tavolo).toMatchObject([{ id_pg: 'pg_anna', testo: 'Ordino vino caldo.', stato: 'in_coda' }]);
    expect(JSON.stringify(conTimer)).not.toContain('SEGRETO_DI_ANNA');
    // Un'azione privata non compare al tavolo.
    expect(await emetti<Esito>((cb) => tel2.emit('azione:invia', { id_pg: 'pg_bruno', testo: 'Rubo una moneta.', versione_vista: 1, privata: true }, cb))).toEqual({ ok: true });
    const conPrivata = await emetti<StatoTavolo>((cb) => tel1.emit('stato:richiedi', cb));
    expect(JSON.stringify(conPrivata)).not.toContain('Rubo una moneta');
    expect(await emetti<Esito>((cb) => tel2.emit('azione:invia', { id_pg: 'pg_bruno', testo: 'Guardo la porta.', versione_vista: 1 }, cb))).toEqual({ ok: true });
    expect(await emetti<Esito>((cb) => tel2.emit('azione:ritira', { id_pg: 'pg_bruno' }, cb))).toEqual({ ok: true });

    // Bruno ha ritirato: il gioco lo aspetta (senza scadenza), finché il master non preme «Risolvi ora».
    await new Promise((r) => setTimeout(r, 200));
    const inAttesa = await emetti<StatoTavolo>((cb) => tel1.emit('stato:richiedi', cb));
    expect(inAttesa).toMatchObject({ fase: 'finestra', finestra: { aperta: true, aspettiamo: ['pg_bruno'] } });
    const finestra2 = attendiStato(tel1, (s) => s.fase === 'finestra' && s.turno === 2);
    const master = nuovoClient();
    expect(await emetti<{ ok: boolean }>((cb) => master.emit('master:entra', { token: 'token_integrazione_master_42' }, cb))).toMatchObject({ ok: true });
    expect(await emetti<Esito>((cb) => master.emit('master:comando', { tipo: 'chiudi_finestra' }, cb))).toEqual({ ok: true });

    // --- Narrazione del turno 1, poi finestra 2 solo per chi è stato invitato.
    const s2 = await finestra2;
    expect(s2.finestra.invitati).toEqual(['pg_bruno']);
    expect(s2.versione_scena).toBe(2);
    const t1 = s2.trascrizione.filter((v) => v.turno === 1);
    expect(t1.map((v) => [v.tipo, v.chi, v.testo])).toEqual([
      ['azione', 'pg_anna', 'Ordino vino caldo.'],
      ['narrazione', 'narratore', 'L’oste posa due boccali. La pioggia batte sui vetri.'],
      ['battuta', 'png_oste', 'Pagate prima, foresti.'],
      ['narrazione', 'narratore', 'Frase da etichetta ignota.'],
    ]);
    const voci1 = frasiAudio.filter((f) => f.turno === 1);
    expect(voci1.map((f) => f.parlante)).toEqual(['narratore', 'narratore', 'png_oste', 'narratore']);
    expect(mia.at(-1)).toMatchObject({ stato: 'risolta', testo: 'Ordino vino caldo.', versione_vista: 1, turno: 1 });

    // --- Misure: un record per il turno 1 con tutti i campi del contratto.
    const righe = fs.readFileSync(path.join(cartellaLog, 'turni.jsonl'), 'utf8').trim().split('\n').map((r) => JSON.parse(r));
    const r1 = righe.find((r) => r.turno === 1);
    for (const campo of ['finestra_ms', 'llm_primo_token', 'llm_prima_frase', 'voce_richiesta', 'voce_primo_audio', 'schermo_inizio_audio', 'llm_fine', 'audio_fine']) {
      expect(r1[campo], campo).toBeTypeOf('number');
      expect(r1[campo], campo).toBeGreaterThanOrEqual(0);
    }
    expect(r1.llm_primo_token).toBeLessThanOrEqual(r1.llm_prima_frase);
    expect(r1.voce_richiesta).toBeLessThanOrEqual(r1.voce_primo_audio);
    expect(r1.audio_fine).toBeGreaterThanOrEqual(r1.schermo_inizio_audio);
    for (const campo of ['token_ingresso', 'token_uscita', 'token_cache_lettura', 'token_cache_scrittura', 'costo_usd']) expect(r1).toHaveProperty(campo);
    expect(r1).toMatchObject({ buchi: 1, buchi_in_frase: 0, buchi_tra_frasi: 1, silenzio_ms: 120, voce_sveglia: null }); // mock: niente /sveglia
    const narr = fs.readFileSync(path.join(cartellaLog, 'narrazioni.jsonl'), 'utf8').trim().split('\n').map((r) => JSON.parse(r));
    expect(narr[0]).toMatchObject({ turno: 0, tipo: 'apertura' });
    expect(narr.find((x) => x.turno === 1)).toMatchObject({
      tipo: 'turno',
      azioni: [{ id_pg: 'pg_anna', testo: 'Ordino vino caldo.' }, { id_pg: 'pg_bruno', testo: null }],
      invito: ['pg_bruno'],
      anomalie: [{ codice: 'etichetta_sconosciuta' }],
    });
    expect(metriche.find((m) => m.turno === 1)).toMatchObject({ turno: 1, voce_motore: 'mock' });
    const costi = fs.readFileSync(path.join(cartellaLog, 'costi.jsonl'), 'utf8');
    expect(costi).toContain('"tipo":"turno"');
  }, 30_000);

  it('ferma interrompe e avvisa lo schermo; ricomincia riparte dall’apertura', async () => {
    const schermo = client[0]!;
    let interrotto = false;
    schermo.on('audio:interrompi', () => {
      interrotto = true;
    });
    expect(await emetti<Esito>((cb) => schermo.emit('scena:ferma', cb))).toEqual({ ok: true });
    const s = await emetti<StatoTavolo>((cb) => schermo.emit('stato:richiedi', cb));
    expect(s.fase).toBe('fermata');
    await new Promise((r) => setTimeout(r, 50));
    expect(interrotto).toBe(true);
    const apertura = attendiStato(schermo, (x) => x.fase === 'finestra' && x.turno === 1);
    expect(await emetti<Esito>((cb) => schermo.emit('scena:ricomincia', cb))).toEqual({ ok: true });
    const r = await apertura;
    expect(r.trascrizione.filter((v) => v.tipo !== 'sistema')).toHaveLength(1);
  }, 20_000);

  it('serve le API e il fallback delle pagine', async () => {
    const salute = await (await fetch(`${url}/api/salute`)).json();
    expect(salute).toMatchObject({ ok: true, voce: 'mock', narratore: 'finto' });
    const info = (await (await fetch(`${url}/api/info`)).json()) as InfoServer;
    expect(info.url_telefono).toContain('/telefono');
    expect((await fetch(`${url}/api/nulla`)).status).toBe(404);
  });
});
