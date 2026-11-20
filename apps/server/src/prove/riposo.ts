/**
 * A rest (docs/regole.md §2, `riposo`; docs/prove.md §10): the Game Master gives the party a night's sleep, a day in
 * bed or the SRD's long rest from the panel, and the Engine applies the set's rule to every character with a sheet:
 * hit points back (a number, a formula rolled for each, or all of them), never for the dead. The refresh of resources
 * and the end of rest-long effects are done by the caller (prove/motore.ts), which owns those states.
 *
 * Deterministic given the dice. No cards: a rest is between scenes, the facts go to the narrator and the transcript.
 */
import { testo } from '../lingua';
import type { Logger } from '../logger';
import type { TipoRiposo } from '../regole/salute';
import type { FonteDadi } from './dadi';
import { danno as tiraDanno } from './regole';
import type { StatoProve } from './stato';

export interface EsitoRiposo {
  /** One line for the narrator and the transcript. */
  fatto: string;
  /** Hit points recovered, by character. */
  curati: Map<string, number>;
}

export function riposa(
  r: TipoRiposo,
  ids: readonly string[],
  o: { stato: StatoProve; dadi: FonteDadi; nome: (id: string) => string; danni: string; dopoCura?: (id: string) => void; log: Logger },
): EsitoRiposo {
  const curati = new Map<string, number>();
  const parti: string[] = [];
  for (const id of ids) {
    const p = o.stato.puntiFerita(id);
    if (!p || o.stato.fuoriGioco(id) === 'morto') continue;
    const quanti = r.cura.tipo === 'tutti' ? p.massimi : tiraDanno(o.dadi, r.cura.dadi, 0, false).totale;
    const dopo = o.stato.curaRegola(id, quanti);
    if (!dopo) continue;
    const n = dopo.attuali - p.attuali;
    curati.set(id, n);
    if (p.attuali <= 0 && dopo.attuali > 0) o.dopoCura?.(id);
    // Only the PCs' numbers are said; an NPC's recovery stays in the log (the narrator never says an NPC's HP).
    if (!id.startsWith('png_') && n > 0) parti.push(testo('prove.riposo.pg', { nome: o.nome(id), n, danni: o.danni.toLowerCase(), attuali: dopo.attuali, massimi: dopo.massimi }));
  }
  o.log.info({ riposo: r.id, curati: Object.fromEntries(curati) }, 'rest: hit points recovered');
  const fatto = testo('prove.riposo.fatto', { riposo: r.nome, elenco: parti.length ? parti.join('; ') : testo('prove.riposo.nessuno') });
  return { fatto, curati };
}
