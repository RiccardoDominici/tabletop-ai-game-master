/**
 * R-ripetuta's keys and match (coerenza/verifica.ts): what counts as a sentence the table already heard.
 *
 * Round 7 in profile A repeated NPC gestures and catchphrases through prepared and scriptwriter lines, not through
 * improvised sentences: «Ugo batte la pala per terra due volte.» at T10 (a scriptwriter line) and T14 (`ugo_attesa`),
 * and at T6/T7 of another game with a tail («…due volte, senza alzare la testa.»). So the keys are per sentence (a
 * line's row may hold two), and a sentence repeats one heard when the words are the same or one opens with all the
 * words of the other (at least `PAROLE_GESTO` of them: a gesture told again with a tail, or cut short).
 */
import { normalizza } from '../azioni/regole';
import { dividiTesto } from '../narrazione/frasi';

/** Below this length (normalised characters) a sentence is never a repetition («Sì.», «Andiamo.»). */
export const LUNGHEZZA_MINIMA = 12;
/** A shared opening of at least this many words is the same gesture told again. */
export const PAROLE_GESTO = 5;

/** Lowercase, no accents or punctuation, single spaces: the key of one sentence. */
export function frasePerRipetizione(t: string): string {
  return normalizza(t).replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** The keys of every sentence of a text (a transcript row or a line's row may hold more than one). */
export function chiaviRipetizione(testo: string): string[] {
  return dividiTesto(testo)
    .map(frasePerRipetizione)
    .filter((k) => k.length > 0);
}

/** Every sentence of an Engine line was heard (the keys are per sentence): the line is not said again. */
export function giàSentita(testo: string, sentite: ReadonlySet<string>): boolean {
  const chiavi = chiaviRipetizione(testo);
  return chiavi.length > 0 && chiavi.every((k) => sentite.has(k));
}

/** The heard sentence `k` repeats, if any: the same words, or one opens with all the words of the other (≥ PAROLE_GESTO). */
export function ripete(k: string, sentite: ReadonlySet<string> | undefined): string | null {
  if (!sentite || k.length < LUNGHEZZA_MINIMA) return null;
  if (sentite.has(k)) return k;
  if (k.split(' ').length < PAROLE_GESTO) return null;
  for (const s of sentite) {
    if (s.length < LUNGHEZZA_MINIMA) continue;
    const [corta, lunga] = s.length <= k.length ? [s, k] : [k, s];
    if (corta.split(' ').length >= PAROLE_GESTO && lunga.startsWith(`${corta} `)) return s;
  }
  return null;
}
