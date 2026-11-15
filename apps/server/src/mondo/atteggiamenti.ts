/**
 * NPC attitudes in play (docs/mondo.md §4). Each NPC starts towards each PC from its card
 * (`atteggiamento_pg.<pg>.stato`); a change has a turn, a cause and, for the proposals of the narrator and the
 * checks, the Engine's limits (one step, one change per NPC per turn, no flip-flop of the same pair, at most
 * MAX_CAMBI_PER_TURNO a turn). Consequences and the Game Master set any state. Pure state: the director decides
 * who may propose and logs the outcome; the changes go into the snapshot and registro.yaml.
 */
import { STATI_ATTEGGIAMENTO, TUTTI_I_PG, type StatoAtteggiamento } from '../campagna/mondo';
import type { Campagna, DatiYaml } from '../campagna/tipi';

export type CausaAtteggiamento = 'conseguenza' | 'narratore' | 'prova' | 'master';

export interface CambioAtteggiamento {
  png: string;
  pg: string;
  da: StatoAtteggiamento | null;
  a: StatoAtteggiamento;
  turno: number;
  causa: CausaAtteggiamento;
  /** What caused it, for the log and the panel (a consequence id, a check, the narrator's line). */
  perche: string | null;
}

/** Changes proposed by the narrator or the checks, in total, per turn. */
export const MAX_CAMBI_PER_TURNO = 2;
/** The same NPC–PC pair does not change again (by proposal) within this many turns. */
export const PAUSA_COPPIA = 3;

export type EsitoProposta = { ok: true; cambi: CambioAtteggiamento[] } | { ok: false; motivo: string };

/** Position of a state on the scale ostile (0) – indifferente (1) – amichevole (2). */
const grado = (s: StatoAtteggiamento): number => STATI_ATTEGGIAMENTO.indexOf(s);

/** The attitude written in the NPC's card towards a PC, or null. */
export function atteggiamentoDellaScheda(dati: DatiYaml, pg: string): StatoAtteggiamento | null {
  const a = (dati['atteggiamento_pg'] as DatiYaml | undefined)?.[pg] as DatiYaml | undefined;
  const s = typeof a?.['stato'] === 'string' ? a['stato'].toLowerCase() : null;
  return s && (STATI_ATTEGGIAMENTO as readonly string[]).includes(s) ? (s as StatoAtteggiamento) : null;
}

export class AtteggiamentiInGioco {
  private readonly attuali = new Map<string, StatoAtteggiamento>();
  readonly cambi: CambioAtteggiamento[] = [];
  private readonly pg: string[];
  private readonly png: Set<string>;

  constructor(private readonly campagna: Campagna) {
    this.pg = campagna.pg.map((p) => p.id);
    this.png = new Set(campagna.png.map((p) => p.id));
  }

  private chiave(png: string, pg: string): string {
    return `${png}>${pg}`;
  }

  /** The attitude at the start of the session (the card), or null if the card does not say it. */
  base(png: string, pg: string): StatoAtteggiamento | null {
    const p = this.campagna.png.find((x) => x.id === png);
    return p ? atteggiamentoDellaScheda(p.dati, pg) : null;
  }

  /** The attitude now. */
  stato(png: string, pg: string): StatoAtteggiamento | null {
    return this.attuali.get(this.chiave(png, pg)) ?? this.base(png, pg);
  }

  /** The PCs a target names: one PC, or every PC for TUTTI_I_PG. */
  private bersagli(pg: string): string[] {
    return pg === TUTTI_I_PG ? [...this.pg] : this.pg.includes(pg) ? [pg] : [];
  }

  /**
   * A change without limits (a consequence, the Game Master). Pairs already in that state are skipped.
   * Returns the changes made.
   */
  imposta(png: string, pg: string, stato: StatoAtteggiamento, turno: number, causa: CausaAtteggiamento, perche: string | null = null): CambioAtteggiamento[] {
    if (!this.png.has(png)) return [];
    const out: CambioAtteggiamento[] = [];
    for (const x of this.bersagli(pg)) {
      const da = this.stato(png, x);
      if (da === stato) continue;
      this.attuali.set(this.chiave(png, x), stato);
      const c: CambioAtteggiamento = { png, pg: x, da, a: stato, turno, causa, perche };
      this.cambi.push(c);
      out.push(c);
    }
    return out;
  }

  /**
   * A change proposed by the narrator or a check: the Engine's limits apply (docs/mondo.md §4). `presenti`: the
   * NPCs in the scene now; `nonOstile`: never down to ostile (the checks).
   */
  proponi(
    png: string,
    pg: string,
    stato: StatoAtteggiamento,
    turno: number,
    causa: 'narratore' | 'prova',
    o: { presenti: ReadonlySet<string>; nonOstile?: boolean; perche?: string | null },
  ): EsitoProposta {
    if (!this.png.has(png)) return { ok: false, motivo: `unknown NPC ${png}` };
    if (!o.presenti.has(png)) return { ok: false, motivo: `${png} is not in the scene` };
    const bersagli = this.bersagli(pg);
    if (bersagli.length === 0) return { ok: false, motivo: `unknown PC ${pg}` };
    if (o.nonOstile && stato === 'ostile') return { ok: false, motivo: 'a check never makes an NPC hostile' };
    const delTurno = this.cambi.filter((c) => c.turno === turno && (c.causa === 'narratore' || c.causa === 'prova'));
    if (delTurno.some((c) => c.png === png)) return { ok: false, motivo: `${png} has already changed in this turn` };
    const daFare = bersagli.filter((x) => this.stato(png, x) !== stato);
    if (daFare.length === 0) return { ok: false, motivo: `${png} is already ${stato}` };
    if (delTurno.length + 1 > MAX_CAMBI_PER_TURNO) return { ok: false, motivo: `at most ${MAX_CAMBI_PER_TURNO} attitude changes per turn` };
    for (const x of daFare) {
      const da = this.stato(png, x);
      if (da !== null && Math.abs(grado(da) - grado(stato)) > 1) return { ok: false, motivo: `${png} towards ${x}: one step at a time (${da} → ${stato})` };
      const recente = [...this.cambi].reverse().find((c) => c.png === png && c.pg === x && c.causa !== 'conseguenza' && c.causa !== 'master');
      if (recente && turno - recente.turno < PAUSA_COPPIA) return { ok: false, motivo: `${png} towards ${x} changed at turn ${recente.turno}` };
    }
    return { ok: true, cambi: daFare.flatMap((x) => this.imposta(png, x, stato, turno, causa, o.perche ?? null)) };
  }

  /** One step up (+1) or down (−1) from the current attitude, or null at the end of the scale / unknown. */
  passo(png: string, pg: string, verso: 1 | -1): StatoAtteggiamento | null {
    const s = this.stato(png, pg) ?? 'indifferente';
    return STATI_ATTEGGIAMENTO[grado(s) + verso] ?? null;
  }

  esporta(): CambioAtteggiamento[] {
    return this.cambi.map((c) => ({ ...c }));
  }

  /** Resume: the changes are replayed in order (the last one for each pair wins). */
  importa(cambi: readonly CambioAtteggiamento[] | undefined): void {
    this.attuali.clear();
    this.cambi.length = 0;
    for (const c of cambi ?? []) {
      if (!this.png.has(c.png) || !this.pg.includes(c.pg) || !(STATI_ATTEGGIAMENTO as readonly string[]).includes(c.a)) continue;
      this.attuali.set(this.chiave(c.png, c.pg), c.a);
      this.cambi.push({ ...c });
    }
  }
}
