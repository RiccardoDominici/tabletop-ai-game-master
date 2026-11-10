/**
 * Etichette italiane del pannello del master: fase, pausa, motore voce, modalità, stato delle
 * azioni (con il tono del chip), turni e orari. Logica pura, testata in etichette.test.ts.
 *
 * Il master è un adulto che deve capire al volo cosa succede: parole precise, niente allarmi
 * gratuiti. Lo stato delle azioni segue lo stile di ETICHETTA_STATO_AZIONE del telefono
 * (telefono/vista.ts), ma qui si dice anche cosa sta facendo il motore («in narrazione»).
 */
import type { FaseScena, StatoAzione, StatoMaster, StatoTavolo } from '@cantastorie/shared';
import { t } from '../lingua';
import type { Tono } from './stili';
import { tabella } from './tabella';

/** Fase della scena come la legge il master (master-fase). Testi nella lingua attiva (vedi tabella.ts). */
export const ETICHETTA_FASE_MASTER: Record<FaseScena, string> = tabella({
  attesa: 'master.fase.attesa',
  apertura: 'master.fase.apertura',
  finestra: 'master.fase.finestra',
  narrazione: 'master.fase.narrazione',
  pausa: 'master.fase.pausa',
  fermata: 'master.fase.fermata',
});

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
  if (pausa.attiva) return t('master.fase.pausa');
  if (pausa.richiesta) return t('master.pausa.richiesta');
  return t('master.pausa.in_gioco');
}

export function tonoPausa(pausa: StatoMaster['pausa']): Tono {
  if (pausa.attiva) return 'candela';
  if (pausa.richiesta) return 'brace';
  return 'muschio';
}

/** Motore della voce (tavolo.voce_motore). */
export function etichettaVoce(motore: StatoTavolo['voce_motore']): string {
  if (motore === 'fish') return t('master.voce.fish');
  if (motore === 'qwen') return t('master.voce.qwen');
  return t('master.voce.finta');
}

/** Modalità del master: A improvvisa, B repertorio di battute. */
export function etichettaModo(modo: StatoMaster['modo']): string {
  return t(modo === 'repertorio' ? 'master.modo.repertorio' : 'master.modo.improvvisa');
}

/** Stato di un'azione nel pannello: chip breve, neutro. */
export const ETICHETTA_STATO_AZIONE_MASTER: Record<StatoAzione, string> = tabella({
  in_coda: 'master.azione.in_coda',
  da_confermare: 'master.azione.da_confermare',
  chiusa: 'master.azione.chiusa',
  risolta: 'master.azione.risolta',
  ritirata: 'master.azione.ritirata',
  superata: 'master.azione.superata',
  sospesa: 'master.azione.sospesa',
});

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
  return turno === 0 ? t('master.turno.apertura') : t('master.turno.numero', { n: turno });
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
  return t(n === 1 ? 'master.turni.singolare' : 'master.turni.plurale', { n });
}
