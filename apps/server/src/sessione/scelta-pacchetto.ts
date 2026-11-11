/**
 * Quale pacchetto sessioni/<nn>/ si gioca all'avvio (campagne a più sessioni, docs/strati.md).
 * Lo decide l'archivio, non un file a mano: così la sera dopo che la skill «tra le sessioni» ha
 * preparato la 02, `scripts/partita.sh <campagna>` parte dalla 02 da solo.
 *
 * In ordine:
 * 1. il numero chiesto (TAGM_SESSIONE / partita.sh --sessione N);
 * 2. il pacchetto della sessione in corso di questa modalità (ripresa dopo un riavvio);
 * 3. dopo l'ultima sessione chiusa con «Fine sessione»: il pacchetto seguente (se non c'è ancora,
 *    di nuovo quello, con l'avviso);
 * 4. l'ultima sessione chiusa in un altro modo (Nuova sessione, --nuova): lo stesso pacchetto;
 * 5. il primo.
 */
import { pacchettoDopo, type Pacchetto } from '../campagna/pacchetti';
import { MOTIVO_FINE_SESSIONE, type InfoSessione } from './archivio';
import { testo } from '../lingua';

export type MotivoScelta = 'one-shot' | 'richiesto' | 'ripresa' | 'dopo la fine' | 'ultima giocata' | 'prima';

export interface SceltaPacchetto {
  /** null = one-shot (nessun pacchetto). */
  numero: number | null;
  motivo: MotivoScelta;
  /** Detto nel log e nel pannello, se c'è qualcosa da sapere (es. «la 03 non c'è ancora»). */
  avviso: string | null;
  /**
   * Solo per «dopo la fine»: il pacchetto appena finito. Se quello dopo non si carica (preparato a
   * metà), il server parte da qui invece di non partire (avvio.ts), e il pannello dice perché.
   */
  riserva?: number;
}

export class ErroreScelta extends Error {
  override name = 'ErroreScelta';
}

/** `sessioni`: quelle della campagna, dalla più recente (ArchivioSessioni.elenco). */
export function scegliPacchetto(pacchetti: readonly Pacchetto[], sessioni: readonly InfoSessione[], modo: string, richiesto: number | null): SceltaPacchetto {
  if (pacchetti.length === 0) return { numero: null, motivo: 'one-shot', avviso: null };
  const esiste = (n: number | null): n is number => n !== null && pacchetti.some((p) => p.numero === n);
  if (richiesto !== null) {
    if (!esiste(richiesto)) throw new ErroreScelta(`sessione ${richiesto} richiesta, ma sessioni/ ha solo: ${pacchetti.map((p) => p.etichetta).join(', ')}`);
    return { numero: richiesto, motivo: 'richiesto', avviso: null };
  }
  const inCorso = sessioni.find((s) => s.stato === 'in_corso' && s.modo === modo && esiste(s.pacchetto));
  if (inCorso) return { numero: inCorso.pacchetto!, motivo: 'ripresa', avviso: null };
  const ultima = sessioni.find((s) => esiste(s.pacchetto));
  if (ultima) {
    if (ultima.stato === 'chiusa' && ultima.motivo_chiusura === MOTIVO_FINE_SESSIONE) {
      const dopo = pacchettoDopo(pacchetti, ultima.pacchetto!);
      if (dopo) return { numero: dopo.numero, motivo: 'dopo la fine', avviso: null, riserva: ultima.pacchetto! };
      const numero = ultima.pacchetto!;
      return {
        numero,
        motivo: 'ultima giocata',
        // Getter: la frase si compone quando la si legge (log e pannello), nella lingua dei contenuti.
        // La scelta del pacchetto viene prima del caricamento della campagna, che imposta la lingua
        // (avvio.ts): composta qui sarebbe nella lingua di prima.
        get avviso(): string {
          return testo('sessione.scelta.rigioca', { numero });
        },
      };
    }
    return { numero: ultima.pacchetto!, motivo: 'ultima giocata', avviso: null };
  }
  return { numero: pacchetti[0]!.numero, motivo: 'prima', avviso: null };
}
