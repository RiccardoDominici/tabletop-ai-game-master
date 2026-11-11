/**
 * Il pannello del master sul socket condiviso: token, ingresso nella stanza "master" a ogni
 * (ri)connessione, istantanee `master:stato` e comandi `master:comando` (eventi.ts, master.ts).
 *
 * Ingresso: `master:entra` col token. Va rifatto a OGNI connessione (Socket.IO ricrea il socket lato
 * server, che quindi non è più nella stanza). Se il server rifiuta (di solito: è stato riavviato e
 * ha stampato un token nuovo) si dimentica il token salvato e si mostra il modulo.
 *
 * Ordine istantanee: all'ingresso la risposta si accetta anche con versione più bassa (server
 * riavviato), ma se nel frattempo è già arrivato un broadcast `master:stato` (che è più nuovo,
 * perché il server entra nella stanza prima di rispondere) si applica col confronto di versione.
 *
 * Log: ingresso e comandi (tipo, esito); MAI il token.
 */
import type { ComandoMaster, Esito, EsitoEntrataMaster, StatoMaster } from '@tabletop-ai-gm/shared';
import { alRientro, chiedi, conEsito, esitoErrore, prendiSocket } from '../lib/socket';
import { creaLog } from '../lib/log';
import { useMaster } from '../store/master';
import { useAvvisi } from '../store/avvisi';
import { chiaveComando, descriviComando, ZONA_COMANDO } from './comandi';
import { ambienteDelBrowser, dimenticaToken, pulisciToken, salvaToken, tokenIniziale } from './token';
import { t } from '../lingua';

const log = creaLog('master');

/** Broadcast arrivati dall'ultimo `master:entra` inviato (vedi «Ordine istantanee» sopra). */
let broadcastDallIngresso = 0;

const suStato = (stato: StatoMaster) => {
  broadcastDallIngresso += 1;
  useMaster.getState().applicaStato(stato);
};
const suAvviso = (avviso: { livello: 'info' | 'errore'; testo: string }) =>
  useAvvisi.getState().aggiungi(avviso.livello, avviso.testo);

/** Entra nella stanza "master" col token in memoria (se c'è). */
async function entra(): Promise<void> {
  const { token } = useMaster.getState();
  if (!token) {
    useMaster.getState().impostaEntrata('senza_token');
    return;
  }
  // Se il pannello era già dentro (riconnessione) resta visibile con l'ultima istantanea.
  if (useMaster.getState().entrata !== 'dentro') useMaster.getState().impostaEntrata('entrando');
  broadcastDallIngresso = 0;
  log.info('Entro nel pannello del master');

  let esito: EsitoEntrataMaster | undefined;
  try {
    esito = await chiedi<EsitoEntrataMaster>((s, fine) => s.emit('master:entra', { token }, fine));
  } catch {
    // Non connessi o ack scaduto: ci riprova il prossimo rientro (alla riconnessione).
    log.warn('Ingresso nel pannello senza risposta: riprovo alla prossima connessione');
    return;
  }
  // Nel frattempo il token può essere cambiato (modulo): conta solo la risposta all'ultimo.
  if (useMaster.getState().token !== token) return;
  if (!esito) {
    log.warn('Risposta vuota a master:entra');
    return;
  }
  if (!esito.ok) {
    log.warn('Ingresso nel pannello rifiutato', { errore: esito.errore });
    dimenticaToken();
    useMaster.getState().impostaToken(null);
    useMaster.getState().impostaEntrata('rifiutato', esito.errore);
    return;
  }
  useMaster.getState().applicaStato(esito.stato, broadcastDallIngresso === 0);
  useMaster.getState().impostaEntrata('dentro');
  log.info('Dentro il pannello del master', {
    scena: esito.stato.tavolo.scena.titolo,
    fase: esito.stato.tavolo.fase,
    modo: esito.stato.modo,
  });
}

let avvii = 0;
let scollega: (() => void) | null = null;
/** Il token dell'URL si legge una volta sola per pagina (poi è già tolto dalla barra). */
let tokenLetto = false;

/**
 * Collega il pannello al tavolo. Contato, per React StrictMode (gli effetti partono, si fermano e
 * ripartono): gli ascoltatori si tolgono solo all'ultimo arresto. Vedi telefono/sessione.ts.
 */
export function avviaMaster(): () => void {
  avvii += 1;
  if (avvii === 1) {
    if (!tokenLetto) {
      tokenLetto = true;
      const token = tokenIniziale(ambienteDelBrowser());
      useMaster.getState().impostaToken(token);
      useMaster.getState().impostaEntrata(token ? 'entrando' : 'senza_token');
      log.info(token ? 'Token del master trovato' : 'Nessun token del master: serve incollarlo');
    }
    const s = prendiSocket();
    s.on('master:stato', suStato);
    s.on('avviso', suAvviso);
    const togliRientro = alRientro(() => void entra());
    scollega = () => {
      s.off('master:stato', suStato);
      s.off('avviso', suAvviso);
      togliRientro();
    };
  }
  return () => {
    avvii -= 1;
    if (avvii > 0) return;
    scollega?.();
    scollega = null;
  };
}

/**
 * Token incollato nel modulo: lo si ripulisce, si salva e si prova a entrare. Se non si è
 * connessi, l'ingresso parte da solo alla connessione (rientro). Restituisce false se vuoto.
 */
export function usaToken(grezzo: string): boolean {
  const token = pulisciToken(grezzo);
  if (!token) return false;
  salvaToken(token);
  useMaster.getState().impostaToken(token);
  useMaster.getState().impostaEntrata('entrando');
  if (prendiSocket().connected) void entra();
  return true;
}

/**
 * Torna al modulo del token (es. il server non risponde con quello salvato, o se ne vuole usare un
 * altro): si dimentica il token salvato e si esce dal pannello.
 */
export function cambiaToken(): void {
  log.info('Token del master dimenticato: torno al modulo');
  dimenticaToken();
  useMaster.getState().impostaToken(null);
  useMaster.getState().impostaEntrata('senza_token');
}

/**
 * Manda un comando al server e registra l'esito nella zona del pulsante (master/comandi.ts).
 * `descrizione` (con i nomi leggibili) la dà chi chiama; altrimenti si usano gli id.
 * Lo stesso comando non parte due volte mentre si aspetta l'ack.
 */
export async function inviaComando(comando: ComandoMaster, descrizione = descriviComando(comando)): Promise<Esito> {
  const chiave = chiaveComando(comando);
  const zona = ZONA_COMANDO[comando.tipo];
  const store = useMaster.getState();
  if (store.inCorso[chiave]) return esitoErrore(t('master.errore.gia_in_corso'));

  let esito: Esito;
  store.iniziaComando(chiave);
  if (store.entrata !== 'dentro') {
    esito = esitoErrore(t('master.errore.non_entrato'));
  } else {
    log.info('Comando inviato', { tipo: comando.tipo, descrizione });
    esito = await conEsito((s, fine) => s.emit('master:comando', comando, fine));
  }
  if (esito.ok) log.info('Comando riuscito', { tipo: comando.tipo, descrizione });
  else log.warn('Comando rifiutato', { tipo: comando.tipo, descrizione, errore: esito.errore });

  useMaster.getState().concludiComando(chiave, zona, {
    ok: esito.ok,
    tipo: comando.tipo,
    descrizione,
    errore: esito.ok ? null : esito.errore,
  });
  return esito;
}
