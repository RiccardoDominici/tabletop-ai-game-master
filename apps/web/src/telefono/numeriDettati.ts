/**
 * The dice values in a dictated sentence (manual rolls, docs/prove.md §8): «ho fatto 14», «quattordici e tre»,
 * «I rolled a nineteen». Digits first, then number words in Italian and English (the dictation's transcript can come in
 * either form). Articles («un», «una», «a», «an») are never a 1: «ho fatto un 14» is 14. Pure: tested in
 * numeriDettati.test.ts.
 */

const UNITA_IT: Record<string, number> = { uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9 };
const FISSI_IT: Record<string, number> = {
  ...UNITA_IT,
  dieci: 10,
  undici: 11,
  dodici: 12,
  tredici: 13,
  quattordici: 14,
  quindici: 15,
  sedici: 16,
  diciassette: 17,
  diciotto: 18,
  diciannove: 19,
  cento: 100,
};
const DECINE_IT: Record<string, number> = { venti: 20, trenta: 30, quaranta: 40, cinquanta: 50, sessanta: 60, settanta: 70, ottanta: 80, novanta: 90 };

const UNITA_EN: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const FISSI_EN: Record<string, number> = {
  ...UNITA_EN,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  hundred: 100,
};
const DECINE_EN: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** An Italian word as a number: «quattordici», «ventuno», «trentotto» (the tens drop their vowel before uno/otto). */
function parolaItaliana(p: string): number | null {
  if (p in FISSI_IT) return FISSI_IT[p]!;
  for (const [d, v] of Object.entries(DECINE_IT)) {
    if (p === d) return v;
    const radice = d.slice(0, -1);
    if (!p.startsWith(radice)) continue;
    const resto = p.startsWith(d) ? p.slice(d.length) : p.slice(radice.length);
    if (resto in UNITA_IT) return v + UNITA_IT[resto]!;
  }
  return null;
}

function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(\d)\s*[-–]\s*(?=\d)/g, '$1 ');
}

/** Every number in the sentence, in order. */
export function numeriDettati(testo: string): number[] {
  const parole = normalizza(testo).split(/[^a-z0-9]+/).filter(Boolean);
  const out: number[] = [];
  for (let i = 0; i < parole.length; i++) {
    const p = parole[i]!;
    if (/^\d+$/.test(p)) {
      out.push(Number(p));
      continue;
    }
    const it = parolaItaliana(p);
    if (it !== null) {
      out.push(it);
      continue;
    }
    if (p in DECINE_EN) {
      // «twenty one», «twenty-one» (the hyphen splits the words).
      const dopo = parole[i + 1];
      if (dopo && dopo in UNITA_EN) {
        out.push(DECINE_EN[p]! + UNITA_EN[dopo]!);
        i += 1;
      } else out.push(DECINE_EN[p]!);
      continue;
    }
    if (p in FISSI_EN) out.push(FISSI_EN[p]!);
  }
  return out;
}

/**
 * The values for a request with `quanti` dice of `facce` faces: the first `quanti` numbers that fit a die, or null if
 * the sentence does not have enough of them.
 */
export function valoriDettati(testo: string, quanti: number, facce: number): number[] | null {
  const validi = numeriDettati(testo).filter((n) => Number.isInteger(n) && n >= 1 && n <= facce);
  return validi.length >= quanti ? validi.slice(0, quanti) : null;
}
