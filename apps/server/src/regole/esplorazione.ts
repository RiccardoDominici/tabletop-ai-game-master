/**
 * Exploration as rule-set data (docs/regole.md §2, «Esplorazione»; audit P8-01 to P8-04; Basic Fantasy pp. 180–183): the
 * environments the party explores, how often the Game Master checks for wandering monsters in each and with what odds,
 * and the encounter tables those checks roll on, by dungeon level or by terrain. General for any manual: the numbers are
 * the set's, the Engine (prove/esplorazione.ts) only counts time on the clock and rolls.
 *
 *   esplorazione:
 *     ambienti:
 *       - id: sotterraneo
 *         nome: "Sotterraneo"
 *         controllo: {ogni: {turno: 3}, dado: 6, fino_a: 1}   # every 3 turns, an encounter on 1 on 1d6 (p. 180)
 *         tabelle:                                          # by the scene's dungeon level, from the lowest
 *           - {da: 1, tabella: sotterraneo_1}
 *           - {da: 4, tabella: sotterraneo_4_5}
 *       - id: selvaggio
 *         nome: "Terre selvagge"
 *         controllo: {ogni: {ora: 4}, dado: 6, fino_a: 1}      # about every four hours (p. 181)
 *         sorpresa_prima: {dado: 6, fino_a: 2, imboscata: 4}  # surprise checked in advance; unsurprised, an ambush
 *   incontri:                                               # inline, or in regole/incontri.yaml beside the set
 *     - id: sotterraneo_1
 *       nome: "Sotterraneo, livello 1"
 *       dadi: "1d12"
 *       voci:
 *         - {tiro: 1, mostro: ape_gigante, numero: "1d6"}     # a bestiary entry (regole/mostri.yaml) and how many
 *         - {tiro: 5, gruppo: "Gruppo di PNG: avventurieri"}   # no stat block: the Game Master builds it
 *         - {tiro: 3, scelta: {dadi: "1d6", voci: [{tiro: [1, 2, 3], mostro: roc_grande, numero: "1"}]}}
 *
 * A scene says where it is (`esplorazione: {ambiente: sotterraneo, livello: 1}` or `{ambiente: selvaggio, tabella:
 * selvaggio_bosco}`); a scene that says nothing is not explored and no check runs there (a village, a talk).
 */
import { leggiFormula, type FormulaDadi } from '../campagna/regole-srd';
import { secondiDi, type RegolaTempo } from './tempo';

/** A chance on one die: «1 on 1d6» is {dado: 6, finoA: 1}. */
export interface Possibilita {
  dado: number;
  finoA: number;
}

export interface AmbienteEsplorazione {
  id: string;
  nome: string;
  /** The wandering monster check: every `ogni` seconds of game time, a hit on `finoA` or less on the die. Null = none. */
  controllo: (Possibilita & { ogni: number }) | null;
  /** The encounter table by the scene's level (`da` from the lowest); empty = the scene names its table. */
  tabelle: Array<{ da: number; tabella: string }>;
  /**
   * Surprise checked when the encounter is rolled (Basic Fantasy p. 181): the creatures' die and range; when they are not
   * surprised they have had time to set an ambush and surprise on `imboscata` (null: the fight's own surprise only).
   */
  sorpresaPrima: (Possibilita & { imboscata: number | null }) | null;
}

/** One way of meeting a creature: a bestiary entry and how many of it. */
export interface CreaturaIncontro {
  mostro: string;
  /** How many: a formula («2d4») or a fixed number; null = one. */
  numero: FormulaDadi | null;
}

export interface VoceIncontro {
  /** The roll values that pick this entry. */
  tiri: number[];
  /** The printed name in the manual (for the table test against the PDF), or null. */
  manuale: string | null;
  /** A bestiary entry, or a group without a stat block (`gruppo`), or a nested roll (`scelta`). */
  creatura: CreaturaIncontro | null;
  gruppo: { nome: string; numero: FormulaDadi | null } | null;
  scelta: { dadi: FormulaDadi; voci: Array<CreaturaIncontro & { tiri: number[] }> } | null;
}

export interface TabellaIncontri {
  id: string;
  nome: string;
  dadi: FormulaDadi;
  pagina: number | null;
  voci: VoceIncontro[];
}

export interface RegolaEsplorazione {
  ambienti: AmbienteEsplorazione[];
}

/** Where a scene says the party is (scene `esplorazione:`), read against the set. */
export interface DoveEsplorazione {
  ambiente: AmbienteEsplorazione;
  /** The table the checks roll on: the scene's, or the environment's for the scene's level; null = none (no check). */
  tabella: TabellaIncontri | null;
  /** The scene's dungeon level, when it gives one. */
  livello: number | null;
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const intero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const ID = /^[a-z0-9_]+$/;
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** {dado, fino_a} with a die of 2 faces or more and a range inside it. */
function possibilita(o: D | null, dove: string, errori: string[]): Possibilita | null {
  const dado = o?.['dado'];
  const finoA = o?.['fino_a'];
  if (!intero(dado) || dado < 2 || !intero(finoA) || finoA < 1 || finoA > dado) {
    errori.push(`${dove}: {dado: faces of the die, fino_a: the highest face that counts}`);
    return null;
  }
  return { dado, finoA };
}

/** A roll value or a list of them (`tiro: 5`, `tiro: [5, 6]`). */
function tiri(v: unknown): number[] | null {
  const l = Array.isArray(v) ? v : [v];
  return l.length && l.every((n) => intero(n)) ? (l as number[]) : null;
}

function creatura(o: D, dove: string, errori: string[]): CreaturaIncontro | null {
  const mostro = str(o['mostro']);
  if (!mostro || !ID.test(mostro)) {
    errori.push(`${dove}.mostro: the id of a bestiary entry`);
    return null;
  }
  const numero = o['numero'] === undefined ? null : leggiFormula(o['numero']);
  if (o['numero'] !== undefined && !numero) errori.push(`${dove}.numero: how many, a number or a formula like "2d4"`);
  return { mostro, numero };
}

/** The set's `esplorazione` (null without it). `tempo`: the set's clock, whose units the intervals use. */
export function leggiEsplorazione(v: unknown, tempo: RegolaTempo | null, errori: string[]): RegolaEsplorazione | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  if (!o) {
    errori.push('esplorazione: {ambienti: [{id, nome, controllo, tabelle}]}');
    return null;
  }
  if (!tempo) errori.push('esplorazione: the checks run on the game clock, the set needs its tempo');
  const ambienti: AmbienteEsplorazione[] = [];
  for (const [i, x] of (Array.isArray(o['ambienti']) ? (o['ambienti'] as unknown[]) : []).entries()) {
    const a = ogg(x);
    const id = str(a?.['id']);
    const dove = `esplorazione.ambienti[${i + 1}]`;
    if (!a || !id || !ID.test(id)) {
      errori.push(`${dove}: an id in snake_case`);
      continue;
    }
    if (ambienti.some((y) => y.id === id)) errori.push(`esplorazione.ambienti: id repeated «${id}»`);
    let controllo: AmbienteEsplorazione['controllo'] = null;
    if (a['controllo'] !== undefined) {
      const c = ogg(a['controllo']);
      const p = possibilita(c, `${dove}.controllo`, errori);
      const ogni = tempo && c ? secondiDi(tempo.unita, c['ogni'], `${dove}.controllo.ogni`, errori) : null;
      if (p && ogni !== null && ogni > 0) controllo = { ...p, ogni };
      else if (p && tempo && ogni === 0) errori.push(`${dove}.controllo.ogni: a duration longer than zero`);
    }
    const tabelle: AmbienteEsplorazione['tabelle'] = [];
    for (const [k, r] of (Array.isArray(a['tabelle']) ? (a['tabelle'] as unknown[]) : []).entries()) {
      const t = ogg(r);
      const da = t?.['da'];
      const tab = str(t?.['tabella']);
      if (!intero(da) || da < 0 || !tab) {
        errori.push(`${dove}.tabelle[${k + 1}]: {da: a level, tabella: an encounter table's id}`);
        continue;
      }
      if (tabelle.length && da <= tabelle.at(-1)!.da) errori.push(`${dove}.tabelle[${k + 1}]: «da» grows row after row`);
      tabelle.push({ da, tabella: tab });
    }
    let sorpresaPrima: AmbienteEsplorazione['sorpresaPrima'] = null;
    if (a['sorpresa_prima'] !== undefined) {
      const s = ogg(a['sorpresa_prima']);
      const p = possibilita(s, `${dove}.sorpresa_prima`, errori);
      const imb = s?.['imboscata'];
      if (imb !== undefined && (!intero(imb) || imb < 1 || (p && imb > p.dado))) errori.push(`${dove}.sorpresa_prima.imboscata: the range an ambush surprises on`);
      if (p) sorpresaPrima = { ...p, imboscata: intero(imb) ? imb : null };
    }
    ambienti.push({ id, nome: str(a['nome']) ?? id, controllo, tabelle, sorpresaPrima });
  }
  if (!ambienti.length) errori.push('esplorazione.ambienti: at least one environment {id, nome, controllo}');
  return { ambienti };
}

/** The encounter tables (`incontri:` inline, then regole/incontri.yaml). `mostri`: the bestiary's ids, to check them. */
export function leggiIncontri(fonti: Array<{ v: unknown; dove: string }>, mostri: ReadonlySet<string>, errori: string[]): TabellaIncontri[] {
  const out: TabellaIncontri[] = [];
  for (const { v, dove: base } of fonti) {
    if (v === undefined || v === null) continue;
    if (!Array.isArray(v)) {
      errori.push(`${base}: a list of encounter tables {id, nome, dadi, voci}`);
      continue;
    }
    for (const [i, x] of v.entries()) {
      const o = ogg(x);
      const id = str(o?.['id']);
      const dove = `${base}[${i + 1}]`;
      if (!o || !id || !ID.test(id)) {
        errori.push(`${dove}: an id in snake_case`);
        continue;
      }
      if (out.some((t) => t.id === id)) errori.push(`${base}: table id repeated «${id}»`);
      const dadi = leggiFormula(o['dadi']);
      if (!dadi || dadi.numero < 1) errori.push(`${base}.${id}.dadi: the table's dice, like "1d12" or "2d8"`);
      const voci: VoceIncontro[] = [];
      const visti = new Set<number>();
      for (const [k, r] of (Array.isArray(o['voci']) ? (o['voci'] as unknown[]) : []).entries()) {
        const e = ogg(r);
        const d = `${base}.${id}.voci[${k + 1}]`;
        const t = tiri(e?.['tiro']);
        if (!e || !t) {
          errori.push(`${d}: {tiro: a roll value or a list, mostro | gruppo | scelta}`);
          continue;
        }
        for (const n of t) {
          if (visti.has(n)) errori.push(`${d}.tiro: ${n} picks two entries`);
          visti.add(n);
        }
        const tipi = ['mostro', 'gruppo', 'scelta'].filter((k2) => e[k2] !== undefined);
        if (tipi.length !== 1) {
          errori.push(`${d}: exactly one of mostro, gruppo, scelta`);
          continue;
        }
        const voce: VoceIncontro = { tiri: t, manuale: str(e['manuale']), creatura: null, gruppo: null, scelta: null };
        if (e['mostro'] !== undefined) voce.creatura = creatura(e, d, errori);
        else if (e['gruppo'] !== undefined) {
          const nome = str(e['gruppo']);
          const numero = e['numero'] === undefined ? null : leggiFormula(e['numero']);
          if (!nome) errori.push(`${d}.gruppo: the group's name (no stat block: the Game Master builds it)`);
          if (e['numero'] !== undefined && !numero) errori.push(`${d}.numero: a number or a formula`);
          voce.gruppo = { nome: nome ?? '', numero };
        } else {
          const s = ogg(e['scelta']);
          const sd = leggiFormula(s?.['dadi']);
          const sv: Array<CreaturaIncontro & { tiri: number[] }> = [];
          for (const [j, y] of (Array.isArray(s?.['voci']) ? (s!['voci'] as unknown[]) : []).entries()) {
            const z = ogg(y);
            const zt = tiri(z?.['tiro']);
            const c = z ? creatura(z, `${d}.scelta.voci[${j + 1}]`, errori) : null;
            if (!zt) errori.push(`${d}.scelta.voci[${j + 1}].tiro: a roll value or a list`);
            if (c && zt) sv.push({ ...c, tiri: zt });
          }
          if (!sd || sd.numero < 1 || !sv.length) errori.push(`${d}.scelta: {dadi, voci: [{tiro, mostro, numero}]}`);
          else voce.scelta = { dadi: sd, voci: sv };
        }
        for (const c of [voce.creatura, ...(voce.scelta?.voci ?? [])]) if (c && mostri.size && !mostri.has(c.mostro)) errori.push(`${d}: «${c.mostro}» is not an entry of the set's bestiary`);
        voci.push(voce);
      }
      if (!voci.length) errori.push(`${base}.${id}.voci: at least one entry`);
      if (dadi) {
        const minimo = dadi.numero + dadi.bonus;
        const massimo = dadi.numero * dadi.facce + dadi.bonus;
        const mancano = Array.from({ length: massimo - minimo + 1 }, (_, k) => minimo + k).filter((n) => !visti.has(n));
        if (mancano.length) errori.push(`${base}.${id}: no entry for the rolls ${mancano.join(', ')} of ${dadi.numero}d${dadi.facce}`);
      }
      out.push({ id, nome: str(o['nome']) ?? id, dadi: dadi ?? { numero: 1, facce: 6, bonus: 0 }, pagina: intero(o['pagina']) ? o['pagina'] : null, voci });
    }
  }
  return out;
}

/** Cross-checks: each environment's tables exist. */
export function controllaEsplorazione(e: RegolaEsplorazione | null, tabelle: readonly TabellaIncontri[], errori: string[]): void {
  if (!e) return;
  const ids = new Set(tabelle.map((t) => t.id));
  for (const a of e.ambienti) for (const t of a.tabelle) if (!ids.has(t.tabella)) errori.push(`esplorazione.ambienti.${a.id}.tabelle: «${t.tabella}» is not an encounter table (incontri)`);
}

/** The entry a roll picks, or null (a hole in the table: the validator refuses it). */
export function voceDelTiro(t: TabellaIncontri, valore: number): VoceIncontro | null {
  return t.voci.find((v) => v.tiri.includes(valore)) ?? null;
}

/**
 * Where a scene's `esplorazione:` says the party is, read against the set: its environment and the table its checks roll
 * on (the scene's own `tabella`, else the environment's for the scene's `livello`, else the environment's first). Null
 * when the scene says nothing or names what the set lacks (`errori` says why).
 */
export function doveDellaScena(s: { esplorazione?: RegolaEsplorazione | null; incontri?: readonly TabellaIncontri[] }, v: unknown, errori: string[] = []): DoveEsplorazione | null {
  if (v === undefined || v === null) return null;
  const o = ogg(v);
  const ambiente = s.esplorazione?.ambienti.find((a) => a.id === o?.['ambiente']);
  if (!o || !ambiente) {
    errori.push(`esplorazione.ambiente: «${String(o?.['ambiente'])}» is not an environment of the set`);
    return null;
  }
  const livello = intero(o['livello']) ? o['livello'] : null;
  const scritta = str(o['tabella']);
  let id = scritta;
  if (!id && ambiente.tabelle.length) {
    let r = ambiente.tabelle[0]!;
    for (const x of ambiente.tabelle) if ((livello ?? ambiente.tabelle[0]!.da) >= x.da) r = x;
    id = r.tabella;
  }
  const tabella = id ? ((s.incontri ?? []).find((t) => t.id === id) ?? null) : null;
  if (id && !tabella) errori.push(`esplorazione.tabella: «${id}» is not an encounter table of the set`);
  return { ambiente, tabella, livello };
}
