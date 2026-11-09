/**
 * Stato delle prove (docs/prove.md, «Stato»): punti ferita di PG e PNG con una scheda, chi è a
 * terra, il seme e il contatore dei dadi, le carte recenti. Si salva nella fotografia della
 * sessione (sessione/tipi.ts → FotografiaSessione.prove) e si riprende dopo un riavvio.
 */
import type { PuntiFerita, TiroMostrato } from '@cantastorie/shared';
import type { SchedaNumerica } from '../campagna/schede';

export interface StatoProveSalvato {
  seme: string;
  contatore: number;
  /** id → punti ferita attuali (i massimi vengono dalla scheda). */
  pf: Array<[string, number]>;
  prossimoTiro: number;
  /** Carte dell'ultimo turno con tiri (per il proiettore dopo una ripresa). */
  recenti: TiroMostrato[];
}

export interface EsitoDannoApplicato {
  prima: number;
  dopo: number;
  massimi: number;
  /** Appena sceso a 0. */
  a_terra: boolean;
}

/** Quanti tiri recenti si tengono (pannello, ripresa). */
const MAX_RECENTI = 24;

export class StatoProve {
  private readonly pf = new Map<string, number>();
  private prossimo = 1;
  private recentiTiri: TiroMostrato[] = [];

  /** Schede SRD o del set del manuale: servono solo id e punti ferita massimi. */
  constructor(private readonly schede: ReadonlyMap<string, Pick<SchedaNumerica, 'id' | 'pf_massimi'>>) {
    this.azzeraPf();
  }

  /** Tutti a punti ferita pieni (inizio sessione, Ricomincia). */
  azzeraPf(): void {
    this.pf.clear();
    for (const s of this.schede.values()) this.pf.set(s.id, s.pf_massimi);
  }

  puntiFerita(id: string): PuntiFerita | null {
    const s = this.schede.get(id);
    if (!s) return null;
    return { attuali: this.pf.get(id) ?? s.pf_massimi, massimi: s.pf_massimi };
  }

  aTerra(id: string): boolean {
    const p = this.puntiFerita(id);
    return p !== null && p.attuali <= 0;
  }

  /** Danno: i PF non scendono sotto 0 (SRD 5.2: a 0 il PNG muore o è fuori combattimento, il PG perde i sensi). */
  danneggia(id: string, n: number): EsitoDannoApplicato | null {
    const p = this.puntiFerita(id);
    if (!p) return null;
    const dopo = Math.max(0, p.attuali - Math.max(0, n));
    this.pf.set(id, dopo);
    return { prima: p.attuali, dopo, massimi: p.massimi, a_terra: p.attuali > 0 && dopo === 0 };
  }

  /** Cura (comando del master, riposo): non oltre i massimi. */
  cura(id: string, n: number): PuntiFerita | null {
    const p = this.puntiFerita(id);
    if (!p) return null;
    this.pf.set(id, Math.min(p.massimi, p.attuali + Math.max(0, n)));
    return this.puntiFerita(id);
  }

  /** Il prossimo id di carta («t1», «t2»…). */
  nuovoIdTiro(): string {
    return `t${this.prossimo++}`;
  }

  registraTiri(tiri: TiroMostrato[]): void {
    if (!tiri.length) return;
    this.recentiTiri = [...this.recentiTiri, ...tiri].slice(-MAX_RECENTI);
  }

  get recenti(): readonly TiroMostrato[] {
    return this.recentiTiri;
  }

  esporta(seme: string, contatore: number): StatoProveSalvato {
    return { seme, contatore, pf: [...this.pf], prossimoTiro: this.prossimo, recenti: [...this.recentiTiri] };
  }

  importa(s: StatoProveSalvato): void {
    this.azzeraPf();
    for (const [id, v] of s.pf ?? []) if (this.schede.has(id) && Number.isFinite(v)) this.pf.set(id, Math.max(0, Math.min(v, this.schede.get(id)!.pf_massimi)));
    this.prossimo = Math.max(1, s.prossimoTiro ?? 1);
    this.recentiTiri = [...(s.recenti ?? [])].slice(-MAX_RECENTI);
  }
}
