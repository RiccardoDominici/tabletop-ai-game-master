/**
 * Rilasci fuori contesto (E2E finale, B1 e D3): il selettore, o il lettore locale, sceglieva battute che
 * rilasciano qualcosa per azioni che non c'entravano. Così la confessione `zir_corda` usciva per Nespola che
 * entra da una finestra, l'indizio `nar_conto` per un tiro di fionda e il finale `fin_ovile_senza` al T5 per
 * «vado a controllare il sentiero». In catalogo c'erano per un tema solo o per un soprannome («goblin»).
 *
 * Una battuta di RILASCIO esce per un'azione solo se quell'azione le è pertinente:
 * - i suoi `temi` compaiono in QUELL'azione, non in un'altra del turno;
 * - l'azione ha almeno MIN_RADICI_RILASCIO radici in comune col suo `quando` e i `temi` («guardo le tacche
 *   sul muro» con «un PG guarda il muro…»: guard, muro, tacch);
 * - se a parlare è un PNG e l'azione nomina dei PNG, fra questi c'è lui.
 * I cancelli di stato li controlla già StatoRepertorio. Funzioni pure; le usano la regia, al momento del
 * [usa], e la misura dell'harness (esperimenti/fughe.ts, «rivelazioni fuori contesto»).
 */
import { radici } from '../narrazione/privato';
import { pngNominati, temaPresente } from './pertinenza';
import type { Battuta, TipoBattuta } from './tipi';

/** Tipi che rilasciano qualcosa: indizi, confessioni, verità, finali. */
export const TIPI_RILASCIO: ReadonlySet<TipoBattuta> = new Set<TipoBattuta>(['confessione', 'indizio', 'verita', 'finale']);
/** Radici in comune fra azione e `quando` + `temi` sotto cui il rilascio è fuori contesto. */
export const MIN_RADICI_RILASCIO = 2;

/** La battuta rilascia qualcosa (per tipo, o perché rivela indizi o fatti)? */
export function èRilascio(b: Battuta): boolean {
  return TIPI_RILASCIO.has(b.tipo) || b.effetti.rivela_indizi.length > 0 || b.effetti.fatti_noti.length > 0;
}

/** Perché quest'azione non è pertinente al rilascio di `b` (null = lo è). */
export function motivoFuoriContesto(b: Battuta, azione: string, nomiPng: Map<string, string[]>): string | null {
  if (b.temi.length && !temaPresente(azione, b.temi)) return `nessuno dei temi di ${b.id} (${b.temi.join(', ')}) è nell'azione`;
  const delQuando = radici(`${b.quando} ${b.temi.join(' ')}`);
  const comuni = [...radici(azione)].filter((r) => delQuando.has(r));
  if (comuni.length < MIN_RADICI_RILASCIO) return `l'azione ha in comune con «${b.quando}» solo: ${comuni.join(', ') || 'niente'}`;
  if (b.chi !== 'narratore') {
    const nominati = pngNominati(azione, nomiPng);
    if (nominati.size && !nominati.has(b.chi)) return `l'azione si rivolge a ${[...nominati].join(', ')}, non a ${b.chi}`;
  }
  return null;
}
