/**
 * Combat outcome guard (docs/combattimento.md, «The narrator and the facts»): a narrator sentence that
 * contradicts the Engine is replaced by the Engine's own line, before the voice. Two cases from the second pass
 * of the final end-to-end run:
 * - A FALL WITH NO FACT: «…colpisce il goblin in pieno petto, e quello cade sui gradini con un rantolo» while the
 *   goblin is still standing for the Engine. A sentence with a defeat word («muore», «cade», «crolla»…) and the
 *   name of an NPC with a sheet who is NOT out of play (and no NPC in the sentence really down) becomes the
 *   Engine's line: «X incassa il colpo, ma resta in piedi.», «Y manca X.» or «X è ancora in piedi.», from the
 *   turn's card.
 * - A HIT AGAINST THE CARD: «Grosso… colpisce Livia» when the card says miss. A sentence naming the attacker and
 *   the target of one of the turn's attacks and saying the opposite of the card (hit words against miss words; a
 *   negation right before a hit word counts as a miss) becomes «Grosso manca Livia.» or «Grosso colpisce Livia.».
 * The words are in the language pack (lingue/<code>/motore.yaml, `guardia_esiti`; hit words come from
 * `fatti_dovuti.colpito`), the lines in testi-prove.yaml (`prove.guardia`). Pure logic: the director passes the
 * turn's cards, who is out of play, and the names.
 */
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { normalizza } from '../azioni/regole';
import { nomeBreve } from '../campagna/nomi';
import { testo } from '../lingua';
import { campoElenco, regole } from '../lingua/motore';
import { paroleDovute } from '../prove/fatti-dovuti';

interface Parole {
  sconfitta: string[][];
  mancato: string[][];
  colpito: string[][];
  negazioni: ReadonlySet<string>;
}

/** Each entry as words (an entry of several words is a phrase to find in a row). */
const comeVoci = (xs: readonly string[]): string[][] => xs.map((x) => paroleDi(x)).filter((v) => v.length > 0);

const parole = (): Parole =>
  regole('guardia_esiti', (s) => ({
    sconfitta: comeVoci(campoElenco(s, 'sconfitta')),
    mancato: comeVoci(campoElenco(s, 'mancato')),
    negazioni: new Set(campoElenco(s, 'negazioni').map(normalizza)),
    // Hit words shared with the combat facts (one compilation of `fatti_dovuti`: regole() caches per section name).
    colpito: comeVoci(paroleDovute().colpito),
  }));

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

/** Whether the sentence tells a hit (a negation right before a hit word makes it a miss); null = unclear. */
function diceColpo(w: readonly string[], p: Parole): 'colpito' | 'mancato' | null {
  const manca = ha(w, p.mancato);
  let colpo = false;
  let negato = false;
  for (const v of p.colpito) {
    const i = posizione(w, v);
    if (i < 0) continue;
    if (w.slice(Math.max(0, i - 3), i).some((x) => p.negazioni.has(x))) negato = true;
    else colpo = true;
  }
  if ((manca || negato) && colpo) return null;
  if (manca || negato) return 'mancato';
  return colpo ? 'colpito' : null;
}

function nomina(w: readonly string[], nomi: readonly string[]): boolean {
  const t = ` ${w.join(' ')} `;
  return nomi.some((n) => {
    const k = paroleDi(n).join(' ');
    return k.length >= 2 && t.includes(` ${k} `);
  });
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
  // Outcome per attacker → target pair; two disagreeing cards for the same pair: no judgement.
  const coppie = new Map<string, { chi: string; bersaglio: string; riuscita: boolean | null }>();
  for (const t of attacchi) {
    const k = `${t.chi}>${t.bersaglio!.id}`;
    const g = coppie.get(k);
    coppie.set(k, { chi: t.chi, bersaglio: t.bersaglio!.id, riuscita: g && g.riuscita !== t.riuscita ? null : t.riuscita });
  }
  const png = [...d.nomi.keys()].filter((id) => id.startsWith('png_') && d.conScheda(id));
  return (frase) => {
    const p = parole();
    const w = paroleDi(frase);
    // 1. A hit against the card: the sentence names the attacker and the target of one of the turn's attacks.
    for (const c of coppie.values()) {
      if (c.riuscita === null || !nomina(w, d.nomi.get(c.chi) ?? []) || !nomina(w, d.nomi.get(c.bersaglio) ?? [])) continue;
      const detto = diceColpo(w, p);
      if (detto === 'colpito' && !c.riuscita) return { testo: testo('prove.guardia.manca', { chi: breve(c.chi), bersaglio: breve(c.bersaglio) }), motivo: 'colpo_contrario' };
      if (detto === 'mancato' && c.riuscita) return { testo: testo('prove.guardia.colpisce', { chi: breve(c.chi), bersaglio: breve(c.bersaglio) }), motivo: 'colpo_contrario' };
    }
    // 2. A fall with no fact: a defeat word and a standing NPC, no NPC in the sentence really down.
    if (!ha(w, p.sconfitta)) return null;
    const nominati = png.filter((id) => nomina(w, d.nomi.get(id) ?? []));
    if (!nominati.length || nominati.some((id) => d.fuori(id))) return null;
    if (nominati.length > 1) return { testo: testo('prove.guardia.nessuno_cade'), motivo: 'caduta_senza_fatto' };
    const id = nominati[0]!;
    const carta = attacchi.filter((t) => t.bersaglio!.id === id).at(-1);
    if (carta?.riuscita) return { testo: testo('prove.guardia.regge', { nome: breve(id) }), motivo: 'caduta_senza_fatto' };
    if (carta) return { testo: testo('prove.guardia.manca', { chi: breve(carta.chi), bersaglio: breve(id) }), motivo: 'caduta_senza_fatto' };
    return { testo: testo('prove.guardia.in_piedi', { nome: breve(id) }), motivo: 'caduta_senza_fatto' };
  };
}
