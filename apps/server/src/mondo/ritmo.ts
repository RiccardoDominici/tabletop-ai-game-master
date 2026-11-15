/**
 * Clock pace derived from the evening (docs/mondo.md §1): `segno_almeno_ogni: serata`.
 *
 * A fixed «one mark every N turns» does not know how long an evening is: torre-mozza's session clock needed
 * 8 marks × 9 active turns = 72 turns and never got past 1/8 (E3). Here N is recomputed at every closed window
 * from what is left of the evening: the turns still expected (minutes left × turns per hour), the share of
 * the session's scenes where the clock is active, and the marks still to show. Pure functions: the director
 * passes the minutes and turns of the evening (its clock is injectable, so tests control it).
 */

/**
 * Turns per hour at a real table until the evening has enough turns of its own. Source: the one evening
 * played by people in the logs (3 November 2026, 44 turns in 69 minutes, windows with a median of 36 s).
 * Scripted runs go at 50–80 an hour: after MIN_TURNI_OSSERVATI turns and MIN_MINUTI_OSSERVATI minutes the
 * observed rate takes over.
 */
export const TURNI_PER_ORA = 38;
export const MIN_TURNI_OSSERVATI = 8;
export const MIN_MINUTI_OSSERVATI = 10;

/** The value of `segno_almeno_ogni` that asks for the evening's pace. */
export const RITMO_SERATA = 'serata';

/** What the director knows about the evening when a window closes. */
export interface SerataPerRitmo {
  /** Planned length of the evening in hours (brief, or the Game Master's panel). */
  ore: number;
  /** Minutes since the evening started (null = not started yet: the whole evening is ahead). */
  minutiPassati: number | null;
  /** Turns narrated since the evening started. */
  turniGiocati: number;
}

/** Turns per hour for this evening: the default until the evening has enough data, then the observed rate. */
export function turniPerOra(s: SerataPerRitmo): number {
  if (s.minutiPassati === null || s.minutiPassati < MIN_MINUTI_OSSERVATI || s.turniGiocati < MIN_TURNI_OSSERVATI) return TURNI_PER_ORA;
  return (s.turniGiocati / s.minutiPassati) * 60;
}

/** Turns still expected this evening (0 when the planned time is over). */
export function turniAttesi(s: SerataPerRitmo): number {
  const rimasti = Math.max(0, s.ore * 60 - (s.minutiPassati ?? 0));
  return (rimasti * turniPerOra(s)) / 60;
}

/**
 * Share of the session's scenes where the clock is active (1 if no scene lists it: then the clock is meant
 * to run wherever the PCs are, e.g. a campaign with a single scene card that omits `orologi_attivi`).
 */
export function quotaScene(id: string, scene: ReadonlyArray<{ dati: Record<string, unknown> }>): number {
  if (scene.length === 0) return 1;
  const attiva = scene.filter((s) => Array.isArray(s.dati['orologi_attivi']) && (s.dati['orologi_attivi'] as unknown[]).includes(id)).length;
  return attiva === 0 ? 1 : attiva / scene.length;
}

/**
 * «At least one mark every N turns» for a clock with `segno_almeno_ogni: serata`:
 * N = max(alMassimoOgni, floor(turni attesi × quota / segni rimasti)), at least 1. null = nothing left to show.
 * Never faster than the clock's own maximum pace (`segno_al_massimo_ogni`).
 */
export function almenoOgniDallaSerata(s: SerataPerRitmo, quota: number, segniRimasti: number, alMassimoOgni: number): number | null {
  if (segniRimasti <= 0) return null;
  const n = Math.floor((turniAttesi(s) * quota) / segniRimasti);
  return Math.max(1, alMassimoOgni, n);
}
