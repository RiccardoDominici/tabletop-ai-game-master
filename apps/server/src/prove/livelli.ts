/**
 * Levels in the Engine (mechanism M1 of docs/regole-audit/; docs/prove.md §12): each PC's level and maximum hit points
 * as the session package says (`pg_all_inizio.<pg>.livello`, `pf_massimi`), and the level-up's hit points still to roll
 * (`pf_da_tirare`: the levels gained between sessions, strumenti/tra_sessioni.py). At the session's first closed window
 * the PC rolls them — the class's hit die with the characteristic's bonus (at least the set's minimum), or the fixed
 * points after name level (regole/progressione.ts) — with its own dice (manual rolls: the phone asks; automatic: the
 * Engine), and its maximum and current hit points grow by that. The new level's numbers (attack bonus, thief values,
 * saves, spells per day) come from the class tables at once: regole/schede.ts derivaAbilita, prove/risorse.ts.
 * Saved in the snapshot, so a resume or the manual-roll dry run never asks the die twice.
 */
import { testo } from '../lingua';
import type { Logger } from '../logger';
import { puntiFeritaDelLivello } from '../regole/progressione';
import { derivaAbilita, trattiDi, valoreCaratteristica } from '../regole/schede';
import type { SchedaGenerica, SistemaRegole } from '../regole/tipi';
import type { StatoPg } from '../sessione/stato-pg';
import type { FonteDadi } from './dadi';
import type { DadiDeiPg } from './dadi-tavolo';
import type { StatoProve } from './stato';

export interface StatoLivelliSalvato {
  pg: Array<[string, { livello: number; pfMassimi: number; daTirare: number[] }]>;
}

export interface OpzioniLivelli {
  sistema: SistemaRegole;
  /** The Engine's live sheets: their level and maximum hit points change here. */
  schede: ReadonlyMap<string, SchedaGenerica>;
  stato: StatoProve;
  /** The sheets as loaded: «Ricomincia» puts the level and the maximum back before the package is applied again. */
  originali: ReadonlyMap<string, SchedaGenerica>;
  nome: (id: string) => string;
  log: Logger;
}

/** What a level-up's roll gave, for the narrator and the tests. */
export interface PuntiDelLivello {
  id: string;
  livello: number;
  dado: number | null;
  valore: number | null;
  guadagno: number;
}

export class Livelli {
  /** PC id → the levels whose hit points are still to roll, lowest first. */
  private readonly daTirare = new Map<string, number[]>();

  constructor(private readonly o: OpzioniLivelli) {}

  /** Whether the set has progression: otherwise nothing is tracked, exported or rolled. */
  get attivo(): boolean {
    return (this.o.sistema.classi ?? []).some((c) => c.progressione.dadiVita.length || c.progressione.px.length);
  }

  private pg(): SchedaGenerica[] {
    return [...this.o.schede.values()].filter((s) => !s.di_png);
  }

  /**
   * The package's level and maximum hit points for `id`, and the levels still to roll. Returns the level the PC had
   * before a level-up still to roll (for the slots it gains today), or null.
   */
  inizia(id: string, s: Pick<StatoPg, 'livello' | 'pf_massimi' | 'pf_da_tirare'>): number | null {
    const sch = this.o.schede.get(id);
    if (!sch || sch.di_png) return null;
    if (s.livello !== undefined && s.livello !== sch.livello) this.cambiaLivello(sch, s.livello);
    if (s.pf_massimi !== undefined && s.pf_massimi > 0) sch.pf_massimi = s.pf_massimi;
    const tirare = (s.pf_da_tirare ?? []).filter((l) => Number.isInteger(l) && l > 1 && l <= (sch.livello ?? 1)).sort((a, b) => a - b);
    if (tirare.length) this.daTirare.set(id, tirare);
    else this.daTirare.delete(id);
    this.o.log.info({ id, livello: sch.livello ?? null, pf_massimi: sch.pf_massimi, da_tirare: tirare }, 'levels: the PC starts at the package\'s level');
    // Only a level-up of this session start (hit points owed) gains slots today: otherwise the package's counters are
    // already the counters of its level (the log wrote them).
    return tirare.length ? Math.min(...tirare) - 1 : null;
  }

  /** The sheet's new level: the class tables give its numbers again (the overrides it writes stay). */
  private cambiaLivello(sch: SchedaGenerica, livello: number): void {
    sch.livello = livello;
    for (const x of derivaAbilita(this.o.sistema, sch)) this.o.log.info({ id: sch.id, abilita: x.id, scritto: x.scritto, tabella: x.tabella }, 'levels: a hand-written ability stays over the table');
  }

  /** The PCs with a level-up's hit points still to roll. */
  inAttesa(): string[] {
    return [...this.daTirare.keys()];
  }

  /**
   * Roll the hit points still owed (the session's first closed window): each with the PC's own dice through the pass's
   * table (`tavolo`: the phone asks with manual rolls), else the Engine's `dadi`. Returns the facts for the narrator.
   */
  tira(tavolo: DadiDeiPg | null, dadi: FonteDadi): { fatti: string[]; tiri: PuntiDelLivello[] } {
    const fatti: string[] = [];
    const tiri: PuntiDelLivello[] = [];
    for (const [id, livelli] of [...this.daTirare]) {
      const sch = this.o.schede.get(id);
      const classe = sch?.classe ? (this.o.sistema.classi ?? []).find((c) => c.id === sch.classe) : undefined;
      this.daTirare.delete(id);
      if (!sch || !classe) continue;
      const car = this.o.sistema.progressione?.puntiFerita.caratteristica ?? null;
      const bonus = car ? valoreCaratteristica(this.o.sistema, sch, car) : 0;
      let totale = 0;
      const dettagli: string[] = [];
      for (const l of livelli) {
        const x = puntiFeritaDelLivello(this.o.sistema.progressione, classe.progressione, l, bonus, trattiDi(this.o.sistema, sch));
        if (!x) continue;
        let guadagno = x.fissi;
        let valore: number | null = null;
        if (x.dado) {
          const etichetta = testo('prove.livelli.etichetta', { livello: l });
          const f = tavolo?.fonte({ pg: id, per: 'punti_ferita', azione: `lv_${id}_${l}`, privata: false, etichetta, modificatore: x.bonus }) ?? dadi;
          valore = f.tira(x.dado.facce);
          guadagno = Math.max(x.minimo, valore + x.bonus);
          dettagli.push(testo('prove.livelli.dado', { livello: l, dado: `1d${x.dado.facce}`, valore, bonus: x.bonus ? ` ${x.bonus > 0 ? '+' : '−'}${Math.abs(x.bonus)}` : '', guadagno }));
        } else dettagli.push(testo('prove.livelli.fissi', { livello: l, guadagno }));
        totale += guadagno;
        tiri.push({ id, livello: l, dado: x.dado?.facce ?? null, valore, guadagno });
      }
      sch.pf_massimi += totale;
      this.o.stato.cura(id, totale);
      const p = this.o.stato.puntiFerita(id);
      fatti.push(testo('prove.livelli.sale', { nome: this.o.nome(id), livello: sch.livello ?? 1, dettagli: dettagli.join('; '), guadagno: totale, massimi: p?.massimi ?? sch.pf_massimi }));
      this.o.log.info({ id, livelli, tiri: tiri.filter((t) => t.id === id), pf_massimi: sch.pf_massimi }, 'levels: the level-up\'s hit points rolled');
    }
    return { fatti, tiri };
  }

  /** «Ricomincia»: every PC back to its sheet's level and maximum (the package is applied again after). */
  azzera(): void {
    this.daTirare.clear();
    for (const sch of this.pg()) {
      const o = this.o.originali.get(sch.id);
      if (!o) continue;
      sch.pf_massimi = o.pf_massimi;
      if ((o.livello ?? null) !== (sch.livello ?? null)) {
        sch.livello = o.livello ?? null;
        derivaAbilita(this.o.sistema, sch);
      }
    }
  }

  esporta(): StatoLivelliSalvato {
    return { pg: this.pg().map((s) => [s.id, { livello: s.livello ?? 1, pfMassimi: s.pf_massimi, daTirare: [...(this.daTirare.get(s.id) ?? [])] }]) };
  }

  /** A resume: the levels, maximum hit points and owed rolls as saved (before the hit points are read back). */
  importa(s: StatoLivelliSalvato | null | undefined): void {
    if (!s) return;
    this.daTirare.clear();
    for (const [id, x] of s.pg ?? []) {
      const sch = this.o.schede.get(id);
      if (!sch || sch.di_png || !x) continue;
      if (Number.isInteger(x.livello) && x.livello !== sch.livello) this.cambiaLivello(sch, x.livello);
      if (Number.isInteger(x.pfMassimi) && x.pfMassimi > 0) sch.pf_massimi = x.pfMassimi;
      if (Array.isArray(x.daTirare) && x.daTirare.length) this.daTirare.set(id, [...x.daTirare]);
    }
  }
}
