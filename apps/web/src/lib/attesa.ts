/**
 * Chi stiamo aspettando (richieste del 9 novembre: «inviare = pronto», nessuna scadenza in
 * condizioni normali). Il server dice in `finestra.aspettiamo` quali invitati non hanno ancora
 * inviato; qui si trasforma in parole per telefono, proiettore e pannello del master:
 * «Aspettiamo: Paolo e Giulia», oppure, quando hanno inviato tutti, «Hanno scritto tutti: si parte…».
 * Funzioni pure, testate in attesa.test.ts.
 */
import type { StatoTavolo } from '@cantastorie/shared';
import { elenco, t } from '../lingua';

export interface Attesa {
  /** Id dei PG che non hanno ancora inviato. */
  ids: string[];
  /** Nomi brevi (primo nome), nello stesso ordine; chi guarda è «te». */
  nomi: string[];
  /** Hanno inviato tutti gli invitati: il turno parte dopo un attimo da solo. */
  tutti: boolean;
}

/** Primo nome del PG («Ginestra Fondovalle» → «Ginestra»), o l'id se il PG non c'è. */
function primoNome(stato: StatoTavolo, id: string): string {
  const pg = stato.pg.find((p) => p.id === id);
  return pg ? (pg.nome.split(' ')[0] ?? pg.nome) : id;
}

/** Chi aspettiamo nella finestra aperta; null a finestra chiusa (o se non si sa). */
export function attesaFinestra(stato: StatoTavolo, idPg: string | null = null): Attesa | null {
  if (stato.fase !== 'finestra' || !stato.finestra.aperta) return null;
  const ids = stato.finestra.aspettiamo ?? [];
  const nomi = ids.map((id) => (id === idPg ? t('telefono.attesa.te') : primoNome(stato, id)));
  return { ids, nomi, tutti: ids.length === 0 };
}

/** «Aspettiamo: Paolo e Giulia» / «Hanno scritto tutti: si parte…» / null a finestra chiusa. */
export function testoAttesa(stato: StatoTavolo, idPg: string | null = null): string | null {
  const a = attesaFinestra(stato, idPg);
  if (!a) return null;
  if (a.tutti) return t('telefono.attesa.tutti');
  return t('telefono.attesa.aspettiamo', { nomi: elenco(a.nomi) });
}
