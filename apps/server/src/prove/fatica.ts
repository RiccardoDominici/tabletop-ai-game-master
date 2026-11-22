/**
 * An exploration rest rule on the game clock (docs/prove.md §14; docs/regole.md §2, «Esplorazione», `riposo`): some
 * manuals want the party to stop for a while every so often while exploring (a turn every hour), and give a penalty
 * until it does. Basic Fantasy has no such rule; the schema is there for the manuals that do. While the party explores (a
 * scene's environment, a journey), the time passed adds up; past `ogni` without a rest the PCs take the set's condition
 * (its numbers: −1 to attacks), and a rest of `durata` — a window whose action says the rule's words («ci riposiamo»),
 * or a rest from the panel at least as long — clears it.
 */
import { normalizza } from '../azioni/regole';
import type { Logger } from '../logger';
import type { RiposoEsplorazione } from '../regole/esplorazione';
import { senzaParlato } from './parole-testo';

export interface StatoFaticaSalvato {
  sforzo: number;
  stanchi: boolean;
}

export class Fatica {
  private sforzo = 0;
  private stanchi = false;

  constructor(private readonly o: { regola: RiposoEsplorazione | null; log: Logger }) {}

  get regola(): RiposoEsplorazione | null {
    return this.o.regola;
  }

  /** Exploring time passed: returns true when the party has just become overdue for a rest. */
  passa(secondi: number): boolean {
    const r = this.o.regola;
    if (!r || secondi <= 0) return false;
    this.sforzo += secondi;
    if (this.stanchi || this.sforzo <= r.ogni) return false;
    this.stanchi = true;
    this.o.log.info({ sforzo: this.sforzo, ogni: r.ogni }, 'exploration: the party is overdue for a rest');
    return true;
  }

  /** A rest of the rule's length: the count starts again. Returns true if the party was overdue. */
  riposa(): boolean {
    const era = this.stanchi;
    this.sforzo = 0;
    this.stanchi = false;
    if (this.o.regola) this.o.log.info({ eraStanco: era }, 'exploration: the party rests');
    return era;
  }

  /** The condition the PCs carry now (overdue), or null. */
  get condizione(): string | null {
    return this.stanchi ? (this.o.regola?.condizione ?? null) : null;
  }

  /** Seconds since the last rest. */
  get daUltimo(): number {
    return this.sforzo;
  }

  /** The action says the rule's words of a rest («ci riposiamo»). */
  eRiposo(testoAzione: string): boolean {
    const r = this.o.regola;
    if (!r) return false;
    const t = normalizza(senzaParlato(testoAzione));
    return r.parole.some((p) => t.includes(normalizza(p)));
  }

  azzera(): void {
    this.sforzo = 0;
    this.stanchi = false;
  }

  esporta(): StatoFaticaSalvato {
    return { sforzo: this.sforzo, stanchi: this.stanchi };
  }

  importa(s: StatoFaticaSalvato | null | undefined): void {
    this.azzera();
    if (s && Number.isFinite(s.sforzo) && s.sforzo >= 0) this.sforzo = s.sforzo;
    if (s?.stanchi === true) this.stanchi = true;
  }
}
