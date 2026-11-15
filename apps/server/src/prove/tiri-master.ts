/**
 * The Game Master's own rolls (docs/prove.md §9): an uncertain outcome nobody at the table rolls for — a front that may
 * advance when the PCs leave, news that may spread (the world's gates with `tiro`, mondo/porte.ts) — is rolled by the
 * Engine, never decided by the model. This module is the world's roll hook (mondo/tiri.ts, `TiroDelMondo`) on the
 * Game Master's side: it rolls with the Engine's dice, logs every roll, keeps the last ones for the panel, and decides
 * whether the table sees it.
 *
 * Visibility (campaign setting `regole.tiri_master`):
 * - `nascosti` (default): never shown; the log and the panel have it;
 * - `visibili`: always shown;
 * - `a_volte`: shown when the odds are close, from one in three to two in three (a d6 needing 3+, 4+ or 5+, a d20
 *   needing 8+ … 14+): a real toss-up is part of the fun; a near-sure roll stays hidden;
 * - a roll the campaign's data marks `visibile: true` is always shown.
 * Shown means: a card «Il master tira» on the projector and the phones (the die and yes/no, never what it was for:
 * the reason is the Game Master's), and one line of the narrator's voice.
 */
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import type { Logger } from '../logger';
import type { EsitoTiroMondo, RichiestaTiroMondo } from '../mondo/tiri';
import type { FonteDadi } from './dadi';
import type { TiriMaster } from './modalita';

/** One roll of the Game Master, as the panel lists it. */
export interface TiroDelMasterRegistrato {
  id: string;
  turno: number;
  /** What asked for it («o_x#2», a gate of the world). */
  origine: string;
  /** Why, in the Game Master's words (a clock and its event): never shown to the table. */
  motivo: string;
  dado: number;
  almeno: number;
  valore: number;
  riuscito: boolean;
  mostrato: boolean;
}

/** Probability that a die of `dado` faces shows `almeno` or more. */
export function probabilita(dado: number, almeno: number): number {
  return Math.max(0, Math.min(1, (dado - almeno + 1) / dado));
}

/** Whether the table sees a Game Master roll (the rule above). */
export function mostraTiroDelMaster(modo: TiriMaster, r: { visibile: boolean; dado: number; almeno: number }): { mostra: boolean; perche: 'dati' | 'impostazione' | 'testa_o_croce' | 'nascosto' } {
  if (r.visibile) return { mostra: true, perche: 'dati' };
  if (modo === 'visibili') return { mostra: true, perche: 'impostazione' };
  if (modo === 'a_volte') {
    const p = probabilita(r.dado, r.almeno);
    if (p >= 1 / 3 - 1e-9 && p <= 2 / 3 + 1e-9) return { mostra: true, perche: 'testa_o_croce' };
  }
  return { mostra: false, perche: 'nascosto' };
}

const MAX_REGISTRATI = 20;

export interface OpzioniTiriDelMaster {
  modo: () => TiriMaster;
  /** The Engine's dice (saved with the session), or the world's own when the campaign has no sheets. */
  dadi: () => FonteDadi;
  log: Logger;
  /** A new card id («t18»), from the checks' state when there is one. */
  nuovoIdTiro: () => string;
  /** The card and the narrator's line of a roll the table sees. */
  mostra: (carta: TiroMostrato) => void;
  /** The Game Master's name on the card, in the content language («Il master»). */
  nome: () => string;
}

export class TiriDelMaster {
  private readonly registrati: TiroDelMasterRegistrato[] = [];

  constructor(private readonly o: OpzioniTiriDelMaster) {}

  /** The world's roll hook (TiroDelMondo): roll, log, and show it if the rule says so. */
  tira(r: RichiestaTiroMondo): EsitoTiroMondo {
    const dado = Math.max(2, Math.min(100, Math.round(r.dado)));
    const valore = this.o.dadi().tira(dado);
    const riuscito = valore >= r.almeno;
    const { mostra, perche } = mostraTiroDelMaster(this.o.modo(), { visibile: r.visibile, dado, almeno: r.almeno });
    const id = this.o.nuovoIdTiro();
    this.registrati.push({ id, turno: r.turno, origine: r.origine, motivo: r.motivo, dado, almeno: r.almeno, valore, riuscito, mostrato: mostra });
    if (this.registrati.length > MAX_REGISTRATI) this.registrati.splice(0, this.registrati.length - MAX_REGISTRATI);
    this.o.log.info({ turno: r.turno, origine: r.origine, motivo: r.motivo, dado: `d${dado}`, almeno: r.almeno, valore, riuscito, mostrato: mostra, perche, p: Math.round(probabilita(dado, r.almeno) * 100) / 100 }, 'Game Master roll');
    if (mostra) this.o.mostra(cartaDelMaster(id, r.turno, this.o.nome(), dado, valore, riuscito));
    return { riuscito, valore, dado, almeno: r.almeno, visibile: mostra };
  }

  /** The last rolls, for the panel (the reasons included). */
  registro(): TiroDelMasterRegistrato[] {
    return [...this.registrati];
  }
}

/**
 * The card of a shown Game Master roll: the die and yes/no, no target number and no reason (they are the Game
 * Master's). `di_png` keeps it among the Engine's cards (never stripped as a player's roll).
 */
export function cartaDelMaster(id: string, turno: number, nome: string, dado: number, valore: number, riuscito: boolean): TiroMostrato {
  return {
    id,
    turno,
    chi: 'master',
    nome,
    di_png: true,
    tipo: 'prova',
    etichetta: nome,
    dadi: [valore],
    dado: valore,
    vantaggio: null,
    motivo_vantaggio: null,
    modificatore: 0,
    totale: valore,
    contro: { tipo: 'CD', valore: 0, descrizione: null },
    bersaglio: null,
    riuscita: riuscito,
    critico: false,
    fallimento_critico: false,
    danno: null,
    a_terra: false,
    privata: false,
    avversario: null,
    facce: dado,
    contro_nascosto: true,
    del_master: true,
  };
}
