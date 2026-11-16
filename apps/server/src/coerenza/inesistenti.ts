/**
 * R-inesistente (docs/coerenza.md, «Measured, round 1»): a creature the ledger does not have in the scene, attacked or
 * acting. In the coherence runs on 2a7697c the players' script fought «il goblin con la lancia», a third goblin the
 * campaign never had; after the two real foes fell or fled the narration kept hitting it, killing it and questioning it
 * (most of the «probable» high-severity sentences of round 1). The Engine knew there was nobody to hit, and said only
 * «nessun tiro».
 *
 * The nouns come from the data, never from a word list of this module: the aliases of the campaign's NPCs that are not
 * their name («goblin», «capobanda», «carbonaio»), the words of the minion types (campagna.yaml → gregari) and of the
 * minions in the ledger. A noun is *absent* when none of the characters it names is in the scene and in play (standing,
 * wounded, or hidden: a hidden one is never revealed by its absence). Then:
 * - the table hears who is really there, once per turn (`frasePresenti`): the state of the ones the noun named who fell
 *   or left here («Zirrà non è più qui.») and who is standing in sight («Oltre a voi, in piedi qui si vedono soltanto
 *   Berta.»), said by the Engine when a public action names the noun (scena/regia.ts) or in place of the first sentence
 *   that has the creature act or be hit;
 * - a narrator sentence where the absent creature is the subject of a clause, the object of a blow, the owner of a body
 *   part, or the goal of a movement («verso l'ultimo goblin»), or a sentence that carries it with a subject pronoun
 *   right after, is replaced by that line, or dropped once it was said;
 * - a sentence that names the fallen one by name is left to R-fuori; one that describes a state («giace a terra») or
 *   negates the creature («nessun goblin») is left alone.
 * The director turns it on only where it is safe: the players name the noun in this turn's actions, and there is a
 * fight (on, or earlier in this visit of the scene, or a blow this turn) or one it named fell or left here. Talk about
 * creatures elsewhere («i goblin hanno preso il ragazzo» in the village) is never judged. Limits: the noun must appear
 * as the data spell it (a plural that changes the word is not seen); a creature the narration names with a word the
 * data do not have («la creatura») is not seen. Pure: the ledger and the nouns in, lines and decisions out.
 */
import { nomeBreve } from '../campagna/nomi';
import { testo } from '../lingua';
import { campoElenco, regole } from '../lingua/motore';
import { normalizza } from '../azioni/regole';
import { doveNomina, paroleDelColpo, paroleDi, posizione } from '../narrazione/guardia-esiti';
import { paroleDellaFrase } from '../narrazione/guardia-fuori';
import type { EntitaRegistro, Registro, StatoEntita } from './registro';

/** A noun the campaign uses for a creature, and the ledger's characters it names (none: a type with no one here). */
export interface CreaturaNota {
  /** The noun, normalised (lower case, no accents), as words joined by a space. */
  parola: string;
  titolari: string[];
}

/** An absent noun, with the characters it named who fell or left in this scene (their state is what the table hears). */
export interface CreaturaAssente extends CreaturaNota {
  caduti: EntitaRegistro[];
}

/** A minion type of the campaign (campagna/gregari.ts, `TipoGregario`): only its words matter here. */
export interface TipoCreatura {
  nome: string;
  parole: readonly string[];
}

const IN_GIOCO: ReadonlySet<StatoEntita> = new Set(['in_piedi', 'ferito', 'grave', 'nascosto']);
const IN_VISTA: ReadonlySet<StatoEntita> = new Set(['in_piedi', 'ferito', 'grave']);

interface Parole {
  negazioni: ReadonlySet<string>;
  verso: ReadonlySet<string>;
  corpo: ReadonlySet<string>;
}

const parole = (): Parole =>
  regole('inesistenti', (s) => ({
    negazioni: new Set(campoElenco(s, 'negazioni').map(normalizza)),
    verso: new Set(campoElenco(s, 'verso').map(normalizza)),
    corpo: new Set(campoElenco(s, 'corpo').map(normalizza)),
  }));

const chiave = (n: string): string =>
  paroleDi(n)
    .filter((x) => !/^\d+$/.test(x))
    .join(' ');

/**
 * The creature nouns of the campaign: every non-PC character's names that are not its own name or short name (a
 * minion's names are all nouns), and the words of the minion types. A noun that also names a PC is left out.
 */
export function creatureNote(entita: readonly EntitaRegistro[], tipi: readonly TipoCreatura[] = []): CreaturaNota[] {
  const deiPg = new Set(entita.filter((e) => e.tipo === 'pg').flatMap((e) => e.nomi.map(chiave)));
  const mappa = new Map<string, Set<string>>();
  const aggiungi = (n: string, id: string | null): void => {
    const k = chiave(n);
    if (k.length < 3 || deiPg.has(k)) return;
    const s = mappa.get(k) ?? new Set<string>();
    if (id) s.add(id);
    mappa.set(k, s);
  };
  for (const e of entita) {
    if (e.tipo === 'pg') continue;
    // The name and the short name are names; an epithet inside the full name («Ruggero lo sgherro») is a noun.
    const propri = new Set([chiave(e.nome), chiave(nomeBreve(e.nome)), paroleDi(e.nome)[0] ?? '']);
    for (const n of e.nomi) {
      if (e.tipo === 'png' && propri.has(chiave(n))) continue;
      aggiungi(n, e.id);
    }
  }
  for (const t of tipi) for (const n of [t.nome, ...t.parole]) aggiungi(n, null);
  return [...mappa].map(([parola, s]) => ({ parola, titolari: [...s] }));
}

/** The nouns none of whose characters is in the scene and in play now. */
export function creatureAssenti(r: Registro, note: readonly CreaturaNota[]): CreaturaAssente[] {
  const per = new Map(r.entita.map((e) => [e.id, e]));
  const qui = (id: string): boolean => {
    const e = per.get(id);
    return !!e && e.presenza === 'in_scena' && IN_GIOCO.has(e.stato);
  };
  return note
    .filter((n) => !n.titolari.some(qui))
    .map((n) => ({
      ...n,
      // A fled one leaves the scene's presence: «non è più qui» is true wherever the ledger has it now.
      caduti: n.titolari
        .map((id) => per.get(id))
        .filter((e): e is EntitaRegistro => !!e && (e.presenza === 'uscito' || e.stato === 'fuggito' || (e.presenza === 'in_scena' && !IN_GIOCO.has(e.stato)))),
    }));
}

/** The absent nouns a text names (whole words). */
export function nominateIn(t: string, assenti: readonly CreaturaAssente[]): CreaturaAssente[] {
  const w = paroleDi(t);
  return assenti.filter((a) => doveNomina(w, [a.parola]) >= 0);
}

/** «A, B e C» in the content language. */
function elenco(nomi: readonly string[]): string {
  if (nomi.length <= 1) return nomi.join('');
  return `${nomi.slice(0, -1).join(', ')} ${testo('coerenza.inesistente.e')} ${nomi.at(-1)}`;
}

/** The state line of one who fell or left (the out-of-play guard's lines, prove.guardia.fuori_*). */
function lineaCaduto(e: EntitaRegistro): string {
  const nome = nomeBreve(e.nome);
  if (e.presenza === 'uscito' || e.stato === 'fuggito') return testo('prove.guardia.fuori_fuggito', { nome });
  if (e.stato === 'morto') return testo('prove.guardia.fuori_morto', { nome });
  return testo('prove.guardia.fuori_a_terra', { nome });
}

/** What the table hears: the fallen ones the nouns named (at most two), then who stands in sight besides the PCs. */
export function frasePresenti(r: Registro, assenti: readonly CreaturaAssente[]): string {
  const righe: string[] = [];
  const visti = new Set<string>();
  for (const a of assenti) {
    for (const e of a.caduti) {
      if (visti.has(e.id) || visti.size >= 2) continue;
      visti.add(e.id);
      righe.push(lineaCaduto(e));
    }
  }
  const inPiedi = r.entita.filter((e) => e.tipo !== 'pg' && e.presenza === 'in_scena' && IN_VISTA.has(e.stato)).map((e) => nomeBreve(e.nome));
  righe.push(inPiedi.length ? testo('coerenza.inesistente.presenti', { elenco: elenco(inPiedi) }) : testo('coerenza.inesistente.nessuno'));
  return righe.join(' ');
}

/** The row of «Cosa è vero adesso» for the narrator: these nouns name nobody here; do not make one act or be hit. */
export function rigaAssenti(assenti: readonly CreaturaAssente[]): string | null {
  if (!assenti.length) return null;
  return testo('coerenza.inesistente.riga', { parole: assenti.map((a) => `«${a.parola}»`).join(', ') });
}

export interface DatiGuardiaInesistenti {
  /** The absent nouns the guard judges (the director picks them: named in this turn's actions, where it is safe). */
  assenti: readonly CreaturaAssente[];
  /** The proper names of the characters the nouns name: a sentence that names one by name is R-fuori's. */
  nomiTitolari: readonly string[];
  /** The Engine's line (frasePresenti). */
  frase: string;
  /** The line was already said in this turn (by the Engine before the narration): later sentences are dropped. */
  giaDetta?: boolean;
  /** Called when the guard puts the line in place of a sentence. */
  onDetta?: () => void;
}

export type CorrezioneInesistente = { testo: string; motivo: 'creatura_inesistente' } | null;

/** The guard of one narration call; null when there is nothing to judge. */
export function guardiaInesistenti(d: DatiGuardiaInesistenti): ((frase: string) => CorrezioneInesistente) | null {
  if (!d.assenti.length) return null;
  const voci = d.assenti.map((a) => a.parola.split(' '));
  let detta = d.giaDetta === true;
  // The previous sentence had the absent creature act: «Quello cade contro il muro» right after carries it.
  let portato = false;
  const decidi = (): CorrezioneInesistente => {
    if (detta) return { testo: '', motivo: 'creatura_inesistente' };
    detta = true;
    d.onDetta?.();
    return { testo: d.frase, motivo: 'creatura_inesistente' };
  };
  return (frase) => {
    const f = paroleDellaFrase();
    const c = paroleDelColpo();
    const p = parole();
    const w = paroleDi(frase);
    const eraPortato = portato;
    portato = false;
    if (!w.length) return null;
    if (doveNomina(w, d.nomiTitolari) >= 0) return null;
    if (f.stato.some((v) => posizione(w, v) >= 0)) return null;
    const pezzi = frase.split(/[,.;:!?—–()«»"]+/).map(paroleDi).filter((x) => x.length);
    let colpevole = false;
    for (const [ci, cl] of pezzi.entries()) {
      let j = 0;
      while (j < cl.length && (f.apertura.has(cl[j]!) || f.articoli.has(cl[j]!))) j++;
      // «Quello» is both an article and a pronoun: the carry looks past the opening words only.
      let a = 0;
      while (a < cl.length && f.apertura.has(cl[a]!) && !c.pronomi.has(cl[a]!)) a++;
      if (ci === 0 && eraPortato && a < cl.length && c.pronomi.has(cl[a]!) && cl.length > a + 1) colpevole = true;
      const colpo = c.colpo.some((v) => posizione(cl, v) >= 0);
      for (const v of voci) {
        for (let i = 0; i + v.length <= cl.length; i++) {
          if (!v.every((x, k) => cl[i + k] === x)) continue;
          if (cl.slice(Math.max(0, i - 2), i).some((x) => p.negazioni.has(x))) continue;
          // The subject of the clause: only opening words (and one adjective after an article: «il primo goblin») before it.
          const soggetto = (i === j || (j > 0 && i === j + 1)) && cl.length > i + v.length;
          const delCorpo = i >= 2 && f.diParte.has(cl[i - 1]!) && (p.corpo.has(cl[i - 2]!) || f.parti.has(cl[i - 2]!));
          const meta = cl.slice(Math.max(0, i - 3), i).some((x) => p.verso.has(x));
          if (soggetto || colpo || delCorpo || meta) colpevole = true;
        }
      }
    }
    if (!colpevole) return null;
    portato = true;
    return decidi();
  };
}
