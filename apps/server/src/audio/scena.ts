/**
 * Dalla scena in corso e dal luogo corrente a ciò che il proiettore deve suonare (AudioScena):
 * funzioni pure sul catalogo audio e sulla campagna, così la Regia aggiunge solo una riga allo stato.
 *
 * Regole (docs/audio.md, «In gioco»):
 * - musica: `luogo_<luogo>`; se manca, quella del luogo equivalente (la scena e il suo nodo sono
 *   lo stesso posto: `scena_forno_vecchio` ↔ `n_osteria`); se manca anche quella, l'umore della
 *   scena (`umore_<musica.tag>`); altrimenti silenzio (null);
 * - umore esplicito (master o Motore, solo per la scena in cui è stato scelto): vince sulla musica;
 *   se nessuno l'ha scelto, vale l'umore iniziale della scena (`audio.umore_iniziale`), se c'è;
 * - ambienti: gli strati del luogo, o del luogo equivalente;
 * - temi: un tema per ogni PNG della campagna che ne ha uno;
 * - prossimi: musica e ambienti dei luoghi vicini (gli stessi delle immagini: collegamenti del nodo
 *   della scena, scene d'uscita), poi i temi dei PNG presenti.
 */
import type { AudioScena } from '@tabletop-ai-gm/shared';
import type { Campagna } from '../campagna/tipi';
import type { CatalogoAudio } from './catalogo';
import { umoreIniziale } from './cue';

/**
 * Umore scelto dal master o dal Motore: vale solo nella scena in cui è stato scelto. `tag` null =
 * scelto «auto» (la musica del luogo, anche se la scena ha un umore iniziale).
 */
export interface UmoreScelto {
  tag: string | null;
  scena: string;
}

type Nodo = Record<string, unknown>;

function nodi(c: Campagna): Nodo[] {
  const n = c.campagnaNarratore['nodi'];
  return Array.isArray(n) ? (n as Nodo[]) : [];
}

function nodoDi(dati: Record<string, unknown>): string | null {
  return typeof dati['nodo'] === 'string' ? (dati['nodo'] as string) : null;
}

/** Id di tutte le scene e di tutti i nodi della campagna (per leggere gli id `amb_<luogo>_<tag>`). */
export function luoghiNoti(c: Campagna): string[] {
  const ids = [...c.scene.map((s) => s.id), ...nodi(c).map((n) => n['id']).filter((x): x is string => typeof x === 'string')];
  return [...new Set(ids)];
}

/** Il luogo equivalente: la scena ↔ il suo nodo (stesso posto, due id). */
export function luogoEquivalente(c: Campagna, luogo: string): string | null {
  const scena = c.scene.find((s) => s.id === luogo);
  if (scena) return nodoDi(scena.dati);
  return c.scene.find((s) => nodoDi(s.dati) === luogo)?.id ?? null;
}

/**
 * Luoghi probabili dopo quello corrente, nell'ordine di probabilità: la scena stessa, le scene
 * d'uscita e i nodi collegati al nodo della scena (come le immagini da precaricare).
 */
export function luoghiVicini(c: Campagna, luogo: string): string[] {
  const nodo = nodoDi(c.scena.dati);
  const collegati = (nodi(c).find((n) => n['id'] === nodo)?.['collegamenti'] as unknown[] | undefined) ?? [];
  const uscite = ((c.scena.dati['uscite'] as Array<Record<string, unknown>> | undefined) ?? []).map((u) => u?.['verso']);
  const vicine = c.scene.filter((s) => s.id !== c.scena.id && [...collegati, ...uscite].includes(nodoDi(s.dati))).map((s) => s.id);
  // Solo i collegamenti che sono luoghi (non PNG né eventi): un nodo senza tipo vale come luogo.
  const èLuogo = (x: unknown): x is string =>
    typeof x === 'string' && nodi(c).some((n) => n['id'] === x && (n['tipo'] === undefined || n['tipo'] === 'luogo'));
  const luoghiCollegati = collegati.filter(èLuogo);
  const equivalente = luogoEquivalente(c, luogo);
  return [...new Set([c.scena.id, ...vicine, ...luoghiCollegati])].filter((l) => l !== luogo && l !== equivalente);
}

/** Musica di un luogo con i ripieghi (equivalente, poi umore della scena), o null. */
function musicaDi(cat: CatalogoAudio, c: Campagna, luogo: string): string | null {
  const equivalente = luogoEquivalente(c, luogo);
  return cat.musicaLuogo(luogo) ?? (equivalente ? cat.musicaLuogo(equivalente) : null) ?? cat.umore(c.scena.umore);
}

/** Strati d'ambiente di un luogo, o del luogo equivalente se il primo non ne ha. */
function ambientiDi(cat: CatalogoAudio, c: Campagna, luogo: string, noti: readonly string[]): string[] {
  const propri = cat.ambienti(luogo, noti);
  if (propri.length) return propri;
  const equivalente = luogoEquivalente(c, luogo);
  return equivalente ? cat.ambienti(equivalente, noti) : [];
}

/** Audio della scena per lo stato pubblico. `c` è la campagna vista dalla scena in corso (conScena). */
export function audioDellaScena(cat: CatalogoAudio, c: Campagna, luogo: string, umoreScelto: UmoreScelto | null): AudioScena {
  const noti = luoghiNoti(c);
  const temi: Record<string, string> = {};
  for (const p of c.png) {
    const t = cat.tema(p.id);
    if (t) temi[p.id] = t;
  }
  const musica = musicaDi(cat, c, luogo);
  const ambienti = ambientiDi(cat, c, luogo, noti);
  // Umore in vigore: quello scelto in questa scena; se nessuno l'ha scelto, l'umore iniziale della scena.
  const scelto = umoreScelto && umoreScelto.scena === c.scena.id ? umoreScelto : null;
  const tag = scelto ? scelto.tag : umoreIniziale(c.scena.dati);
  const umore = tag ? cat.umore(tag) : null;
  const correnti = new Set<string>([...(musica ? [musica] : []), ...(umore ? [umore] : []), ...ambienti]);
  const prossimi = [
    ...luoghiVicini(c, luogo).flatMap((l) => [musicaDi(cat, c, l), ...ambientiDi(cat, c, l, noti)]),
    ...c.scena.png_presenti.map((id) => temi[id]),
  ].filter((id): id is string => !!id && !correnti.has(id));
  return { scena: c.scena.id, musica, umore, ambienti, temi, umori: cat.umori(), prossimi: [...new Set(prossimi)] };
}
