/**
 * The item catalog of a rule set (docs/regole.md §2, «Catalogo»; mechanism M2 of docs/regole-audit/): the manual's coins,
 * weapons, armor, shields, ammunition and adventuring gear, with their weight, price and properties, and the class and
 * race restrictions on them. A sheet lists the catalog ids it carries (`scheda.equipaggiamento`, regole/schede.ts); the
 * Engine derives the Armor Class and the attack lines from them (regole/equipaggiamento.ts) and tracks what is carried
 * and spent (prove/inventario.ts). Nothing here is a number of a particular manual: Basic Fantasy is one set's data.
 *
 *   monete:
 *     base: mo                                   # the coin the prices are written in when they name none
 *     peso: {quante: 20, peso: 1}                # optional: 20 coins weigh 1 unit of carico.unita (Basic Fantasy p. 10)
 *     prezzi: [mo, ma, mr]                       # optional: the coins prices are written in and change is given in
 *     tagli:                                     # each coin's worth in the smallest one (whose `vale` is 1)
 *       - {id: mo, nome: "Monete d'oro", vale: 100}
 *       - {id: mr, nome: "Monete di rame", vale: 1}
 *   catalogo:
 *     difesa: {senza_armatura: 11, caratteristica: destrezza}   # AC without armor, and what adds to it
 *     abilita: {mischia: mischia, distanza: distanza}            # the set's attack abilities for each kind of line
 *     danno_caratteristica: forza                                # added to melee and thrown damage
 *     gittate:                                                   # range bands, nearest first (p. 11)
 *       unita: metri
 *       parole_unita: [metri, metro, m]
 *       fasce: [{id: corta, nome: "Gittata corta", bonus: 1, parole: [da vicino]}, {id: media, nome: "Gittata media", bonus: 0}, …]
 *       predefinita: media
 *     armi: [{id, nome, danno, taglia, mani, peso, costo, proprieta, gittate, lancio, munizioni, ricarica, a_due_mani}]
 *     armature: [{id, nome, ca, categoria, max_caratteristica, peso, costo}]
 *     scudi: [{id, nome, bonus, peso, costo}]
 *     munizioni: [{id, nome, peso, costo, confezione, danno}]          # danno: a shot's damage with it (a sling stone 1d3)
 *     attrezzatura: [{id, nome, peso, costo, confezione, capienza, luce: {raggio, fioca, durata, unita, consuma}}]
 *     restrizioni: [{classe | razza, cosa: arma | armatura | scudo, ammessi | ammessi_proprieta | ammessi_categorie |
 *                    vietati | vietati_taglie, penalita: {attacco | vietato | senza_incantesimi | senza_abilita | perde_incantesimi}}]
 *
 * `costo` is a number in the base coin or a string «15 ma» (amount and coin id); `peso` and `costo` are for a pack of
 * `confezione` items (torches: 6 for 1 gp), so one item weighs and costs that much divided by `confezione`.
 */
import { leggiFormula, type FormulaDadi } from '../campagna/regole-srd';

const ID = /^[a-z0-9_]+$/;
type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const testoDi = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const ids = (v: unknown): string[] | null => (Array.isArray(v) && v.every((x) => typeof x === 'string' && ID.test(x)) ? (v as string[]) : null);

export interface Taglio {
  id: string;
  nome: string;
  /** Worth in the smallest coin (whose `vale` is 1). */
  vale: number;
}

export interface Monete {
  /** The coin prices are written in when they name none. */
  base: string;
  /** Coins from the most valuable down. */
  tagli: Taglio[];
  /** How many coins weigh `peso` units of the load (null = coins weigh nothing). */
  peso: { quante: number; peso: number } | null;
  /** The coins prices are written in and change is given in (default: the base and every coin below it). */
  prezzi: string[];
}

/** What every catalog entry has: weight and price of a pack of `confezione` items, free tags. */
export interface VoceBase {
  id: string;
  nome: string;
  /** Weight of a pack, in `carico.unita`; one item weighs `peso / confezione`. */
  peso: number;
  /** Price of a pack in the smallest coin (null = not for sale: a sling stone). */
  costo: number | null;
  confezione: number;
  proprieta: string[];
}

export interface Arma extends VoceBase {
  tipo: 'arma';
  danno: FormulaDadi;
  /** Size id (Basic Fantasy S, M, L): race restrictions read it. */
  taglia: string | null;
  mani: 1 | 2;
  /** Used in melee (a bow is not). */
  mischia: boolean;
  /** A missile weapon's band limits, one per `catalogo.gittate.fasce` (null = not a missile weapon). */
  gittate: number[] | null;
  /** A melee weapon that can also be thrown: its band limits and the line's name. */
  lancio: { gittate: number[]; nome: string | null; danno: FormulaDadi | null } | null;
  /** Ammunition ids it shoots (each shot spends one of the first the bearer has). */
  munizioni: string[];
  /** Rate of fire: it shoots once every this many rounds (Basic Fantasy's crossbows, p. 54). 1 = every round. */
  ricarica: number;
  /** The characteristic's damage bonus counts on its missile line too (Basic Fantasy's sling, p. 55). */
  forzaAlDanno: boolean;
  /** A versatile weapon's two-handed line (the spear, p. 11). */
  aDueMani: { danno: FormulaDadi; nome: string | null } | null;
}

export interface Armatura extends VoceBase {
  tipo: 'armatura';
  ca: number;
  /** Kind of armor (cuoio, metallo): the movement table and the restrictions read it. */
  categoria: string;
  /** At most this much of the AC characteristic counts (SRD medium armor: 2); null = all of it. */
  maxCaratteristica: number | null;
}

export interface Scudo extends VoceBase {
  tipo: 'scudo';
  bonus: number;
}

export interface Munizione extends VoceBase {
  tipo: 'munizione';
  /** The damage of a shot with it, when the manual gives it on the ammunition (an arrow 1d6, a sling stone 1d3). */
  danno: FormulaDadi | null;
}

export interface Luce {
  /** Bright light radius and dim light beyond it, in the set's range unit. */
  raggio: number;
  fioca: number;
  /** How long one burns, a number or a formula, in `unita` of the set's clock (`tempo.unita`). */
  durata: FormulaDadi;
  unita: string;
  /** An item spent when it is lit (a lantern's flask of oil); null = the item itself burns (a torch). */
  consuma: string | null;
}

export interface Attrezzo extends VoceBase {
  tipo: 'attrezzo';
  /** What it holds, in load units (a backpack: 40). */
  capienza: number | null;
  luce: Luce | null;
}

export type VoceCatalogo = Arma | Armatura | Scudo | Munizione | Attrezzo;

export interface FasciaGittata {
  id: string;
  nome: string;
  bonus: number;
  parole: string[];
}

export interface Gittate {
  unita: string;
  paroleUnita: string[];
  fasce: FasciaGittata[];
  predefinita: string;
}

export const PENALITA = ['attacco', 'vietato', 'senza_incantesimi', 'senza_abilita', 'perde_incantesimi'] as const;

export interface Penalita {
  /** Added to the attack roll with that weapon (Basic Fantasy: a magic-user's sword −5, p. 187). */
  attacco?: number;
  /** Cannot be used: no attack line, cannot be worn. */
  vietato?: boolean;
  /**
   * While worn, no spell can be cast: `true` refuses the cast (nothing spent), `perso` lets the attempt fail and the
   * spell is lost (Basic Fantasy p. 187: «any attempt fails, and the spell is lost»).
   */
  senzaIncantesimi?: true | 'perso';
  /** While worn, these abilities cannot be used (a thief in metal armor, p. 8). */
  senzaAbilita?: string[];
  /** Attacking with it empties the day's spells (a cleric with an edged weapon, p. 187). */
  perdeIncantesimi?: boolean;
}

export interface Restrizione {
  classe: string | null;
  razza: string | null;
  cosa: 'arma' | 'armatura' | 'scudo';
  ammessi: string[] | null;
  ammessiProprieta: string[] | null;
  ammessiCategorie: string[] | null;
  vietati: string[] | null;
  vietatiTaglie: string[] | null;
  penalita: Penalita;
  /** The manual's page, for the card and the log. */
  pagina: string | null;
}

export interface Catalogo {
  voci: VoceCatalogo[];
  difesa: { senzaArmatura: number; caratteristica: string | null };
  /** The set's attack abilities for melee and missile lines (or a characteristic, for sets without abilities). */
  abilita: { mischia: string | null; distanza: string | null };
  /** The characteristic whose bonus adds to melee and thrown damage; null = none. */
  dannoCaratteristica: string | null;
  gittate: Gittate | null;
  restrizioni: Restrizione[];
}

/** «15 ma», «2 mo», 7 (in the base coin) → the smallest coin; null when not for sale («n/a»). */
export function leggiCosto(v: unknown, monete: Monete | null, dove: string, errori: string[]): number | null {
  if (v === undefined || v === null || v === 'n/a') return null;
  const base = monete?.tagli.find((t) => t.id === monete.base);
  if (numero(v)) {
    if (!base) {
      errori.push(`${dove}: a price needs the set's monete`);
      return null;
    }
    return Math.round(v * base.vale);
  }
  const m = typeof v === 'string' ? /^\s*(\d+(?:[.,]\d+)?)\s*([a-z_]+)\s*$/.exec(v) : null;
  const taglio = m ? monete?.tagli.find((t) => t.id === m[2]) : undefined;
  if (!m || !taglio) {
    errori.push(`${dove}: a price is a number in ${monete?.base ?? 'the base coin'} or «15 ${monete?.tagli.at(-1)?.id ?? 'mr'}» with a coin of monete`);
    return null;
  }
  return Math.round(Number(m[1]!.replace(',', '.')) * taglio.vale);
}

export function leggiMonete(v: unknown, errori: string[]): Monete | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  const tagli: Taglio[] = [];
  for (const [i, x] of (Array.isArray(o?.['tagli']) ? (o!['tagli'] as unknown[]) : []).entries()) {
    const t = ogg(x);
    const id = typeof t?.['id'] === 'string' && ID.test(t['id']) ? t['id'] : null;
    if (!t || !id || !intero(t['vale']) || (t['vale'] as number) < 1) {
      errori.push(`monete.tagli[${i + 1}]: {id, nome, vale: a whole number ≥ 1, in the smallest coin}`);
      continue;
    }
    if (tagli.some((x) => x.id === id)) errori.push(`monete.tagli: id repeated «${id}»`);
    tagli.push({ id, nome: testoDi(t['nome']) ?? id, vale: t['vale'] as number });
  }
  if (!tagli.length) {
    errori.push('monete.tagli: at least one coin {id, nome, vale}');
    return null;
  }
  if (!tagli.some((t) => t.vale === 1)) errori.push('monete.tagli: the smallest coin has vale 1');
  tagli.sort((a, b) => b.vale - a.vale);
  const base = typeof o?.['base'] === 'string' ? o['base'] : tagli[0]!.id;
  if (!tagli.some((t) => t.id === base)) errori.push(`monete.base: «${base}» is not a coin of monete.tagli`);
  const p = ogg(o?.['peso']);
  let peso: Monete['peso'] = null;
  if (o?.['peso'] !== undefined) {
    if (p && intero(p['quante']) && (p['quante'] as number) > 0 && numero(p['peso']) && (p['peso'] as number) > 0) peso = { quante: p['quante'] as number, peso: p['peso'] as number };
    else errori.push('monete.peso: {quante: coins, peso: their weight}');
  }
  const prezzi = ids(o?.['prezzi']) ?? tagli.filter((t) => t.vale <= (tagli.find((x) => x.id === base)?.vale ?? 0)).map((t) => t.id);
  for (const id of prezzi) if (!tagli.some((t) => t.id === id)) errori.push(`monete.prezzi: «${id}» is not a coin of monete.tagli`);
  if (!prezzi.some((id) => tagli.find((t) => t.id === id)?.vale === 1)) prezzi.push(tagli.find((t) => t.vale === 1)?.id ?? tagli.at(-1)!.id);
  return { base, tagli, peso, prezzi };
}

/** A pack's weight: a number from 0 (Basic Fantasy's «*» is 0.1, «**» is 0). */
function peso(v: unknown, dove: string, errori: string[]): number {
  if (v === undefined || v === null) return 0;
  if (numero(v) && v >= 0) return v;
  errori.push(`${dove}.peso: a number from 0 (ten items of «*» weigh 1: 0.1)`);
  return 0;
}

function base(o: D, dove: string, monete: Monete | null, errori: string[]): Omit<VoceBase, 'id'> {
  const confezione = o['confezione'] === undefined ? 1 : intero(o['confezione']) && (o['confezione'] as number) > 0 ? (o['confezione'] as number) : (errori.push(`${dove}.confezione: a whole number ≥ 1`), 1);
  const proprieta = o['proprieta'] === undefined ? [] : (ids(o['proprieta']) ?? (errori.push(`${dove}.proprieta: a list of snake_case tags`), []));
  return { nome: testoDi(o['nome']) ?? '', peso: peso(o['peso'], dove, errori), costo: leggiCosto(o['costo'], monete, `${dove}.costo`, errori), confezione, proprieta };
}

function limiti(v: unknown, fasce: number | null, dove: string, errori: string[]): number[] | null {
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v) || !v.length || !v.every((n) => numero(n) && n > 0) || v.some((n, i) => i > 0 && n <= v[i - 1])) {
    errori.push(`${dove}: the band limits, growing (short, medium, long)`);
    return null;
  }
  if (fasce !== null && v.length !== fasce) errori.push(`${dove}: ${v.length} limits, catalogo.gittate has ${fasce} bands`);
  return v as number[];
}

function formula(v: unknown, dove: string, errori: string[]): FormulaDadi | null {
  const f = leggiFormula(v);
  if (!f) errori.push(`${dove}: a dice formula like 1d6`);
  return f;
}

function leggiArma(o: D, id: string, dove: string, ctx: Ctx, errori: string[]): Arma {
  const danno = formula(o['danno'], `${dove}.danno`, errori) ?? { numero: 1, facce: 4, bonus: 0 };
  const gittate = limiti(o['gittate'], ctx.fasce, `${dove}.gittate`, errori);
  const l = ogg(o['lancio']);
  if (o['lancio'] !== undefined && !l) errori.push(`${dove}.lancio: {gittate: [..], nome}`);
  const lancio = l ? { gittate: limiti(l['gittate'], ctx.fasce, `${dove}.lancio.gittate`, errori) ?? [], nome: testoDi(l['nome']), danno: l['danno'] !== undefined ? formula(l['danno'], `${dove}.lancio.danno`, errori) : null } : null;
  const d2 = ogg(o['a_due_mani']);
  const aDueMani = d2 ? { danno: formula(d2['danno'], `${dove}.a_due_mani.danno`, errori) ?? danno, nome: testoDi(d2['nome']) } : null;
  const mani = o['mani'] === 2 ? 2 : 1;
  if (o['mani'] !== undefined && o['mani'] !== 1 && o['mani'] !== 2) errori.push(`${dove}.mani: 1 or 2`);
  const munizioni = o['munizioni'] === undefined ? [] : typeof o['munizioni'] === 'string' ? [o['munizioni']] : (ids(o['munizioni']) ?? (errori.push(`${dove}.munizioni: ammunition ids`), []));
  const ricarica = o['ricarica'] === undefined ? 1 : intero(o['ricarica']) && (o['ricarica'] as number) >= 1 ? (o['ricarica'] as number) : (errori.push(`${dove}.ricarica: rounds between two shots, a whole number ≥ 1`), 1);
  return {
    id,
    tipo: 'arma',
    ...base(o, dove, ctx.monete, errori),
    danno,
    taglia: typeof o['taglia'] === 'string' ? o['taglia'] : null,
    mani,
    mischia: o['mischia'] === undefined ? !gittate : o['mischia'] === true,
    gittate,
    lancio,
    munizioni,
    ricarica,
    forzaAlDanno: o['forza_al_danno'] === true,
    aDueMani,
  };
}

function leggiLuce(v: unknown, dove: string, errori: string[]): Luce | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  const durata = o ? leggiFormula(o['durata']) : null;
  if (!o || !numero(o['raggio']) || !durata || typeof o['unita'] !== 'string') {
    errori.push(`${dove}.luce: {raggio, fioca, durata: «1d4+4» or a number, unita: a unit of tempo.unita, consuma}`);
    return null;
  }
  return { raggio: o['raggio'] as number, fioca: numero(o['fioca']) ? (o['fioca'] as number) : 0, durata, unita: o['unita'] as string, consuma: typeof o['consuma'] === 'string' ? o['consuma'] : null };
}

interface Ctx {
  monete: Monete | null;
  fasce: number | null;
}

const SEZIONI = { armi: 'arma', armature: 'armatura', scudi: 'scudo', munizioni: 'munizione', attrezzatura: 'attrezzo' } as const;

function leggiVoce(sezione: keyof typeof SEZIONI, x: unknown, i: number, ctx: Ctx, errori: string[]): VoceCatalogo | null {
  const o = ogg(x);
  const id = typeof o?.['id'] === 'string' && ID.test(o['id']) ? o['id'] : null;
  const dove = `catalogo.${sezione}[${i + 1}]`;
  if (!o || !id || !testoDi(o['nome'])) {
    errori.push(`${dove}: {id: snake_case, nome, …}`);
    return null;
  }
  const d = `catalogo.${id}`;
  if (sezione === 'armi') return leggiArma(o, id, d, ctx, errori);
  if (sezione === 'armature') {
    if (!intero(o['ca'])) errori.push(`${d}.ca: the armor's Armor Class, a whole number`);
    if (typeof o['categoria'] !== 'string' || !ID.test(o['categoria'])) errori.push(`${d}.categoria: the kind of armor (cuoio, metallo), snake_case`);
    const max = o['max_caratteristica'] === undefined || o['max_caratteristica'] === null ? null : intero(o['max_caratteristica']) ? (o['max_caratteristica'] as number) : (errori.push(`${d}.max_caratteristica: a whole number or null`), null);
    return { id, tipo: 'armatura', ...base(o, d, ctx.monete, errori), ca: intero(o['ca']) ? (o['ca'] as number) : 10, categoria: typeof o['categoria'] === 'string' ? o['categoria'] : 'armatura', maxCaratteristica: max };
  }
  if (sezione === 'scudi') {
    if (!intero(o['bonus'])) errori.push(`${d}.bonus: what the shield adds to the AC, a whole number`);
    return { id, tipo: 'scudo', ...base(o, d, ctx.monete, errori), bonus: intero(o['bonus']) ? (o['bonus'] as number) : 1 };
  }
  if (sezione === 'munizioni') return { id, tipo: 'munizione', ...base(o, d, ctx.monete, errori), danno: o['danno'] === undefined ? null : formula(o['danno'], `${d}.danno`, errori) };
  const capienza = o['capienza'] === undefined ? null : numero(o['capienza']) && (o['capienza'] as number) > 0 ? (o['capienza'] as number) : (errori.push(`${d}.capienza: what it holds, a number`), null);
  return { id, tipo: 'attrezzo', ...base(o, d, ctx.monete, errori), capienza, luce: leggiLuce(o['luce'], d, errori) };
}

function leggiGittate(v: unknown, errori: string[]): Gittate | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  const fasce: FasciaGittata[] = [];
  for (const [i, x] of (Array.isArray(o?.['fasce']) ? (o!['fasce'] as unknown[]) : []).entries()) {
    const f = ogg(x);
    const id = typeof f?.['id'] === 'string' && ID.test(f['id']) ? f['id'] : null;
    if (!f || !id || !intero(f['bonus'])) {
      errori.push(`catalogo.gittate.fasce[${i + 1}]: {id, nome, bonus: a whole number, parole}`);
      continue;
    }
    const parole = Array.isArray(f['parole']) ? f['parole'].filter((p): p is string => typeof p === 'string') : [];
    fasce.push({ id, nome: testoDi(f['nome']) ?? id, bonus: f['bonus'] as number, parole });
  }
  if (!fasce.length || typeof o?.['unita'] !== 'string') {
    errori.push('catalogo.gittate: {unita, parole_unita, fasce: [{id, nome, bonus, parole}], predefinita}');
    return null;
  }
  const predefinita = typeof o['predefinita'] === 'string' ? o['predefinita'] : fasce[Math.floor(fasce.length / 2)]!.id;
  if (!fasce.some((f) => f.id === predefinita)) errori.push(`catalogo.gittate.predefinita: «${predefinita}» is not a band`);
  const paroleUnita = Array.isArray(o['parole_unita']) ? o['parole_unita'].filter((p): p is string => typeof p === 'string') : [o['unita']];
  return { unita: o['unita'], paroleUnita, fasce, predefinita };
}

function leggiPenalita(v: unknown, dove: string, errori: string[]): Penalita {
  const o = ogg(v);
  if (!o || !Object.keys(o).length) {
    errori.push(`${dove}: {${PENALITA.join(' | ')}}`);
    return {};
  }
  const p: Penalita = {};
  for (const [k, x] of Object.entries(o)) {
    if (k === 'attacco' && intero(x)) p.attacco = x;
    else if (k === 'vietato' && x === true) p.vietato = true;
    else if (k === 'senza_incantesimi' && (x === true || x === 'perso')) p.senzaIncantesimi = x;
    else if (k === 'perde_incantesimi' && x === true) p.perdeIncantesimi = true;
    else if (k === 'senza_abilita' && ids(x)?.length) p.senzaAbilita = x as string[];
    else errori.push(`${dove}.${k}: one of ${PENALITA.join(', ')} (attacco: a whole number, senza_abilita: ability ids, senza_incantesimi: true or perso, the others true)`);
  }
  return p;
}

function leggiRestrizioni(v: unknown, errori: string[]): Restrizione[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push('catalogo.restrizioni: a list');
    return [];
  }
  const out: Restrizione[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const dove = `catalogo.restrizioni[${i + 1}]`;
    const cosa = o?.['cosa'];
    if (!o || (cosa !== 'arma' && cosa !== 'armatura' && cosa !== 'scudo') || (typeof o['classe'] !== 'string') === (typeof o['razza'] !== 'string')) {
      errori.push(`${dove}: {classe or razza, cosa: arma | armatura | scudo, ammessi… or vietati…, penalita}`);
      continue;
    }
    const lista = (k: string): string[] | null => (o[k] === undefined ? null : (ids(o[k]) ?? (errori.push(`${dove}.${k}: a list of ids`), null)));
    const r: Restrizione = {
      classe: typeof o['classe'] === 'string' ? o['classe'] : null,
      razza: typeof o['razza'] === 'string' ? o['razza'] : null,
      cosa,
      ammessi: lista('ammessi'),
      ammessiProprieta: lista('ammessi_proprieta'),
      ammessiCategorie: lista('ammessi_categorie'),
      vietati: lista('vietati'),
      vietatiTaglie: Array.isArray(o['vietati_taglie']) ? o['vietati_taglie'].filter((t): t is string => typeof t === 'string') : null,
      penalita: leggiPenalita(o['penalita'], `${dove}.penalita`, errori),
      pagina: o['pagina'] === undefined ? null : String(o['pagina']),
    };
    if (!r.ammessi && !r.ammessiProprieta && !r.ammessiCategorie && !r.vietati && !r.vietatiTaglie) errori.push(`${dove}: say what is allowed (ammessi, ammessi_proprieta, ammessi_categorie) or forbidden (vietati, vietati_taglie)`);
    out.push(r);
  }
  return out;
}

/**
 * `catalogo:` of the set. `ctx` gives the ids it is checked against: the set's characteristics and abilities, its
 * classes, races and clock units (null = no such section: the reference is not checked).
 */
export function leggiCatalogo(v: unknown, monete: Monete | null, ctx: { caratteristiche: ReadonlySet<string>; abilita: ReadonlySet<string>; classi: ReadonlySet<string> | null; razze: ReadonlySet<string> | null }, errori: string[]): Catalogo | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  if (!o) {
    errori.push('catalogo: {difesa, abilita, armi, armature, scudi, munizioni, attrezzatura, restrizioni}');
    return null;
  }
  const gittate = leggiGittate(o['gittate'], errori);
  const c: Ctx = { monete, fasce: gittate?.fasce.length ?? null };
  const voci: VoceCatalogo[] = [];
  for (const sezione of Object.keys(SEZIONI) as Array<keyof typeof SEZIONI>) {
    const lista = o[sezione];
    if (lista === undefined) continue;
    if (!Array.isArray(lista)) {
      errori.push(`catalogo.${sezione}: a list`);
      continue;
    }
    for (const [i, x] of lista.entries()) {
      const voce = leggiVoce(sezione, x, i, c, errori);
      if (!voce) continue;
      if (voci.some((y) => y.id === voce.id)) errori.push(`catalogo: id repeated «${voce.id}»`);
      voci.push(voce);
    }
  }
  const esiste = (id: string): boolean => voci.some((x) => x.id === id);
  for (const a of voci) {
    if (a.tipo === 'arma') for (const m of a.munizioni) if (voci.find((x) => x.id === m)?.tipo !== 'munizione') errori.push(`catalogo.${a.id}.munizioni: «${m}» is not in catalogo.munizioni`);
    if (a.tipo === 'arma' && (a.gittate || a.lancio) && !gittate) errori.push(`catalogo.${a.id}: range bands need catalogo.gittate`);
    if (a.tipo === 'attrezzo' && a.luce?.consuma && !esiste(a.luce.consuma)) errori.push(`catalogo.${a.id}.luce.consuma: «${a.luce.consuma}» is not in the catalog`);
  }
  const dif = ogg(o['difesa']);
  const carDif = typeof dif?.['caratteristica'] === 'string' ? dif['caratteristica'] : null;
  if (carDif && !ctx.caratteristiche.has(carDif)) errori.push(`catalogo.difesa.caratteristica: «${carDif}» is not a characteristic of the set`);
  if (o['difesa'] !== undefined && !intero(dif?.['senza_armatura'])) errori.push('catalogo.difesa: {senza_armatura: the AC with no armor, caratteristica}');
  const ab = ogg(o['abilita']);
  const abilita = { mischia: typeof ab?.['mischia'] === 'string' ? ab['mischia'] : null, distanza: typeof ab?.['distanza'] === 'string' ? ab['distanza'] : null };
  for (const [k, id] of Object.entries(abilita)) if (id && !ctx.abilita.has(id) && !ctx.caratteristiche.has(id)) errori.push(`catalogo.abilita.${k}: «${id}» is not an ability or characteristic of the set`);
  const dc = typeof o['danno_caratteristica'] === 'string' ? o['danno_caratteristica'] : null;
  if (dc && !ctx.caratteristiche.has(dc)) errori.push(`catalogo.danno_caratteristica: «${dc}» is not a characteristic of the set`);
  const restrizioni = leggiRestrizioni(o['restrizioni'], errori);
  for (const [i, r] of restrizioni.entries()) {
    if (r.classe && ctx.classi && !ctx.classi.has(r.classe)) errori.push(`catalogo.restrizioni[${i + 1}].classe: «${r.classe}» is not a class of the set`);
    if (r.razza && ctx.razze && !ctx.razze.has(r.razza)) errori.push(`catalogo.restrizioni[${i + 1}].razza: «${r.razza}» is not a race of the set`);
    for (const id of [...(r.ammessi ?? []), ...(r.vietati ?? [])]) if (!esiste(id)) errori.push(`catalogo.restrizioni[${i + 1}]: «${id}» is not in the catalog`);
    for (const id of r.penalita.senzaAbilita ?? []) if (!ctx.abilita.has(id)) errori.push(`catalogo.restrizioni[${i + 1}].penalita.senza_abilita: «${id}» is not an ability of the set`);
  }
  return { voci, difesa: { senzaArmatura: intero(dif?.['senza_armatura']) ? (dif!['senza_armatura'] as number) : 10, caratteristica: carDif }, abilita, dannoCaratteristica: dc, gittate, restrizioni };
}

/** The catalog entry of an id, or null. */
export function voce(c: Catalogo | null | undefined, id: string): VoceCatalogo | null {
  return c?.voci.find((v) => v.id === id) ?? null;
}

/** A price in the smallest coin, written with the fewest coins of `monete.prezzi` («1 mo 5 ma»). */
export function scriviCosto(m: Monete, n: number): string {
  if (n <= 0) return `0 ${m.base}`;
  const parti: string[] = [];
  let resto = n;
  for (const t of m.tagli.filter((x) => m.prezzi.includes(x.id))) {
    const k = Math.floor(resto / t.vale);
    if (k > 0) {
      parti.push(`${k} ${t.id}`);
      resto -= k * t.vale;
    }
  }
  if (resto > 0) parti.push(`${resto} ${m.tagli.at(-1)!.id}`);
  return parti.join(' ');
}
