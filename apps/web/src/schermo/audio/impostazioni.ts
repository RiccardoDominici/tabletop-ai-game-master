/**
 * Volumi e muti dei bus del proiettore, ricordati in localStorage (`tabletop-ai-gm:mixer`) per il
 * prossimo avvio sullo stesso Mac. La memoria del browser può mancare o rifiutare (finestra
 * privata, quota): si lavora comunque coi valori predefiniti, senza errori.
 */
import { creaLog } from '../../lib/log';
import { t, type Chiave } from '../../lingua';

const log = creaLog('audio-impostazioni');

export type NomeBus = 'musica' | 'ambiente' | 'temi' | 'effetti' | 'voce';

/** Ordine dei controlli nel pannello. */
export const BUS: readonly NomeBus[] = ['voce', 'musica', 'ambiente', 'temi', 'effetti'];

const CHIAVE_BUS: Record<NomeBus, Chiave> = {
  voce: 'schermo.bus.voce',
  musica: 'schermo.bus.musica',
  ambiente: 'schermo.bus.ambiente',
  temi: 'schermo.bus.temi',
  effetti: 'schermo.bus.effetti',
};

/** Nome leggibile di un bus nella lingua dell'interfaccia (letto al momento della chiamata). */
export function nomeBus(nome: NomeBus): string {
  return t(CHIAVE_BUS[nome]);
}

export interface ImpostazioneBus {
  /** Guadagno lineare del bus, 0–1. */
  volume: number;
  muto: boolean;
}

export type ImpostazioniMixer = Record<NomeBus, ImpostazioneBus>;

/**
 * Livelli di partenza: la voce piena, la musica sotto (il manifest è normalizzato a −23 LUFS, la
 * voce è più forte), ambienti presenti ma discreti, temi morbidi.
 */
export const IMPOSTAZIONI_PREDEFINITE: ImpostazioniMixer = {
  voce: { volume: 1, muto: false },
  musica: { volume: 0.5, muto: false },
  ambiente: { volume: 0.6, muto: false },
  temi: { volume: 0.5, muto: false },
  effetti: { volume: 0.8, muto: false },
};

const CHIAVE = 'tabletop-ai-gm:mixer';

function limita(v: unknown, predefinito: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : predefinito;
}

/** Unisce ciò che è salvato ai valori predefiniti (campi mancanti o sballati → predefiniti). */
export function normalizzaImpostazioni(grezze: unknown): ImpostazioniMixer {
  const g = grezze && typeof grezze === 'object' ? (grezze as Record<string, unknown>) : {};
  const out = {} as ImpostazioniMixer;
  for (const nome of BUS) {
    const b = g[nome] && typeof g[nome] === 'object' ? (g[nome] as Record<string, unknown>) : {};
    const pred = IMPOSTAZIONI_PREDEFINITE[nome];
    out[nome] = { volume: limita(b['volume'], pred.volume), muto: typeof b['muto'] === 'boolean' ? b['muto'] : pred.muto };
  }
  return out;
}

export function caricaImpostazioni(): ImpostazioniMixer {
  try {
    const testo = window.localStorage.getItem(CHIAVE);
    return normalizzaImpostazioni(testo ? JSON.parse(testo) : null);
  } catch (errore) {
    log.info('Impostazioni del mixer non lette: valori predefiniti', String(errore));
    return normalizzaImpostazioni(null);
  }
}

export function salvaImpostazioni(i: ImpostazioniMixer): void {
  try {
    window.localStorage.setItem(CHIAVE, JSON.stringify(i));
  } catch (errore) {
    log.info('Impostazioni del mixer non salvate', String(errore));
  }
}

/** Guadagno effettivo del bus. */
export function guadagnoBus(b: ImpostazioneBus): number {
  return b.muto ? 0 : b.volume;
}
