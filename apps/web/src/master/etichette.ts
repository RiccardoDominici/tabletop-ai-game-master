/**
 * Etichette italiane del pannello del master: fase, pausa, motore voce, modalità, stato delle
 * azioni (con il tono del chip), turni e orari. Logica pura, testata in etichette.test.ts.
 *
 * Il master è un adulto che deve capire al volo cosa succede: parole precise, niente allarmi
 * gratuiti. Lo stato delle azioni segue lo stile di ETICHETTA_STATO_AZIONE del telefono
 * (telefono/vista.ts), ma qui si dice anche cosa sta facendo il motore («in narrazione»).
 */
import type { FaseScena, StatoAzione, StatoMaster, StatoTavolo } from '@cantastorie/shared';
import type { Tono } from './stili';

/** Fase della scena come la legge il master (master-fase). */
export const ETICHETTA_FASE_MASTER: Record<FaseScena, string> = {
  attesa: 'in attesa di «Inizia sessione»',
  apertura: 'apertura della scena',
  finestra: 'finestra delle azioni',
  narrazione: 'narrazione',
  pausa: 'in pausa',
  fermata: 'scena fermata',
};

/** Tono del chip della fase. */
export const TONO_FASE: Record<FaseScena, Tono> = {
  attesa: 'cenere',
  apertura: 'brace',
  finestra: 'muschio',
  narrazione: 'brace',
  pausa: 'candela',
  fermata: 'sangue',
};

/**
 * Stato della pausa (master-stato-pausa). «attiva» vince su «richiesta»: a tavolo fermo la
 * richiesta è già stata esaudita.
 */
export function etichettaPausa(pausa: StatoMaster['pausa']): string {
  if (pausa.attiva) return 'in pausa';
  if (pausa.richiesta) return 'pausa alla fine della narrazione';
  return 'in gioco';
}

export function tonoPausa(pausa: StatoMaster['pausa']): Tono {
  if (pausa.attiva) return 'candela';
  if (pausa.richiesta) return 'brace';
  return 'muschio';
}

/** Motore della voce (tavolo.voce_motore). */
export function etichettaVoce(motore: StatoTavolo['voce_motore']): string {
  return motore === 'qwen' ? 'Qwen (locale)' : 'finta (mock)';
}

/** Modalità del master: A improvvisa, B repertorio di battute. */
export function etichettaModo(modo: StatoMaster['modo']): string {
  return modo === 'repertorio' ? 'B · repertorio' : 'A · improvvisa';
}

/** Stato di un'azione nel pannello: chip breve, neutro. */
export const ETICHETTA_STATO_AZIONE_MASTER: Record<StatoAzione, string> = {
  in_coda: 'in coda',
  da_confermare: 'da decidere',
  chiusa: 'in narrazione',
  risolta: 'risolta',
  ritirata: 'ritirata',
  superata: 'non è andata',
  sospesa: 'rimasta fuori',
};

/** Tono del chip: vive in chiaro, «da decidere» in evidenza, le escluse spente. */
export const TONO_STATO_AZIONE: Record<StatoAzione, Tono> = {
  in_coda: 'neutro',
  da_confermare: 'candela',
  chiusa: 'brace',
  risolta: 'muschio',
  ritirata: 'cenere',
  superata: 'sangue',
  sospesa: 'cenere',
};

/** «apertura» per il turno 0, altrimenti «turno N». */
export function etichettaTurno(turno: number): string {
  return turno === 0 ? 'apertura' : `turno ${turno}`;
}

/** Due cifre (05). */
function due(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Ora locale «HH:MM:SS» da epoch ms o da una data ISO 8601 (registro degli eventi, invio delle
 * azioni). «—» se il valore non è una data valida.
 */
export function oraBreve(quando: number | string): string {
  const data = new Date(quando);
  if (Number.isNaN(data.getTime())) return '—';
  return `${due(data.getHours())}:${due(data.getMinutes())}:${due(data.getSeconds())}`;
}

/** «1 turno» / «5 turni». */
export function turni(n: number): string {
  return `${n} ${n === 1 ? 'turno' : 'turni'}`;
}
