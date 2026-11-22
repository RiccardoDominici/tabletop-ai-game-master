/**
 * A PC being built at the table (docs/creazione.md; mechanism M7): the draft's data, kept as plain JSON (the store saves
 * it after every change), and the rules that read it — the scores with the race's adjustments, the races and classes
 * the scores open, the hit points, the money, the sheet the draft makes. Deterministic: the choices are the player's,
 * the legality is the set's (regole/creazione.ts, regole/controllo-pg.ts), nothing here asks a model.
 *
 * The steps run in the set's order (`creazione.passi`); a step depends on the ones it reads (`DIPENDE`), so undoing one
 * resets the steps after it that read it (the race resets the class, the class resets its hit points and spells).
 */
import type { PassoCreazione, StatoPassoCreazione } from '@tabletop-ai-gm/shared';
import { requisitiMancati } from '../regole/requisiti';
import type { MetodoCaratteristiche, RegolaCreazione } from '../regole/creazione';
import { puntiFeritaDelLivello, sogliaPx } from '../regole/progressione';
import { rigaAlLivello } from '../regole/salvezze';
import { bonusDaTabella, leggiSchedaGenerica, valoreCaratteristica } from '../regole/schede';
import type { Classe } from '../regole/classi';
import type { Razza, Tratto } from '../regole/tratti';
import type { SchedaGenerica, SistemaRegole } from '../regole/tipi';
import type { DatiYaml } from '../campagna/tipi';
import type { FormulaDadi } from '../campagna/regole-srd';

/** One roll entered or rolled, in order: what it was for, the dice, who rolled them. */
export interface TiroCreazione {
  passo: PassoCreazione;
  per: string;
  dadi: number[];
  manuale: boolean;
}

export interface Bozza {
  versione: 1;
  id: string;
  /** The phone's device token (telefono/memoria): one draft per phone. Never logged whole. */
  dispositivo: string;
  creata: string;
  stato: 'in_corso' | 'pronta' | 'approvata';
  idPg: string | null;
  /** The Engine's own dice for this draft (automatic rolls): never the session's (prove/dadi.ts). */
  seme: string;
  contatore: number;
  passi: Partial<Record<PassoCreazione, StatoPassoCreazione>>;
  tiri: TiroCreazione[];
  /** The scores' rolls, in order (with `ordine: fisso` each names its characteristic). */
  tiriCaratteristiche: Array<{ caratteristica: string | null; dadi: number[]; punteggio: number }>;
  /** The generated scores before the race's adjustments (null until all are set). */
  base: Record<string, number> | null;
  /** The scores as rolled or placed, before the Game Master's options (an «indietro» goes back to them). */
  baseGrezza: Record<string, number> | null;
  /** How many times each option was used. */
  opzioniUsate: Record<string, number>;
  razza: string | null;
  classe: string | null;
  /** The hit dice by level from 1 (null = nothing rolled: the die's maximum, or fixed points). */
  dadiPf: Array<number[] | null>;
  dadiMonete: number[] | null;
  /** The purchases in order (replayed on the rolled coins, so an undo gives back exactly what was paid). */
  acquisti: Array<{ id: string; quante: number }>;
  libro: string[];
  preparati: string[];
  lingue: string[];
  descrizione: { nome: string; aspetto: string; concetto: string; pronomi: string };
}

/** What each step reads: undoing a step resets the steps that read it, directly or not. */
export const DIPENDE: Record<PassoCreazione, PassoCreazione[]> = {
  caratteristiche: [],
  razza: ['caratteristiche'],
  classe: ['caratteristiche', 'razza'],
  incantesimi: ['classe'],
  punti_ferita: ['caratteristiche', 'razza', 'classe'],
  monete: [],
  acquisti: ['monete', 'razza', 'classe'],
  lingue: ['caratteristiche', 'razza'],
  descrizione: [],
};

/** The steps whose results are dice: a player cannot undo what they depend on once rolled (the Game Master can). */
export const PASSI_DI_DADI: ReadonlySet<PassoCreazione> = new Set(['caratteristiche', 'punti_ferita', 'monete']);

/** The campaign's choices on top of the set (campagna.yaml → regole.creazione; campagna/creazione-opzioni.ts). */
export interface OpzioniCampagnaCreazione {
  modo: 'pregenerati' | 'al_tavolo' | 'entrambi';
  /** The ability method (one of the set's; default the set's first). */
  metodo: string | null;
  /** The Game Master's options allowed (ids of the set's `opzioni`); none by default (p. 186: never demanded). */
  opzioni: string[];
  /** The hopeless character's remedies allowed (default: the set's). */
  rimedi: Array<'ritira' | 'ribalta'> | null;
  puntiFerita: 'tira' | 'massimo' | null;
  livello: number | null;
  /** Who picks a caster's starting spells (default: the set's `come`). */
  incantesimi: 'scelta' | 'master' | 'tiro' | null;
}

/** Everything a draft's rules need: the set, its procedure, the campaign's options, the roll mode. */
export interface CtxCreazione {
  s: SistemaRegole;
  cr: RegolaCreazione;
  opz: OpzioniCampagnaCreazione;
  /** The players enter real dice (regole.tiri_giocatori: manuale); false = the Engine rolls. */
  manuale: boolean;
}

export function nuovaBozza(id: string, dispositivo: string, seme: string, adesso: Date): Bozza {
  return {
    versione: 1,
    id,
    dispositivo,
    creata: adesso.toISOString(),
    stato: 'in_corso',
    idPg: null,
    seme,
    contatore: 0,
    passi: {},
    tiri: [],
    tiriCaratteristiche: [],
    base: null,
    baseGrezza: null,
    opzioniUsate: {},
    razza: null,
    classe: null,
    dadiPf: [],
    dadiMonete: null,
    acquisti: [],
    libro: [],
    preparati: [],
    lingue: [],
    descrizione: { nome: '', aspetto: '', concetto: '', pronomi: '' },
  };
}

/** The level the PC starts at: the campaign's, else the set's. */
export const livelloIniziale = (ctx: CtxCreazione): number => ctx.opz.livello ?? ctx.cr.livello;

/** The method the campaign uses (its `metodo`, else the set's first). */
export function metodo(ctx: CtxCreazione): MetodoCaratteristiche {
  return ctx.cr.metodi.find((m) => m.id === ctx.opz.metodo) ?? ctx.cr.metodi[0]!;
}

export const statoPasso = (b: Bozza, p: PassoCreazione): StatoPassoCreazione => b.passi[p] ?? 'da_fare';
export const fatto = (b: Bozza, p: PassoCreazione): boolean => statoPasso(b, p) !== 'da_fare';

/** The first step not done yet, in the set's order (null = all done). */
export function passoCorrente(ctx: CtxCreazione, b: Bozza): PassoCreazione | null {
  return ctx.cr.passi.find((p) => !fatto(b, p)) ?? null;
}

/** Every step that reads `p`, directly or through another (the ones an undo of `p` resets), in the set's order. */
export function dipendenti(ctx: CtxCreazione, p: PassoCreazione): PassoCreazione[] {
  const out = new Set<PassoCreazione>();
  let cambiato = true;
  while (cambiato) {
    cambiato = false;
    for (const q of ctx.cr.passi) {
      if (q === p || out.has(q)) continue;
      if (DIPENDE[q].some((d) => d === p || out.has(d))) {
        out.add(q);
        cambiato = true;
      }
    }
  }
  return ctx.cr.passi.filter((q) => out.has(q));
}

export const razzaDi = (ctx: CtxCreazione, id: string | null): Razza | undefined => (id ? (ctx.s.razze ?? []).find((r) => r.id === id) : undefined);
export const classeDi = (ctx: CtxCreazione, id: string | null): Classe | undefined => (id ? (ctx.s.classi ?? []).find((c) => c.id === id) : undefined);

/** The scores with a race's adjustments (the chosen race, or `razza` to try one); null until all are set. */
export function punteggi(ctx: CtxCreazione, b: Bozza, razza: string | null = b.razza): Record<string, number> | null {
  if (!b.base) return null;
  const agg = razzaDi(ctx, razza)?.aggiustamenti ?? {};
  return Object.fromEntries(Object.entries(b.base).map(([k, v]) => [k, v + (agg[k] ?? 0)]));
}

/** The bonus of a score by the set's table (or the SRD's formula), as a roll reads it. */
export function bonusDi(ctx: CtxCreazione, punteggio: number): number {
  if (ctx.s.modificatore === 'tabella') return bonusDaTabella(ctx.s.tabellaModificatori ?? [], punteggio);
  if (ctx.s.modificatore === 'srd') return Math.floor((punteggio - 10) / 2);
  return punteggio;
}

/** Why a race is closed to these scores (the first requirement missed), or null. */
export function motivoRazza(ctx: CtxCreazione, b: Bozza, r: Razza): { caratteristica: string; valore: number; limite: string } | null {
  const p = punteggi(ctx, b, r.id);
  const m = p ? requisitiMancati(r.requisiti, p)[0] : undefined;
  return m ? { caratteristica: nomeCaratteristica(ctx, m.caratteristica), valore: m.valore, limite: m.min !== null && m.valore < m.min ? `≥ ${m.min}` : `≤ ${m.max}` } : null;
}

/** Why a class is closed to this draft: the race's allow-list or a requirement; null = open. */
export function motivoClasse(ctx: CtxCreazione, b: Bozza, c: Classe, razza: string | null = b.razza): { tipo: 'razza'; razza: string } | { tipo: 'requisito'; caratteristica: string; valore: number; limite: string } | null {
  const r = razzaDi(ctx, razza);
  if (r?.classi && !r.classi.includes(c.id)) return { tipo: 'razza', razza: r.nome };
  const p = punteggi(ctx, b, razza);
  const m = p ? requisitiMancati(c.requisiti, p)[0] : undefined;
  return m ? { tipo: 'requisito', caratteristica: nomeCaratteristica(ctx, m.caratteristica), valore: m.valore, limite: m.min !== null && m.valore < m.min ? `≥ ${m.min}` : `≤ ${m.max}` } : null;
}

/**
 * The hopeless character (Basic Fantasy pp. 186–187): with these scores no race and class of the set fit together.
 * Without races, any class; without classes, never hopeless.
 */
export function senzaSperanza(ctx: CtxCreazione, b: Bozza): boolean {
  if (!b.base || !(ctx.s.classi ?? []).length) return false;
  const razze = (ctx.s.razze ?? []).length ? ctx.s.razze! : [null];
  for (const r of razze) {
    if (r && motivoRazza(ctx, b, r)) continue;
    if ((ctx.s.classi ?? []).some((c) => !motivoClasse(ctx, b, c, r?.id ?? null))) return false;
  }
  return true;
}

export const nomeCaratteristica = (ctx: CtxCreazione, id: string): string => ctx.s.caratteristiche.find((c) => c.id === id)?.nome ?? id;

/** The traits that change hit points (a race's d6 cap): the race's and the class's. */
function trattiPf(ctx: CtxCreazione, b: Bozza): Tratto[] {
  return [...(razzaDi(ctx, b.razza)?.tratti ?? []), ...(classeDi(ctx, b.classe)?.tratti ?? [])];
}

/** What each level from 1 to the starting level adds: the die (with its bonus and minimum) or fixed points. */
export function pfPerLivello(ctx: CtxCreazione, b: Bozza): Array<{ livello: number; dado: FormulaDadi | null; fissi: number; bonus: number; minimo: number; tira: boolean }> {
  const c = classeDi(ctx, b.classe);
  const p = punteggi(ctx, b);
  if (!c || !p) return [];
  const car = ctx.s.progressione?.puntiFerita.caratteristica;
  const bonus = car && p[car] !== undefined ? bonusDi(ctx, p[car]) : 0;
  const massimo = (ctx.opz.puntiFerita ?? ctx.cr.puntiFerita) === 'massimo';
  const out = [];
  for (let l = 1; l <= livelloIniziale(ctx); l++) {
    const x = puntiFeritaDelLivello(ctx.s.progressione, c.progressione, l, bonus, trattiPf(ctx, b));
    if (!x) return [];
    out.push({ livello: l, ...x, tira: !!x.dado && !(massimo && l === 1) });
  }
  return out;
}

/** The hit points of each level so far (null = not rolled yet), and the total when all are in. */
export function puntiFerita(ctx: CtxCreazione, b: Bozza): { livelli: Array<number | null>; totale: number | null } {
  const livelli = pfPerLivello(ctx, b).map((x, i) => {
    if (!x.dado) return x.fissi;
    const dadi = x.tira ? b.dadiPf[i] : [x.dado.facce];
    if (!dadi) return null;
    return Math.max(x.minimo, dadi.reduce((a, d) => a + d, 0) + x.bonus);
  });
  return { livelli, totale: livelli.length && livelli.every((n) => n !== null) ? livelli.reduce<number>((a, n) => a + n!, 0) : null };
}

/** The starting money in the procedure's coin, once rolled. */
export function moneteTirate(ctx: CtxCreazione, b: Bozza): Record<string, number> | null {
  const m = ctx.cr.monete;
  if (!m || !b.dadiMonete) return null;
  return { [m.moneta]: (b.dadiMonete.reduce((a, d) => a + d, 0) + m.dadi.bonus) * m.per };
}

/** The class's spells per day at the starting level (by spell level). */
export function slotIniziali(ctx: CtxCreazione, b: Bozza): number[] {
  const c = classeDi(ctx, b.classe);
  return c?.incantesimiAlGiorno.length ? (rigaAlLivello(c.incantesimiAlGiorno, livelloIniziale(ctx))?.slot ?? []) : [];
}

/** The class's spells (id, name, its spell level), in the set's order. */
export function incantesimiDellaClasse(ctx: CtxCreazione, classe: string): Array<{ id: string; nome: string; livello: number }> {
  return (ctx.s.poteri ?? []).flatMap((p) => (p.tipo === 'incantesimo' && p.livello[classe] !== undefined ? [{ id: p.id, nome: p.nome, livello: p.livello[classe]! }] : []));
}

/**
 * The raw sheet the draft makes (an entry's `scheda` in pg.yaml): only what is decided so far. The Engine reads it like
 * any PC's (regole/schede.ts: AC and attack lines from the gear, numbers from the class tables).
 */
export function schedaGrezza(ctx: CtxCreazione, b: Bozza, monete: Record<string, number> | null): DatiYaml {
  const p = punteggi(ctx, b);
  const livello = livelloIniziale(ctx);
  const c = classeDi(ctx, b.classe);
  const pf = puntiFerita(ctx, b).totale;
  const prepara = ctx.s.magia?.preparazione !== 'slot';
  return {
    caratteristiche: p ?? Object.fromEntries(ctx.s.caratteristiche.map((x) => [x.id, 10])),
    ...(b.classe ? { classe: b.classe } : {}),
    livello,
    ...(c ? { px: sogliaPx(c.progressione, livello) ?? 0 } : {}),
    ...(b.razza ? { razza: b.razza } : {}),
    ...(pf !== null ? { pf } : {}),
    ...(ctx.s.catalogo ? { equipaggiamento: unisci(b.acquisti) } : {}),
    ...(monete ? { monete } : {}),
    ...(b.libro.length ? { libro: [...b.libro] } : {}),
    ...(b.preparati.length || (b.libro.length && !prepara) ? { incantesimi: prepara ? [...b.preparati] : [...b.libro] } : {}),
    ...(b.lingue.length ? { lingue: [...b.lingue] } : {}),
  };
}

/** The purchases merged by item, in the order first bought (the first armor and shield are the worn ones). */
export function unisci(acquisti: ReadonlyArray<{ id: string; quante: number }>): Array<{ id: string; quante: number } | string> {
  const n = new Map<string, number>();
  for (const a of acquisti) n.set(a.id, (n.get(a.id) ?? 0) + a.quante);
  return [...n].filter(([, q]) => q > 0).map(([id, quante]) => (quante === 1 ? id : { id, quante }));
}

/** The draft's sheet read by the Engine (for AC, attack lines, the check), with the coins given. */
export function schedaLetta(ctx: CtxCreazione, b: Bozza, monete: Record<string, number> | null): SchedaGenerica {
  return leggiSchedaGenerica(ctx.s, `bozza_${b.id}`, b.descrizione.nome || b.id, false, schedaGrezza(ctx, b, monete))!;
}

/** How many languages beyond the race's the draft may choose (the bonus of the procedure's characteristic). */
export function lingueExtra(ctx: CtxCreazione, b: Bozza): number {
  const car = ctx.cr.lingue?.caratteristica;
  const p = punteggi(ctx, b);
  if (!car || !p) return 0;
  return Math.max(0, valoreCaratteristica(ctx.s, { caratteristiche: p } as SchedaGenerica, car));
}
