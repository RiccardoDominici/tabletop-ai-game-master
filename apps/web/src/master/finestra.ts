/**
 * Finestra delle azioni vista dal master: una riga per invitato (nome, ha inviato o no: inviare =
 * ha finito) più chi ha scritto senza essere invitato. Logica pura, testata in finestra.test.ts.
 */
import type { StatoTavolo } from '@cantastorie/shared';

/** Il narratore può invitare `tutti` (il server di solito espande l'elenco, ma per sicurezza). */
const TUTTI = 'tutti';

export interface RigaInvitato {
  id_pg: string;
  nome: string;
  invitato: boolean;
  scritta: boolean;
}

/**
 * Invitati nell'ordine della finestra (o tutti i PG se l'invito è «tutti»), poi gli altri PG che
 * hanno comunque un'azione in questa finestra (non invitati: entrano, ma il turno non li aspetta).
 */
export function righeInvitati(tavolo: Pick<StatoTavolo, 'finestra' | 'pg'>): RigaInvitato[] {
  const { finestra, pg } = tavolo;
  const nomeDi = (id: string) => pg.find((p) => p.id === id)?.nome ?? id;
  const invitati = finestra.invitati.includes(TUTTI) ? pg.map((p) => p.id) : finestra.invitati;
  const visti = new Set<string>();
  const righe: RigaInvitato[] = [];

  for (const id of invitati) {
    if (visti.has(id)) continue;
    visti.add(id);
    const azione = finestra.azioni.find((a) => a.id_pg === id);
    righe.push({ id_pg: id, nome: nomeDi(id), invitato: true, scritta: azione?.scritta ?? false });
  }
  for (const azione of finestra.azioni) {
    if (visti.has(azione.id_pg)) continue;
    visti.add(azione.id_pg);
    righe.push({ id_pg: azione.id_pg, nome: nomeDi(azione.id_pg), invitato: false, scritta: azione.scritta });
  }
  return righe;
}
