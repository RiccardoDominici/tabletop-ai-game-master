/**
 * The language data of the dictation (lingue/<l>/motore.yaml, section `dettato`) and the ordinary words a correction
 * must never replace (docs/ascolto.md, «Ordinary words»).
 *
 * Ordinary words = the section's `parole_comuni` + every word written in lowercase somewhere in the language pack's
 * fixed texts and in the campaign's own texts (scenes, NPC and PC sheets, repertoire lines, campaign.yaml): if a
 * campaign writes «grosso» in lowercase, «grosso» is a word of its language, even when an NPC is called Grosso.
 * Ids are not texts («png_berta»): values made only of lowercase letters, digits and underscores are skipped.
 */
import type { Campagna } from '../campagna/tipi';
import { caricaPacco, type Lingua } from '../lingua';
import { campoElenco, campoTesto, regole } from '../lingua/motore';
import type { Repertorio } from '../repertorio/tipi';
import type { ModelliPrompt } from './prompt';
import { formaPiana } from './fonetica';

export interface LinguaDettato {
  prompt: ModelliPrompt;
  paroleComuni: ReadonlySet<string>;
  /** Plain forms of what Whisper writes on silence: a transcript that is only one of these is empty. */
  allucinazioni: readonly string[];
}

/** The `dettato` section of a language, compiled once. */
export function linguaDettato(lingua?: Lingua): LinguaDettato {
  return regole(
    'dettato',
    (s) => ({
      prompt: { inizio: campoTesto(s, 'prompt_inizio'), personaggi: campoTesto(s, 'prompt_personaggi'), nomi: campoTesto(s, 'prompt_nomi') },
      paroleComuni: new Set(campoElenco(s, 'parole_comuni').map(formaPiana)),
      allucinazioni: campoElenco(s, 'allucinazioni').map((x) => formaPiana(x).replace(/[^\p{L}\p{N} ]/gu, '').trim()),
    }),
    lingua,
  );
}

const ID = /^[a-z0-9_]+$/;

/** Every string inside a YAML value (ids skipped). */
export function stringheDi(x: unknown, out: string[] = [], profondita = 0): string[] {
  if (profondita > 12) return out;
  if (typeof x === 'string') {
    if (!ID.test(x)) out.push(x);
  } else if (Array.isArray(x)) for (const v of x) stringheDi(v, out, profondita + 1);
  else if (x && typeof x === 'object') for (const v of Object.values(x as Record<string, unknown>)) stringheDi(v, out, profondita + 1);
  return out;
}

/** The plain forms of the words that appear written in lowercase in these texts. */
export function paroleMinuscole(testi: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const t of testi) for (const m of t.matchAll(/(?<![\p{L}\p{N}_])\p{Ll}[\p{L}]*(?![\p{L}\p{N}_])/gu)) if (m[0].length >= 2) out.add(formaPiana(m[0]));
  return out;
}

/** The texts of a campaign (and of its repertoire) where the ordinary words of its language are found. */
export function testiCampagna(c: Campagna, repertorio?: Repertorio): string[] {
  const out: string[] = [];
  stringheDi(c.campagnaNarratore, out);
  stringheDi(c.stile, out);
  for (const sc of c.scene) stringheDi(sc.dati, out);
  for (const p of c.png) stringheDi(p.dati, out);
  for (const p of c.pg) stringheDi(p.pubblico, out);
  if (c.situazioneComune) out.push(c.situazioneComune);
  for (const b of repertorio?.battute ?? []) stringheDi([b.testo, b.varianti], out);
  return out;
}

/** The ordinary words of the language and of the campaign (see the head of this file). */
export function paroleComuni(lingua: Lingua, testi: Iterable<string>): Set<string> {
  const out = new Set(linguaDettato(lingua).paroleComuni);
  for (const w of paroleMinuscole(Object.values(caricaPacco(lingua).testi))) out.add(w);
  for (const w of paroleMinuscole(testi)) out.add(w);
  return out;
}
