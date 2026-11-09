/**
 * La durata della serata e il preavviso di fine (docs/richieste-2026-11-09.md §9, chiusura guidata).
 *
 * Il Motore sa quanto deve durare la serata (`ore_per_sessione` del brief, predefinito 2,5; il master
 * la cambia dal pannello) e da quando è cominciata (avvio o ripresa). A MINUTI_PREAVVISO dalla fine il
 * pannello lo dice, e il contesto del narratore riceve un CONSIGLIO: avvicinarsi a una pausa naturale.
 * Mai durante un climax (scena con `climax: true`, o un orologio attivo a un segno dalla fine): lì il
 * consiglio aspetta. Il tempo viene dall'orologio della regia, così le prove lo controllano.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { ScenaCaricata } from '../campagna/tipi';
import type { Orologio } from '../scena/orologi';

export const ORE_PREDEFINITE = 2.5;
export const MINUTI_PREAVVISO = 20;
export const ORE_MIN = 0.5;
export const ORE_MAX = 8;

/** `ore_per_sessione` del brief.yaml della campagna (null = assente o illeggibile). */
export function orePerSessioneDelBrief(cartellaCampagna: string): number | null {
  const f = path.join(cartellaCampagna, 'brief.yaml');
  if (!fs.existsSync(f)) return null;
  try {
    const v = (YAML.parse(fs.readFileSync(f, 'utf8')) as Record<string, unknown> | null)?.['ore_per_sessione'];
    return typeof v === 'number' && v >= ORE_MIN && v <= ORE_MAX ? v : null;
  } catch {
    return null;
  }
}

/** La scena è in un climax: lì il consiglio di chiudere non arriva. */
export function climaxInCorso(scena: ScenaCaricata, orologiAttivi: readonly Orologio[]): boolean {
  if (scena.dati['climax'] === true) return true;
  return orologiAttivi.some((o) => o.partito && o.segmenti > 1 && o.pieni >= o.segmenti - 1 && o.pieni < o.segmenti);
}

export interface StatoDurata {
  ore: number;
  origine: 'brief' | 'predefinito' | 'master';
  minutiPassati: number | null;
  minutiRimasti: number | null;
  /** Mancano MINUTI_PREAVVISO o meno (anche oltre la fine). */
  fineVicina: boolean;
}

export class DurataSerata {
  private ore: number;
  private origine: StatoDurata['origine'];
  private inizio: number | null = null;

  constructor(oreDelBrief: number | null) {
    this.ore = oreDelBrief ?? ORE_PREDEFINITE;
    this.origine = oreDelBrief === null ? 'predefinito' : 'brief';
  }

  /** La serata comincia adesso (avvio della sessione o ripresa). `adesso` in ms. */
  comincia(adesso: number): void {
    this.inizio = adesso;
  }

  /** Il master cambia la durata (ore tra ORE_MIN e ORE_MAX). */
  imposta(ore: number): boolean {
    if (!Number.isFinite(ore) || ore < ORE_MIN || ore > ORE_MAX) return false;
    this.ore = Math.round(ore * 4) / 4;
    this.origine = 'master';
    return true;
  }

  stato(adesso: number): StatoDurata {
    if (this.inizio === null) return { ore: this.ore, origine: this.origine, minutiPassati: null, minutiRimasti: null, fineVicina: false };
    const passati = Math.max(0, Math.floor((adesso - this.inizio) / 60_000));
    const rimasti = Math.round(this.ore * 60) - passati;
    return { ore: this.ore, origine: this.origine, minutiPassati: passati, minutiRimasti: rimasti, fineVicina: rimasti <= MINUTI_PREAVVISO };
  }
}

/** La sezione per il messaggio del turno, quando la fine è vicina e non c'è un climax (null = niente). */
export function consiglioDiChiusura(s: StatoDurata, climax: boolean): string | null {
  if (!s.fineVicina || climax || s.minutiRimasti === null) return null;
  const quanto = s.minutiRimasti > 0 ? `Mancano circa ${s.minutiRimasti} minuti alla fine prevista della serata.` : 'La serata è oltre la durata prevista.';
  return `${quanto} Avvicinati a una pausa naturale: porta a compimento il momento in corso, niente misteri nuovi. È un consiglio, non un ordine: rispondi comunque a ogni azione.`;
}
