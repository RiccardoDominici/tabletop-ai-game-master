/**
 * The outcomes of a scene with their gates (A21, docs/repertorio.md «Il finale»): `esiti[].richiede` on the scene sheet
 * says when the dramatic question has an answer, so the Engine closes the scene with that outcome's ending then,
 * before the clock is full. Before, an ending came out by itself only at a full clock; earlier, only if a player's
 * action touched its themes. Pure functions: the director reads the state and says the ending.
 *
 *   esiti:
 *     - id: es_x
 *       descrizione: "…"                      # for the Preparer and the Game Master
 *       finale: fin_x                         # mode B: the ending line the Engine says
 *       richiede: {indizi_rivelati: [i_x], stati: {png_y: [a_terra, morto, fuggito]}}   # optional: the gates
 *       detto: "…"                            # optional: the Engine's sentence (mode A, or the line unavailable)
 *
 * Gates (all must hold): `indizi_rivelati`, `indizi_non_rivelati`, `battute_usate`, `battute_non_usate`, `orologio`
 * ({id, min, max} on its marks), `stati` ({id: [in_gioco | a_terra | morto | fuggito]} in the coherence ledger).
 */
import type { ScenaCaricata, DatiYaml } from '../campagna/tipi';
import { CLASSI_STATO, type ClasseStato } from '../repertorio/tipi';

export interface CondizioniEsito {
  indizi_rivelati: string[];
  indizi_non_rivelati: string[];
  battute_usate: string[];
  battute_non_usate: string[];
  orologio: { id: string; min: number; max: number } | null;
  stati: Record<string, ClasseStato[]>;
}

export interface EsitoScena {
  id: string;
  finale: string | null;
  detto: string | null;
  /** null = no gates: the outcome is told by the themes or at a full clock, as before. */
  richiede: CondizioniEsito | null;
}

/** What the gates read, from the director's state. */
export interface StatoPerEsiti {
  indizi: ReadonlySet<string>;
  battute: ReadonlySet<string>;
  /** Marks of a clock now (null = no such clock). */
  pieni: (id: string) => number | null;
  /** The ledger class of an entity now (null = not in the ledger). */
  classe: (id: string) => ClasseStato | null;
}

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** The outcomes of a scene sheet; an unreadable gate is a warning and the outcome keeps no gates. */
export function esitiDellaScena(s: ScenaCaricata, avvisa: (m: string) => void = () => {}): EsitoScena[] {
  const out: EsitoScena[] = [];
  for (const e of (s.dati['esiti'] as DatiYaml[] | undefined) ?? []) {
    if (!e || typeof e['id'] !== 'string') continue;
    const r = e['richiede'] as DatiYaml | undefined;
    let richiede: CondizioniEsito | null = null;
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      const o = r['orologio'] as DatiYaml | undefined;
      const stati: Record<string, ClasseStato[]> = {};
      for (const [id, v] of Object.entries((r['stati'] as DatiYaml | undefined) ?? {})) {
        const classi = (typeof v === 'string' ? [v] : lista(v)).filter((x): x is ClasseStato => (CLASSI_STATO as readonly string[]).includes(x));
        if (classi.length) stati[id] = classi;
        else avvisa(`${s.id} esito ${e['id']}: richiede.stati.${id} has no known state (${CLASSI_STATO.join(', ')})`);
      }
      richiede = {
        indizi_rivelati: lista(r['indizi_rivelati']),
        indizi_non_rivelati: lista(r['indizi_non_rivelati']),
        battute_usate: lista(r['battute_usate']),
        battute_non_usate: lista(r['battute_non_usate']),
        orologio: o && typeof o['id'] === 'string' ? { id: o['id'], min: Number(o['min'] ?? 0), max: Number(o['max'] ?? Number.MAX_SAFE_INTEGER) } : null,
        stati,
      };
    }
    out.push({ id: e['id'], finale: typeof e['finale'] === 'string' ? e['finale'] : null, detto: typeof e['detto'] === 'string' ? e['detto'] : null, richiede });
  }
  return out;
}

/** Why an outcome's gates do not hold now, or null if they all hold (an outcome without gates never holds here). */
export function motivoEsito(e: EsitoScena, st: StatoPerEsiti): string | null {
  const r = e.richiede;
  if (!r) return 'no gates';
  for (const i of r.indizi_rivelati) if (!st.indizi.has(i)) return `clue ${i} not revealed`;
  for (const i of r.indizi_non_rivelati) if (st.indizi.has(i)) return `clue ${i} revealed`;
  for (const b of r.battute_usate) if (!st.battute.has(b)) return `line ${b} not used`;
  for (const b of r.battute_non_usate) if (st.battute.has(b)) return `line ${b} used`;
  if (r.orologio) {
    const p = st.pieni(r.orologio.id);
    if (p === null || p < r.orologio.min || p > r.orologio.max) return `clock ${r.orologio.id} at ${p ?? '?'}`;
  }
  for (const [id, classi] of Object.entries(r.stati)) {
    const c = st.classe(id);
    if (c === null || !classi.includes(c)) return `${id} is ${c ?? 'unknown'}`;
  }
  return null;
}

/** The first outcome (in the sheet's order) whose gates all hold now, or null. */
export function esitoRaggiunto(esiti: readonly EsitoScena[], st: StatoPerEsiti): EsitoScena | null {
  return esiti.find((e) => motivoEsito(e, st) === null) ?? null;
}
