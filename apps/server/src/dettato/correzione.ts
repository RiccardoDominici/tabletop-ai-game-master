/**
 * Post-correction of a dictation (docs/ascolto.md, «Correction»): the spans of the transcript that are a campaign name
 * heard or spelled differently are replaced by the name as it is written. Pure.
 *
 * Conservative beats clever: a wrong replacement is worse than a missed one (the player sees the transcript and can fix
 * a miss; a wrong name looks deliberate). The evidence that a span is a name is Whisper's own capital in mid-sentence
 * (or every word of a span capitalised): Whisper capitalises the names it recognises, and it was told them in the
 * prompt. Without that evidence (a lowercase word, the first word of a sentence) only what the players taught
 * (`appreso`) and an accent fix of a capitalised word («Ninfà» → «Ninfa») apply. Measured on 4,200 ordinary sentences
 * of the example campaigns with another campaign's whole vocabulary (strumenti/ascolto/falsi.ts): lowercase matches
 * turned ordinary words (a stone, a pocket, an oar, «they are enough») into NPC and place names that sound the same;
 * a campaign's own texts do not list every ordinary word.
 * So:
 * - spans of 1–3 words, only across spaces (never across punctuation);
 * - exact matches first, ignoring case and accents («Zirra» → «Zirrà»), and the forms the players taught;
 * - then, only with the evidence, the phonetic match (dettato/fonetica.ts) against the written form and the heard forms
 *   of each name, from `soglie.maiuscola` (`soglie.piuParole` for spans of several words); keys of two letters only
 *   match exactly, of three from 0.9;
 * - two different names within `soglie.margine` of each other: ambiguous, nothing changes;
 * - ordinary words (`comuni`: the language's list plus the lowercase words of the language pack and of the campaign)
 *   are never replaced alone, and a pair the players undid (`rifiutate`) is never proposed again.
 * Every replacement comes back in `correzioni`, with the heard span, the written name and why.
 */
import type { Lingua } from '../lingua';
import { chiaveFonetica, formaPiana, somiglianzaChiavi } from './fonetica';
import type { VoceVocabolario } from './vocabolario';

export type MotivoCorrezione = 'grafia' | 'appreso' | 'fonetica';

export interface Correzione {
  /** The span as the transcript had it. */
  sentito: string;
  /** The name written in its place. */
  scritto: string;
  motivo: MotivoCorrezione;
  /** Phonetic similarity (1 for the exact matches). */
  punteggio: number;
}

export interface Soglie {
  /** One word Whisper capitalised in mid-sentence. 0.80 let one ordinary first name become a similar-sounding NPC name (0.83). */
  maiuscola: number;
  piuParole: number;
  margine: number;
}

export const SOGLIE: Soglie = { maiuscola: 0.85, piuParole: 0.9, margine: 0.05 };

export interface OpzioniCorrezione {
  lingua: Lingua;
  voci: readonly VoceVocabolario[];
  /** Plain forms (formaPiana) of the ordinary words of the language and of the campaign. */
  comuni: ReadonlySet<string>;
  /** `chiaveRifiuto(sentito, scritto)` of the replacements a player undid. */
  rifiutate?: ReadonlySet<string>;
  soglie?: Partial<Soglie>;
}

export interface EsitoCorrezione {
  testo: string;
  correzioni: Correzione[];
}

/** Key of a refused replacement (a player turned the name back into what was heard). */
export const chiaveRifiuto = (sentito: string, scritto: string): string => `${formaPiana(sentito)}→${formaPiana(scritto)}`;

export interface Parola {
  testo: string;
  inizio: number;
  fine: number;
  /** First word of the text or of a sentence (there every word is capitalised: no evidence of a name). */
  inizioFrase: boolean;
  maiuscola: boolean;
}

/** The words of a text with their position. Apostrophes split («dell'Eliandro»), hyphens do not. */
export function parole(testo: string): Parola[] {
  const out: Parola[] = [];
  let fine = 0;
  for (const m of testo.matchAll(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu)) {
    const tra = testo.slice(fine, m.index);
    const inizioFrase = out.length === 0 || /[.!?…:;«"“\n]/u.test(tra);
    out.push({ testo: m[0], inizio: m.index, fine: m.index + m[0].length, inizioFrase, maiuscola: /^\p{Lu}/u.test(m[0]) });
    fine = m.index + m[0].length;
  }
  return out;
}

interface Forma {
  voce: VoceVocabolario;
  piana: string;
  chiave: string;
  /** The form is one the players taught (an exact match is an `appreso` correction). */
  appresa: boolean;
}

interface Candidata {
  i: number;
  j: number;
  voce: VoceVocabolario;
  motivo: MotivoCorrezione;
  punteggio: number;
}

export function correggi(testo: string, o: OpzioniCorrezione): EsitoCorrezione {
  const s = { ...SOGLIE, ...o.soglie };
  const p = parole(testo);
  const forme: Forma[] = [];
  for (const v of o.voci) {
    if (!v.correggibile) continue;
    forme.push({ voce: v, piana: formaPiana(v.scritto), chiave: chiaveFonetica(v.scritto, o.lingua), appresa: false });
    for (const x of v.sentiti) forme.push({ voce: v, piana: formaPiana(x), chiave: chiaveFonetica(x, o.lingua), appresa: v.tipo === 'appreso' });
  }
  const comune = (w: Parola): boolean => o.comuni.has(formaPiana(w.testo));
  const rifiutata = (sentito: string, v: VoceVocabolario): boolean => o.rifiutate?.has(chiaveRifiuto(sentito, v.scritto)) === true;

  const protette = new Set<number>();
  const candidate: Candidata[] = [];
  for (let i = 0; i < p.length; i++) {
    for (let n = 1; n <= 3 && i + n <= p.length; n++) {
      const j = i + n - 1;
      // Only across spaces: «Fulco, Berta» is two names, never one span.
      if (n > 1 && !/^\s+$/u.test(testo.slice(p[j - 1]!.fine, p[j]!.inizio))) break;
      const span = testo.slice(p[i]!.inizio, p[j]!.fine);
      const piana = formaPiana(span);
      const minuscola = !p[i]!.maiuscola;
      const parti = p.slice(i, j + 1);
      // Whisper's evidence of a name: its capital in mid-sentence, or every word of the span capitalised.
      const prova = (p[i]!.maiuscola && !p[i]!.inizioFrase) || (n > 1 && parti.every((w) => w.maiuscola));

      // 1. Exact, ignoring case and accents.
      const esatte = forme.filter((f) => f.piana === piana);
      if (esatte.some((f) => f.voce.scritto === span)) {
        for (let k = i; k <= j; k++) protette.add(k);
        continue;
      }
      const esatta = esatte[0];
      if (esatta) {
        // Without the evidence: only the players' forms, or an accent fix of a capitalised first word.
        if (!prova && !esatta.appresa && minuscola) continue;
        const parolaComune = n === 1 ? comune(p[i]!) : parti.every(comune);
        if (minuscola && (esatta.voce.soloMaiuscolo || parolaComune)) continue;
        if (rifiutata(span, esatta.voce)) continue;
        candidate.push({ i, j, voce: esatta.voce, motivo: esatta.appresa ? 'appreso' : 'grafia', punteggio: 1 });
        continue;
      }

      // 2. Phonetic: only with Whisper's evidence, never an ordinary word alone, and at the edges of a longer span only
      // a capitalised one («Rocca Sgretolatta» is a place).
      if (!prova) continue;
      const bordoComune = (w: Parola): boolean => comune(w) && !w.maiuscola;
      if (n === 1 ? comune(p[i]!) : bordoComune(parti[0]!) || bordoComune(parti[n - 1]!)) continue;
      const chiave = chiaveFonetica(span, o.lingua);
      if (chiave.length < 2) continue;
      const soglia = n > 1 ? s.piuParole : s.maiuscola;
      const migliori = new Map<VoceVocabolario, number>();
      for (const f of forme) {
        if (minuscola && f.voce.soloMaiuscolo) continue;
        const lunghezza = Math.max(chiave.length, f.chiave.length);
        if (Math.abs(chiave.length - f.chiave.length) > Math.max(2, Math.round(lunghezza * 0.3))) continue;
        // Short keys: two letters only match exactly, three from 0.9 («Neve» ~ «NEEV»).
        const punti = lunghezza <= 2 ? (chiave === f.chiave ? 1 : 0) : somiglianzaChiavi(chiave, f.chiave);
        if (lunghezza === 3 && punti < 0.9) continue;
        if (punti > (migliori.get(f.voce) ?? 0)) migliori.set(f.voce, punti);
      }
      const ordinate = [...migliori.entries()].sort((a, b) => b[1] - a[1]);
      const [prima, seconda] = ordinate;
      if (!prima || prima[1] < soglia) continue;
      if (seconda && prima[1] - seconda[1] < s.margine) continue;
      if (rifiutata(span, prima[0])) continue;
      candidate.push({ i, j, voce: prima[0], motivo: 'fonetica', punteggio: Math.round(prima[1] * 100) / 100 });
    }
  }

  // Non-overlapping, best first (then the longer span), never over a name already written right.
  candidate.sort((a, b) => b.punteggio - a.punteggio || b.j - b.i - (a.j - a.i));
  const prese: Candidata[] = [];
  const occupate = new Set(protette);
  for (const c of candidate) {
    let libera = true;
    for (let k = c.i; k <= c.j; k++) if (occupate.has(k)) libera = false;
    if (!libera) continue;
    for (let k = c.i; k <= c.j; k++) occupate.add(k);
    prese.push(c);
  }
  prese.sort((a, b) => a.i - b.i);
  let out = '';
  let da = 0;
  const correzioni: Correzione[] = [];
  for (const c of prese) {
    const inizio = p[c.i]!.inizio;
    const fine = p[c.j]!.fine;
    const sentito = testo.slice(inizio, fine);
    out += testo.slice(da, inizio) + c.voce.scritto;
    da = fine;
    correzioni.push({ sentito, scritto: c.voce.scritto, motivo: c.motivo, punteggio: c.punteggio });
  }
  out += testo.slice(da);
  return { testo: out, correzioni };
}
