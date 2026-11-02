/**
 * Note di regia: controllo del modulo (testo e turni) e testi della lista. Logica pura, testata in
 * note.test.ts. I limiti veri sono del server (`limiti_note`); il numero di caratteri viene dal
 * contratto condiviso (NOTA_REGIA_MAX_CARATTERI).
 */
import { NOTA_REGIA_MAX_CARATTERI, type NotaRegia } from '@cantastorie/shared';
import { turni } from './etichette';

export interface ControlloNota {
  /** Si può inviare. */
  valida: boolean;
  /** Testo ripulito da inviare. */
  testo: string;
  /** Turni da inviare (intero nel limite), o null se il campo non è valido. */
  turni: number | null;
  /** Cosa non va, in italiano; null se va tutto bene o se il testo è solo ancora vuoto. */
  problema: string | null;
}

/**
 * Controlla il modulo della nota. Un testo vuoto non è un «problema» da mostrare (si spegne solo il
 * pulsante); turni fuori limite o testo troppo lungo sì.
 */
export function controllaNota(testoGrezzo: string, turniGrezzi: string, turniMax: number): ControlloNota {
  const testo = testoGrezzo.trim();
  const numero = /^\s*\d+\s*$/.test(turniGrezzi) ? Number(turniGrezzi) : Number.NaN;
  const turniValidi = Number.isInteger(numero) && numero >= 1 && numero <= turniMax ? numero : null;

  let problema: string | null = null;
  if (testo.length > NOTA_REGIA_MAX_CARATTERI) {
    problema = `La nota è troppo lunga: al massimo ${NOTA_REGIA_MAX_CARATTERI} caratteri.`;
  } else if (turniValidi === null) {
    problema = `I turni vanno da 1 a ${turniMax}.`;
  }
  return {
    valida: problema === null && testo.length > 0,
    testo,
    turni: turniValidi,
    problema,
  };
}

/** «ancora 5 turni su 15» / «ultimo turno (su 15)». */
export function testoTurniNota(nota: Pick<NotaRegia, 'turni_rimasti' | 'turni_totali'>): string {
  if (nota.turni_rimasti <= 1) return `ultimo turno (su ${nota.turni_totali})`;
  return `ancora ${turni(nota.turni_rimasti)} su ${nota.turni_totali}`;
}

/** Spiegazione quando le note sono al completo. */
export function testoNoteAlCompleto(max: number): string {
  return `Al massimo ${max} note insieme: togline una per scriverne un’altra.`;
}
