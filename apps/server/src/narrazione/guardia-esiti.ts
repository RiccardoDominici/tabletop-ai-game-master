/**
 * Combat outcome guard (docs/combattimento.md, «The narrator and the facts»): a narrator sentence that
 * contradicts the Engine is replaced by the Engine's own line, before the voice. Two cases from the second pass
 * of the final end-to-end run:
 * - A FALL WITH NO FACT: «…colpisce il goblin in pieno petto, e quello cade sui gradini con un rantolo» while the
 *   goblin is still standing for the Engine. A sentence with a defeat word («muore», «cade», «crolla»…) and the
 *   name of an NPC with a sheet who is NOT out of play (and no NPC in the sentence really down) becomes the
 *   Engine's line: «X incassa il colpo, ma resta in piedi.», «Y manca X.» or «X è ancora in piedi.», from the
 *   turn's card.
 * - A HIT AGAINST THE CARD: «Grosso… colpisce Livia» when the card says miss. Only a sentence that tells the OUTCOME
 *   of an attack the Engine has rolled is judged: it has an outcome word (a verb of hitting from `guardia_esiti.colpito`
 *   or of missing from `mancato`; a negation right before a hit counts as a miss), and it names the card's attacker
 *   before the outcome word and its target after it (the other way round with a verb of receiving, `subisce`: «Fulco
 *   incassa il colpo di Zirrà»). An action announced («tira il pugnale al goblin») has no outcome word and is left
 *   alone; so is a near-hit absorbed by armour (`assorbito`: «di striscio, ma la cotta regge»), which fits a miss and
 *   a hit with no damage. A contradiction becomes «Grosso manca Livia.» or «Grosso colpisce Livia.», with the names
 *   taken from the card, never from the line's speaker. Pass 2b of the final run: «Zirrà colpisce Fulco di striscio,
 *   ma la cotta regge» became «Narratore manca Zirrà.», and an action announcement was replaced too.
 * The words are in the language pack (lingue/<code>/motore.yaml, `guardia_esiti`; hit words come from
 * `fatti_dovuti.colpito`), the lines in testi-prove.yaml (`prove.guardia`). Pure logic: the director passes the
 * turn's cards, who is out of play, and the names.
 */
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { normalizza } from '../azioni/regole';
import { nomeBreve } from '../campagna/nomi';
import { testo } from '../lingua';
import { campoElenco, regole } from '../lingua/motore';

interface Parole {
  sconfitta: string[][];
  mancato: string[][];
  colpito: string[][];
  subisce: string[][];
  assorbito: string[][];
  figurati: string[][];
  pronomi: ReadonlySet<string>;
  negazioni: ReadonlySet<string>;
}

/** Each entry as words (an entry of several words is a phrase to find in a row). */
const comeVoci = (xs: readonly string[]): string[][] => xs.map((x) => paroleDi(x)).filter((v) => v.length > 0);

const parole = (): Parole =>
  regole('guardia_esiti', (s) => ({
    sconfitta: comeVoci(campoElenco(s, 'sconfitta')),
    mancato: comeVoci(campoElenco(s, 'mancato')),
    negazioni: new Set(campoElenco(s, 'negazioni').map(normalizza)),
    // Verbs telling a hit that landed: stricter than the combat facts' stems, which include weapon nouns («pugnal»).
    colpito: comeVoci(campoElenco(s, 'colpito')),
    subisce: comeVoci(campoElenco(s, 'subisce')),
    assorbito: comeVoci(campoElenco(s, 'assorbito')),
    figurati: comeVoci(campoElenco(s, 'figurati')),
    pronomi: new Set(campoElenco(s, 'pronomi').map(normalizza)),
  }));

/**
 * The creatures a sentence has fall: per clause (between punctuation), a defeat word whose subject is the creature
 * itself, named before it in the clause, or a subject pronoun (or nothing) before it with the creature named earlier
 * in the sentence. A clause with an idiom or a non-creature subject (`figurati`: «lo sguardo cade», «cade il silenzio»,
 * «lascia cadere la mazza») is not a fall. Pass 2 of the final run: «il suo sguardo cade un attimo sul cancello»
 * became «Berta è ancora in piedi.».
 */
function chiCade(frase: string, p: Parole, candidati: readonly string[], nomi: ReadonlyMap<string, readonly string[]>): string[] {
  const out: string[] = [];
  let ultimo: string | null = null;
  for (const pezzo of frase.split(/[,.;:!?—–()«»"]+/)) {
    const w = paroleDi(pezzo);
    if (!w.length) continue;
    const dove = p.sconfitta.map((v) => posizione(w, v)).filter((i) => i >= 0);
    const k = dove.length ? Math.min(...dove) : -1;
    const nominati = candidati.map((id) => ({ id, i: doveNomina(w, nomi.get(id) ?? []) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
    if (k >= 0 && !ha(w, p.figurati)) {
      const prima = nominati.filter((x) => x.i < k).at(-1);
      if (prima) out.push(prima.id);
      else if (ultimo && w.slice(0, k).every((x) => p.pronomi.has(x) || x.length <= 2 || ['poi', 'e', 'ed', 'ma', 'then', 'and', 'but'].includes(x))) out.push(ultimo);
    }
    if (nominati.length) ultimo = nominati.at(-1)!.id;
  }
  return [...new Set(out)];
}

function paroleDi(t: string): string[] {
  return normalizza(t)
    .replace(/[^\p{L}\p{N}' ]/gu, ' ')
    .split(/[\s']+/)
    .filter(Boolean);
}

/** Where the entry (stems: a word counts if it starts like this) appears in the sentence; -1 if not. */
function posizione(w: readonly string[], voce: readonly string[]): number {
  for (let i = 0; i + voce.length <= w.length; i++) if (voce.every((v, k) => w[i + k]!.startsWith(v))) return i;
  return -1;
}

function ha(w: readonly string[], voci: readonly string[][]): boolean {
  return voci.some((v) => posizione(w, v) >= 0);
}

/**
 * The outcome the sentence tells, and where its first outcome word is: a hit, a miss (a negation right before a hit
 * makes it a miss), or null when there is none, both, or a near-hit absorbed by armour (it fits either card).
 */
function esitoDetto(w: readonly string[], p: Parole): { esito: 'colpito' | 'mancato'; dove: number } | null {
  if (ha(w, p.assorbito)) return null;
  const mancati = p.mancato.map((v) => posizione(w, v)).filter((i) => i >= 0);
  let colpo = -1;
  let negato = -1;
  for (const v of p.colpito) {
    const i = posizione(w, v);
    if (i < 0) continue;
    if (w.slice(Math.max(0, i - 3), i).some((x) => p.negazioni.has(x))) negato = negato < 0 ? i : Math.min(negato, i);
    else colpo = colpo < 0 ? i : Math.min(colpo, i);
  }
  const manca = [...mancati, ...(negato >= 0 ? [negato] : [])];
  if (manca.length && colpo >= 0) return null;
  if (manca.length) return { esito: 'mancato', dove: Math.min(...manca) };
  return colpo >= 0 ? { esito: 'colpito', dove: colpo } : null;
}

/** Where the sentence first names one of these names (whole words, phrases of several words); -1 if not. */
function doveNomina(w: readonly string[], nomi: readonly string[]): number {
  let primo = -1;
  for (const n of nomi) {
    const k = paroleDi(n);
    if (!k.length || k.join(' ').length < 2) continue;
    for (let i = 0; i + k.length <= w.length; i++) {
      if (k.every((x, j) => w[i + j] === x)) {
        if (primo < 0 || i < primo) primo = i;
        break;
      }
    }
  }
  return primo;
}

function nomina(w: readonly string[], nomi: readonly string[]): boolean {
  return doveNomina(w, nomi) >= 0;
}

export interface DatiGuardiaEsiti {
  /** The turn's cards (public ones count: private ones are not told at the table). */
  tiri: readonly TiroMostrato[];
  /** How the narration names each character (PCs and NPCs): name, short name, aliases, trade. */
  nomi: ReadonlyMap<string, readonly string[]>;
  /** NPCs with a sheet (only they can fall for the Engine). */
  conScheda: (id: string) => boolean;
  /** Out of play now, after the turn's rolls (down, dead, fled). */
  fuori: (id: string) => boolean;
  nome: (id: string) => string;
}

/** The line that replaces the sentence, with the reason for the log; null = the sentence stays. */
export type CorrezioneEsito = { testo: string; motivo: 'caduta_senza_fatto' | 'colpo_contrario' } | null;

export function guardiaEsiti(d: DatiGuardiaEsiti): (frase: string) => CorrezioneEsito {
  const breve = (id: string): string => nomeBreve(d.nome(id));
  const attacchi = d.tiri.filter((t) => t.tipo === 'attacco' && t.bersaglio && !t.privata);
  // Outcome per attacker → target pair, with the names written on the card (the Engine's fact, never the line's
  // speaker); two disagreeing cards for the same pair: no judgement.
  const coppie = new Map<string, { chi: string; bersaglio: string; nomeChi: string; nomeBersaglio: string; riuscita: boolean | null }>();
  for (const t of attacchi) {
    const k = `${t.chi}>${t.bersaglio!.id}`;
    const g = coppie.get(k);
    coppie.set(k, { chi: t.chi, bersaglio: t.bersaglio!.id, nomeChi: nomeBreve(t.nome), nomeBersaglio: nomeBreve(t.bersaglio!.nome), riuscita: g && g.riuscita !== t.riuscita ? null : t.riuscita });
  }
  const png = [...d.nomi.keys()].filter((id) => id.startsWith('png_') && d.conScheda(id));
  return (frase) => {
    const p = parole();
    const w = paroleDi(frase);
    // 1. A hit against the card: the sentence tells the outcome of one of the turn's attacks, attacker → target.
    const detto = esitoDetto(w, p);
    if (detto) {
      const subisce = ha(w, p.subisce);
      for (const c of coppie.values()) {
        if (c.riuscita === null) continue;
        const a = doveNomina(w, d.nomi.get(c.chi) ?? []);
        const b = doveNomina(w, d.nomi.get(c.bersaglio) ?? []);
        if (a < 0 || b < 0 || a === b) continue;
        // Active: attacker, outcome, target («Zirrà colpisce Fulco»). With a verb of receiving the target comes
        // first («Fulco incassa il colpo di Zirrà»).
        const inOrdine = subisce ? b < detto.dove && a > b : a < detto.dove && b > a;
        if (!inOrdine) continue;
        if (detto.esito === 'colpito' && !c.riuscita) return { testo: testo('prove.guardia.manca', { chi: c.nomeChi, bersaglio: c.nomeBersaglio }), motivo: 'colpo_contrario' };
        if (detto.esito === 'mancato' && c.riuscita) return { testo: testo('prove.guardia.colpisce', { chi: c.nomeChi, bersaglio: c.nomeBersaglio }), motivo: 'colpo_contrario' };
        // This sentence tells this card, and agrees with it: no other pair to judge (the fall check still runs).
        break;
      }
    }
    // 2. A fall with no fact: a standing NPC with a sheet is the subject of a defeat word (not an idiom), and no NPC
    // the sentence has fall is really down.
    if (!ha(w, p.sconfitta)) return null;
    const nominati = chiCade(frase, p, png, d.nomi);
    if (!nominati.length || nominati.some((id) => d.fuori(id))) return null;
    if (nominati.length > 1) return { testo: testo('prove.guardia.nessuno_cade'), motivo: 'caduta_senza_fatto' };
    const id = nominati[0]!;
    const carta = attacchi.filter((t) => t.bersaglio!.id === id).at(-1);
    if (carta?.riuscita) return { testo: testo('prove.guardia.regge', { nome: breve(id) }), motivo: 'caduta_senza_fatto' };
    if (carta) return { testo: testo('prove.guardia.manca', { chi: nomeBreve(carta.nome), bersaglio: nomeBreve(carta.bersaglio!.nome) }), motivo: 'caduta_senza_fatto' };
    return { testo: testo('prove.guardia.in_piedi', { nome: breve(id) }), motivo: 'caduta_senza_fatto' };
  };
}
