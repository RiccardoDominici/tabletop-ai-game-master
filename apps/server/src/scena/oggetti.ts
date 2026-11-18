/**
 * Who holds what (A22, docs/coerenza.md §1): the objects of the scenes' `elementi_interattivi` that have an id
 * (`ogg_…`), each with its holder now, a PC, an NPC, or nobody (in its place in its scene). Before, an object taken,
 * given or lost existed only in the transcript: the key Berta gave a PC could be «still at her neck» two turns later.
 *
 * A holder changes by a line's `effetti.oggetti` (mode B), the narrator's `[oggetto] ogg_x <chi>` (mode A, checked by
 * the Engine) or a new snapshot on resume. The ledger shows the objects someone holds, «Cosa è vero adesso» says them,
 * the snapshot keeps them, the session log lists where they ended. Pure state: the director decides and logs.
 */
import type { Campagna, DatiYaml } from '../campagna/tipi';

/** Back in its place (the scene it belongs to): the value of a change that empties the hands. */
export const AL_SUO_POSTO = 'scena';

export interface Oggetto {
  id: string;
  /** What it is (`cosa` of the sheet). */
  nome: string;
  /** The scene whose sheet lists it. */
  scena: string;
  /** Its holder at the start (`chi` of the sheet), or null: in its place. */
  iniziale: string | null;
}

/** The objects in a snapshot: id, holder (null = in its place), turn of the last change. */
export type OggettiSalvati = Array<[string, string | null, number]>;

export type EsitoOggetto = { ok: true; da: string | null } | { ok: false; motivo: string };

export class StatoOggetti {
  readonly definiti = new Map<string, Oggetto>();
  private readonly ora = new Map<string, { chi: string | null; turno: number }>();
  private readonly personaggi: ReadonlySet<string>;

  constructor(c: Campagna) {
    for (const s of c.scene) {
      for (const e of (s.dati['elementi_interattivi'] as DatiYaml[] | undefined) ?? []) {
        if (typeof e?.['id'] !== 'string' || this.definiti.has(e['id'])) continue;
        this.definiti.set(e['id'], { id: e['id'], nome: typeof e['cosa'] === 'string' ? e['cosa'] : e['id'], scena: s.id, iniziale: typeof e['chi'] === 'string' ? e['chi'] : null });
      }
    }
    this.personaggi = new Set([...c.pg.map((p) => p.id), ...c.png.map((p) => p.id)]);
  }

  /** Its holder now: a PC or NPC id, or null (in its place). */
  chi(id: string): string | null {
    const o = this.definiti.get(id);
    if (!o) return null;
    return this.ora.has(id) ? this.ora.get(id)!.chi : o.iniziale;
  }

  /**
   * A change of holder: `chi` a PC or NPC of the campaign, or AL_SUO_POSTO. Refused for an unknown object or holder;
   * a change to the holder it already has is accepted and changes nothing.
   */
  sposta(id: string, chi: string, turno: number): EsitoOggetto {
    if (!this.definiti.has(id)) return { ok: false, motivo: `unknown object ${id}` };
    const nuovo = chi === AL_SUO_POSTO ? null : chi;
    if (nuovo !== null && !this.personaggi.has(nuovo)) return { ok: false, motivo: `unknown holder ${chi}` };
    const da = this.chi(id);
    if (da !== nuovo) this.ora.set(id, { chi: nuovo, turno });
    return { ok: true, da };
  }

  /** Every object someone holds now, or that moved from its start: for the ledger and the session log. */
  tenuti(): Array<{ id: string; nome: string; chi: string | null; turno: number | null }> {
    return [...this.definiti.values()]
      .map((o) => ({ id: o.id, nome: o.nome, chi: this.chi(o.id), turno: this.ora.get(o.id)?.turno ?? null }))
      .filter((o) => o.chi !== null || o.turno !== null);
  }

  esporta(): OggettiSalvati {
    return [...this.ora].map(([id, v]) => [id, v.chi, v.turno]);
  }

  importa(x: OggettiSalvati | undefined): void {
    this.ora.clear();
    for (const [id, chi, turno] of x ?? []) if (this.definiti.has(id)) this.ora.set(id, { chi, turno });
  }
}
