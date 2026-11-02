/**
 * Pertinenza delle battute alle azioni del turno (repertorio B2, docs/repertorio.md «Versione 2»):
 * quali PNG le azioni nominano (anche per soprannome) e quali `temi` compaiono. Funzioni pure.
 */
import type { Campagna } from '../campagna/tipi';
import { normalizza } from '../azioni/regole';

/**
 * Soprannomi dei PNG di prova-f0 dal documento del repertorio, finché le schede non hanno il
 * campo `alias` (che, se c'è, ha la precedenza).
 */
const ALIAS_PREDEFINITI: Record<string, string[]> = {
  png_baldrin: ['nano'],
  png_ottavia: ['ostessa', 'oste'],
  png_sebastiano: ['forestiero', 'prigioniero', 'quello là dentro', 'quello la dentro'],
};

/** Parole e soprannomi con cui le azioni si riferiscono a ogni PNG (minuscole, senza accenti). */
export function nomiDeiPng(c: Campagna): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const p of c.png) {
    const daScheda = Array.isArray(p.dati['alias']) ? (p.dati['alias'] as unknown[]).filter((x): x is string => typeof x === 'string') : null;
    const parole = [p.nome, p.nome.split(/\s+/)[0] ?? '', ...(daScheda ?? ALIAS_PREDEFINITI[p.id] ?? [])];
    out.set(p.id, [...new Set(parole.map(normalizza).filter((x) => x.length > 2))]);
  }
  return out;
}

function contiene(testo: string, parola: string): boolean {
  // Confine a sinistra; a destra si accetta un suffisso (oste → ostessa no: la regola è per parole intere o prefissi lunghi).
  const p = parola.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${p}(?![\\p{L}\\p{N}])`, 'u').test(testo);
}

/** PNG nominati (per nome o soprannome) nel testo delle azioni. */
export function pngNominati(testoAzioni: string, nomi: Map<string, string[]>): Set<string> {
  const t = normalizza(testoAzioni);
  const out = new Set<string>();
  for (const [id, parole] of nomi) if (parole.some((p) => contiene(t, p))) out.add(id);
  return out;
}

/** Il testo delle azioni contiene uno dei temi (parola intera, o prefisso per i temi di almeno 5 lettere)? */
export function temaPresente(testoAzioni: string, temi: readonly string[]): boolean {
  const t = normalizza(testoAzioni);
  return temi.some((tema) => {
    const n = normalizza(tema);
    if (n.length < 3) return false;
    if (contiene(t, n)) return true;
    return n.length >= 5 && new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(t);
  });
}
