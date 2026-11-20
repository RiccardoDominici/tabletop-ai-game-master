/**
 * The powers of a rule set (docs/regole.md §2, «Poteri»; mechanisms M3 and M4 of docs/regole-audit/): spells, potions and
 * other items, class actions (binding wounds) and hazards, each a list of typed effects (regole/effetti.ts) with who it
 * can target, the target's save and what it costs. The Engine uses them (prove/poteri.ts); the arbiters only say which
 * power an action uses, never what it does.
 *
 *   poteri:
 *     - id: sonno
 *       nome: "Sonno"
 *       tipo: incantesimo              # incantesimo (a slot of its level) | oggetto (one off the sheet) | azione | pericolo
 *       livello: {mago: 1}             # incantesimo: class → spell level
 *       bersaglio: nemici              # se_stesso | uno | nemici | alleati
 *       dadi_vita_max: 3               # only targets of these hit dice or fewer…
 *       oppure_uno_fino_a: 4           # …or, if none, a single one up to this (Basic Fantasy's sleep)
 *       salvezza: {abilita: ts_incantesimi, esito: annulla}   # each target's own save (annulla | dimezza), modificatore
 *       immuni: [non_morto]            # creature types (sheet `tipo`) it never affects
 *       solo_tipi: [umanoide]          # or only these
 *       parole: [sonno, addormento]    # words that call it (the rules arbiter)
 *       effetti: [{tipo: condizione, condizione: addormentato, durata: {round_per_livello: 5}, finisce_se_ferito: true}]
 *       ostile: true                   # opens a fight on an NPC (default: when it deals damage or attacks)
 *       descrittivo: true              # no typed effects: it spends its cost, the narrator tells the rest
 *       pagina: 36
 */
import { leggiEffetti, type EffettoTipato } from './effetti';

export const TIPI_POTERE = ['incantesimo', 'oggetto', 'azione', 'pericolo'] as const;
export type TipoPotere = (typeof TIPI_POTERE)[number];
export const BERSAGLI_POTERE = ['se_stesso', 'uno', 'nemici', 'alleati'] as const;
export type BersaglioPotere = (typeof BERSAGLI_POTERE)[number];

export interface Potere {
  id: string;
  nome: string;
  tipo: TipoPotere;
  /** incantesimo: class id → spell level (the slot it spends). */
  livello: Record<string, number>;
  bersaglio: BersaglioPotere;
  dadiVitaMax: number | null;
  oppureUnoFinoA: number | null;
  salvezza: { abilita: string; esito: 'annulla' | 'dimezza'; modificatore: number } | null;
  immuni: string[];
  soloTipi: string[];
  parole: string[];
  effetti: EffettoTipato[];
  /** It opens a fight when aimed at an NPC (an attack's card). */
  ostile: boolean;
  /** No typed effect: the cost is spent and the narrator tells what it does (the manual's text). */
  descrittivo: boolean;
  pagina: number | null;
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const ID = /^[a-z0-9_]+$/;
const parole = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []);

/**
 * `poteri:` of the set. `abilita`: the set's ability ids (a save must be one of them, marked `salvezza`); `classi`:
 * the set's class ids (null = the set declares none: any class id is accepted); `condizioni`: the set's conditions.
 */
export function leggiPoteri(v: unknown, ctx: { salvezze: ReadonlySet<string>; classi: ReadonlySet<string> | null; condizioni: ReadonlySet<string> }, errori: string[]): Potere[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push('poteri: a list of {id, nome, tipo, bersaglio, effetti}');
    return [];
  }
  const out: Potere[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const id = typeof o?.['id'] === 'string' && ID.test(o['id']) ? o['id'] : null;
    if (!o || !id) {
      errori.push(`poteri[${i + 1}]: an id in snake_case`);
      continue;
    }
    const dove = `poteri.${id}`;
    if (out.some((p) => p.id === id)) errori.push(`poteri: id repeated «${id}»`);
    const tipo = o['tipo'];
    if (!(TIPI_POTERE as readonly unknown[]).includes(tipo)) errori.push(`${dove}.tipo: ${TIPI_POTERE.join(', ')}`);
    const bersaglio = o['bersaglio'] ?? 'uno';
    if (!(BERSAGLI_POTERE as readonly unknown[]).includes(bersaglio)) errori.push(`${dove}.bersaglio: ${BERSAGLI_POTERE.join(', ')}`);
    const livello: Record<string, number> = {};
    for (const [k, n] of Object.entries(ogg(o['livello']) ?? {})) {
      if (!intero(n) || n < 1) errori.push(`${dove}.livello.${k}: a spell level from 1`);
      else if (ctx.classi && !ctx.classi.has(k)) errori.push(`${dove}.livello: «${k}» is not a class of the set`);
      else livello[k] = n;
    }
    if (tipo === 'incantesimo' && !Object.keys(livello).length) errori.push(`${dove}.livello: a spell needs {class: spell level}`);
    let salvezza: Potere['salvezza'] = null;
    if (o['salvezza'] !== undefined && o['salvezza'] !== null) {
      const sv = ogg(o['salvezza']);
      const ab = sv?.['abilita'];
      const esito = sv?.['esito'] ?? 'annulla';
      const mod = sv?.['modificatore'] ?? 0;
      if (typeof ab !== 'string' || !ctx.salvezze.has(ab)) errori.push(`${dove}.salvezza.abilita: a save of the set (an ability with salvezza)`);
      else if (esito !== 'annulla' && esito !== 'dimezza') errori.push(`${dove}.salvezza.esito: annulla or dimezza`);
      else if (!intero(mod)) errori.push(`${dove}.salvezza.modificatore: a whole number`);
      else salvezza = { abilita: ab, esito, modificatore: mod };
    }
    const effetti = leggiEffetti(o['effetti'], `${dove}.effetti`, errori);
    for (const e of effetti) if (e.tipo === 'condizione' && !ctx.condizioni.has(e.condizione)) errori.push(`${dove}.effetti: condition «${e.condizione}» is not one of the set's (combattimento.condizioni)`);
    const descrittivo = o['descrittivo'] === true;
    if (!effetti.length && !descrittivo) errori.push(`${dove}: effetti, or descrittivo: true (the narrator tells it)`);
    const num = (k: string): number | null => {
      if (o[k] === undefined || o[k] === null) return null;
      if (!intero(o[k]) || (o[k] as number) < 0) errori.push(`${dove}.${k}: a whole number`);
      return intero(o[k]) ? (o[k] as number) : null;
    };
    out.push({
      id,
      nome: typeof o['nome'] === 'string' ? o['nome'] : id,
      tipo: (TIPI_POTERE as readonly unknown[]).includes(tipo) ? (tipo as TipoPotere) : 'azione',
      livello,
      bersaglio: (BERSAGLI_POTERE as readonly unknown[]).includes(bersaglio) ? (bersaglio as BersaglioPotere) : 'uno',
      dadiVitaMax: num('dadi_vita_max'),
      oppureUnoFinoA: num('oppure_uno_fino_a'),
      salvezza,
      immuni: parole(o['immuni']),
      soloTipi: parole(o['solo_tipi']),
      parole: parole(o['parole']),
      effetti,
      ostile: typeof o['ostile'] === 'boolean' ? o['ostile'] : effetti.some((e) => e.tipo === 'danno' || e.tipo === 'attacco'),
      descrittivo,
      pagina: intero(o['pagina']) ? o['pagina'] : null,
    });
  }
  return out;
}
