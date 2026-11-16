/**
 * Rules in observation (docs/coerenza.md, «Measured, round 2»): two measuring rounds on the blind scripts did not
 * show that these rules help, and single runs swing too much to tell a fix from noise (combat-manual 10 → 6,
 * combat-auto 4 → 9 high-severity sentences on close code). Until the frozen replay set scores them
 * (esperimenti/coerenza/), they only record what they would have done (`azione: 'osservata'` in narrazioni.jsonl and
 * the log line «coherence: rule in observation, text left alone»); the sentence goes on to the other rules unchanged.
 *
 * The keys are the guards' `motivo` codes: `creatura_inesistente` (R-inesistente, coerenza/inesistenti.ts, and the
 * Engine's added line of who is really there) and `colpo_assorbito` (the absorbed-blow branch of R-esito,
 * narrazione/guardia-esiti.ts).
 */
export const MOTIVI_IN_OSSERVAZIONE: ReadonlySet<string> = new Set(['creatura_inesistente', 'colpo_assorbito']);

/** Whether a guard's correction is only to be recorded. */
export function inOsservazione(motivo: string): boolean {
  return MOTIVI_IN_OSSERVAZIONE.has(motivo);
}
