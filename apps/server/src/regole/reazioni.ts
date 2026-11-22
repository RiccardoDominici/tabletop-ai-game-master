/**
 * The manual's reaction tables (regole.yaml → reazioni; rules-engine package R5): a roll the Game Master makes when how
 * someone reacts is not obvious — Basic Fantasy's monster reactions (p. 50: 2d6 + the lead character's Charisma bonus,
 * plus the Game Master's adjustments: 2 or less immediate attack, 3–7 unfavourable, 8–11 favourable, 12 or more very
 * favourable) and a retainer's answer to an offer (p. 46: refusal with −1 later, refusal, try again, acceptance,
 * acceptance with +1 loyalty). Any manual: the dice, the characteristic and the bands are data.
 *
 *   reazioni:
 *     - id: reazione
 *       nome: "Reazione dei mostri"
 *       dadi: "2d6"
 *       caratteristica: carisma           # the lead character's bonus is added (null = none)
 *       fasce:                            # from the lowest, each up to its `fino_a` (the last: null = the rest)
 *         - {fino_a: 2, nome: "Attacco immediato", atteggiamento: ostile}
 *         - {fino_a: 7, nome: "Sfavorevole", atteggiamento: ostile}
 *         - {fino_a: 11, nome: "Favorevole", atteggiamento: indifferente}
 *         - {fino_a: null, nome: "Molto favorevole", atteggiamento: amichevole}
 *
 * `atteggiamento` (optional): the attitude an NPC takes towards the lead PC with that band (docs/mondo.md §4). The Engine
 * rolls it (prove/motore.ts reazioneDelMaster), never the model; the card is the Game Master's (`regole.tiri_master`).
 */
import { leggiFormula, type FormulaDadi } from '../campagna/regole-srd';

export const ATTEGGIAMENTI_REAZIONE = ['ostile', 'indifferente', 'amichevole'] as const;
export type AtteggiamentoReazione = (typeof ATTEGGIAMENTI_REAZIONE)[number];

export interface FasciaReazione {
  /** The highest total of the band (inclusive); null = everything above the previous band. */
  finoA: number | null;
  nome: string;
  atteggiamento: AtteggiamentoReazione | null;
}

export interface TabellaReazione {
  id: string;
  nome: string;
  dadi: FormulaDadi;
  caratteristica: string | null;
  fasce: FasciaReazione[];
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const ID = /^[a-z0-9_]+$/;

/** `reazioni:` of the set; [] without the section. */
export function leggiReazioni(v: unknown, caratteristiche: ReadonlySet<string>, errori: string[]): TabellaReazione[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push('reazioni: a list of {id, nome, dadi, caratteristica, fasce}');
    return [];
  }
  const out: TabellaReazione[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const id = typeof o?.['id'] === 'string' && ID.test(o['id']) ? o['id'] : null;
    const dove = `reazioni[${i + 1}]`;
    if (!o || !id) {
      errori.push(`${dove}: an id in snake_case`);
      continue;
    }
    if (out.some((t) => t.id === id)) errori.push(`reazioni: id repeated «${id}»`);
    const dadi = leggiFormula(o['dadi']);
    if (!dadi || dadi.numero < 1) errori.push(`reazioni.${id}.dadi: a dice formula such as "2d6"`);
    const car = o['caratteristica'] === undefined || o['caratteristica'] === null ? null : String(o['caratteristica']);
    if (car !== null && !caratteristiche.has(car)) errori.push(`reazioni.${id}.caratteristica: «${car}» is not a characteristic of the set`);
    const fasce: FasciaReazione[] = [];
    for (const [k, f] of (Array.isArray(o['fasce']) ? o['fasce'] : []).entries()) {
      const fo = ogg(f);
      const fino = fo?.['fino_a'];
      const att = fo?.['atteggiamento'];
      if (!fo || typeof fo['nome'] !== 'string' || !(fino === null || (typeof fino === 'number' && Number.isInteger(fino)))) {
        errori.push(`reazioni.${id}.fasce[${k + 1}]: {fino_a: <the highest total, or null for the rest>, nome}`);
        continue;
      }
      if (att !== undefined && !(ATTEGGIAMENTI_REAZIONE as readonly unknown[]).includes(att)) errori.push(`reazioni.${id}.fasce[${k + 1}].atteggiamento: ${ATTEGGIAMENTI_REAZIONE.join(', ')}`);
      fasce.push({ finoA: fino as number | null, nome: fo['nome'], atteggiamento: (ATTEGGIAMENTI_REAZIONE as readonly unknown[]).includes(att) ? (att as AtteggiamentoReazione) : null });
    }
    if (!fasce.length) errori.push(`reazioni.${id}.fasce: at least one band`);
    for (let k = 1; k < fasce.length; k++) {
      const a = fasce[k - 1]!.finoA;
      const b = fasce[k]!.finoA;
      if (a === null || (b !== null && b <= a)) errori.push(`reazioni.${id}.fasce: «fino_a» grows band after band, and only the last is null`);
    }
    if (fasce.length && fasce.at(-1)!.finoA !== null) errori.push(`reazioni.${id}.fasce: the last band has fino_a: null (everything above)`);
    if (dadi && fasce.length) out.push({ id, nome: typeof o['nome'] === 'string' ? o['nome'] : id, dadi, caratteristica: car, fasce });
  }
  return out;
}

/** The band of a total: the first whose `fino_a` reaches it (the last for everything above). */
export function fasciaReazione(t: TabellaReazione, totale: number): FasciaReazione {
  return t.fasce.find((f) => f.finoA === null || totale <= f.finoA) ?? t.fasce.at(-1)!;
}
