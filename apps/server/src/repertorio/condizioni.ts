/**
 * Condizioni di una battuta come BLOCCHI (richiede, con `oppure`): ogni blocco è «la base e
 * un'alternativa» (o solo la base, se non ci sono alternative). La battuta è disponibile se almeno
 * un blocco ha le condizioni di stato vere; risponde a un'azione se un blocco aperto ne accetta i
 * cancelli (privata, da_pg). Logica pura: lo stato lo mette StatoRepertorio.
 */
import type { Battuta, CondizioniStato } from './tipi';

export interface Blocco {
  /** Condizioni di stato da soddisfare TUTTE (la base, e l'alternativa se c'è). */
  stato: CondizioniStato[];
  /** L'azione dev'essere privata (true) o pubblica (false). */
  privata: boolean;
  /** PG ammessi; null = chiunque; [] = nessuno (base e alternativa senza PG in comune). */
  da_pg: string[] | null;
  /** Prova che l'azione deve aver superato (docs/prove.md); null = nessuna. */
  prova: string | null;
  /** Indice dell'alternativa (null = solo la base). */
  alternativa: number | null;
}

function intersezione(a: string[], b: string[]): string[] {
  return a.filter((x) => b.includes(x));
}

/** I blocchi della battuta, nell'ordine delle alternative. */
export function blocchi(b: Battuta): Blocco[] {
  const r = b.richiede;
  const pgBase = r.da_pg.length ? r.da_pg : null;
  if (r.oppure.length === 0) return [{ stato: [r], privata: r.privata, da_pg: pgBase, prova: r.prova, alternativa: null }];
  return r.oppure.map((a, i) => {
    const pgAlt = a.da_pg.length ? a.da_pg : null;
    const da_pg = pgBase && pgAlt ? intersezione(pgBase, pgAlt) : (pgAlt ?? pgBase);
    return { stato: [r, a], privata: a.privata ?? r.privata, da_pg, prova: a.prova ?? r.prova, alternativa: i };
  });
}

/** Un'azione come la guardano i cancelli: chi, se è privata, quali prove ha superato in questo turno. */
export interface AzioneAlCancello {
  autore: string;
  privata: boolean;
  /** Prove riuscite dell'azione (abilità, caratteristica, id della prova della scena, tipo): docs/prove.md. */
  prove?: readonly string[];
}

/** Il blocco accetta quest'azione (privata o pubblica, del PG giusto, con la prova superata)? */
export function accetta(bl: Blocco, a: AzioneAlCancello): boolean {
  if (bl.privata !== a.privata) return false;
  if (bl.prova !== null && !(a.prove ?? []).includes(bl.prova)) return false;
  return bl.da_pg === null || bl.da_pg.includes(a.autore);
}

/** Il blocco ha un cancello sull'azione: esce solo con `> pg` verso un'azione adatta. */
export function bloccoConCancello(bl: Blocco): boolean {
  return bl.privata || bl.da_pg !== null || bl.prova !== null;
}
