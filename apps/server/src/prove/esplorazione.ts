/**
 * Wandering monster checks on the game clock (docs/prove.md §14; docs/regole.md §2, «Esplorazione»; audit P8-01 to P8-03):
 * while the party is in a scene that says it explores an environment of the set (a dungeon level, a wilderness terrain),
 * the Engine counts the game time and, every `controllo.ogni`, makes the Game Master's hidden roll (1 on 1d6 in Basic
 * Fantasy). On a hit it rolls the scene's encounter table, the nested roll some entries have (a roc's size), how many
 * appear, and — where the environment says so — the creatures' surprise in advance. The result is a fact for the
 * narrator and a line for the panel; the creatures themselves join the scene through prove/vaganti.ts.
 *
 * Timing (decided here, so every caller behaves the same):
 * - the count starts when the party enters an environment (the clock's time before the advance that finds it there) and
 *   restarts on a change of environment; a scene that explores nothing stops it;
 * - a check that falls due during a fight waits for its end (the rounds are the fight's), then is rolled at once;
 * - an advance that spans several checks (a night's rest, a journey) rolls them in order and stops at the first hit:
 *   at most one encounter per advance, at the moment its check fell, and the next check counts from there.
 *
 * Deterministic: the Engine's dice only (the shadow pass of manual rolls copies them and this state, so it rolls the
 * same); nothing here asks a model.
 */
import type { Logger } from '../logger';
import { scriviFormula, type FormulaDadi } from '../campagna/regole-srd';
import { voceDelTiro, type CreaturaIncontro, type DoveEsplorazione } from '../regole/esplorazione';
import type { FonteDadi } from './dadi';

/** One die the Game Master rolled for exploration (the check, the table, the nested roll, the number, the surprise). */
export interface TiroEsplorazione {
  cosa: 'controllo' | 'tabella' | 'scelta' | 'numero' | 'sorpresa' | 'orientamento';
  /** Faces of each die and the dice themselves (a 2d8 table: two values). */
  facce: number;
  dadi: number[];
  totale: number;
  /** For the check and the surprise: whether it «happened» (an encounter; the creatures surprised). */
  riuscito: boolean | null;
}

/** An encounter the check produced: what the table gave, how many, when. */
export interface IncontroUscito {
  /** Its number in the session (1, 2…): the spawned creatures' ids carry it, so a resume finds them again. */
  n: number;
  /** Session seconds at which it happened (the check's moment). */
  quando: number;
  ambiente: string;
  tabella: string | null;
  /** The table's roll and the printed entry. */
  tiro: number | null;
  /** A bestiary entry and how many of it; null for a group without a stat block or an empty table. */
  mostro: string | null;
  quanti: number;
  /** A group without a stat block (NPC adventurers): its name, the Game Master builds it. */
  gruppo: string | null;
  /** Surprise in advance: the creatures were surprised (true), were not and may ambush (false), not rolled (null). */
  sorpresi: boolean | null;
  /** The range their ambush surprises on, when they were not surprised and the environment gives one. */
  imboscata: number | null;
}

export interface StatoEsplorazioneSalvato {
  /** The environment being counted and the session second of its next check. */
  programma: { ambiente: string; prossimo: number } | null;
  contatore: number;
  ultimo: IncontroUscito | null;
}

export interface OpzioniEsplorazione {
  dadi: () => FonteDadi;
  log: Logger;
}

const tira = (dadi: FonteDadi, f: FormulaDadi): { dadi: number[]; totale: number } => {
  const v = Array.from({ length: f.numero }, () => dadi.tira(f.facce));
  return { dadi: v, totale: v.reduce((a, b) => a + b, 0) + f.bonus };
};

export class Esplorazione {
  private programma: StatoEsplorazioneSalvato['programma'] = null;
  private contatore = 0;
  private ultimo: IncontroUscito | null = null;

  constructor(private readonly o: OpzioniEsplorazione) {}

  /**
   * The clock moved from `prima` to `adesso` (session seconds) with the party in `dove` (null: nothing explored here).
   * `fermo`: a fight is on, the checks due wait. Returns the Game Master's dice rolled and the encounter, if any.
   */
  passa(dove: DoveEsplorazione | null, prima: number, adesso: number, fermo: boolean): { tiri: TiroEsplorazione[]; incontro: IncontroUscito | null } {
    const c = dove?.ambiente.controllo ?? null;
    if (!dove || !c) {
      if (this.programma) this.o.log.info({ ambiente: this.programma.ambiente }, 'exploration: the party left the environment, no more checks');
      this.programma = null;
      return { tiri: [], incontro: null };
    }
    if (this.programma?.ambiente !== dove.ambiente.id) {
      this.programma = { ambiente: dove.ambiente.id, prossimo: prima + c.ogni };
      this.o.log.info({ ambiente: dove.ambiente.id, tabella: dove.tabella?.id ?? null, prossimo: this.programma.prossimo }, 'exploration: the party is in an environment, wandering checks counted from now');
    }
    const tiri: TiroEsplorazione[] = [];
    if (fermo) return { tiri, incontro: null };
    const dadi = this.o.dadi();
    while (this.programma.prossimo <= adesso) {
      const quando = this.programma.prossimo;
      const v = dadi.tira(c.dado);
      const si = v <= c.finoA;
      tiri.push({ cosa: 'controllo', facce: c.dado, dadi: [v], totale: v, riuscito: si });
      this.programma.prossimo = quando + c.ogni;
      this.o.log.info({ ambiente: dove.ambiente.id, quando, dado: `d${c.dado}`, valore: v, fino_a: c.finoA, incontro: si }, 'exploration: wandering monster check (Game Master roll)');
      if (si) return { tiri, incontro: this.incontro(dove, quando, tiri) };
    }
    return { tiri, incontro: null };
  }

  /**
   * The Game Master rolls an encounter now, without a check (the panel's «Tira un incontro»: a town's table, which the
   * manual gives no frequency for, or a planned meeting): the table, the nested roll, how many, the surprise in advance.
   */
  incontroDelMaster(dove: DoveEsplorazione, adesso: number): { tiri: TiroEsplorazione[]; incontro: IncontroUscito } {
    const tiri: TiroEsplorazione[] = [];
    const incontro = this.incontro(dove, adesso, tiri);
    this.o.log.info({ ambiente: dove.ambiente.id, tabella: dove.tabella?.id ?? null }, 'exploration: the Game Master rolls an encounter from the panel');
    return { tiri, incontro };
  }

  /** The table's roll, the nested roll, how many, the surprise in advance. */
  private incontro(dove: DoveEsplorazione, quando: number, tiri: TiroEsplorazione[]): IncontroUscito {
    const dadi = this.o.dadi();
    const t = dove.tabella;
    const out: IncontroUscito = { n: ++this.contatore, quando, ambiente: dove.ambiente.id, tabella: t?.id ?? null, tiro: null, mostro: null, quanti: 0, gruppo: null, sorpresi: null, imboscata: null };
    if (t) {
      const r = tira(dadi, t.dadi);
      tiri.push({ cosa: 'tabella', facce: t.dadi.facce, dadi: r.dadi, totale: r.totale, riuscito: null });
      out.tiro = r.totale;
      const voce = voceDelTiro(t, r.totale);
      let c: CreaturaIncontro | null = voce?.creatura ?? null;
      if (voce?.scelta) {
        const s = tira(dadi, voce.scelta.dadi);
        tiri.push({ cosa: 'scelta', facce: voce.scelta.dadi.facce, dadi: s.dadi, totale: s.totale, riuscito: null });
        c = voce.scelta.voci.find((x) => x.tiri.includes(s.totale)) ?? null;
      }
      const numero = c?.numero ?? voce?.gruppo?.numero ?? null;
      if (numero && numero.numero > 0) {
        const q = tira(dadi, numero);
        tiri.push({ cosa: 'numero', facce: numero.facce, dadi: q.dadi, totale: q.totale, riuscito: null });
        out.quanti = Math.max(1, q.totale);
      } else out.quanti = Math.max(1, numero?.bonus ?? 1);
      if (c) out.mostro = c.mostro;
      else if (voce?.gruppo) out.gruppo = voce.gruppo.nome;
      this.o.log.info({ tabella: t.id, tiro: r.totale, manuale: voce?.manuale ?? null, mostro: out.mostro, gruppo: out.gruppo, quanti: out.quanti, formula: numero ? scriviFormula(numero) : null }, 'exploration: the encounter table rolled');
    }
    const s = dove.ambiente.sorpresaPrima;
    if (s && out.mostro) {
      const v = dadi.tira(s.dado);
      out.sorpresi = v <= s.finoA;
      out.imboscata = out.sorpresi ? null : s.imboscata;
      tiri.push({ cosa: 'sorpresa', facce: s.dado, dadi: [v], totale: v, riuscito: out.sorpresi });
      this.o.log.info({ valore: v, fino_a: s.finoA, sorpresi: out.sorpresi, imboscata: out.imboscata }, 'exploration: the creatures\' surprise checked in advance');
    }
    this.ultimo = out;
    return out;
  }

  /** The schedule for the panel: the environment, the seconds to the next check (0 = due), its odds. Null when idle. */
  prossimo(dove: DoveEsplorazione | null, adesso: number): { ambiente: string; tra: number; ogni: number; dado: number; finoA: number } | null {
    const c = dove?.ambiente.controllo;
    if (!dove || !c) return null;
    // Not yet counted (the party just arrived): the first check is one interval away.
    const prossimo = this.programma?.ambiente === dove.ambiente.id ? this.programma.prossimo : adesso + c.ogni;
    return { ambiente: dove.ambiente.id, tra: Math.max(0, prossimo - adesso), ogni: c.ogni, dado: c.dado, finoA: c.finoA };
  }

  /** The last encounter of the session (the panel's line). */
  get ultimoIncontro(): IncontroUscito | null {
    return this.ultimo;
  }

  azzera(): void {
    this.programma = null;
    this.contatore = 0;
    this.ultimo = null;
  }

  esporta(): StatoEsplorazioneSalvato {
    return { programma: this.programma ? { ...this.programma } : null, contatore: this.contatore, ultimo: this.ultimo ? { ...this.ultimo } : null };
  }

  importa(s: StatoEsplorazioneSalvato | null | undefined): void {
    this.azzera();
    if (!s) return;
    const p = s.programma;
    if (p && typeof p.ambiente === 'string' && Number.isFinite(p.prossimo)) this.programma = { ambiente: p.ambiente, prossimo: p.prossimo };
    if (Number.isInteger(s.contatore) && s.contatore >= 0) this.contatore = s.contatore;
    if (s.ultimo && typeof s.ultimo === 'object' && Number.isInteger(s.ultimo.n)) this.ultimo = { ...s.ultimo };
  }
}
