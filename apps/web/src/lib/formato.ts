/**
 * Formattazione pura per l'interfaccia (testata in formato.test.ts).
 */

/** Spazio fine non separabile: separa le migliaia senza confondersi col punto decimale. */
const SPAZIO_MIGLIAIA = '\u202f';

/** Millisecondi leggibili per l'HUD: «10 607 ms» (spazio fine, non «10.607»), «—» se assente. */
export function formattaMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  const intero = String(Math.round(ms)).replace(/\B(?=(\d{3})+(?!\d))/g, SPAZIO_MIGLIAIA);
  return `${intero} ms`;
}

/**
 * Battuta tra caporali «…». Il contratto dice che le battute arrivano senza virgolette, ma se
 * ne hanno già (o hanno quelle inglesi) non si raddoppiano.
 */
export function virgolettato(testo: string): string {
  const pulito = testo.trim();
  if (/^[«"“„']/.test(pulito)) return pulito;
  return `«${pulito}»`;
}

/** Costo in dollari con abbastanza decimali per i centesimi di centesimo. */
export function formattaCosto(usd: number | null | undefined): string {
  if (usd === null || usd === undefined || !Number.isFinite(usd)) return '—';
  return `$${usd.toFixed(usd < 0.01 ? 5 : 4)}`;
}

/** Secondi interi rimasti fino a `scadenzaMs` (mai negativi), arrotondati per eccesso. */
export function secondiRimasti(scadenzaMs: number, oraMs: number): number {
  return Math.max(0, Math.ceil((scadenzaMs - oraMs) / 1000));
}

/** Elenco italiano: «A», «A e B», «A, B e C». */
export function elencoNomi(nomi: readonly string[]): string {
  if (nomi.length === 0) return '';
  if (nomi.length === 1) return nomi[0] ?? '';
  return `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1] ?? ''}`;
}
