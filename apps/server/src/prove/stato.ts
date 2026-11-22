/**
 * Stato delle prove (docs/prove.md, «Stato»): punti ferita di PG e PNG con una scheda, chi è a
 * terra, il seme e il contatore dei dadi, le carte recenti. Si salva nella fotografia della
 * sessione (sessione/tipi.ts → FotografiaSessione.prove) e si riprende dopo un riavvio.
 */
import type { PuntiFerita, TiroMostrato } from '@tabletop-ai-gm/shared';
import type { SchedaNumerica } from '../campagna/schede';
import type { StatoCombattimentoSalvato } from './combattimento';
import type { StatoRisorseSalvato } from './risorse';
import type { StatoAttiviSalvato } from './attivi';
import type { StatoMorentiSalvato } from './morte';
import type { StatoTempoSalvato } from './tempo';
import type { StatoEsperienzaSalvato } from './esperienza';
import type { StatoLivelliSalvato } from './livelli';
import type { StatoDrenaggiSalvato } from './drenaggio';
import type { StatoEsplorazioneSalvato } from './esplorazione';
import type { StatoProvvisteSalvato } from './provviste';
import type { StatoFaticaSalvato } from './fatica';

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
  /** A fight the Game Master opened from the panel with manual rolls, not started yet (it starts at the next close). */
  combattimento_chiesto?: boolean;
  /** Chi è morto o fuggito (oltre ai PF): resta vero anche a scontro finito. */
  fuori?: Array<[string, Uscito]>;
  /** Facts of the Game Master's rest or hazards not yet told by the narrator (prove/motore.ts). */
  fatti_in_sospeso?: string[];
  /** The characters' resources of a manual's set (prove/risorse.ts): spell slots, prepared spells, items, ammunition. */
  risorse?: StatoRisorseSalvato;
  /** Timed effects of powers and hazards (prove/attivi.ts). */
  attivi?: StatoAttiviSalvato;
  /** PCs in a dying window of the death rule (prove/morte.ts). */
  morenti?: StatoMorentiSalvato;
  /** The game clock and the lights burning (prove/tempo.ts). Absent in older snapshots: the clock starts again. */
  tempo?: StatoTempoSalvato;
  /** XP earned, creatures counted, treasure waiting for safety, this session's awards (prove/esperienza.ts). */
  esperienza?: StatoEsperienzaSalvato;
  /** Each PC's level and maximum hit points, and the level-up's rolls still owed (prove/livelli.ts). */
  livelli?: StatoLivelliSalvato;
  /** Subduing and killing damage taken since the last full health (Basic Fantasy pp. 55–56): who is knocked out. */
  danni_tipo?: Array<[string, { non_letali: number; letali: number }]>;
  /** Maximum hit points lost to energy drain (prove/drenaggio.ts), by character. */
  riduzioni?: Array<[string, number]>;
  /** Negative levels by character (prove/drenaggio.ts). */
  drenaggi?: StatoDrenaggiSalvato;
  /** PCs at 0 whose death save a fight ended from the panel left owed: rolled at the next closed window. */
  zero_da_tirare?: string[];
  /** Damage taken by type, by character (a troll's fire and acid, which it cannot regenerate). */
  danni_per_tipo?: Array<[string, Array<[string, number]>]>;
  /** Wandering monster checks: the schedule and the session's encounters (prove/esplorazione.ts). */
  esplorazione?: StatoEsplorazioneSalvato;
  /** The Game Master's exploration cards rolled between two turns, not yet shown with a turn. */
  carte_del_tempo?: TiroMostrato[];
  /** Encounters not yet told by the narrator: owed facts of the next turn. */
  incontri_dovuti?: Array<{ id: string; nome: string; quanti?: number }>;
  /** Daily food and water: the open packs and the days without (prove/provviste.ts). */
  provviste?: StatoProvvisteSalvato;
  /** The exploration rest rule: time since the last rest, overdue (prove/fatica.ts). */
  fatica?: StatoFaticaSalvato;
  /** The last journey's course check, for the panel. */
  orientamento?: { guida: string; smarriti: boolean };
  /** The Game Master's light for a scene, and what the narrator last heard of the party's sight (prove/luce.ts). */
  luce_forzata?: { scena: string; livello: 'piena' | 'fioca' | 'buio' };
  luce_nota?: string;
  /** The Game Master's adjustments to morale scores, by NPC. */
  morale_master?: Array<[string, number]>;
  /** The knocked out, and from what game second someone can wake them. */
  svegliabili?: Array<[string, number]>;
  /** The creatures wandering encounters brought into their scenes (prove/vaganti.ts), rebuilt on resume. */
  vaganti?: Array<{ id: string; mostro: string; nome: string; scena: string; incontro: number }>;
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
  /**
   * Subduing and killing damage taken, by character (Basic Fantasy p. 55): at 0 hit points with some subduing damage and
   * less killing damage than its maximum, a character is knocked out, not dead or dying. Healing takes the subduing first.
   */
  private readonly tipi = new Map<string, { nonLetali: number; letali: number }>();
  /** Maximum hit points lost (energy drain: one hit die per negative level, Basic Fantasy p. 58). */
  private readonly riduzioni = new Map<string, number>();
  /** Damage taken by type since full health (what a troll cannot regenerate: fire, acid). */
  private readonly perTipo = new Map<string, Map<string, number>>();

  /** Schede SRD o del set del manuale: servono solo id e punti ferita massimi. */
  constructor(private readonly schede: ReadonlyMap<string, Pick<SchedaNumerica, 'id' | 'pf_massimi'>>) {
    this.azzeraPf();
  }

  /** Tutti a punti ferita pieni (inizio sessione, Ricomincia). */
  azzeraPf(): void {
    this.pf.clear();
    this.usciti.clear();
    this.tipi.clear();
    this.riduzioni.clear();
    this.perTipo.clear();
    for (const s of this.schede.values()) this.pf.set(s.id, s.pf_massimi);
  }

  puntiFerita(id: string): PuntiFerita | null {
    const s = this.schede.get(id);
    if (!s) return null;
    const massimi = Math.max(0, s.pf_massimi - (this.riduzioni.get(id) ?? 0));
    return { attuali: Math.min(this.pf.get(id) ?? s.pf_massimi, massimi), massimi };
  }

  /** Energy drain lowers the maximum (current hit points capped by it). Returns the hit points after. */
  riduciMassimi(id: string, n: number): PuntiFerita | null {
    if (!this.schede.has(id) || n <= 0) return this.puntiFerita(id);
    this.riduzioni.set(id, (this.riduzioni.get(id) ?? 0) + n);
    const p = this.puntiFerita(id)!;
    this.pf.set(id, p.attuali);
    return p;
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
  danneggia(id: string, n: number, nonLetale = false, tipo: string | null = null): EsitoDannoApplicato | null {
    const p = this.puntiFerita(id);
    if (!p) return null;
    const dopo = Math.max(0, p.attuali - Math.max(0, n));
    this.pf.set(id, dopo);
    if (tipo && n > 0) {
      const m = this.perTipo.get(id) ?? new Map<string, number>();
      m.set(tipo, (m.get(tipo) ?? 0) + n);
      this.perTipo.set(id, m);
    }
    // Subduing damage on a character already at 0 is killing damage (p. 55: «someone might be beaten to death»).
    const t = this.tipi.get(id) ?? { nonLetali: 0, letali: 0 };
    if (nonLetale && p.attuali > 0) t.nonLetali += Math.max(0, n);
    else t.letali += Math.max(0, n);
    this.tipi.set(id, t);
    return { prima: p.attuali, dopo, massimi: p.massimi, a_terra: p.attuali > 0 && dopo === 0 };
  }

  /** Cura (comando del master, riposo): non oltre i massimi. */
  cura(id: string, n: number): PuntiFerita | null {
    const p = this.puntiFerita(id);
    if (!p) return null;
    this.pf.set(id, Math.min(p.massimi, p.attuali + Math.max(0, n)));
    // Healing takes away the subduing damage first; back at full health, nothing is left of either.
    const t = this.tipi.get(id);
    if (t) {
      const via = Math.min(t.nonLetali, Math.max(0, n));
      t.nonLetali -= via;
      t.letali = Math.max(0, t.letali - (Math.max(0, n) - via));
      if (this.pf.get(id) === p.massimi || (!t.nonLetali && !t.letali)) this.tipi.delete(id);
    }
    if (this.pf.get(id) === p.massimi) this.perTipo.delete(id);
    // Il master che ridà PF a un morto lo riporta in vita: è la sua decisione.
    if (this.usciti.get(id) === 'morto' && this.pf.get(id)! > 0) this.usciti.delete(id);
    return this.puntiFerita(id);
  }

  /**
   * Healing by a rule (a spell, a potion, a rest: prove/effetti.ts, prove/riposo.ts): up to the maximum, but never on a
   * dead character. Only the Game Master's own command (`cura`, `impostaPf`) brings one back. null = no sheet, or dead.
   */
  curaRegola(id: string, n: number): PuntiFerita | null {
    if (this.usciti.get(id) === 'morto') return null;
    return this.cura(id, n);
  }

  /** The damage of these types `id` has taken since full health (a troll: fire and acid). */
  dannoDiTipo(id: string, tipi: readonly string[]): number {
    const m = this.perTipo.get(id);
    return m ? tipi.reduce((n, t) => n + (m.get(t) ?? 0), 0) : 0;
  }

  /**
   * Knocked out, not dead nor dying (Basic Fantasy p. 55): at 0 hit points with some subduing damage, and less killing
   * damage than its maximum hit points.
   */
  tramortito(id: string): boolean {
    const p = this.puntiFerita(id);
    const t = this.tipi.get(id);
    return !!p && p.attuali <= 0 && !!t && t.nonLetali > 0 && t.letali < p.massimi;
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
    return { seme, contatore, pf: [...this.pf], prossimoTiro: this.prossimo, recenti: [...this.recentiTiri], fuori: [...this.usciti], ...(this.tipi.size ? { danni_tipo: [...this.tipi].map(([id, t]) => [id, { non_letali: t.nonLetali, letali: t.letali }] as [string, { non_letali: number; letali: number }]) } : {}), ...(this.riduzioni.size ? { riduzioni: [...this.riduzioni] } : {}), ...(this.perTipo.size ? { danni_per_tipo: [...this.perTipo].map(([id, m]) => [id, [...m]] as [string, Array<[string, number]>]) } : {}) };
  }

  importa(s: StatoProveSalvato): void {
    this.azzeraPf();
    // The drained maxima first: the hit points are read back against them.
    for (const [id, n] of s.riduzioni ?? []) if (this.schede.has(id) && Number.isFinite(n) && n > 0) this.riduzioni.set(id, n);
    for (const [id, v] of s.pf ?? []) if (this.schede.has(id) && Number.isFinite(v)) this.pf.set(id, Math.max(0, Math.min(v, this.puntiFerita(id)!.massimi)));
    for (const [id, u] of s.fuori ?? []) if (u === 'morto' || u === 'fuggito') this.usciti.set(id, u);
    for (const [id, l] of s.danni_per_tipo ?? []) if (this.schede.has(id) && Array.isArray(l)) this.perTipo.set(id, new Map(l.filter(([k, n]) => typeof k === 'string' && Number.isFinite(n))));
    for (const [id, t] of s.danni_tipo ?? []) if (this.schede.has(id) && t) this.tipi.set(id, { nonLetali: Math.max(0, t.non_letali ?? 0), letali: Math.max(0, t.letali ?? 0) });
    this.prossimo = Math.max(1, s.prossimoTiro ?? 1);
    this.recentiTiri = [...(s.recenti ?? [])].slice(-MAX_RECENTI);
  }
}
