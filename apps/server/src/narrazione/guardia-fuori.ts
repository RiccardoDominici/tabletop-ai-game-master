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
 * - a sentence that describes the state (`stato`: «giace», «immobile», «a terra», «il corpo», «sangue»…) is left alone,
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
import { doveNomina, paroleDi, posizione } from './guardia-esiti';

interface Parole {
  apertura: ReadonlySet<string>;
  articoli: ReadonlySet<string>;
  preposizioni: ReadonlySet<string>;
  stato: string[][];
}

const parole = (): Parole =>
  regole('guardia_fuori', (s) => ({
    apertura: new Set(campoElenco(s, 'apertura').map(normalizza)),
    articoli: new Set(campoElenco(s, 'articoli').map(normalizza)),
    preposizioni: new Set(campoElenco(s, 'preposizioni').map(normalizza)),
    stato: campoElenco(s, 'stato')
      .map((x) => paroleDi(x))
      .filter((v) => v.length > 0),
  }));

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

/** The subject pronouns are those of the outcome guard («… e quello crolla», «…, che ride»). */
const pronomiEsiti = (): ReadonlySet<string> => regole('guardia_esiti', (s) => new Set(campoElenco(s, 'pronomi').map(normalizza)));

export interface DatiGuardiaFuori {
  /** How the narration names each character (PCs and NPCs): name, short name, aliases, trade. */
  nomi: ReadonlyMap<string, readonly string[]>;
  /** Out of play since before this turn's rolls, and how (null = in play, or out only since this turn). */
  fuoriDaPrima: (id: string) => FuoriGioco | null;
  nome: (id: string) => string;
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
  const fuori = [...d.nomi.keys()].filter((id) => d.fuoriDaPrima(id) !== null);
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
    const w = paroleDi(frase);
    if (!w.length) return null;
    // A sentence that describes the state is never an act («Zirrà giace a terra, gli occhi aperti»).
    const descriveStato = p.stato.some((v) => posizione(w, v) >= 0);
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
      const primo = nominati[0];
      // The subject of this clause (null: a thing, «la voce gli trema»), and how many words follow it: what it does.
      // `soggetto` keeps the last character who was a subject: a clause with no subject of its own carries it.
      let attuale: string | null = soggetto;
      let resto = c.length;
      if (primo && primo.i === j) {
        attuale = soggetto = primo.id;
        resto = c.length - j - lunghezzaNome(c, j, nomi.get(primo.id) ?? []);
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
      if (!colpevole && attuale && fuori.includes(attuale) && resto > 0) colpevole = attuale;
    }
    if (!colpevole || descriveStato) return null;
    if (detti.has(colpevole)) return { testo: '', motivo: 'fuori_gioco_agisce', id: colpevole };
    detti.add(colpevole);
    const come = d.fuoriDaPrima(colpevole)!;
    return { testo: testo(`prove.guardia.fuori_${come}`, { nome: nomeBreve(d.nome(colpevole)) }), motivo: 'fuori_gioco_agisce', id: colpevole };
  };
}
