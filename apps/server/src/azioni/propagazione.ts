/**
 * Propagazione delle dipendenze (funzioni pure). Se un'azione da cui altre dipendono viene
 * ritirata, cambiata, superata o sospesa, le azioni che dipendono da lei — direttamente o lungo
 * la catena A → B → C — passano a «da confermare», una volta sola per catena.
 */
import { STATI_VIVI, type Azione } from './tipi';

/** Mappa inversa: id → azioni vive che dipendono direttamente da lei. */
function dipendentiDiretti(azioni: readonly Azione[]): Map<string, Azione[]> {
  const mappa = new Map<string, Azione[]>();
  for (const a of azioni) {
    if (!STATI_VIVI.has(a.stato)) continue;
    for (const d of a.dipende_da) {
      if (!mappa.has(d)) mappa.set(d, []);
      mappa.get(d)!.push(a);
    }
  }
  return mappa;
}

/**
 * Azioni da segnalare quando cambia la radice.
 * @param toccateDirette per un cambio: i dipendenti diretti che l'arbitro giudica toccati
 *   (null = tutti, come per ritiro/superata/sospesa). Un dipendente non toccato interrompe la
 *   catena da quel ramo: niente avviso a lui né a chi dipende da lui.
 * @returns id nell'ordine di visita (prima i diretti), senza la radice, senza doppioni, con cicli.
 */
export function daSegnalare(azioni: readonly Azione[], radice: string, toccateDirette: ReadonlySet<string> | null = null): string[] {
  const inverso = dipendentiDiretti(azioni);
  const visti = new Set<string>([radice]);
  const ordine: string[] = [];
  let frontiera = (inverso.get(radice) ?? []).filter((a) => toccateDirette === null || toccateDirette.has(a.id));
  while (frontiera.length) {
    const prossima: Azione[] = [];
    for (const a of frontiera) {
      if (visti.has(a.id)) continue;
      visti.add(a.id);
      // Già da confermare per la stessa catena: non si avvisa due volte.
      if (!(a.stato === 'da_confermare' && a.causa === radice)) ordine.push(a.id);
      prossima.push(...(inverso.get(a.id) ?? []));
    }
    frontiera = prossima;
  }
  return ordine;
}

/** Catena da `id` alla radice seguendo `dipende_da` (per spiegare l'avviso a chi è indiretto). */
export function percorsoVerso(azioni: readonly Azione[], id: string, radice: string): string[] {
  const perId = new Map(azioni.map((a) => [a.id, a]));
  const coda: string[][] = [[id]];
  const visti = new Set<string>();
  while (coda.length) {
    const p = coda.shift()!;
    const ultimo = p[p.length - 1]!;
    if (ultimo === radice) return p;
    if (visti.has(ultimo)) continue;
    visti.add(ultimo);
    for (const d of perId.get(ultimo)?.dipende_da ?? []) coda.push([...p, d]);
  }
  return [];
}
