/**
 * Il telefono al tavolo: ascolto degli eventi, rientro a ogni (ri)connessione e comandi
 * (scelta del PG, bozza e invio/ritiro/conferma dell'azione; inviare = pronto, non c'è altro).
 *
 * Bozza (docs/azioni-concorrenti.md): la `versione_vista` si fissa al primo tasto e va con
 * `azione:invia`; mentre si scrive parte `azione:scrivo` (primo tasto, poi max 1/s). Quando
 * arriva `azione:mia` la casella si riconcilia senza mai perdere testo non inviato (bozza.ts).
 *
 * Rientro: `telefono:entra` (stato completo, accettato anche se la versione è più bassa: il server
 * può essere stato riavviato) e poi di nuovo `telefono:scegli_pg` col PG ricordato, così il telefono
 * rientra nella stanza player:<id_pg> e riceve di nuovo `azione:mia`.
 */
import { t } from '../lingua';
import type { AzionePrivata, Esito, EsitoPrivato, SchedaPg, StatoTavolo } from '@cantastorie/shared';
import { alRientro, chiedi, conEsito, esitoErrore, prendiSocket } from '../lib/socket';
import { creaLog } from '../lib/log';
import { tokenDispositivo } from '../lib/memoria';
import { useTavolo } from '../store/tavolo';
import { useTelefono } from '../store/telefono';
import { useAvvisi } from '../store/avvisi';
import { useBozza } from '../store/bozza';
import { riconciliaBozza, TracciaScrittura } from './bozza';
import { chiaveRichiesta } from './vista';

const log = creaLog('telefono');

/** Lunghezza massima di un'azione (stessa regola del server). */
export const MASSIMO_CARATTERI_AZIONE = 500;

/** Versione vista e ritmo di `azione:scrivo` della bozza corrente. */
const traccia = new TracciaScrittura();

const suStato = (stato: StatoTavolo) => useTavolo.getState().applicaStato(stato);
const suMiaAzione = (azione: AzionePrivata | null) => {
  log.debug('Azione privata aggiornata', azione);
  useTelefono.getState().impostaMiaAzione(azione);
  // La casella segue l'azione (testo che torna, casella che si svuota), mai a spese di una bozza.
  const bozza = useBozza.getState();
  const esito = riconciliaBozza(bozza.testo, azione);
  if (esito.testo !== bozza.testo) {
    bozza.impostaTesto(esito.testo);
    if (esito.testo.trim() === '') traccia.azzera();
  }
  if (esito.privata !== null) bozza.impostaPrivata(esito.privata);
  // Una richiesta rimandata con «Cambio» non serve più quando ne arriva un'altra (o nessuna).
  const rimandata = useTelefono.getState().sceltaRimandata;
  if (rimandata !== null && rimandata !== chiaveRichiesta(azione)) useTelefono.getState().rimandaScelta(null);
};
/**
 * La scheda arriva solo a questo telefono (stanza player:<id_pg>): può contenere segreti del PG.
 * Arriva PRIMA dell'ack di `telefono:scegli_pg`, quando idPg non è ancora aggiornato: la si tiene
 * comunque, e la pagina la mostra solo se è quella del PG scelto.
 */
const suScheda = (scheda: SchedaPg) => useTelefono.getState().impostaScheda(scheda);
/** Gli esiti delle mie azioni private: l'elenco completo, a ogni novità e quando scelgo il PG. */
const suPrivati = (esiti: EsitoPrivato[]) => useTelefono.getState().impostaEsitiPrivati(Array.isArray(esiti) ? esiti : []);
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

  // Il server riconosce questo telefono (token del dispositivo) e ricorda il suo PG, anche dopo un
  // riavvio: vale quello, poi il PG ricordato qui.
  let dalServer: string | null = null;
  try {
    const r = await chiedi<{ id_pg: string | null }>((s, fine) => s.emit('telefono:dispositivo', { dispositivo: tokenDispositivo() }, fine));
    dalServer = r?.id_pg ?? null;
  } catch {
    // Server più vecchio o lento: si usa il PG ricordato.
  }
  if (dalServer && dalServer !== useTelefono.getState().idPg) {
    log.info('Il server ricorda il PG di questo telefono', { idPg: dalServer });
    useTelefono.getState().ricordaPg(dalServer);
  }

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
    s.on('privato:esiti', suPrivati);
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
    s.off('privato:esiti', suPrivati);
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
    const esito = await conEsito((s, fine) => s.emit('telefono:scegli_pg', { id_pg: idPg, dispositivo: tokenDispositivo() }, fine));
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
  return idPg ?? esitoErrore(t('telefono.errore.scegli_pg'));
}

/**
 * Il giocatore ha cambiato il testo della casella: aggiorna la bozza, fissa la versione vista al
 * primo tasto e segnala «sto scrivendo» (al massimo una volta al secondo, senza ack).
 */
export function cambiaBozza(testo: string): void {
  const limitato = testo.slice(0, MASSIMO_CARATTERI_AZIONE);
  useBozza.getState().impostaTesto(limitato);
  if (limitato.trim() === '') {
    traccia.azzera();
    return;
  }
  const stato = useTavolo.getState().stato;
  const { idPg } = useTelefono.getState();
  if (!stato || !idPg) return;
  const { versioneVista, scrivo } = traccia.tasto(stato.versione_scena, Date.now());
  if (!scrivo) return;
  const s = prendiSocket();
  // Solo un indicatore: se si è disconnessi non lo si accoda (arriverebbe vecchio).
  if (s.connected) s.emit('azione:scrivo', { id_pg: idPg, versione_vista: versioneVista });
}

/**
 * Invia (o sostituisce) l'azione con il testo della casella. La versione vista è quella fissata al
 * primo tasto; se il testo è tornato da solo nella casella (azione superata) vale la scena attuale.
 */
export function inviaAzione(): Promise<Esito> {
  const idPg = pgCorrente();
  if (typeof idPg !== 'string') return Promise.resolve(idPg);
  const { testo, privata } = useBozza.getState();
  const pulito = testo.trim();
  if (!pulito) return Promise.resolve(esitoErrore(t('telefono.errore.scrivi')));
  const stato = useTavolo.getState().stato;
  if (!stato) return Promise.resolve(esitoErrore(t('telefono.errore.stato_non_arrivato')));
  const versioneVista = traccia.versioneVista ?? stato.versione_scena;
  return comando('invia azione', async () => {
    const esito = await conEsito((s, fine) =>
      s.emit(
        'azione:invia',
        { id_pg: idPg, testo: pulito.slice(0, MASSIMO_CARATTERI_AZIONE), versione_vista: versioneVista, privata },
        fine,
      ),
    );
    if (esito.ok) traccia.azzera();
    return esito;
  });
}

/** «Confermo» / «Tengo» sull'azione da decidere. */
export function confermaAzione(): Promise<Esito> {
  const idPg = pgCorrente();
  if (typeof idPg !== 'string') return Promise.resolve(idPg);
  return comando('conferma azione', () => conEsito((s, fine) => s.emit('azione:conferma', { id_pg: idPg }, fine)));
}

/**
 * «Cambio» sull'avviso «da decidere»: l'avviso si mette da parte, il testo dell'azione torna nella
 * casella (se è vuota: una bozza già scritta resta) e il cursore ci va dentro. Il prossimo invio
 * sostituisce l'azione.
 */
export function cambiaAzione(): void {
  const { miaAzione } = useTelefono.getState();
  useTelefono.getState().rimandaScelta(chiaveRichiesta(miaAzione));
  const bozza = useBozza.getState();
  if (miaAzione && bozza.testo.trim() === '') bozza.impostaTesto(miaAzione.testo);
  bozza.chiediFuoco();
}

/** Riapre l'avviso «da decidere» messo da parte. */
export function riapriScelta(): void {
  useTelefono.getState().rimandaScelta(null);
}

export function ritiraAzione(): Promise<Esito> {
  const idPg = pgCorrente();
  if (typeof idPg !== 'string') return Promise.resolve(idPg);
  return comando('ritira azione', () => conEsito((s, fine) => s.emit('azione:ritira', { id_pg: idPg }, fine)));
}

