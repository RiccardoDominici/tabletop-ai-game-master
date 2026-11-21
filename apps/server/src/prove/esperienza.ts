/**
 * Experience points in play (mechanism M1 of docs/regole-audit/; docs/prove.md §12): the Engine counts the XP the
 * party earns, by the set's rules (regole/esperienza.ts), never the model. Three sources:
 * - a creature defeated (dead, fled, or out of the fight when it ends: asleep, charmed, turned): its sheet's worth, or
 *   the set's table by hit dice and asterisks, counted once per creature;
 * - treasure, when the set gives XP for it (`esperienza.tesoro`): coins gained by a PC (a find, a typed effect, the
 *   panel's coins control) are worth the set's rate, at once (`trovato`) or once the Game Master marks the treasure
 *   back to safety (`al_sicuro`, Basic Fantasy p. 190);
 * - the Game Master's award from the panel, to one PC or to the party.
 * The party's XP are divided equally by the PCs at the table who are not dead (Basic Fantasy p. 49: «divided by the
 * number of adventurers»), each share raised by the PC's traits (the humans' +10%), and held one short of the level
 * after next when the set gives one level per adventure (here: per session). XP never change a level during play: the
 * level-up is the step between sessions (strumenti/tra_sessioni.py, prove/livelli.ts).
 * Saved in the session snapshot; the session log writes each PC's total and the session's awards (sessione/registro.ts).
 */
import { testo } from '../lingua';
import type { Logger } from '../logger';
import { pxDelTesoro, pxDiScheda } from '../regole/esperienza';
import { sogliaPx, tettoPx } from '../regole/progressione';
import { trattiDi } from '../regole/schede';
import { bonusEsperienza } from '../regole/tratti';
import type { SchedaGenerica, SistemaRegole } from '../regole/tipi';

/** One award, as the panel lists it and the session log writes it. */
export interface VoceEsperienza {
  turno: number;
  fonte: 'sconfitto' | 'tesoro' | 'master';
  /** What it was for: the creature's name, «tesoro», the Game Master's reason. */
  motivo: string;
  /** The XP before the shares. */
  totale: number;
  /** PC id → the XP it got (after its traits and the cap). */
  quote: Record<string, number>;
}

export interface StatoEsperienzaSalvato {
  px: Array<[string, number]>;
  sconfitti: string[];
  /** Treasure found and not yet back to safety, in the smallest coin. */
  tesoro: number;
  guadagni: VoceEsperienza[];
}

export interface OpzioniEsperienza {
  sistema: SistemaRegole;
  /** The Engine's live sheets (their level may change at the session's start, prove/livelli.ts). */
  schede: ReadonlyMap<string, SchedaGenerica>;
  /** The PCs who share the party's XP now: at the table, with a sheet, not dead. */
  compagni: () => string[];
  nome: (id: string) => string;
  log: Logger;
}

/** What the panel shows for one PC. */
export interface VistaPxPg {
  id: string;
  nome: string;
  px: number;
  livello: number;
  /** XP to reach the next level; null at the table's last level or without a table. */
  prossimo: number | null;
  /** The XP reach the next level: it is taken between sessions. */
  sale: boolean;
}

export class Esperienza {
  private readonly px = new Map<string, number>();
  private readonly sconfitti = new Set<string>();
  private tesoroInSospeso = 0;
  private guadagni: VoceEsperienza[] = [];

  constructor(private readonly o: OpzioniEsperienza) {
    this.azzera();
  }

  /** Whether the set counts XP at all (an XP table or a class XP row): otherwise nothing is counted or shown. */
  get attiva(): boolean {
    return !!this.o.sistema.esperienza || (this.o.sistema.classi ?? []).some((c) => c.progressione.px.length);
  }

  private classeDi(id: string) {
    const sch = this.o.schede.get(id);
    return sch?.classe ? ((this.o.sistema.classi ?? []).find((c) => c.id === sch.classe)?.progressione ?? null) : null;
  }

  /** A PC's XP now: what it earned on top of its sheet's (or the package's) total. */
  pxDi(id: string): number {
    return this.px.get(id) ?? 0;
  }

  /** The PC's XP at the start (the sheet's `px`, else the threshold of its level). Called again after a level change. */
  private iniziali(): void {
    for (const sch of this.o.schede.values()) {
      if (sch.di_png) continue;
      const c = this.classeDi(sch.id);
      this.px.set(sch.id, sch.px ?? (c ? (sogliaPx(c, sch.livello ?? 1) ?? 0) : 0));
    }
  }

  /** The package set a PC's XP (`pg_all_inizio.<pg>.px`). */
  imposta(id: string, px: number): void {
    if (Number.isInteger(px) && px >= 0) this.px.set(id, px);
  }

  /**
   * Give `totale` XP to `a` (null: the party, in equal shares). Returns the award, or null when nobody gets anything.
   * Each share is raised by the PC's XP traits and held under the one-level cap (logged when it bites).
   */
  premia(fonte: VoceEsperienza['fonte'], motivo: string, totale: number, a: string[] | null, turno: number): VoceEsperienza | null {
    if (!this.attiva || !Number.isFinite(totale) || totale === 0) return null;
    const chi = (a ?? this.o.compagni()).filter((id) => this.o.schede.has(id) && !this.o.schede.get(id)!.di_png);
    if (!chi.length) {
      this.o.log.info({ fonte, motivo, totale }, 'xp: nobody at the table to share it');
      return null;
    }
    const quota = Math.trunc(totale / chi.length);
    const quote: Record<string, number> = {};
    for (const id of chi) {
      const sch = this.o.schede.get(id)!;
      const bonus = bonusEsperienza(trattiDi(this.o.sistema, sch));
      let n = quota > 0 ? Math.floor((quota * (100 + bonus)) / 100) : quota;
      const prima = this.pxDi(id);
      const c = this.classeDi(id);
      const tetto = c ? tettoPx(c, sch.livello ?? 1, !!this.o.sistema.progressione?.unLivelloPerAvventura) : null;
      if (tetto !== null && prima + n > tetto) {
        this.o.log.info({ id, prima, guadagno: n, tetto }, 'xp: held one short of the level after next (one level per adventure)');
        n = Math.max(0, tetto - prima);
      }
      this.px.set(id, Math.max(0, prima + n));
      quote[id] = n;
    }
    const v: VoceEsperienza = { turno, fonte, motivo, totale, quote };
    this.guadagni.push(v);
    this.o.log.info({ turno, fonte, motivo, totale, quote }, 'xp: awarded');
    return v;
  }

  /** A creature was defeated: its worth to the party, once. Null when already counted or worth nothing known. */
  sconfitto(id: string, turno: number): VoceEsperienza | null {
    if (!this.attiva || this.sconfitti.has(id)) return null;
    const sch = this.o.schede.get(id);
    if (!sch?.di_png) return null;
    this.sconfitti.add(id);
    const px = pxDiScheda(this.o.sistema.esperienza, sch);
    if (px === null) {
      this.o.log.warn({ id }, 'xp: a defeated creature with no px and no dadi_vita: worth nothing (the Game Master can award it)');
      return null;
    }
    return this.premia('sconfitto', this.o.nome(id), px, null, turno);
  }

  /** Coins gained by a PC (`valore` in the smallest coin): treasure XP at once, or waiting for «back to safety». */
  tesoroTrovato(chi: string, valore: number, turno: number): VoceEsperienza | null {
    const t = this.o.sistema.esperienza?.tesoro;
    if (!t || valore <= 0 || this.o.schede.get(chi)?.di_png) return null;
    if (t.quando === 'al_sicuro') {
      this.tesoroInSospeso += valore;
      this.o.log.info({ chi, valore, in_sospeso: this.tesoroInSospeso }, 'xp: treasure found, it counts once back to safety');
      return null;
    }
    const px = pxDelTesoro(this.o.sistema.esperienza, this.o.sistema.monete, valore) ?? 0;
    return this.premia('tesoro', testo('prove.esperienza.tesoro'), px, null, turno);
  }

  /** The Game Master marks the treasure found so far back to safety: its XP to the party. */
  tesoroAlSicuro(turno: number): VoceEsperienza | null {
    const valore = this.tesoroInSospeso;
    if (!valore) return null;
    this.tesoroInSospeso = 0;
    const px = pxDelTesoro(this.o.sistema.esperienza, this.o.sistema.monete, valore) ?? 0;
    return this.premia('tesoro', testo('prove.esperienza.tesoro'), px, null, turno);
  }

  /** Treasure found and not yet back to safety, in the smallest coin. */
  get tesoro(): number {
    return this.tesoroInSospeso;
  }

  /** This session's awards, oldest first. */
  registro(): VoceEsperienza[] {
    return this.guadagni.map((v) => ({ ...v, quote: { ...v.quote } }));
  }

  /** Each PC's XP, level and next threshold, for the panel. */
  vista(): VistaPxPg[] {
    if (!this.attiva) return [];
    return [...this.o.schede.values()].filter((s) => !s.di_png).map((s) => {
      const c = this.classeDi(s.id);
      const livello = s.livello ?? 1;
      const prossimo = c ? sogliaPx(c, livello + 1) : null;
      const px = this.pxDi(s.id);
      return { id: s.id, nome: this.o.nome(s.id), px, livello, prossimo, sale: prossimo !== null && px >= prossimo };
    });
  }

  azzera(): void {
    this.px.clear();
    this.sconfitti.clear();
    this.tesoroInSospeso = 0;
    this.guadagni = [];
    this.iniziali();
  }

  esporta(): StatoEsperienzaSalvato {
    return { px: [...this.px], sconfitti: [...this.sconfitti], tesoro: this.tesoroInSospeso, guadagni: this.registro() };
  }

  importa(s: StatoEsperienzaSalvato | null | undefined): void {
    if (!s) return;
    for (const [id, n] of s.px ?? []) if (typeof id === 'string' && Number.isInteger(n)) this.px.set(id, n);
    this.sconfitti.clear();
    for (const id of s.sconfitti ?? []) if (typeof id === 'string') this.sconfitti.add(id);
    this.tesoroInSospeso = Number.isInteger(s.tesoro) ? s.tesoro : 0;
    this.guadagni = Array.isArray(s.guadagni) ? s.guadagni.map((v) => ({ ...v, quote: { ...v.quote } })) : [];
  }
}
