/**
 * Id di battute del repertorio scritti tra parentesi quadre dentro il testo del narratore (L7 della
 * prova finale, docs/e2e-finale.md): il modello a volte scrive «[zir_ragazzo_mio]» al posto della
 * battuta, e la voce lo leggeva ad alta voce. Un id così non è una direzione per drama-3: si toglie
 * prima della voce e della trascrizione. Le altre parentesi (direzioni, [sigh], [pause]) restano.
 */

/** Un «[…]» di una riga sola, con dentro un id noto del repertorio (il confronto è esatto, dopo il trim). */
const PARENTESI = /\[([^[\]\r\n]{1,80})\]/g;

/**
 * Toglie dal testo le parentesi quadre che contengono un id di battuta del repertorio. Restituisce il
 * testo ripulito e gli id tolti (nell'ordine in cui comparivano), per il log.
 */
export function togliIdBattute(testo: string, idBattute: ReadonlySet<string>): { testo: string; tolti: string[] } {
  if (idBattute.size === 0 || !testo.includes('[')) return { testo, tolti: [] };
  const tolti: string[] = [];
  const pulito = testo.replace(PARENTESI, (intero: string, dentro: string) => {
    const id = dentro.trim();
    if (!idBattute.has(id)) return intero;
    tolti.push(id);
    return ' ';
  });
  if (tolti.length === 0) return { testo, tolti };
  return { testo: pulito.replace(/\s+/g, ' ').replace(/\s+([,.;:!?…»”)])/g, '$1').trim(), tolti };
}
