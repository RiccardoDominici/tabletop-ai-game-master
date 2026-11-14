/**
 * HTTP routes of the phone dictation (docs/ascolto.md, «The endpoint»).
 *
 *   GET  /api/dettato   {attivo, provider, max_secondi, max_byte}: the phone shows the microphone only when `attivo`.
 *   POST /api/dettato   body = the recording (audio/webm, audio/mp4, audio/ogg, audio/wav…), headers
 *                       `x-tagm-socket` (the phone's Socket.IO id) and `x-tagm-pg` (its PC). Same trust rule as the
 *                       socket events: the phone may dictate only for the PC it chose on that connection.
 *                       → RispostaDettato {testo, correzioni, secondi, provider, ms} or {errore, codice}.
 *
 * The body is raw binary (no multipart): the phone posts the Blob from MediaRecorder as it is. Errors are sentences of
 * the language pack (section `api`), with a `codice` the phone maps to its own interface language.
 */
import type { FastifyInstance } from 'fastify';
import { testo } from '../lingua';
import type { Logger } from '../logger';
import { ErroreDettato, MAX_BYTE, MAX_SECONDI, type CodiceErrore, type ServizioDettato } from '../dettato/servizio';

const STATO_HTTP: Record<CodiceErrore, number> = {
  spento: 503,
  vuoto: 400,
  troppo_lungo: 413,
  occupato: 429,
  troppe: 429,
  formato: 415,
  non_disponibile: 503,
};

export function registraRotteDettato(
  http: FastifyInstance,
  o: { servizio: ServizioDettato; pgDelSocket: (socketId: string) => string | null; log: Logger },
): void {
  // Raw audio bodies, only on these content types (the other routes keep their JSON parser).
  http.addContentTypeParser(/^(audio\/|application\/octet-stream)/, { parseAs: 'buffer', bodyLimit: MAX_BYTE + 64_000 }, (_req, corpo, fatto) => fatto(null, corpo));

  http.get('/api/dettato', async () => ({ attivo: o.servizio.attivo, provider: o.servizio.provider, max_secondi: MAX_SECONDI, max_byte: MAX_BYTE }));

  http.post('/api/dettato', { bodyLimit: MAX_BYTE + 64_000 }, async (req, reply) => {
    const socketId = String(req.headers['x-tagm-socket'] ?? '');
    const idPg = String(req.headers['x-tagm-pg'] ?? '');
    if (!socketId || !idPg || o.pgDelSocket(socketId) !== idPg) {
      o.log.warn({ id_pg: idPg || null, socket: socketId ? 'unknown' : 'missing' }, 'dictation: refused, the phone has not chosen this PC');
      return reply.status(403).send({ errore: testo('socket.scegli_pg'), codice: 'scegli_pg' });
    }
    const corpo = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    try {
      return await o.servizio.trascrivi(idPg, corpo, String(req.headers['content-type'] ?? '').split(';')[0] ?? '');
    } catch (err) {
      if (!(err instanceof ErroreDettato)) {
        o.log.error({ id_pg: idPg, err: (err as Error).message }, 'dictation: unexpected error');
        return reply.status(500).send({ errore: testo('api.dettato_non_disponibile'), codice: 'non_disponibile' });
      }
      return reply.status(STATO_HTTP[err.codice]).send({ errore: testo(`api.dettato_${err.codice}`, { secondi: MAX_SECONDI }), codice: err.codice });
    }
  });
}
