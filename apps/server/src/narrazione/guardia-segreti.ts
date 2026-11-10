/**
 * Guardia dei segreti sulle righe IMPROVVISATE (giudizio nozze-neve 2: due risposte pubbliche di Gaspare
 * portavano al tavolo ciò che un PG aveva chiesto in privato). Prima c'era solo la misura a posteriori
 * dell'harness (esperimenti/fughe.ts) e un log sul messaggio del selettore: nessuna riga veniva fermata.
 *
 * Una riga pubblica che contiene una parola di parole_segrete.yaml ancora segreta si ferma prima della
 * voce. Ancora segreta vuol dire: nessun id di `pubblica_dopo` è uscito AL TAVOLO (una battuta detta a
 * un'azione privata, o un indizio rivelato solo lì, non la rende pubblica), e il tavolo non l'ha
 * sentita (trascrizione pubblica, azioni pubbliche del turno: un'azione privata non conta). La regia
 * decide che cosa farne: al telefono del PG se il turno ha solo la sua azione privata, altrimenti la
 * battuta di rifiuto del PNG al posto della riga (o niente, per il narratore). Funzioni pure.
 */
import { segretiNelTesto, type ParolaSegreta, type StatoPubblico } from '../repertorio/segreti';

/** Che cosa fare di una riga che direbbe un segreto. */
export interface EsitoGuardiaSegreti {
  /** Le parole segrete trovate (forma leggibile). */
  parole: string[];
  /** Al telefono di questo PG invece che al tavolo (risposta alla sua azione privata). */
  privato?: string;
  /** Righe da dire al posto di quella fermata (la deviazione del PNG); assente = la riga si toglie e basta. */
  sostituto?: Array<{ etichetta: string; testo: string }>;
}

/** Le parole ancora segrete che il testo dice e che il tavolo non ha mai sentito. */
export function segretiNascosti(testo: string, parole: ParolaSegreta[], pubblico: StatoPubblico | null, dettoAlTavolo: string): string[] {
  const sentito = dettoAlTavolo.toLowerCase();
  return segretiNelTesto(testo, parole, pubblico)
    .filter((p) => !p.regex.test(sentito))
    .map((p) => p.parola);
}
