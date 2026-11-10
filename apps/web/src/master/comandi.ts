/**
 * Comandi del pannello del master: a quale zona del pannello appartengono (per mostrare l'esito
 * vicino al pulsante giusto), una chiave per riconoscere lo stesso comando in attesa di risposta
 * (si blocca il doppio clic sullo stesso pulsante, non sugli altri) e le etichette italiane.
 * Logica pura, testata in comandi.test.ts.
 */
import type { ComandoMaster, TipoComandoMaster } from '@cantastorie/shared';
import { t } from '../lingua';
import { turni } from './etichette';
import { tabella } from './tabella';

/** Zona del pannello in cui si mostra l'esito di un comando. */
export type ZonaComando = 'controlli' | 'scena' | 'situazioni' | 'orologi' | 'finestra' | 'azioni' | 'note' | 'audio' | 'sessione' | 'combattimento';

export const ZONA_COMANDO: Record<TipoComandoMaster, ZonaComando> = {
  pausa: 'controlli',
  riprendi: 'controlli',
  ferma_narrazione: 'controlli',
  luogo: 'scena',
  scena: 'scena',
  situazione: 'situazioni',
  orologio: 'orologi',
  chiudi_finestra: 'finestra',
  ritmo: 'finestra',
  salta_azione: 'azioni',
  nota: 'note',
  togli_nota: 'note',
  umore: 'audio',
  effetto: 'audio',
  nuova_sessione: 'sessione',
  fine_sessione: 'sessione',
  chiudi_sessione: 'sessione',
  durata_sessione: 'sessione',
  prossima_sessione: 'sessione',
  dispositivo: 'sessione',
  presenza: 'scena',
  rivela: 'scena',
  combattimento_inizia: 'combattimento',
  combattimento_termina: 'combattimento',
  pf: 'combattimento',
  condizione: 'combattimento',
};

/** Nome del comando come lo legge il master (pulsanti, esiti, registro degli eventi). */
export const ETICHETTA_COMANDO: Record<TipoComandoMaster, string> = tabella({
  pausa: 'master.cmd.pausa',
  riprendi: 'master.cmd.riprendi',
  ferma_narrazione: 'master.cmd.ferma_narrazione',
  luogo: 'master.cmd.luogo',
  scena: 'master.cmd.scena',
  situazione: 'master.cmd.situazione',
  orologio: 'master.cmd.orologio',
  chiudi_finestra: 'master.cmd.chiudi_finestra',
  ritmo: 'master.cmd.ritmo',
  salta_azione: 'master.cmd.salta_azione',
  nota: 'master.cmd.nota',
  togli_nota: 'master.cmd.togli_nota',
  umore: 'master.cmd.umore',
  effetto: 'master.cmd.effetto',
  nuova_sessione: 'master.cmd.nuova_sessione',
  fine_sessione: 'master.cmd.fine_sessione',
  chiudi_sessione: 'master.cmd.chiudi_sessione',
  durata_sessione: 'master.cmd.durata_sessione',
  prossima_sessione: 'master.cmd.prossima_sessione',
  dispositivo: 'master.cmd.dispositivo',
  presenza: 'master.cmd.presenza',
  rivela: 'master.cmd.rivela',
  combattimento_inizia: 'master.cmd.combattimento_inizia',
  combattimento_termina: 'master.cmd.combattimento_termina',
  pf: 'master.cmd.pf',
  condizione: 'master.cmd.condizione',
});

/**
 * Etichetta di un tipo di comando arrivato dal server (registro degli eventi). Un tipo che il client
 * non conosce ancora (server più nuovo) si mostra così com'è invece di sparire.
 */
export function etichettaComando(tipo: string): string {
  return (ETICHETTA_COMANDO as Record<string, string | undefined>)[tipo] ?? tipo;
}

/**
 * Chiave del comando per «in attesa di risposta»: lo stesso pulsante (stesso orologio, stessa
 * azione, stesso luogo) resta bloccato finché non arriva l'ack; gli altri restano liberi.
 * L'orologio ha una chiave sola per i due versi: +1 e −1 sullo stesso orologio non si accavallano.
 */
export function chiaveComando(comando: ComandoMaster): string {
  switch (comando.tipo) {
    case 'luogo':
      return `luogo:${comando.luogo}`;
    case 'scena':
      return `scena:${comando.scena}`;
    case 'situazione':
      // Mostrare e togliere un'immagine toccano lo stesso proiettore: una chiave sola.
      return 'situazione';
    case 'orologio':
      return `orologio:${comando.id}`;
    case 'salta_azione':
      return `salta_azione:${comando.id_azione}`;
    case 'togli_nota':
      return `togli_nota:${comando.id}`;
    case 'effetto':
      return `effetto:${comando.id}`;
    case 'pf':
      // Un PG o PNG alla volta: due correzioni sulla stessa scheda non si accavallano.
      return `pf:${comando.id}`;
    case 'condizione':
      return `condizione:${comando.id}:${comando.condizione}`;
    default:
      // «umore»: una chiave sola, due umori di fila non si accavallano.
      return comando.tipo;
  }
}

/**
 * Descrizione breve del comando per l'esito vicino al pulsante e per il log («Orologio o_colpevole
 * +1»). I componenti possono passarne una con i nomi leggibili; questa usa solo gli id.
 */
export function descriviComando(comando: ComandoMaster): string {
  const nome = ETICHETTA_COMANDO[comando.tipo];
  switch (comando.tipo) {
    case 'luogo':
      return `${nome}: ${comando.luogo}`;
    case 'scena':
      return `${nome}: ${comando.scena}`;
    case 'presenza':
      return `${nome}: ${comando.id_png} ${comando.presente === null ? t('master.presenza.automatica') : comando.presente ? t('master.presenza.in_scena') : t('master.presenza.altrove')}`;
    case 'rivela':
      return `${nome}: ${comando.id_png} ${t('master.presenza.rivelato')}`;
    case 'situazione':
      return comando.id === null ? t('master.situazioni.togli_immagine') : `${nome}: ${comando.id}`;
    case 'orologio':
      return `${nome} ${comando.id} ${comando.passo > 0 ? '+1' : '−1'}`;
    case 'salta_azione':
      return `${nome} ${comando.id_azione}`;
    case 'nota':
      return `${nome} (${turni(comando.turni)})`;
    case 'togli_nota':
      return `${nome} ${comando.id}`;
    case 'umore':
      return `${nome}: ${comando.umore ?? t('master.umore.auto')}`;
    case 'ritmo':
      return `${nome}: ${comando.ritmo}`;
    case 'effetto':
      return `${nome}: ${comando.id}`;
    case 'pf':
      return `${comando.id}: ${t('master.pf')} ${comando.valore}`;
    case 'condizione':
      return `${nome} ${comando.id}: ${comando.condizione} ${t(comando.attiva ? 'master.esito.messa' : 'master.esito.tolta')}`;
    default:
      return nome;
  }
}
