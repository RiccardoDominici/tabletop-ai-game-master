/**
 * What a sheet's gear makes of its numbers (mechanism M2 of docs/regole-audit/; docs/regole.md §2, «Catalogo»): the
 * Armor Class from the worn armor and shield and the AC characteristic, and the attack lines from the carried weapons
 * with the damage characteristic, their range bands, ammunition and rate of fire, and the class and race restrictions
 * that apply to each. Pure functions over the set's catalog (regole/catalogo.ts) and a view of what the character has
 * now (`Dotazione`: the sheet's starting gear at load, the Engine's inventory in play, prove/inventario.ts).
 *
 * A sheet that lists no gear keeps the `difesa` and `attacchi` it writes by hand (a monster, a set without a catalog).
 */
import { chiave } from '../campagna/regole-srd';
import { testo } from '../lingua';
import { voce, type Arma, type Penalita, type Restrizione, type VoceCatalogo } from './catalogo';
import { valoreCaratteristica } from './schede';
import type { SchedaGenerica, SistemaRegole } from './tipi';

export type Attacco = SchedaGenerica['attacchi'][number];

/** What a character has right now: how many of each catalog id, and which armor and shield it wears. */
export interface Dotazione {
  quante(id: string): number;
  indossati: ReadonlySet<string>;
}

/** A sheet's starting gear as a `Dotazione` (regole/schede.ts reads `scheda.equipaggiamento`). */
export function dotazioneIniziale(sch: Pick<SchedaGenerica, 'equipaggiamento'>): Dotazione {
  const n = new Map<string, number>();
  const indossati = new Set<string>();
  for (const e of sch.equipaggiamento ?? []) {
    n.set(e.id, (n.get(e.id) ?? 0) + e.quante);
    if (e.indossato) indossati.add(e.id);
  }
  return { quante: (id) => n.get(id) ?? 0, indossati };
}

/** The restrictions of the sheet's class and race that this item breaks (empty = it may use it freely). */
export function restrizioniViolate(s: SistemaRegole, sch: Pick<SchedaGenerica, 'classe' | 'razza'>, v: VoceCatalogo): Restrizione[] {
  return (s.catalogo?.restrizioni ?? []).filter((r) => {
    if ((r.classe && r.classe !== sch.classe) || (r.razza && r.razza !== sch.razza) || r.cosa !== v.tipo) return false;
    if (r.ammessi && !r.ammessi.includes(v.id)) return true;
    if (r.ammessiProprieta && !v.proprieta.some((p) => r.ammessiProprieta!.includes(p))) return true;
    if (r.ammessiCategorie && v.tipo === 'armatura' && !r.ammessiCategorie.includes(v.categoria)) return true;
    if (r.vietati?.includes(v.id)) return true;
    return !!(r.vietatiTaglie && v.tipo === 'arma' && v.taglia && r.vietatiTaglie.includes(v.taglia));
  });
}

/** The penalties of those restrictions, merged (attack penalties add up). */
export function penalitaDi(violate: readonly Restrizione[]): Penalita {
  const p: Penalita = {};
  for (const r of violate) {
    if (r.penalita.attacco) p.attacco = (p.attacco ?? 0) + r.penalita.attacco;
    if (r.penalita.vietato) p.vietato = true;
    if (r.penalita.senzaIncantesimi) p.senzaIncantesimi = p.senzaIncantesimi === 'perso' ? 'perso' : r.penalita.senzaIncantesimi;
    if (r.penalita.perdeIncantesimi) p.perdeIncantesimi = true;
    if (r.penalita.senzaAbilita) p.senzaAbilita = [...new Set([...(p.senzaAbilita ?? []), ...r.penalita.senzaAbilita])];
  }
  return p;
}

/** The armor and shield the character wears now (catalog entries), the first of each kind. */
export function indossate(s: SistemaRegole, d: Dotazione): { armatura: Extract<VoceCatalogo, { tipo: 'armatura' }> | null; scudo: Extract<VoceCatalogo, { tipo: 'scudo' }> | null } {
  let armatura: Extract<VoceCatalogo, { tipo: 'armatura' }> | null = null;
  let scudo: Extract<VoceCatalogo, { tipo: 'scudo' }> | null = null;
  for (const id of d.indossati) {
    const v = voce(s.catalogo, id);
    if (d.quante(id) < 1) continue;
    if (v?.tipo === 'armatura' && !armatura) armatura = v;
    if (v?.tipo === 'scudo' && !scudo) scudo = v;
  }
  return { armatura, scudo };
}

/**
 * The Armor Class the gear gives: the worn armor's AC (or the set's AC without armor) plus the AC characteristic's
 * bonus (capped by the armor's `max_caratteristica`) plus the worn shield. Null when the set has no catalog.
 */
export function difesaDa(s: SistemaRegole, sch: SchedaGenerica, d: Dotazione): { valore: number; da: string } | null {
  const c = s.catalogo;
  if (!c) return null;
  const { armatura, scudo } = indossate(s, d);
  const mod = c.difesa.caratteristica ? valoreCaratteristica(s, sch, c.difesa.caratteristica) : 0;
  const conta = armatura?.maxCaratteristica !== null && armatura?.maxCaratteristica !== undefined ? Math.min(mod, armatura.maxCaratteristica) : mod;
  const valore = (armatura ? armatura.ca : c.difesa.senzaArmatura) + conta + (scudo?.bonus ?? 0);
  const parti = [armatura?.nome ?? testo('prove.equipaggiamento.senza_armatura'), ...(scudo ? [scudo.nome] : [])];
  return { valore, da: parti.join(' + ') };
}

const conBonus = (f: Attacco['danno'], n: number): Attacco['danno'] => ({ ...f, bonus: f.bonus + n });

/** The attack lines of one weapon: melee, two-handed, missile, thrown (those it has). */
function lineeDiArma(s: SistemaRegole, sch: SchedaGenerica, a: Arma): Attacco[] {
  const c = s.catalogo!;
  const p = penalitaDi(restrizioniViolate(s, sch, a));
  if (p.vietato) return [];
  const car = c.dannoCaratteristica ? valoreCaratteristica(s, sch, c.dannoCaratteristica) : 0;
  const tipo = (k: 'mischia' | 'distanza'): Pick<Attacco, 'abilita' | 'caratteristica'> => {
    const id = c.abilita[k];
    if (id && s.abilita.some((x) => x.id === id)) return { abilita: id, caratteristica: null };
    if (id && s.caratteristiche.some((x) => x.id === id)) return { abilita: null, caratteristica: id };
    return { abilita: null, caratteristica: null };
  };
  const extra = { arma: a.id, ...(p.attacco ? { penalita: p.attacco } : {}), ...(p.perdeIncantesimi ? { perdeIncantesimi: true } : {}) };
  const linea = (nome: string, danno: Attacco['danno'], distanza: boolean, altro: Partial<Attacco> = {}): Attacco => ({ id: chiave(nome), nome, danno, tipo_danno: null, distanza, ...tipo(distanza ? 'distanza' : 'mischia'), ...extra, ...altro });
  const out: Attacco[] = [];
  if (a.mischia) out.push(linea(a.nome, conBonus(a.danno, car), false));
  if (a.aDueMani) out.push(linea(a.aDueMani.nome ?? testo('prove.equipaggiamento.a_due_mani', { nome: a.nome }), conBonus(a.aDueMani.danno, car), false));
  if (a.gittate) out.push(linea(a.nome, a.forzaAlDanno ? conBonus(a.danno, car) : a.danno, true, { gittate: a.gittate, ...(a.munizioni.length ? { munizioni: a.munizioni } : {}), ...(a.ricarica > 1 ? { ricarica: a.ricarica } : {}) }));
  if (a.lancio) out.push(linea(a.lancio.nome ?? testo('prove.equipaggiamento.lanciato', { nome: a.nome }), conBonus(a.lancio.danno ?? a.danno, car), true, { gittate: a.lancio.gittate }));
  return out;
}

/**
 * The attack lines the gear gives, in the order the weapons are listed, then the sheet's own lines (special attacks,
 * natural weapons). An own line that names a catalog weapon (`arma:`) takes its damage, bands and ammunition from it,
 * with its own ability (the thief's sneak attack with a short sword).
 */
export function attacchiDa(s: SistemaRegole, sch: SchedaGenerica, d: Dotazione): Attacco[] {
  if (!s.catalogo) return sch.attacchiPropri ?? sch.attacchi;
  const ordine = [...new Set((sch.equipaggiamento ?? []).map((e) => e.id))];
  // Weapons picked up in play (not on the starting sheet) come after the sheet's own.
  for (const v of s.catalogo.voci) if (v.tipo === 'arma' && d.quante(v.id) > 0 && !ordine.includes(v.id)) ordine.push(v.id);
  const out: Attacco[] = [];
  for (const id of ordine) {
    const a = voce(s.catalogo, id);
    if (a?.tipo !== 'arma' || d.quante(id) < 1) continue;
    for (const l of lineeDiArma(s, sch, a)) if (!out.some((x) => x.id === l.id)) out.push(l);
  }
  for (const l of sch.attacchiPropri ?? []) {
    const a = l.arma ? voce(s.catalogo, l.arma) : null;
    if (l.arma && (a?.tipo !== 'arma' || d.quante(l.arma) < 1)) continue;
    const base = a?.tipo === 'arma' ? lineeDiArma(s, sch, a).find((x) => x.distanza === l.distanza) : undefined;
    const propria: Attacco = base ? { ...base, id: l.id, nome: l.nome, abilita: l.abilita ?? base.abilita, caratteristica: l.abilita ? null : (l.caratteristica ?? base.caratteristica) } : l;
    const i = out.findIndex((x) => x.id === propria.id);
    if (i >= 0) out[i] = propria;
    else out.push(propria);
  }
  return out;
}

/**
 * Re-derive a sheet's AC and attack lines from its gear now (in place: the Engine's own copy of the sheet, so every
 * reader — attacks, traps' attacks, the arbiter's weapon list — sees the same numbers). A sheet without gear keeps
 * what it writes. Returns the AC's description for the panel, or null.
 */
export function applicaDotazione(s: SistemaRegole, sch: SchedaGenerica, d: Dotazione): string | null {
  if (!s.catalogo || !sch.equipaggiamento) return null;
  const vestito = indossate(s, d);
  // A sheet with its own typed AC (a monster) keeps it, plus a shield it picks up; only a worn armor replaces it.
  const dif = sch.difesaPropria && !vestito.armatura ? null : difesaDa(s, sch, d);
  sch.difesa = dif?.valore ?? (sch.difesaScritta !== null && sch.difesaScritta !== undefined ? sch.difesaScritta + (vestito.scudo?.bonus ?? 0) : null);
  sch.attacchi = attacchiDa(s, sch, d);
  return dif?.da ?? null;
}

/** The penalties that apply now from what the character wears (armor and shield): no spells, abilities blocked. */
export function penalitaIndossate(s: SistemaRegole, sch: SchedaGenerica, d: Dotazione): Penalita & { motivi: string[] } {
  const { armatura, scudo } = indossate(s, d);
  const violate = [armatura, scudo].flatMap((v) => (v ? restrizioniViolate(s, sch, v).map((r) => ({ r, v })) : []));
  return { ...penalitaDi(violate.map((x) => x.r)), motivi: [...new Set(violate.map((x) => x.v.nome))] };
}
