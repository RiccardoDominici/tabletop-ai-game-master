/**
 * Phonetic key and similarity for the dictation post-correction (docs/ascolto.md, «Correction»). Pure functions.
 *
 * Whisper writes what it hears: a fantasy name comes back respelled by sound («Zirrà» → «Zirà», «Tsirra»,
 * «Sirra»), split («Valdirame» → «Val di Rame») or glued to an ordinary word. To recognise a respelling the
 * transcript span and every known form of a name are reduced to a rough phonetic key of the language, then compared
 * with an edit distance where close sounds cost less than distant ones.
 *
 * The key (lowercase a-z plus a few capital placeholders for one sound each):
 * - accents, hyphens, spaces and apostrophes go; double letters become single;
 * - it: dz/ts → z, gli → li, gn → ni, sc+e/i → S («sh»), c+e/i → C («ch»), g+e/i → G («j»), ch/q/k/c → k,
 *   gh → g, h silent, y/j → i, w → v, x → ks, ph → f;
 * - en: ph → f, c+e/i/y → s, ck/ch/q/c/k → k, sh → S, th → t, ee/ea/ie → i, oo/ou → u, ay/ai/ei → e, y → i,
 *   silent final e (a consonant then e: «Neve» → nev), wh → w.
 * The rules start from strumenti/pronuncia/punteggio.ts (the ear test of the voice), but this key is for real words
 * and names, not for the voice respellings, so the two are kept apart: changing one must not move the scores of the other.
 *
 * Similarity: 1 − weighted Levenshtein / longest key, averaged with the same measure on the consonant skeleton
 * (Whisper writes unstressed vowels as it likes). A substitution inside a class of close sounds costs 0.5
 * (s/z/C/S, k/g, t/d, p/b, f/v, m/n, r/l, e/i, o/u); any other edit costs 1.
 */
import type { Lingua } from '../lingua';

const senzaAccenti = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '');

/** Ordered rules per language: each merges the spellings of one sound. Capitals are one-sound placeholders. */
const REGOLE: Record<Lingua, Array<[RegExp, string]>> = {
  it: [
    [/ph/g, 'f'],
    [/dz|ts/g, 'z'],
    [/gli(?=[aeiou])/g, 'l'],
    [/gli/g, 'li'],
    [/gn/g, 'ni'],
    [/sci(?=[aou])/g, 'S'],
    [/sc(?=[ei])/g, 'S'],
    [/ci(?=[aou])/g, 'C'],
    [/c(?=[ei])/g, 'C'],
    [/gi(?=[aou])/g, 'G'],
    [/g(?=[ei])/g, 'G'],
    [/ch|q|k|c/g, 'k'],
    [/gh/g, 'g'],
    [/h/g, ''],
    [/[yj]/g, 'i'],
    [/w/g, 'v'],
    [/x/g, 'ks'],
  ],
  en: [
    [/ph/g, 'f'],
    [/wh/g, 'w'],
    [/sh/g, 'S'],
    [/th/g, 't'],
    [/c(?=[eiy])/g, 's'],
    [/ck|ch|q|c|k/g, 'k'],
    [/ee|ea|ie/g, 'i'],
    [/oo|ou/g, 'u'],
    [/ay|ai|ei/g, 'e'],
    [/y/g, 'i'],
    [/(?<=[bdfgjklmnpqrstvxz])h/g, ''],
    [/x/g, 'ks'],
  ],
};

/** Rules on whole words, before the letters are merged: the silent final «e» of English. */
const PAROLE: Partial<Record<Lingua, Array<[RegExp, string]>>> = {
  en: [[/(?<=[a-z][bcdfgklmnprstvz])e\b/g, '']],
};

/** Rough phonetic key of a word or a span of words, in a language. */
export function chiaveFonetica(s: string, lingua: Lingua): string {
  let k = senzaAccenti(s).toLowerCase();
  for (const [re, sost] of PAROLE[lingua] ?? []) k = k.replace(re, sost);
  // Double consonants go before the rules too: «Faggioli» is «fagioli» to the ear (vowels stay: English «ee»).
  k = k.replace(/[^a-z]/g, '').replace(/([b-df-hj-np-tv-z])\1+/g, '$1');
  for (const [re, sost] of REGOLE[lingua]) k = k.replace(re, sost);
  return k.replace(/(.)\1+/g, '$1');
}

/** Classes of close sounds: a substitution inside one costs half. */
const CLASSI = ['szCS', 'kg', 'td', 'pb', 'fv', 'mn', 'rl', 'ei', 'ou'];
const classe = new Map<string, number>();
CLASSI.forEach((c, i) => {
  for (const x of c) classe.set(x, i);
});

function costoSostituzione(a: string, b: string): number {
  if (a === b) return 0;
  const ca = classe.get(a);
  return ca !== undefined && ca === classe.get(b) ? 0.5 : 1;
}

/** Levenshtein distance with the cheaper substitutions of close sounds. */
export function distanzaPesata(a: string, b: string): number {
  if (a === b) return 0;
  const riga = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prec = riga[0]!;
    riga[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = riga[j]!;
      riga[j] = Math.min(riga[j]! + 1, riga[j - 1]! + 1, prec + costoSostituzione(a[i - 1]!, b[j - 1]!));
      prec = tmp;
    }
  }
  return riga[b.length]!;
}

const simile = (a: string, b: string): number => (a.length || b.length ? 1 - distanzaPesata(a, b) / Math.max(a.length, b.length) : 1);
const consonanti = (k: string): string => k.replace(/[aeiou]/g, '');

/** Similarity of two phonetic keys, between 0 and 1. */
export function somiglianzaChiavi(ka: string, kb: string): number {
  if (ka === kb) return 1;
  return (simile(ka, kb) + simile(consonanti(ka), consonanti(kb))) / 2;
}

/** Phonetic similarity of two texts, between 0 and 1. */
export function somiglianzaFonetica(a: string, b: string, lingua: Lingua): number {
  return somiglianzaChiavi(chiaveFonetica(a, lingua), chiaveFonetica(b, lingua));
}

/** The comparable form of a word: lowercase, without accents (for exact matches that ignore case and accents). */
export function formaPiana(s: string): string {
  return senzaAccenti(s).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
}
