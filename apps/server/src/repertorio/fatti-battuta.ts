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
import type { EntitaRegistro, EsitoRegistro, StatoEntita } from '../coerenza/registro';
import { pngNominati } from './pertinenza';
import type { Battuta, ClasseStato } from './tipi';
import { TUTTI_I_PG } from '../campagna/mondo';

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
    // `tutti`: every PC (the key the attitudes use). A prepared line cannot name the PCs, so it says the states it
    // assumes for all of them (final round, CM T32, CA T22, PR T32: «Vi sveglia il freddo» woke a dead PC):
    // `{tutti: [in_gioco, a_terra]}` = nobody dead or fled.
    if (id === TUTTI_I_PG) {
      const fuori = entita.find((e) => e.tipo === 'pg' && !classi.includes(classeDi(e.stato)));
      if (fuori) return `assumes every PC ${classi.join('/')}, the ledger has ${fuori.id} ${classeDi(fuori.stato)}`;
      continue;
    }
    const e = per.get(id);
    if (!e) return `assumes ${id}, who is not in the ledger`;
    const c = classeDi(e.stato);
    if (!classi.includes(c)) return `assumes ${id} ${classi.join('/')}, the ledger has ${c}`;
    if (c !== 'fuggito' && e.presenza !== 'in_scena') return `assumes ${id} here (${classi.join('/')}), the ledger has ${id} away`;
  }
  // Losing the round in progress (surprise…): it neither speaks nor acts in a line of that round (final round, PR T11/T13).
  for (const id of parlanti(b)) {
    const e = per.get(id);
    if (e?.fermo) return `${id} speaks in the line but loses this round (${e.fermo})`;
  }
  for (const id of b.attori ?? []) {
    const e = per.get(id);
    if (e?.fermo) return `${id} acts in the line but loses this round (${e.fermo})`;
    if (!e || parlanti(b).has(id)) continue;
    if (e.presenza !== 'in_scena') return `${id} acts in the line but is not in the scene`;
    if (!IN_GIOCO.has(e.stato)) return `${id} acts in the line but is out of play (${e.stato})`;
  }
  for (const id of nominatiSenzaSegno(b, entita)) {
    const e = per.get(id)!;
    if (!IN_GIOCO.has(e.stato)) return `the line names ${id}, out of play (${e.stato})`;
    if (e.fermo) return `the line names ${id}, who loses this round (${e.fermo})`;
  }
  return null;
}

/** The cards of one turn for `richiede.esito`: its outcomes and who fled in it (absent = read the ledger's state). */
export interface CarteDelTurno {
  esiti: readonly EsitoRegistro[];
  fughe?: ReadonlySet<string>;
}

/**
 * Why the outcome a line tells (`richiede.esito`) is not this turn's (null = it is, or the line tells none): a blow
 * that landed, missed or downed its target must be on one of the turn's public attack cards, struck by `chi` (an NPC)
 * or, with no `chi`, by the PC whose action the line answers (`per`; null = any PC, for the catalogue); a flight must
 * be one of the turn's flights. Round 4: a miss line («la lancia taglia l'aria dove nessuno c'è più») was heard for a
 * blow that hit.
 */
export function motivoEsito(b: Battuta, entita: readonly EntitaRegistro[], carte: CarteDelTurno, per: string | null): string | null {
  const e = b.richiede.esito;
  if (!e || e.tipo === 'nessuno') return null;
  if (e.tipo === 'ferito') {
    // Someone hurt: a blow of this turn landed on them (round 5: «Zirrà: Ahi! … prendi questa» with no card on her).
    const chi = e.bersaglio ?? (b.chi !== 'narratore' ? b.chi : null);
    return carte.esiti.some((k) => k.tipo === 'attacco' && !k.privata && k.riuscita && (!chi || k.bersaglio?.id === chi)) ? null : `tells ${chi ?? 'someone'} hurt: no card of this turn says so`;
  }
  if (e.tipo === 'fugge') {
    const id = e.chi ?? e.bersaglio;
    const x = entita.find((y) => y.id === id);
    const fuggito = carte.fughe ? !!id && carte.fughe.has(id) : x?.stato === 'fuggito' || x?.presenza === 'uscito';
    return fuggito ? null : `tells ${id ?? 'someone'} fleeing: not a flight of this turn`;
  }
  const pg = new Set(entita.filter((x) => x.tipo === 'pg').map((x) => x.id));
  const chi = (k: EsitoRegistro): boolean => (e.chi ? k.chi === e.chi : per ? k.chi === per : pg.has(k.chi));
  const come = (k: EsitoRegistro): boolean => (e.tipo === 'mancato' ? !k.riuscita : k.riuscita && (e.tipo !== 'a_terra' || k.aTerra));
  const ok = carte.esiti.some((k) => k.tipo === 'attacco' && !k.privata && chi(k) && (!e.bersaglio || k.bersaglio?.id === e.bersaglio) && come(k));
  return ok ? null : `tells ${e.tipo}${e.chi ? ` by ${e.chi}` : per ? ` by ${per}` : ''}${e.bersaglio ? ` on ${e.bersaglio}` : ''}: no card of this turn says so`;
}
