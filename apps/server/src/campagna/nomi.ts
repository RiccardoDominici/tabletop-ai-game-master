/** Nomi brevi di PG e PNG per avvisi, pannello ed etichette. */
import { campoElenco, regole } from '../lingua/motore';

/**
 * Titoli da saltare nel nome breve («Sorella Teodora» → «Teodora», «Sister Teodora» → «Teodora»), della
 * lingua dei contenuti: lingue/<codice>/motore.yaml, sezione `nomi`.
 */
const titoli = (): ReadonlySet<string> => regole('nomi', (s) => new Set(campoElenco(s, 'titoli')));

/** Il titolo, minuscolo e senza il punto di un'abbreviazione («Mr.» → «mr»). */
const comeTitolo = (parola: string): string => parola.toLowerCase().replace(/\.$/, '');

/** Nome breve per gli avvisi: il primo nome proprio. */
export function nomeBreve(nome: string): string {
  const parole = nome.split(/\s+/).filter(Boolean);
  const i = parole.length > 1 && titoli().has(comeTitolo(parole[0]!)) ? 1 : 0;
  return parole[i] ?? nome;
}
