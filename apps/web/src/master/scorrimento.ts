/**
 * Scorrimento «educato» della trascrizione: si segue il fondo solo se il master era già in fondo
 * (o quasi). Se è risalito a rileggere, non lo si strattona. Logica pura, testata in
 * scorrimento.test.ts; l'hook React è in useSegueFondo.ts.
 */

/** Entro questa distanza dal fondo si considera «in fondo». */
export const SOGLIA_FONDO_PX = 80;

export interface MisureScorrimento {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
}

/** Il contenitore è in fondo (entro `soglia` px). */
export function vicinoAlFondo(misure: MisureScorrimento, soglia = SOGLIA_FONDO_PX): boolean {
  return misure.scrollHeight - misure.scrollTop - misure.clientHeight < soglia;
}
