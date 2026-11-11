/**
 * Condizioni nei tiri (docs/combattimento.md, «Condizioni»): gli effetti meccanici delle condizioni
 * attive diventano fonti di vantaggio o svantaggio, critici, tiri salvezza falliti, turni persi.
 * Logica pura: le condizioni attive le tiene lo scontro (prove/scontro.ts).
 */
import type { Vantaggio } from '@tabletop-ai-gm/shared';
import { testo } from '../lingua';
import type { Effetto } from '../regole/combattimento';

/** Condizioni attive di un personaggio (nome ed effetti). */
export type CondizioniDi = (id: string) => ReadonlyArray<{ nome: string; effetti: readonly Effetto[] }>;

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
