/**
 * Narratore FINTO: un copione nel formato del protocollo, mandato a pezzi con tempi simili a
 * Haiku (primo token ~0,5 s, poi pezzi da pochi caratteri). Serve ai test automatici e alle
 * prove dell'interfaccia senza spendere. Costo zero; i token d'uso sono stimati.
 */
import { setTimeout as attendi } from 'node:timers/promises';
import { calcolaCosto } from './costi';
import type { EsitoNarrazione, Narratore, RichiestaNarrazione } from './tipi';

export interface OpzioniFinto {
  idPng: string[];
  idPg: string[];
  primoTokenMs?: number;
  msPerPezzo?: number;
  caratteriPerPezzo?: number;
  /** Copione fisso (per i test); altrimenti uno generico che usa gli id della campagna. */
  copione?: (turno: number) => string;
}

export class NarratoreFinto implements Narratore {
  readonly nome = 'finto' as const;
  readonly modello = 'claude-haiku-5-5';

  constructor(private readonly o: OpzioniFinto) {}

  private copione(turno: number): string {
    if (this.o.copione) return this.o.copione(turno);
    const png = this.o.idPng[turno % Math.max(1, this.o.idPng.length)];
    const invito = this.o.idPg.slice(0, 2).join(',') || 'tutti';
    return [
      `[narratore] Il forno crepita in fondo alla sala. Qualcuno bussa due volte alla porta.`,
      png ? `[${png}] Chi è a quest'ora? Rispondete, o non apro.` : '',
      `[narratore] Il vento porta l'odore della neve. Cosa fate?`,
      `[invito] ${invito}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  async narra(r: RichiestaNarrazione, onTesto: (delta: string) => void): Promise<EsitoNarrazione> {
    const testo = this.copione(r.turno);
    const passo = this.o.caratteriPerPezzo ?? 6;
    await attendi(this.o.primoTokenMs ?? 500, undefined, { signal: r.signal });
    for (let i = 0; i < testo.length; i += passo) {
      onTesto(testo.slice(i, i + passo));
      await attendi(this.o.msPerPezzo ?? 25, undefined, { signal: r.signal });
    }
    const uso = {
      input_tokens: Math.round(r.messaggio.length / 3),
      output_tokens: Math.round(testo.length / 3),
      cache_read_input_tokens: Math.round(r.sistema.join('').length / 3),
      cache_creation_input_tokens: 0,
    };
    return { testo, modello: this.modello, stopReason: 'end_turn', uso, costo: { ...calcolaCosto(this.modello, uso), costo_usd: 0 }, idMessaggio: null };
  }
}
