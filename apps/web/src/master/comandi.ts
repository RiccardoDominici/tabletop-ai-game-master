/**
 * Comandi del pannello del master: a quale zona del pannello appartengono (per mostrare l'esito
 * vicino al pulsante giusto), una chiave per riconoscere lo stesso comando in attesa di risposta
 * (si blocca il doppio clic sullo stesso pulsante, non sugli altri) e le etichette italiane.
 * Logica pura, testata in comandi.test.ts.
 */
import type { ComandoMaster, TipoComandoMaster } from '@cantastorie/shared';

/** Zona del pannello in cui si mostra l'esito di un comando. */
export type ZonaComando = 'controlli' | 'scena' | 'situazioni' | 'orologi' | 'finestra' | 'azioni' | 'note';

export const ZONA_COMANDO: Record<TipoComandoMaster, ZonaComando> = {
  pausa: 'controlli',
  riprendi: 'controlli',
  ferma_narrazione: 'controlli',
  luogo: 'scena',
  scena: 'scena',
  situazione: 'situazioni',
  orologio: 'orologi',
  chiudi_finestra: 'finestra',
  salta_azione: 'azioni',
  nota: 'note',
  togli_nota: 'note',
};

/** Nome del comando come lo legge il master (pulsanti, esiti, registro degli eventi). */
export const ETICHETTA_COMANDO: Record<TipoComandoMaster, string> = {
  pausa: 'Pausa',
  riprendi: 'Riprendi',
  ferma_narrazione: 'Ferma la narrazione',
  luogo: 'Cambio di luogo',
  scena: 'Cambio di scena',
  situazione: 'Immagine di situazione',
  orologio: 'Orologio',
  chiudi_finestra: 'Chiudi la finestra',
  salta_azione: 'Salta azione',
  nota: 'Nota di regia',
  togli_nota: 'Togli nota',
};

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
    default:
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
    case 'situazione':
      return comando.id === null ? 'Togli l’immagine di situazione' : `${nome}: ${comando.id}`;
    case 'orologio':
      return `${nome} ${comando.id} ${comando.passo > 0 ? '+1' : '−1'}`;
    case 'salta_azione':
      return `${nome} ${comando.id_azione}`;
    case 'nota':
      return `${nome} (${comando.turni} ${comando.turni === 1 ? 'turno' : 'turni'})`;
    case 'togli_nota':
      return `${nome} ${comando.id}`;
    default:
      return nome;
  }
}
