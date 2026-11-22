/**
 * The creatures of a wandering encounter as combatants (docs/prove.md §14; prove/esplorazione.ts): the bestiary entry the
 * encounter table gave becomes one sheet per creature, in the scene where they arrived, like the scene's minions
 * (campagna/gregari.ts): Engine-only combatants with an id, a name, the entry's numbers, hit points rolled from the
 * session seed and their id. They do not speak and have no card; the narrator knows them from the encounter's fact.
 *
 * Ids are deterministic — `png_<entry>_inc<encounter>_<k>` — so a resume, a «Ricomincia» replay and the dry run of manual
 * rolls rebuild the same creatures with the same hit points from the snapshot's list.
 */
import type { Gregario } from '../campagna/gregari';
import type { Logger } from '../logger';
import { leggiSchedaGenerica } from '../regole/schede';
import type { SchedaGenerica, SistemaRegole } from '../regole/tipi';
import { tiraPuntiFeritaMostri } from './bestiario';

/** One creature of an encounter, as the snapshot keeps it. */
export interface Vagante {
  id: string;
  mostro: string;
  nome: string;
  scena: string;
  /** The encounter's number in the session. */
  incontro: number;
}

/** At most this many creatures of one encounter join the fight (a «Wild 3d10» herd): the rest stay in the fact. */
export const MASSIMO_VAGANTI = 20;

const normale = (t: string): string => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** The words that name one in a player's action: its name and each longer word of it («ratto gigante», «ratto»). */
export function paroleDelVagante(nome: string): string[] {
  const n = normale(nome);
  return [...new Set([n, ...n.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 4)])];
}

/** The ids and names of `quanti` creatures of entry `mostro` arriving in encounter `n` (numbered when more than one). */
export function vagantiDellIncontro(s: SistemaRegole, mostro: string, quanti: number, n: number, scena: string): Vagante[] {
  const m = (s.mostri ?? []).find((x) => x.id === mostro);
  if (!m) return [];
  const q = Math.max(1, Math.min(MASSIMO_VAGANTI, quanti));
  return Array.from({ length: q }, (_, i) => ({ id: `png_${mostro}_inc${n}_${i + 1}`, mostro, nome: q > 1 ? `${m.nome} ${i + 1}` : m.nome, scena, incontro: n }));
}

/**
 * Build the sheet of a creature and put it among the Engine's live sheets, its hit points rolled from the session seed
 * and its id (prove/bestiario.ts), so the same creature always has the same maximum. Returns its minion entry.
 */
export function creaVagante(s: SistemaRegole, schede: Map<string, SchedaGenerica>, seme: string, v: Vagante, log: Logger): Gregario | null {
  const sch = leggiSchedaGenerica(s, v.id, v.nome, true, { mostro: v.mostro });
  if (!sch) return null;
  for (const a of sch.avvisi) log.warn({ id: v.id, avviso: a }, 'wandering: the creature\'s sheet has a warning');
  tiraPuntiFeritaMostri(new Map([[v.id, sch]]), seme, log);
  schede.set(v.id, sch);
  const morale = typeof sch.morale === 'number' ? sch.morale : (sch.morale?.prima ?? null);
  return { id: v.id, tipo: v.mostro, nome: v.nome, scena: v.scena, parole: paroleDelVagante(v.nome.replace(/\s+\d+$/, '')), morale };
}

/** The snapshot's list of creatures, read back (malformed entries dropped). */
export function leggiVaganti(v: unknown): Vagante[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is Vagante => !!x && typeof x === 'object' && ['id', 'mostro', 'nome', 'scena'].every((k) => typeof (x as Record<string, unknown>)[k] === 'string') && Number.isInteger((x as Vagante).incontro));
}
