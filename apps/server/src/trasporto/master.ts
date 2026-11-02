/**
 * Trasporto del pannello del master: stanza Socket.IO "master", protetta dal token stampato nel
 * log del server all'avvio. Un socket entra solo con `master:entra` e il token giusto; i comandi
 * di chi non è entrato si rifiutano. I telefoni non conoscono il token, quindi non possono
 * entrare né ricevere `master:stato` (che porta le azioni private e i segni degli orologi).
 */
import type { Socket } from 'socket.io';
import type { EsitoEntrataMaster, Esito, EventiClientVersoServer, EventiServerVersoClient } from '@cantastorie/shared';
import type { Logger } from '../logger';
import type { ControlliMaster } from '../master/comandi';
import { tokenValido } from '../master/token';
import type { Regia } from '../scena/regia';
import type { ServerIo } from './socket';
import { STANZA_TAVOLO } from './socket';

export const STANZA_MASTER = 'master';
/** Tentativi sbagliati prima di chiudere il socket (contro chi prova i token a caso). */
const TENTATIVI_MAX = 5;

type SocketIo = Socket<EventiClientVersoServer, EventiServerVersoClient>;

const nessunAck = (): void => undefined;
function ack<T>(cb: unknown): (x: T) => void {
  return typeof cb === 'function' ? (cb as (x: T) => void) : nessunAck;
}

export function collegaMaster(io: ServerIo, regia: Regia, controlli: ControlliMaster, token: string, log: Logger): void {
  /** socket.id dei pannelli entrati col token. */
  const pannelli = new Set<string>();

  // Un'istantanea per «giro» dell'event loop: la regia notifica a ogni frase, il pannello non
  // ha bisogno di dieci copie uguali nello stesso millisecondo.
  let programmato = false;
  const invia = (): void => {
    if (programmato || pannelli.size === 0) return;
    programmato = true;
    setImmediate(() => {
      programmato = false;
      if (pannelli.size > 0) io.to(STANZA_MASTER).emit('master:stato', controlli.stato());
    });
  };
  regia.alCambio(invia);

  io.on('connection', (socket: SocketIo) => {
    let sbagliati = 0;

    socket.on('master:entra', (dati, cb) => {
      const rispondi = ack<EsitoEntrataMaster>(cb);
      if (!tokenValido(token, dati?.token)) {
        sbagliati += 1;
        log.warn({ socket: socket.id, indirizzo: socket.handshake.address, tentativi: sbagliati }, 'master: token sbagliato');
        rispondi({ ok: false, errore: 'Token del master non valido: copialo dal log del server.' });
        if (sbagliati >= TENTATIVI_MAX) socket.disconnect(true);
        return;
      }
      pannelli.add(socket.id);
      // Il pannello vede anche gli avvisi del tavolo (narratore che non risponde…).
      void socket.join([STANZA_MASTER, STANZA_TAVOLO]);
      log.info({ evento: 'master', socket: socket.id, indirizzo: socket.handshake.address, pannelli: pannelli.size }, 'master: pannello entrato');
      rispondi({ ok: true, stato: controlli.stato() });
    });

    socket.on('master:comando', (comando, cb) => {
      const rispondi = ack<Esito>(cb);
      if (!pannelli.has(socket.id)) {
        log.warn({ socket: socket.id, indirizzo: socket.handshake.address }, 'master: comando senza token, rifiutato');
        return rispondi({ ok: false, errore: 'Prima entra nel pannello del master col token.' });
      }
      const esito = controlli.esegui(comando, socket.id);
      rispondi(esito);
      // Anche un rifiuto cambia il registro degli eventi del pannello.
      invia();
    });

    socket.on('disconnect', () => {
      if (pannelli.delete(socket.id)) log.info({ evento: 'master', socket: socket.id, pannelli: pannelli.size }, 'master: pannello uscito');
    });
  });
}
