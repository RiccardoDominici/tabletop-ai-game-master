/**
 * Guardia della finzione per le mosse contro lo stallo: quando nessuno scrive, il narratore deve
 * far succedere qualcosa NEL MONDO (un segno della minaccia, un indizio che arriva, un PNG che
 * agisce), non commentare il tavolo. In una notte di prova il selettore ha detto per ore «nessuno
 * dei PG ha ancora parlato», «il ponte decide per voi»: frasi che rompono la finzione.
 *
 * Una frase che parla dei giocatori, dei PG come tali, delle loro scelte, dell'attesa o del silenzio
 * del tavolo si scarta prima della voce (non si sente e non entra nella trascrizione). Elenco
 * volutamente stretto: meglio lasciar passare una frase dubbia che tagliare una frase di gioco.
 *
 * Le espressioni sono della lingua dei contenuti: lingue/<codice>/motore.yaml, sezione `finzione`
 * («nessuno dei PG ha ancora parlato» in italiano, «none of the players has spoken yet» in inglese).
 */
import { campoOggetti, campoRegex, campoTesto, regole } from '../lingua/motore';

/** Espressioni fuori dalla finzione, con un nome leggibile per il log. */
const espressioni = (): ReadonlyArray<[string, RegExp]> =>
  regole('finzione', (s) =>
    campoOggetti(s, 'espressioni').flatMap((e): Array<[string, RegExp]> => {
      const re = campoRegex(e, 'regex', campoTesto(e, 'flags'));
      return re ? [[campoTesto(e, 'nome'), re]] : [];
    }),
  );

/** Il nome dell'espressione fuori dalla finzione trovata nella frase, o null se la frase è di gioco. */
export function fuoriDallaFinzione(frase: string): string | null {
  for (const [nome, regex] of espressioni()) if (regex.test(frase)) return nome;
  return null;
}
