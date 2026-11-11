/**
 * Stato del tavolo così come lo manda il server (unica fonte di verità), più le informazioni di
 * rete per il QR e l'ultima misura di latenza. Condiviso da telefono e schermo.
 */
import { create } from 'zustand';
import type { InfoServer, MisureTurno, StatoTavolo } from '@tabletop-ai-gm/shared';
import { creaLog } from '../lib/log';
import { aggiornaScarto } from '../lib/orologioServer';

const log = creaLog('tavolo');

interface StoreTavolo {
  stato: StatoTavolo | null;
  info: InfoServer | null;
  metriche: MisureTurno | null;
  /**
   * Applica un'istantanea. Le istantanee più vecchie di quella che abbiamo si ignorano
   * (possono arrivare fuori ordine tra ack e broadcast), tranne con `forza`: alla
   * (ri)connessione si accetta sempre la risposta, perché un server riavviato riparte da 0.
   */
  applicaStato(stato: StatoTavolo, forza?: boolean): void;
  impostaInfo(info: InfoServer): void;
  impostaMetriche(misure: MisureTurno): void;
}

export const useTavolo = create<StoreTavolo>()((set, get) => ({
  stato: null,
  info: null,
  metriche: null,
  applicaStato: (stato, forza = false) => {
    const attuale = get().stato;
    if (!forza && attuale && stato.versione_stato < attuale.versione_stato) {
      log.debug('Stato più vecchio ignorato', {
        arrivato: stato.versione_stato,
        attuale: attuale.versione_stato,
      });
      return;
    }
    aggiornaScarto(stato.ora_server_ms);
    set({ stato });
  },
  impostaInfo: (info) => set({ info }),
  impostaMetriche: (metriche) => set({ metriche }),
}));
