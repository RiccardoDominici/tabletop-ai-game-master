/**
 * Stato del pannello del master: l'ultima istantanea `master:stato` (il server è l'unica fonte di
 * verità), il token e l'esito dell'ingresso, i comandi in attesa di ack e il loro esito per zona.
 *
 * Scritto da master/sessione.ts, letto dai componenti di master/. Il token qui è solo in memoria;
 * lo salva e lo legge master/token.ts (localStorage protetto).
 */
import { create } from 'zustand';
import type { StatoMaster, TipoComandoMaster } from '@tabletop-ai-gm/shared';
import { creaLog } from '../lib/log';
import { aggiornaScarto } from '../lib/orologioServer';
import type { ZonaComando } from '../master/comandi';
import { leggiSenzaSpoiler, salvaSenzaSpoiler } from '../master/spoiler';

const log = creaLog('master');

/** Quanto resta visibile la conferma di un comando riuscito (gli errori restano finché servono). */
const DURATA_ESITO_OK_MS = 4000;

export type Entrata =
  /** Nessun token (né nell'URL né salvato): si mostra il modulo. */
  | 'senza_token'
  /** Token presente, `master:entra` inviato (o in attesa della connessione). */
  | 'entrando'
  /** Il server ha accettato: arrivano le istantanee e si possono mandare comandi. */
  | 'dentro'
  /** Il server ha rifiutato il token: si mostra il modulo con l'errore. */
  | 'rifiutato';

/** Esito dell'ultimo comando di una zona (o dell'ultimo errore in assoluto). */
export interface EsitoComando {
  /** Progressivo: serve a non cancellare un esito più nuovo allo scadere del timer. */
  id: number;
  ok: boolean;
  tipo: TipoComandoMaster;
  /** Cosa si è chiesto («Orologio Il colpevole fugge +1»). */
  descrizione: string;
  /** Errore del server (italiano) se `ok` è false. */
  errore: string | null;
  /** Epoch ms locale della risposta. */
  ts: number;
}

interface StoreMaster {
  stato: StatoMaster | null;
  token: string | null;
  entrata: Entrata;
  /** Motivo del rifiuto dell'ultimo `master:entra` (da mostrare sotto il modulo). */
  erroreEntrata: string | null;
  /** Chiavi dei comandi in attesa di ack (master/comandi.ts, chiaveComando). */
  inCorso: Readonly<Record<string, true>>;
  /** Ultimo esito per zona, mostrato vicino ai pulsanti di quella zona. */
  esiti: Partial<Record<ZonaComando, EsitoComando>>;
  /** Ultimo errore di un comando (master-errore); si toglie al prossimo comando riuscito. */
  ultimoErrore: EsitoComando | null;
  /** Modalità «senza spoiler» (master/spoiler.ts): attiva per default, salvata in localStorage. */
  senzaSpoiler: boolean;

  /**
   * Applica un'istantanea. Le più vecchie di quella che abbiamo (per `tavolo.versione_stato`) si
   * ignorano, tranne con `forza`: all'ingresso si accetta sempre la risposta, perché un server
   * riavviato riparte da versione 0.
   */
  applicaStato(stato: StatoMaster, forza?: boolean): void;
  impostaToken(token: string | null): void;
  impostaEntrata(entrata: Entrata, errore?: string | null): void;
  iniziaComando(chiave: string): void;
  concludiComando(chiave: string, zona: ZonaComando, esito: Omit<EsitoComando, 'id' | 'ts'>): void;
  togliEsito(zona: ZonaComando): void;
  togliUltimoErrore(): void;
  impostaSenzaSpoiler(attiva: boolean): void;
}

let prossimoId = 1;

export const useMaster = create<StoreMaster>()((set, get) => ({
  stato: null,
  token: null,
  entrata: 'senza_token',
  erroreEntrata: null,
  inCorso: {},
  esiti: {},
  ultimoErrore: null,
  senzaSpoiler: leggiSenzaSpoiler(),

  applicaStato: (stato, forza = false) => {
    const attuale = get().stato;
    if (!forza && attuale && stato.tavolo.versione_stato < attuale.tavolo.versione_stato) {
      log.debug('Istantanea del master più vecchia ignorata', {
        arrivata: stato.tavolo.versione_stato,
        attuale: attuale.tavolo.versione_stato,
      });
      return;
    }
    // Conti alla rovescia (chiusura della finestra) sull'orologio del server, come store/tavolo.ts.
    aggiornaScarto(stato.tavolo.ora_server_ms);
    set({ stato });
  },

  impostaToken: (token) => set({ token }),

  impostaEntrata: (entrata, errore = null) => {
    // Fuori dal pannello non si tiene un'istantanea vecchia (potrebbe ingannare il master).
    if (entrata === 'rifiutato' || entrata === 'senza_token') set({ entrata, erroreEntrata: errore, stato: null });
    else set({ entrata, erroreEntrata: errore });
  },

  iniziaComando: (chiave) => set({ inCorso: { ...get().inCorso, [chiave]: true } }),

  concludiComando: (chiave, zona, esito) => {
    const completo: EsitoComando = { ...esito, id: prossimoId++, ts: Date.now() };
    const { [chiave]: _finito, ...ancoraInCorso } = get().inCorso;
    set({
      inCorso: ancoraInCorso,
      esiti: { ...get().esiti, [zona]: completo },
      // Un comando riuscito dice che il pannello funziona: l'ultimo errore non è più attuale.
      ultimoErrore: completo.ok ? null : completo,
    });
    if (completo.ok) {
      window.setTimeout(() => {
        if (get().esiti[zona]?.id === completo.id) get().togliEsito(zona);
      }, DURATA_ESITO_OK_MS);
    }
  },

  togliEsito: (zona) => {
    const { [zona]: _tolto, ...resto } = get().esiti;
    set({ esiti: resto });
  },

  togliUltimoErrore: () => set({ ultimoErrore: null }),

  impostaSenzaSpoiler: (senzaSpoiler) => {
    salvaSenzaSpoiler(senzaSpoiler);
    log.info(senzaSpoiler ? 'Pannello senza spoiler' : 'Pannello con gli spoiler (segni, private, battute)');
    set({ senzaSpoiler });
  },
}));

/** La modalità «senza spoiler» è attiva. */
export function useSenzaSpoiler(): boolean {
  return useMaster((s) => s.senzaSpoiler);
}

/** Il comando con questa chiave (master/comandi.ts, chiaveComando) aspetta ancora l'ack. */
export function useInCorso(chiave: string): boolean {
  return useMaster((s) => s.inCorso[chiave] === true);
}
