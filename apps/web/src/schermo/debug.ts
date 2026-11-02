/**
 * Oggetto di debug dello schermo per l'e2e di Playwright: `window.__schermoDebug`.
 * È un oggetto semplice, mutato dal vivo dal ponte audio (niente React: lo si legge con
 * `page.evaluate(() => window.__schermoDebug)`).
 */

export interface DebugSchermo {
  /** Pezzi `audio:pezzo` ricevuti. */
  pezzi: number;
  /** Byte PCM ricevuti. */
  byte: number;
  /** Secondi di audio messi in programma sull'orologio del contesto. */
  secondiProgrammati: number;
  /** Frasi che hanno cominciato a suonare davvero. */
  frasiIniziate: number;
  /** Turni per cui è partito `schermo:audio_iniziato` (in ordine). */
  turniIniziati: number[];
  /** Turni per cui è partito `schermo:audio_finito` (in ordine). */
  turniFiniti: number[];
  /** Buchi (underrun) contati in tutta la sessione. */
  buchi: number;
  /** Stato dell'AudioContext: 'assente' prima di «Inizia sessione», poi 'running', 'suspended'… */
  statoAudio: string;
  /** URL dell'immagine del luogo a schermo (in cima), o null se c'è lo sfondo d'atmosfera. */
  immagine: string | null;
  /** Dissolvenze dello sfondo completate (verso un'immagine o verso lo sfondo d'atmosfera). */
  transizioni: number;
}

declare global {
  interface Window {
    __schermoDebug?: DebugSchermo;
  }
}

export const debugSchermo: DebugSchermo = {
  pezzi: 0,
  byte: 0,
  secondiProgrammati: 0,
  frasiIniziate: 0,
  turniIniziati: [],
  turniFiniti: [],
  buchi: 0,
  statoAudio: 'assente',
  immagine: null,
  transizioni: 0,
};

/**
 * Pubblica l'oggetto su window. Idempotente; parte già al caricamento del modulo, così l'e2e lo
 * trova subito dopo `page.goto('/schermo')` senza aspettare il primo render.
 */
export function esponiDebugSchermo(): void {
  if (typeof window !== 'undefined') window.__schermoDebug = debugSchermo;
}

esponiDebugSchermo();
