/**
 * Name pronunciation (docs/pronuncia.md). Campaign names are unusual (characters, places, objects,
 * factions, gods, rulebook terms) and even a good voice reads them badly: before synthesis, every text that
 * goes to the VOICE passes through a pronunciation lexicon, never the one shown on screen (projector, phones,
 * transcript).
 *
 * The lexicon, per language, comes from:
 * 1. `campagne/<id>/pronunce.yaml` (written by the Preparer, and checked "by ear" by strumenti/pronuncia/);
 * 2. `campagne/<id>/pronunce-gioco.yaml`: new names from play (voce/lessico-vivo.ts, proposed by Claude Code);
 * 3. the `pronuncia` field of the PNG and PG sheets («Bàldrin Pietrafìtta»), word by word, as before.
 *
 * Shape of pronunce.yaml:
 *   lessico:
 *     - nome: Zirrà                 # how it is written in the texts
 *       tipo: luogo                 # png, pg, luogo, oggetto, fazione, dio, termine…
 *       forme: [Zirra]              # other spellings written with the SAME pronunciation (variants)
 *       solo_maiuscolo: false       # true if the name is also a common word («Sasso», «Ponte»)
 *       it:
 *         grafia: Dzirrà
 *         nota: "z sonora, accento sull'ultima"
 *         forme: {Zirrani: Dzirràni, zirrana: dzirràna}   # inflected forms, each with its own spelling
 *       en:
 *         grafia: Dzeer-RAH
 *         motori: {qwen: Dzeer-rah}  # a form for one voice engine, when the ear test found it better there
 *
 * Application: whole words (also multi-word: «Torre Mozza»), the `forme`, the form without accents, the
 * English possessive («'s»), and the lowercase forms players type («eliandro») unless `solo_maiuscolo`. Longer
 * entries win; a spelling already applied is not rewritten.
 *
 * Per voice engine: the respelling can depend on the engine in use. An entry's `motori` form for that engine wins;
 * without one, Qwen gets `stileQwen(grafia)`, because it reads a capitalised syllable as an acronym («ee-VAWN» heard
 * as «E-Valve UN»), and drama-3 and the fake voice get `grafia` as it is.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import type { Campagna, DatiYaml } from '../campagna/tipi';
import { LINGUA_PREDEFINITA, type Lingua } from '../lingua';
import type { NomeMotoreVoce } from './tipi';

export type Pronunciatore = (testo: string) => string;

export interface VoceLessico {
  nome: string;
  tipo?: string;
  forme?: string[];
  solo_maiuscolo?: boolean;
  /** Per language: spelling for the voice, and a note (for whoever writes or checks it, not for the voice). */
  [lingua: string]: unknown;
}

export interface GrafiaLingua {
  grafia: string;
  nota?: string;
  /** Inflected forms with their own pronunciation (written form → spelling): «Zirrani» → «Dzirràni». */
  forme?: Record<string, string>;
  /** A respelling for one voice engine, when it differs from `grafia` (chosen by the ear test). */
  motori?: MotoriGrafia;
}

/** The engines that can have their own respelling (the fake voice reads nothing). */
export const MOTORI_GRAFIA = ['fish', 'qwen'] as const;
export type MotoriGrafia = Partial<Record<(typeof MOTORI_GRAFIA)[number], string>>;

/**
 * The default respelling for Qwen: in a hyphenated respelling, syllables in capitals become lowercase (and the
 * first letter a capital), because Qwen spells a capitalised syllable out like an acronym. «ee-VAWN» → «Ee-vawn»,
 * «KAD-oo-gan» → «Kad-oo-gan»; words without a hyphen («NEEV», «Dzirrà») stay as they are.
 */
export function stileQwen(grafia: string): string {
  return grafia
    .split(/(\s+)/)
    .map((t) => (t.includes('-') && /\p{Lu}{2}/u.test(t) ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t))
    .join('');
}

/** The respelling an entry has for an engine (none = the engine is unknown: `grafia`). */
export function grafiaPer(v: { grafia: string; motori?: MotoriGrafia | undefined }, motore?: NomeMotoreVoce | null): string {
  if (motore !== 'fish' && motore !== 'qwen') return v.grafia;
  return v.motori?.[motore] ?? (motore === 'qwen' ? stileQwen(v.grafia) : v.grafia);
}

/** The prepared lexicon, in the campaign folder. */
export const FILE_LESSICO = 'pronunce.yaml';
/** New names met in play (voce/lessico-vivo.ts), next to it: the Preparer reviews them between sessions. */
export const FILE_LESSICO_GIOCO = 'pronunce-gioco.yaml';

function stringa(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const senzaAccenti = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '');

/** The entries of a lexicon file (empty list if the file does not exist or is malformed). */
export function leggiLessico(file: string): VoceLessico[] {
  if (!fs.existsSync(file)) return [];
  const d = parse(fs.readFileSync(file, 'utf8')) as { lessico?: unknown } | null;
  return Array.isArray(d?.lessico) ? (d.lessico as unknown[]).filter((v): v is VoceLessico => !!v && typeof v === 'object' && !!stringa((v as VoceLessico).nome)) : [];
}

/** The spelling for the voice of a lexicon entry in a language, or null. */
export function grafiaDi(v: VoceLessico, lingua: Lingua): GrafiaLingua | null {
  const x = v[lingua];
  if (typeof x === 'string') return stringa(x) ? { grafia: x.trim() } : null;
  if (x && typeof x === 'object') {
    const r = x as Record<string, unknown>;
    const g = stringa(r['grafia']);
    if (!g) return null;
    const nota = stringa(r['nota']);
    const motori = r['motori'] && typeof r['motori'] === 'object' && !Array.isArray(r['motori'])
      ? (Object.fromEntries(MOTORI_GRAFIA.flatMap((m) => (stringa((r['motori'] as Record<string, unknown>)[m]) ? [[m, stringa((r['motori'] as Record<string, unknown>)[m])!]] : []))) as MotoriGrafia)
      : {};
    const forme = r['forme'] && typeof r['forme'] === 'object' && !Array.isArray(r['forme'])
      ? Object.fromEntries(Object.entries(r['forme'] as Record<string, unknown>).filter((e): e is [string, string] => !!e[0].trim() && !!stringa(e[1])).map(([k, v]) => [k.trim(), v.trim()]))
      : {};
    return { grafia: g, ...(nota ? { nota } : {}), ...(Object.keys(forme).length ? { forme } : {}), ...(Object.keys(motori).length ? { motori } : {}) };
  }
  return null;
}

/** Word → pronunciation pairs taken from the `pronuncia` field of PNG and PG (aligned word by word). */
export function coppieDiPronuncia(campagna: Campagna): Map<string, string> {
  const coppie = new Map<string, string>();
  const schede: DatiYaml[] = [...campagna.png.map((p) => p.dati), ...campagna.pg.map((p) => p.pubblico)];
  for (const d of schede) {
    const nome = stringa(d['nome']);
    const pronuncia = stringa(d['pronuncia']);
    if (!nome || !pronuncia) continue;
    const parole = nome.split(/\s+/);
    const voce = pronuncia.split(/\s+/);
    if (parole.length !== voce.length) continue; // uncertain alignment: better not to touch
    parole.forEach((p, i) => {
      const v = voce[i]!;
      if (p !== v && senzaAccenti(p) === senzaAccenti(v)) coppie.set(p, v);
    });
  }
  return coppie;
}

/** Inflectional suffixes that stay attached to the name (the English possessive). */
const SUFFISSI: Partial<Record<Lingua, string>> = { en: "(?:'s|’s|s'|’)?" };

interface Regola {
  re: RegExp;
  grafia: string;
}

/**
 * The pronouncer of a lexicon: entries (name, forms) → spelling, whole words, longest first. Proper names
 * are also recognised when written in lowercase (players write that way), unless `solo_maiuscolo`.
 */
export function pronunciatoreDa(voci: ReadonlyArray<Pick<VocePronta, 'forme' | 'grafia' | 'soloMaiuscolo' | 'motori'>>, lingua: Lingua, motore?: NomeMotoreVoce | null): Pronunciatore {
  const suffisso = SUFFISSI[lingua] ?? '';
  const regole: Array<Regola & { lunghezza: number }> = [];
  for (const v of voci) {
    const grafia = grafiaPer(v, motore);
    for (const forma of new Set(v.forme.filter(Boolean))) {
      if (forma === grafia) continue;
      const corpo = forma.split(/\s+/).map(escapeRegex).join('\\s+');
      regole.push({ re: new RegExp(`(?<![\\p{L}\\p{N}])${corpo}(?=${suffisso}(?![\\p{L}\\p{N}]))`, v.soloMaiuscolo ? 'gu' : 'giu'), grafia, lunghezza: forma.length });
    }
  }
  if (!regole.length) return (t) => t;
  regole.sort((a, b) => b.lunghezza - a.lunghezza);
  return (testo) => {
    // Placeholders: a spelling already applied is not rewritten by a shorter entry (idempotence).
    const fatte: string[] = [];
    let t = testo;
    for (const r of regole) t = t.replace(r.re, () => `\u0000${fatte.push(r.grafia) - 1}\u0000`);
    return t.replace(/\u0000(\d+)\u0000/g, (_, i: string) => fatte[Number(i)]!);
  };
}

/** An entry ready for the pronouncer. */
export interface VocePronta {
  nome: string;
  forme: string[];
  grafia: string;
  soloMaiuscolo: boolean;
  /** Respellings for one engine (only the main entry, not its inflected forms). */
  motori?: MotoriGrafia;
  /** Where it comes from: the prepared lexicon, additions made in play, or the sheet. */
  fonte: 'lessico' | 'gioco' | 'scheda';
}

/** The written forms of an entry: the name, the `forme`, and the spelling without accents (players write «Zirra»). */
function formeDi(v: VoceLessico): string[] {
  const forme = [v.nome.trim(), ...(Array.isArray(v.forme) ? v.forme.filter((f): f is string => typeof f === 'string' && !!f.trim()).map((f) => f.trim()) : [])];
  return [...new Set([...forme, ...forme.map(senzaAccenti)])];
}

/**
 * The lexicon entries of a campaign in its language, in order of precedence: pronunce.yaml (prepared),
 * pronunce-gioco.yaml (additions made in play: they never change a name already prepared), the `pronuncia`
 * field of the sheets (whole words with the capital letter, as before the lexicon).
 */
export function vociDellaCampagna(campagna: Campagna): VocePronta[] {
  const lingua = campagna.lingua ?? LINGUA_PREDEFINITA;
  const out: VocePronta[] = [];
  const viste = new Set<string>();
  const fonti: Array<[VocePronta['fonte'], string]> = [
    ['lessico', FILE_LESSICO],
    ['gioco', FILE_LESSICO_GIOCO],
  ];
  for (const [fonte, file] of fonti) {
    for (const v of leggiLessico(path.join(campagna.cartella, file))) {
      const g = grafiaDi(v, lingua);
      const chiave = v.nome.trim().toLowerCase();
      if (!g || viste.has(chiave)) continue;
      viste.add(chiave);
      const soloMaiuscolo = v.solo_maiuscolo === true;
      out.push({ nome: v.nome.trim(), forme: formeDi(v), grafia: g.grafia, soloMaiuscolo, fonte, ...(g.motori ? { motori: g.motori } : {}) });
      for (const [forma, grafia] of Object.entries(g.forme ?? {})) out.push({ nome: forma, forme: formeDi({ nome: forma }), grafia, soloMaiuscolo, fonte });
    }
  }
  for (const [parola, voce] of coppieDiPronuncia(campagna)) {
    if (!viste.has(parola.toLowerCase())) out.push({ nome: parola, forme: [parola], grafia: voce, soloMaiuscolo: true, fonte: 'scheda' });
  }
  return out;
}

/**
 * The campaign's pronouncer for a voice engine, read from the files right now (for a lexicon that grows in play:
 * voce/lessico-vivo.ts). Without an engine: the `grafia` of every entry.
 */
export function creaPronunciatore(campagna: Campagna, motore?: NomeMotoreVoce | null): Pronunciatore {
  return pronunciatoreDa(vociDellaCampagna(campagna), campagna.lingua ?? LINGUA_PREDEFINITA, motore);
}
