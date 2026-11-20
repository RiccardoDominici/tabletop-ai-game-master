/**
 * The game clock in the Engine state (docs/prove.md §11; docs/regole.md §2, «Tempo»; audit P4-01): seconds of game time
 * since the session started, advanced by a fight's rounds, by each closed window outside a fight (the set's
 * `per_finestra`, longer actions by their words, one round while someone is dying), by a rest and by the Game Master
 * (time passes, a journey). The rounds it counts tick the timed effects (prove/attivi.ts) and the dying (prove/morte.ts);
 * the light sources lit burn on it and go out when their time is up. Saved in the session snapshot.
 *
 * Deterministic: the burning time of a light is rolled by the Engine's dice when it is lit (a Game Master roll, shown
 * only on the panel), nothing here asks a model.
 */
import { testo } from '../lingua';
import type { Logger } from '../logger';
import type { RegolaTempo } from '../regole/tempo';

export interface LuceAccesa {
  chi: string;
  oggetto: string;
  /** The game second it goes out. */
  fine: number;
}

export interface StatoTempoSalvato {
  /** Absolute game seconds (since midnight of day 1) at which the session started: the set's `inizio` or the package's. */
  inizio?: number;
  secondi: number;
  /** Seconds not yet a whole round (they add up with the next advance). */
  resto: number;
  luci: LuceAccesa[];
}

export interface OpzioniTempo {
  nome: (id: string) => string;
  /** A catalog item's name («Torcia»). */
  nomeOggetto: (id: string) => string;
  log: Logger;
}

/** A set without `tempo`: a window is one round, as before the clock (no time is shown). */
const SENZA_TEMPO: RegolaTempo = { unita: [{ id: 'round', nome: 'round', plurale: 'round', secondi: 1 }], round: 'round', perFinestra: 1, azioni: [], inizio: 0 };

export class TempoDiGioco {
  private secondi = 0;
  private resto = 0;
  private readonly luci = new Map<string, LuceAccesa>();
  readonly regola: RegolaTempo;

  /** Absolute game seconds at which the session started (the package's `tempo_all_inizio`, else the set's `inizio`). */
  readonly inizio: number;

  constructor(
    regola: RegolaTempo | null,
    private readonly o: OpzioniTempo,
    inizio: number | null = null,
  ) {
    this.regola = regola ?? SENZA_TEMPO;
    this.mostrato = regola !== null;
    this.inizio = inizio ?? this.regola.inizio;
  }

  /** The set has a clock worth showing (its own `tempo`). */
  readonly mostrato: boolean;

  /** Seconds of one fight round. */
  get secondiRound(): number {
    return this.regola.unita.find((u) => u.id === this.regola.round)?.secondi ?? this.regola.unita[0]!.secondi;
  }

  /** Game seconds since midnight of day 1. */
  adesso(): number {
    return this.inizio + this.secondi;
  }

  /** Seconds passed since the session started. */
  get trascorsi(): number {
    return this.secondi;
  }

  /**
   * Time passes: returns how many whole rounds went by (for the timed effects and the dying) and the lights that went
   * out, in the order they did. Remainders below a round are kept for the next advance.
   */
  avanza(secondi: number, causa: string): { round: number; spente: LuceAccesa[] } {
    if (!(secondi > 0)) return { round: 0, spente: [] };
    this.secondi += Math.round(secondi);
    const tot = this.resto + Math.round(secondi);
    const round = Math.floor(tot / this.secondiRound);
    this.resto = tot - round * this.secondiRound;
    const spente = [...this.luci.values()].filter((l) => l.fine <= this.secondi).sort((a, b) => a.fine - b.fine);
    for (const l of spente) this.luci.delete(`${l.chi}|${l.oggetto}`);
    this.o.log.info({ causa, secondi, round, adesso: this.secondi, spente: spente.map((l) => `${l.chi}:${l.oggetto}`) }, 'time: the game clock moves');
    return { round, spente };
  }

  /** `chi` lights a light source for `durata` seconds (a second one of the same kind replaces the first). */
  accendi(chi: string, oggetto: string, durata: number): void {
    this.luci.set(`${chi}|${oggetto}`, { chi, oggetto, fine: this.secondi + Math.max(1, Math.round(durata)) });
  }

  /** Put out a lit source; true if it was lit. What was left of it is lost (a torch half burned is not kept). */
  spegni(chi: string, oggetto: string): boolean {
    return this.luci.delete(`${chi}|${oggetto}`);
  }

  /** Whether `chi` has that source lit now. */
  accesa(chi: string, oggetto: string): boolean {
    return this.luci.has(`${chi}|${oggetto}`);
  }

  /** Every light lit now, with its bearer and the seconds left. */
  tutteLeLuci(): Array<{ chi: string; oggetto: string; restanti: number }> {
    return [...this.luci.values()].map((l) => ({ chi: l.chi, oggetto: l.oggetto, restanti: l.fine - this.secondi }));
  }

  /** The lights `chi` has lit, with the seconds left. */
  luciDi(chi: string): Array<{ oggetto: string; restanti: number }> {
    return [...this.luci.values()].filter((l) => l.chi === chi).map((l) => ({ oggetto: l.oggetto, restanti: l.fine - this.secondi }));
  }

  /** «Giorno 1, 18:40»: the day and the time of day (the day's 24 hours are physical, whatever the set's units). */
  testoOra(): string {
    const t = this.adesso();
    const giorno = Math.floor(t / 86400) + 1;
    const h = Math.floor((t % 86400) / 3600);
    const m = Math.floor((t % 3600) / 60);
    return testo('prove.tempo.ora', { giorno, ora: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` });
  }

  /** A span in the set's largest unit that fits it at least once («3 turni», «2 ore»), rounded. */
  durata(secondi: number): string {
    const u = [...this.regola.unita].reverse().find((x) => secondi >= x.secondi) ?? this.regola.unita[0]!;
    const n = Math.max(1, Math.round(secondi / u.secondi));
    return `${n} ${n === 1 ? u.nome.toLowerCase() : u.plurale.toLowerCase()}`;
  }

  /** The facts of lights that went out, for the narrator. */
  fattiSpente(spente: readonly LuceAccesa[]): string[] {
    return spente.map((l) => testo('prove.tempo.spenta', { nome: this.o.nome(l.chi), oggetto: this.o.nomeOggetto(l.oggetto).toLowerCase() }));
  }

  azzera(): void {
    this.secondi = 0;
    this.resto = 0;
    this.luci.clear();
  }

  esporta(): StatoTempoSalvato {
    return { inizio: this.inizio, secondi: this.secondi, resto: this.resto, luci: [...this.luci.values()].map((l) => ({ ...l })) };
  }

  importa(s: StatoTempoSalvato | null | undefined): void {
    this.azzera();
    if (!s) return;
    if (Number.isFinite(s.secondi) && s.secondi >= 0) this.secondi = Math.round(s.secondi);
    if (Number.isFinite(s.resto) && s.resto >= 0) this.resto = Math.round(s.resto);
    for (const l of s.luci ?? []) if (typeof l.chi === 'string' && typeof l.oggetto === 'string' && Number.isFinite(l.fine)) this.luci.set(`${l.chi}|${l.oggetto}`, { ...l });
  }
}
