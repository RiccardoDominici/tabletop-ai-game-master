/**
 * Condizioni nei tiri (docs/combattimento.md, «Condizioni»): gli effetti meccanici delle condizioni
 * attive diventano fonti di vantaggio o svantaggio, critici, tiri salvezza falliti, turni persi.
 * Logica pura: le condizioni attive le tiene lo scontro (prove/scontro.ts).
 */
import type { Vantaggio } from '@cantastorie/shared';
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
  const add = (v: Vantaggio, nome: string | null, di: string): void => void (nome && out.push({ v, motivo: `${di} ${nome.toLowerCase()}` }));
  add('svantaggio', conEffetto(c, chi, 'svantaggio_attacchi'), 'chi attacca è');
  add('vantaggio', conEffetto(c, chi, 'vantaggio_attacchi'), 'chi attacca è');
  add('vantaggio', conEffetto(c, bersaglio, 'attacchi_contro_vantaggio'), 'il bersaglio è');
  add('svantaggio', conEffetto(c, bersaglio, 'attacchi_contro_svantaggio'), 'il bersaglio è');
  return out;
}
