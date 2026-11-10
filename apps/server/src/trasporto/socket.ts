/**
 * Trasporto Socket.IO: traduce gli eventi dei client in comandi della regia e le uscite della
 * regia/pipeline in eventi verso le stanze.
 *
 * Stanze: "tavolo" (stato per tutti), "schermo" (audio), "player:<id_pg>" (azione privata),
 * "ascolto" e "ascolto:<id_pg>" (i telefoni con «Ascolta qui»: la voce anche lì; quella di un esito
 * privato solo al telefono del suo PG, mai al proiettore).
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
import { testo } from '../lingua';
import type { Logger } from '../logger';
import type { Regia, UscitaRegia } from '../scena/regia';
import type { UscitaAudio } from '../voce/pipeline';

export type ServerIo = Server<EventiClientVersoServer, EventiServerVersoClient>;
type SocketIo = Socket<EventiClientVersoServer, EventiServerVersoClient>;

export const STANZA_TAVOLO = 'tavolo';
export const STANZA_SCHERMO = 'schermo';
export const stanzaPg = (id_pg: string): string => `player:${id_pg}`;
export const STANZA_ASCOLTO = 'ascolto';
export const stanzaAscoltoPg = (id_pg: string): string => `ascolto:${id_pg}`;

/**
 * Uscita dell'audio verso proiettore e telefoni in ascolto. Una frase con `solo_pg` (e i suoi pezzi)
 * va solo ai telefoni di quel PG in ascolto: il proiettore non la riceve mai.
 */
export function creaUscitaAudio(io: ServerIo): UscitaAudio {
  const private_ = new Map<string, string>();
  const pubblico = () => io.to([STANZA_SCHERMO, STANZA_ASCOLTO]);
  const verso = (id_frase: string) => {
    const pg = private_.get(id_frase);
    return pg ? io.to(stanzaAscoltoPg(pg)) : pubblico();
  };
  return {
    // Qualcuno ascolta la voce privata di quel PG? Se no, la pipeline non la sintetizza nemmeno.
    inAscolto: (id_pg) => (io.sockets.adapter.rooms.get(stanzaAscoltoPg(id_pg))?.size ?? 0) > 0,
    frase: (m) => {
      if (m.solo_pg) private_.set(m.id_frase, m.solo_pg);
      verso(m.id_frase).emit('audio:frase', m);
    },
    pezzo: (p) => verso(p.id_frase).emit('audio:pezzo', p),
    fineFrase: (f) => {
      verso(f.id_frase).emit('audio:fine_frase', f);
      private_.delete(f.id_frase);
    },
    fineTurno: (f) => pubblico().emit('audio:fine_turno', f),
    interrompi: () => {
      private_.clear();
      pubblico().emit('audio:interrompi');
    },
  };
}

/** Uscite verso i client, da passare a regia e pipeline. */
export function creaUscite(io: ServerIo): { regia: UscitaRegia; audio: UscitaAudio } {
  return {
    regia: {
      stato: (s) => io.to(STANZA_TAVOLO).emit('stato', s),
      azioneMia: (id, a) => io.to(stanzaPg(id)).emit('azione:mia', a),
      metriche: (m) => io.to(STANZA_TAVOLO).emit('metriche:turno', m),
      avviso: (livello, testo) => io.to(STANZA_TAVOLO).emit('avviso', { livello, testo }),
      privati: (id, esiti) => io.to(stanzaPg(id)).emit('privato:esiti', esiti),
    },
    audio: creaUscitaAudio(io),
  };
}

const nessunAck = (): void => undefined;
function ack<T>(cb: unknown): (x: T) => void {
  return typeof cb === 'function' ? (cb as (x: T) => void) : nessunAck;
}
/** Errore per il telefono: una frase del pacchetto della lingua (sezione `socket`), composta alla richiesta. */
const errore = (chiave: 'scegli_pg' | 'richiesta_non_valida'): Esito => ({ ok: false, errore: testo(`socket.${chiave}`) });

export function collegaSocket(io: ServerIo, regia: Regia, info: () => InfoServer, log: Logger): void {
  /** socket.id → PG scelto (per controllare che il telefono agisca solo per il suo). */
  const pgDi = new Map<string, string>();
  /** Telefoni con «Ascolta qui» acceso (socket.id). */
  const inAscolto = new Set<string>();

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
      const esito = regia.telefonoSceglie(socket.id, id_pg, dati?.dispositivo);
      if (esito.ok) {
        const prima = pgDi.get(socket.id);
        if (prima && prima !== id_pg) void socket.leave(stanzaPg(prima));
        pgDi.set(socket.id, id_pg);
        void socket.join([STANZA_TAVOLO, stanzaPg(id_pg)]);
        // In ascolto: la voce privata segue il PG scelto.
        if (inAscolto.has(socket.id)) {
          if (prima && prima !== id_pg) void socket.leave(stanzaAscoltoPg(prima));
          void socket.join(stanzaAscoltoPg(id_pg));
        }
        socket.emit('azione:mia', regia.azioneDi(id_pg));
        socket.emit('privato:esiti', regia.esitiPrivati(id_pg));
        const scheda = regia.schedaPg(id_pg);
        if (scheda) socket.emit('pg:scheda', scheda);
      }
      ack<Esito>(cb)(esito);
    });

    socket.on('azione:invia', (dati, cb) => {
      const id_pg = controllaPg(dati?.id_pg);
      if (!id_pg) return ack<Esito>(cb)(errore('scegli_pg'));
      if (typeof dati.testo !== 'string' || typeof dati.versione_vista !== 'number') return ack<Esito>(cb)(errore('richiesta_non_valida'));
      const esito = regia.inviaAzione(id_pg, dati.testo, dati.versione_vista, dati.privata === true);
      log.info({ socket: socket.id, id_pg, ok: esito.ok, caratteri: dati.testo.length, privata: dati.privata === true }, 'azione: invio');
      ack<Esito>(cb)(esito);
    });

    socket.on('azione:conferma', (dati, cb) => {
      const id_pg = controllaPg(dati?.id_pg);
      if (!id_pg) return ack<Esito>(cb)(errore('scegli_pg'));
      ack<Esito>(cb)(regia.confermaAzione(id_pg));
    });

    socket.on('azione:scrivo', (dati) => {
      const id_pg = controllaPg(dati?.id_pg);
      if (id_pg) regia.scrivo(id_pg);
    });

    socket.on('azione:ritira', (dati, cb) => {
      const id_pg = controllaPg(dati?.id_pg);
      if (!id_pg) return ack<Esito>(cb)(errore('scegli_pg'));
      ack<Esito>(cb)(regia.ritiraAzione(id_pg));
    });

    socket.on('stato:richiedi', (cb) => ack(cb)(regia.stato()));

    socket.on('telefono:ascolta', (dati, cb) => {
      const attivo = dati?.attivo === true;
      const pg = pgDi.get(socket.id);
      const stanze = [STANZA_ASCOLTO, ...(pg ? [stanzaAscoltoPg(pg)] : [])];
      if (attivo) {
        inAscolto.add(socket.id);
        void socket.join(stanze);
      } else {
        inAscolto.delete(socket.id);
        for (const s of stanze) void socket.leave(s);
      }
      log.info({ socket: socket.id, id_pg: pg ?? null, attivo, in_ascolto: inAscolto.size }, 'telefono: ascolta qui');
      ack<Esito>(cb)({ ok: true });
    });

    socket.on('telefono:dispositivo', (dati, cb) => {
      const id_pg = regia.pgDelDispositivo(dati?.dispositivo);
      if (id_pg) log.info({ socket: socket.id, id_pg }, 'telefono: dispositivo riconosciuto');
      ack<{ id_pg: string | null }>(cb)({ id_pg });
    });

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
      inAscolto.delete(socket.id);
      regia.telefonoEsce(socket.id);
      regia.schermoEsce(socket.id);
    });
  });
}
