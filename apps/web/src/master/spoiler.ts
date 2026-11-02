/**
 * Modalità «senza spoiler» del pannello del master: chi fa da master spesso GIOCA anche, e il
 * pannello non deve rovinargli la partita. È attiva per default e si spegne con un interruttore;
 * la scelta resta in localStorage (ogni accesso in try/catch, come il token).
 *
 * Con la modalità attiva il pannello nasconde ciò che un giocatore non deve sapere prima del tempo:
 * - orologi: nome, segni (anche quelli futuri) e «a orologio completo»; restano «segni 1/6 · dovuto»;
 * - azioni private: il testo e il motivo (restano autore, stato, turno, legami);
 * - repertorio: le battute non ancora uscite (solo quante, per chi parla) e il tipo vero delle uscite
 *   (una «menzogna» uscita dice che era una bugia);
 * - situazioni non in onda: nome, miniatura e rivelazione collegata (la cicatrice!).
 * Restano tutti i comandi, gli stati, i conteggi, la trascrizione pubblica, il registro e le note.
 * Logica pura qui (testata in spoiler.test.ts); i componenti la usano tramite lo store.
 */
import type { BattutaMaster } from '@cantastorie/shared';
import { archivioDelBrowser, type Archivio } from './token';
import { creaLog } from '../lib/log';

const log = creaLog('master');

export const CHIAVE_SENZA_SPOILER = 'cantastorie:master:senza-spoiler';

/** La scelta salvata; senza scelta (o archivio illeggibile) la modalità è ATTIVA. */
export function leggiSenzaSpoiler(archivio: Archivio | null = archivioDelBrowser()): boolean {
  if (!archivio) return true;
  try {
    return archivio.getItem(CHIAVE_SENZA_SPOILER) !== 'no';
  } catch (errore) {
    log.debug('Scelta «senza spoiler» non leggibile: resta attiva', errore);
    return true;
  }
}

/** Salva la scelta (se l'archivio non è scrivibile vale solo per questa pagina). */
export function salvaSenzaSpoiler(attiva: boolean, archivio: Archivio | null = archivioDelBrowser()): void {
  if (!archivio) return;
  try {
    archivio.setItem(CHIAVE_SENZA_SPOILER, attiva ? 'si' : 'no');
  } catch (errore) {
    log.debug('Scelta «senza spoiler» non salvabile', errore);
  }
}

/** Etichetta dell'orologio: col nome, o neutra («Orologio 2») senza spoiler. */
export function nomeOrologio(nome: string, indice: number, senzaSpoiler: boolean): string {
  return senzaSpoiler ? `Orologio ${indice + 1}` : nome;
}

/** Tipi che svelano un segreto anche dopo l'uscita (stessa scelta del catalogo del selettore). */
const TIPI_RIVELATORI = new Set(['menzogna', 'verita', 'confessione']);

/** Il tipo di una battuta da mostrare: senza spoiler «risposta» al posto di menzogna/verità/confessione. */
export function tipoBattuta(tipo: string, senzaSpoiler: boolean): string {
  return senzaSpoiler && TIPI_RIVELATORI.has(tipo) ? 'risposta' : tipo;
}

/** Battute non ancora uscite, senza spoiler: solo quante per chi parla, in ordine di numero. */
export function contaPerParlante(battute: readonly BattutaMaster[]): Array<{ chi: string; quante: number }> {
  const conti = new Map<string, number>();
  for (const b of battute) conti.set(b.chi, (conti.get(b.chi) ?? 0) + 1);
  return [...conti].map(([chi, quante]) => ({ chi, quante })).sort((a, b) => b.quante - a.quante || a.chi.localeCompare(b.chi));
}

/** Testo da mostrare al posto del contenuto di un'azione privata. */
export const TESTO_PRIVATA_NASCOSTA = 'Contenuto nascosto (azione privata): spegni «senza spoiler» per leggerlo.';
