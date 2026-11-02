/**
 * Trasporto Socket.IO: traduce gli eventi dei client in comandi della regia e le uscite della
 * regia/pipeline in eventi verso le stanze.
 *
 * Stanze: "tavolo" (stato per tutti), "schermo" (audio), "player:<id_pg>" (azione privata).
 * I client non sono fidati: ogni dato in ingresso viene controllato, e un telefono può agire
 * solo per il PG che ha scelto.
 */
import type { Server, Socket } from 'socket.io';
import type {
  Esito,
  EventiClientVersoServer,
  EventiServerVersoClient,
  InfoServer,
} from '@cantastorie/shared';
import type { Logger } from '../logger';
import type { Regia, UscitaRegia } from '../scena/regia';
import type { UscitaAudio } from '../voce/pipeline';

export type ServerIo = Server<EventiClientVersoServer, EventiServerVersoClient>;
type SocketIo = Socket<EventiClientVersoServer, EventiServerVersoClient>;

export const STANZA_TAVOLO = 'tavolo';
export const STANZA_SCHERMO = 'schermo';
export const stanzaPg = (id_pg: string): string => `player:${id_pg}`;

/** Uscite verso i client, da passare a regia e pipeline. */
export function creaUscite(io: ServerIo): { regia: UscitaRegia; audio: UscitaAudio } {
  return {
    regia: {
      stato: (s) => io.to(STANZA_TAVOLO).emit('stato', s),
      azioneMia: (id, a) => io.to(stanzaPg(id)).emit('azione:mia', a),
      metriche: (m) => io.to(STANZA_TAVOLO).emit('metriche:turno', m),
      avviso: (livello, testo) => io.to(STANZA_TAVOLO).emit('avviso', { livello, testo }),
    },
    audio: {
      frase: (m) => io.to(STANZA_SCHERMO).emit('audio:frase', m),
      pezzo: (p) => io.to(STANZA_SCHERMO).emit('audio:pezzo', p),
      fineFrase: (f) => io.to(STANZA_SCHERMO).emit('audio:fine_frase', f),
      fineTurno: (f) => io.to(STANZA_SCHERMO).emit('audio:fine_turno', f),
      interrompi: () => io.to(STANZA_SCHERMO).emit('audio:interrompi'),
    },
  };
}

const nessunAck = (): void => undefined;
function ack<T>(cb: unknown): (x: T) => void {
  return typeof cb === 'function' ? (cb as (x: T) => void) : nessunAck;
}
const errore = (testo: string): Esito => ({ ok: false, errore: testo });

export function collegaSocket(io: ServerIo, regia: Regia, info: () => InfoServer, log: Logger): void {
  /** socket.id → PG scelto (per controllare che il telefono agisca solo per il suo). */
  const pgDi = new Map<string, string>();

  io.on('connection', (socket: SocketIo) => {
    const indirizzo = socket.handshake.address;
    log.info({ socket: socket.id, indirizzo }, 'socket: connesso');

    const controllaPg = (id_pg: unknown): string | null =>
      typeof id_pg === 'string' && pgDi.get(socket.id) === id_pg ? id_pg : null;

    socket.on('telefono:entra', (cb) => {
      void socket.join(STANZA_TAVOLO);
      ack(cb)(regia.stato());
    });

    socket.on('telefono:scegli_pg', (dati, cb) => {
      const id_pg = typeof dati?.id_pg === 'string' ? dati.id_pg : '';
      const esito = regia.telefonoSceglie(socket.id, id_pg);
      if (esito.ok) {
        const prima = pgDi.get(socket.id);
        if (prima && prima !== id_pg) void socket.leave(stanzaPg(prima));
        pgDi.set(socket.id, id_pg);
        void socket.join([STANZA_TAVOLO, stanzaPg(id_pg)]);
        socket.emit('azione:mia', regia.azioneDi(id_pg));
        const scheda = regia.schedaPg(id_pg);
        if (scheda) socket.emit('pg:scheda', scheda);
      }
      ack<Esito>(cb)(esito);
    });

    socket.on('azione:invia', (dati, cb) => {
      const id_pg = controllaPg(dati?.id_pg);
      if (!id_pg) return ack<Esito>(cb)(errore('Prima scegli il tuo personaggio.'));
      if (typeof dati.testo !== 'string' || typeof dati.versione_vista !== 'number') return ack<Esito>(cb)(errore('Richiesta non valida.'));
      const esito = regia.inviaAzione(id_pg, dati.testo, dati.versione_vista, dati.privata === true);
      log.info({ socket: socket.id, id_pg, ok: esito.ok, caratteri: dati.testo.length, privata: dati.privata === true }, 'azione: invio');
      ack<Esito>(cb)(esito);
    });

    socket.on('azione:conferma', (dati, cb) => {
      const id_pg = controllaPg(dati?.id_pg);
      if (!id_pg) return ack<Esito>(cb)(errore('Prima scegli il tuo personaggio.'));
      ack<Esito>(cb)(regia.confermaAzione(id_pg));
    });

    socket.on('azione:scrivo', (dati) => {
      const id_pg = controllaPg(dati?.id_pg);
      if (id_pg) regia.scrivo(id_pg);
    });

    socket.on('azione:ritira', (dati, cb) => {
      const id_pg = controllaPg(dati?.id_pg);
      if (!id_pg) return ack<Esito>(cb)(errore('Prima scegli il tuo personaggio.'));
      ack<Esito>(cb)(regia.ritiraAzione(id_pg));
    });

    socket.on('azione:pronto', (dati, cb) => {
      const id_pg = controllaPg(dati?.id_pg);
      if (!id_pg) return ack<Esito>(cb)(errore('Prima scegli il tuo personaggio.'));
      ack<Esito>(cb)(regia.segnaPronto(id_pg, dati.pronto === true));
    });

    socket.on('stato:richiedi', (cb) => ack(cb)(regia.stato()));

    socket.on('schermo:osserva', (cb) => {
      void socket.join(STANZA_TAVOLO);
      ack(cb)({ stato: regia.stato(), info: info() });
    });

    socket.on('schermo:inizia', (cb) => {
      void socket.join([STANZA_TAVOLO, STANZA_SCHERMO]);
      ack<Esito>(cb)(regia.schermoInizia(socket.id));
    });

    socket.on('schermo:audio_iniziato', (dati) => {
      if (typeof dati?.turno !== 'number' || typeof dati.ritardo_ms !== 'number') return;
      regia.schermoAudioIniziato(dati, performance.now());
    });

    socket.on('schermo:audio_finito', (dati) => {
      if (typeof dati?.turno !== 'number' || typeof dati.ritardo_ms !== 'number') return;
      regia.schermoAudioFinito(dati, performance.now());
    });

    socket.on('scena:ferma', (cb) => ack<Esito>(cb)(regia.ferma('schermo')));
    socket.on('scena:ricomincia', (cb) => ack<Esito>(cb)(regia.ricomincia()));

    socket.on('disconnect', (motivo) => {
      log.info({ socket: socket.id, motivo }, 'socket: disconnesso');
      pgDi.delete(socket.id);
      regia.telefonoEsce(socket.id);
      regia.schermoEsce(socket.id);
    });
  });
}
