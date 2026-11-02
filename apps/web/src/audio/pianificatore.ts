/**
 * Matematica della programmazione gapless sull'orologio dell'AudioContext (pura, testabile).
 *
 * Ogni pezzo audio diventa un AudioBufferSourceNode che parte all'istante
 *   t = max(prossimoInizio, ora + jitter)
 * dove il jitter (cuscinetto) si applica solo quando si parte da fermi o dopo un buco: finché i
 * pezzi arrivano in anticipo, ognuno comincia esattamente dove finisce il precedente
 * (prossimoInizio = t + durata), senza fessure né sovrapposizioni.
 *
 * Un «buco» (underrun) è un pezzo che arriva quando prossimoInizio è già passato a metà turno:
 * il suono si è interrotto perché la generazione è rimasta indietro rispetto alla riproduzione.
 */

/**
 * Cuscinetto iniziale in secondi. 150 ms assorbono il ritardo irregolare tra un pezzo e l'altro
 * (rete LAN + Socket.IO + thread principale occupato) senza farsi sentire come attesa.
 */
export const JITTER_S = 0.15;

export interface Programmazione {
  /** Istante (secondi, orologio del contesto) in cui il pezzo deve cominciare. */
  inizio: number;
  /** Il pezzo è arrivato dopo la fine del precedente, a metà turno. */
  buco: boolean;
  /** Si è ripartiti da fermi (primo pezzo o dopo un buco): applicato il jitter. */
  ripartenza: boolean;
  /** Silenzio inserito prima di questo pezzo a causa del buco (secondi; 0 se nessun buco). */
  silenzio: number;
}

export class Pianificatore {
  /** Dove finisce l'ultimo pezzo programmato; null = nulla in programma (si parte da fermi). */
  private prossimoInizio: number | null = null;

  constructor(private readonly jitterS: number = JITTER_S) {}

  /**
   * Calcola l'istante d'inizio di un pezzo e avanza la linea del tempo.
   * @param ora `ctx.currentTime` al momento dell'arrivo del pezzo.
   * @param durata durata del pezzo in secondi (`buffer.duration`).
   * @param aMetaTurno true se il turno ha già pezzi programmati: solo lì un ritardo è un buco.
   */
  programma(ora: number, durata: number, aMetaTurno: boolean): Programmazione {
    let inizio: number;
    let buco = false;
    let ripartenza = false;
    let silenzio = 0;

    if (this.prossimoInizio === null) {
      inizio = ora + this.jitterS;
      ripartenza = true;
    } else if (this.prossimoInizio < ora) {
      // La coda si è svuotata prima dell'arrivo di questo pezzo: si riparte col cuscinetto.
      inizio = ora + this.jitterS;
      ripartenza = true;
      buco = aMetaTurno;
      if (buco) silenzio = inizio - this.prossimoInizio;
    } else {
      inizio = this.prossimoInizio;
    }

    this.prossimoInizio = inizio + durata;
    return { inizio, buco, ripartenza, silenzio };
  }

  /** Fine dell'ultimo pezzo programmato (null se nulla). */
  get fineProgrammata(): number | null {
    return this.prossimoInizio;
  }

  /** Secondi di audio già programmati davanti all'istante `ora` (0 se la coda è vuota). */
  anticipo(ora: number): number {
    return this.prossimoInizio === null ? 0 : Math.max(0, this.prossimoInizio - ora);
  }

  /** Interruzione: si dimentica la linea del tempo, il prossimo pezzo riparte col jitter. */
  azzera(): void {
    this.prossimoInizio = null;
  }
}
