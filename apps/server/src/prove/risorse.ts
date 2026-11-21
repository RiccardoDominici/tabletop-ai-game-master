/**
 * The characters' resources in the Engine state (mechanism M3 of docs/regole-audit/; docs/regole.md §2, «Risorse»):
 * counters of the set's resources (ammunition, coins), spell slots by spell level, prepared spells, items with a power,
 * and the once-per-target-per-fight uses (the thief's sneak attack). The sheet gives the starting values; an action
 * spends them, a rest or the end of a fight refreshes what the set says; they are saved in the session snapshot.
 *
 * Keys of the counters: the resource's id, `slot_<n>` for spell slots of level n, `oggetto:<id>` for an item.
 * Deterministic and pure state: the cards and facts are written by the callers (prove/poteri.ts, risolutore-regole.ts).
 */
import type { Potere } from '../regole/poteri';
import { rigaAlLivello } from '../regole/salvezze';
import type { SchedaGenerica, SistemaRegole } from '../regole/tipi';

export interface StatoRisorseSalvato {
  contatori: Array<[string, Array<[string, number]>]>;
  preparati: Array<[string, string[]]>;
  usati: string[];
  /** The armor and shield each character wears (catalog ids; prove/inventario.ts). Absent in older snapshots. */
  indossati?: Array<[string, string[]]>;
  /** The fight round of each weapon's last shot («chi|linea»), for its rate of fire. Cleared when a fight ends. */
  tiri?: Array<[string, number]>;
}

export type EsitoLancio = { ok: true; livello: number } | { ok: false; motivo: 'classe' | 'non_preparato' | 'senza_slot'; livello: number | null };

export const chiaveSlot = (livello: number): string => `slot_${livello}`;
export const chiaveOggetto = (id: string): string => `oggetto:${id}`;
export const chiaveMoneta = (id: string): string => `moneta:${id}`;
/** Counters a character can gain in play although the sheet did not start with them: catalog items and coins. */
const LIBERA = /^(oggetto|moneta):[a-z0-9_]+$/;

export class Risorse {
  private readonly contatori = new Map<string, Map<string, number>>();
  private readonly preparati = new Map<string, string[]>();
  /** «chi|uso|bersaglio»: an ability used once per target per fight (cleared when the fight ends). */
  private readonly usati = new Set<string>();
  /** The armor and shield each character wears (catalog ids). */
  private readonly vestiti = new Map<string, Set<string>>();
  /** «chi|linea» → the fight round of the line's last shot (rate of fire); cleared when the fight ends. */
  private readonly ultimiTiri = new Map<string, number>();

  constructor(
    private readonly s: SistemaRegole,
    private readonly schede: ReadonlyMap<string, SchedaGenerica>,
  ) {
    this.azzera();
  }

  /** Spell slots by spell level of a sheet: its own `slot`, else its class table's row at its level. */
  slotDi(sch: SchedaGenerica): number[] {
    if (sch.slot) return sch.slot;
    const c = sch.classe ? (this.s.classi ?? []).find((x) => x.id === sch.classe) : undefined;
    return c?.incantesimiAlGiorno.length ? (rigaAlLivello(c.incantesimiAlGiorno, sch.livello ?? 1)?.slot ?? []) : [];
  }

  /** Everyone back to the sheet's values (start of the session, «Ricomincia»). */
  azzera(): void {
    this.contatori.clear();
    this.preparati.clear();
    this.usati.clear();
    this.vestiti.clear();
    this.ultimiTiri.clear();
    for (const sch of this.schede.values()) this.ricaricaScheda(sch, 'tutto');
  }

  private ricaricaScheda(sch: SchedaGenerica, quando: 'tutto' | 'riposo' | 'scontro'): void {
    const m = this.contatori.get(sch.id) ?? new Map<string, number>();
    for (const r of this.s.risorse ?? []) {
      const v = sch.risorse?.[r.id];
      if (v === undefined) continue;
      if (quando === 'tutto' || r.ricarica === quando) m.set(r.id, v);
    }
    if (quando === 'tutto' || quando === 'riposo') {
      this.slotDi(sch).forEach((n, i) => m.set(chiaveSlot(i + 1), n));
      if (sch.incantesimi) this.preparati.set(sch.id, [...sch.incantesimi]);
    }
    if (quando === 'tutto') {
      for (const [id, n] of Object.entries(sch.oggetti ?? {})) m.set(chiaveOggetto(id), n);
      // The catalog gear and the coins the sheet starts with (M2): counted like the items with a power.
      for (const e of sch.equipaggiamento ?? []) m.set(chiaveOggetto(e.id), (m.get(chiaveOggetto(e.id)) ?? 0) + e.quante);
      for (const [id, n] of Object.entries(sch.monete ?? {})) m.set(chiaveMoneta(id), n);
      const vestiti = (sch.equipaggiamento ?? []).filter((e) => e.indossato).map((e) => e.id);
      if (vestiti.length) this.vestiti.set(sch.id, new Set(vestiti));
    }
    if (m.size || sch.equipaggiamento || sch.monete) this.contatori.set(sch.id, m);
  }

  /** A rest that refreshes, or the end of a fight: what comes back by the set's rule. Returns who got something back. */
  ricarica(quando: 'riposo' | 'scontro'): string[] {
    if (quando === 'scontro') {
      this.usati.clear();
      this.ultimiTiri.clear();
    }
    const prima = JSON.stringify(this.esporta());
    for (const sch of this.schede.values()) this.ricaricaScheda(sch, quando);
    return prima === JSON.stringify(this.esporta()) ? [] : [...this.schede.keys()];
  }

  /** How many of a counter are left; null = not tracked for this character (no starting value on the sheet). */
  restanti(chi: string, chiave: string): number | null {
    return this.contatori.get(chi)?.get(chiave) ?? null;
  }

  /** Spend n of a counter; false when it is not tracked or not enough is left (nothing changes then). */
  spendi(chi: string, chiave: string, n = 1): boolean {
    const v = this.restanti(chi, chiave);
    if (v === null || v < n) return false;
    this.contatori.get(chi)!.set(chiave, v - n);
    return true;
  }

  /**
   * Change a counter by hand (the Game Master's panel: coins found, arrows picked up). False if not tracked; a catalog
   * item or a coin (`oggetto:…`, `moneta:…`) is tracked as soon as a character with a sheet gains one.
   */
  imposta(chi: string, chiave: string, valore: number): boolean {
    if (!this.schede.has(chi) || !Number.isInteger(valore) || valore < 0) return false;
    const m = this.contatori.get(chi) ?? new Map<string, number>();
    if (!m.has(chiave) && !LIBERA.test(chiave)) return false;
    m.set(chiave, valore);
    this.contatori.set(chi, m);
    return true;
  }

  /** Add (or, negative, remove) n of a counter, never below 0; returns the new value, or null if it cannot be tracked. */
  aggiungi(chi: string, chiave: string, n: number): number | null {
    const v = Math.max(0, (this.restanti(chi, chiave) ?? 0) + n);
    return this.imposta(chi, chiave, v) ? v : null;
  }

  /** Every counter of `chi` whose key starts with `prefisso` (`oggetto:`, `moneta:`), without the prefix. */
  conPrefisso(chi: string, prefisso: string): Array<[string, number]> {
    return [...(this.contatori.get(chi) ?? new Map<string, number>())].filter(([k]) => k.startsWith(prefisso)).map(([k, n]) => [k.slice(prefisso.length), n]);
  }

  /** The armor and shield `chi` wears (catalog ids). */
  indossati(chi: string): ReadonlySet<string> {
    return this.vestiti.get(chi) ?? new Set<string>();
  }

  /** Put on (or take off) a catalog item; the caller checks what may be worn (prove/inventario.ts). */
  vesti(chi: string, id: string, indossato: boolean, toglie: readonly string[] = []): void {
    const v = new Set(this.indossati(chi));
    for (const x of toglie) v.delete(x);
    if (indossato) v.add(id);
    else v.delete(id);
    if (v.size) this.vestiti.set(chi, v);
    else this.vestiti.delete(chi);
  }

  /**
   * Start `chi` from a package's `pg_all_inizio` (sessione/stato-pg.ts): its items and coins replace the sheet's (when
   * written), counters and prepared spells are set, the worn armor replaced. Returns the counters it could not track.
   */
  inizia(chi: string, s: { oggetti?: Record<string, number>; monete?: Record<string, number>; indossati?: string[]; contatori?: Record<string, number>; incantesimi?: string[] }): string[] {
    if (!this.schede.has(chi)) return [];
    const m = this.contatori.get(chi) ?? new Map<string, number>();
    const ignoti: string[] = [];
    const sostituisci = (pref: string, v: Record<string, number> | undefined): void => {
      if (!v) return;
      for (const k of [...m.keys()]) if (k.startsWith(pref)) m.delete(k);
      for (const [id, n] of Object.entries(v)) m.set(`${pref}${id}`, n);
    };
    sostituisci('oggetto:', s.oggetti);
    sostituisci('moneta:', s.monete);
    for (const [k, n] of Object.entries(s.contatori ?? {})) {
      if (m.has(k)) m.set(k, n);
      else ignoti.push(k);
    }
    this.contatori.set(chi, m);
    if (s.incantesimi) this.preparati.set(chi, [...s.incantesimi]);
    if (s.indossati) {
      if (s.indossati.length) this.vestiti.set(chi, new Set(s.indossati));
      else this.vestiti.delete(chi);
    }
    return ignoti;
  }

  /**
   * The slot counters of `chi` at the maxima of `livello` (a package's level, before its counters are read): the keys of
   * another level's row are dropped (prove/livelli.ts).
   */
  slotAlLivello(chi: string, livello: number): void {
    const sch = this.schede.get(chi);
    if (!sch) return;
    const m = this.contatori.get(chi) ?? new Map<string, number>();
    for (const k of [...m.keys()]) if (k.startsWith('slot_')) m.delete(k);
    this.slotDi({ ...sch, livello }).forEach((n, i) => m.set(chiaveSlot(i + 1), n));
    if (m.size) this.contatori.set(chi, m);
  }

  /** A level gained since `prima`: each spell level gets the slots the new row gives beyond the old one's, today too. */
  guadagnaSlot(chi: string, prima: number): number[] {
    const sch = this.schede.get(chi);
    if (!sch) return [];
    const nuovi = this.slotDi(sch);
    const vecchi = this.slotDi({ ...sch, livello: prima });
    const m = this.contatori.get(chi) ?? new Map<string, number>();
    const guadagno = nuovi.map((n, i) => Math.max(0, n - (vecchi[i] ?? 0)));
    guadagno.forEach((g, i) => {
      if (g > 0 || !m.has(chiaveSlot(i + 1))) m.set(chiaveSlot(i + 1), (m.get(chiaveSlot(i + 1)) ?? 0) + g);
    });
    if (m.size) this.contatori.set(chi, m);
    return guadagno;
  }

  /** The fight round of a line's last shot (rate of fire), or null. */
  ultimoTiro(chi: string, linea: string): number | null {
    return this.ultimiTiri.get(`${chi}|${linea}`) ?? null;
  }

  segnaTiro(chi: string, linea: string, round: number): void {
    this.ultimiTiri.set(`${chi}|${linea}`, round);
  }

  /** The spell level of a power for a caster: its class's, else the only (or lowest) level the power has. */
  livelloPer(sch: SchedaGenerica, p: Potere): number | null {
    if (sch.classe && p.livello[sch.classe] !== undefined) return p.livello[sch.classe]!;
    const livelli = Object.values(p.livello);
    if (!livelli.length) return null;
    // A class that is not in the power's list cannot cast it; a sheet with no class (an NPC caster) takes the lowest.
    return sch.classe && (this.s.classi ?? []).some((c) => c.id === sch.classe) ? null : Math.min(...livelli);
  }

  /**
   * Whether `chi` can cast the spell now: it is a spell of its class, prepared (vancian) or known (slots), and a slot
   * of its level is left. A sheet with prepared copies but no slots written anywhere counts the copies alone.
   */
  puoLanciare(chi: string, p: Potere): EsitoLancio {
    const sch = this.schede.get(chi);
    if (!sch) return { ok: false, motivo: 'classe', livello: null };
    const livello = this.livelloPer(sch, p);
    if (livello === null) return { ok: false, motivo: 'classe', livello: null };
    const vanciana = this.s.magia?.preparazione === 'vanciana';
    const lista = vanciana ? (this.preparati.get(chi) ?? []) : (sch.incantesimi ?? []);
    if (!lista.includes(p.id)) return { ok: false, motivo: 'non_preparato', livello };
    const slot = this.restanti(chi, chiaveSlot(livello));
    if (slot !== null && slot < 1) return { ok: false, motivo: 'senza_slot', livello };
    if (slot === null && !vanciana) return { ok: false, motivo: 'senza_slot', livello };
    return { ok: true, livello };
  }

  /** Cast it: the slot of its level and, vancian, the prepared copy. Call after `puoLanciare` said yes. */
  lancia(chi: string, p: Potere, livello: number): void {
    this.spendi(chi, chiaveSlot(livello));
    if (this.s.magia?.preparazione !== 'vanciana') return;
    const lista = this.preparati.get(chi) ?? [];
    const i = lista.indexOf(p.id);
    if (i >= 0) lista.splice(i, 1);
  }

  /** `chi` loses every prepared spell and slot left today (Basic Fantasy p. 189: a caster who survives 0 hit points). */
  dimenticaIncantesimi(chi: string): boolean {
    const m = this.contatori.get(chi);
    const prima = (this.preparati.get(chi)?.length ?? 0) + [...(m ?? new Map<string, number>())].filter(([k, n]) => k.startsWith('slot_') && n > 0).length;
    if (this.preparati.has(chi)) this.preparati.set(chi, []);
    for (const k of [...(m?.keys() ?? [])]) if (k.startsWith('slot_')) m!.set(k, 0);
    return prima > 0;
  }

  /** The spells `chi` still has prepared today (vancian) or knows (slots). */
  incantesimiDi(chi: string): string[] {
    return this.s.magia?.preparazione === 'vanciana' ? [...(this.preparati.get(chi) ?? [])] : [...(this.schede.get(chi)?.incantesimi ?? [])];
  }

  /** An ability used once per target per fight (the sneak attack): already used on this target in this fight. */
  giaUsato(chi: string, uso: string, bersaglio: string): boolean {
    return this.usati.has(`${chi}|${uso}|${bersaglio}`);
  }

  segnaUsato(chi: string, uso: string, bersaglio: string): void {
    this.usati.add(`${chi}|${uso}|${bersaglio}`);
  }

  /** Every tracked counter of a character, for the Game Master panel and the log. */
  vista(chi: string): Array<{ chiave: string; restanti: number }> {
    return [...(this.contatori.get(chi) ?? new Map<string, number>())].map(([chiave, restanti]) => ({ chiave, restanti }));
  }

  esporta(): StatoRisorseSalvato {
    return {
      contatori: [...this.contatori].map(([id, m]) => [id, [...m]]),
      preparati: [...this.preparati].map(([id, l]) => [id, [...l]]),
      usati: [...this.usati],
      indossati: [...this.vestiti].map(([id, v]) => [id, [...v]]),
      tiri: [...this.ultimiTiri],
    };
  }

  /** From a snapshot (a session saved before this state existed has none: the sheet's values stay). */
  importa(s: StatoRisorseSalvato | null | undefined): void {
    this.azzera();
    if (!s) return;
    for (const [id, voci] of s.contatori ?? []) {
      if (!this.schede.has(id)) continue;
      const m = this.contatori.get(id) ?? new Map<string, number>();
      // Items and coins gained in play are kept even if the sheet did not start with them (an item found, a coin given).
      for (const [k, n] of voci) if ((m.has(k) || LIBERA.test(k)) && Number.isInteger(n) && n >= 0) m.set(k, n);
      if (m.size) this.contatori.set(id, m);
    }
    for (const [id, l] of s.preparati ?? []) if (this.preparati.has(id) && Array.isArray(l)) this.preparati.set(id, l.filter((x) => typeof x === 'string'));
    for (const u of s.usati ?? []) if (typeof u === 'string') this.usati.add(u);
    // A snapshot from before the inventory keeps the sheet's worn armor.
    if (s.indossati) {
      this.vestiti.clear();
      for (const [id, l] of s.indossati) if (this.schede.has(id) && Array.isArray(l) && l.length) this.vestiti.set(id, new Set(l.filter((x) => typeof x === 'string')));
    }
    for (const [k, n] of s.tiri ?? []) if (typeof k === 'string' && Number.isInteger(n)) this.ultimiTiri.set(k, n);
  }
}
