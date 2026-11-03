/**
 * Guardia della finzione per le mosse contro lo stallo: quando nessuno scrive, il narratore deve
 * far succedere qualcosa NEL MONDO (un segno della minaccia, un indizio che arriva, un PNG che
 * agisce), non commentare il tavolo. In una notte di prova il selettore ha detto per ore «nessuno
 * dei PG ha ancora parlato», «il ponte decide per voi»: frasi che rompono la finzione.
 *
 * Una frase che parla dei giocatori, dei PG come tali, delle loro scelte, dell'attesa o del silenzio
 * del tavolo si scarta prima della voce (non si sente e non entra nella trascrizione). Elenco
 * volutamente stretto: meglio lasciar passare una frase dubbia che tagliare una frase di gioco.
 */

/** Espressioni fuori dalla finzione, con un nome leggibile per il log. */
const FUORI_DALLA_FINZIONE: ReadonlyArray<[string, RegExp]> = [
  ['PG', /\bPG\b/],
  ['giocatori', /\bgiocator[ei]\b/i],
  ['nessuno di voi', /\bnessuno di voi\b/i],
  ['nessuno dei PG/personaggi', /\bnessuno dei (pg|personaggi|presenti|giocatori)\b/i],
  ['nessuno ha ancora…', /\bnessuno (ha|avete|di voi ha) (ancora )?(scelto|deciso|parlato|agito|scritto|risposto|fatto)\b/i],
  ['non avete ancora…', /\bnon (avete|hai) ancora (scelto|deciso|parlato|agito|scritto|risposto|fatto)\b/i],
  ['decide per voi', /\bdecid\w* per voi\b/i],
  ['nessuno parla?', /\bnessuno (parla|risponde|decide|sceglie)\s*\?/i],
  ['vi stiamo aspettando', /\b(vi|ti) (sto|stiamo|stanno) aspettando\b/i],
  ['silenzio del tavolo', /\bsilenzio (del tavolo|del gruppo|dei giocatori|dei presenti)\b/i],
];

/** Il nome dell'espressione fuori dalla finzione trovata nella frase, o null se la frase è di gioco. */
export function fuoriDallaFinzione(frase: string): string | null {
  for (const [nome, regex] of FUORI_DALLA_FINZIONE) if (regex.test(frase)) return nome;
  return null;
}
