/**
 * Guardia dei numeri delle regole a voce (docs/prove.md, «Narrazione»): punti ferita, CA e CD non si
 * leggono ad alta voce, li mostra già la carta del tiro sul proiettore. Una frase del narratore che li
 * dice («Corrado ha quattro punti di vita», «contro la CA 15»; «Corrado has four hit points», «against
 * AC 15») perde il numero prima della voce e della trascrizione; il resto della frase resta com'è.
 * Logica pura.
 *
 * Le regole sono della lingua dei contenuti: lingue/<codice>/motore.yaml, sezione `numeri_regole`. Ogni
 * regola è un'espressione (con {N} al posto di un numero, in cifre o in lettere) e il suo sostituto;
 * si applicano nell'ordine del file. Gruppi con nome nell'espressione:
 * - `n`: il numero; se è uno di `zero` («0», «zero») si usa `sostituto_zero` («nessun punto ferita»);
 * - `maiuscola`: se comincia con una maiuscola, il sostituto pure («Alcuni punti ferita»);
 * - ogni altro gruppo `x` si mette nel sostituto al posto di {x}, minuscolo e con gli spazi normali
 *   («punti di  vita» → «alcuni punti di vita»).
 */
import { campoElenco, campoOggetti, campoTesto, regole, type Sezione } from '../lingua/motore';

interface RegolaNumero {
  nome: string;
  regex: RegExp;
  sostituto: string;
  /** Vuoto = come `sostituto`. */
  sostitutoZero: string;
}

interface RegoleNumeri {
  regole: RegolaNumero[];
  /** Le forme dello zero, minuscole. */
  zero: ReadonlySet<string>;
}

function compila(s: Sezione): RegoleNumeri {
  // {N}: un numero in cifre o in lettere, senza cattura (il numero lo cattura il gruppo `n`, se c'è).
  const n = `(?:\\d+|${campoTesto(s, 'numero')})`;
  return {
    zero: new Set(campoElenco(s, 'zero').map((z) => z.toLowerCase())),
    regole: campoOggetti(s, 'regole').map((r) => {
      const nome = campoTesto(r, 'nome');
      const testo = campoTesto(r, 'regex').replaceAll('{N}', n);
      let regex: RegExp;
      try {
        regex = new RegExp(testo, campoTesto(r, 'flags'));
      } catch (err) {
        throw new Error(`motore.yaml: numeri_regole «${nome}» non è un'espressione regolare valida (${(err as Error).message})`);
      }
      return { nome, regex, sostituto: campoTesto(r, 'sostituto'), sostitutoZero: campoTesto(r, 'sostituto_zero') };
    }),
  };
}

/** Il sostituto di una corrispondenza, con i gruppi al posto dei {segnaposto}. */
function sostituto(r: RegolaNumero, gruppi: Record<string, string | undefined> | undefined, zero: ReadonlySet<string>): string {
  const g = gruppi ?? {};
  const èZero = g['n'] !== undefined && zero.has(g['n'].toLowerCase());
  let t = (èZero && r.sostitutoZero) || r.sostituto;
  t = t.replace(/\{(\w+)\}/g, (tutto, k: string) => (g[k] !== undefined ? g[k]!.toLowerCase().replace(/\s+/g, ' ') : tutto));
  // La maiuscola vale per il sostituto «pieno», non per quello dello zero (com'era prima: «Nessun…» mai).
  const maiuscola = !èZero && g['maiuscola'] !== undefined && /^\p{Lu}/u.test(g['maiuscola']);
  return maiuscola ? `${t.charAt(0).toUpperCase()}${t.slice(1)}` : t;
}

export function togliNumeriRegole(testo: string): { testo: string; tolti: string[] } {
  const { regole: elenco, zero } = regole('numeri_regole', compila);
  const tolti: string[] = [];
  let t = testo;
  for (const r of elenco) {
    t = t.replace(r.regex, (...a: unknown[]) => {
      tolti.push(a[0] as string);
      const ultimo = a.at(-1);
      return sostituto(r, typeof ultimo === 'object' ? (ultimo as Record<string, string | undefined>) : undefined, zero);
    });
  }
  return { testo: t, tolti };
}
