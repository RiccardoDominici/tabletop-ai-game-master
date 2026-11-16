/**
 * Rules in observation (docs/coerenza.md, «Measured, round 2»): two measuring rounds on the blind scripts did not
 * show that these rules help, and single runs swing too much to tell a fix from noise (combat-manual 10 → 6,
 * combat-auto 4 → 9 high-severity sentences on close code). Until the frozen replay set scores them
 * (esperimenti/coerenza/), they only record what they would have done (`azione: 'osservata'` in narrazioni.jsonl and
 * the log line «coherence: rule in observation, text left alone»); the sentence goes on to the other rules unchanged.
 *
 * The keys are the guards' `motivo` codes. Only `colpo_assorbito` (the absorbed-blow branch of R-esito,
 * narrazione/guardia-esiti.ts) is in observation now: the frozen and held-out sets have four sentences about a hurting
 * card, too few to judge it. `creatura_inesistente` (R-inesistente) came out of observation on 16 November (the lead's
 * decision): on both sets it adds catches without touching more clean sentences, so it is part of the rules again,
 * where the rules decide (profile A, a late or failed question of the yes/no judge, or the judge off).
 */
export const MOTIVI_IN_OSSERVAZIONE: ReadonlySet<string> = new Set(['colpo_assorbito']);

/** Whether a guard's correction is only to be recorded. */
export function inOsservazione(motivo: string): boolean {
  return MOTIVI_IN_OSSERVAZIONE.has(motivo);
}
