/**
 * The coherence ledger (docs/coerenza.md §1): what is true now, as one read model of the Engine's own sources.
 *
 * The Engine keeps the truth in its usual places (prove/stato.ts for hit points, the dead and the fled;
 * prove/combattimento.ts for death saves; the director for presence; the repertoire for facts found; the private
 * outcomes and actions). This module never owns state: `costruisciRegistro` is a pure, cheap function of those sources,
 * called before every model call and every check, so a fall in combat and the narration of the same turn see the same
 * ledger. `differenze` turns two successive ledgers into journal events (who changed, from what to what, why), which
 * the director logs and saves in the snapshot: the Game Master panel and a resume read the same history.
 *
 * The model never writes the ledger. Three e2e passes (docs/e2e-finale-3.md) found the narration contradicting the
 * Engine because each guard rebuilt its own idea of «who is present», «who is down», «who knows what»; the ledger is
 * that idea, once.
 */
import type { TiroMostrato } from '@tabletop-ai-gm/shared';

/** How a character is, for the table (no numbers: hit points become a band). */
export type StatoEntita = 'in_piedi' | 'ferito' | 'grave' | 'a_terra' | 'morente' | 'morto' | 'fuggito' | 'nascosto';
/** Where a character is: in the scene, gone from it during this visit (`uscito`), or elsewhere. PCs are always here. */
export type PresenzaEntita = 'in_scena' | 'uscito' | 'altrove';

export interface EntitaRegistro {
  id: string;
  /** `improvvisato`: a minor character the narrator brought in with [nuovo png] (mode A): no stats, no secrets. */
  tipo: 'pg' | 'png' | 'gregario' | 'improvvisato';
  nome: string;
  /** How the narration names it: name, short name, aliases, trade (as the guards match them). */
  nomi: string[];
  stato: StatoEntita;
  presenza: PresenzaEntita;
  /** For `uscito`: the turn it left and where to, if known. */
  uscito: { turno: number; verso: string | null } | null;
}

/** A fact and who knows it: everybody at the table, or only some PCs (a private outcome, a whisper). */
export interface FattoRegistro {
  /** Stable key (a canon fact id, `privato:<turn>:<n>`, `azione:<turn>:<pc>`). */
  chiave: string;
  testo: string;
  turno: number;
  pubblico: boolean;
  /** The PCs who know it when it is not public (empty when public). */
  conosciutoDa: string[];
}

/** One card of this turn, as an outcome: who rolled, at whom, hit or miss, and whether only one PC saw it. */
export interface EsitoRegistro {
  id: string;
  chi: string;
  nome: string;
  bersaglio: { id: string; nome: string } | null;
  tipo: string;
  etichetta: string;
  riuscita: boolean;
  aTerra: boolean;
  /** A private action's card: its consequence (a wound) is public in the entity's state, the act is not. */
  privata: boolean;
}

export interface Registro {
  turno: number;
  scena: string;
  entita: EntitaRegistro[];
  fatti: FattoRegistro[];
  esiti: EsitoRegistro[];
  /** NPCs who refused this turn after a failed social check, toward whom (the refusal guard's input). */
  negati: Array<{ png: string; autore: string; privata: boolean }>;
}

/** What the director hands over: plain data and lookups on the Engine's sources (no copies of the state). */
export interface FontiRegistro {
  turno: number;
  scena: string;
  pg: ReadonlyArray<{ id: string; nome: string; nomi: readonly string[] }>;
  png: ReadonlyArray<{ id: string; nome: string; nomi: readonly string[]; nascosto: boolean }>;
  /** Minions of the scene (campagna/gregari.ts), standing or not. */
  gregari: ReadonlyArray<{ id: string; nome: string; nomi: readonly string[] }>;
  /** Minor characters improvised in play ([nuovo png], mode A); absent = none. */
  improvvisati?: ReadonlyArray<{ id: string; nome: string; nomi: readonly string[] }>;
  /** NPCs and minions physically in the scene (bodies included; the fled are not). */
  presenti: ReadonlySet<string>;
  /** NPCs who left the scene during this visit, with the turn and where to (presence tags, docs/coerenza.md §1). */
  usciti?: ReadonlyMap<string, { turno: number; verso: string | null }>;
  pf: (id: string) => { attuali: number; massimi: number } | null;
  fuori: (id: string) => 'a_terra' | 'morto' | 'fuggito' | null;
  /** PCs on the ground with death saves running. */
  morenti: ReadonlySet<string>;
  fatti: readonly FattoRegistro[];
  carte: readonly TiroMostrato[];
  negati: ReadonlyArray<{ png: string; autore: string; privata: boolean }>;
}

/** The band of the hit points: full or a scratch, wounded (half or less), badly wounded (a quarter or less). */
export function bandaPf(pf: { attuali: number; massimi: number } | null): 'in_piedi' | 'ferito' | 'grave' {
  if (!pf || pf.massimi <= 0 || pf.attuali >= pf.massimi) return 'in_piedi';
  if (pf.attuali * 4 <= pf.massimi) return 'grave';
  return pf.attuali * 2 <= pf.massimi ? 'ferito' : 'in_piedi';
}

function statoDi(f: FontiRegistro, id: string, nascosto: boolean): StatoEntita {
  const fuori = f.fuori(id);
  if (fuori === 'morto' || fuori === 'fuggito') return fuori;
  if (fuori === 'a_terra') return f.morenti.has(id) ? 'morente' : 'a_terra';
  if (nascosto) return 'nascosto';
  return bandaPf(f.pf(id));
}

/** The ledger of this moment. Pure: the same sources give the same ledger. */
export function costruisciRegistro(f: FontiRegistro): Registro {
  const entita: EntitaRegistro[] = [];
  for (const p of f.pg) entita.push({ id: p.id, tipo: 'pg', nome: p.nome, nomi: [...p.nomi], stato: statoDi(f, p.id, false), presenza: 'in_scena', uscito: null });
  const png = (tipo: 'png' | 'gregario' | 'improvvisato', p: { id: string; nome: string; nomi: readonly string[]; nascosto?: boolean }): void => {
    const uscito = f.usciti?.get(p.id) ?? null;
    const presenza: PresenzaEntita = uscito ? 'uscito' : f.presenti.has(p.id) ? 'in_scena' : 'altrove';
    entita.push({ id: p.id, tipo, nome: p.nome, nomi: [...p.nomi], stato: statoDi(f, p.id, p.nascosto === true && presenza === 'in_scena'), presenza, uscito: uscito ? { ...uscito } : null });
  };
  for (const p of f.png) png('png', p);
  for (const g of f.gregari) png('gregario', g);
  for (const i of f.improvvisati ?? []) png('improvvisato', i);
  const esiti: EsitoRegistro[] = f.carte.map((t) => ({
    id: t.id,
    chi: t.chi,
    nome: t.nome,
    bersaglio: t.bersaglio ? { ...t.bersaglio } : null,
    tipo: t.tipo,
    etichetta: t.etichetta,
    riuscita: t.riuscita,
    aTerra: t.a_terra,
    privata: t.privata,
  }));
  return { turno: f.turno, scena: f.scena, entita, fatti: f.fatti.map((x) => ({ ...x, conosciutoDa: [...x.conosciutoDa] })), esiti, negati: f.negati.map((n) => ({ ...n })) };
}

/** A change between two ledgers, for the journal (docs/coerenza.md §1). */
export interface EventoRegistro {
  turno: number;
  tipo: 'stato' | 'presenza' | 'fatto' | 'scena';
  id: string;
  da: string | null;
  a: string;
  causa: string;
}

/** What changed from `prima` to `dopo` (null `prima`: nothing, the first ledger is the baseline). */
export function differenze(prima: Registro | null, dopo: Registro, causa: string): EventoRegistro[] {
  if (!prima) return [];
  const out: EventoRegistro[] = [];
  const ev = (tipo: EventoRegistro['tipo'], id: string, da: string | null, a: string): void => {
    out.push({ turno: dopo.turno, tipo, id, da, a, causa });
  };
  if (prima.scena !== dopo.scena) ev('scena', dopo.scena, prima.scena, dopo.scena);
  const vecchie = new Map(prima.entita.map((e) => [e.id, e]));
  for (const e of dopo.entita) {
    const v = vecchie.get(e.id);
    if (!v) continue;
    if (v.stato !== e.stato) ev('stato', e.id, v.stato, e.stato);
    if (v.presenza !== e.presenza) ev('presenza', e.id, v.presenza, e.presenza);
  }
  const noti = new Map(prima.fatti.map((x) => [x.chiave, x]));
  for (const x of dopo.fatti) {
    const v = noti.get(x.chiave);
    const chi = x.pubblico ? 'pubblico' : x.conosciutoDa.join(',');
    if (!v) ev('fatto', x.chiave, null, chi);
    else if (v.pubblico !== x.pubblico) ev('fatto', x.chiave, v.pubblico ? 'pubblico' : v.conosciutoDa.join(','), chi);
  }
  return out;
}

/** The ledger rows that a reader (the panel, a log) needs, compact: entity → «stato, presenza». */
export function riassuntoEntita(r: Registro): Record<string, string> {
  return Object.fromEntries(r.entita.map((e) => [e.id, `${e.stato}, ${e.presenza}`]));
}
