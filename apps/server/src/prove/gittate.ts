/**
 * The range band of a shot (Basic Fantasy p. 11 and p. 54: short +1, medium 0, long −2, nothing beyond long; docs/regole.md
 * §2, «Catalogo», `gittate`). The Engine knows no positions, so the distance comes from what the player wrote, read by
 * deterministic code: a number with the set's unit («a 20 metri», «a venti metri») compared with the weapon's band limits;
 * else the words of a band («da vicino»); else the set's default band. A distance beyond the long limit is no shot.
 */
import { normalizza } from '../azioni/regole';
import type { FasciaGittata, Gittate } from '../regole/catalogo';
import { datiProve } from './lingua';
import { senzaParlato } from './parole-testo';

export type GittataScelta =
  | { fuori: false; fascia: FasciaGittata; da: 'distanza' | 'parole' | 'predefinita'; distanza: number | null }
  | { fuori: true; distanza: number; massimo: number };

const esc = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The distance the action says, in the set's unit: «a 20 metri», «a venti metri»; null when it says none. */
export function distanzaDetta(g: Gittate, testoAzione: string): number | null {
  const t = normalizza(senzaParlato(testoAzione));
  const unita = g.paroleUnita.map((u) => esc(normalizza(u))).join('|');
  if (!unita) return null;
  const numeri: Record<string, number> = Object.fromEntries((datiProve().parole.numeri ?? []).flatMap((x) => {
    const [w, v] = x.split('=');
    return w && v && Number.isFinite(Number(v)) ? [[w.trim(), Number(v)]] : [];
  }));
  const parole = Object.keys(numeri).map((w) => esc(normalizza(w))).join('|');
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(\\d+(?:[.,]\\d+)?${parole ? `|${parole}` : ''})\\s*(?:${unita})(?![\\p{L}])`, 'u');
  const m = re.exec(t);
  if (!m) return null;
  const n = m[1]!;
  if (/^\d/.test(n)) return Number(n.replace(',', '.'));
  const k = Object.keys(numeri).find((w) => normalizza(w) === n);
  return k !== undefined ? numeri[k]! : null;
}

/** The band of a shot with these limits (one per band of the set, nearest first). */
export function gittataDelTiro(g: Gittate, limiti: readonly number[], testoAzione: string): GittataScelta {
  const d = distanzaDetta(g, testoAzione);
  if (d !== null) {
    const massimo = limiti.at(-1) ?? 0;
    if (d > massimo) return { fuori: true, distanza: d, massimo };
    const i = limiti.findIndex((l) => d <= l);
    return { fuori: false, fascia: g.fasce[Math.max(0, i)]!, da: 'distanza', distanza: d };
  }
  const t = normalizza(senzaParlato(testoAzione));
  for (const f of g.fasce) {
    if (!f.parole.length) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(${f.parole.map((p) => esc(normalizza(p))).join('|')})`, 'u');
    if (re.test(t)) return { fuori: false, fascia: f, da: 'parole', distanza: null };
  }
  return { fuori: false, fascia: g.fasce.find((f) => f.id === g.predefinita) ?? g.fasce[0]!, da: 'predefinita', distanza: null };
}
