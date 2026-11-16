/**
 * Names the players invent (docs/coerenza.md, «Characters the players invent»): a capitalised word in mid-sentence of
 * an action that the campaign does not know (no PC, NPC, alias, place or any capitalised word of its texts) and that is
 * not an ordinary word of the language or of the campaign. The same evidence the dictation uses to learn a name
 * (dettato/apprendimento.ts): Whisper and the players capitalise names; an ordinary word is never one.
 *
 * In the blind off-the-rails script the players addressed «Oreste» and «Madre Carla», people the campaign never had;
 * the selector answered with Berta's and Ugo's lines (bug 9). In mode B and with the local reader the Engine answers
 * such a name with a neutral line (scena/regia.ts); in mode A the narrator may bring the person in with `[nuovo png]`.
 * Pure: the campaign's words in, the new names of a text out.
 */
import type { Campagna } from '../campagna/tipi';
import { parole } from '../dettato/correzione';
import { formaPiana } from '../dettato/fonetica';
import { paroleComuni, testiCampagna } from '../dettato/lingua';
import type { Lingua } from '../lingua';
import type { Repertorio } from '../repertorio/tipi';

const MAX_NOME = 40;

export interface NomiDellaCampagna {
  /** Plain forms of every name the campaign knows (one word each). */
  noti: ReadonlySet<string>;
  /** Ordinary words of the language and of the campaign. */
  comuni: ReadonlySet<string>;
}

/** Every word of a capitalised name in the campaign's texts, plus the PCs' and NPCs' names and aliases. */
export function nomiDellaCampagna(c: Campagna, lingua: Lingua, repertorio?: Repertorio, altriNomi: Iterable<string> = []): NomiDellaCampagna {
  const testi = testiCampagna(c, repertorio);
  const noti = new Set<string>();
  const aggiungi = (t: string): void => {
    for (const w of parole(t)) if (w.maiuscola) noti.add(formaPiana(w.testo));
  };
  for (const t of testi) aggiungi(t);
  for (const n of altriNomi) for (const w of parole(n)) noti.add(formaPiana(w.testo));
  for (const p of c.pg) aggiungi(p.nome);
  for (const p of c.png) aggiungi(p.nome);
  for (const a of Object.keys(c.alias)) for (const w of parole(a)) noti.add(formaPiana(w.testo));
  return { noti, comuni: paroleComuni(lingua, testi) };
}

/** The new names of a text, in order, each once («Oreste»; «Madre Carla» gives «Carla», «madre» being ordinary). */
export function nomiNuovi(testo: string, n: NomiDellaCampagna): string[] {
  const out: string[] = [];
  for (const w of parole(testo)) {
    if (!w.maiuscola || w.inizioFrase || w.testo.length < 3 || w.testo.length > MAX_NOME) continue;
    if (/^\p{Lu}+$/u.test(w.testo)) continue;
    const k = formaPiana(w.testo);
    if (n.comuni.has(k) || n.noti.has(k) || out.includes(w.testo)) continue;
    out.push(w.testo);
  }
  return out;
}
