/**
 * Score of the pronunciation test (docs/pronuncia.md, «The ear test»): how much the Whisper transcript of
 * the name spoken by the voice resembles the intended sound. Pure functions.
 *
 * - The name is spoken inside a carrier sentence («Stasera parliamo di {nome}, poi andiamo.»): on its own
 *   Whisper transcribes it worse. `estraiNome` removes the carrier sentence's words from the transcript.
 * - The comparison is made on a rough phonetic key per language (`chiaveFonetica`): lowercase, no accents
 *   or hyphens, spellings of the same sound merged («dz»/«z», «ch»/«k», «ee»/«i»…), simple doubles.
 * - `somiglianza` is the average of two normalised Levenshtein distances: on the whole key and on the
 *   consonant skeleton alone (Whisper writes unstressed vowels as it likes).
 *
 * Known limit: the tonic accent is almost never visible in the transcript («Nèspola» and «Nespòla» are
 * written the same). On a tie, the spelling already chosen by the Preparer wins.
 */
import type { Lingua } from '../../apps/server/src/lingua';

const senzaAccenti = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '');

/** Rules (in order) that merge the spellings of the same sound, per language. */
const REGOLE: Record<Lingua, Array<[RegExp, string]>> = {
  // Capital letters are placeholders for a sound (the key is made of a-z): S soft «sc», C soft «c», G soft «g».
  it: [
    [/dz|ts/g, 'z'],
    [/gli/g, 'li'],
    [/gn/g, 'ni'],
    [/sc(?=[ei])/g, 'S'],
    [/c(?=[ei])/g, 'C'],
    [/g(?=[ei])/g, 'G'],
    [/ch|q|k/g, 'c'],
    [/gh/g, 'g'],
    [/h/g, ''],
    [/[yj]/g, 'i'],
    [/w/g, 'v'],
    [/x/g, 'cs'],
  ],
  en: [
    [/ph/g, 'f'],
    [/c(?=[eiy])/g, 's'],
    [/kh|ck|ch|q|k/g, 'c'],
    [/ee|ea|ie|ey/g, 'i'],
    [/oo|ou|ew/g, 'u'],
    [/ay|ai|ei/g, 'e'],
    [/aw|au/g, 'o'],
    [/y/g, 'i'],
    [/(?<=[bcdfgjklmnpqrstvxz])h/g, ''],
    [/x/g, 'cs'],
  ],
};

/** Rules on whole words, applied before merging the letters: the silent final «e» of English lengthens the vowel («Neve» = «neev»). */
const PAROLE: Partial<Record<Lingua, Array<[RegExp, string]>>> = {
  en: [
    [/e([bcdfgjklmnpstvz])e\b/g, 'ee$1'],
    [/a([bcdfgjklmnpstvz])e\b/g, 'ay$1'],
    [/i([bcdfgjklmnpstvz])e\b/g, 'igh$1'],
    [/o([bcdfgjklmnpstvz])e\b/g, 'o$1'],
    [/u([bcdfgjklmnpstvz])e\b/g, 'oo$1'],
    [/igh/g, 'ai'],
  ],
};

/** Rough phonetic key of a text, in the given language. */
export function chiaveFonetica(s: string, lingua: Lingua): string {
  let k = senzaAccenti(s).toLowerCase();
  for (const [re, sost] of PAROLE[lingua] ?? []) k = k.replace(re, sost);
  k = k.replace(/[^a-z]/g, '');
  for (const [re, sost] of REGOLE[lingua] ?? REGOLE.it) k = k.replace(re, sost);
  return k.replace(/(.)\1+/g, '$1');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const riga = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prec = riga[0]!;
    riga[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = riga[j]!;
      riga[j] = Math.min(riga[j]! + 1, riga[j - 1]! + 1, prec + (a[i - 1] === b[j - 1] ? 0 : 1));
      prec = tmp;
    }
  }
  return riga[b.length]!;
}

const simile = (a: string, b: string): number => (a.length || b.length ? 1 - levenshtein(a, b) / Math.max(a.length, b.length) : 1);
const consonanti = (k: string): string => k.replace(/[aeiou]/g, '');


/** Phonetic similarity between 0 and 1. */
export function somiglianza(a: string, b: string, lingua: Lingua): number {
  const ka = chiaveFonetica(a, lingua);
  const kb = chiaveFonetica(b, lingua);
  return (simile(ka, kb) + simile(consonanti(ka), consonanti(kb))) / 2;
}

const parole = (s: string): string[] => s.split(/[\s,.;:!?«»"“”'’()-]+/u).filter(Boolean);

/**
 * The transcript words in place of {nome} in the carrier sentence: from the start, the words that resemble
 * those before {nome} are removed, and from the end those after it. Null if nothing is left.
 */
export function estraiNome(trascrizione: string, portante: string, lingua: Lingua): string | null {
  const [prima = '', dopo = ''] = portante.split('{nome}');
  const p = parole(prima);
  const d = parole(dopo);
  const t = parole(trascrizione);
  let i = 0;
  while (i < p.length && i < t.length && somiglianza(p[i]!, t[i]!, lingua) >= 0.6) i++;
  let j = 0;
  while (j < d.length && t.length - 1 - j >= i && somiglianza(d[d.length - 1 - j]!, t[t.length - 1 - j]!, lingua) >= 0.6) j++;
  const resto = t.slice(i, t.length - j);
  return resto.length ? resto.join(' ') : null;
}

export interface Ascolto {
  /** The whole transcript. */
  trascrizione: string;
  /** What Whisper heard in place of the name. */
  sentito: string;
  /** Similarity to the intended sound (the best among the targets). */
  punteggio: number;
}

/**
 * The score of a listening: what was heard in place of the name against the intended sound (phonetic
 * similarity). The written name counts only if Whisper rewrites it identically (ignoring case and accents): then
 * the name was understood; merely resembling it is not enough, because the naive reading of a hard name («Nee-am»
 * for «Niamh») resembles it very much. Without an extracted name: the whole sentence against the carrier sentence with the intended sound.
 */
export function valuta(trascrizione: string, portante: string, suono: string, nome: string, lingua: Lingua): Ascolto {
  const sentito = estraiNome(trascrizione, portante, lingua);
  const uguale = (a: string, b: string): boolean => senzaAccenti(a).toLowerCase().replace(/[^a-z]/g, '') === senzaAccenti(b).toLowerCase().replace(/[^a-z]/g, '');
  const punteggio = sentito
    ? uguale(sentito, nome)
      ? 1
      : somiglianza(sentito, suono, lingua)
    : somiglianza(trascrizione, portante.replace('{nome}', suono), lingua) * 0.8;
  return { trascrizione, sentito: sentito ?? '', punteggio: Math.round(punteggio * 100) / 100 };
}
