/**
 * Energy drain in play (audit P5-49, P6-21; Basic Fantasy pp. 58–59, «Energy Drain»): a wight's touch, a spectre's, a
 * vampire's. The manual's rule is «negative levels», not a lost level: each one costs
 * - one hit die of hit points, from the maximum and from the hit points now (the class's die at the character's level,
 *   or the bestiary's die for a monster), rolled by the Engine; at 0 hit points or less from drain the victim is slain;
 * - the set's `livelli_negativi.d20` on every d20 roll (attacks, saves, checks) and `percentuali` on every d100 threshold
 *   (the thief's abilities), read by the resolvers;
 * - one of the highest-level spell slots, for the day and for the rests after (prove/risorse.ts).
 * XP and level are untouched. Removing negative levels (a restoration spell) is the Game Master's for now.
 * Deterministic given the dice; kept in the session snapshot.
 */
import { testo } from '../lingua';
import type { Logger } from '../logger';
import { rigaDi } from '../regole/progressione';
import type { SchedaGenerica, SistemaRegole } from '../regole/tipi';
import type { FonteDadi } from './dadi';
import type { Risorse } from './risorse';
import type { StatoProve } from './stato';

export interface StatoDrenaggiSalvato {
  livelli: Array<[string, number]>;
}

export interface OpzioniDrenaggi {
  sistema: SistemaRegole;
  schede: ReadonlyMap<string, SchedaGenerica>;
  stato: StatoProve;
  risorse: Risorse | null;
  nome: (id: string) => string;
  log: Logger;
}

export class Drenaggi {
  private readonly livelli = new Map<string, number>();

  constructor(private readonly o: OpzioniDrenaggi) {}

  /** Whether the set says what a negative level costs: without it a drain does nothing. */
  get attivo(): boolean {
    return !!this.o.sistema.livelliNegativi;
  }

  /** The faces of one hit die of `sch`: its class's die at its level, else the bestiary's (a monster), else d8. */
  private facce(sch: SchedaGenerica): { facce: number; fissi: number } {
    const c = sch.classe ? (this.o.sistema.classi ?? []).find((x) => x.id === sch.classe) : undefined;
    const r = c ? rigaDi(c.progressione.dadiVita, sch.livello ?? 1) : null;
    if (r?.dado) return { facce: r.dado.facce, fissi: 0 };
    if (r && r.fissi) return { facce: 0, fissi: r.fissi };
    return { facce: this.o.sistema.bestiario?.dadoVita ?? 8, fissi: 0 };
  }

  /** `n` levels of energy drain on `id`: the maximum, the slot, the facts for the narrator; slain at 0 or less. */
  drena(id: string, n: number, dadi: FonteDadi, fatti: string[]): void {
    const sch = this.o.schede.get(id);
    if (!sch || !this.attivo || this.o.stato.fuoriGioco(id) === 'morto') return;
    let persi = 0;
    const slot: number[] = [];
    for (let i = 0; i < n; i++) {
      const d = this.facce(sch);
      const pf = d.facce ? dadi.tira(d.facce) : d.fissi;
      persi += pf;
      // A hit die of hit points lost, from the maximum and from the hit points now (drained to 0 or less: slain).
      this.o.stato.danneggia(id, pf);
      this.o.stato.riduciMassimi(id, pf);
      const l = this.o.risorse?.perdiSlot(id) ?? null;
      if (l) slot.push(l);
    }
    this.livelli.set(id, (this.livelli.get(id) ?? 0) + n);
    const p = this.o.stato.puntiFerita(id);
    const nome = this.o.nome(id);
    fatti.push(testo('prove.drenaggio.fatto', { nome, n, pf: persi, totale: this.livelli.get(id)!, slot: slot.length ? testo('prove.drenaggio.slot', { livelli: slot.join(', ') }) : '' }));
    this.o.log.info({ id, livelli: n, totale: this.livelli.get(id), pf_persi: persi, slot, pf: p }, 'drain: negative levels');
    if (p && (p.massimi <= 0 || p.attuali <= 0)) {
      // Slain outright, not dying: the death rule does not apply to a drain (p. 58).
      this.o.stato.danneggia(id, p.attuali);
      this.o.stato.segnaUscito(id, 'morto');
      fatti.push(testo('prove.drenaggio.morto', { nome }));
      this.o.log.info({ id }, 'drain: drained to 0, slain');
    }
  }

  /** The negative levels of `id`. */
  di(id: string): number {
    return this.livelli.get(id) ?? 0;
  }

  /** What they add to each d20 roll of `id` (−1 each in Basic Fantasy). */
  d20(id: string): number {
    return this.di(id) * (this.o.sistema.livelliNegativi?.d20 ?? 0);
  }

  /** What they add to each d100 threshold of `id` (−5 each). */
  percentuale(id: string): number {
    return this.di(id) * (this.o.sistema.livelliNegativi?.percentuali ?? 0);
  }

  azzera(): void {
    this.livelli.clear();
  }

  esporta(): StatoDrenaggiSalvato {
    return { livelli: [...this.livelli] };
  }

  importa(s: StatoDrenaggiSalvato | null | undefined): void {
    this.livelli.clear();
    for (const [id, n] of s?.livelli ?? []) if (this.o.schede.has(id) && Number.isInteger(n) && n > 0) this.livelli.set(id, n);
  }
}
