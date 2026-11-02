/**
 * Ordine di risoluzione: prima scrive, prima arriva. I pareggi veri (invii entro 1 s) si
 * decidono con un ordine che ruota tra i giocatori, così nessun posto vince sempre.
 */

export const FINESTRA_PAREGGIO_MS = 1000;

export class Spareggio {
  private puntatore = 0;

  constructor(private readonly giocatori: readonly string[]) {}

  /** Priorità del giocatore nella rotazione corrente (0 = prima). */
  private priorita(autore: string): number {
    const i = this.giocatori.indexOf(autore);
    const n = this.giocatori.length || 1;
    return i < 0 ? n : (i - this.puntatore + n) % n;
  }

  /**
   * Chi vince tra due azioni: la prima inviata; entro 1 s decide la rotazione, che poi avanza.
   * Restituisce l'id del vincitore.
   */
  vincitore<T extends { id: string; autore: string; inviata_alle: number }>(a: T, b: T): string {
    if (Math.abs(a.inviata_alle - b.inviata_alle) >= FINESTRA_PAREGGIO_MS) return a.inviata_alle <= b.inviata_alle ? a.id : b.id;
    const vince = this.priorita(a.autore) <= this.priorita(b.autore) ? a : b;
    this.avanza(vince.autore);
    return vince.id;
  }

  /**
   * Ordina per invio; i gruppi entro 1 s si ordinano con la rotazione (che poi avanza).
   * `deciso(a, b)`: vincitore già stabilito tra due azioni (es. un conflitto annunciato ai
   * giocatori): l'ordine lo rispetta, e quel pareggio non fa avanzare di nuovo la rotazione.
   */
  ordina<T extends { id: string; autore: string; inviata_alle: number }>(azioni: readonly T[], deciso: (a: T, b: T) => string | null = () => null): T[] {
    const per = [...azioni].sort((x, y) => x.inviata_alle - y.inviata_alle);
    const out: T[] = [];
    let i = 0;
    while (i < per.length) {
      const gruppo = [per[i]!];
      while (i + gruppo.length < per.length && per[i + gruppo.length]!.inviata_alle - gruppo[gruppo.length - 1]!.inviata_alle < FINESTRA_PAREGGIO_MS) {
        gruppo.push(per[i + gruppo.length]!);
      }
      if (gruppo.length > 1) {
        let indeciso = false;
        gruppo.sort((x, y) => {
          const d = deciso(x, y);
          if (d) return d === x.id ? -1 : 1;
          indeciso = true;
          return this.priorita(x.autore) - this.priorita(y.autore);
        });
        if (indeciso) this.avanza(gruppo[0]!.autore);
      }
      out.push(...gruppo);
      i += gruppo.length;
    }
    return out;
  }

  /** Dopo un pareggio vinto da `autore`, la priorità passa al giocatore successivo. */
  private avanza(autore: string): void {
    const i = this.giocatori.indexOf(autore);
    if (i >= 0) this.puntatore = (i + 1) % this.giocatori.length;
  }
}
