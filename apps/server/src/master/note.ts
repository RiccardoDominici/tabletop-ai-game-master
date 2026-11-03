/**
 * Note di regia (manuale, «Critico di scena»: al massimo 3 note imperative che restano nel prompt
 * del narratore per 15 turni). Le scrive il master dal pannello; più avanti le scriverà anche il
 * critico in sottofondo.
 *
 * Entrano nel MESSAGGIO del turno (parte variabile, fuori dalla cache), così una nota nuova vale
 * dalla chiamata successiva senza riscrivere la cache del prompt. Ogni turno narrato consuma un
 * turno di ogni nota; a zero la nota esce.
 */
import { NOTA_REGIA_MAX_CARATTERI, NOTE_REGIA_MAX, NOTE_REGIA_TURNI_MAX, type NotaRegia } from '@cantastorie/shared';

export type EsitoNota = { ok: true; nota: NotaRegia } | { ok: false; errore: string };

export class NoteRegia {
  private note: NotaRegia[] = [];
  private prossimoId = 1;

  /** Note attive, nell'ordine in cui sono state scritte. */
  get elenco(): NotaRegia[] {
    return this.note.map((n) => ({ ...n }));
  }

  /** Testi da mettere nel messaggio del narratore (vuoto = nessuna nota). */
  get testi(): string[] {
    return this.note.map((n) => n.testo);
  }

  aggiungi(testo: unknown, turni: unknown, turnoCorrente: number): EsitoNota {
    const t = typeof testo === 'string' ? testo.replace(/\s+/g, ' ').trim() : '';
    if (!t) return { ok: false, errore: 'Scrivi il testo della nota.' };
    if (t.length > NOTA_REGIA_MAX_CARATTERI) return { ok: false, errore: `Al massimo ${NOTA_REGIA_MAX_CARATTERI} caratteri.` };
    const n = typeof turni === 'number' && Number.isInteger(turni) ? turni : NaN;
    if (!(n >= 1 && n <= NOTE_REGIA_TURNI_MAX)) return { ok: false, errore: `I turni vanno da 1 a ${NOTE_REGIA_TURNI_MAX}.` };
    if (this.note.length >= NOTE_REGIA_MAX) return { ok: false, errore: `Ci sono già ${NOTE_REGIA_MAX} note: togline una prima.` };
    const nota: NotaRegia = { id: `n${this.prossimoId++}`, testo: t, turni_rimasti: n, turni_totali: n, creata_al_turno: turnoCorrente };
    this.note.push(nota);
    return { ok: true, nota: { ...nota } };
  }

  togli(id: unknown): NotaRegia | null {
    const i = this.note.findIndex((n) => n.id === id);
    if (i < 0) return null;
    return this.note.splice(i, 1)[0]!;
  }

  /** Un turno narrato è passato: ogni nota perde un turno; restituisce quelle scadute. */
  consumaTurno(): NotaRegia[] {
    for (const n of this.note) n.turni_rimasti -= 1;
    const scadute = this.note.filter((n) => n.turni_rimasti <= 0);
    this.note = this.note.filter((n) => n.turni_rimasti > 0);
    return scadute;
  }

  azzera(): void {
    this.note = [];
  }

  /** Per il registro della sessione. */
  esporta(): { elenco: NotaRegia[]; prossimoId: number } {
    return { elenco: this.elenco, prossimoId: this.prossimoId };
  }

  /** Ripresa di una sessione. */
  importa(s: { elenco: NotaRegia[]; prossimoId: number }): void {
    this.note = (s.elenco ?? []).map((n) => ({ ...n }));
    this.prossimoId = Math.max(s.prossimoId ?? 1, ...this.note.map((n) => Number(n.id.slice(1)) + 1));
  }
}
