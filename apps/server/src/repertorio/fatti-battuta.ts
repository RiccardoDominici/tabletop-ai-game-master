/**
 * The facts a prewritten line carries (docs/repertorio.md, «Facts a line carries»), checked against the coherence
 * ledger BEFORE the line enters the catalogue, so the reader (a small local model in profile A, which only relays)
 * never sees a line that would contradict what is true now. The line's author (the Preparer, or the sceneggiatore
 * in the background: the big model) tags it:
 * - who speaks: `chi` and the `[png_x]` labels (the director's presence check, `StatoRepertorio.presenza`);
 * - who ACTS in its narrator rows: `attori` (with no tags, an older repertoire, an NPC a row names must at least be in
 *   play, the rule before the tags);
 * - who it only talks about: `menzionati` (no presence asked);
 * - the states it assumes: `richiede.stati` (in play, down, dead, fled), which also lets a line describe a fallen
 *   body («il corpo di Zirrà giace…») that the name rule alone would keep back.
 * An actor must be in the scene and in play; a tagged state must match the ledger (and a body in play, down or dead
 * must be in the scene). Pure: the director hands over the ledger's characters.
 */
import { normalizza } from '../azioni/regole';
import { ID_NARRATORE } from '../campagna/tipi';
import type { EntitaRegistro, StatoEntita } from '../coerenza/registro';
import { pngNominati } from './pertinenza';
import type { Battuta, ClasseStato } from './tipi';

const IN_GIOCO: ReadonlySet<StatoEntita> = new Set(['in_piedi', 'ferito', 'grave', 'nascosto']);

/** The class of a ledger state, as `richiede.stati` names it. */
export function classeDi(s: StatoEntita): ClasseStato {
  if (IN_GIOCO.has(s)) return 'in_gioco';
  return s === 'morto' ? 'morto' : s === 'fuggito' ? 'fuggito' : 'a_terra';
}

/** Who speaks in the line (`chi` and the NPC labels of every row and variant). */
function parlanti(b: Battuta): Set<string> {
  const out = new Set<string>();
  if (b.chi !== ID_NARRATORE) out.add(b.chi);
  for (const r of [...b.testo, ...b.varianti.flat()]) if (r.etichetta !== ID_NARRATORE) out.add(r.etichetta);
  return out;
}

/**
 * The NPCs the line names in any row (name, short name, alias, as the ledger has them) that its tags do not cover:
 * not a speaker, not in `attori`, `menzionati` or `richiede.stati`. With no tags these are all the NPCs it names.
 */
export function nominatiSenzaSegno(b: Battuta, entita: readonly EntitaRegistro[]): string[] {
  const coperti = new Set([...parlanti(b), ...(b.attori ?? []), ...b.menzionati, ...Object.keys(b.richiede.stati)]);
  const nomi = new Map(entita.filter((e) => e.tipo !== 'pg' && !coperti.has(e.id)).map((e) => [e.id, [...new Set(e.nomi.map(normalizza).filter((x) => x.length > 2))]]));
  const out = new Set<string>();
  for (const r of [...b.testo, ...b.varianti.flat()]) for (const id of pngNominati(r.testo, nomi)) out.add(id);
  return [...out];
}

/**
 * Why the line contradicts the ledger now (null = it does not):
 * - a tagged state that is not the ledger's (and a body in play, down or dead that is not in the scene);
 * - a tagged actor not in the scene, or out of play;
 * - an NPC the tags do not cover, named in a row, out of play (the rule before the tags: «Zirrà schiocca le dita.»
 *   eight turns after she fell); an untagged NPC away from the scene is left alone, because an older line may well
 *   talk about someone elsewhere (an ending about the village, sung at the tower): only the tags can say it acts.
 */
export function motivoControRegistro(b: Battuta, entita: readonly EntitaRegistro[]): string | null {
  const per = new Map(entita.map((e) => [e.id, e]));
  for (const [id, classi] of Object.entries(b.richiede.stati)) {
    const e = per.get(id);
    if (!e) return `assumes ${id}, who is not in the ledger`;
    const c = classeDi(e.stato);
    if (!classi.includes(c)) return `assumes ${id} ${classi.join('/')}, the ledger has ${c}`;
    if (c !== 'fuggito' && e.presenza !== 'in_scena') return `assumes ${id} here (${classi.join('/')}), the ledger has ${id} away`;
  }
  for (const id of b.attori ?? []) {
    const e = per.get(id);
    if (!e || parlanti(b).has(id)) continue;
    if (e.presenza !== 'in_scena') return `${id} acts in the line but is not in the scene`;
    if (!IN_GIOCO.has(e.stato)) return `${id} acts in the line but is out of play (${e.stato})`;
  }
  for (const id of nominatiSenzaSegno(b, entita)) {
    const e = per.get(id)!;
    if (!IN_GIOCO.has(e.stato)) return `the line names ${id}, out of play (${e.stato})`;
  }
  return null;
}
