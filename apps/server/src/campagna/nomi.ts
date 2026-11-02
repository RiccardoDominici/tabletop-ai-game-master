/** Nomi brevi di PG e PNG per avvisi, pannello ed etichette. */

/** Titoli da saltare nel nome breve («Sorella Teodora» → «Teodora»). */
const TITOLI = new Set(['sorella', 'fratello', 'padre', 'madre', 'ser', 'messer', 'donna', 'dama', 'mastro', 'frate', 'suor']);

/** Nome breve per gli avvisi: il primo nome proprio. */
export function nomeBreve(nome: string): string {
  const parole = nome.split(/\s+/).filter(Boolean);
  const i = parole.length > 1 && TITOLI.has(parole[0]!.toLowerCase()) ? 1 : 0;
  return parole[i] ?? nome;
}
