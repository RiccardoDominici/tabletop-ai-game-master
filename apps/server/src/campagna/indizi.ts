/**
 * Indizi della campagna, da tutte le schede scena e dai nodi senza scheda (schema, «Scheda
 * scena»): id, in quanti modi distinti si trovano (`modi`, predefinito 1), nodo e scena.
 *
 * `modi` dice che le battute di rivelazione di quell'indizio sono ALTERNATIVE (una per modo di
 * trovarlo): il repertorio ne usa il numero per la copertura (caricatore) e per togliere dal
 * catalogo le altre strade quando l'indizio è già stato trovato (StatoRepertorio).
 */
import type { Campagna, DatiYaml } from './tipi';

export interface IndizioCampagna {
  id: string;
  /** Modi distinti di trovarlo (≥ 1). */
  modi: number;
  /** Nodo dell'indizio (luogo o PNG), se indicato. */
  nodo: string | null;
  /** Scena che lo definisce (null = un nodo di campagna.yaml). */
  scena: string | null;
}

function leggi(i: DatiYaml, scena: string | null): IndizioCampagna | null {
  if (typeof i?.['id'] !== 'string') return null;
  const modi = typeof i['modi'] === 'number' && Number.isInteger(i['modi']) && i['modi'] >= 1 ? i['modi'] : 1;
  return { id: i['id'], modi, nodo: typeof i['nodo'] === 'string' ? i['nodo'] : null, scena };
}

/** Tutti gli indizi con una definizione (scene, poi nodi). Il primo che compare vince. */
export function indiziCampagna(c: Campagna): Map<string, IndizioCampagna> {
  const out = new Map<string, IndizioCampagna>();
  const aggiungi = (x: IndizioCampagna | null): void => {
    if (x && !out.has(x.id)) out.set(x.id, x);
  };
  for (const s of c.scene) for (const i of (s.dati['indizi'] as DatiYaml[] | undefined) ?? []) aggiungi(leggi(i, s.id));
  for (const n of (c.campagnaNarratore['nodi'] as DatiYaml[] | undefined) ?? []) {
    for (const i of (n?.['indizi'] as DatiYaml[] | undefined) ?? []) aggiungi(leggi(i, null));
  }
  return out;
}
