/**
 * Creation at the table over Socket.IO (docs/creazione.md): `creazione:azione` from a phone, keyed by its device token
 * (telefono/memoria: the same token that remembers the phone's PC), with the whole draft in the ack. The phone joins
 * the room of its draft, so a change it did not ask for (the Game Master approved a step, approved the PC) reaches it
 * as `creazione:bozza`. The client is not trusted: the service checks every field.
 */
import type { AzioneCreazione, EsitoCreazione, VistaCreazione } from '@tabletop-ai-gm/shared';
import type { Logger } from '../logger';
import { testo } from '../lingua';
import { DISPOSITIVO_CREAZIONE, type ServizioCreazione } from '../creazione/servizio';
import type { ServerIo } from './socket';

export const stanzaCreazione = (dispositivo: string): string => `creazione:${dispositivo}`;

/** The service's notice to a phone: its draft changed (by the Game Master). */
export function notificaCreazione(io: ServerIo): (dispositivo: string, vista: VistaCreazione) => void {
  return (dispositivo, vista) => io.to(stanzaCreazione(dispositivo)).emit('creazione:bozza', vista);
}

/**
 * Wires the phones' creation events. `servizio` null = the campaign has no creation at the table: every action is
 * refused with the reason (a phone of an older page, a hand-made request).
 */
export function collegaCreazione(io: ServerIo, servizio: ServizioCreazione | null, log: Logger): void {
  io.on('connection', (socket) => {
    socket.on('creazione:azione', (dati: { dispositivo?: unknown; azione?: unknown } | undefined, cb: unknown) => {
      const risposta = typeof cb === 'function' ? (cb as (e: EsitoCreazione) => void) : () => undefined;
      if (!servizio) return risposta({ ok: false, errore: testo('creazione.rifiuti.spenta'), bozza: null });
      const dispositivo = typeof dati?.dispositivo === 'string' && DISPOSITIVO_CREAZIONE.test(dati.dispositivo) ? dati.dispositivo : null;
      if (!dispositivo) return risposta({ ok: false, errore: testo('creazione.rifiuti.telefono'), bozza: null });
      void socket.join(stanzaCreazione(dispositivo));
      try {
        risposta(servizio.azione(dispositivo, dati?.azione as AzioneCreazione));
      } catch (err) {
        log.error({ err: (err as Error).message, telefono: dispositivo.slice(0, 6) }, 'creation: action failed');
        risposta({ ok: false, errore: testo('creazione.rifiuti.azione_sconosciuta'), bozza: servizio.vistaDi(dispositivo) });
      }
    });
  });
}
