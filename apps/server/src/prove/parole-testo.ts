/**
 * Parole di un'azione per l'arbitro a regole (docs/prove.md, «Arbitro a regole»): confronto per
 * PAROLE INTERE, non per radici di cinque lettere. Nella e2e finale del 10 novembre (profilo A) 14
 * carte su 35 erano assurde: «spalla» trovava «spallata» (Forzare una porta), «scala» trovava
 * «scalare», «passano» trovava «passaggio» (Cercare porte segrete), e una frase detta agli altri tirava
 * Intelligenza. Qui le regole che valgono in ogni lingua; le parole stanno nel pacchetto della lingua
 * (lingue/<codice>/prove.yaml, sezione `parole`):
 * - `finali`: le desinenze che si tolgono prima del confronto (in italiano a, e, i, o, are, ere, ire:
 *   «trappola» = «trappole», «cerco» = «cercare»; «spalla» ≠ «spallata»);
 * - `generiche`: parole di luogo, corpo e oggetti comuni che da sole non dicono quale prova (porta,
 *   passaggio, scala, spalla, ombra…): non trovano niente, né nel testo né nelle parole chiave;
 * - `parlato`: i verbi del dire; ciò che segue «dico agli altri:» e le parole fra virgolette sono
 *   parlato, non gesti: contano solo per le prove sociali;
 * - `rivolto`: le preposizioni con cui ci si rivolge a qualcuno («chiedo a Berta»).
 * Logica pura.
 */
import { normalizza } from '../azioni/regole';
import { campoElenco, regole } from '../lingua/motore';
import { datiProve } from './lingua';

interface Compilate {
  finali: string[];
  generiche: ReadonlySet<string>;
  vuote: ReadonlySet<string>;
  parlato: RegExp;
  /** Un verbo del dire senza i due punti: il parlato va fino alla fine della frase («dico piano a Ida che…»). */
  parlatoFrase: RegExp;
  /** «Chiedo a Ugo se…», «chiedo chi…»: una domanda anche senza il punto di domanda. */
  domandaIndiretta: RegExp;
  rivolto: ReadonlySet<string>;
  usoArma: ReadonlySet<string>;
  armaFerma: RegExp | null;
}

const cache = new WeakMap<object, Compilate>();

function compilate(): Compilate {
  const p = datiProve();
  let c = cache.get(p);
  if (!c) {
    const w = p.parole;
    const vuote = regole('privato', (s) => new Set(campoElenco(s, 'parole_vuote')));
    c = {
      // Dalla più lunga: «cercare» perde «are», non solo «e».
      finali: [...w.finali].sort((a, b) => b.length - a.length),
      generiche: new Set(w.generiche.map(normalizza)),
      vuote,
      // Un verbo del dire seguito, entro poche parole, da «:»: da lì in poi è parlato.
      parlato: w.parlato.length ? new RegExp(`\\b(${w.parlato.join('|')})\\b[^.!?:«»"“”]{0,60}:.*$`, 'is') : /(?!)/,
      parlatoFrase: w.parlato.length ? new RegExp(`\\b(${w.parlato.join('|')})\\b[^.!?]*`, 'gi') : /(?!)/g,
      domandaIndiretta: w.chiedere.length && w.interrogative.length ? new RegExp(`\\b(${w.chiedere.join('|')})\\b[^.!?:]{0,40}?\\b(${w.interrogative.join('|')})\\b`, 'i') : /(?!)/,
      rivolto: new Set(w.rivolto.map(normalizza)),
      usoArma: new Set(w.uso_arma.map(normalizza)),
      armaFerma: w.arma_ferma.length ? new RegExp(`^(${w.arma_ferma.join('|')})`) : null,
    };
    cache.set(p, c);
  }
  return c;
}

/** Le parole di un testo: minuscole, senza accenti né punteggiatura; l'apostrofo separa («l'arco»). */
export function paroleDi(t: string): string[] {
  return normalizza(t)
    .replace(/[^\p{L}\p{N}' ]/gu, ' ')
    .split(/[\s']+/)
    .filter(Boolean);
}

/** La parola senza la desinenza più lunga del pacchetto che lascia almeno tre lettere. */
export function radiceParola(w: string): string {
  for (const f of compilate().finali) if (w.endsWith(f) && w.length - f.length >= 3) return w.slice(0, -f.length);
  return w;
}

/** Una parola di luogo, corpo o oggetto comune: da sola non dice quale prova. */
export function generica(w: string): boolean {
  return compilate().generiche.has(w);
}

/**
 * La voce (una parola o più, «porta segreta») è nel testo, a parole intere e con le desinenze tolte.
 * Una voce di una parola sola generica non vale; nel testo, una parola generica non trova una voce di
 * una parola sola (dentro una voce di più parole sì: «porta segreta» è specifica).
 */
export function haVoce(parole: readonly string[], voce: string): boolean {
  const v = paroleDi(voce);
  if (!v.length) return false;
  if (v.length === 1) {
    if (generica(v[0]!)) return false;
    const r = radiceParola(v[0]!);
    return parole.some((w) => !generica(w) && radiceParola(w) === r);
  }
  const rv = v.map(radiceParola);
  for (let i = 0; i + rv.length <= parole.length; i++) if (rv.every((r, k) => radiceParola(parole[i + k]!) === r)) return true;
  return false;
}

/**
 * Le parole di contenuto di una frase (`quando` di una prova o di una mossa): almeno quattro lettere,
 * senza le parole vuote della lingua, le generiche e i nomi dati.
 */
export function paroleContenuto(t: string, nomi: ReadonlySet<string> = new Set()): string[] {
  const c = compilate();
  return paroleDi(t).filter((w) => w.length >= 4 && !c.vuote.has(w) && !c.generiche.has(w) && !nomi.has(w));
}

/** Quante parole di contenuto di `frase` sono anche nel testo (a parole intere, desinenze tolte). */
export function inComune(testo: string, frase: string, nomi: ReadonlySet<string> = new Set()): number {
  const t = new Set(paroleContenuto(testo, nomi).map(radiceParola));
  return new Set(paroleContenuto(frase, nomi).map(radiceParola).filter((r) => t.has(r))).size;
}

/**
 * Il testo senza il parlato: le parole fra virgolette, ciò che segue un verbo del dire con «:» («Dico
 * agli altri: …», «gli chiedo la strada: …», fino alla fine), e senza i due punti il resto della frase
 * («dico piano a Ida che è ora»). Resta ciò che il personaggio FA.
 */
export function senzaParlato(t: string): string {
  return t
    .replace(/«[^»]*»?|“[^”]*”?|"[^"]*"?/g, ' ')
    .replace(compilate().parlato, ' ')
    .replace(compilate().parlatoFrase, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ogni frase del testo è una domanda, diretta («Berta, quando l'hai visto?») o indiretta («Chiedo a
 * Berta chi sapeva della chiave.»): chiedere non costa un tiro.
 */
export function soloDomande(t: string): boolean {
  const re = compilate().domandaIndiretta;
  const frasi = normalizza(t)
    .replace(/[«»“”"]/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => /\p{L}/u.test(x));
  return frasi.length > 0 && frasi.every((x) => x.endsWith('?') || re.test(x));
}

/**
 * I PNG a cui l'azione si rivolge: chiamati per nome all'inizio di una frase («Berta, dammi la
 * chiave», «Ugo! …») o dopo una preposizione del pacchetto («chiedo a Berta», «mi avvicino al
 * carbonaio»). Nominare non basta: «Guardo la chiave che Berta stringe» non parla a Berta.
 */
export function pngRivolti(t: string, nomi: Map<string, string[]>): Set<string> {
  const c = compilate();
  const out = new Set<string>();
  const frasi = normalizza(t).split(/(?<=[.!?:;«»"“”])\s*/);
  const parole = paroleDi(t);
  for (const [id, voci] of nomi) {
    for (const v of voci) {
      const pv = paroleDi(v);
      if (!pv.length) continue;
      // Vocativo: il nome all'inizio di una frase, seguito da virgola, «!» o «:».
      if (frasi.some((f) => new RegExp(`^[^\\p{L}]*${pv.join('\\s+')}\\s*[,!:]`, 'u').test(f))) out.add(id);
      // Preposizione subito prima del nome (con l'articolo eventuale già nella preposizione: «al», «alla»).
      for (let i = 1; i + pv.length <= parole.length; i++) {
        if (pv.every((w, k) => parole[i + k] === w) && (c.rivolto.has(parole[i - 1]!) || (i >= 2 && c.rivolto.has(parole[i - 2]!) && parole[i - 1]!.length <= 3))) out.add(id);
      }
    }
  }
  return out;
}

/**
 * L'arma è usata, non solo nominata: una parola del suo nome entro tre parole dopo «con», «tiro»,
 * «lancio»… (`uso_arma`), e non seguita da «in mano», «sguainata»… (`arma_ferma`). «Tiro con la fionda
 * al goblin» sì; «spada in mano, guardo i rami» no.
 */
export function armaUsata(t: string, nomeArma: readonly string[]): boolean {
  const c = compilate();
  const parole = paroleDi(t);
  const pezzi = new Set(nomeArma.flatMap(paroleDi).filter((w) => w.length > 3));
  for (let i = 0; i < parole.length; i++) {
    if (!pezzi.has(parole[i]!)) continue;
    const prima = parole.slice(Math.max(0, i - 3), i);
    if (!prima.some((w) => c.usoArma.has(w))) continue;
    // Dopo il nome intero dell'arma («spada lunga in mano»).
    let j = i;
    while (j + 1 < parole.length && pezzi.has(parole[j + 1]!)) j++;
    const dopo = parole.slice(j + 1, j + 4).join(' ');
    if (c.armaFerma && c.armaFerma.test(dopo)) continue;
    return true;
  }
  return false;
}
