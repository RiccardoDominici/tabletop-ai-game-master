/**
 * Ponte tra gli eventi audio del server, il lettore Web Audio e il resto dello schermo:
 * - `audio:*` dal socket → `LettorePcm`;
 * - segni della linea del tempo → avvisi al server (`schermo:audio_iniziato` / `_finito`),
 *   sottotitolo e parlante nello store, contatori in `window.__schermoDebug`.
 *
 * Gli avvisi al server partono solo se si è connessi: un avviso bufferizzato e spedito alla
 * riconnessione porterebbe un `ritardo_ms` falso e sporcherebbe le misure di latenza.
 */
import type { AudioFineFrase, AudioFineTurno, AudioFrase, AudioPezzo } from '@cantastorie/shared';
import { LettorePcm, type StatisticheLettore } from '../audio/lettore';
import { creaLog } from '../lib/log';
import { prendiSocket } from '../lib/socket';
import { useSchermo } from '../store/schermo';
import { debugSchermo } from './debug';

const log = creaLog('schermo-audio');

/** Il sottotitolo resta ancora un attimo dopo la fine della frase, poi sparisce. */
const PAUSA_SOTTOTITOLO_MS = 700;

function rimuoviSottotitoloDopo(idFrase: string | null): void {
  window.setTimeout(() => useSchermo.getState().togliDaOnda(idFrase), PAUSA_SOTTOTITOLO_MS);
}

const lettore = new LettorePcm({
  inizioTurno(turno, idFrase, ritardoMs) {
    debugSchermo.turniIniziati.push(turno);
    const s = prendiSocket();
    const dati = { turno, id_frase: idFrase, ritardo_ms: Math.round(ritardoMs) };
    if (s.connected) s.emit('schermo:audio_iniziato', dati);
    else log.warn('Disconnessi: avviso di inizio audio non inviato', dati);
    log.info('Audio del turno iniziato', dati);
  },

  fineTurno(turno, ritardoMs, buchi) {
    debugSchermo.turniFiniti.push(turno);
    const s = prendiSocket();
    const dati = { turno, ritardo_ms: Math.round(ritardoMs), ...buchi };
    if (s.connected) s.emit('schermo:audio_finito', dati);
    else log.warn('Disconnessi: avviso di fine audio non inviato', dati);
    log.info('Audio del turno finito', dati);
    // Se l'ultima frase non ha avuto il suo `fine_frase`, il sottotitolo si toglie qui.
    rimuoviSottotitoloDopo(useSchermo.getState().inOnda?.idFrase ?? null);
  },

  inizioFrase(frase, ritardoMs) {
    debugSchermo.frasiIniziate += 1;
    useSchermo.getState().mettiInOnda({
      idFrase: frase.id_frase,
      turno: frase.turno,
      parlante: frase.parlante,
      nome: frase.nome,
      testo: frase.testo,
    });
    log.debug('Frase in onda', { id_frase: frase.id_frase, ritardoMs: Math.round(ritardoMs) });
  },

  fineFrase(idFrase) {
    rimuoviSottotitoloDopo(idFrase);
  },

  statoContesto(stato) {
    debugSchermo.statoAudio = stato;
  },

  contatori(c) {
    debugSchermo.pezzi = c.pezzi;
    debugSchermo.byte = c.byte;
    debugSchermo.secondiProgrammati = c.secondiProgrammati;
    debugSchermo.buchi = c.buchi;
  },
});

/** Va chiamata dentro il gestore del click «Inizia sessione». */
export function sbloccaAudio(): Promise<void> {
  return lettore.sblocca();
}

export function statisticheAudio(): StatisticheLettore {
  return lettore.statistiche();
}

const suFrase = (frase: AudioFrase) => lettore.frase(frase);
const suPezzo = (pezzo: AudioPezzo) => lettore.pezzo(pezzo);
const suFineFrase = (fine: AudioFineFrase) => lettore.fineFrase(fine);
const suFineTurno = (fine: AudioFineTurno) => lettore.fineTurno(fine);
const suInterrompi = () => {
  lettore.interrompi();
  useSchermo.getState().togliDaOnda(null);
};

/** Collega gli eventi audio del socket al lettore; restituisce la funzione per scollegarli. */
export function collegaAudio(): () => void {
  const s = prendiSocket();
  s.on('audio:frase', suFrase);
  s.on('audio:pezzo', suPezzo);
  s.on('audio:fine_frase', suFineFrase);
  s.on('audio:fine_turno', suFineTurno);
  s.on('audio:interrompi', suInterrompi);
  return () => {
    s.off('audio:frase', suFrase);
    s.off('audio:pezzo', suPezzo);
    s.off('audio:fine_frase', suFineFrase);
    s.off('audio:fine_turno', suFineTurno);
    s.off('audio:interrompi', suInterrompi);
  };
}
