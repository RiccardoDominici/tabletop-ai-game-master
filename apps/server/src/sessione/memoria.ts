/**
 * La memoria della sessione vista dalla regia: un'interfaccia piccola sopra l'archivio SQLite, così
 * la regia non sa niente di database (e i test possono farne a meno).
 *
 * Una sessione nasce quando il proiettore avvia la scena (non all'avvio del server: un server
 * acceso e mai giocato non lascia sessioni vuote), e finisce quando se ne comincia un'altra
 * (Ricomincia, «Nuova sessione» del pannello, avvio con --nuova).
 */
import type { Logger } from '../logger';
import type { ArchivioSessioni, InfoSessione } from './archivio';

export interface MemoriaSessione {
  /** Comincia una sessione nuova (chiude quella in corso della campagna). */
  nuova(): string;
  /** Scrive eventi della sessione in corso, tutti o nessuno; senza sessione non fa niente. */
  scrivi(eventi: ReadonlyArray<{ tipo: string; dati: unknown }>, turno: number | null): void;
  /** Chiude la sessione in corso (Ricomincia senza proiettore: la prossima partirà da capo). */
  termina(motivo: string): void;
  /** Spegnimento del server: da qui in poi non si scrive più (lo stato resta quello dell'ultimo evento). */
  sospendi(): void;
  /** La sessione in corso, se c'è. */
  info(): InfoSessione | null;
}

export class SessioneSuArchivio implements MemoriaSessione {
  private id: string | null;
  private sospesa = false;

  constructor(
    private readonly archivio: ArchivioSessioni,
    private readonly campagna: string,
    private readonly modo: string,
    private readonly log: Logger,
    /** Sessione ripresa all'avvio (null = nessuna). */
    ripresa: string | null,
  ) {
    this.id = ripresa;
  }

  nuova(): string {
    const id = new Date().toISOString();
    this.archivio.crea(id, this.campagna, this.modo);
    this.id = id;
    return id;
  }

  scrivi(eventi: ReadonlyArray<{ tipo: string; dati: unknown }>, turno: number | null): void {
    if (this.sospesa || !this.id) return;
    try {
      this.archivio.aggiungi(this.id, eventi, turno);
    } catch (err) {
      // Un errore di disco non deve fermare la partita: si gioca, e lo si dice nel log.
      this.log.error({ sessione: this.id, tipi: eventi.map((e) => e.tipo), err: (err as Error).message }, 'sessioni: scrittura fallita');
    }
  }

  termina(motivo: string): void {
    if (this.sospesa || !this.id) return;
    this.archivio.chiudiSessione(this.id, motivo);
    this.id = null;
  }

  sospendi(): void {
    this.sospesa = true;
  }

  info(): InfoSessione | null {
    return this.id ? this.archivio.sessione(this.id) : null;
  }
}
