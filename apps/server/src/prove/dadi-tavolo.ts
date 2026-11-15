/**
 * The players' own dice for one pass of a turn (docs/prove.md §8, «Manual rolls»).
 *
 * Every die the rules give a PC is drawn through a GROUP of this table, never straight from the Engine's dice: the
 * action's own test, the damage of a hit, the second PC's die in a contest, initiative, a death saving throw. A group
 * is one request at the table («Corrado, tira i danni»). NPC rolls, side rolls (surprise, initiative by sides), morale
 * and the Game Master's own rolls stay the Engine's and never pass here.
 *
 * Two uses, same code path as the real resolution (one source of truth per rule set):
 * - **dry run** (`anteprima`): the turn is resolved on a throwaway copy of the Engine with the values entered so far.
 *   A group with no value gets placeholder 1s and is recorded as missing; it can be asked now when no missing roll it
 *   may depend on comes before it (the damage waits for the attack roll of the same PC and action; the fight's rolls,
 *   initiative and death saves, wait for everything before them). The director asks the askable ones, waits, and runs
 *   the dry run again, until nothing is missing: attack → damage → initiative → death saves, as at a real table.
 * - **real pass**: the values entered are served by group key, so a player's die can never land on another roll; a
 *   group with no value (automatic rolls, a request switched to the Engine) uses the Engine's dice.
 *
 * Keys are the request ids: `r_<action>` for the action's test (as before), `r_<action>_danno`, `r_<action>_<pg>` for
 * the second PC in a contest, `r_t<turn>_<per>_<pg>_<n>` for the fight's rolls (n counts within the pass).
 */
import type { PerTiro } from '@tabletop-ai-gm/shared';
import type { Logger } from '../logger';
import type { FonteDadi } from './dadi';
import { DadiDelGiocatore } from './dadi-giocatore';
import type { TiroInserito } from './richieste';

/** What a group of a PC's dice is for: the action's own test, or a follow-up. */
export type PerGruppo = 'prova' | PerTiro;

/** Who a group of dice belongs to and what it is for, as the resolvers and the fight say it when they roll for a PC. */
export interface GruppoDadi {
  pg: string;
  per: PerGruppo;
  /** The action the roll belongs to; null for the fight's own rolls (initiative, death saves). */
  azione: string | null;
  /** A private action's follow-ups stay on its player's phone, never in the narrator's voice. */
  privata: boolean;
  /** What a follow-up request says («Danni: Spada lunga»); the action's test takes it from its card. */
  etichetta?: string;
  /** The bonus added to the dice of a follow-up (damage bonus, initiative modifier, the other PC's skill). */
  modificatore?: number;
  /** A number to beat that the rules make public (a death save's fixed DC), for the Game Master panel. */
  contro?: number;
  /** The fight's round of an initiative roll: the initiative rolls of one round are asked together. */
  giro?: number;
}

/** The dice of the PCs for one pass: a source per group. */
export interface DadiDeiPg {
  fonte(g: GruppoDadi): FonteDadi;
}

/** A group that drew at least one die in this pass. */
export interface GruppoRegistrato {
  /** The request id. */
  chiave: string;
  gruppo: GruppoDadi;
  /** Faces of each die drawn, in order. */
  facce: number[];
  /** The value entered for it, if any (null valori = switched to the Engine's dice). */
  inserito: TiroInserito | null;
  /** No value was entered: in the dry run, a request to make. */
  mancante: boolean;
  /** It can be asked now: no missing roll before it that it may depend on. */
  chiedibile: boolean;
}

export interface OpzioniDadiAlTavolo {
  /** The Engine's dice of this pass (a copy in the dry run). */
  base: FonteDadi;
  turno: number;
  /** Values entered so far, by request id. */
  inseriti: ReadonlyMap<string, TiroInserito>;
  /** Dry run: a missing player's die is a placeholder 1, never the Engine's. */
  anteprima: boolean;
  log: Logger;
}

const fase = (r: GruppoRegistrato): 'azione' | 'scontro' => (r.gruppo.azione === null ? 'scontro' : 'azione');

/**
 * Whether the missing roll `h`, earlier in the pass, may change whether or how `g` is rolled. An action's test and its
 * damage are one chain per PC; the other actions' rolls are rolled together (a target already down only leaves an
 * entered value unused). The fight's rolls depend on everything before them, except that one round's initiative rolls
 * are rolled together.
 */
function dipende(g: GruppoRegistrato, h: GruppoRegistrato): boolean {
  if (fase(h) === 'scontro' || fase(g) === 'scontro') {
    return !(h.gruppo.per === 'iniziativa' && g.gruppo.per === 'iniziativa' && h.gruppo.giro === g.gruppo.giro);
  }
  return h.gruppo.azione === g.gruppo.azione && h.gruppo.pg === g.gruppo.pg;
}

export class DadiAlTavolo implements DadiDeiPg {
  /** Groups in the order of their first die. */
  readonly gruppi: GruppoRegistrato[] = [];
  private readonly delleAzioni = new Map<string, FonteDadi>();
  private readonly contatori = new Map<string, number>();

  constructor(private readonly o: OpzioniDadiAlTavolo) {}

  /** The request id of a group (see the module comment). */
  private chiave(g: GruppoDadi): string {
    if (g.azione !== null) {
      if (g.per === 'prova') return `r_${g.azione}`;
      if (g.per === 'contesa') return `r_${g.azione}_${g.pg}`;
      return `r_${g.azione}_${g.per}`;
    }
    const k = `${g.per}:${g.pg}`;
    const n = this.contatori.get(k) ?? 0;
    this.contatori.set(k, n + 1);
    return `r_t${this.o.turno}_${g.per}_${g.pg}_${n}`;
  }

  fonte(g: GruppoDadi): FonteDadi {
    // An action's group is one roll: asked again in the same pass, it is the same source (and the same dice).
    const giaAzione = g.azione !== null ? this.delleAzioni.get(this.chiave(g)) : undefined;
    if (giaAzione) return giaAzione;
    const chiave = this.chiave(g);
    const inserito = this.o.inseriti.get(chiave) ?? null;
    const reg: GruppoRegistrato = { chiave, gruppo: g, facce: [], inserito, mancante: false, chiedibile: false };
    const base = this.o.base;
    const coda = inserito?.valori ? new DadiDelGiocatore(base, inserito.richiesta.facce, inserito.valori, this.o.log, inserito.richiesta.etichetta) : null;
    const tavolo = this;
    const fonte: FonteDadi = {
      get seme() {
        return base.seme;
      },
      get contatore() {
        return base.contatore;
      },
      tira(facce: number): number {
        if (!reg.facce.length) tavolo.registra(reg);
        reg.facce.push(facce);
        if (coda) return coda.tira(facce);
        if (inserito) return base.tira(facce); // switched to the Engine's dice
        if (tavolo.o.anteprima) return 1; // a placeholder: the dry run never draws a player's die from the Engine
        return base.tira(facce); // real pass with no value: automatic rolls (the Engine logs it in manual mode)
      },
    };
    if (g.azione !== null) this.delleAzioni.set(chiave, fonte);
    return fonte;
  }

  /** The group's first die: its place in the pass, and whether it can be asked now. */
  private registra(reg: GruppoRegistrato): void {
    reg.mancante = reg.inserito === null;
    if (reg.mancante) reg.chiedibile = !this.gruppi.some((h) => h.mancante && dipende(reg, h));
    this.gruppi.push(reg);
  }

  /** Values entered by the players that no group of this pass used (the shape changed: a target already down). */
  nonUsati(): string[] {
    const usati = new Set(this.gruppi.map((g) => g.chiave));
    return [...this.o.inseriti.keys()].filter((k) => !usati.has(k));
  }
}
