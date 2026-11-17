/**
 * R-eco (docs/coerenza.md): a narrator or NPC sentence that restates a player's words beyond the announcement. Round 7
 * (off the rails, T4): Fulco wrote «Il mulino sul fiume ha la ruota rotta da mesi», and a line answered «Nano, la ruota
 * è rotta da mesi.»: the player's claim came back as the world's. The announcement (llm/annuncio.ts) is the only place
 * the player's words are said, and as theirs.
 *
 * A sentence is an echo of a clause of this turn's public actions when it shares at least MIN_COMUNI content words
 * with it (plain forms of four letters or more, the language's function words left out) and those are at least
 * QUOTA of its own content words: an answer reuses a noun or two («La lavagna l'ha scritta…»), an echo most of them.
 * Pure: texts in, the echoed clause out.
 */
import { normalizza } from '../azioni/regole';

/** Shared content words for an echo. */
export const MIN_COMUNI = 3;
/** Share of the sentence's content words found in the clause. */
export const QUOTA = 0.6;

function contenuti(t: string, vuote: ReadonlySet<string>): Set<string> {
  return new Set(
    normalizza(t)
      .replace(/[^\p{L}\p{N}' ]/gu, ' ')
      .split(/[\s']+/)
      .filter((w) => w.length >= 4 && !vuote.has(w)),
  );
}

/** The clause of `azioni` the sentence restates, or null. `vuote`: the language's function words (plain forms). */
export function ecoDi(frase: string, azioni: readonly string[], vuote: ReadonlySet<string>): string | null {
  const mie = contenuti(frase, vuote);
  if (mie.size < MIN_COMUNI) return null;
  for (const a of azioni) {
    for (const clausola of a.split(/[,;:.!?…]+/)) {
      const loro = contenuti(clausola, vuote);
      const comuni = [...mie].filter((w) => loro.has(w));
      if (comuni.length >= MIN_COMUNI && comuni.length >= QUOTA * mie.size) return clausola.trim();
    }
  }
  return null;
}
