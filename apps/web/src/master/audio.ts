/**
 * Nomi leggibili dell'audio per il pannello del master (logica pura, testata in audio.test.ts):
 * i tag e gli id del catalogo diventano parole («esplorazione_tesa» → «esplorazione tesa»,
 * «sfx_porta_cigola» → «porta cigola»). Umori ed effetti non sono segreti: si mostrano sempre.
 */

/** Tag d'umore → nome. */
export function nomeUmore(tag: string): string {
  return tag.replace(/_/g, ' ').trim();
}

/** Id d'effetto (sfx_<tag>) → nome. */
export function nomeEffetto(id: string): string {
  return id.replace(/^sfx_/, '').replace(/_/g, ' ').trim();
}

/** Id di una traccia del catalogo → nome breve («luogo_n_piazza» → «n piazza»; «umore_lutto» → «lutto»). */
export function nomeTraccia(id: string | null): string {
  if (!id) return '—';
  return id.replace(/^(luogo|umore|amb|tema|sfx)_/, '').replace(/_/g, ' ').trim();
}
