/**
 * What the PCs have at the end of a session and at the start of the next (docs/strati.md, «The cycle between
 * sessions»; R1's open point: hit points and resources carried between sessions). The log (registro.yaml) writes
 * `pg_alla_fine` and `tempo_alla_fine` from the last snapshot of the Engine, deterministically; strumenti/tra_sessioni.py
 * copies them into the next package's `sessione.yaml` as `pg_all_inizio` and `tempo_all_inizio`, where the between-
 * session work may change them (a week of rest, a purchase in town); the Engine starts the session from there.
 */
import type { StatoProveSalvato } from '../prove/stato';

/** One PC's state, as the log writes it and sessione.yaml carries it (every field optional: absent = the sheet's). */
export interface StatoPg {
  pf?: number;
  /** Items with how many: catalog gear and items with a power. */
  oggetti?: Record<string, number>;
  monete?: Record<string, number>;
  /** The armor and shield worn. */
  indossati?: string[];
  /** The other counters: spell slots left (`slot_1`…), the set's resources. */
  contatori?: Record<string, number>;
  /** Prepared spells left (vancian). */
  incantesimi?: string[];
}

/** The game clock as a day and a time of day (day 1 is the first). */
export interface OraDiGioco {
  giorno: number;
  ora: number;
  minuto: number;
}

/** Absolute game seconds of a day and time. */
export const secondiDiOra = (o: OraDiGioco): number => (o.giorno - 1) * 86400 + o.ora * 3600 + o.minuto * 60;

/** A day and time from absolute game seconds. */
export function oraDaSecondi(s: number): OraDiGioco {
  return { giorno: Math.floor(s / 86400) + 1, ora: Math.floor((s % 86400) / 3600), minuto: Math.floor((s % 3600) / 60) };
}

/** The PCs' state at the end, from the Engine's snapshot; null when the session played without dice. */
export function pgAllaFine(prove: StatoProveSalvato | undefined, pg: readonly string[]): Array<{ id: string } & StatoPg> | null {
  if (!prove) return null;
  const pf = new Map(prove.pf ?? []);
  const contatori = new Map(prove.risorse?.contatori ?? []);
  const preparati = new Map(prove.risorse?.preparati ?? []);
  const vestiti = new Map(prove.risorse?.indossati ?? []);
  const out = pg.flatMap((id) => {
    const voci = contatori.get(id) ?? [];
    const per = (pref: string): Record<string, number> => Object.fromEntries(voci.filter(([k]) => k.startsWith(pref)).map(([k, n]) => [k.slice(pref.length), n]).sort(([a], [b]) => (a as string).localeCompare(b as string)));
    const altri = Object.fromEntries(voci.filter(([k]) => !k.startsWith('oggetto:') && !k.startsWith('moneta:')).sort(([a], [b]) => a.localeCompare(b)));
    const s: { id: string } & StatoPg = { id };
    if (pf.has(id)) s.pf = pf.get(id)!;
    if (Object.keys(per('oggetto:')).length) s.oggetti = per('oggetto:');
    if (Object.keys(per('moneta:')).length) s.monete = per('moneta:');
    if (vestiti.get(id)?.length) s.indossati = [...vestiti.get(id)!].sort();
    if (Object.keys(altri).length) s.contatori = altri;
    if (preparati.has(id)) s.incantesimi = [...preparati.get(id)!];
    return Object.keys(s).length > 1 ? [s] : [];
  });
  return out.length ? out : null;
}

/** The clock at the end (absolute day and time), or null without a clock in the snapshot. */
export function tempoAllaFine(prove: StatoProveSalvato | undefined): OraDiGioco | null {
  const t = prove?.tempo;
  return t && Number.isFinite(t.secondi) ? oraDaSecondi((t.inizio ?? 0) + t.secondi) : null;
}
