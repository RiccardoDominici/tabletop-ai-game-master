/**
 * Which of the set's situational attack modifiers apply to one PC attack (regole/modificatori.ts reads them; A17 of
 * docs/da-fare.md). Deterministic: a word of the modifier at the start of a word of what the PC does (speech removed,
 * normalised like every word list of the Engine), the kind of attack, the weapon, the abilities it does not combine
 * with. Two modifiers of one situation are the set's to avoid; the Engine sums what applies.
 */
import { normalizza } from '../azioni/regole';
import type { Modificatore, SistemaRegole } from '../regole/tipi';
import { senzaParlato } from './parole-testo';

const regex = new WeakMap<Modificatore, RegExp>();

function trova(m: Modificatore): RegExp {
  let r = regex.get(m);
  if (!r) {
    const voci = m.parole.map((p) => normalizza(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    r = new RegExp(`(?<![\\p{L}\\p{N}])(${voci.join('|')})`, 'u');
    regex.set(m, r);
  }
  return r;
}

/** The weapon of the attack, as the resolver knows it: its id, ranged or not, the set's ability it rolls with. */
export interface ArmaDellAttacco {
  id: string;
  distanza: boolean;
  abilita: string | null;
}

/** The modifiers that apply to this attack (empty: none, the SRD, an NPC). */
export function modificatoriDellAttacco(s: SistemaRegole, testoAzione: string, arma: ArmaDellAttacco): Modificatore[] {
  if (!s.modificatori?.length) return [];
  const t = normalizza(senzaParlato(testoAzione));
  const pezzi = arma.id.split(/[_\s]+/).map(normalizza);
  return s.modificatori.filter(
    (m) =>
      (m.attacchi === 'tutti' || (m.attacchi === 'distanza') === arma.distanza) &&
      (!m.armi.length || m.armi.some((w) => pezzi.includes(normalizza(w)))) &&
      !(arma.abilita && m.nonCon.includes(arma.abilita)) &&
      trova(m).test(t),
  );
}

/** Whether the action's words (speech removed, normalised) have one of `parole` at the start of a word. */
export function haParole(testoAzione: string, parole: readonly string[]): boolean {
  if (!parole.length) return false;
  const t = normalizza(senzaParlato(testoAzione));
  const voci = parole.map((p) => normalizza(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![\\p{L}\\p{N}])(${voci.join('|')})`, 'u').test(t);
}
