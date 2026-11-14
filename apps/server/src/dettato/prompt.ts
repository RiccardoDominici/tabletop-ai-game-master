/**
 * Whisper's initial prompt for a dictation (docs/ascolto.md, «The prompt»). Pure.
 *
 * Whisper continues its prompt: a prompt that looks like a transcript with the names correctly spelled makes it spell
 * them that way (OpenAI's Whisper prompting guide: correct spellings of unusual names and words in the prompt are the
 * documented way to fix them; a short sentence with punctuation also keeps the punctuation). Here: one sentence in the
 * play language that says what is being transcribed, then the characters, then the other names, most relevant first.
 *
 * Length: Whisper only looks at the last 224 tokens of the prompt (whisper.cpp keeps n_text_ctx/2), so the prompt is cut
 * by an estimate of its tokens, kept under `MAX_TOKEN_PROMPT`, dropping the least relevant names. An unusual name costs
 * more tokens than an ordinary word: the estimate is one token per three letters, rounded up, plus punctuation.
 */
import type { VoceVocabolario } from './vocabolario';

/** Estimated tokens the prompt may use (Whisper's own limit is 224). */
export const MAX_TOKEN_PROMPT = 180;

export interface ModelliPrompt {
  /** «Azione di un giocatore in una partita di gioco di ruolo.» */
  inizio: string;
  /** «Personaggi: {personaggi}.» */
  personaggi: string;
  /** «Nomi: {nomi}.» */
  nomi: string;
}

/** Rough count of Whisper tokens: a token every three letters of each word, plus every punctuation mark. */
export function stimaToken(testo: string): number {
  let n = 0;
  for (const m of testo.matchAll(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu)) n += /[\p{L}\p{N}]/u.test(m[0]) ? Math.ceil(m[0].length / 3) : 1;
  return n;
}

/** Names to list: written forms, without a single word already inside a listed multi-word name. */
function elenco(voci: readonly VoceVocabolario[]): string[] {
  const out: string[] = [];
  const parole = new Set<string>();
  for (const v of voci) {
    if (v.scritto.includes(' ')) for (const p of v.scritto.split(/\s+/)) parole.add(p.toLowerCase());
  }
  const visti = new Set<string>();
  for (const v of voci) {
    const k = v.scritto.toLowerCase();
    if (visti.has(k) || (!v.scritto.includes(' ') && parole.has(k))) continue;
    visti.add(k);
    out.push(v.scritto);
  }
  return out;
}

/**
 * The prompt for this vocabulary: characters (PCs and visible NPCs) and the other names, most relevant first, within
 * `maxToken`. An empty vocabulary gives just the opening sentence.
 */
export function costruisciPrompt(voci: readonly VoceVocabolario[], modelli: ModelliPrompt, maxToken = MAX_TOKEN_PROMPT): string {
  const personaggi = elenco(voci.filter((v) => v.tipo === 'pg' || v.tipo === 'png'));
  const nomi = elenco(voci.filter((v) => v.tipo !== 'pg' && v.tipo !== 'png')).filter((n) => !personaggi.includes(n));
  const componi = (p: readonly string[], n: readonly string[]): string =>
    [modelli.inizio, p.length ? modelli.personaggi.replace('{personaggi}', p.join(', ')) : '', n.length ? modelli.nomi.replace('{nomi}', n.join(', ')) : '']
      .filter(Boolean)
      .join(' ');
  // Cut from the least relevant end: first the other names, then the characters.
  const p = [...personaggi];
  const n = [...nomi];
  while (stimaToken(componi(p, n)) > maxToken && (n.length || p.length)) {
    if (n.length) n.pop();
    else p.pop();
  }
  return componi(p, n);
}
