/**
 * The ledger's journal (docs/coerenza.md §1): every change between two successive ledgers, with its cause, kept for
 * the Game Master panel and saved in the session snapshot so a resume shows the same history. The director rebuilds the
 * ledger before every model call and every check (`aggiorna`); only what changed is written, so rebuilding often costs
 * nothing in the log.
 */
import { costruisciRegistro, differenze, type EventoRegistro, type FontiRegistro, type Registro } from './registro';

/** How many journal events the snapshot keeps (the oldest go first). */
export const EVENTI_SALVATI = 300;

export class DiarioRegistro {
  private ultimo: Registro | null = null;
  private eventi: EventoRegistro[] = [];

  /** The ledger of this moment; the changes since the last one go to the journal (and are returned, for the log). */
  aggiorna(fonti: FontiRegistro, causa: string): { registro: Registro; nuovi: EventoRegistro[] } {
    const registro = costruisciRegistro(fonti);
    const nuovi = differenze(this.ultimo, registro, causa);
    this.ultimo = registro;
    if (nuovi.length) this.eventi = [...this.eventi, ...nuovi].slice(-EVENTI_SALVATI);
    return { registro, nuovi };
  }

  /** The last ledger built (null before the first). */
  get registro(): Registro | null {
    return this.ultimo;
  }

  get storia(): readonly EventoRegistro[] {
    return this.eventi;
  }

  esporta(): { eventi: EventoRegistro[] } {
    return { eventi: this.eventi.map((e) => ({ ...e })) };
  }

  /** A resume: the history comes back; the next `aggiorna` starts the diff from the state rebuilt then. */
  importa(s: { eventi?: unknown } | undefined): void {
    const ok = (e: unknown): e is EventoRegistro =>
      !!e && typeof e === 'object' && typeof (e as EventoRegistro).id === 'string' && typeof (e as EventoRegistro).a === 'string' && typeof (e as EventoRegistro).turno === 'number';
    this.eventi = Array.isArray(s?.eventi) ? (s!.eventi as unknown[]).filter(ok).slice(-EVENTI_SALVATI) : [];
    this.ultimo = null;
  }

  /** «Ricomincia»: a new evening, an empty journal. */
  azzera(): void {
    this.ultimo = null;
    this.eventi = [];
  }
}
