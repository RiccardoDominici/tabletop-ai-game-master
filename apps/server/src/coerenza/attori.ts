/**
 * Unnamed actors (docs/coerenza.md, «After round 3»): a narrator sentence that tells an attack on a PC or a flight
 * with no name for who does it («Livia para la lancia con lo scudo», «il rumore dei passi si allontana», «la figura
 * che scappa verso la cantina») has no noun for the mention filter and no subject for R-fuori, so round 3 heard both
 * after the fight. The Engine knows who could have done it: the visit's cards (who fought) and flights (who fled).
 *
 * The sentence inherits that actor for the checks, and an actor out of play since before this turn fails R-fuori
 * (the same state line, «Grosso non è più qui.», once per turn; motive `attore_implicito`, never handed to the
 * model's repair):
 * - a flight by someone the clause does not name («chi fugge», «la figura che scappa», «il rumore dei passi si
 *   allontana»: a trace of a person) is the last flight of this visit; a flight of this very turn is this turn's
 *   story, not an act; a zero subject or a thing is not judged;
 * - an attack on a PC told with no attacker (a defence phrase with a blow coming: «para la lancia», «alza lo scudo
 *   … il colpo rimbalza») is the attacker of this turn's card on that PC; with no such card and nobody of the visit's
 *   fight still in play in the scene, it is the last foe of the fight's cards.
 * Only after a fight in this visit, only when the sentence names no other character (named ones are R-fuori's), and
 * never when a foe of the fight is still standing here. The words are in lingue/<code>/motore.yaml, section
 * `attori_impliciti`; the weapons and blows there are words of the language, not of a campaign. Pure logic.
 */
import { normalizza } from '../azioni/regole';
import { nomeBreve } from '../campagna/nomi';
import { testo } from '../lingua';
import { campoElenco, regole } from '../lingua/motore';
import { doveNomina, paroleDi } from '../narrazione/guardia-esiti';
import { paroleDellaFrase } from '../narrazione/guardia-fuori';
import type { EntitaRegistro, StatoEntita } from './registro';

const IN_GIOCO: ReadonlySet<StatoEntita> = new Set(['in_piedi', 'ferito', 'grave', 'nascosto']);

/** What this visit of the scene saw, up to this turn: the attack cards (who at whom) and the flights. */
export interface StoriaVisita {
  carte: ReadonlyArray<{ turno: number; chi: string; bersaglio: string }>;
  fughe: ReadonlyArray<{ turno: number; id: string }>;
}

export interface DatiAttori {
  turno: number;
  /** The ledger's characters (state and presence now, after this turn's cards). */
  entita: readonly EntitaRegistro[];
  storia: StoriaVisita;
  /** Who went out of play by this turn's cards (their fall or flight is this turn's story). */
  fuoriOra: ReadonlySet<string>;
}

interface Parole {
  fuga: string[][];
  relativi: ReadonlySet<string>;
  /** «chi»: whoever, a person never named. */
  chiunque: ReadonlySet<string>;
  /** Traces of a person: a figure, steps, someone. */
  tracce: ReadonlySet<string>;
  difesa: string[][];
  colpi: ReadonlySet<string>;
  inArrivo: string[][];
}

const parole = (): Parole =>
  regole('attori_impliciti', (s) => ({
    fuga: campoElenco(s, 'fuga').map(paroleDi),
    relativi: new Set(campoElenco(s, 'relativi').map(normalizza)),
    chiunque: new Set(campoElenco(s, 'chiunque').map(normalizza)),
    tracce: new Set(campoElenco(s, 'tracce').map(normalizza)),
    difesa: campoElenco(s, 'difesa').map(paroleDi),
    colpi: new Set(campoElenco(s, 'colpi').map(normalizza)),
    inArrivo: campoElenco(s, 'in_arrivo').map(paroleDi),
  }));

/** Where a phrase appears with its exact words (no stems: «para» is not «parapetto»); -1 if not. */
function dove(w: readonly string[], frase: readonly string[], da = 0): number {
  for (let i = da; i + frase.length <= w.length; i++) if (frase.every((x, k) => w[i + k] === x)) return i;
  return -1;
}

/** The first of the phrases in the words, with its position and length. */
function primaDi(w: readonly string[], frasi: readonly string[][]): { i: number; n: number } | null {
  let m: { i: number; n: number } | null = null;
  for (const f of frasi) {
    const i = dove(w, f);
    if (i >= 0 && (!m || i < m.i)) m = { i, n: f.length };
  }
  return m;
}

/** The act an unnamed actor does in the sentence and who that is by the cards, or null. */
export function attoreImplicito(frase: string, d: DatiAttori): { atto: 'fuga' | 'attacco'; id: string } | null {
  if (!d.storia.carte.length && !d.storia.fughe.length) return null;
  const p = parole();
  const w = paroleDi(frase);
  const pg = d.entita.filter((e) => e.tipo === 'pg');
  const altri = d.entita.filter((e) => e.tipo !== 'pg');
  // A named character is R-fuori's (its name, its carried subject), not an unnamed actor.
  if (altri.some((e) => doveNomina(w, e.nomi) >= 0)) return null;
  const perId = new Map(d.entita.map((e) => [e.id, e]));
  // Who fought in this visit: a foe still standing in the scene could be the one, and then nothing is judged.
  const nemici = [...new Set(d.storia.carte.flatMap((k) => [k.chi, k.bersaglio]).filter((id) => perId.get(id)?.tipo !== 'pg'))];
  const nemicoInPiedi = nemici.some((id) => {
    const e = perId.get(id);
    return !!e && e.presenza === 'in_scena' && IN_GIOCO.has(e.stato);
  });
  if (nemicoInPiedi) return null;
  const fuoriDaPrima = (id: string): boolean => {
    const e = perId.get(id);
    return !!e && !d.fuoriOra.has(id) && (!IN_GIOCO.has(e.stato) || e.presenza !== 'in_scena');
  };

  // A flight by someone the clause does not name: «chi fugge», a trace of a person with a relative («la figura che
  // scappa»), or a trace as the clause's subject («il rumore dei passi si allontana»). A zero subject («Poi scappa…»)
  // carries the sentence before, and a thing («le lanterne si allontanano») is no one: neither is judged.
  const clausole = frase.split(/[,.;:!?—–()«»"]+/u).map(paroleDi).filter((c) => c.length);
  for (const c of clausole) {
    const f = primaDi(c, p.fuga);
    if (!f) continue;
    const prima = c.slice(0, f.i);
    const ultima0 = prima.at(-1) ?? '';
    const chiunque = p.chiunque.has(ultima0);
    const traccia = (w: readonly string[]): boolean => w.some((x) => p.tracce.has(x));
    const conRelativo = p.relativi.has(ultima0) && traccia(prima.slice(-4, -1));
    const soggettoTraccia = !p.relativi.has(ultima0) && traccia(prima) && !pg.some((e) => doveNomina(prima, e.nomi) >= 0);
    if (!chiunque && !conRelativo && !soggettoTraccia) continue;
    // This turn's flight is this turn's story; else the last one of the visit.
    if (d.storia.fughe.some((x) => x.turno === d.turno) || [...d.fuoriOra].some((id) => perId.get(id)?.stato === 'fuggito')) return null;
    const ultima = [...d.storia.fughe].filter((x) => x.turno < d.turno).sort((a, b) => a.turno - b.turno).at(-1);
    if (ultima && fuoriDaPrima(ultima.id)) return { atto: 'fuga', id: ultima.id };
  }

  // An attack on a PC told with no attacker: a defence phrase, and a blow coming (right after it, or arriving later).
  const nominati = pg.filter((e) => doveNomina(w, e.nomi) >= 0);
  if (!nominati.length) return null;
  const difesa = primaDi(w, p.difesa);
  if (!difesa) return null;
  const articoli = paroleDellaFrase().articoli;
  const preposizioni = paroleDellaFrase().preposizioni;
  const dopo = w.slice(difesa.i + difesa.n);
  const subito = dopo.length >= 2 && articoli.has(dopo[0]!) && p.colpi.has(dopo[1]!);
  let arriva = false;
  for (let i = 1; i < dopo.length && !subito && !arriva; i++) {
    // A blow (with its article or «della»), not a PC's own weapon («la lama di Ida»), then an arriving verb.
    if (!p.colpi.has(dopo[i]!) || !(articoli.has(dopo[i - 1]!) || preposizioni.has(dopo[i - 1]!))) continue;
    const resto = dopo.slice(i + 1);
    if (preposizioni.has(resto[0] ?? '') && pg.some((e) => doveNomina(resto.slice(1, 4), e.nomi) === 0)) continue;
    arriva = primaDi(resto.slice(0, 6), p.inArrivo) !== null;
  }
  if (!subito && !arriva) return null;
  // The card says who attacked that PC in this turn: someone who acted now, nothing to judge.
  if (d.storia.carte.some((k) => k.turno === d.turno && nominati.some((e) => e.id === k.bersaglio))) return null;
  const ultimo = [...d.storia.carte]
    .filter((k) => k.turno <= d.turno)
    .sort((a, b) => a.turno - b.turno)
    .flatMap((k) => [k.chi, k.bersaglio])
    .filter((id) => perId.get(id)?.tipo !== 'pg')
    .at(-1);
  return ultimo && fuoriDaPrima(ultimo) ? { atto: 'attacco', id: ultimo } : null;
}

/**
 * The guard of one turn: a sentence whose unnamed actor is out of play since before the turn gets that actor's state
 * line (R-fuori's), once per actor in the turn; later ones are dropped. Null when the visit had no fight.
 */
/** The replacement for a sentence (R-fuori's state line of the inherited actor, '' once said), or null. */
export type CorrezioneAttore = { testo: string; motivo: 'attore_implicito'; id: string } | null;

export function guardiaAttori(d: DatiAttori): ((frase: string) => CorrezioneAttore) | null {
  if (!d.storia.carte.length && !d.storia.fughe.length) return null;
  const detti = new Set<string>();
  return (frase) => {
    const a = attoreImplicito(frase, d);
    if (!a) return null;
    if (detti.has(a.id)) return { testo: '', motivo: 'attore_implicito', id: a.id };
    detti.add(a.id);
    const e = d.entita.find((x) => x.id === a.id)!;
    const riga = e.stato === 'morto' ? 'fuori_morto' : e.stato === 'fuggito' || e.presenza !== 'in_scena' ? 'fuori_fuggito' : 'fuori_a_terra';
    return { testo: testo(`prove.guardia.${riga}`, { nome: nomeBreve(e.nome) }), motivo: 'attore_implicito', id: a.id };
  };
}
