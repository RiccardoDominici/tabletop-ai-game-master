/**
 * Ingresso del narratore: le azioni chiuse in ordine di risoluzione, numerate, con i
 * collegamenti (chi dipende da chi, chi ha vinto quale conflitto). Le azioni private sono
 * marcate: il narratore ne racconta a voce solo ciò che gli altri possono percepire.
 */
import type { AzioneTurno } from '../narrazione/messaggio';
import type { RiepilogoChiusura } from './tavolo';
import type { Azione } from './tipi';

export function azioniPerNarratore(
  r: RiepilogoChiusura,
  nomePg: (id: string) => string,
  azione: (id: string) => Azione | undefined,
): { azioni: AzioneTurno[]; collegamenti: string[] } {
  const numero = new Map(r.azioni.map((a, i) => [a.id, i + 1]));
  const ref = (a: Azione): string => `[${numero.get(a.id)}] ${nomePg(a.autore)}`;
  const azioni: AzioneTurno[] = [
    ...r.azioni.map((a) => ({ id_pg: a.autore, nome: nomePg(a.autore), testo: a.testo, numero: numero.get(a.id)!, privata: a.privata })),
    ...r.senzaAzione.map((id) => ({ id_pg: id, nome: nomePg(id), testo: null })),
  ];
  const collegamenti: string[] = [];
  const visti = new Set<string>();
  for (const a of r.azioni) {
    for (const d of a.dipende_da) {
      const b = azione(d);
      if (!b) continue;
      if (numero.has(b.id)) collegamenti.push(`${ref(a)} dipende da ${ref(b)}: va risolta insieme a quella o dopo.`);
      else collegamenti.push(`${ref(a)} dipendeva dall'azione di ${nomePg(b.autore)}, rimasta fuori da questo turno.`);
    }
    for (const c of a.conflitti) {
      const b = azione(c.con);
      const chiave = [a.id, c.con].sort().join('|');
      if (!b || !numero.has(b.id) || visti.has(chiave)) continue;
      visti.add(chiave);
      if (c.esclusivo) {
        const [v, p] = c.vince === a.id ? [a, b] : [b, a];
        collegamenti.push(`${ref(v)} e ${ref(p)} vogliono la stessa cosa: si risolve prima ${ref(v)} (ha scritto prima); ${ref(p)} riesce solo se resta possibile.`);
      } else {
        collegamenti.push(`${ref(a)} e ${ref(b)} agiscono sulla stessa cosa: risolvile insieme.`);
      }
    }
  }
  return { azioni, collegamenti };
}
