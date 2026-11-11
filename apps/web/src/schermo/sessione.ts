/**
 * Lo schermo al tavolo: ascolto degli eventi, rientro a ogni (ri)connessione e comandi.
 *
 * Rientro: `schermo:osserva` (stato + info per il QR, accettato sempre: il server può essere stato
 * riavviato) e, se l'audio era già stato sbloccato, di nuovo `schermo:inizia` per rientrare nella
 * stanza "schermo" e ricevere l'audio.
 */
import type { InfoServer, MisureTurno, StatoTavolo } from '@tabletop-ai-gm/shared';
import { alRientro, chiedi, conEsito, prendiSocket } from '../lib/socket';
import { creaLog } from '../lib/log';
import { useTavolo } from '../store/tavolo';
import { useSchermo } from '../store/schermo';
import { useAvvisi } from '../store/avvisi';
import { collegaAudio, sbloccaAudio } from './audioSchermo';
import { collegaAudioScena } from './audio/ponte';
import { t } from '../lingua';

const log = creaLog('schermo');

const suStato = (stato: StatoTavolo) => useTavolo.getState().applicaStato(stato);
const suMetriche = (misure: MisureTurno) => {
  log.info('Misure del turno', misure);
  useTavolo.getState().impostaMetriche(misure);
};
const suAvviso = (avviso: { livello: 'info' | 'errore'; testo: string }) =>
  useAvvisi.getState().aggiungi(avviso.livello, avviso.testo);

/** Entra nella stanza "schermo": da qui il server manda l'audio (e avvia la scena se serve). */
async function entraNelloSchermo(): Promise<void> {
  const esito = await conEsito((s, fine) => s.emit('schermo:inizia', fine));
  if (esito.ok) {
    useSchermo.getState().impostaErroreAvvio(null);
    log.info('Sessione avviata sullo schermo');
  } else {
    log.warn('Avvio della sessione rifiutato', esito.errore);
    useSchermo.getState().impostaErroreAvvio(esito.errore);
    useAvvisi.getState().aggiungi('errore', esito.errore);
  }
}

async function rientra(): Promise<void> {
  try {
    const risposta = await chiedi<{ stato: StatoTavolo; info: InfoServer }>((s, fine) =>
      s.emit('schermo:osserva', fine),
    );
    if (risposta) {
      useTavolo.getState().applicaStato(risposta.stato, true);
      useTavolo.getState().impostaInfo(risposta.info);
    }
  } catch {
    // Timeout: riproverà la prossima riconnessione.
    return;
  }
  if (useSchermo.getState().audioSbloccato) await entraNelloSchermo();
}

let avvii = 0;
let scollega: (() => void) | null = null;

/** Collega lo schermo al tavolo (contato, per React StrictMode: vedi telefono/sessione.ts). */
export function avviaSchermo(): () => void {
  avvii += 1;
  if (avvii === 1) {
    const s = prendiSocket();
    s.on('stato', suStato);
    s.on('metriche:turno', suMetriche);
    s.on('avviso', suAvviso);
    const scollegaAudio = collegaAudio();
    const scollegaAudioScena = collegaAudioScena();
    const togliRientro = alRientro(() => void rientra());
    scollega = () => {
      s.off('stato', suStato);
      s.off('metriche:turno', suMetriche);
      s.off('avviso', suAvviso);
      scollegaAudio();
      scollegaAudioScena();
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
 * «Inizia sessione». DEVE essere chiamata in modo sincrono dal gestore del click: l'AudioContext
 * nasce (o riprende) dentro il gesto, altrimenti il browser lo lascia sospeso.
 */
export function iniziaSessione(): void {
  const sblocco = sbloccaAudio();
  useSchermo.getState().impostaErroreAvvio(null);
  sblocco.then(
    () => {
      useSchermo.getState().impostaSbloccato(true);
      void entraNelloSchermo();
    },
    (errore: unknown) => {
      log.warn('Audio non sbloccato', errore);
      useSchermo
        .getState()
        .impostaErroreAvvio(t('schermo.errore.audio_negato'));
    },
  );
}

export async function fermaScena(): Promise<void> {
  const esito = await conEsito((s, fine) => s.emit('scena:ferma', fine));
  useSchermo.getState().impostaEsitoComando(esito.ok ? t('schermo.comando.fermata_ok') : esito.errore);
}

export async function ricominciaScena(): Promise<void> {
  const esito = await conEsito((s, fine) => s.emit('scena:ricomincia', fine));
  useSchermo.getState().impostaEsitoComando(esito.ok ? t('schermo.comando.ricominciata_ok') : esito.errore);
}
