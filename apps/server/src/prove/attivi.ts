/**
 * Timed effects in the Engine state (docs/regole.md §2, «Effetti tipati»; docs/prove.md §10): the conditions, bonuses
 * and immunities a power, a trap or a potion gives (prove/effetti.ts), with their duration. They live outside the
 * fight's own conditions, so a sleeping guard stays asleep when the fight ends and a charmed one stays charmed for the
 * scene; the fight reads them as its own (prove/combattimento.ts, `condizioniEsterne`).
 *
 * Durations: rounds tick on the game clock (prove/tempo.ts): each new round of a fight, and what each closed window
 * outside one costs (a turn exploring = 60 rounds in Basic Fantasy); a duration in turns or hours is turned into rounds
 * when it is given; `scena` ends at the scene change, `riposo` at the next rest, `permanente` only when the Game Master
 * removes it. A condition with `finisce_se_ferito` ends when its bearer takes damage (sleep).
 * Saved in the session snapshot.
 */
import { testo } from '../lingua';
import type { BersaglioBonus, Durata, EffettoTipato } from '../regole/effetti';
import type { FonteDadi } from './dadi';
import { danno as tiraDanno } from './regole';

export interface EffettoAttivo {
  /** The power or hazard that gave it («Sonno», «Scudo»). */
  fonte: string;
  tipo: 'condizione' | 'bonus' | 'immunita';
  condizione?: string;
  a?: BersaglioBonus;
  valore?: number;
  contro?: 'tutti' | 'mischia' | 'distanza';
  immunita?: string[];
  /** Rounds left (`fine: round`); null for the other durations. */
  restanti: number | null;
  fine: 'round' | 'scena' | 'riposo' | 'permanente';
  finisceSeFerito?: boolean;
}

export interface StatoAttiviSalvato {
  attivi: Array<[string, EffettoAttivo[]]>;
}

/** What ended, for the narrator: who, the condition or bonus's name, from what. */
export interface Scaduto {
  id: string;
  cosa: string;
  fonte: string;
}

export interface OpzioniAttivi {
  /** A condition's name in the set (combattimento.condizioni); its id if unknown. */
  nomeCondizione: (id: string) => string;
  nome: (id: string) => string;
  /** The bearer is immune to that condition by its sheet or race (regole/tratti.ts); absent = never. */
  immuneDiScheda?: (id: string, cosa: string) => boolean;
  /** How many rounds one of a clock unit is (the set's `tempo`: a turn is 60 rounds); null = no such unit (scene-long). */
  roundPerUnita?: (unita: string) => number | null;
}

export class Attivi {
  private readonly m = new Map<string, EffettoAttivo[]>();

  constructor(private readonly o: OpzioniAttivi) {}

  private di(id: string): EffettoAttivo[] {
    return this.m.get(id) ?? [];
  }

  /** How many rounds a duration lasts at a caster level (rolled now), or its kind. */
  private durata(d: Durata, livello: number, dadi: FonteDadi): { fine: EffettoAttivo['fine']; restanti: number | null } {
    if (d.tipo === 'round') {
      const base = d.dadi.numero ? tiraDanno(dadi, d.dadi, 0, false).totale : d.dadi.bonus;
      return { fine: 'round', restanti: Math.max(1, base + d.perLivello * Math.max(1, livello)) };
    }
    // In units of the game clock (hold person: 2d8 turns): rounds by the set's `tempo`; without that unit, the scene.
    if (d.tipo === 'tempo') {
      const per = this.o.roundPerUnita?.(d.unita) ?? null;
      if (per === null) return { fine: 'scena', restanti: null };
      const n = d.dadi.numero ? tiraDanno(dadi, d.dadi, 0, false).totale : d.dadi.bonus;
      return { fine: 'round', restanti: Math.max(1, Math.round(n * per)) };
    }
    return { fine: d.tipo === 'istantanea' ? 'round' : d.tipo, restanti: d.tipo === 'istantanea' ? 1 : null };
  }

  /**
   * Give a timed effect to `id`. Returns the fact for the narrator, or null when the bearer is immune (then the fact
   * says so). A new copy of the same condition from the same source replaces the old one.
   */
  aggiungi(id: string, e: Extract<EffettoTipato, { tipo: 'condizione' | 'bonus' | 'immunita' }>, fonte: string, livello: number, dadi: FonteDadi): string | null {
    const { fine, restanti } = this.durata(e.durata, livello, dadi);
    const quanto = restanti !== null ? testo('prove.attivi.per_round', { n: restanti }) : testo(`prove.attivi.fino_${fine}`);
    if (e.tipo === 'condizione') {
      if (this.immune(id, e.condizione) || this.o.immuneDiScheda?.(id, e.condizione)) return testo('prove.attivi.immune', { nome: this.o.nome(id), cosa: this.o.nomeCondizione(e.condizione).toLowerCase() });
      const resto = this.di(id).filter((x) => !(x.tipo === 'condizione' && x.condizione === e.condizione));
      this.m.set(id, [...resto, { fonte, tipo: 'condizione', condizione: e.condizione, restanti, fine, ...(e.finisceSeFerito ? { finisceSeFerito: true } : {}) }]);
      return testo('prove.attivi.condizione', { nome: this.o.nome(id), condizione: this.o.nomeCondizione(e.condizione).toLowerCase(), quanto });
    }
    if (e.tipo === 'bonus') {
      this.m.set(id, [...this.di(id), { fonte, tipo: 'bonus', a: e.a, valore: e.valore, contro: e.contro, restanti, fine }]);
      return testo('prove.attivi.bonus', { nome: this.o.nome(id), valore: e.valore > 0 ? `+${e.valore}` : `−${-e.valore}`, a: testo(`prove.attivi.a_${e.a}`), contro: e.contro === 'tutti' ? '' : testo(`prove.attivi.contro_${e.contro}`), quanto });
    }
    this.m.set(id, [...this.di(id), { fonte, tipo: 'immunita', immunita: [...e.a], restanti, fine }]);
    return testo('prove.attivi.immunita', { nome: this.o.nome(id), fonte, quanto });
  }

  /** The ids of the conditions active on `id` (for the fight and the resolvers). */
  condizioni(id: string): string[] {
    return this.di(id).flatMap((x) => (x.tipo === 'condizione' && x.condizione ? [x.condizione] : []));
  }

  /** The sum of the active bonuses of `id` to `a` (against `contro`: a bonus «contro mischia» counts only there). */
  bonus(id: string, a: BersaglioBonus, contro: 'mischia' | 'distanza' | null = null): number {
    return this.di(id).reduce((s, x) => (x.tipo === 'bonus' && x.a === a && (x.contro === 'tutti' || x.contro === contro) ? s + (x.valore ?? 0) : s), 0);
  }

  /** Immune to a power or a condition by an active effect (Shield against magic missiles). */
  immune(id: string, cosa: string): boolean {
    return this.di(id).some((x) => x.tipo === 'immunita' && x.immunita?.includes(cosa));
  }

  /** `id` took damage: the conditions that end on injury end. Returns their names. */
  ferito(id: string): string[] {
    const finite = this.di(id).filter((x) => x.finisceSeFerito);
    if (!finite.length) return [];
    this.m.set(id, this.di(id).filter((x) => !x.finisceSeFerito));
    return finite.map((x) => this.o.nomeCondizione(x.condizione ?? ''));
  }

  /** The Game Master or a rule removes a condition. True if there was one. */
  togli(id: string, condizione: string): boolean {
    const prima = this.di(id).length;
    this.m.set(id, this.di(id).filter((x) => !(x.tipo === 'condizione' && x.condizione === condizione)));
    return this.di(id).length !== prima;
  }

  private finisci(filtro: (x: EffettoAttivo) => boolean): Scaduto[] {
    const out: Scaduto[] = [];
    for (const [id, l] of this.m) {
      const restano = l.filter((x) => {
        if (!filtro(x)) return true;
        out.push({ id, cosa: x.tipo === 'condizione' ? this.o.nomeCondizione(x.condizione ?? '') : x.fonte, fonte: x.fonte });
        return false;
      });
      if (restano.length) this.m.set(id, restano);
      else this.m.delete(id);
    }
    return out;
  }

  /** `n` rounds went by on the game clock (a fight's new round, what a closed window outside one cost): what ran out. */
  passaRound(n = 1): Scaduto[] {
    if (n <= 0) return [];
    for (const l of this.m.values()) for (const x of l) if (x.fine === 'round' && x.restanti !== null) x.restanti -= n;
    return this.finisci((x) => x.fine === 'round' && (x.restanti ?? 0) <= 0);
  }

  /** The scene changed: scene-long effects end (and round-long ones, which cannot outlast a scene). */
  cambioScena(): Scaduto[] {
    return this.finisci((x) => x.fine === 'scena' || x.fine === 'round');
  }

  /** A rest: rest-long effects end, and everything shorter. */
  riposo(): Scaduto[] {
    return this.finisci((x) => x.fine !== 'permanente');
  }

  /** One line for the narrator about what ended, or null. */
  static fatto(scaduti: readonly Scaduto[], nome: (id: string) => string): string | null {
    if (!scaduti.length) return null;
    return testo('prove.attivi.finiti', { elenco: scaduti.map((x) => testo('prove.attivi.finito', { nome: nome(x.id), cosa: x.cosa.toLowerCase() })).join('; ') });
  }

  azzera(): void {
    this.m.clear();
  }

  esporta(): StatoAttiviSalvato {
    return { attivi: [...this.m].map(([id, l]) => [id, l.map((x) => ({ ...x, ...(x.immunita ? { immunita: [...x.immunita] } : {}) }))]) };
  }

  importa(s: StatoAttiviSalvato | null | undefined): void {
    this.m.clear();
    for (const [id, l] of s?.attivi ?? []) if (Array.isArray(l) && l.length) this.m.set(id, l.map((x) => ({ ...x })));
  }
}
