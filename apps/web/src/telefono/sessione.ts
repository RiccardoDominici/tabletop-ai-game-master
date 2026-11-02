/**
 * Il telefono al tavolo: ascolto degli eventi, rientro a ogni (ri)connessione e comandi
 * (scelta del PG, invio/ritiro dell'azione, «pronto»).
 *
 * Rientro: `telefono:entra` (stato completo, accettato anche se la versione è più bassa: il server
 * può essere stato riavviato) e poi di nuovo `telefono:scegli_pg` col PG ricordato, così il telefono
 * rientra nella stanza player:<id_pg> e riceve di nuovo `azione:mia`.
 */
import type { AzionePrivata, Esito, SchedaPg, StatoTavolo } from '@cantastorie/shared';
import { alRientro, chiedi, conEsito, esitoErrore, prendiSocket } from '../lib/socket';
import { creaLog } from '../lib/log';
import { useTavolo } from '../store/tavolo';
import { useTelefono } from '../store/telefono';
import { useAvvisi } from '../store/avvisi';

const log = creaLog('telefono');

/** Lunghezza massima di un'azione (stessa regola del server). */
export const MASSIMO_CARATTERI_AZIONE = 500;

const suStato = (stato: StatoTavolo) => useTavolo.getState().applicaStato(stato);
const suMiaAzione = (azione: AzionePrivata | null) => {
  log.debug('Azione privata aggiornata', azione);
  useTelefono.getState().impostaMiaAzione(azione);
};
/**
 * La scheda arriva solo a questo telefono (stanza player:<id_pg>): può contenere segreti del PG.
 * Arriva PRIMA dell'ack di `telefono:scegli_pg`, quando idPg non è ancora aggiornato: la si tiene
 * comunque, e la pagina la mostra solo se è quella del PG scelto.
 */
const suScheda = (scheda: SchedaPg) => useTelefono.getState().impostaScheda(scheda);
const suAvviso = (avviso: { livello: 'info' | 'errore'; testo: string }) =>
  useAvvisi.getState().aggiungi(avviso.livello, avviso.testo);

/** Al rientro: stato completo, poi si riprende il PG ricordato (se esiste ancora). */
async function rientra(): Promise<void> {
  let stato: StatoTavolo | undefined;
  try {
    stato = await chiedi<StatoTavolo>((s, fine) => s.emit('telefono:entra', fine));
  } catch {
    // Timeout: la prossima riconnessione (o il prossimo broadcast) rimetterà le cose a posto.
    return;
  }
  if (!stato) return;
  useTavolo.getState().applicaStato(stato, true);

  const { idPg } = useTelefono.getState();
  if (!idPg) return;
  if (!stato.pg.some((pg) => pg.id === idPg)) {
    // Campagna cambiata: il PG ricordato non esiste più.
    log.info('PG ricordato non più presente, si sceglie di nuovo', { idPg });
    useTelefono.getState().dimenticaPg();
    return;
  }
  const esito = await scegliPg(idPg);
  if (!esito.ok) log.warn('Ripresa del PG rifiutata', esito);
}

let avvii = 0;
let togliRientro: (() => void) | null = null;

/**
 * Collega il telefono al tavolo. Contato: con React StrictMode gli effetti partono, si fermano e
 * ripartono, quindi gli ascoltatori si tolgono solo all'ultimo arresto.
 */
export function avviaTelefono(): () => void {
  avvii += 1;
  if (avvii === 1) {
    const s = prendiSocket();
    s.on('stato', suStato);
    s.on('azione:mia', suMiaAzione);
    s.on('pg:scheda', suScheda);
    s.on('avviso', suAvviso);
    togliRientro = alRientro(() => void rientra());
  }
  return () => {
    avvii -= 1;
    if (avvii > 0) return;
    const s = prendiSocket();
    s.off('stato', suStato);
    s.off('azione:mia', suMiaAzione);
    s.off('pg:scheda', suScheda);
    s.off('avviso', suAvviso);
    togliRientro?.();
    togliRientro = null;
  };
}

/** Esegue un comando con ack tenendo aggiornati «occupato» ed «errore» nello store. */
async function comando(nome: string, invia: () => Promise<Esito>): Promise<Esito> {
  const store = useTelefono.getState();
  store.impostaOccupato(true);
  store.impostaErrore(null);
  try {
    const esito = await invia();
    if (!esito.ok) {
      log.warn(`Comando «${nome}» rifiutato`, esito.errore);
      useTelefono.getState().impostaErrore(esito.errore);
    }
    return esito;
  } finally {
    useTelefono.getState().impostaOccupato(false);
  }
}

/** Sceglie (o cambia) il PG di questo telefono e lo ricorda. */
export function scegliPg(idPg: string): Promise<Esito> {
  return comando('scegli personaggio', async () => {
    const esito = await conEsito((s, fine) => s.emit('telefono:scegli_pg', { id_pg: idPg }, fine));
    const store = useTelefono.getState();
    if (esito.ok) {
      // Cambio di PG: via ciò che era dell'altro PG, ma non quello appena arrivato (che precede l'ack).
      if (store.idPg !== idPg) {
        if (store.miaAzione && store.miaAzione.id_pg !== idPg) store.impostaMiaAzione(null);
        if (store.scheda && store.scheda.id_pg !== idPg) store.impostaScheda(null);
      }
      store.ricordaPg(idPg);
      store.impostaConfermato(true);
    }
    return esito;
  });
}

/** Il PG confermato, o un esito d'errore pronto se manca. */
function pgCorrente(): string | Esito {
  const { idPg } = useTelefono.getState();
  return idPg ?? esitoErrore('Scegli prima un personaggio.');
}

export function inviaAzione(testo: string): Promise<Esito> {
  const idPg = pgCorrente();
  if (typeof idPg !== 'string') return Promise.resolve(idPg);
  const pulito = testo.trim();
  if (!pulito) return Promise.resolve(esitoErrore('Scrivi cosa fa il tuo personaggio.'));
  const stato = useTavolo.getState().stato;
  if (!stato) return Promise.resolve(esitoErrore('Stato del tavolo non ancora arrivato.'));
  return comando('invia azione', () =>
    conEsito((s, fine) =>
      s.emit(
        'azione:invia',
        { id_pg: idPg, testo: pulito.slice(0, MASSIMO_CARATTERI_AZIONE), versione_vista: stato.versione_scena },
        fine,
      ),
    ),
  );
}

export function ritiraAzione(): Promise<Esito> {
  const idPg = pgCorrente();
  if (typeof idPg !== 'string') return Promise.resolve(idPg);
  return comando('ritira azione', () => conEsito((s, fine) => s.emit('azione:ritira', { id_pg: idPg }, fine)));
}

/** «Pronto» (anche senza azione: vuol dire «passo»). */
export function impostaPronto(pronto: boolean): Promise<Esito> {
  const idPg = pgCorrente();
  if (typeof idPg !== 'string') return Promise.resolve(idPg);
  return comando('pronto', () => conEsito((s, fine) => s.emit('azione:pronto', { id_pg: idPg, pronto }, fine)));
}
