/**
 * Quando i pulsanti del pannello sono attivi. Il server valida comunque tutto (il client non è
 * fidato): qui si spengono solo i pulsanti che di sicuro non avrebbero effetto, per non far
 * cliccare a vuoto il master. Logica pura, testata in permessi.test.ts.
 */
import type { AzioneMaster, StatoMaster } from '@cantastorie/shared';

type Pausa = Pick<StatoMaster, 'pausa'>;

/** «Pausa»: solo se non è già chiesta né attiva. */
export function puoMettereInPausa(stato: Pausa): boolean {
  return !stato.pausa.richiesta && !stato.pausa.attiva;
}

/** «Riprendi»: annulla una pausa chiesta o fa ripartire il tavolo fermo. */
export function puoRiprendere(stato: Pausa): boolean {
  return stato.pausa.richiesta || stato.pausa.attiva;
}

/** «Ferma la narrazione»: solo mentre il narratore (LLM o voce) sta lavorando. */
export function puoFermareNarrazione(stato: Pick<StatoMaster, 'narrazione_in_corso'>): boolean {
  return stato.narrazione_in_corso;
}

/** «Chiudi la finestra ora»: finestra aperta e tavolo non in pausa. */
export function puoChiudereFinestra(stato: Pick<StatoMaster, 'tavolo' | 'pausa'>): boolean {
  return stato.tavolo.finestra.aperta && !stato.pausa.attiva && stato.tavolo.fase !== 'pausa';
}

/** C'è posto per un'altra nota di regia (al massimo `limiti_note.max` insieme). */
export function spazioPerNote(stato: Pick<StatoMaster, 'note' | 'limiti_note'>): boolean {
  return stato.note.length < stato.limiti_note.max;
}

/**
 * Azioni nell'ordine in cui le legge il master: turno, poi ordine d'invio (prima scrive, prima
 * arriva), poi id per stabilità. Non modifica l'array ricevuto.
 */
export function azioniInOrdine(azioni: readonly AzioneMaster[]): AzioneMaster[] {
  return [...azioni].sort(
    (a, b) => a.turno - b.turno || a.inviata_alle - b.inviata_alle || a.id.localeCompare(b.id),
  );
}
