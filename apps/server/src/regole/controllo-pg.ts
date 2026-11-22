/**
 * A finished character checked against the set's creation rules (mechanism M7; docs/regole.md §2 «Creazione»): the race
 * and class requirements and allow-lists, the scores the methods can give, the hit points the class's dice can give
 * at the level, the starting spells and languages, the money a starting roll can buy. The same function judges a PC
 * built at the table (apps/server/src/creazione/: the Engine refuses to finish an illegal one) and, through its Python
 * mirror strumenti/valida/regole_creazione.py, the pregenerated PCs the Preparer writes. The two are kept together by
 * one case file, apps/server/test/fixtures/creazione/casi.yaml, read by both test suites.
 *
 * Each problem has a code (the language pack's `creazione.problemi.<codice>` tells it to the phone and the panel) and
 * whether it stops the character (`grave`) or is a warning (a Game Master may have allowed it).
 */
import { requisitiMancati } from './requisiti';
import { intervalloDelMetodo } from './creazione';
import { limitiPuntiFerita, sogliaPx } from './progressione';
import { restrizioniViolate } from './equipaggiamento';
import { voce } from './catalogo';
import { trattiDi, valoreCaratteristica } from './schede';
import type { SchedaGenerica, SistemaRegole } from './tipi';

export const CODICI_PROBLEMA = [
  'razza_mancante',
  'razza_sconosciuta',
  'classe_mancante',
  'classe_sconosciuta',
  'classe_non_ammessa',
  'requisito_razza',
  'requisito_classe',
  'caratteristica_fuori',
  'pf_fuori',
  'pf_non_massimi',
  'px_livello',
  'livello_iniziale',
  'equipaggiamento_vietato',
  'monete_negative',
  'spesa_oltre',
  'libro_mancante',
  'libro_senza_fissi',
  'libro_conta',
  'libro_livello',
  'incantesimo_non_della_classe',
  'preparato_fuori_libro',
  'lingue_mancanti',
  'lingue_della_razza',
  'lingue_troppe',
] as const;
export type CodiceProblema = (typeof CODICI_PROBLEMA)[number];

export interface ProblemaPg {
  codice: CodiceProblema;
  /** True: the character cannot play like this; false: a warning (a Game Master's allowance, a missing detail). */
  grave: boolean;
  dettagli: Record<string, string | number>;
}

export interface OpzioniControllo {
  /**
   * A character just built at the table (stricter: the level is the procedure's, the hit points follow its rule, the
   * book holds exactly the starting spells). False: a pregenerated sheet (a Game Master may have granted more).
   */
  creato: boolean;
  /** The starting level of the campaign (its `regole.creazione.livello`, else the set's). */
  livello?: number;
  /** The first level's hit points: rolled or the die's maximum (the campaign's choice, else the set's). */
  puntiFerita?: 'tira' | 'massimo';
}

/** The problems of a sheet by the set's creation rules; empty when it is legal. */
export function controllaPersonaggio(s: SistemaRegole, sch: SchedaGenerica, o: OpzioniControllo): ProblemaPg[] {
  const out: ProblemaPg[] = [];
  const p = (codice: CodiceProblema, grave: boolean, dettagli: Record<string, string | number> = {}): void => void out.push({ codice, grave, dettagli });
  const cr = s.creazione ?? null;
  const punteggi = sch.caratteristiche;

  // Race and class: known, required when the procedure has the step, allowed together, their requirements met.
  const razza = sch.razza ? (s.razze ?? []).find((r) => r.id === sch.razza) : undefined;
  if (sch.razza && !razza) p('razza_sconosciuta', true, { razza: sch.razza });
  if (!sch.razza && (s.razze ?? []).length && (o.creato || cr?.passi.includes('razza'))) p('razza_mancante', o.creato);
  const classe = sch.classe ? (s.classi ?? []).find((c) => c.id === sch.classe) : undefined;
  if (sch.classe && !classe) p('classe_sconosciuta', true, { classe: sch.classe });
  if (!sch.classe && (s.classi ?? []).length && (o.creato || cr?.passi.includes('classe'))) p('classe_mancante', o.creato);
  if (razza && classe && razza.classi && !razza.classi.includes(classe.id)) p('classe_non_ammessa', true, { razza: razza.nome, classe: classe.nome });
  for (const m of razza ? requisitiMancati(razza.requisiti, punteggi) : []) p('requisito_razza', true, { razza: razza!.nome, caratteristica: nomeCar(s, m.caratteristica), valore: m.valore, limite: limite(m) });
  for (const m of classe ? requisitiMancati(classe.requisiti, punteggi) : []) p('requisito_classe', true, { classe: classe!.nome, caratteristica: nomeCar(s, m.caratteristica), valore: m.valore, limite: limite(m) });

  // Scores: inside what the methods can give, with the race's adjustments (and an option's maximum).
  if (cr?.metodi.length && s.modificatore === 'tabella') {
    const ranges = cr.metodi.map(intervalloDelMetodo);
    const min = Math.min(...ranges.map((r) => r.min));
    const max = Math.max(...ranges.map((r) => r.max), cr.massimo ?? -Infinity);
    for (const c of s.caratteristiche) {
      const v = punteggi[c.id];
      const agg = razza?.aggiustamenti[c.id] ?? 0;
      if (v !== undefined && (v < min + agg || v > max + agg)) p('caratteristica_fuori', true, { caratteristica: c.nome, valore: v, min: min + agg, max: max + agg });
    }
  }

  // Level, XP and hit points by the class tables.
  const livello = sch.livello ?? 1;
  const inizio = o.livello ?? cr?.livello ?? 1;
  if (o.creato && livello !== inizio) p('livello_iniziale', true, { livello, atteso: inizio });
  if (classe) {
    const soglia = sogliaPx(classe.progressione, livello);
    if (o.creato && soglia !== null && (sch.px ?? 0) !== soglia) p('px_livello', true, { px: sch.px ?? 0, atteso: soglia, livello });
    const tratti = trattiDi(s, sch);
    const car = s.progressione?.puntiFerita.caratteristica;
    const bonus = car ? valoreCaratteristica(s, sch, car) : 0;
    const lim = limitiPuntiFerita(s.progressione, classe.progressione, livello, bonus, tratti);
    if (lim && (sch.pf_massimi < lim.min || sch.pf_massimi > lim.max)) p('pf_fuori', true, { pf: sch.pf_massimi, min: lim.min, max: lim.max, livello });
    else if (lim && o.creato && livello === 1 && (o.puntiFerita ?? cr?.puntiFerita) === 'massimo' && sch.pf_massimi !== lim.max) p('pf_non_massimi', true, { pf: sch.pf_massimi, max: lim.max });
  }

  // Gear the race or class may not use at all, and the money: never below zero, and no more spent than a starting roll gives.
  for (const e of sch.equipaggiamento ?? []) {
    const v = voce(s.catalogo, e.id);
    if (v && restrizioniViolate(s, sch, v).some((r) => r.penalita.vietato)) p('equipaggiamento_vietato', true, { oggetto: v.nome });
  }
  for (const [m, n] of Object.entries(sch.monete ?? {})) if (n < 0) p('monete_negative', true, { moneta: m, quante: n });
  const tetto = tettoMonete(s);
  if (tetto !== null && sch.equipaggiamento && livello === inizio) {
    const speso = costoDotazione(s, sch) + valoreMonete(s, sch.monete ?? {});
    if (speso > tetto) p('spesa_oltre', !o.creato ? false : true, { speso, tetto });
  }

  // Starting spells (Basic Fantasy p. 8: read magic and one more): the book holds them, prepared ones come from it.
  const libroIniziale = classe ? cr?.incantesimi.find((x) => x.classe === classe.id) : undefined;
  if (libroIniziale) {
    if (!sch.libro) p('libro_mancante', o.creato, { classe: classe!.nome });
    else {
      const mancanti = libroIniziale.fissi.filter((f) => !sch.libro!.includes(f));
      if (mancanti.length) p('libro_senza_fissi', true, { incantesimi: mancanti.map((m) => nomePotere(s, m)).join(', ') });
      const altri = sch.libro.filter((x) => !libroIniziale.fissi.includes(x));
      if (livello === inizio && (o.creato ? altri.length !== libroIniziale.aScelta : altri.length < libroIniziale.aScelta)) p('libro_conta', o.creato, { quanti: altri.length, attesi: libroIniziale.aScelta });
      // At the starting level the chosen ones are of the procedure's spell level or lower (a first-level book).
      for (const x of livello === inizio ? altri : []) {
        const lv = (s.poteri ?? []).find((q) => q.id === x)?.livello[classe!.id];
        if (lv !== undefined && lv > libroIniziale.livello) p('libro_livello', true, { incantesimo: nomePotere(s, x), livello: lv, massimo: libroIniziale.livello });
      }
    }
  }
  if (classe && sch.libro) {
    for (const x of sch.libro) {
      const lv = (s.poteri ?? []).find((q) => q.id === x)?.livello[classe.id];
      if (lv === undefined) p('incantesimo_non_della_classe', true, { incantesimo: nomePotere(s, x), classe: classe.nome });
    }
    for (const x of sch.incantesimi ?? []) if (!sch.libro.includes(x)) p('preparato_fuori_libro', true, { incantesimo: nomePotere(s, x) });
  }

  // Languages (Basic Fantasy p. 4): the race's own, and no more extra ones than the bonus gives.
  if (s.lingue?.length && cr?.passi.includes('lingue')) {
    if (!sch.lingue) p('lingue_mancanti', o.creato);
    else {
      const proprie = razza?.lingue ?? [];
      const senza = proprie.filter((l) => !sch.lingue!.includes(l));
      if (senza.length) p('lingue_della_razza', true, { lingue: senza.map((l) => nomeLingua(s, l)).join(', ') });
      const extra = sch.lingue.filter((l) => !proprie.includes(l)).length;
      const ammesse = linguaExtra(s, sch);
      if (extra > ammesse) p('lingue_troppe', true, { quante: extra, ammesse });
    }
  }
  return out;
}

/** How many languages beyond the race's a character may know: the characteristic's positive bonus (p. 4). */
export function linguaExtra(s: SistemaRegole, sch: SchedaGenerica): number {
  const c = s.creazione?.lingue?.caratteristica;
  return c ? Math.max(0, valoreCaratteristica(s, sch, c)) : 0;
}

/** The highest starting money in the smallest coin (3d6 × 10 gp: 180 gp), or null without a money roll. */
export function tettoMonete(s: SistemaRegole): number | null {
  const m = s.creazione?.monete;
  const t = m ? s.monete?.tagli.find((x) => x.id === m.moneta) : undefined;
  if (!m || !t) return null;
  return (m.dadi.numero * m.dadi.facce + m.dadi.bonus) * m.per * t.vale;
}

/** What a sheet's catalog gear costs, in the smallest coin (a pack's price divided by its size, rounded up). */
export function costoDotazione(s: SistemaRegole, sch: Pick<SchedaGenerica, 'equipaggiamento'>): number {
  let n = 0;
  for (const e of sch.equipaggiamento ?? []) {
    const v = voce(s.catalogo, e.id);
    if (v?.costo != null) n += Math.ceil((v.costo * e.quante) / v.confezione);
  }
  return n;
}

/** Coins by id, in the smallest coin. */
export function valoreMonete(s: SistemaRegole, m: Readonly<Record<string, number>>): number {
  return Object.entries(m).reduce((n, [id, q]) => n + q * (s.monete?.tagli.find((t) => t.id === id)?.vale ?? 0), 0);
}

const nomeCar = (s: SistemaRegole, id: string): string => s.caratteristiche.find((c) => c.id === id)?.nome ?? id;
const nomePotere = (s: SistemaRegole, id: string): string => (s.poteri ?? []).find((p) => p.id === id)?.nome ?? id;
const nomeLingua = (s: SistemaRegole, id: string): string => (s.lingue ?? []).find((l) => l.id === id)?.nome ?? id;
const limite = (m: { min: number | null; max: number | null; valore: number }): string => (m.min !== null && m.valore < m.min ? `≥ ${m.min}` : `≤ ${m.max}`);
