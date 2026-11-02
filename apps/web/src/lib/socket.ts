/**
 * Un solo Socket.IO tipizzato per tutta la pagina (stessa origine, path /socket.io).
 *
 * - In sviluppo passa dal proxy di Vite (:4612 → :4610); in produzione la pagina è servita dal
 *   server stesso, quindi l'origine coincide comunque.
 * - Prima WebSocket (latenza minima per l'audio), con ricaduta sul long-polling se fallisce.
 * - Socket.IO si riconnette da solo; a ogni (ri)connessione si rieseguono i «rientri» registrati
 *   dal ruolo della pagina: il telefono rifà `telefono:entra` e riprende il suo PG, lo schermo rifà
 *   `schermo:osserva` (e `schermo:inizia` se l'audio era già sbloccato). Il server risponde con
 *   istantanee complete, quindi non serve altra logica di ripresa.
 * - Gli eventi con ack passano da `conEsito`/`chiedi`: timeout esplicito e niente invii «in coda»
 *   mentre si è disconnessi (un'azione bufferizzata e spedita minuti dopo sarebbe sbagliata).
 */
import { io, type Socket } from 'socket.io-client';
import type { Esito, EventiClientVersoServer, EventiServerVersoClient } from '@cantastorie/shared';
import { creaLog } from './log';
import { useConnessione } from '../store/connessione';

const log = creaLog('socket');

export type SocketTavolo = Socket<EventiServerVersoClient, EventiClientVersoServer>;
/** Il socket dopo `.timeout(ms)`: gli ack ricevono prima l'eventuale errore di timeout. */
export type SocketConTimeout = ReturnType<SocketTavolo['timeout']>;

/** Oltre questo tempo un ack mancato si considera perso. */
export const TIMEOUT_ACK_MS = 6000;

let socket: SocketTavolo | null = null;
const rientri = new Set<() => void>();

/** Restituisce il socket condiviso, creandolo e connettendolo alla prima chiamata. */
export function prendiSocket(): SocketTavolo {
  if (socket) return socket;

  const s: SocketTavolo = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
    autoConnect: false,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  });

  s.on('connect', () => {
    useConnessione.getState().imposta('connesso');
    log.info('Connesso al server', { id: s.id, trasporto: s.io.engine.transport.name });
    for (const rientra of rientri) {
      try {
        rientra();
      } catch (errore) {
        log.error('Rientro fallito', errore);
      }
    }
  });

  s.on('disconnect', (motivo) => {
    useConnessione.getState().imposta('persa');
    // Prevista (Wi-Fi, server riavviato): warn, non error.
    log.warn('Connessione persa, Socket.IO riprova da solo', { motivo });
  });

  s.on('connect_error', (errore) => {
    const { stato, tentativi } = useConnessione.getState();
    useConnessione.getState().imposta(stato === 'connesso' ? 'persa' : stato, tentativi + 1);
    log.warn('Server non raggiungibile', { messaggio: errore.message });
  });

  s.io.on('reconnect_attempt', (tentativo) => {
    useConnessione.getState().imposta('persa', tentativo);
    log.debug('Tentativo di riconnessione', { tentativo });
  });

  socket = s;
  s.connect();
  return s;
}

/**
 * Registra una funzione da rieseguire a ogni (ri)connessione; se si è già connessi la esegue
 * subito. Restituisce la funzione per toglierla.
 */
export function alRientro(rientra: () => void): () => void {
  rientri.add(rientra);
  const s = prendiSocket();
  if (s.connected) rientra();
  return () => {
    rientri.delete(rientra);
  };
}

/** Esito d'errore pronto da mostrare (italiano, rivolto al giocatore). */
export function esitoErrore(errore: string): Esito {
  return { ok: false, errore };
}

/**
 * Emette un evento con ack `Esito`, con timeout. Non bufferizza: se non si è connessi risponde
 * subito con un errore leggibile.
 *
 * @example conEsito((s, fine) => s.emit('azione:ritira', { id_pg }, fine))
 */
export function conEsito(
  emetti: (s: SocketConTimeout, fine: (errore: Error | null, esito?: Esito) => void) => void,
): Promise<Esito> {
  if (!prendiSocket().connected) return Promise.resolve(esitoErrore(MESSAGGIO_NON_CONNESSO));
  return chiedi<Esito>(emetti).then(
    (esito) => esito ?? esitoErrore('Risposta vuota dal server.'),
    () => esitoErrore('Il server non ha risposto in tempo: riprova.'),
  );
}

/**
 * Emette un evento con ack di qualunque tipo; la Promise si rifiuta su timeout o se si è
 * disconnessi. Usata per le richieste di stato (`telefono:entra`, `schermo:osserva`).
 */
export function chiedi<T>(
  emetti: (s: SocketConTimeout, fine: (errore: Error | null, risposta?: T) => void) => void,
): Promise<T | undefined> {
  return new Promise<T | undefined>((risolvi, rifiuta) => {
    const s = prendiSocket();
    if (!s.connected) {
      rifiuta(new Error('Non connesso al server'));
      return;
    }
    emetti(s.timeout(TIMEOUT_ACK_MS), (errore, risposta) => {
      if (errore) {
        log.warn('Ack non arrivato in tempo', { messaggio: errore.message });
        rifiuta(errore);
        return;
      }
      risolvi(risposta);
    });
  });
}

/** Errore mostrato quando un'azione parte senza connessione. */
export const MESSAGGIO_NON_CONNESSO = 'Non sei connesso al tavolo: riprova tra un attimo.';
