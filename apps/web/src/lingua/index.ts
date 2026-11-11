/**
 * Lingua dell'interfaccia (docs/lingue.md): telefono, proiettore e pannello del master. Nessuna
 * dipendenza: dizionari TypeScript a chiavi piatte («telefono.banner.tocca_a_te»), con segnaposto
 * `{nome}`. L'italiano è il riferimento; ogni altra lingua ha esattamente le sue chiavi (lo controllano
 * `satisfies` nei file della lingua e lingua.test.ts per i segnaposto).
 *
 * La lingua arriva dal server: `/api/salute` all'avvio della pagina (main.tsx) e `StatoTavolo.lingua`
 * a ogni stato. Finché non arriva vale l'italiano. Ciò che dice il Motore (narrazione, avvisi, motivi)
 * arriva già nella lingua dei contenuti e non passa da qui.
 */
import type { CodiceLingua } from '@tabletop-ai-gm/shared';
import { comune as comuneIt } from './it/comune';
import { telefono as telefonoIt } from './it/telefono';
import { schermo as schermoIt } from './it/schermo';
import { master as masterIt } from './it/master';
import { comune as comuneEn } from './en/comune';
import { telefono as telefonoEn } from './en/telefono';
import { schermo as schermoEn } from './en/schermo';
import { master as masterEn } from './en/master';

const it = { ...comuneIt, ...telefonoIt, ...schermoIt, ...masterIt };
export type Chiave = keyof typeof it;

export const DIZIONARI: Record<CodiceLingua, Record<Chiave, string>> = {
  it,
  en: { ...comuneEn, ...telefonoEn, ...schermoEn, ...masterEn },
};

export const LINGUE_INTERFACCIA = Object.keys(DIZIONARI) as CodiceLingua[];

let attiva: CodiceLingua = 'it';
const ascoltatori = new Set<(l: CodiceLingua) => void>();

export function èLinguaInterfaccia(x: unknown): x is CodiceLingua {
  return typeof x === 'string' && x in DIZIONARI;
}

/** Imposta la lingua dell'interfaccia (dal server). Una lingua sconosciuta si ignora. */
export function impostaLinguaInterfaccia(l: unknown): void {
  if (!èLinguaInterfaccia(l) || l === attiva) return;
  attiva = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  for (const f of ascoltatori) f(l);
}

export function linguaInterfaccia(): CodiceLingua {
  return attiva;
}

/** Tag BCP 47 di ogni lingua dell'interfaccia, per date e ore (toLocaleDateString, toLocaleTimeString). */
const LOCALI: Record<CodiceLingua, string> = { it: 'it-IT', en: 'en-GB' };

/** Il tag BCP 47 della lingua dell'interfaccia («it-IT», «en-GB»): date e ore si scrivono come la legge chi gioca. */
export function localeInterfaccia(lingua: CodiceLingua = attiva): string {
  return LOCALI[lingua];
}

/** Chi deve ridisegnarsi quando la lingua cambia (App). Restituisce la funzione che lo toglie. */
export function alCambioLingua(f: (l: CodiceLingua) => void): () => void {
  ascoltatori.add(f);
  return () => ascoltatori.delete(f);
}

/** Il testo di una chiave nella lingua dell'interfaccia, con i segnaposto `{nome}` sostituiti. */
export function t(chiave: Chiave, valori: Record<string, string | number> = {}, lingua: CodiceLingua = attiva): string {
  const testo = DIZIONARI[lingua][chiave] ?? DIZIONARI.it[chiave] ?? chiave;
  return testo.replace(/\{(\w+)\}/g, (tutto, nome: string) => (nome in valori ? String(valori[nome]) : tutto));
}

/** Elenco nella lingua dell'interfaccia: «A», «A e B», «A, B e C» / «A and B». */
export function elenco(nomi: readonly string[]): string {
  if (nomi.length <= 1) return nomi[0] ?? '';
  return `${nomi.slice(0, -1).join(', ')}${t('comune.elenco.e')}${nomi[nomi.length - 1] ?? ''}`;
}
