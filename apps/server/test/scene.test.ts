/**
 * Campagne con più scene, col server intero su campagne/ponte-lanterne (modalità repertorio,
 * selettore a copione, voce finta): il master passa da una scena all'altra dal pannello; cambiano
 * contesto del narratore, luogo sul proiettore, orologi attivi e catalogo (battute con `scena`);
 * le azioni in sospeso tornano ai giocatori; l'apertura della scena nuova si legge.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type {
  AzionePrivata,
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
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import { RADICE_REPO } from '../src/percorsi';
import { testo } from '../src/lingua';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const PONTE = path.join(RADICE_REPO, 'campagne', 'ponte-lanterne');
const presente = fs.existsSync(path.join(PONTE, 'scene'));
const TOKEN = 'token_di_prova_scene_123';

let cartella: string;
let server: ServerTagm;
let url: string;
const sistemi: string[][] = [];
const client: Client[] = [];
const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
const nuovoClient = (): Client => {
  const c: Client = connetti(url, { transports: ['websocket'], forceNew: true });
  client.push(c);
  return c;
};
function attendi<T>(c: Client, evento: 'stato' | 'master:stato' | 'azione:mia', cond: (s: T) => boolean, ms = 8000): Promise<T> {
  return new Promise((risolvi, rifiuta) => {
    const t = setTimeout(() => rifiuta(new Error(`${evento} atteso non arrivato`)), ms);
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
const comanda = (m: Client, c: ComandoMaster): Promise<Esito> => emetti<Esito>((cb) => m.emit('master:comando', c, cb));

describe.skipIf(!presente)('campagne con più scene (ponte-lanterne)', () => {
  beforeAll(async () => {
    cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-scene-'));
    const config = caricaConfig({
      PORT: '0',
      HOST: '127.0.0.1',
      TAGM_LOG: cartella,
      TAGM_CARTELLA_CAMPAGNA: PONTE,
      TAGM_MODO: 'repertorio',
      TAGM_PROMPT_SELETTORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
      TAGM_CACHE_AUDIO: path.join(cartella, 'cache'),
      TAGM_TTS: 'mock',
      // Assestamento lungo: l'azione di Dalia deve restare in coda mentre il master cambia scena.
      TAGM_ASSESTAMENTO_MS: '3000',
      TAGM_MOCK_SCALA: '0.02',
      TAGM_MARGINE_AUDIO_MS: '50',
      TAGM_PRERISCALDA: '0',
      TAGM_MASTER_TOKEN: TOKEN,
    } as NodeJS.ProcessEnv);
    const narratore = new NarratoreFinto({ idPng: [], idPg: [], primoTokenMs: 5, msPerPezzo: 1, copione: () => '[narratore] La pioggia batte.\n[invito] tutti' });
    const narra = narratore.narra.bind(narratore);
    narratore.narra = (r, cb) => {
      sistemi.push(r.sistema);
      return narra(r, cb);
    };
    server = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null });
    await server.avvia();
    url = `http://127.0.0.1:${(server.app.http.server.address() as { port: number }).port}`;
  });

  afterAll(async () => {
    for (const c of client) c.disconnect();
    await server?.chiudi();
    fs.rmSync(cartella, { recursive: true, force: true });
  });

  it('il caricatore legge le quattro scene, nell’ordine del validatore', () => {
    const c = caricaCampagna(PONTE);
    expect(c.scene.map((s) => s.id)).toEqual(['scena_ponte_imbrunire', 'scena_borgo_basso', 'scena_casa_del_sale', 'scena_terzo_tocco']);
    expect(c.scena.id).toBe('scena_ponte_imbrunire');
    expect(c.scene[1]!.apertura.length).toBeGreaterThan(0);
  });

  it('dal pannello si cambia scena: luogo, contesto, orologi, catalogo e azioni in sospeso', async () => {
    const master = nuovoClient();
    const entrata = await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
    expect(entrata.ok).toBe(true);
    if (!entrata.ok) return;
    expect(entrata.stato.scene.map((s) => [s.id, s.corrente])).toEqual([
      ['scena_ponte_imbrunire', true],
      ['scena_borgo_basso', false],
      ['scena_casa_del_sale', false],
      ['scena_terzo_tocco', false],
    ]);
    expect(entrata.stato.luoghi.filter((l) => l.tipo === 'scena').map((l) => l.id)).toHaveLength(4);
    // Le battute di altre scene non sono disponibili.
    expect(entrata.stato.repertorio!.disponibili.every((b) => b.scena === null || b.scena === 'scena_ponte_imbrunire')).toBe(true);

    const schermo = nuovoClient();
    await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
    schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
    const tel = nuovoClient();
    await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
    expect(await emetti<Esito>((cb) => tel.emit('telefono:scegli_pg', { id_pg: 'pg_dalia' }, cb))).toEqual({ ok: true });
    const mie: Array<AzionePrivata | null> = [];
    tel.on('azione:mia', (a) => mie.push(a));

    const finestra = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'finestra');
    await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
    await finestra;
    expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_dalia', testo: 'Tiro la catena.', versione_vista: 1 }, cb))).toEqual({ ok: true });

    // Scena sconosciuta o la stessa: rifiutate.
    expect(await comanda(master, { tipo: 'scena', scena: 'scena_inventata' })).toMatchObject({ ok: false });
    expect(await comanda(master, { tipo: 'scena', scena: 'scena_ponte_imbrunire' })).toMatchObject({ ok: false });

    const apertura = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'apertura' && s.tavolo.scena.luogo === 'scena_borgo_basso');
    const nuovaFinestra = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'finestra' && s.tavolo.scena.luogo === 'scena_borgo_basso', 10_000);
    // L'azione superata arriva al telefono sul SUO socket: si aspetta lì (sotto carico arriva dopo lo stato del master).
    const superata = attendi<AzionePrivata | null>(tel, 'azione:mia', (x) => x?.stato === 'superata');
    expect(await comanda(master, { tipo: 'scena', scena: 'scena_borgo_basso' })).toEqual({ ok: true });
    const a = await apertura;
    expect(a.tavolo.scena.titolo).toBe('Il Borgo Basso sott\'acqua');
    expect(a.scene.find((s) => s.corrente)?.id).toBe('scena_borgo_basso');
    expect(a.tavolo.trascrizione.some((v) => v.tipo === 'sistema' && v.testo.startsWith('Nuova scena: Il Borgo Basso'))).toBe(true);
    // L'azione scritta per il ponte torna al giocatore.
    expect(await superata).toMatchObject({ stato: 'superata', motivo: testo('regia.motivi.cambio_scena'), testo: 'Tiro la catena.' });

    const s = await nuovaFinestra;
    expect(s.orologi.map((o) => o.id)).toEqual(['o_piena']);
    expect(s.repertorio!.disponibili.length).toBeGreaterThan(0);
    expect(s.repertorio!.disponibili.every((b) => b.scena === null || b.scena === 'scena_borgo_basso')).toBe(true);
    expect(s.repertorio!.disponibili.some((b) => b.scena === 'scena_borgo_basso')).toBe(true);

    // Il prossimo turno del narratore ha il contesto della scena nuova.
    const turno = attendi<StatoMaster>(master, 'master:stato', (x) => x.tavolo.fase === 'finestra' && x.tavolo.turno > s.tavolo.turno);
    expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_dalia', testo: 'Busso alla porta del Ricovero.', versione_vista: s.tavolo.versione_scena }, cb))).toEqual({ ok: true });
    expect(await comanda(master, { tipo: 'chiudi_finestra' })).toEqual({ ok: true });
    await turno;
    expect(sistemi.at(-1)![1]).toContain('## Scena corrente: Il Borgo Basso');
    expect(sistemi.at(-1)![1]).not.toContain('## Scena corrente: Il Ponte delle Lanterne');
  });
});
