/**
 * Condizioni nei tiri (docs/combattimento.md, «Condizioni»): gli effetti meccanici delle condizioni
 * attive diventano fonti di vantaggio o svantaggio, critici, tiri salvezza falliti, turni persi.
 * Logica pura: le condizioni attive le tiene lo scontro (prove/scontro.ts).
 */
import type { Vantaggio } from '@tabletop-ai-gm/shared';
import { testo } from '../lingua';
import type { Effetto, ValoriCondizione } from '../regole/combattimento';

/** Condizioni attive di un personaggio (nome ed effetti; the numbers some carry and their group). */
export type CondizioniDi = (id: string) => ReadonlyArray<{ nome: string; effetti: readonly Effetto[]; valori?: ValoriCondizione; gruppo?: string }>;

/**
 * The numbers the conditions add to one attack (Basic Fantasy p. 59): the attacker's `attacchi` (blinded −4) and the
 * target's `contro` (blinded +4, invisible −4). Penalties of one sign in one group count once, the strongest (a blind
 * attacker against an invisible target: −4, not −8). Each with its condition's name, for the card.
 */
export function valoriAttacco(c: CondizioniDi | undefined, chi: string, bersaglio: string): Array<{ nome: string; valore: number }> {
  if (!c) return [];
  const voci = [
    ...c(chi).flatMap((x) => (x.valori?.attacchi ? [{ nome: x.nome, valore: x.valori.attacchi, gruppo: x.gruppo }] : [])),
    ...c(bersaglio).flatMap((x) => (x.valori?.contro ? [{ nome: x.nome, valore: x.valori.contro, gruppo: x.gruppo }] : [])),
  ];
  const out: Array<{ nome: string; valore: number }> = [];
  const visti = new Map<string, { nome: string; valore: number }>();
  for (const v of voci) {
    if (!v.gruppo) {
      out.push({ nome: v.nome, valore: v.valore });
      continue;
    }
    const k = `${v.gruppo}|${Math.sign(v.valore)}`;
    const prima = visti.get(k);
    if (!prima || Math.abs(v.valore) > Math.abs(prima.valore)) visti.set(k, { nome: v.nome, valore: v.valore });
  }
  return [...out, ...visti.values()];
}

/** Il nome della prima condizione di `id` con quell'effetto, o null. */
export function conEffetto(c: CondizioniDi | undefined, id: string, e: Effetto): string | null {
  return c?.(id).find((x) => x.effetti.includes(e))?.nome ?? null;
}

/** Fonti di vantaggio/svantaggio di un attacco: chi attacca e chi è attaccato. */
export function fontiAttacco(c: CondizioniDi | undefined, chi: string, bersaglio: string): Array<{ v: Vantaggio; motivo: string }> {
  const out: Array<{ v: Vantaggio; motivo: string }> = [];
  // «chi attacca è avvelenato», «il bersaglio è prono» (prove.motivo.*, nella lingua dei contenuti).
  const add = (v: Vantaggio, nome: string | null, chiave: 'attaccante' | 'bersaglio'): void => void (nome && out.push({ v, motivo: testo(`prove.motivo.${chiave}`, { condizione: nome.toLowerCase() }) }));
  add('svantaggio', conEffetto(c, chi, 'svantaggio_attacchi'), 'attaccante');
  add('vantaggio', conEffetto(c, chi, 'vantaggio_attacchi'), 'attaccante');
  add('vantaggio', conEffetto(c, bersaglio, 'attacchi_contro_vantaggio'), 'bersaglio');
  add('svantaggio', conEffetto(c, bersaglio, 'attacchi_contro_svantaggio'), 'bersaglio');
  return out;
}
