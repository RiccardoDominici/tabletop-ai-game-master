/**
 * Structured `avanza_quando` (docs/mondo.md §2): the facts of the game that move a clock, not only time.
 *
 * Each entry of a clock's `avanza_quando` is a string (a note for the narrator and the reader, nobody applies
 * it) or a gate: `{quando: <fact>, …}`. When the fact happens the gate owes `segni` marks to its clock (at most
 * `volte` times per session). Who pays the debt is StatoOrologi (the mark is due) and the director (it says the
 * mark if the response did not, or pays it off-screen when the clock is not active). Pure logic: the director
 * feeds the facts; the counts of `volte` are saved in the snapshot.
 */
import { temaPresente } from '../repertorio/pertinenza';
import type { EsitoTiroMondo, RichiestaTiroMondo } from './tiri';

export const QUANDO = ['cambio_scena', 'lascia_scena', 'resta_in_scena', 'battuta', 'indizio', 'azione', 'prova_fallita', 'scontro'] as const;
export type Quando = (typeof QUANDO)[number];

/** A gate of a clock, as read from `avanza_quando`. */
export interface Porta {
  /** «o_id#index»: stable key for the counts and the log. */
  chiave: string;
  orologio: string;
  quando: Quando;
  /** lascia_scena / resta_in_scena: only this scene (null = any). */
  scena: string | null;
  /** resta_in_scena: every this many turns in the same visit. */
  turni: number | null;
  /** battuta / indizio: the ids that trigger it. */
  ids: string[];
  /** azione: themes of a public action (matched like the lines' `temi`). */
  temi: string[];
  /** prova_fallita: ability, characteristic, scene check id or type (empty = any failed check). */
  prove: string[];
  /** Marks owed each time (≥ 1). */
  segni: number;
  /** At most this many times per session (null = no limit). */
  volte: number | null;
  /**
   * Uncertain outcome (`tiro: {dado, almeno, visibile?}`): when the fact happens the Engine rolls (Game Master side,
   * mondo/tiri.ts) and the marks are owed only on a success. null = no roll, the fact is enough.
   */
  tiro: { dado: number; almeno: number; visibile: boolean } | null;
}

/** A fact of the game, as the director sees it. */
export type FattoDelGioco =
  | { tipo: 'cambio_scena'; da: string; a: string }
  | { tipo: 'turno_in_scena'; scena: string; turniNellaVisita: number }
  | { tipo: 'battuta'; id: string }
  | { tipo: 'indizio'; id: string }
  | { tipo: 'azione'; testo: string }
  | { tipo: 'prova_fallita'; prove: readonly string[] }
  | { tipo: 'scontro' };

/** A gate that fired: how many marks it owes to which clock (and the roll, when it had one). */
export interface Debito {
  porta: string;
  orologio: string;
  segni: number;
  quando: Quando;
  tiro?: EsitoTiroMondo;
}

/** A gate whose fact happened but whose roll failed: nothing owed (for the log). */
export interface TiroFallito {
  porta: string;
  orologio: string;
  quando: Quando;
  tiro: EsitoTiroMondo;
}

function stringhe(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [];
}

function intero(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : null;
}

/**
 * The gate of one `avanza_quando` entry, or null for a note (a string) or an entry the Engine cannot read
 * (the validator reports those; the loader logs them through `avvisa`).
 */
export function portaDa(orologio: string, indice: number, grezzo: unknown, avvisa: (msg: string) => void = () => {}): Porta | null {
  if (typeof grezzo === 'string' || grezzo === null || grezzo === undefined) return null;
  if (typeof grezzo !== 'object' || Array.isArray(grezzo)) {
    avvisa(`${orologio}.avanza_quando[${indice}]: neither a note nor a gate`);
    return null;
  }
  const d = grezzo as Record<string, unknown>;
  const quando = d['quando'];
  if (typeof quando !== 'string' || !(QUANDO as readonly string[]).includes(quando)) {
    avvisa(`${orologio}.avanza_quando[${indice}]: unknown quando ${JSON.stringify(quando)}`);
    return null;
  }
  const p: Porta = {
    chiave: `${orologio}#${indice}`,
    orologio,
    quando: quando as Quando,
    scena: typeof d['scena'] === 'string' && d['scena'].trim() ? d['scena'].trim() : null,
    turni: intero(d['turni']),
    ids: stringhe(d['ids']),
    temi: stringhe(d['temi']),
    prove: stringhe(d['prove']),
    segni: intero(d['segni']) ?? 1,
    volte: intero(d['volte']),
    tiro: tiroDa(d['tiro']),
  };
  const manca =
    (p.quando === 'resta_in_scena' && p.turni === null && 'turni') ||
    ((p.quando === 'battuta' || p.quando === 'indizio') && p.ids.length === 0 && 'ids') ||
    (p.quando === 'azione' && p.temi.length === 0 && 'temi');
  if (manca) {
    avvisa(`${orologio}.avanza_quando[${indice}]: ${p.quando} needs ${manca}`);
    return null;
  }
  return p;
}

/** `tiro: {dado: 6, almeno: 4, visibile?: true}` → the roll of the gate, or null (absent or unreadable). */
function tiroDa(v: unknown): Porta['tiro'] {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const d = v as Record<string, unknown>;
  const dado = intero(d['dado']);
  const almeno = intero(d['almeno']);
  if (dado === null || dado < 2 || dado > 100 || almeno === null || almeno > dado) return null;
  return { dado, almeno, visibile: d['visibile'] === true };
}

/** The gates of a list of clock definitions (each with `id` and `avanza_quando`). */
export function porteDegliOrologi(orologi: ReadonlyArray<Record<string, unknown>>, avvisa?: (msg: string) => void): Porta[] {
  const out: Porta[] = [];
  for (const o of orologi) {
    const id = typeof o['id'] === 'string' ? o['id'] : null;
    if (!id || !Array.isArray(o['avanza_quando'])) continue;
    (o['avanza_quando'] as unknown[]).forEach((x, i) => {
      const p = portaDa(id, i, x, avvisa);
      if (p) out.push(p);
    });
  }
  return out;
}

/** Does this gate open for this fact? */
export function apre(p: Porta, f: FattoDelGioco): boolean {
  switch (p.quando) {
    case 'cambio_scena':
      return f.tipo === 'cambio_scena';
    case 'lascia_scena':
      return f.tipo === 'cambio_scena' && (p.scena === null || p.scena === f.da);
    case 'resta_in_scena':
      return f.tipo === 'turno_in_scena' && (p.scena === null || p.scena === f.scena) && f.turniNellaVisita > 0 && f.turniNellaVisita % p.turni! === 0;
    case 'battuta':
      return f.tipo === 'battuta' && p.ids.includes(f.id);
    case 'indizio':
      return f.tipo === 'indizio' && p.ids.includes(f.id);
    case 'azione':
      return f.tipo === 'azione' && temaPresente(f.testo, p.temi);
    case 'prova_fallita':
      return f.tipo === 'prova_fallita' && f.prove.length > 0 && (p.prove.length === 0 || p.prove.some((x) => f.prove.includes(x)));
    case 'scontro':
      return f.tipo === 'scontro';
  }
}

/** The gates of the campaign and how many times each has opened in this session. */
export class PorteDelMondo {
  private readonly aperture = new Map<string, number>();

  constructor(readonly porte: readonly Porta[]) {}

  /**
   * The facts of one moment (e.g. all the actions and checks of a turn): each gate opens at most once per call,
   * within its `volte`. A gate with `tiro` asks `tira` (the world's roll hook) and owes its marks only on a success;
   * only successes count for `volte`. Returns the debts, in the order of the gates, and the failed rolls.
   */
  fatti(fatti: readonly FattoDelGioco[], tira?: { tiro: (r: RichiestaTiroMondo) => EsitoTiroMondo; turno: number }): Debito[] & { falliti?: TiroFallito[] } {
    const out: Debito[] & { falliti?: TiroFallito[] } = [];
    const falliti: TiroFallito[] = [];
    for (const p of this.porte) {
      if (p.volte !== null && (this.aperture.get(p.chiave) ?? 0) >= p.volte) continue;
      if (!fatti.some((f) => apre(p, f))) continue;
      let tiro: EsitoTiroMondo | undefined;
      if (p.tiro && tira) {
        tiro = tira.tiro({ origine: p.chiave, motivo: `${p.orologio}: ${p.quando}`, turno: tira.turno, ...p.tiro });
        if (!tiro.riuscito) {
          falliti.push({ porta: p.chiave, orologio: p.orologio, quando: p.quando, tiro });
          continue;
        }
      }
      this.aperture.set(p.chiave, (this.aperture.get(p.chiave) ?? 0) + 1);
      out.push({ porta: p.chiave, orologio: p.orologio, segni: p.segni, quando: p.quando, ...(tiro ? { tiro } : {}) });
    }
    if (falliti.length) out.falliti = falliti;
    return out;
  }

  esporta(): Array<[string, number]> {
    return [...this.aperture];
  }

  importa(v: ReadonlyArray<[string, number]> | undefined): void {
    this.aperture.clear();
    for (const [k, n] of v ?? []) if (typeof k === 'string' && typeof n === 'number' && n > 0) this.aperture.set(k, Math.floor(n));
  }
}
