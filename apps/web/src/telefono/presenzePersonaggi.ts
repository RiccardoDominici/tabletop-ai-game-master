/**
 * Logica pura della fascia «Qui con voi» sul telefono (richiesta 2 del 9 novembre): cosa mostrare e
 * che testo mettere nella casella quando si tocca un PNG presente. Testata in presenzePersonaggi.test.ts.
 */
import type { PersonaggioScena } from '@cantastorie/shared';
import { primoNome } from '../schermo/etichettaFase';

/** I PNG presenti (in scena, con chi si può parlare), nell'ordine del server. */
export function presentiQui(personaggi: readonly PersonaggioScena[] | undefined): PersonaggioScena[] {
  return (personaggi ?? []).filter((p) => p.presente);
}

/** I PNG già incontrati ma altrove (la lista «Altrove»). */
export function altrove(personaggi: readonly PersonaggioScena[] | undefined): PersonaggioScena[] {
  return (personaggi ?? []).filter((p) => !p.presente);
}

/**
 * Testo della casella dopo un tocco su un PNG presente: «Bruno, » all'inizio, ma solo se la casella è
 * vuota (non si sovrascrive quello che il giocatore ha già scritto). Null = non si cambia nulla.
 */
export function apriConNome(bozza: string, nome: string): string | null {
  if (bozza.trim() !== '') return null;
  return `${primoNome(nome)}, `;
}
