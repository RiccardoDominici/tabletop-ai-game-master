/**
 * Guardia dei numeri delle regole a voce (docs/prove.md, «Narrazione»): punti ferita, CA e CD non si
 * leggono ad alta voce, li mostra già la carta del tiro sul proiettore. Una frase del narratore che li
 * dice («Corrado ha quattro punti di vita», «contro la CA 15») perde il numero prima della voce e
 * della trascrizione; il resto della frase resta com'è. Logica pura.
 */

const NUMERI = 'zero|uno|un|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici|tredici|quattordici|quindici|sedici|diciassette|diciotto|diciannove|venti|ventuno|ventidue|ventitré|ventitre|ventiquattro|venticinque|ventisei|ventisette|ventotto|ventinove|trenta';
const N = `(\\d+|${NUMERI})`;

/** «7 punti ferita (su 12)», «quattro punti di vita», «0 punti ferita». */
const PF = new RegExp(`\\b${N}\\s+(punt[oi])\\s+(ferita|di\\s+vita)(?:\\s+su\\s+${N})?`, 'gi');
/** «7/12 PF», «7 PF». */
const PF_SIGLA = new RegExp(`\\b${N}(?:\\s*/\\s*${N})?\\s*PF\\b`, 'g');
/** «la CA 15», «CA di 15» (sigla maiuscola), «classe armatura 15». */
const CA = new RegExp(`\\b(?:(?:la|una)\\s+)?(?:CA|[Cc]lasse\\s+[Aa]rmatura)(?:\\s+(?:di|è))?\\s+${N}\\b`, 'g');
/** «la CD 15», «CD di 15», «classe difficoltà 15». */
const CD = new RegExp(`\\b(?:(?:la|una)\\s+)?(?:CD|[Cc]lasse\\s+(?:di\\s+)?[Dd]ifficoltà)(?:\\s+(?:di|è))?\\s+${N}\\b`, 'g');

const zero = (n: string): boolean => n === '0' || n.toLowerCase() === 'zero';

/** «è a 0 punti ferita» → «è a terra». */
const A_ZERO = /\ba\s+(?:0|zero)\s+punti\s+(?:ferita|di\s+vita)\b/gi;

export function togliNumeriRegole(testo: string): { testo: string; tolti: string[] } {
  const tolti: string[] = [];
  let t = testo.replace(A_ZERO, (m: string) => {
    tolti.push(m);
    return 'a terra';
  });
  t = t.replace(PF, (m: string, n: string, punti: string, unita: string) => {
    tolti.push(m);
    const di = unita.toLowerCase().startsWith('di') ? 'di vita' : 'ferita';
    return zero(n) ? `nessun punto ${di}` : `${punti[0] === 'P' ? 'Alcuni' : 'alcuni'} punti ${di}`;
  });
  t = t.replace(PF_SIGLA, (m: string, n: string) => {
    tolti.push(m);
    return zero(n) ? 'nessun punto ferita' : 'alcuni punti ferita';
  });
  t = t.replace(CA, (m: string) => {
    tolti.push(m);
    return "l'armatura";
  });
  t = t.replace(CD, (m: string) => {
    tolti.push(m);
    return 'la difficoltà';
  });
  return { testo: t, tolti };
}
