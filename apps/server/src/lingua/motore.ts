/**
 * Regole linguistiche del Motore (lingue/<codice>/motore.yaml, docs/lingue.md): lettura tipizzata e
 * compilata una volta per lingua.
 *
 * Ogni modulo che ha regole di lingua (collegamenti tra azioni, divisore di frasi, guardie, annuncio,
 * nomi brevi) chiede la SUA sezione con `regole('sezione', compila)`: `compila` trasforma i dati grezzi
 * dello YAML (testi, elenchi) in ciò che serve al codice (RegExp, Set…). Il risultato resta in cache
 * accanto al pacchetto della lingua: si compila alla prima richiesta (la lingua si imposta all'avvio,
 * quindi la lettura è pigra) e una lingua cambiata, o un pacchetto ricaricato, ricompila da sé.
 *
 * I prompt dei modelli che stavano nel codice (arbitro, lettore minimo, riassunto) si leggono con
 * `prompt(nome)`: prompts/<codice>/<nome>.md, senza gli spazi finali, in cache per lingua.
 */
import { caricaPacco, leggiPrompt, linguaAttiva, pacco, type Lingua, type Pacco } from './index';

/** Una sezione di motore.yaml, ancora grezza. */
export type Sezione = Readonly<Record<string, unknown>>;

/** Sezioni già compilate, per pacchetto (un pacchetto ricaricato è un altro oggetto: si ricompila). */
const compilate = new WeakMap<Pacco, Map<string, unknown>>();

/**
 * La sezione `nome` di motore.yaml nella lingua attiva (o in quella data), compilata con `compila`
 * alla prima richiesta. Una sezione assente è un errore di programmazione: si lancia subito.
 */
export function regole<T>(nome: string, compila: (s: Sezione, lingua: Lingua) => T, lingua?: Lingua): T {
  const p = lingua ? caricaPacco(lingua) : pacco();
  let m = compilate.get(p);
  if (!m) compilate.set(p, (m = new Map()));
  if (!m.has(nome)) {
    const s = p.motore[nome];
    if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error(`lingue/${p.codice}/motore.yaml: manca la sezione «${nome}»`);
    m.set(nome, compila(s as Sezione, p.codice));
  }
  return m.get(nome) as T;
}

/** Un campo testo di una sezione (anche vuoto). */
export function campoTesto(s: Sezione, k: string): string {
  const v = s[k];
  if (typeof v !== 'string') throw new Error(`motore.yaml: «${k}» deve essere un testo`);
  return v;
}

/** Un campo numerico di una sezione. */
export function campoNumero(s: Sezione, k: string): number {
  const v = s[k];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`motore.yaml: «${k}» deve essere un numero`);
  return v;
}

/** Un elenco di testi. */
export function campoElenco(s: Sezione, k: string): string[] {
  const v = s[k];
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw new Error(`motore.yaml: «${k}» deve essere un elenco di testi`);
  return v as string[];
}

/** Un elenco di coppie [da, a]. */
export function campoCoppie(s: Sezione, k: string): Array<[string, string]> {
  const v = s[k];
  if (!Array.isArray(v) || v.some((x) => !Array.isArray(x) || x.length !== 2 || x.some((y) => typeof y !== 'string'))) {
    throw new Error(`motore.yaml: «${k}» deve essere un elenco di coppie [da, a]`);
  }
  return v as Array<[string, string]>;
}

/** Un elenco di oggetti (le voci li controlla chi li compila). */
export function campoOggetti(s: Sezione, k: string): Sezione[] {
  const v = s[k];
  if (!Array.isArray(v) || v.some((x) => !x || typeof x !== 'object' || Array.isArray(x))) throw new Error(`motore.yaml: «${k}» deve essere un elenco di voci`);
  return v as Sezione[];
}

/** Un'espressione regolare da un campo testo; testo vuoto = null (regola assente in quella lingua). */
export function campoRegex(s: Sezione, k: string, flags = ''): RegExp | null {
  const t = campoTesto(s, k);
  if (!t) return null;
  try {
    return new RegExp(t, flags);
  } catch (err) {
    throw new Error(`motore.yaml: «${k}» non è un'espressione regolare valida (${(err as Error).message})`);
  }
}

const prompt_ = new Map<string, string>();

/** Un prompt di prompts/<lingua attiva>/<nome>.md, senza gli spazi finali (così è identico al testo di prima). */
export function prompt(nome: string, lingua: Lingua = linguaAttiva()): string {
  const k = `${lingua}/${nome}`;
  let t = prompt_.get(k);
  if (t === undefined) prompt_.set(k, (t = leggiPrompt(nome, lingua).replace(/\s+$/, '')));
  return t;
}
