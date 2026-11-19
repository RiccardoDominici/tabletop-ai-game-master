/**
 * Out-of-play guard (docs/combattimento.md, «The narrator and the facts»): a narrator sentence where a character out
 * of play since before this turn (on the ground, dead, fled: prove/stato.ts) acts or speaks is replaced by the Engine's
 * line about its state, before the voice. The third e2e pass (docs/e2e-finale-3.md, bug 2) had a dead goblin answer a
 * private question («Il goblin alza gli occhi verso di lei… Parla piano, in fretta… Dice che il ragazzo è stato portato
 * via»), look towards the cellar, lower a spear, and a goblin who fell at T11 «ride corto» at T21. The narrator's message
 * already says «non parla né agisce»: Haiku followed the players, who kept talking to the body.
 *
 * Rules, per sentence (no model, the words are in lingue/<code>/motore.yaml, section `guardia_fuori`):
 * - the subject of a clause is the character named first in it, when only opening words come before the name
 *   (`apertura`: «e poi Zirrà ride», «il goblin alza gli occhi»), or the last character named, when the clause opens
 *   with a subject pronoun («…, e lei ride»); a clause with no name and no article carries the subject of the clause
 *   before it («Parla piano, in fretta»), also into the next sentence unless that one opens with a preposition
 *   («Dalla cantina arriva…»);
 * - a clause that describes the state (`stato`: «giace», «immobile», «a terra», «il corpo», «sangue»…) is left alone
 *   (per clause: another clause of the same sentence where the fallen one acts is not),
 *   whatever its clauses do: so is everything about characters who went out of play in this very turn (their fall is
 *   this turn's story) and everything whose subject is someone else («Eliandro preme il piede sul goblin»);
 * - the first offending sentence about a character becomes «Zirrà giace a terra, senza vita.» (`prove.guardia.fuori_*`),
 *   later ones in the same turn are dropped (empty text), so the table hears the state once.
 * The names include the aliases («goblin» for Zirrà) except those that also name a PC or NPC still in play (minions are
 * not among them: with standing minions of the kind a fallen NPC's alias names, that alias may be misread). Limits: a
 * subject the narration names with a noun outside the aliases («la creatura») is not seen; an object pronoun («lo getta
 * contro il muro») is not a subject. Pure logic: the director passes who is out of play and the names.
 */
import { normalizza } from '../azioni/regole';
import { nomeBreve } from '../campagna/nomi';
import { testo } from '../lingua';
import { campoElenco, regole } from '../lingua/motore';
import type { FuoriGioco } from '../prove/stato';
import { doveNomina, paroleDi, paroleNegazione, posizione, pronomiDiSoggetto } from './guardia-esiti';

interface Parole {
  apertura: ReadonlySet<string>;
  articoli: ReadonlySet<string>;
  preposizioni: ReadonlySet<string>;
  stato: string[][];
  impersonali: string[][];
  /** Parts of a character that act for it («lo sguardo di X», «la mano di X»), and the words that join them. */
  parti: ReadonlySet<string>;
  diParte: ReadonlySet<string>;
}

const parole = (): Parole =>
  regole('guardia_fuori', (s) => ({
    apertura: new Set(campoElenco(s, 'apertura').map(normalizza)),
    articoli: new Set(campoElenco(s, 'articoli').map(normalizza)),
    preposizioni: new Set(campoElenco(s, 'preposizioni').map(normalizza)),
    stato: campoElenco(s, 'stato')
      .map((x) => paroleDi(x))
      .filter((v) => v.length > 0),
    parti: new Set(campoElenco(s, 'parti').map(normalizza)),
    diParte: new Set(campoElenco(s, 'di_parte').map(normalizza)),
    impersonali: (s['impersonali'] === undefined ? [] : campoElenco(s, 'impersonali'))
      .map((x) => paroleDi(x))
      .filter((v) => v.length > 0),
  }));

/** The clause words of this guard, for the absent-creature rule (coerenza/inesistenti.ts): one compilation of the section. */
export function paroleDellaFrase(): {
  apertura: ReadonlySet<string>;
  articoli: ReadonlySet<string>;
  preposizioni: ReadonlySet<string>;
  stato: readonly string[][];
  parti: ReadonlySet<string>;
  diParte: ReadonlySet<string>;
} {
  const p = parole();
  return { apertura: p.apertura, articoli: p.articoli, preposizioni: p.preposizioni, stato: p.stato, parti: p.parti, diParte: p.diParte };
}

/**
 * Whether a sentence with no character named carries the subject of the one before (Italian and English drop it: «Sparisce
 * oltre il crollo.»): it does not open with an article, an indefinite subject («Qualcuno…») or a preposition («Dalla
 * cantina…»). Shared with the told-facts check (prove/fatti-dovuti.ts).
 */
export function continuaIlSoggetto(frase: string): boolean {
  const p = parole();
  const primo = paroleDi(frase)[0];
  return !!primo && !p.articoli.has(primo) && !p.preposizioni.has(primo) && !p.apertura.has(primo);
}

/** The subject pronouns are those of the outcome guard («… e quello crolla», «…, che ride»): one compilation, shared. */
const pronomiEsiti = (): ReadonlySet<string> => pronomiDiSoggetto();

export interface DatiGuardiaFuori {
  /** How the narration names each character (PCs and NPCs): name, short name, aliases, trade. */
  nomi: ReadonlyMap<string, readonly string[]>;
  /** Out of play since before this turn's rolls, and how (null = in play, or out only since this turn). */
  fuoriDaPrima: (id: string) => FuoriGioco | null;
  nome: (id: string) => string;
  /**
   * In play but losing the round in progress, by the condition's name (surprise…: prove/combattimento.ts): a sentence
   * where it acts or speaks is replaced too, by «Zirrà perde questo round (sorpreso): non agisce.» (final round,
   * attempt 4, PR T11/T13). Absent = nobody.
   */
  fermo?: (id: string) => string | null;
}

/** How many words the name found at position `i` of the clause takes (the longest variant that matches there). */
function lunghezzaNome(c: readonly string[], i: number, varianti: readonly string[]): number {
  let n = 1;
  for (const v of varianti) {
    const k = paroleDi(v);
    if (k.length > n && k.every((x, j) => c[i + j] === x)) n = k.length;
  }
  return n;
}

/** The replacement for a sentence: the Engine's state line, '' to drop it (said once already), null = it stays. */
export type CorrezioneFuori = { testo: string; motivo: 'fuori_gioco_agisce'; id: string } | null;

/**
 * The guard of one turn (it remembers the subject between sentences and who has had their state line). Returns null
 * when nobody is out of play since before the turn.
 */
export function guardiaFuori(d: DatiGuardiaFuori): ((frase: string) => CorrezioneFuori) | null {
  const fuori = [...d.nomi.keys()].filter((id) => d.fuoriDaPrima(id) !== null || !!d.fermo?.(id));
  if (!fuori.length) return null;
  // A name shared with a character still in play («goblin» for a standing minion) is not a sign of the fallen one.
  const inGioco = new Set([...d.nomi].filter(([id]) => !fuori.includes(id)).flatMap(([, v]) => v.map((n) => paroleDi(n).join(' '))));
  const nomi = new Map<string, string[]>([...d.nomi].map(([id, v]) => [id, fuori.includes(id) ? v.filter((n) => !inGioco.has(paroleDi(n).join(' '))) : [...v]]));
  const tutti = [...nomi.keys()];
  const detti = new Set<string>();
  let soggetto: string | null = null;
  return (frase) => {
    const p = parole();
    const pronomi = pronomiEsiti();
    const negazioni = paroleNegazione();
    const w = paroleDi(frase);
    if (!w.length) return null;
    // A clause that describes the state is never an act («Zirrà giace a terra, gli occhi aperti»). Per clause, not per
    // sentence: «Zirrà giace a terra, poi si rialza e corre verso la scala» is an act in its second clause (before, one
    // state word anywhere let the whole sentence through).
    const descriveStato = (c: readonly string[]): boolean => p.stato.some((v) => posizione(c, v) >= 0);
    const pezzi = frase.split(/[,.;:!?—–()«»"]+/).map(paroleDi).filter((x) => x.length);
    // A new sentence opening with a preposition («Dalla cantina…») does not carry the subject of the one before.
    if (pezzi[0] && p.preposizioni.has(pezzi[0][0]!)) soggetto = null;
    let ultimoNominato: string | null = null;
    let colpevole: string | null = null;
    for (const [ci, c] of pezzi.entries()) {
      const nominati = tutti.map((id) => ({ id, i: doveNomina(c, nomi.get(id) ?? []) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
      let j = 0;
      while (j < c.length && p.apertura.has(c[j]!)) j++;
      const conArticolo = c.slice(0, j).some((x) => p.articoli.has(x));
      // «Lo sguardo di Zirrà scivola…»: a part of a character (`parti`) followed by «di» and the name is that character
      // (the coherence run on 2a7697c, combat T12: a fled goblin's gaze moved across the yard).
      if (j < c.length && p.parti.has(c[j]!) && p.diParte.has(c[j + 1] ?? '')) {
        const dopo = nominati.find((x) => x.i === j + 2);
        if (dopo) j += 2;
      }
      const primo = nominati[0] && nominati.find((x) => x.i === j) ? nominati.find((x) => x.i === j) : nominati[0];
      // The subject of this clause (null: a thing, «la voce gli trema»), and how many words follow it: what it does.
      // `soggetto` keeps the last character who was a subject: a clause with no subject of its own carries it.
      let attuale: string | null = soggetto;
      let resto = c.length;
      if (primo && primo.i === j) {
        attuale = soggetto = primo.id;
        resto = c.length - j - lunghezzaNome(c, j, nomi.get(primo.id) ?? []);
      } else if (p.impersonali.some((v) => v.every((x, k) => c[k] === x) || v.every((x, k) => c[j + k] === x))) {
        // An impersonal perception («si sente il rotolio di qualche sasso»): no subject, it carries nobody.
        attuale = null;
      } else if (j < c.length && pronomi.has(c[j]!)) {
        attuale = soggetto = ultimoNominato ?? soggetto;
        resto = c.length - j - 1;
      } else if (j < c.length && p.preposizioni.has(c[j]!)) {
        // An adverbial clause («in fretta», «verso la porta»): it belongs to the subject before it.
      } else if (nominati.length) attuale = soggetto = null;
      // A sentence that opens with a new subject of its own («Il ragazzo tiene gli occhi bassi.») ends the carry;
      // inside a sentence a thing («…, e la voce gli trema») does not.
      else if (conArticolo || (j < c.length && p.articoli.has(c[j]!))) attuale = ci === 0 ? (soggetto = null) : null;
      // else: no name and no article, the clause carries the subject before it («Parla piano, …», «Dice che…»).
      if (nominati.length) ultimoNominato = nominati.at(-1)!.id;
      // A negated verb right after the subject in a sentence that describes the state elsewhere («Zirrà non risponde: il suo
      // corpo è immobile…») tells nothing done; alone («Ruggero non parla.») it still gives the fallen one a voice to keep.
      const negato = !!primo && primo.i === j && negazioni.has(c[c.length - resto] ?? '') && descriveStato(w);
      if (!colpevole && attuale && fuori.includes(attuale) && resto > 0 && !descriveStato(c) && !negato) colpevole = attuale;
    }
    if (!colpevole) return null;
    if (detti.has(colpevole)) return { testo: '', motivo: 'fuori_gioco_agisce', id: colpevole };
    detti.add(colpevole);
    const come = d.fuoriDaPrima(colpevole);
    const nome = nomeBreve(d.nome(colpevole));
    const riga = come ? testo(`prove.guardia.fuori_${come}`, { nome }) : testo('prove.guardia.fermo', { nome, condizione: d.fermo?.(colpevole) ?? '' });
    return { testo: riga, motivo: 'fuori_gioco_agisce', id: colpevole };
  };
}
