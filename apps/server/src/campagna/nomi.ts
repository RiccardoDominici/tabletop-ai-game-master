/** Nomi brevi di PG e PNG per avvisi, pannello ed etichette. */
import { campoElenco, regole } from '../lingua/motore';

/**
 * Titoli da saltare nel nome breve («Sorella Teodora» → «Teodora», «Sister Teodora» → «Teodora»), della
 * lingua dei contenuti: lingue/<codice>/motore.yaml, sezione `nomi`.
 */
const sezione = (): { titoli: ReadonlySet<string>; connettori: ReadonlySet<string>; articoli: ReadonlySet<string> } =>
  regole('nomi', (s) => ({ titoli: new Set(campoElenco(s, 'titoli')), connettori: new Set(campoElenco(s, 'connettori')), articoli: new Set(campoElenco(s, 'articoli')) }));
const titoli = (): ReadonlySet<string> => sezione().titoli;

/** Il titolo, minuscolo e senza il punto di un'abbreviazione («Mr.» → «mr»). */
const comeTitolo = (parola: string): string => parola.toLowerCase().replace(/\.$/, '');


/**
 * The trade words players use for an NPC: the word after a connector of the name («Hale the Innkeeper» →
 * innkeeper, «Ruggero lo sgherro» → sgherro) and the first word of the sheet's `ruolo` without its article
 * («gabelliere del ponte» → gabelliere). Lowercase, whole words. In the second pass of the final end-to-end run
 * «I ask the innkeeper…» did not find Hale, and his reply to a private action was heard at the table.
 */
export function paroleDiMestiere(nome: string, ruoloScheda: string | null | undefined): string[] {
  const r = sezione();
  const parole = (t: string): string[] => t.toLowerCase().split(/[\s']+/).filter(Boolean);
  const out: string[] = [];
  const n = parole(nome);
  for (let i = 1; i + 1 < n.length; i++) if (r.connettori.has(n[i]!)) out.push(n[i + 1]!.replace(/[^\p{L}]/gu, ''));
  const primo = parole(ruoloScheda ?? '').find((w) => !r.articoli.has(w));
  if (primo) out.push(primo.replace(/[^\p{L}]/gu, ''));
  return [...new Set(out.filter((w) => w.length > 3))];
}

/** Nome breve per gli avvisi: il primo nome proprio. */
export function nomeBreve(nome: string): string {
  const parole = nome.split(/\s+/).filter(Boolean);
  const i = parole.length > 1 && titoli().has(comeTitolo(parole[0]!)) ? 1 : 0;
  return parole[i] ?? nome;
}
