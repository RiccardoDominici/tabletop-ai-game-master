/**
 * Applicazione HTTP: Fastify (pagine web compilate + piccole API) e Socket.IO sullo stesso
 * server, porta unica 4610 (docs/f0-contratti.md, «Porte»).
 *
 * Rotte:
 * - GET  /api/salute            stato sintetico (fase, turno, voce, narratore)
 * - GET  /api/info              URL per telefoni/schermo e QR
 * - POST /api/scena/ferma       ferma LLM e voce
 * - POST /api/scena/ricomincia  riparte dall'apertura
 * - GET  /telefono, /schermo    pagine React (fallback SPA su index.html)
 */
import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import type { InfoServer } from '@cantastorie/shared';
import { testo } from './lingua';
import type { Logger } from './logger';
import type { Regia } from './scena/regia';
import type { ServerIo } from './trasporto/socket';
import type { CatalogoImmagini } from './campagna/immagini';
import { CatalogoAudio } from './audio/catalogo';

export interface OpzioniApp {
  log: Logger;
  cartellaWeb: string;
}

export interface App {
  http: FastifyInstance;
  io: ServerIo;
}

/** Crea Fastify e Socket.IO (le rotte che dipendono dalla regia si aggiungono con `registraRotte`). */
export async function creaApp(o: OpzioniApp): Promise<App> {
  // Il logger pino ha un tipo più ricco di FastifyBaseLogger: si restringe a FastifyInstance standard.
  const http = Fastify({ loggerInstance: o.log.child({ modulo: 'http' }), disableRequestLogging: true }) as unknown as FastifyInstance;
  const io: ServerIo = new Server(http.server, { path: '/socket.io', serveClient: false, pingInterval: 10_000, pingTimeout: 8_000 });

  const indice = path.join(o.cartellaWeb, 'index.html');
  if (fs.existsSync(indice)) {
    await http.register(fastifyStatic, { root: o.cartellaWeb, wildcard: false, index: false });
    o.log.info({ cartella: o.cartellaWeb }, 'web: pagine compilate servite');
  } else {
    o.log.warn({ cartella: o.cartellaWeb }, 'web: pagine non compilate (npm run build), servo solo le API');
  }

  // Fallback SPA: le rotte del client (/telefono, /schermo, /) servono index.html.
  http.setNotFoundHandler((req, reply) => {
    const url = req.url.split('?')[0] ?? '/';
    if (req.method === 'GET' && !url.startsWith('/api') && !url.startsWith('/socket.io') && fs.existsSync(indice)) {
      return reply.type('text/html; charset=utf-8').sendFile('index.html');
    }
    return reply.status(404).send({ errore: testo('api.risorsa_non_trovata') });
  });

  return { http, io };
}

/** Gli errori delle API sono frasi del pacchetto della lingua (sezione `api`), composte alla richiesta. */
export function registraRotte(
  app: App,
  regia: Regia,
  info: () => InfoServer,
  extra: () => Record<string, unknown>,
  immagini?: CatalogoImmagini,
  audio?: CatalogoAudio,
): void {
  const { http } = app;
  registraRotteAudio(app, regia, audio);
  // Immagini della campagna: solo i file del manifest, con cache (non cambiano durante la sessione).
  http.get<{ Params: { file: string } }>('/api/immagini/:file', async (req, reply) => {
    const p = immagini?.percorso(req.params.file);
    if (!p) return reply.status(404).send({ errore: testo('api.immagine_non_trovata') });
    const tipo = p.endsWith('.png') ? 'image/png' : p.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    return reply.type(tipo).header('cache-control', 'public, max-age=3600').send(fs.createReadStream(p));
  });
  // Cambio di luogo (pannello del master, prove): lo schermo fa la dissolvenza sull'immagine nuova.
  http.post<{ Body: { luogo?: unknown } }>('/api/scena/luogo', async (req, reply) => {
    const luogo = typeof req.body?.luogo === 'string' ? req.body.luogo : '';
    if (!/^[a-z0-9_]{1,64}$/.test(luogo)) return reply.status(400).send({ ok: false, errore: testo('api.luogo_non_valido') });
    return regia.cambiaLuogo(luogo);
  });
  http.get('/api/salute', async () => {
    const s = regia.stato();
    return { ok: true, fase: s.fase, turno: s.turno, versione_scena: s.versione_scena, voce: s.voce_motore, schermo: s.schermo_connesso, ...extra() };
  });
  http.get('/api/info', async () => info());
  http.post('/api/scena/ferma', async () => regia.ferma('api'));
  http.post('/api/scena/ricomincia', async () => regia.ricomincia());
}

/**
 * Audio della campagna (docs/audio.md): catalogo pubblico, file del manifest (con cache: non
 * cambiano durante la sessione; il proiettore li scarica interi con fetch) e cambio d'umore musicale.
 */
function registraRotteAudio(app: App, regia: Regia, audio?: CatalogoAudio): void {
  const { http } = app;
  http.get('/api/audio', async () => audio?.pubblico() ?? { tracce: {}, crediti: [] });
  http.get<{ Params: { file: string } }>('/api/audio/:file', async (req, reply) => {
    const p = audio?.percorso(req.params.file);
    if (!p) return reply.status(404).send({ errore: testo('api.audio_non_trovato') });
    return reply.type(CatalogoAudio.mime(p)).header('cache-control', 'public, max-age=3600').send(fs.createReadStream(p));
  });
  // Umore musicale (pannello del master, Motore, prove): null torna alla musica del luogo.
  http.post<{ Body: { umore?: unknown } }>('/api/scena/umore', async (req, reply) => {
    const umore = req.body?.umore;
    if (umore !== null && (typeof umore !== 'string' || !/^[a-z0-9_]{1,64}$/.test(umore))) return reply.status(400).send({ ok: false, errore: testo('api.umore_non_valido') });
    return regia.cambiaUmore(umore);
  });
}
