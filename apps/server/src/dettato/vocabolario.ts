/**
 * The vocabulary of a dictation (docs/ascolto.md, «The vocabulary»): the names the transcript should spell right, most
 * relevant first, with the forms they may be HEARD as. Pure: the service (dettato/servizio.ts) gathers the sources.
 *
 * Sources, in this order of relevance (the prompt keeps the first ones when it has to cut):
 *   1. the PC names (all of them, the speaker's first);
 *   2. the NPCs the table can see (present in the scene first, then met), with their capitalised aliases;
 *   3. names the server learned in this session (dettato/apprendimento.ts);
 *   4. lexicon entries (pronunce.yaml, pronunce-gioco.yaml) already MENTIONED at the table;
 *   5. rule-set terms (prompt only, never a correction target: they are ordinary words).
 *
 * Only public names: an NPC never met, a secret word or a name of the lexicon never said at the table stays out of the
 * prompt and of the correction. Whisper can echo its prompt on silence, and a correction toward a name nobody has heard
 * yet would spell a spoiler on the phone. Every name heard at the table is public by definition.
 *
 * Heard forms (`sentiti`): the lexicon `forme` (same sound), the respelling for the voice and the intended sound of the
 * language block (`grafia`, `suono`: they are written the way the name SOUNDS, which is what Whisper writes), the
 * capitalised aliases, and what the players' corrections taught (`appresi`).
 */
import type { Lingua } from '../lingua';
import { grafiaDi, type VoceLessico } from '../voce/pronuncia';
import { formaPiana } from './fonetica';

export type TipoVoce = 'pg' | 'png' | 'appreso' | 'lessico' | 'termine';

export interface VoceVocabolario {
  /** How the name is written (what a correction puts in the text). */
  scritto: string;
  /** Other forms it may be heard or written as (never the same as `scritto`). */
  sentiti: string[];
  tipo: TipoVoce;
  /** The name is also an ordinary word («Grosso», «Rose»): a lowercase span is never changed into it. */
  soloMaiuscolo: boolean;
  /** False for rule terms: they help the prompt, they are never a correction target. */
  correggibile: boolean;
}

/** A name learned from a player's edit or from a sent action (dettato/apprendimento.ts). */
export interface NomeAppreso {
  scritto: string;
  /** What the transcript had in its place (empty for a name typed without a dictation). */
  sentiti: string[];
  /** Turn when it was learned (for the log and the registry). */
  turno: number;
}

export interface FontiVocabolario {
  lingua: Lingua;
  /** All PCs; `mio` marks the speaker's (it goes first). */
  pg: ReadonlyArray<{ nome: string; alias?: readonly string[]; mio?: boolean }>;
  /** NPCs visible at the table (StatoTavolo.scena.personaggi): present ones first. */
  png: ReadonlyArray<{ nome: string; alias?: readonly string[]; presente: boolean }>;
  appresi: readonly NomeAppreso[];
  /** pronunce.yaml + pronunce-gioco.yaml entries. */
  lessico: readonly VoceLessico[];
  /** True when the word (plain form, one word) has been said at the table: filters the lexicon entries. */
  menzionato: (formaPiana: string) => boolean;
  /** Rule-set terms for the prompt (abilities, conditions…), already in the play language. */
  termini?: readonly string[];
}

const pulito = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');
const maiuscolo = (s: string): boolean => /^\p{Lu}/u.test(s);

/** The vocabulary, deduplicated by written form (the first, most relevant occurrence wins; heard forms merge). */
export function costruisciVocabolario(f: FontiVocabolario): VoceVocabolario[] {
  const voci: VoceVocabolario[] = [];
  const perScritto = new Map<string, VoceVocabolario>();
  const aggiungi = (scritto: string, sentiti: readonly string[], tipo: TipoVoce, opzioni: { soloMaiuscolo?: boolean; correggibile?: boolean } = {}): void => {
    const s = scritto.trim();
    if (s.length < 2) return;
    const chiave = formaPiana(s);
    const nuovi = sentiti.map((x) => x.trim()).filter((x) => x.length >= 2);
    const esistente = perScritto.get(chiave);
    if (esistente) {
      for (const x of nuovi) if (x !== esistente.scritto && !esistente.sentiti.includes(x)) esistente.sentiti.push(x);
      esistente.soloMaiuscolo ||= opzioni.soloMaiuscolo === true;
      return;
    }
    const v: VoceVocabolario = { scritto: s, sentiti: [...new Set(nuovi.filter((x) => x !== s))], tipo, soloMaiuscolo: opzioni.soloMaiuscolo === true, correggibile: opzioni.correggibile !== false };
    perScritto.set(chiave, v);
    voci.push(v);
  };
  /** A full name and each of its capitalised words (the table says «Ninfa», the sheet says «Ninfa Rovere»). */
  const nome = (n: string, alias: readonly string[] | undefined, tipo: TipoVoce): void => {
    const intero = pulito(n);
    if (!intero) return;
    const parti = intero.split(/\s+/).filter((p) => maiuscolo(p) && p.length >= 2);
    const aliasMaiuscoli = (alias ?? []).map(pulito).filter((a) => a && maiuscolo(a));
    if (parti.length > 1) aggiungi(intero, [], tipo);
    for (const p of parti) aggiungi(p, [], tipo);
    for (const a of aliasMaiuscoli) aggiungi(a, [], tipo);
  };
  /** A lexicon name counts as said when each of its words has been said («Torre Mozza»: «torre» and «mozza»). */
  const detto = (x: string): boolean => {
    const parole = formaPiana(x).split(/[\s'-]+/).filter(Boolean);
    return parole.length > 0 && parole.every((w) => f.menzionato(w));
  };

  for (const p of [...f.pg].sort((a, b) => Number(b.mio === true) - Number(a.mio === true))) nome(p.nome, p.alias, 'pg');
  for (const p of [...f.png].sort((a, b) => Number(b.presente) - Number(a.presente))) nome(p.nome, p.alias, 'png');
  for (const a of f.appresi) aggiungi(a.scritto, a.sentiti, 'appreso');

  // The lexicon: names already heard at the table, with the forms they sound like.
  for (const v of f.lessico) {
    const scritto = pulito(v.nome);
    if (!scritto) continue;
    const forme = Array.isArray(v.forme) ? v.forme.map(pulito).filter(Boolean) : [];
    const lingua = grafiaDi(v, f.lingua);
    const blocco = v[f.lingua] && typeof v[f.lingua] === 'object' ? (v[f.lingua] as Record<string, unknown>) : {};
    const suono = pulito(blocco['suono']);
    const sentiti = [...forme, ...(lingua ? [lingua.grafia] : []), ...(suono ? [suono] : [])];
    const conosciuto = perScritto.has(formaPiana(scritto));
    if (conosciuto || [scritto, ...forme].some(detto)) {
      aggiungi(scritto, sentiti, 'lessico', { soloMaiuscolo: v.solo_maiuscolo === true });
    }
    // Inflected forms with their own respelling («Zirrani»): a name of their own, when said.
    for (const [forma, grafia] of Object.entries(lingua?.forme ?? {})) {
      if (detto(forma)) aggiungi(forma, [grafia], 'lessico', { soloMaiuscolo: v.solo_maiuscolo === true });
    }
  }
  for (const t of f.termini ?? []) aggiungi(t, [], 'termine', { correggibile: false });
  return voci;
}

/** The words of a public text, as plain forms (for `menzionato`). */
export function paroleDi(testo: string): string[] {
  return [...testo.matchAll(/[\p{L}\p{N}]+(?:[-][\p{L}\p{N}]+)*/gu)].map((m) => formaPiana(m[0]));
}
