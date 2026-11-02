/**
 * Legami tra le azioni (docs/azioni-concorrenti.md) scritti per il master: dipendenze («dipende da
 * Ginestra e Corrado») e conflitti («in conflitto con Corrado · esclusivo · vince»). Logica pura,
 * testata in legami.test.ts.
 *
 * Nei conflitti NON esclusivi il narratore risolve le due azioni insieme: non c'è chi vince, quindi
 * «vince/perde» si scrive solo per gli esclusivi.
 */
import type { AzioneMaster, LegameAzione } from '@cantastorie/shared';
import { elencoNomi } from '../lib/formato';

/** Nomi senza vuoti e senza doppioni, nell'ordine in cui arrivano. */
function nomiUnici(legami: readonly LegameAzione[]): string[] {
  const nomi = legami.map((l) => (l.nome.trim() || l.id).trim()).filter((n) => n.length > 0);
  return [...new Set(nomi)];
}

/** «dipende da Ginestra», «dipende da Ginestra e Corrado», o null se non dipende da nessuno. */
export function testoDipendenze(dipendeDa: readonly LegameAzione[]): string | null {
  const nomi = nomiUnici(dipendeDa);
  return nomi.length === 0 ? null : `dipende da ${elencoNomi(nomi)}`;
}

type Conflitto = AzioneMaster['conflitti'][number];

/** «in conflitto con Corrado · esclusivo · vince» / «… · esclusivo · perde» / «… · non esclusivo». */
export function testoConflitto(conflitto: Conflitto): string {
  const nome = conflitto.nome.trim() || conflitto.id;
  if (!conflitto.esclusivo) return `in conflitto con ${nome} · non esclusivo`;
  return `in conflitto con ${nome} · esclusivo · ${conflitto.vince ? 'vince' : 'perde'}`;
}

/** Tutte le righe dei legami di un'azione, dipendenze prima (pronte da mostrare). */
export function righeLegami(azione: Pick<AzioneMaster, 'dipende_da' | 'conflitti'>): Array<{
  tipo: 'dipendenza' | 'conflitto';
  testo: string;
  /** Solo per i conflitti esclusivi: questa azione li perde (da evidenziare). */
  perde: boolean;
}> {
  const righe: Array<{ tipo: 'dipendenza' | 'conflitto'; testo: string; perde: boolean }> = [];
  const dipendenze = testoDipendenze(azione.dipende_da);
  if (dipendenze) righe.push({ tipo: 'dipendenza', testo: dipendenze, perde: false });
  for (const c of azione.conflitti) {
    righe.push({ tipo: 'conflitto', testo: testoConflitto(c), perde: c.esclusivo && !c.vince });
  }
  return righe;
}
