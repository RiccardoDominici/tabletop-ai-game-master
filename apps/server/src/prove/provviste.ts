/**
 * Daily food and water on the game clock (docs/prove.md §14; docs/regole.md §2, «Esplorazione»; audit P4-22, P4-23;
 * Basic Fantasy p. 44): where the party lives off its supplies (a scene's environment, a journey), each midnight the clock
 * passes costs each character at the table one day of each of the set's `provviste` — a ration of a week's pack, a
 * waterskin — taken from what it carries. Without, the days are counted: after the set's grace (two days for food, none
 * for water in Basic Fantasy) each day deals its damage, and natural healing stops until a day with it. A day in a place
 * that feeds the party (a town: an environment with `provviste: false`, or no environment at all) is a day with food and
 * water for everyone.
 *
 * Deterministic: the damage dice are the Engine's; what is spent comes off the inventory (prove/inventario.ts).
 */
import { testo } from '../lingua';
import type { Logger } from '../logger';
import type { Provvista } from '../regole/esplorazione';
import type { FonteDadi } from './dadi';
import { danno as tiraDanno } from './regole';

export interface StatoProvvisteSalvato {
  /** The days of a pack already opened, by character and need («razioni»: 5 days left in the open pack). */
  porzioni: Array<[string, Record<string, number>]>;
  /** Days in a row without, by character and need. */
  senza: Array<[string, Record<string, number>]>;
}

export interface OpzioniProvviste {
  regole: readonly Provvista[];
  dadi: () => FonteDadi;
  nome: (id: string) => string;
  nomeOggetto: (id: string) => string;
  /** How many of a catalog item `chi` carries, and spend one. */
  quanti: (chi: string, oggetto: string) => number;
  spendi: (chi: string, oggetto: string) => void;
  /** Damage that does not come from a blow (it can drop a character to 0): returns the hit points after. */
  danneggia: (chi: string, n: number) => void;
  log: Logger;
}

/** «un giorno», «3 giorni» (the language pack's words). */
export const testoGiorni = (n: number): string => (n === 1 ? testo('prove.provviste.un_giorno') : testo('prove.provviste.giorni', { n }));
const testoPunti = (n: number): string => (n === 1 ? testo('prove.provviste.un_punto') : testo('prove.provviste.punti', { n }));

export class Provviste {
  private readonly porzioni = new Map<string, Record<string, number>>();
  private readonly senza = new Map<string, Record<string, number>>();

  constructor(private readonly o: OpzioniProvviste) {}

  /**
   * The clock moved from `prima` to `dopo` (absolute game seconds): for every midnight in between, each of `chi` eats and
   * drinks (`consuma`: the party lives off its supplies there) or is fed by the place. Returns the facts for the narrator.
   */
  passa(prima: number, dopo: number, consuma: boolean, chi: readonly string[]): string[] {
    const giorni = Math.floor(dopo / 86400) - Math.floor(prima / 86400);
    if (giorni <= 0 || !this.o.regole.length) return [];
    const fatti: string[] = [];
    for (let g = 0; g < giorni; g++) for (const id of chi) fatti.push(...(consuma ? this.giorno(id) : this.nutrito(id)));
    return fatti;
  }

  /** One day off the supplies for `id`: each need met from an open pack or a new item, or one more day without. */
  private giorno(id: string): string[] {
    const fatti: string[] = [];
    const porz = this.porzioni.get(id) ?? {};
    const senza = this.senza.get(id) ?? {};
    for (const p of this.o.regole) {
      // The last day of the last item: say it, so the table knows tomorrow is without.
      const finita = (oggetto: string): void => {
        if ((porz[p.id] ?? 0) === 0 && !p.oggetti.some((y) => this.o.quanti(id, y.id) > 0)) fatti.push(testo('prove.provviste.ultima', { nome: this.o.nome(id), provvista: p.nome.toLowerCase(), oggetto: this.o.nomeOggetto(oggetto).toLowerCase() }));
      };
      if ((porz[p.id] ?? 0) > 0) {
        porz[p.id]! -= 1;
        senza[p.id] = 0;
        finita(p.oggetti[0]!.id);
        continue;
      }
      const x = p.oggetti.find((y) => this.o.quanti(id, y.id) > 0);
      if (x) {
        this.o.spendi(id, x.id);
        porz[p.id] = x.giorni - 1;
        if ((senza[p.id] ?? 0) > p.senza.dopo && !p.senza.guarigione) fatti.push(testo('prove.provviste.di_nuovo', { nome: this.o.nome(id), provvista: p.nome.toLowerCase() }));
        senza[p.id] = 0;
        this.o.log.info({ chi: id, provvista: p.id, oggetto: x.id, restano: this.o.quanti(id, x.id), giorni_aperti: porz[p.id] }, 'supplies: a day of the need met, an item spent');
        finita(x.id);
        continue;
      }
      const n = (senza[p.id] ?? 0) + 1;
      senza[p.id] = n;
      if (n > p.senza.dopo && p.senza.danno) {
        const d = tiraDanno(this.o.dadi(), p.senza.danno, 0, false);
        if (d.totale > 0) this.o.danneggia(id, d.totale);
        fatti.push(testo(p.senza.guarigione ? 'prove.provviste.danno' : 'prove.provviste.danno_ferite', { nome: this.o.nome(id), provvista: p.nome.toLowerCase(), giorni: testoGiorni(n), danno: testoPunti(d.totale) }));
        this.o.log.info({ chi: id, provvista: p.id, giorni: n, danno: d.totale, dadi: d.dadi }, 'supplies: a day without, damage');
      } else {
        fatti.push(testo('prove.provviste.senza', { nome: this.o.nome(id), provvista: p.nome.toLowerCase(), giorni: testoGiorni(n) }));
        this.o.log.info({ chi: id, provvista: p.id, giorni: n }, 'supplies: a day without, within the grace');
      }
    }
    this.porzioni.set(id, porz);
    this.senza.set(id, senza);
    return fatti;
  }

  /** A day where the place feeds the party: every need met, healing back. */
  private nutrito(id: string): string[] {
    const s = this.senza.get(id);
    if (!s || !Object.values(s).some((n) => n > 0)) return [];
    const tornata = this.o.regole.some((p) => !p.senza.guarigione && (s[p.id] ?? 0) > p.senza.dopo);
    this.senza.set(id, {});
    return tornata ? [testo('prove.provviste.nutrito', { nome: this.o.nome(id) })] : [];
  }

  /** The need that stops `id`'s natural healing now (its name), or null: a rest heals it as usual. */
  senzaGuarigione(id: string): string | null {
    const s = this.senza.get(id);
    return this.o.regole.find((p) => !p.senza.guarigione && (s?.[p.id] ?? 0) > p.senza.dopo)?.nome ?? null;
  }

  /** For the panel: each character's days without and the days left in an open pack. */
  vista(id: string): { senza: Record<string, number>; porzioni: Record<string, number> } {
    return { senza: { ...(this.senza.get(id) ?? {}) }, porzioni: { ...(this.porzioni.get(id) ?? {}) } };
  }

  azzera(): void {
    this.porzioni.clear();
    this.senza.clear();
  }

  esporta(): StatoProvvisteSalvato {
    return { porzioni: [...this.porzioni].map(([k, v]) => [k, { ...v }]), senza: [...this.senza].map(([k, v]) => [k, { ...v }]) };
  }

  importa(s: StatoProvvisteSalvato | null | undefined): void {
    this.azzera();
    const ok = (v: unknown): v is Record<string, number> => !!v && typeof v === 'object' && Object.values(v).every((n) => Number.isInteger(n) && (n as number) >= 0);
    for (const [k, v] of s?.porzioni ?? []) if (typeof k === 'string' && ok(v)) this.porzioni.set(k, { ...v });
    for (const [k, v] of s?.senza ?? []) if (typeof k === 'string' && ok(v)) this.senza.set(k, { ...v });
  }
}
