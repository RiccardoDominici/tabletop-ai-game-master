/**
 * Logica pura della bozza dell'azione (testata in bozza.test.ts).
 *
 * - `TracciaScrittura`: fissa la `versione_vista` al PRIMO tasto di una bozza (l'ultima narrazione
 *   che il giocatore aveva ricevuto quando ha cominciato a scrivere) e regola il ritmo di
 *   `azione:scrivo`: al primo tasto, poi al massimo una volta al secondo.
 * - `riconciliaBozza`: cosa fare della casella quando arriva una nuova `azione:mia`.
 *   Regola d'oro: mai perdere testo scritto e non inviato.
 */
import type { AzionePrivata } from '@tabletop-ai-gm/shared';

/** Intervallo minimo tra due `azione:scrivo` mentre si scrive. */
export const INTERVALLO_SCRIVO_MS = 1000;

export class TracciaScrittura {
  private versione: number | null = null;
  private ultimoScrivo: number | null = null;

  constructor(private readonly intervalloMs: number = INTERVALLO_SCRIVO_MS) {}

  /**
   * Un tasto nella casella (testo non vuoto).
   * @returns la versione vista fissata e se mandare adesso `azione:scrivo`.
   */
  tasto(versioneScena: number, oraMs: number): { versioneVista: number; scrivo: boolean } {
    if (this.versione === null) this.versione = versioneScena;
    const scrivo = this.ultimoScrivo === null || oraMs - this.ultimoScrivo >= this.intervalloMs;
    if (scrivo) this.ultimoScrivo = oraMs;
    return { versioneVista: this.versione, scrivo };
  }

  /** Versione fissata al primo tasto, o null se la bozza non è stata scritta a mano. */
  get versioneVista(): number | null {
    return this.versione;
  }

  /** Invio riuscito o casella svuotata: la prossima bozza fisserà una versione nuova. */
  azzera(): void {
    this.versione = null;
    this.ultimoScrivo = null;
  }
}

export interface EsitoRiconciliazione {
  /** Nuovo testo della casella. */
  testo: string;
  /** Nuovo valore dell'interruttore «privata», o null per lasciarlo com'è. */
  privata: boolean | null;
}

const uguali = (a: string, b: string) => a.trim() === b.trim();

/**
 * Casella ↔ azione del server.
 * - in coda / da decidere: se la casella è vuota (es. dopo un ricaricamento) ci torna il testo;
 * - superata / sospesa: il testo torna nella casella, pronto da riscrivere (se non c'è già altro);
 * - chiusa / risolta: se la casella mostra proprio quel testo, si svuota per l'azione successiva;
 * - ritirata: la casella non si tocca (si può rimandare o cambiare).
 * Testo diverso da quello dell'azione = bozza non inviata: non si tocca mai.
 */
export function riconciliaBozza(bozza: string, nuova: AzionePrivata | null): EsitoRiconciliazione {
  const nulla: EsitoRiconciliazione = { testo: bozza, privata: null };
  if (!nuova) return nulla;
  const vuota = bozza.trim() === '';
  switch (nuova.stato) {
    case 'in_coda':
    case 'da_confermare':
    case 'superata':
    case 'sospesa':
      if (vuota) return { testo: nuova.testo, privata: nuova.privata };
      return nulla;
    case 'chiusa':
    case 'risolta':
      if (uguali(bozza, nuova.testo)) return { testo: '', privata: false };
      return nulla;
    case 'ritirata':
      return nulla;
  }
}
