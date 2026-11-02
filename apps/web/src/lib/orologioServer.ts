/**
 * Scarto tra l'orologio del server e quello di questo dispositivo.
 *
 * I conti alla rovescia (`finestra.chiusura_prevista_ms`) sono epoch ms del SERVER: un telefono
 * con l'ora sbagliata di qualche secondo mostrerebbe un tempo sbagliato. Ogni istantanea porta
 * `ora_server_ms`; da lì si stima lo scarto (ignorando il tempo di viaggio, pochi ms in LAN).
 */
let scartoMs = 0;

export function aggiornaScarto(oraServerMs: number): void {
  if (Number.isFinite(oraServerMs)) scartoMs = oraServerMs - Date.now();
}

/** Ora corrente sull'orologio del server. */
export function oraServer(): number {
  return Date.now() + scartoMs;
}
