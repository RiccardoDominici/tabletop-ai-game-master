/**
 * What the answer revealed, in mode A (improvised narration, A16): `[indizio] i_x`, `[menzogna] <mente_su id>`,
 * `[fatto] f_x` from the narrator, checked by the Engine like `[orologio]`. In mode B the lines carry these effects
 * (`effetti.rivela_indizi`, `menzogna_detta`, `fatti_noti`); in mode A the Engine had no ids, so the end-of-session log
 * (sessione/registro.ts) had null sections for clues, lies and known facts, and a campaign over several sessions was
 * prepared again from clocks and the transcript alone. Pure state: the director proposes, logs and saves it.
 *
 * The checks, generic: a clue exists and belongs to the scene in play (or to a campaign node), a lie is a `mente_su`
 * of an NPC present in the scene, a fact is in the canon and not already known to the PCs; each id once.
 */
import { indiziCampagna } from '../campagna/indizi';
import type { Campagna, DatiYaml } from '../campagna/tipi';

export type CosaMarcata = 'indizio' | 'menzogna' | 'fatto';

/** The marks in a snapshot: id → turn, per kind. */
export interface MarcheSalvate {
  indizi: Array<[string, number]>;
  menzogne: Array<[string, number]>;
  fatti_noti: Array<[string, number]>;
}

export type EsitoMarca = { ok: true } | { ok: false; motivo: string };

export class MarcheRivelate {
  readonly indizi = new Map<string, number>();
  readonly menzogne = new Map<string, number>();
  readonly fattiNoti = new Map<string, number>();
  private readonly defIndizi: ReturnType<typeof indiziCampagna>;
  /** Lie id (`mente_su[].id`) → the NPC who tells it. */
  private readonly bugie = new Map<string, string>();
  /** Canon fact id → already known to the PCs (`noto_ai_pg`). */
  private readonly canone = new Map<string, boolean>();

  constructor(c: Campagna) {
    this.defIndizi = indiziCampagna(c);
    for (const p of c.png) {
      for (const m of (p.dati['mente_su'] as DatiYaml[] | undefined) ?? []) if (typeof m?.['id'] === 'string') this.bugie.set(m['id'], p.id);
    }
    for (const f of (c.campagnaNarratore['canone'] as DatiYaml[] | undefined) ?? []) {
      if (typeof f?.['id'] === 'string') this.canone.set(f['id'], f['noto_ai_pg'] === true);
    }
  }

  private mappa(cosa: CosaMarcata): Map<string, number> {
    return cosa === 'indizio' ? this.indizi : cosa === 'menzogna' ? this.menzogne : this.fattiNoti;
  }

  /** A mark the narrator proposed: accepted (and recorded at `turno`) or refused with why. */
  proponi(cosa: CosaMarcata, id: string, turno: number, o: { scena: string; presenti: ReadonlySet<string> }): EsitoMarca {
    const m = this.mappa(cosa);
    if (m.has(id)) return { ok: false, motivo: `${id} already marked at turn ${m.get(id)}` };
    if (cosa === 'indizio') {
      const d = this.defIndizi.get(id);
      if (!d) return { ok: false, motivo: `unknown clue ${id}` };
      if (d.scena !== null && d.scena !== o.scena) return { ok: false, motivo: `${id} belongs to ${d.scena}, not to the scene in play` };
    } else if (cosa === 'menzogna') {
      const chi = this.bugie.get(id);
      if (!chi) return { ok: false, motivo: `unknown lie ${id} (not a mente_su id)` };
      if (!o.presenti.has(chi)) return { ok: false, motivo: `${chi}, who tells ${id}, is not in the scene` };
    } else {
      if (!this.canone.has(id)) return { ok: false, motivo: `unknown canon fact ${id}` };
      if (this.canone.get(id)) return { ok: false, motivo: `${id} is known to the PCs from the start` };
    }
    m.set(id, turno);
    return { ok: true };
  }

  esporta(): MarcheSalvate {
    return { indizi: [...this.indizi], menzogne: [...this.menzogne], fatti_noti: [...this.fattiNoti] };
  }

  importa(x: MarcheSalvate | undefined): void {
    for (const m of [this.indizi, this.menzogne, this.fattiNoti]) m.clear();
    for (const [id, t] of x?.indizi ?? []) this.indizi.set(id, t);
    for (const [id, t] of x?.menzogne ?? []) this.menzogne.set(id, t);
    for (const [id, t] of x?.fatti_noti ?? []) this.fattiNoti.set(id, t);
  }
}
