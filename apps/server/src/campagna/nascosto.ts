/**
 * Elementi NASCOSTI delle schede scena (docs/repertorio.md, contesto della modalità B): un elemento
 * interattivo che porta il marcatore della lingua («NASCOSTA: …», «HIDDEN: …») non va mai al selettore,
 * all'arbitro né agli altri contesti pubblici. I marcatori stanno in lingue/<codice>/motore.yaml, sezione
 * `nascosto`, e valgono TUTTI in ogni campagna, qualunque sia la sua lingua: una campagna inglese scritta
 * col marcatore italiano (o il contrario) non perde il segreto. Meglio nascondere un elemento in più che
 * mostrarne uno nascosto. Prima c'era solo «NASCOST»: una campagna inglese con «HIDDEN:» (come dice lo
 * schema della skill) mandava gli elementi nascosti al selettore (e2e finale, A4).
 */
import { LINGUE } from '../lingua';
import { campoElenco, regole } from '../lingua/motore';

let cache: RegExp | null = null;

/** Tutti i marcatori di tutte le lingue, in un'espressione sola (senza maiuscole, prefissi di parola). */
export function marcatoreNascosto(): RegExp {
  if (!cache) {
    const voci = [...new Set(LINGUE.flatMap((l) => regole('nascosto', (s) => campoElenco(s, 'marcatori'), l)))];
    cache = new RegExp(`\\b(${voci.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i');
  }
  return cache;
}

/** L'elemento (o qualsiasi dato) è segnato nascosto in uno dei suoi campi. */
export function elementoNascosto(e: unknown): boolean {
  return marcatoreNascosto().test(typeof e === 'string' ? e : JSON.stringify(e ?? ''));
}
