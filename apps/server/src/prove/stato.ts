/**
 * Stato delle prove (docs/prove.md, «Stato»): punti ferita di PG e PNG con una scheda, chi è a
 * terra, il seme e il contatore dei dadi, le carte recenti. Si salva nella fotografia della
 * sessione (sessione/tipi.ts → FotografiaSessione.prove) e si riprende dopo un riavvio.
 */
import type { PuntiFerita, TiroMostrato } from '@cantastorie/shared';
import type { SchedaNumerica } from '../campagna/schede';
import type { StatoCombattimentoSalvato } from './combattimento';

export interface StatoProveSalvato {
  seme: string;
  contatore: number;
  /** id → punti ferita attuali (i massimi vengono dalla scheda). */
  pf: Array<[string, number]>;
  prossimoTiro: number;
  /** Carte dell'ultimo turno con tiri (per il proiettore dopo una ripresa). */
  recenti: TiroMostrato[];
  /** Lo scontro in corso (prove/combattimento.ts), se c'era. */
  combattimento?: StatoCombattimentoSalvato | null;
  /** Chi è morto o fuggito (oltre ai PF): resta vero anche a scontro finito. */
  fuori?: Array<[string, Uscito]>;
}

/** Fuori gioco oltre ai PF: morto (finché il master non lo cura), fuggito (finché la scena non cambia). */
export type Uscito = 'morto' | 'fuggito';
/** Come sta un personaggio che non può parlare né agire: a terra (0 PF), morto o fuggito. */
export type FuoriGioco = 'a_terra' | Uscito;

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
  /** Morti e fuggiti (prove/combattimento.ts li segna). */
  private readonly usciti = new Map<string, Uscito>();
  private prossimo = 1;
  private recentiTiri: TiroMostrato[] = [];

  /** Schede SRD o del set del manuale: servono solo id e punti ferita massimi. */
  constructor(private readonly schede: ReadonlyMap<string, Pick<SchedaNumerica, 'id' | 'pf_massimi'>>) {
    this.azzeraPf();
  }

  /** Tutti a punti ferita pieni (inizio sessione, Ricomincia). */
  azzeraPf(): void {
    this.pf.clear();
    this.usciti.clear();
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

  /**
   * Chi non parla né agisce (docs/combattimento.md, «Fuori gioco»): morto, fuggito, oppure a terra con 0 PF.
   * null = in gioco. La fonte unica per presenza, catalogo, guardie e narratore.
   */
  fuoriGioco(id: string): FuoriGioco | null {
    return this.usciti.get(id) ?? (this.aTerra(id) ? 'a_terra' : null);
  }

  /** Tutti quelli fuori gioco adesso (id → come). */
  tuttiFuori(): Map<string, FuoriGioco> {
    const out = new Map<string, FuoriGioco>();
    for (const id of this.schede.keys()) {
      const f = this.fuoriGioco(id);
      if (f) out.set(id, f);
    }
    for (const [id, u] of this.usciti) out.set(id, u);
    return out;
  }

  /** Lo scontro dice che è morto o fuggito. */
  segnaUscito(id: string, come: Uscito): void {
    this.usciti.set(id, come);
  }

  /** La scena cambia: chi era fuggito può ricomparire altrove (i morti restano morti). */
  dimenticaFughe(): string[] {
    const tornati = [...this.usciti].filter(([, u]) => u === 'fuggito').map(([id]) => id);
    for (const id of tornati) this.usciti.delete(id);
    return tornati;
  }

  /** Il master lo rimette in scena a mano: non è più fuggito. */
  rientra(id: string): boolean {
    return this.usciti.get(id) === 'fuggito' && this.usciti.delete(id);
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
    // Il master che ridà PF a un morto lo riporta in vita: è la sua decisione.
    if (this.usciti.get(id) === 'morto' && this.pf.get(id)! > 0) this.usciti.delete(id);
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
    return { seme, contatore, pf: [...this.pf], prossimoTiro: this.prossimo, recenti: [...this.recentiTiri], fuori: [...this.usciti] };
  }

  importa(s: StatoProveSalvato): void {
    this.azzeraPf();
    for (const [id, v] of s.pf ?? []) if (this.schede.has(id) && Number.isFinite(v)) this.pf.set(id, Math.max(0, Math.min(v, this.schede.get(id)!.pf_massimi)));
    for (const [id, u] of s.fuori ?? []) if (u === 'morto' || u === 'fuggito') this.usciti.set(id, u);
    this.prossimo = Math.max(1, s.prossimoTiro ?? 1);
    this.recentiTiri = [...(s.recenti ?? [])].slice(-MAX_RECENTI);
  }
}
