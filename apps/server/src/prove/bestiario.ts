/**
 * A monster's hit points in play (regole/bestiario.ts; audit P6-04: «HP = HD × d8 plus the bonus», Basic Fantasy p. 62).
 * A sheet that writes no hit points but has hit dice (or writes a formula, «1d2») gets them rolled once per creature:
 * each goblin of a band its own. The roll is the Engine's, never a model's, and it does not draw from the session's
 * dice stream: each creature's dice come from the session seed and its id (an HMAC, as prove/dadi.ts draws every die),
 * so the manual-roll dry run (a copy of the Engine with the same seed), a resume (the seed comes back with the snapshot)
 * and a fixed `TAGM_SEME_DADI` all see the same numbers, and no player's roll moves because a monster appeared.
 * «Ricomincia» draws a new seed, so the monsters roll again.
 */
import { createHash } from 'node:crypto';
import type { Logger } from '../logger';
import type { SchedaGenerica } from '../regole/tipi';
import { DadiCrittografici } from './dadi';
import { danno as tiraDanno } from './regole';

/** The seed of one creature's hit-point roll: the session's seed and its id. */
function semeDi(seme: string, id: string): string {
  return createHash('sha256').update(`${seme}|pf|${id}`).digest('hex');
}

/**
 * Roll the hit points of every live sheet with `pfDaTirare` (the Engine's copies, regole/schede.ts): its maximum
 * becomes the roll (at least 1). Returns what was rolled, for the log and the tests.
 */
export function tiraPuntiFeritaMostri(schede: ReadonlyMap<string, SchedaGenerica>, seme: string, log: Logger): Array<{ id: string; formula: string; dadi: number[]; pf: number }> {
  const out: Array<{ id: string; formula: string; dadi: number[]; pf: number }> = [];
  for (const sch of schede.values()) {
    const f = sch.pfDaTirare;
    if (!f) continue;
    const d = tiraDanno(new DadiCrittografici(semeDi(seme, sch.id)), f, 0, false);
    sch.pf_massimi = Math.max(1, d.totale);
    out.push({ id: sch.id, formula: d.formula, dadi: d.dadi, pf: sch.pf_massimi });
  }
  if (out.length) log.info({ mostri: out.map((x) => ({ id: x.id, formula: x.formula, pf: x.pf })) }, 'bestiary: hit points rolled once per creature from the session seed');
  return out;
}
