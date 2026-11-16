/**
 * The mention filter of the coherence checker (docs/coerenza.md, «Frozen replay set»): which sentences a coherence
 * rule is about, decided by the Engine alone, with no word list of its own. One module for its three users: the
 * frozen set's extractor (strumenti/coerenza-insieme.ts), the offline scorer of the yes/no candidate
 * (strumenti/coerenza-domanda.ts) and, if the candidate is adopted, the director.
 *
 * A sentence is flagged with:
 * - `fuori:<id>`: it names (name or alias) an NPC out of play (down, dead, fled);
 * - `assente:<id>`: it names an NPC in play but not in the scene;
 * - `parla:<id>`: it is the line of an NPC out of play or not in the scene;
 * - `nome:<noun>`: it uses a creature noun of the campaign's data that nobody in the scene and in play answers to
 *   (coerenza/inesistenti.ts);
 * - `colpo:<id>`: it names the target of a blow that hurt this turn, next to a miss or absorb word (the outcome
 *   guard's words, lingue/<code>/motore.yaml).
 * `daChiedere` then drops what the Engine already knows is this turn's story: who went out of play by this turn's
 * cards (as R-fuori's `oraFuori`), and a noun whose every bearer did so or is simply elsewhere.
 */
import { creatureAssenti, creatureNote, type CreaturaAssente, type TipoCreatura } from './inesistenti';
import type { EntitaRegistro, Registro, StatoEntita } from './registro';
import { doveNomina, paroleDi, paroleMancato, posizione } from '../narrazione/guardia-esiti';

const IN_GIOCO: ReadonlySet<StatoEntita> = new Set(['in_piedi', 'ferito', 'grave', 'nascosto']);

/** An attack card of the turn, as the filter needs it. */
export interface ColpoDelTurno {
  chi: string;
  bersaglio: string;
  riuscita: boolean;
  danno: number;
}

export interface ContestoMenzioni {
  entita: readonly EntitaRegistro[];
  assenti: readonly CreaturaAssente[];
  colpi: readonly ColpoDelTurno[];
  /** Who went out of play by this turn's cards. */
  fuoriOra: readonly string[];
}

/** The context of one turn: the ledger, the campaign's creature types, this turn's cards and falls. */
export function contestoMenzioni(registro: Registro, tipi: readonly TipoCreatura[], colpi: readonly ColpoDelTurno[], fuoriOra: readonly string[]): ContestoMenzioni {
  return { entita: registro.entita, assenti: creatureAssenti(registro, creatureNote(registro.entita, tipi)), colpi, fuoriOra };
}

/** The mentions of one sentence (`etichetta`: narratore or the NPC who says it). */
export function menzioniDi(testo: string, etichetta: string, c: ContestoMenzioni): string[] {
  const w = paroleDi(testo);
  const out: string[] = [];
  for (const e of c.entita) {
    if (e.tipo === 'pg' || doveNomina(w, e.nomi) < 0) continue;
    if (!IN_GIOCO.has(e.stato)) out.push(`fuori:${e.id}`);
    else if (e.presenza !== 'in_scena') out.push(`assente:${e.id}`);
  }
  for (const a of c.assenti) if (doveNomina(w, [a.parola]) >= 0) out.push(`nome:${a.parola}`);
  const mancato = [...paroleMancato().mancato, ...paroleMancato().assorbito];
  for (const k of c.colpi.filter((x) => x.riuscita && x.danno > 0)) {
    const e = c.entita.find((x) => x.id === k.bersaglio);
    if (e && doveNomina(w, e.nomi) >= 0 && mancato.some((v) => posizione(w, v) >= 0)) out.push(`colpo:${k.bersaglio}`);
  }
  if (etichetta !== 'narratore') {
    const p = c.entita.find((x) => x.id === etichetta);
    if (p && p.tipo !== 'pg' && (!IN_GIOCO.has(p.stato) || p.presenza !== 'in_scena')) out.push(`parla:${p.id}`);
  }
  return [...new Set(out)];
}

/** The NPCs in the scene and in play a narrator sentence names (a possible silent exit: `presente:<id>`). */
export function presentiNominati(testo: string, c: ContestoMenzioni): string[] {
  const w = paroleDi(testo);
  return c.entita.filter((e) => e.tipo !== 'pg' && e.presenza === 'in_scena' && IN_GIOCO.has(e.stato) && e.stato !== 'nascosto' && doveNomina(w, e.nomi) >= 0).map((e) => `presente:${e.id}`);
}

/** What is worth a question: not who fell by this turn's cards, not a noun whose bearers all did or are elsewhere. */
export function daChiedere(menzioni: readonly string[], c: ContestoMenzioni): string[] {
  return menzioni.filter((m) => {
    const [tipo, valore] = m.split(':') as [string, string];
    if (tipo === 'fuori' || tipo === 'parla') return !c.fuoriOra.includes(valore);
    if (tipo === 'nome') {
      const titolari = c.entita.filter((e) => e.tipo !== 'pg' && e.nomi.some((n) => n.toLowerCase() === valore));
      const ovvi = titolari.length > 0 && titolari.every((e) => c.fuoriOra.includes(e.id) || (e.presenza !== 'in_scena' && e.stato !== 'fuggito' && e.stato !== 'morto'));
      return !ovvi;
    }
    return true;
  });
}
