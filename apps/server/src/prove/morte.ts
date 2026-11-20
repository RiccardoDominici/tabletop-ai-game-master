/**
 * The dying window of a rule set's death rule (docs/combattimento.md §3.3; docs/regole.md §2, `tiri_morte.finestra`):
 * Basic Fantasy's optional «Save vs. Death» (p. 188) keeps a PC who makes its save alive and unconscious for 2d10
 * rounds, and it dies unless someone binds its wounds or heals it in that time. This module counts those rounds for
 * every dying PC, in and out of a fight: they tick at each new round of a fight and at each closed window outside one
 * (no game clock yet: the interim rule of prove/attivi.ts). Each tick is a fact for the narrator, so a countdown that can
 * kill a PC is never silent. Saved in the session snapshot.
 */
import { testo } from '../lingua';

export interface StatoMorentiSalvato {
  morenti: Array<[string, number]>;
}

export class Morenti {
  private readonly m = new Map<string, number>();

  /** `id` made its save: alive, unconscious, dying for `round` rounds. */
  inizia(id: string, round: number): void {
    this.m.set(id, Math.max(1, round));
  }

  /** Rounds left before `id` dies, or null (not dying). */
  restanti(id: string): number | null {
    return this.m.get(id) ?? null;
  }

  /** Bound or healed: no longer dying. True if it was. */
  ferma(id: string): boolean {
    return this.m.delete(id);
  }

  /** A round went by: who dies now, and who is still dying with how many rounds left. */
  passaRound(): { morti: string[]; ancora: Array<[string, number]> } {
    const morti: string[] = [];
    const ancora: Array<[string, number]> = [];
    for (const [id, n] of this.m) {
      if (n - 1 <= 0) {
        morti.push(id);
        this.m.delete(id);
      } else {
        this.m.set(id, n - 1);
        ancora.push([id, n - 1]);
      }
    }
    return { morti, ancora };
  }

  /** Every PC still dying (the defeat path: nobody is left standing to bind them). */
  tutti(): string[] {
    return [...this.m.keys()];
  }

  /** The facts of one tick, for the narrator. */
  static fatti(t: { morti: string[]; ancora: Array<[string, number]> }, nome: (id: string) => string): string[] {
    return [...t.morti.map((id) => testo('prove.morte.morto', { nome: nome(id) })), ...t.ancora.map(([id, n]) => testo('prove.morte.ancora', { nome: nome(id), n }))];
  }

  azzera(): void {
    this.m.clear();
  }

  esporta(): StatoMorentiSalvato {
    return { morenti: [...this.m] };
  }

  importa(s: StatoMorentiSalvato | null | undefined): void {
    this.m.clear();
    for (const [id, n] of s?.morenti ?? []) if (typeof id === 'string' && Number.isInteger(n) && n > 0) this.m.set(id, n);
  }
}
