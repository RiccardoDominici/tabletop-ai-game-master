/**
 * Audio automatico del Motore, col server intero (Socket.IO, voce finta veloce):
 * - umore iniziale della scena (`audio.umore_iniziale`);
 * - righe [umore]/[effetto] del narratore: l'effetto viaggia con la frase che segue (o con la fine
 *   del turno se è l'ultima riga), l'umore si applica quando parte la sua frase; tag fuori
 *   vocabolario o assenti dal catalogo ignorati; un umore automatico al minuto;
 * - `audio: {umore, effetto}` di una battuta (modalità repertorio): sulla sua prima riga;
 * - tutto nel registro del master, marcato «automatico».
 * Campagna: fixtures/campagne/mini-audio; audio: fixtures/audio.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type {
  AudioFineTurno,
  AudioFrase,
  ComandoMaster,
  Esito,
  EsitoEntrataMaster,
  EventiClientVersoServer,
  EventiServerVersoClient,
  InfoServer,
  StatoMaster,
  StatoTavolo,
} from '@tabletop-ai-gm/shared';
import { costruisciServer, type ServerTagm } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const TOKEN = 'token_di_prova_audio_auto_1';
const CAMPAGNA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini-audio');
const AUDIO = path.join(import.meta.dirname, 'fixtures', 'audio');

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
function attendi<T>(c: Client, evento: 'master:stato', cond: (s: T) => boolean, ms = 8000): Promise<T> {
  return new Promise((risolvi, rifiuta) => {
    const t = setTimeout(() => {
      c.off(evento, f as never);
      rifiuta(new Error(`${evento} atteso non arrivato`));
    }, ms);
    const f = (s: T): void => {
      if (cond(s)) {
        clearTimeout(t);
        c.off(evento, f as never);
        risolvi(s);
      }
    };
    c.on(evento, f as never);
  });
}

interface Banco {
  server: ServerTagm;
  master: Client;
  frasi: AudioFrase[];
  fineTurni: AudioFineTurno[];
  /** Fa un turno: azione di Anna, finestra chiusa dal master, attesa della finestra successiva. */
  turno(testo: string): Promise<StatoMaster>;
  chiudi(): Promise<void>;
}

async function banco(modo: 'improvvisa' | 'repertorio', copione: (turno: number) => string): Promise<Banco> {
  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-audio-auto-'));
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    TAGM_LOG: cartella,
    TAGM_CARTELLA_CAMPAGNA: CAMPAGNA,
    TAGM_PROMPT_NARRATORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    TAGM_PROMPT_SELETTORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    TAGM_CACHE_AUDIO: path.join(cartella, 'cache'),
    TAGM_MODO: modo,
    TAGM_TTS: 'mock',
    // Ogni turno lo chiude il «Risolvi ora» del master (turno() qui sotto). Con un assestamento breve, sotto carico la
    // finestra si chiudeva da sola prima del comando, e il comando veniva rifiutato: «La finestra delle azioni non è aperta».
    TAGM_ASSESTAMENTO_MS: '60000',
    TAGM_MOCK_SCALA: '0.02',
    TAGM_MARGINE_AUDIO_MS: '50',
    TAGM_MASTER_TOKEN: TOKEN,
    TAGM_AUDIO: AUDIO,
  } as NodeJS.ProcessEnv);
  const narratore = new NarratoreFinto({ idPng: ['png_oste'], idPg: ['pg_anna', 'pg_bruno'], primoTokenMs: 5, msPerPezzo: 1, copione });
  const server = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null });
  await server.avvia();
  const url = `http://127.0.0.1:${(server.app.http.server.address() as { port: number }).port}`;
  const client: Client[] = [];
  const nuovo = (): Client => {
    const c: Client = connetti(url, { transports: ['websocket'], forceNew: true });
    client.push(c);
    return c;
  };
  const master = nuovo();
  await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
  const schermo = nuovo();
  const frasi: AudioFrase[] = [];
  const fineTurni: AudioFineTurno[] = [];
  schermo.on('audio:frase', (f) => frasi.push(f));
  schermo.on('audio:fine_turno', (f) => {
    fineTurni.push(f);
    schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 });
  });
  await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
  const tel = nuovo();
  await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
  await emetti<Esito>((cb) => tel.emit('telefono:scegli_pg', { id_pg: 'pg_anna' }, cb));
  const prima = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'finestra' && s.tavolo.finestra.aperta);
  await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
  await prima;
  return {
    server,
    master,
    frasi,
    fineTurni,
    async turno(testo) {
      const n = server.regia.stato().turno + 1;
      const versione = server.regia.stato().versione_scena;
      expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo, versione_vista: versione }, cb))).toEqual({ ok: true });
      const dopo = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'finestra' && s.tavolo.finestra.aperta && s.tavolo.turno === n);
      expect(await emetti<Esito>((cb) => master.emit('master:comando', { tipo: 'chiudi_finestra' } as ComandoMaster, cb))).toEqual({ ok: true });
      return dopo;
    },
    async chiudi() {
      for (const c of client) c.disconnect();
      await server.chiudi();
      fs.rmSync(cartella, { recursive: true, force: true });
    },
  };
}

const banchi: Banco[] = [];
afterAll(async () => {
  for (const b of banchi) await b.chiudi();
});

const automatici = (s: StatoMaster) => s.eventi.filter((e) => e.automatico).map((e) => `${e.comando}:${e.ok ? 'ok' : 'no'}:${e.dettagli}`);

describe('narratore: righe [umore] ed [effetto]', () => {
  it('umore iniziale, effetto sulla frase dopo, effetto finale col fine turno, rifiuti, limite al minuto', async () => {
    const b = await banco('improvvisa', (turno) =>
      turno === 1
        ? [
            '[narratore] Anna ordina da bere.',
            '[umore] inseguimento',
            '[narratore] Qualcuno corre fuori.',
            '[effetto] porta',
            '[narratore] La porta sbatte.',
            '[umore] tensione',
            '[effetto] tuono',
            '[narratore] Silenzio.',
            '[effetto] campana',
            '[invito] tutti',
          ].join('\n')
        : '[umore] auto\n[narratore] Torna la calma.\n[invito] tutti',
    );
    banchi.push(b);
    // La scena comincia col suo umore iniziale.
    expect(b.server.regia.stato().scena.audio?.umore).toBe('umore_esplorazione_tesa');

    const dopo1 = await b.turno('Ordino da bere.');
    const t1 = b.frasi.filter((f) => f.turno === 1);
    expect(t1.map((f) => [f.testo, f.effetto ?? null])).toEqual([
      ['Anna ordina da bere.', null],
      ['Qualcuno corre fuori.', null],
      ['La porta sbatte.', 'sfx_porta'],
      ['Silenzio.', null],
    ]);
    // [effetto] dopo l'ultima frase: arriva con la fine del turno.
    expect(b.fineTurni.find((f) => f.turno === 1)?.effetti).toEqual(['sfx_campana']);
    expect(b.server.regia.stato().scena.audio?.umore).toBe('umore_inseguimento');
    // L'ordine tra scarti (al parsing) e segnali applicati (quando la frase parte) dipende dai tempi.
    expect(automatici(dopo1).sort()).toEqual([
      'umore:no:automatico (narratore): [umore] tensione ignorato: umore «tensione» fuori dal vocabolario (esplorazione_tesa, taverna_calda, rito_sacro, inseguimento, combattimento_epico, lutto, auto)',
      'effetto:no:automatico (narratore): [effetto] tuono ignorato: effetto «tuono» non presente nel catalogo della campagna',
      'umore:ok:automatico (narratore): umore della musica esplorazione_tesa → inseguimento',
      'effetto:ok:automatico (narratore): effetto sfx_porta con la frase',
    ].sort());

    // Turno 2, pochi secondi dopo: un altro umore automatico aspetterebbe il minuto, quindi si ignora.
    const dopo2 = await b.turno('Mi siedo.');
    expect(b.server.regia.stato().scena.audio?.umore).toBe('umore_inseguimento');
    expect(automatici(dopo2).at(-1)).toMatch(/^umore:no:automatico \(narratore\): umore auto ignorato, un cambio al minuto \(ancora \d+ s\)$/);

    // Il master resta sopra: il suo «auto» passa subito, e una scena ricominciata torna all'umore iniziale.
    expect(await emetti<Esito>((cb) => b.master.emit('master:comando', { tipo: 'umore', umore: null }, cb))).toEqual({ ok: true });
    expect(b.server.regia.stato().scena.audio?.umore).toBeNull();
    b.server.regia.ricomincia();
    expect(b.server.regia.stato().scena.audio?.umore).toBe('umore_esplorazione_tesa');
  });
});

describe('battuta con audio (modalità repertorio)', () => {
  it('effetto e umore della battuta sulla sua prima riga, nel registro come «battuta <id>»', async () => {
    const b = await banco('repertorio', () => '[usa] oste_saluto > pg_anna\n[invito] pg_anna');
    banchi.push(b);
    const dopo = await b.turno('Saluto l’oste.');
    const righe = b.frasi.filter((f) => f.turno === 1);
    expect(righe.map((f) => [f.testo, f.effetto ?? null])).toEqual([
      ["L'oste si pulisce le mani.", 'sfx_campana'],
      ['Benvenuti, foresti. Accomodatevi.', null],
    ]);
    expect(b.server.regia.stato().scena.audio?.umore).toBe('umore_inseguimento');
    expect(automatici(dopo)).toEqual([
      'umore:ok:automatico (battuta oste_saluto): umore della musica esplorazione_tesa → inseguimento',
      'effetto:ok:automatico (battuta oste_saluto): effetto sfx_campana con la frase',
    ]);
  });
});
