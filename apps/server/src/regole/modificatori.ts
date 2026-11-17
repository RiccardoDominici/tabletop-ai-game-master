/**
 * Situational attack modifiers a rule set declares (regole.yaml → `modificatori`, docs/regole.md §2; A17 of
 * docs/da-fare.md): attacking from behind, a charge, short or long range. The Engine knows no positions, so what makes
 * one apply is written in the set, deterministically: words of the PC's action (`parole`), the kind of attack
 * (`attacchi`: every attack, melee or ranged, from the weapon's `distanza`), optionally the weapon (`armi`: words of
 * its id, a charge needs a spear) and the abilities it does not combine with (`non_con`: Basic Fantasy's +2 from
 * behind does not combine with the thief's Sneak Attack, p. 53). Only a PC's attack has words: an NPC's never gets one.
 * This module reads the YAML; prove/modificatori.ts matches an action.
 */
import type { Modificatore } from './tipi';

const ogg = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const parole = (v: unknown): string[] | null => (Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim()) ? (v as string[]).map((x) => x.trim()) : null);

/** The set's `modificatori`, with an error for each malformed entry (the entry is then left out). */
export function leggiModificatori(v: unknown, abilita: ReadonlySet<string>, errori: string[]): Modificatore[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) {
    errori.push('modificatori: una lista');
    return [];
  }
  const out: Modificatore[] = [];
  const visti = new Set<string>();
  v.forEach((x, i) => {
    const o = ogg(x);
    const id = str(o?.['id']);
    const dove = `modificatori.${id ?? `[${i + 1}]`}`;
    if (!o || !id || !/^[a-z0-9_]+$/.test(id) || visti.has(id)) {
      errori.push(`${dove}: serve un id snake_case, unico`);
      return;
    }
    visti.add(id);
    const bonus = o['bonus'];
    const attacchi = o['attacchi'] ?? 'tutti';
    const pp = parole(o['parole']);
    const armi = o['armi'] === undefined ? [] : parole(o['armi']);
    const nonCon = o['non_con'] === undefined ? [] : parole(o['non_con']);
    const danno = o['danno'] ?? 'normale';
    const sbagli = [
      typeof bonus !== 'number' || !Number.isInteger(bonus) || bonus === 0 || Math.abs(bonus) > 10 ? 'bonus: un intero da −10 a 10, non 0' : null,
      attacchi !== 'tutti' && attacchi !== 'mischia' && attacchi !== 'distanza' ? 'attacchi: tutti, mischia o distanza' : null,
      !pp?.length ? 'parole: almeno una (le parole dell\'azione del PG che lo fanno valere)' : null,
      !armi ? 'armi: una lista di parole dell\'id dell\'arma' : null,
      !nonCon ? 'non_con: una lista di abilità del set' : null,
      ...(nonCon ?? []).filter((a) => !abilita.has(a)).map((a) => `non_con: «${a}» non è un'abilità del set`),
      danno !== 'normale' && danno !== 'doppio' ? 'danno: normale o doppio' : null,
    ].filter((x): x is string => !!x);
    if (sbagli.length) {
      for (const s of sbagli) errori.push(`${dove}: ${s}`);
      return;
    }
    out.push({ id, nome: str(o['nome']) ?? id, bonus: bonus as number, attacchi: attacchi as Modificatore['attacchi'], parole: pp!, armi: armi!, nonCon: nonCon!, danno: danno as Modificatore['danno'] });
  });
  return out;
}
