/**
 * Refusal guard (docs/prove.md, «The card and the story agree»): after a FAILED social check toward an NPC, that NPC
 * does not give in during the same turn. Second pass of the final end-to-end run (indagine-B T10): after «Carisma 3
 * contro CD 13, fallita» Haiku still had Ugo say «Il sentiero lo conosco io» and point the path with his shovel.
 *
 * Before the voice, a sentence is replaced by the NPC's refusal line (its `rifiuto` line from the repertoire, chosen
 * by the director) when:
 * - it is a line of that NPC (`[png_x]`) with no refusal word (`guardia_esiti.rifiuto`: «non», «niente», «mai»…):
 *   a reply that says no stays;
 * - it is a narrator sentence where that NPC, named before it in the same clause, does a giving verb
 *   (`guardia_esiti.cede`: «indica», «consegna», «rivela»…) with no negation right before it.
 * Words live in the language pack. Pure logic: the director passes the NPCs who refused this turn and their names.
 */
import { ID_NARRATORE } from '../campagna/tipi';
import { normalizza } from '../azioni/regole';
import { campoElenco, regole } from '../lingua/motore';
import { doveNomina, paroleDi, posizione } from './guardia-esiti';

interface Parole {
  rifiuto: ReadonlySet<string>;
  cede: string[][];
  negazioni: ReadonlySet<string>;
}

const parole = (): Parole =>
  regole('guardia_rifiuti', (s) => ({
    rifiuto: new Set(campoElenco(s, 'rifiuto').map(normalizza)),
    cede: campoElenco(s, 'cede').map(paroleDi).filter((v) => v.length > 0),
    negazioni: new Set(campoElenco(s, 'negazioni').map(normalizza)),
  }));

/** The NPC whose refusal must replace this sentence, or null when the sentence stays. */
export function guardiaRifiuti(negati: ReadonlySet<string>, nomi: ReadonlyMap<string, readonly string[]>): (etichetta: string, frase: string) => string | null {
  return (etichetta, frase) => {
    if (!negati.size) return null;
    const p = parole();
    const w = paroleDi(frase);
    // The NPC's own line: a reply that does not say no gives in.
    if (negati.has(etichetta)) return w.some((x) => p.rifiuto.has(x)) ? null : etichetta;
    if (etichetta !== ID_NARRATORE) return null;
    // A narrator sentence where the NPC gives, points, reveals: clause by clause.
    for (const pezzo of frase.split(/[.;:!?—–]+/)) {
      const c = paroleDi(pezzo);
      for (const id of negati) {
        const n = doveNomina(c, nomi.get(id) ?? []);
        if (n < 0) continue;
        for (const v of p.cede) {
          const k = posizione(c, v);
          if (k > n && !c.slice(Math.max(0, k - 3), k).some((x) => p.negazioni.has(x))) return id;
        }
      }
    }
    return null;
  };
}
