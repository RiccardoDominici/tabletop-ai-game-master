/**
 * The manual's character creation procedure as rule-set data (mechanism M7; docs/regole.md §2 «Creazione»; audit
 * C-CRE-*, X-OPT-01/02). The set declares the ordered steps from a closed list, how ability scores are generated (its
 * methods, and the options a Game Master may allow on top), the first level's hit points, the starting money, the
 * spells a caster starts with and the extra languages. Classes and races carry their requirements and allow-lists
 * (regole/requisiti.ts; `razze[].classi`, `razze[].lingue`, `razze[].aggiustamenti`).
 *
 *   lingue: [{id: comune, nome: "Comune"}, {id: nanico, nome: "Nanico"}]
 *   creazione:
 *     livello: 1
 *     passi: [caratteristiche, razza, classe, punti_ferita, monete, acquisti, incantesimi, lingue, descrizione]
 *     caratteristiche:
 *       metodi:
 *         - {id: in_ordine, nome: "3d6 in ordine", dadi: "3d6", ordine: fisso}       # Basic Fantasy p. 3
 *         - {id: quattro_dadi, nome: "4d6, i tre migliori", dadi: "4d6", tieni: 3, ordine: libero}   # the SRD 5.2
 *         - {id: schiera, nome: "Schiera fissa", valori: [15, 14, 13, 12, 10, 8]}                     # the SRD 5.2
 *         - {id: punti, nome: "Acquisto a punti", punti: 27, costi: [{valore: 8, costo: 0}, …]}       # the SRD 5.2
 *       opzioni:                                     # what the Game Master may allow (Basic Fantasy p. 186)
 *         - {id: scambio_punti, nome: "Spostare punti", tipo: punti, togli: 2, aggiungi: 1, minimo: 9}
 *         - {id: scambio, nome: "Scambiare due punteggi", tipo: scambio, volte: 1}
 *         - {id: riordino, nome: "Disporre i punteggi", tipo: riordino}
 *       massimo: 18
 *       senza_speranza: {rimedi: [ritira, ribalta], ribalta: 21}   # no class open (pp. 186–187)
 *     punti_ferita: tira                             # the first level's die: rolled, or its maximum (the SRD)
 *     monete: {dadi: "3d6", per: 10, moneta: mo}     # Basic Fantasy p. 3
 *     incantesimi: [{classe: mago, fissi: [leggere_il_magico], a_scelta: 1, livello: 1, come: scelta}]
 *     lingue: {caratteristica: intelligenza}         # extra languages = this characteristic's bonus (p. 4)
 *
 * The Engine's creation at the table (apps/server/src/creazione/) runs these steps; regole/controllo-pg.ts checks a
 * finished sheet against them (the same checks the validator mirrors in strumenti/valida/regole_creazione.py).
 */
import { leggiFormula, type FormulaDadi } from '../campagna/regole-srd';
import type { Voce } from './tipi';

/** The closed list of creation steps; a set lists the ones its manual has, in its order. */
export const PASSI_CREAZIONE = ['caratteristiche', 'razza', 'classe', 'punti_ferita', 'monete', 'acquisti', 'incantesimi', 'lingue', 'descrizione'] as const;
export type PassoCreazione = (typeof PASSI_CREAZIONE)[number];

/** How the six (or however many) ability scores are generated. */
export type MetodoCaratteristiche =
  /** Dice for each score: `ordine: fisso` = written down in order (Basic Fantasy); `libero` = the player assigns them. */
  | { id: string; nome: string; tipo: 'dadi'; dadi: FormulaDadi; tieni: number | null; ordine: 'fisso' | 'libero' }
  /** A fixed array the player assigns (the SRD's standard array). */
  | { id: string; nome: string; tipo: 'schiera'; valori: number[] }
  /** A point buy: each score from `minimo` to `massimo`, priced by `costi`, within `punti` (the SRD's 27 points). */
  | { id: string; nome: string; tipo: 'punti'; punti: number; costi: Array<{ valore: number; costo: number }> };

/** What a Game Master may allow after the scores are generated (Basic Fantasy p. 186: never demanded by players). */
export type OpzioneCaratteristiche =
  /** Point swapping: −`togli` to one score for +`aggiungi` to another; never below `minimo`, never above the maximum. */
  | { id: string; nome: string; tipo: 'punti'; togli: number; aggiungi: number; minimo: number }
  /** Score swapping: exchange two scores, `volte` times per character. */
  | { id: string; nome: string; tipo: 'scambio'; volte: number }
  /** The full shuffle: arrange the scores as the player wishes. */
  | { id: string; nome: string; tipo: 'riordino' };

export interface IncantesimiIniziali {
  classe: string;
  /** Spells every new caster of the class knows (read magic). */
  fissi: string[];
  /** How many more, of the class's spells of `livello` or lower. */
  aScelta: number;
  livello: number;
  /** Who picks them: the player (`scelta`), the Game Master (`master`), a roll (`tiro`): Basic Fantasy p. 8. */
  come: 'scelta' | 'master' | 'tiro';
}

export interface RegolaCreazione {
  /** The level a new character starts at (a player who joins later too). */
  livello: number;
  passi: PassoCreazione[];
  /** The ways of generating scores; the first is the set's default. */
  metodi: MetodoCaratteristiche[];
  opzioni: OpzioneCaratteristiche[];
  /** The highest score an option can reach (Basic Fantasy: 18, or the race's maximum); null = the method's. */
  massimo: number | null;
  /** When no class is open to the scores: the remedies a Game Master may allow (reroll; flip every score to `ribalta` − it). */
  senzaSperanza: { rimedi: Array<'ritira' | 'ribalta'>; ribalta: number } | null;
  /** The first level's hit die: rolled (Basic Fantasy p. 3) or its maximum (the SRD 5.2). Later levels are rolled. */
  puntiFerita: 'tira' | 'massimo';
  /** Starting money: `dadi` × `per` coins of `moneta` (Basic Fantasy: 3d6 × 10 gp). Null = none rolled. */
  monete: { dadi: FormulaDadi; per: number; moneta: string } | null;
  incantesimi: IncantesimiIniziali[];
  /** Extra languages: as many as this characteristic's positive bonus (Basic Fantasy p. 4); null = none. */
  lingue: { caratteristica: string } | null;
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const ID = /^[a-z0-9_]+$/;
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** `lingue:` of the set: the languages a character may know (Basic Fantasy p. 4). */
export function leggiLingue(v: unknown, errori: string[]): Voce[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push('lingue: a list of {id, nome}');
    return [];
  }
  const out: Voce[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const id = typeof o?.['id'] === 'string' && ID.test(o['id']) ? o['id'] : null;
    if (!id) {
      errori.push(`lingue[${i + 1}]: an id in snake_case`);
      continue;
    }
    if (out.some((l) => l.id === id)) errori.push(`lingue: id repeated «${id}»`);
    else out.push({ id, nome: str(o!['nome']) ?? id });
  }
  return out;
}

function leggiMetodo(x: unknown, dove: string, errori: string[]): MetodoCaratteristiche | null {
  const o = ogg(x);
  const id = typeof o?.['id'] === 'string' && ID.test(o['id']) ? o['id'] : null;
  if (!o || !id) {
    errori.push(`${dove}: an id in snake_case`);
    return null;
  }
  const nome = str(o['nome']) ?? id;
  if (o['dadi'] !== undefined) {
    const dadi = leggiFormula(o['dadi']);
    if (!dadi || dadi.numero < 1 || dadi.facce < 2) {
      errori.push(`${dove}.dadi: a dice formula such as "3d6"`);
      return null;
    }
    const tieni = o['tieni'];
    if (tieni !== undefined && (!intero(tieni) || tieni < 1 || tieni > dadi.numero)) errori.push(`${dove}.tieni: how many of the ${dadi.numero} dice count (1–${dadi.numero})`);
    const ordine = o['ordine'] ?? 'fisso';
    if (ordine !== 'fisso' && ordine !== 'libero') errori.push(`${dove}.ordine: fisso (in order) or libero (the player assigns)`);
    return { id, nome, tipo: 'dadi', dadi, tieni: intero(tieni) && tieni >= 1 && tieni <= dadi.numero ? tieni : null, ordine: ordine === 'libero' ? 'libero' : 'fisso' };
  }
  if (o['valori'] !== undefined) {
    const valori = o['valori'];
    if (!Array.isArray(valori) || !valori.length || !valori.every((n) => intero(n))) {
      errori.push(`${dove}.valori: the array's whole numbers`);
      return null;
    }
    return { id, nome, tipo: 'schiera', valori: valori as number[] };
  }
  if (o['punti'] !== undefined) {
    const punti = o['punti'];
    const costi = o['costi'];
    if (!intero(punti) || punti < 1) errori.push(`${dove}.punti: a whole number above 0`);
    const righe = Array.isArray(costi) ? costi.map((c) => ogg(c)).filter((c): c is D => !!c && intero(c['valore']) && intero(c['costo'])) : [];
    if (!Array.isArray(costi) || righe.length !== costi.length || !righe.length) {
      errori.push(`${dove}.costi: a list of {valore, costo} (whole numbers)`);
      return null;
    }
    const ordinati = righe.map((c) => ({ valore: c['valore'] as number, costo: c['costo'] as number }));
    for (let i = 1; i < ordinati.length; i++) if (ordinati[i]!.valore <= ordinati[i - 1]!.valore) errori.push(`${dove}.costi: «valore» grows row after row`);
    return { id, nome, tipo: 'punti', punti: intero(punti) ? punti : 0, costi: ordinati };
  }
  errori.push(`${dove}: dadi (rolled), valori (a fixed array) or punti (a point buy)`);
  return null;
}

function leggiOpzione(x: unknown, dove: string, errori: string[]): OpzioneCaratteristiche | null {
  const o = ogg(x);
  const id = typeof o?.['id'] === 'string' && ID.test(o['id']) ? o['id'] : null;
  if (!o || !id) {
    errori.push(`${dove}: an id in snake_case`);
    return null;
  }
  const nome = str(o['nome']) ?? id;
  switch (o['tipo']) {
    case 'punti': {
      const [togli, aggiungi, minimo] = [o['togli'] ?? 2, o['aggiungi'] ?? 1, o['minimo'] ?? 0];
      if (![togli, aggiungi, minimo].every(intero) || (togli as number) < 1 || (aggiungi as number) < 1) {
        errori.push(`${dove}: tipo punti needs togli, aggiungi (whole numbers above 0) and minimo`);
        return null;
      }
      return { id, nome, tipo: 'punti', togli: togli as number, aggiungi: aggiungi as number, minimo: minimo as number };
    }
    case 'scambio': {
      const volte = o['volte'] ?? 1;
      if (!intero(volte) || volte < 1) errori.push(`${dove}.volte: a whole number above 0`);
      return { id, nome, tipo: 'scambio', volte: intero(volte) && volte >= 1 ? volte : 1 };
    }
    case 'riordino':
      return { id, nome, tipo: 'riordino' };
    default:
      errori.push(`${dove}.tipo: punti (point swapping), scambio (swap two scores) or riordino (arrange them)`);
      return null;
  }
}

/**
 * `creazione:` of the set; null without the section. `ctx` names what the steps may refer to (the set's
 * characteristics, classes, coins and powers with their class levels), so a misspelt id is an error.
 */
export function leggiCreazione(
  v: unknown,
  ctx: { caratteristiche: ReadonlySet<string>; classi: ReadonlySet<string>; monete: ReadonlySet<string> | null; incantesimi: ReadonlyMap<string, Record<string, number>> },
  errori: string[],
): RegolaCreazione | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  if (!o) {
    errori.push('creazione: a map (docs/regole.md §2, «Creazione»)');
    return null;
  }
  const livello = o['livello'] ?? 1;
  if (!intero(livello) || livello < 1) errori.push('creazione.livello: the starting level, a whole number from 1');
  const passiGrezzi = o['passi'] ?? [...PASSI_CREAZIONE];
  const passi: PassoCreazione[] = [];
  if (!Array.isArray(passiGrezzi) || !passiGrezzi.length) errori.push(`creazione.passi: a list of steps among ${PASSI_CREAZIONE.join(', ')}`);
  else
    for (const p of passiGrezzi) {
      if (!(PASSI_CREAZIONE as readonly unknown[]).includes(p)) errori.push(`creazione.passi: «${String(p)}» is not a step (${PASSI_CREAZIONE.join(', ')})`);
      else if (passi.includes(p as PassoCreazione)) errori.push(`creazione.passi: «${String(p)}» twice`);
      else passi.push(p as PassoCreazione);
    }
  // The order the manual gives matters only where one step needs another: scores before race and class, the class
  // before its hit points and spells, the money before the purchases.
  const prima = (a: PassoCreazione, b: PassoCreazione): void => {
    if (passi.includes(a) && passi.includes(b) && passi.indexOf(a) > passi.indexOf(b)) errori.push(`creazione.passi: ${a} comes before ${b}`);
  };
  prima('caratteristiche', 'razza');
  prima('caratteristiche', 'classe');
  prima('classe', 'punti_ferita');
  prima('classe', 'incantesimi');
  prima('monete', 'acquisti');

  const car = ogg(o['caratteristiche']) ?? {};
  const metodi = (Array.isArray(car['metodi']) ? car['metodi'] : []).flatMap((x, i) => leggiMetodo(x, `creazione.caratteristiche.metodi[${i + 1}]`, errori) ?? []);
  if (passi.includes('caratteristiche') && !metodi.length) errori.push('creazione.caratteristiche.metodi: at least one way of generating the scores');
  for (const [i, m] of metodi.entries()) if (metodi.findIndex((x) => x.id === m.id) !== i) errori.push(`creazione.caratteristiche.metodi: id repeated «${m.id}»`);
  for (const m of metodi) if (m.tipo === 'schiera' && m.valori.length !== ctx.caratteristiche.size) errori.push(`creazione.caratteristiche.metodi.${m.id}.valori: ${m.valori.length} values for ${ctx.caratteristiche.size} characteristics`);
  const opzioni = (Array.isArray(car['opzioni']) ? car['opzioni'] : []).flatMap((x, i) => leggiOpzione(x, `creazione.caratteristiche.opzioni[${i + 1}]`, errori) ?? []);
  const massimo = car['massimo'];
  if (massimo !== undefined && !intero(massimo)) errori.push('creazione.caratteristiche.massimo: a whole number');
  let senzaSperanza: RegolaCreazione['senzaSperanza'] = null;
  if (car['senza_speranza'] !== undefined) {
    const s = ogg(car['senza_speranza']);
    const rimedi = Array.isArray(s?.['rimedi']) ? (s!['rimedi'] as unknown[]) : [];
    if (!s || !rimedi.length || !rimedi.every((r) => r === 'ritira' || r === 'ribalta')) errori.push('creazione.caratteristiche.senza_speranza: {rimedi: [ritira, ribalta], ribalta: 21}');
    const ribalta = s?.['ribalta'] ?? 21;
    if (!intero(ribalta)) errori.push('creazione.caratteristiche.senza_speranza.ribalta: a whole number (each score becomes it minus the score)');
    senzaSperanza = { rimedi: rimedi.filter((r): r is 'ritira' | 'ribalta' => r === 'ritira' || r === 'ribalta'), ribalta: intero(ribalta) ? ribalta : 21 };
  }

  const pf = o['punti_ferita'] ?? 'tira';
  if (pf !== 'tira' && pf !== 'massimo') errori.push('creazione.punti_ferita: tira (the die is rolled) or massimo (its maximum)');

  let monete: RegolaCreazione['monete'] = null;
  if (o['monete'] !== undefined) {
    const m = ogg(o['monete']);
    const dadi = leggiFormula(m?.['dadi']);
    const per = m?.['per'] ?? 1;
    const moneta = str(m?.['moneta']);
    if (!m || !dadi || !intero(per) || per < 1 || !moneta) errori.push('creazione.monete: {dadi: "3d6", per: 10, moneta: <a coin id>}');
    else if (ctx.monete && !ctx.monete.has(moneta)) errori.push(`creazione.monete.moneta: «${moneta}» is not a coin of the set (monete.tagli)`);
    else if (!ctx.monete) errori.push('creazione.monete: the set has no monete');
    if (dadi && intero(per) && moneta) monete = { dadi, per, moneta };
  }
  if (passi.includes('monete') && !monete) errori.push('creazione.passi: monete needs creazione.monete');

  const incantesimi: IncantesimiIniziali[] = [];
  for (const [i, x] of (Array.isArray(o['incantesimi']) ? o['incantesimi'] : []).entries()) {
    const d = `creazione.incantesimi[${i + 1}]`;
    const io = ogg(x);
    const classe = str(io?.['classe']);
    if (!io || !classe || !ctx.classi.has(classe)) {
      errori.push(`${d}.classe: a class of the set`);
      continue;
    }
    const fissi = Array.isArray(io['fissi']) ? (io['fissi'] as unknown[]).filter((f): f is string => typeof f === 'string') : [];
    for (const f of fissi) if (ctx.incantesimi.get(f)?.[classe] === undefined) errori.push(`${d}.fissi: «${f}» is not a spell of the set for ${classe} (poteri[].livello)`);
    const aScelta = io['a_scelta'] ?? 0;
    const lv = io['livello'] ?? 1;
    const come = io['come'] ?? 'scelta';
    if (!intero(aScelta) || aScelta < 0) errori.push(`${d}.a_scelta: how many more, a whole number`);
    if (!intero(lv) || lv < 1) errori.push(`${d}.livello: the highest spell level they may be of`);
    if (come !== 'scelta' && come !== 'master' && come !== 'tiro') errori.push(`${d}.come: scelta (the player), master or tiro`);
    incantesimi.push({ classe, fissi, aScelta: intero(aScelta) ? aScelta : 0, livello: intero(lv) ? lv : 1, come: come === 'master' || come === 'tiro' ? come : 'scelta' });
  }

  let lingue: RegolaCreazione['lingue'] = null;
  if (o['lingue'] !== undefined) {
    const l = ogg(o['lingue']);
    const c = str(l?.['caratteristica']);
    if (!c || !ctx.caratteristiche.has(c)) errori.push('creazione.lingue.caratteristica: a characteristic of the set (its bonus is the number of extra languages)');
    else lingue = { caratteristica: c };
  }

  return {
    livello: intero(livello) && livello >= 1 ? livello : 1,
    passi,
    metodi,
    opzioni,
    massimo: intero(massimo) ? massimo : null,
    senzaSperanza,
    puntiFerita: pf === 'massimo' ? 'massimo' : 'tira',
    monete,
    incantesimi,
    lingue,
  };
}

/** The lowest and highest score a method can give (3–18 for 3d6; the array's ends; the point buy's priced range). */
export function intervalloDelMetodo(m: MetodoCaratteristiche): { min: number; max: number } {
  switch (m.tipo) {
    case 'dadi': {
      const n = m.tieni ?? m.dadi.numero;
      return { min: n + m.dadi.bonus, max: n * m.dadi.facce + m.dadi.bonus };
    }
    case 'schiera':
      return { min: Math.min(...m.valori), max: Math.max(...m.valori) };
    case 'punti':
      return { min: m.costi[0]!.valore, max: m.costi.at(-1)!.valore };
  }
}

/** A roll of a method's dice for one score: the kept dice summed (the highest `tieni` of them), plus the bonus. */
export function punteggioDaDadi(m: Extract<MetodoCaratteristiche, { tipo: 'dadi' }>, dadi: readonly number[]): number {
  const tenuti = m.tieni ? [...dadi].sort((a, b) => b - a).slice(0, m.tieni) : [...dadi];
  return tenuti.reduce((a, b) => a + b, 0) + m.dadi.bonus;
}

/** The points a point-buy assignment spends; null when a score is not priced. */
export function costoPunti(m: Extract<MetodoCaratteristiche, { tipo: 'punti' }>, punteggi: readonly number[]): number | null {
  let n = 0;
  for (const p of punteggi) {
    const r = m.costi.find((c) => c.valore === p);
    if (!r) return null;
    n += r.costo;
  }
  return n;
}
