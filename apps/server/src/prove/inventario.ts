/**
 * What each character carries and wears, and its coins, in the Engine state (mechanism M2 of docs/regole-audit/;
 * docs/regole.md §2, «Catalogo»; docs/prove.md §10). The counts live in the resources (prove/risorse.ts: `oggetto:<id>`
 * and `moneta:<id>` counters and the worn armor), so they travel with the snapshot, the dry run of manual rolls and the
 * session package like the spell slots do. This module reads and changes them by the set's catalog: buying with change,
 * selling, finding or losing an item or coins, putting on or taking off armor. After every change the character's AC and
 * attack lines are derived again (regole/equipaggiamento.ts), on the Engine's own copy of the sheet.
 *
 * Deterministic: the facts are written here for the narrator, the Game Master's panel or a typed effect decided which
 * change happens. Nothing here asks a model.
 */
import { testo } from '../lingua';
import type { Logger } from '../logger';
import { scriviCosto, voce, type VoceCatalogo } from '../regole/catalogo';
import { applicaDotazione, difesaDa, penalitaDi, penalitaIndossate, restrizioniViolate, type Dotazione } from '../regole/equipaggiamento';
import type { Penalita } from '../regole/catalogo';
import type { SchedaGenerica, SistemaRegole } from '../regole/tipi';
import { chiaveMoneta, chiaveOggetto, type Risorse } from './risorse';
import { fasciaDi, limitiDi, movimentoDi } from '../regole/carico';
import { indossate } from '../regole/equipaggiamento';

export type EsitoInventario = { ok: true; fatto: string } | { ok: false; fatto: string; motivo: 'senza_catalogo' | 'sconosciuto' | 'non_ha' | 'monete' | 'vietato' | 'non_indossabile' | 'senza_prezzo' };

export interface OpzioniInventario {
  sistema: SistemaRegole;
  /** The Engine's own copies of the sheets: their AC and attack lines are derived again in place. */
  schede: ReadonlyMap<string, SchedaGenerica>;
  risorse: Risorse;
  nome: (id: string) => string;
  log: Logger;
  /** Coins a character gained (a find, an effect, the panel), worth `valore` in the smallest coin: treasure XP. */
  trovate?: (chi: string, valore: number) => void;
}

export class Inventario {
  constructor(private readonly o: OpzioniInventario) {}

  private get s(): SistemaRegole {
    return this.o.sistema;
  }

  /** The character tracks gear or coins (its sheet lists them, or it gained some in play). */
  traccia(chi: string): boolean {
    const sch = this.o.schede.get(chi);
    return !!sch && (!!sch.equipaggiamento || !!sch.monete || this.o.risorse.conPrefisso(chi, 'oggetto:').some(([id]) => !!voce(this.s.catalogo, id)) || this.o.risorse.conPrefisso(chi, 'moneta:').length > 0);
  }

  /** What `chi` has now, as the equipment rules read it. */
  dotazione(chi: string): Dotazione {
    return { quante: (id) => this.o.risorse.restanti(chi, chiaveOggetto(id)) ?? 0, indossati: this.o.risorse.indossati(chi) };
  }

  /** Derive again the AC and attack lines of one character (or all) from what it has now. */
  rideriva(chi?: string): void {
    for (const sch of chi ? [this.o.schede.get(chi)].filter((x): x is SchedaGenerica => !!x) : this.o.schede.values()) {
      if (sch.equipaggiamento || this.traccia(sch.id)) {
        // A sheet that gained its first gear in play starts listing it (its own lines and AC stay as fallback).
        if (!sch.equipaggiamento) {
          sch.equipaggiamento = [];
          sch.attacchiPropri = sch.attacchi;
          sch.difesaScritta = sch.difesa;
          // Its typed AC (a monster's hide, an NPC's) stands until it puts on an armor or a shield.
          if (sch.difesa !== null) sch.difesaPropria = true;
        }
        applicaDotazione(this.s, sch, this.dotazione(sch.id));
      }
    }
  }

  /** The penalties of the armor and shield `chi` wears now (no spells, abilities blocked). */
  penalita(chi: string): Penalita & { motivi: string[] } {
    const sch = this.o.schede.get(chi);
    return sch && this.s.catalogo ? penalitaIndossate(this.s, sch, this.dotazione(chi)) : { motivi: [] };
  }

  /** The catalog items `chi` carries (count > 0), in catalog order, with what it wears. */
  oggetti(chi: string): Array<{ id: string; nome: string; quante: number; indossato: boolean }> {
    const vestiti = this.o.risorse.indossati(chi);
    return (this.s.catalogo?.voci ?? []).flatMap((v) => {
      const n = this.o.risorse.restanti(chi, chiaveOggetto(v.id)) ?? 0;
      return n > 0 ? [{ id: v.id, nome: v.nome, quante: n, indossato: vestiti.has(v.id) }] : [];
    });
  }

  /** The coins of `chi`, from the most valuable (only those it tracks). */
  monete(chi: string): Array<{ id: string; nome: string; quante: number }> {
    return (this.s.monete?.tagli ?? []).flatMap((t) => {
      const n = this.o.risorse.restanti(chi, chiaveMoneta(t.id));
      return n !== null ? [{ id: t.id, nome: t.nome, quante: n }] : [];
    });
  }

  /** All the coins of `chi`, in the smallest coin. */
  valore(chi: string): number {
    return (this.s.monete?.tagli ?? []).reduce((n, t) => n + (this.o.risorse.restanti(chi, chiaveMoneta(t.id)) ?? 0) * t.vale, 0);
  }

  /**
   * What `chi` carries weighs, in `carico.unita`: each catalog item by its pack's weight, a race's lighter armor
   * (`carico.peso_armatura`), and the coins (`monete.peso`). Rounded to a hundredth.
   */
  peso(chi: string): number {
    const sch = this.o.schede.get(chi);
    const frazione = sch?.razza ? (this.s.carico?.pesoArmatura[sch.razza] ?? 1) : 1;
    let p = 0;
    for (const [id, n] of this.o.risorse.conPrefisso(chi, 'oggetto:')) {
      const v = this.voce(id);
      if (!v || n <= 0) continue;
      p += ((v.peso * n) / v.confezione) * (v.tipo === 'armatura' ? frazione : 1);
    }
    const m = this.s.monete?.peso;
    if (m) p += (this.monete(chi).reduce((x, c) => x + c.quante, 0) / m.quante) * m.peso;
    return Math.round(p * 100) / 100;
  }

  /**
   * The load and movement of `chi` now (M8): the weight, its band by the Strength score and race (`fascia` = the number
   * of bands when overloaded), the limit of that band, and the movement rate by the worn armor. Null without `carico`.
   */
  carico(chi: string): { peso: number; fascia: number; nome: string; limite: number | null; movimento: number | null } | null {
    const c = this.s.carico;
    const sch = this.o.schede.get(chi);
    if (!c || !sch) return null;
    const limiti = limitiDi(c, sch.caratteristiche[c.caratteristica] ?? 0, sch.razza);
    const peso = this.peso(chi);
    const fascia = fasciaDi(limiti, peso);
    const categoria = indossate(this.s, this.dotazione(chi)).armatura?.categoria ?? null;
    return {
      peso,
      fascia,
      nome: c.fasce[fascia]?.nome ?? testo('prove.inventario.sovraccarico'),
      limite: limiti[fascia] ?? null,
      movimento: this.s.movimento ? movimentoDi(this.s.movimento, categoria, fascia) : null,
    };
  }

  /** The line a change adds when it moves the character to another load band or movement rate, or ''. */
  private cambioDiCarico(chi: string, prima: ReturnType<Inventario['carico']>): string {
    const dopo = this.carico(chi);
    if (!prima || !dopo || (prima.fascia === dopo.fascia && prima.movimento === dopo.movimento)) return '';
    this.o.log.info({ chi, peso: dopo.peso, fascia: dopo.nome, movimento: dopo.movimento }, 'load: band or movement changed');
    return ` ${testo('prove.inventario.carico', { nome: this.o.nome(chi), fascia: dopo.nome.toLowerCase(), peso: dopo.peso, unita: this.s.carico!.unita, movimento: dopo.movimento ?? '—', unita_movimento: this.s.movimento?.unita ?? '' })}`;
  }

  /** «12 mo, 5 ma» for the facts and the panel. */
  private scriviMonete(m: Record<string, number>): string {
    return (this.s.monete?.tagli ?? []).filter((t) => (m[t.id] ?? 0) > 0).map((t) => `${m[t.id]} ${t.id}`).join(', ');
  }

  /**
   * `chi` pays `costo` (in the smallest coin) from its coins, as a player at the counter would: among the ways that use
   * the largest coins first (down to some coin, plus one more of it if something is still owed), the one that hands
   * over and gets back the fewest coins; the change comes in the price coins (`monete.prezzi`), largest first. Nothing
   * changes when it cannot pay.
   */
  paga(chi: string, costo: number): { ok: true; pagato: Record<string, number>; resto: Record<string, number> } | { ok: false } {
    const m = this.s.monete;
    if (!m || this.valore(chi) < costo) return { ok: false };
    const ha = new Map(m.tagli.map((t) => [t.id, this.o.risorse.restanti(chi, chiaveMoneta(t.id)) ?? 0]));
    const prezzi = m.tagli.filter((x) => m.prezzi.includes(x.id));
    const resto = (n: number): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const t of prezzi) {
        const k = Math.floor(n / t.vale);
        if (k > 0) {
          out[t.id] = k;
          n -= k * t.vale;
        }
      }
      return out;
    };
    let meglio: { pagato: Record<string, number>; resto: Record<string, number>; monete: number } | null = null;
    // Candidate «down to coin i»: the coins from the largest to the i-th, greedily, then one more i-th if still owed.
    for (let i = m.tagli.length - 1; i >= 0; i--) {
      const pagato: Record<string, number> = {};
      let manca = costo;
      for (const t of m.tagli.slice(0, i + 1)) {
        const k = Math.min(ha.get(t.id)!, Math.floor(manca / t.vale));
        if (k > 0) {
          pagato[t.id] = k;
          manca -= k * t.vale;
        }
      }
      const ti = m.tagli[i]!;
      if (manca > 0 && ha.get(ti.id)! > (pagato[ti.id] ?? 0)) {
        pagato[ti.id] = (pagato[ti.id] ?? 0) + 1;
        manca -= ti.vale;
      }
      if (manca > 0) continue;
      const r = resto(-manca);
      const n = Object.values(pagato).reduce((a, b) => a + b, 0) + Object.values(r).reduce((a, b) => a + b, 0);
      if (!meglio || n < meglio.monete) meglio = { pagato, resto: r, monete: n };
    }
    // Always found: the smallest coin's candidate pays everything greedily (the total is enough).
    if (!meglio) return { ok: false };
    for (const [id, k] of Object.entries(meglio.pagato)) this.o.risorse.aggiungi(chi, chiaveMoneta(id), -k);
    for (const [id, k] of Object.entries(meglio.resto)) this.o.risorse.aggiungi(chi, chiaveMoneta(id), k);
    return { ok: true, pagato: meglio.pagato, resto: meglio.resto };
  }

  private voce(id: string): VoceCatalogo | null {
    return voce(this.s.catalogo, id);
  }

  private quanteDi(v: VoceCatalogo, n: number): string {
    return n === 1 ? v.nome : `${n} × ${v.nome}`;
  }

  /** `chi` gains (n > 0) or loses (n < 0) catalog items: found, given, used up, lost. */
  oggetto(chi: string, id: string, n: number): EsitoInventario {
    const v = this.voce(id);
    if (!this.s.catalogo || !this.o.schede.has(chi)) return { ok: false, fatto: '', motivo: 'senza_catalogo' };
    if (!v) return { ok: false, fatto: testo('prove.inventario.sconosciuto', { oggetto: id }), motivo: 'sconosciuto' };
    const ha = this.o.risorse.restanti(chi, chiaveOggetto(id)) ?? 0;
    if (n < 0 && ha < 1) return { ok: false, fatto: testo('prove.inventario.non_ha', { nome: this.o.nome(chi), oggetto: v.nome }), motivo: 'non_ha' };
    const prima = this.carico(chi);
    const dopo = this.o.risorse.aggiungi(chi, chiaveOggetto(id), n)!;
    // Gone from the pack: no longer worn.
    if (dopo === 0 && this.o.risorse.indossati(chi).has(id)) this.o.risorse.vesti(chi, id, false);
    this.rideriva(chi);
    this.o.log.info({ chi, oggetto: id, n, dopo }, 'inventory: item gained or lost');
    return { ok: true, fatto: testo(n >= 0 ? 'prove.inventario.prende' : 'prove.inventario.perde', { nome: this.o.nome(chi), oggetti: this.quanteDi(v, Math.abs(n === 0 ? 1 : n)) }) + this.cambioDiCarico(chi, prima) };
  }

  /**
   * `chi` gains coins (positive amounts: found, a reward) or pays them (negative: their worth, with change). A payment it
   * cannot make changes nothing.
   */
  aggiungiMonete(chi: string, m: Record<string, number>): EsitoInventario {
    const s = this.s.monete;
    if (!s || !this.o.schede.has(chi)) return { ok: false, fatto: '', motivo: 'senza_catalogo' };
    const piu = Object.fromEntries(Object.entries(m).filter(([, n]) => n > 0));
    const meno = Object.entries(m).filter(([, n]) => n < 0).reduce((x, [id, n]) => x + -n * (s.tagli.find((t) => t.id === id)?.vale ?? 0), 0);
    for (const id of Object.keys(m)) if (!s.tagli.some((t) => t.id === id)) return { ok: false, fatto: testo('prove.inventario.sconosciuto', { oggetto: id }), motivo: 'sconosciuto' };
    if (meno > 0) {
      const p = this.paga(chi, meno);
      if (!p.ok) return { ok: false, fatto: testo('prove.inventario.senza_monete', { nome: this.o.nome(chi), costo: scriviCosto(s, meno), ha: scriviCosto(s, this.valore(chi)) }), motivo: 'monete' };
    }
    for (const [id, n] of Object.entries(piu)) this.o.risorse.aggiungi(chi, chiaveMoneta(id), n);
    this.o.log.info({ chi, monete: m }, 'inventory: coins gained or paid');
    const valore = Object.entries(piu).reduce((x, [id, n]) => x + n * (s.tagli.find((t) => t.id === id)?.vale ?? 0), 0);
    if (valore > 0) this.o.trovate?.(chi, valore);
    const parti = [Object.keys(piu).length ? testo('prove.inventario.riceve', { nome: this.o.nome(chi), monete: this.scriviMonete(piu) }) : '', meno > 0 ? testo('prove.inventario.paga_monete', { nome: this.o.nome(chi), costo: scriviCosto(s, meno) }) : ''];
    return { ok: true, fatto: parti.filter(Boolean).join(' ') };
  }

  /** `chi` buys `n` of a catalog item at its price (or `prezzo`, in the smallest coin), paying with change. */
  compra(chi: string, id: string, n = 1, prezzo: number | null = null): EsitoInventario {
    const v = this.voce(id);
    const m = this.s.monete;
    if (!this.s.catalogo || !m || !this.o.schede.has(chi)) return { ok: false, fatto: '', motivo: 'senza_catalogo' };
    if (!v) return { ok: false, fatto: testo('prove.inventario.sconosciuto', { oggetto: id }), motivo: 'sconosciuto' };
    const costo = prezzo ?? (v.costo === null ? null : Math.ceil((v.costo * n) / v.confezione));
    if (costo === null) return { ok: false, fatto: testo('prove.inventario.senza_prezzo', { oggetto: v.nome }), motivo: 'senza_prezzo' };
    const prima = this.carico(chi);
    const p = this.paga(chi, costo);
    if (!p.ok) {
      this.o.log.info({ chi, oggetto: id, n, costo, ha: this.valore(chi) }, 'inventory: a purchase refused, not enough coins');
      return { ok: false, fatto: testo('prove.inventario.non_basta', { nome: this.o.nome(chi), oggetti: this.quanteDi(v, n), costo: scriviCosto(m, costo), ha: scriviCosto(m, this.valore(chi)) }), motivo: 'monete' };
    }
    this.o.risorse.aggiungi(chi, chiaveOggetto(id), n);
    this.rideriva(chi);
    const resto = Object.keys(p.resto).length ? testo('prove.inventario.resto', { resto: this.scriviMonete(p.resto) }) : '';
    this.o.log.info({ chi, oggetto: id, n, costo, pagato: p.pagato, resto: p.resto }, 'inventory: bought');
    return { ok: true, fatto: testo('prove.inventario.compra', { nome: this.o.nome(chi), oggetti: this.quanteDi(v, n), costo: scriviCosto(m, costo), resto }) + this.cambioDiCarico(chi, prima) };
  }

  /** `chi` sells `n` of an item for `prezzo` (in the smallest coin; the catalog price when not given). */
  vendi(chi: string, id: string, n = 1, prezzo: number | null = null): EsitoInventario {
    const v = this.voce(id);
    const m = this.s.monete;
    if (!this.s.catalogo || !m || !this.o.schede.has(chi)) return { ok: false, fatto: '', motivo: 'senza_catalogo' };
    if (!v) return { ok: false, fatto: testo('prove.inventario.sconosciuto', { oggetto: id }), motivo: 'sconosciuto' };
    if ((this.o.risorse.restanti(chi, chiaveOggetto(id)) ?? 0) < n) return { ok: false, fatto: testo('prove.inventario.non_ha', { nome: this.o.nome(chi), oggetto: v.nome }), motivo: 'non_ha' };
    const ricavo = prezzo ?? (v.costo === null ? null : Math.floor((v.costo * n) / v.confezione));
    if (ricavo === null) return { ok: false, fatto: testo('prove.inventario.senza_prezzo', { oggetto: v.nome }), motivo: 'senza_prezzo' };
    this.oggetto(chi, id, -n);
    // The proceeds in the price coins, largest first.
    let r = ricavo;
    const dato: Record<string, number> = {};
    for (const t of m.tagli.filter((x) => m.prezzi.includes(x.id))) {
      const k = Math.floor(r / t.vale);
      if (k > 0) {
        dato[t.id] = k;
        r -= k * t.vale;
        this.o.risorse.aggiungi(chi, chiaveMoneta(t.id), k);
      }
    }
    this.o.log.info({ chi, oggetto: id, n, ricavo }, 'inventory: sold');
    return { ok: true, fatto: testo('prove.inventario.vende', { nome: this.o.nome(chi), oggetti: this.quanteDi(v, n), prezzo: scriviCosto(m, ricavo) }) };
  }

  /**
   * `chi` puts on (or takes off) an armor or a shield it carries: one of each kind at a time, and never one its class or
   * race may not wear at all (`penalita.vietato`). The AC is derived again; the fact says the new one.
   */
  indossa(chi: string, id: string, indossato: boolean): EsitoInventario {
    const v = this.voce(id);
    const sch = this.o.schede.get(chi);
    if (!this.s.catalogo || !sch) return { ok: false, fatto: '', motivo: 'senza_catalogo' };
    if (!v) return { ok: false, fatto: testo('prove.inventario.sconosciuto', { oggetto: id }), motivo: 'sconosciuto' };
    if (v.tipo !== 'armatura' && v.tipo !== 'scudo') return { ok: false, fatto: testo('prove.inventario.non_indossabile', { oggetto: v.nome }), motivo: 'non_indossabile' };
    if ((this.o.risorse.restanti(chi, chiaveOggetto(id)) ?? 0) < 1) return { ok: false, fatto: testo('prove.inventario.non_ha', { nome: this.o.nome(chi), oggetto: v.nome }), motivo: 'non_ha' };
    if (indossato && penalitaDi(restrizioniViolate(this.s, sch, v)).vietato) return { ok: false, fatto: testo('prove.inventario.vietato', { nome: this.o.nome(chi), oggetto: v.nome }), motivo: 'vietato' };
    // One armor and one shield: wearing a new one takes off the other of its kind.
    const prima = this.carico(chi);
    const stessoTipo = [...this.o.risorse.indossati(chi)].filter((x) => x !== id && this.voce(x)?.tipo === v.tipo);
    this.o.risorse.vesti(chi, id, indossato, indossato ? stessoTipo : []);
    this.rideriva(chi);
    const ca = sch.difesa ?? difesaDa(this.s, sch, this.dotazione(chi))?.valore ?? null;
    this.o.log.info({ chi, oggetto: id, indossato, tolti: indossato ? stessoTipo : [], ca }, 'inventory: armor put on or taken off');
    return { ok: true, fatto: testo(indossato ? 'prove.inventario.indossa' : 'prove.inventario.toglie', { nome: this.o.nome(chi), oggetto: v.nome, ca: ca ?? '' }) + this.cambioDiCarico(chi, prima) };
  }
}
