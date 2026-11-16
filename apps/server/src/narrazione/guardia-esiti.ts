/**
 * Combat outcome guard (docs/combattimento.md, «The narrator and the facts»): a narrator sentence that
 * contradicts the Engine is replaced by the Engine's own line, before the voice. Two cases from the second pass
 * of the final end-to-end run:
 * - A FALL WITH NO FACT: «…colpisce il goblin in pieno petto, e quello cade sui gradini con un rantolo» while the
 *   goblin is still standing for the Engine. A sentence with a defeat word («muore», «cade», «crolla»…) and the
 *   name of an NPC (or a PC) with a sheet who is NOT out of play (and nobody in the sentence really down) becomes the
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
// A cycle with guardia-fuori.ts (it reads this module's word helpers): used only inside functions, never at load.
import { paroleDellaFrase } from './guardia-fuori';
import { inOsservazione } from '../coerenza/osservazione';

interface Parole {
  sconfitta: string[][];
  mancato: string[][];
  colpito: string[][];
  subisce: string[][];
  assorbito: string[][];
  figurati: string[][];
  pronomi: ReadonlySet<string>;
  /** Place phrases of `sconfitta` («a terra»): for a PC a fall only right after a state verb (`verbi_stato`). */
  luoghi: string[][];
  verbiStato: ReadonlySet<string>;
  /** Subordinating words («che», «perché», «quando»…): followed by an article, a new subject starts. */
  subordinate: ReadonlySet<string>;
  articoli: ReadonlySet<string>;
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
    luoghi: comeVoci(campoElenco(s, 'luoghi')),
    verbiStato: new Set(campoElenco(s, 'verbi_stato').map(normalizza)),
    subordinate: new Set(campoElenco(s, 'subordinate').map(normalizza)),
    articoli: new Set(campoElenco(s, 'articoli').map(normalizza)),
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
    // For a PC, a place phrase («a terra») is a fall only right after a state verb («è a terra», «cade a terra»): the
    // announcements have PCs put things down («Eliandro posa il quaderno a terra»).
    const doveForte = p.sconfitta
      .map((v) => {
        const i = posizione(w, v);
        const luogo = p.luoghi.some((l) => l.length === v.length && l.every((x, j) => x === v[j]));
        return i >= 0 && (!luogo || (i > 0 && p.verbiStato.has(w[i - 1]!))) ? i : -1;
      })
      .filter((i) => i >= 0);
    const kForte = doveForte.length ? Math.min(...doveForte) : -1;
    const nominati = candidati.map((id) => ({ id, i: doveNomina(w, nomi.get(id) ?? []) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
    if (k >= 0 && !ha(w, p.figurati)) {
      const prima0 = nominati.filter((x) => x.i < k).at(-1);
      // A subordinate clause with its own subject between the name and the fall («Nespola si accorge che il compagno è
      // a terra»: HEAD rerun after the fixes, T7, became «Nespola è ancora in piedi.»): the fall is not the named one's.
      const traIDue = prima0 ? w.slice(prima0.i + 1, k) : [];
      const altroSoggetto = traIDue.some((x, j) => p.subordinate.has(x) && p.articoli.has(traIDue[j + 1] ?? ''));
      const prima = altroSoggetto ? undefined : prima0;
      if (altroSoggetto) {
        // the subject is a noun the guard does not know: no judgement
      } else if (prima && prima.id.startsWith('pg_') && !(kForte >= 0 && nominati.filter((x) => x.i < kForte).at(-1)?.id === prima.id)) {
        // a PC with only a place phrase: not a fall
      } else if (prima) out.push(prima.id);
      else if (ultimo && w.slice(0, k).every((x) => p.pronomi.has(x) || x.length <= 2 || ['poi', 'e', 'ed', 'ma', 'then', 'and', 'but'].includes(x))) out.push(ultimo);
      // A relative clause opening with a subject pronoun, with other verbs before the fall: «…sul goblin, che grida e
      // cade all'indietro» (third e2e pass, HEAD rerun T8: the goblin, standing, «cade»).
      else if (ultimo && p.pronomi.has(w[0]!) && !nominati.length) out.push(ultimo);
    }
    if (nominati.length) ultimo = nominati.at(-1)!.id;
  }
  return [...new Set(out)];
}

/**
 * The subject pronouns of this section, for the out-of-play guard (narrazione/guardia-fuori.ts). Shared from this one
 * compilation: `regole()` caches one compiled value per section name, and a second compile of `guardia_esiti` with
 * another shape got this module's object back (the HEAD rerun after the fixes: «pronomi.has is not a function», the
 * narration call failed in every fight with someone out of play).
 */
export function pronomiDiSoggetto(): ReadonlySet<string> {
  return parole().pronomi;
}

/** The words of a blow told (hit, miss, defeat) and the subject pronouns, for the absent-creature rule (coerenza/inesistenti.ts). */
export function paroleDelColpo(): { colpo: readonly string[][]; caduta: readonly string[][]; pronomi: ReadonlySet<string> } {
  const p = parole();
  return { colpo: [...p.colpito, ...p.mancato], caduta: p.sconfitta, pronomi: p.pronomi };
}

/** The words of a miss and of an absorbed blow, from this one compilation (prove/fatti-dovuti.ts reads them too). */
export function paroleMancato(): { mancato: readonly string[][]; assorbito: readonly string[][] } {
  const p = parole();
  return { mancato: p.mancato, assorbito: p.assorbito };
}

export function paroleDi(t: string): string[] {
  return normalizza(t)
    .replace(/[^\p{L}\p{N}' ]/gu, ' ')
    .split(/[\s']+/)
    .filter(Boolean);
}

/** Where the entry (stems: a word counts if it starts like this) appears in the sentence; -1 if not. */
export function posizione(w: readonly string[], voce: readonly string[]): number {
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
export function doveNomina(w: readonly string[], nomi: readonly string[]): number {
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
  /**
   * A rule in observation (coerenza/osservazione.ts): its correction is handed here and the sentence goes on to the
   * next rules unchanged. Without it the correction is returned as usual.
   */
  osserva?: (c: NonNullable<CorrezioneEsito>) => void;
}

/** The line that replaces the sentence, with the reason for the log; null = the sentence stays. */
export type CorrezioneEsito = { testo: string; motivo: 'caduta_senza_fatto' | 'colpo_contrario' | 'colpo_assorbito' | 'fuori_gioco_agisce' | 'creatura_inesistente' | 'attore_implicito' } | null;

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
  // Who can fall for the Engine: the NPCs with a sheet, and the PCs too (third e2e pass, bug 3: a player wrote «Vedo
  // Nespola a terra» and the narration had her «a terra» at 1 hit point; another wrote «Ho zero punti ferita» at 5 of 5).
  const png = [...d.nomi.keys()].filter((id) => (id.startsWith('png_') || id.startsWith('pg_')) && d.conScheda(id));
  // The turn's blows that landed and hurt: a sentence that has them missed or absorbed contradicts them.
  const ferite = attacchi.filter((t) => t.riuscita && (t.danno?.totale ?? 0) > 0);
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
    // 1b. A blow that hurt, told as missed or absorbed by the target alone (no attacker named): the coherence run on
    // 2a7697c, off the rails T13, card «Berta: A mani nude 15, riuscita» (3 damage), narration «Il pugno le scivola sulla
    // spalla di Fulco, ma il colpo è corto e la pietra del simbolo lo assorbe». Absorbed fits a hit with no damage only.
    // Round 2 (combat-auto T6): a negated word («non regge») is not an absorbed blow, and the target must be where a
    // blow lands, in a prepositional phrase («sulla spalla di Fulco», «accanto a Ida»), not the subject of something
    // else («il sasso che Zirrà aveva puntato rimbalza»).
    const nonNegata = (voci: readonly string[][]): boolean =>
      voci.some((v) => {
        const i = posizione(w, v);
        return i >= 0 && !w.slice(Math.max(0, i - 2), i).some((x) => p.negazioni.has(x));
      });
    const senzaColpo = !p.colpito.some((v) => posizione(w, v) >= 0);
    if (senzaColpo && (nonNegata(p.assorbito) || nonNegata(p.mancato))) {
      const preposizioni = paroleDellaFrase().preposizioni;
      for (const t of ferite) {
        // The target struck too this turn: the miss may be its own blow («Eliandro tira il pugnale, che va a vuoto»).
        if (attacchi.some((x) => x.chi === t.bersaglio!.id)) continue;
        const b = doveNomina(w, d.nomi.get(t.bersaglio!.id) ?? []);
        const a = doveNomina(w, d.nomi.get(t.chi) ?? []);
        if (b >= 1 && a < 0 && preposizioni.has(w[b - 1]!)) {
          const c: NonNullable<CorrezioneEsito> = { testo: testo('prove.guardia.colpisce', { chi: nomeBreve(t.nome), bersaglio: nomeBreve(t.bersaglio!.nome) }), motivo: 'colpo_assorbito' };
          if (!d.osserva || !inOsservazione(c.motivo)) return c;
          d.osserva(c);
          break;
        }
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
