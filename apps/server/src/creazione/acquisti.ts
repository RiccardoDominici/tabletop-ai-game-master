/**
 * Buying the starting equipment (docs/creazione.md; Basic Fantasy p. 3: «purchase equipment … note how much money
 * remains»), with the Engine's own inventory (prove/inventario.ts): the same prices, packs, change, weights, load bands
 * and movement as in play, and the same AC and attack lines (regole/equipaggiamento.ts). The draft keeps the list of
 * purchases; every view replays them on the rolled coins, so taking one back returns exactly what it cost.
 */
import { loggerMuto } from '../logger';
import { Inventario } from '../prove/inventario';
import { Risorse } from '../prove/risorse';
import { scriviCosto, voce, type VoceCatalogo } from '../regole/catalogo';
import { penalitaDi, restrizioniViolate } from '../regole/equipaggiamento';
import type { SchedaGenerica } from '../regole/tipi';
import { testo } from '../lingua';
import { moneteTirate, schedaLetta, type Bozza, type CtxCreazione } from './bozza';

export interface StatoAcquisti {
  /** The coins left after every purchase (by coin id; the tracked ones). */
  monete: Record<string, number>;
  /** The draft's sheet read by the Engine with what was bought: AC and attack lines derived. */
  sch: SchedaGenerica;
  inventario: Inventario;
  /** The index of the first purchase that could not be paid (a replay after the coins changed), or null. */
  nonPagato: number | null;
}

/** Replays the draft's purchases on its rolled coins (the Engine's inventory on a sheet of its own). */
export function rigioca(ctx: CtxCreazione, b: Bozza, acquisti = b.acquisti): StatoAcquisti {
  const iniziali = moneteTirate(ctx, b) ?? {};
  // The sheet starts with no gear and the rolled coins; each purchase is paid as at the counter.
  const sch = schedaLetta(ctx, { ...b, acquisti: [] }, iniziali);
  const schede = new Map([[sch.id, sch]]);
  const risorse = new Risorse(ctx.s, schede);
  const inventario = new Inventario({ sistema: ctx.s, schede, risorse, nome: () => b.descrizione.nome || b.id, log: loggerMuto() });
  let nonPagato: number | null = null;
  for (const [i, a] of acquisti.entries()) {
    const e = inventario.compra(sch.id, a.id, a.quante);
    if (!e.ok && nonPagato === null) nonPagato = i;
  }
  // The sheet with its gear as the session will read it (the first armor and shield worn), and an inventory on it, so
  // the load and the movement count the worn armor as play will.
  const comprati = acquisti.slice(0, nonPagato ?? acquisti.length);
  const monete = Object.fromEntries(inventario.monete(sch.id).map((m) => [m.id, m.quante]));
  const finale = schedaLetta(ctx, { ...b, acquisti: comprati }, monete);
  const schedeFinali = new Map([[finale.id, finale]]);
  const sulFinale = new Inventario({ sistema: ctx.s, schede: schedeFinali, risorse: new Risorse(ctx.s, schedeFinali), nome: () => b.descrizione.nome || b.id, log: loggerMuto() });
  return { monete, sch: finale, inventario: sulFinale, nonPagato };
}

/** Why the race or class may not use an item at all (`vietato`), and the penalty it gets otherwise. */
export function restrizioniDi(ctx: CtxCreazione, b: Bozza, v: VoceCatalogo): { vietato: string | null; penalita: string | null } {
  const violate = restrizioniViolate(ctx.s, { classe: b.classe, razza: b.razza }, v);
  if (!violate.length) return { vietato: null, penalita: null };
  const p = penalitaDi(violate);
  const chi = violate.map((r) => (r.classe ? (ctx.s.classi ?? []).find((c) => c.id === r.classe)?.nome ?? r.classe : (ctx.s.razze ?? []).find((x) => x.id === r.razza)?.nome ?? r.razza ?? '')).join(', ');
  if (p.vietato) return { vietato: testo('creazione.acquisti.vietato', { chi }), penalita: null };
  const parti: string[] = [];
  if (p.attacco) parti.push(testo('creazione.acquisti.penalita_attacco', { n: p.attacco > 0 ? `+${p.attacco}` : `−${-p.attacco}` }));
  if (p.senzaIncantesimi) parti.push(testo('creazione.acquisti.penalita_incantesimi'));
  if (p.senzaAbilita?.length) parti.push(testo('creazione.acquisti.penalita_abilita', { abilita: p.senzaAbilita.map((a) => ctx.s.abilita.find((x) => x.id === a)?.nome ?? a).join(', ') }));
  if (p.perdeIncantesimi) parti.push(testo('creazione.acquisti.penalita_perde'));
  return { vietato: null, penalita: `${chi}: ${parti.join('; ')}` };
}

/** The price of a pack as the manual writes it («10 mo»). */
export function costoScritto(ctx: CtxCreazione, v: VoceCatalogo): string {
  return v.costo === null || !ctx.s.monete ? '—' : scriviCosto(ctx.s.monete, v.costo);
}

/** A catalog item by id, or null. */
export const voceDi = (ctx: CtxCreazione, id: string): VoceCatalogo | null => voce(ctx.s.catalogo, id);
