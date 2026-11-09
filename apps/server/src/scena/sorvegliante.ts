/**
 * Sorvegliante delle attese del Motore (richieste del 9 novembre, punto 3: «mai una pausa infinita»).
 *
 * Mentre il gioco lavora (apertura o narrazione: LLM, voce, audio sul proiettore) il tavolo aspetta,
 * e i telefoni dicono «Il narratore sta preparando…». Se però il lavoro si blocca senza errori
 * (modello che non risponde, voce ferma, eccezione in un flusso asincrono) nessuno riaprirebbe la
 * finestra. Il sorvegliante tiene una scadenza che ogni segno di vita (una frase dell'LLM, una
 * richiesta o un primo pezzo della voce, l'audio che parte) sposta in avanti; se la scadenza
 * passa senza segni di vita chiama `onBlocco` una volta sola, con l'ultima cosa che stava
 * succedendo, e la regia riparte da lì (docs/f0-contratti.md, «Turno»).
 *
 * Non sorveglia le attese volute: la finestra aperta (si aspettano i giocatori, senza fretta) e la
 * pausa del master.
 */
import type { Logger } from '../logger';
import type { Orologio } from '../turni/orologio';

export interface BloccoSorvegliato {
  /** Turno del lavoro bloccato. */
  turno: number;
  /** Fase della regia quando il lavoro è cominciato ('apertura' | 'narrazione'). */
  fase: string;
  /** Ultimo segno di vita ricevuto (es. «llm: frase», «voce: primo audio»). */
  ultimo: string;
  /** Da quanto tempo (ms) non arriva un segno di vita. */
  fermo_ms: number;
  /** Da quanto tempo (ms) dura il lavoro. */
  durata_ms: number;
}

export interface OpzioniSorvegliante {
  orologio: Orologio;
  log: Logger;
  /** Silenzio massimo (nessun segno di vita) prima di intervenire; 0 = sorvegliante spento. */
  silenzioMs: number;
  onBlocco: (b: BloccoSorvegliato) => void;
}

interface Lavoro {
  turno: number;
  fase: string;
  inizioA: number;
  ultimo: string;
  ultimoA: number;
  /** Istante (monotono) oltre cui il lavoro si considera bloccato. */
  scadenzaA: number;
}

export class Sorvegliante {
  private lavoro: Lavoro | null = null;
  private annulla: (() => void) | null = null;

  constructor(private readonly o: OpzioniSorvegliante) {}

  /** Comincia un lavoro (apertura o narrazione del turno): da qui il tavolo aspetta il Motore. */
  inizia(turno: number, fase: string, cosa: string): void {
    if (this.o.silenzioMs <= 0) return;
    const ora = this.o.orologio.ora();
    this.lavoro = { turno, fase, inizioA: ora, ultimo: cosa, ultimoA: ora, scadenzaA: ora + this.o.silenzioMs };
    this.o.log.debug({ turno, fase, cosa, silenzio_ms: this.o.silenzioMs }, 'sorvegliante: lavoro iniziato');
    this.arma();
  }

  /**
   * Segno di vita: il lavoro va avanti. `margineMs` allunga la scadenza per un'attesa che si sa
   * già lunga (es. l'audio del turno che deve ancora suonare tutto).
   */
  batti(cosa: string, margineMs = 0): void {
    const l = this.lavoro;
    if (!l) return;
    const ora = this.o.orologio.ora();
    l.ultimo = cosa;
    l.ultimoA = ora;
    l.scadenzaA = Math.max(l.scadenzaA, ora + this.o.silenzioMs + Math.max(0, margineMs));
  }

  /** Il lavoro è finito (o è stato interrotto da chi lo sa fare): niente più sorveglianza. */
  fine(motivo: string): void {
    if (!this.lavoro) return;
    this.o.log.debug({ turno: this.lavoro.turno, motivo }, 'sorvegliante: lavoro finito');
    this.lavoro = null;
    this.annulla?.();
    this.annulla = null;
  }

  /** C'è un lavoro sorvegliato adesso (per i test e il pannello). */
  get attivo(): boolean {
    return this.lavoro !== null;
  }

  /** Un solo timer: allo scatto, se la scadenza si è spostata, si riarma per il tempo che manca. */
  private arma(): void {
    this.annulla?.();
    const l = this.lavoro;
    if (!l) return;
    const attesa = Math.max(10, l.scadenzaA - this.o.orologio.ora());
    this.annulla = this.o.orologio.dopo(attesa, () => {
      this.annulla = null;
      if (this.lavoro !== l) return;
      const ora = this.o.orologio.ora();
      if (ora < l.scadenzaA) return this.arma();
      this.lavoro = null;
      const blocco: BloccoSorvegliato = { turno: l.turno, fase: l.fase, ultimo: l.ultimo, fermo_ms: Math.round(ora - l.ultimoA), durata_ms: Math.round(ora - l.inizioA) };
      this.o.log.warn(blocco, 'sorvegliante: nessun segno di vita, si interviene');
      this.o.onBlocco(blocco);
    });
  }
}
