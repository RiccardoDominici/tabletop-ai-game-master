/**
 * Narratore FINTO: un copione nel formato del protocollo, mandato a pezzi con tempi simili a
 * Haiku (primo token ~0,5 s, poi pezzi da pochi caratteri). Serve ai test automatici e alle
 * prove dell'interfaccia senza spendere. Costo zero; i token d'uso sono stimati.
 */
import fs from 'node:fs';
import { setTimeout as attendi } from 'node:timers/promises';
import { testo } from '../lingua';
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

/**
 * Copione da un file (TAGM_COPIONE_FINTO): un blocco di righe del protocollo per turno,
 * separati da una riga «---»; il blocco k vale per il turno k+1, l'ultimo per tutti i turni dopo.
 * Le righe che cominciano con «#» sono commenti.
 */
export function copioneDaFile(percorso: string): (turno: number) => string {
  const blocchi = fs
    .readFileSync(percorso, 'utf8')
    .split(/^---\s*$/m)
    .map((b) => b.split('\n').filter((r) => !r.trimStart().startsWith('#')).join('\n').trim())
    .filter(Boolean);
  if (!blocchi.length) throw new Error(`copione vuoto: ${percorso}`);
  return (turno) => blocchi[Math.min(Math.max(turno, 1) - 1, blocchi.length - 1)]!;
}

/**
 * Prove del sorvegliante: un blocco di copione che è solo `[blocca]` simula il modello che non
 * risponde più (nessun token, nessun errore) finché la chiamata non viene annullata; `[errore]`
 * simula una chiamata fallita.
 */
export const COPIONE_BLOCCA = '[blocca]';
export const COPIONE_ERRORE = '[errore]';

export class NarratoreFinto implements Narratore {
  readonly nome = 'finto' as const;
  readonly modello = 'claude-haiku-5-5';

  constructor(private readonly o: OpzioniFinto) {}

  private copione(turno: number): string {
    if (this.o.copione) return this.o.copione(turno);
    const png = this.o.idPng[turno % Math.max(1, this.o.idPng.length)];
    const invito = this.o.idPg.slice(0, 2).join(',') || 'tutti';
    // Le frasi nella lingua dei contenuti (lingue/<codice>/testi-modelli.yaml, `modelli.finto`).
    return [testo('modelli.finto.apertura'), png ? testo('modelli.finto.png', { png }) : '', testo('modelli.finto.chiusura'), `[invito] ${invito}`]
      .filter(Boolean)
      .join('\n');
  }

  async narra(r: RichiestaNarrazione, onTesto: (delta: string) => void): Promise<EsitoNarrazione> {
    const testo = this.copione(r.turno);
    if (testo.trim() === COPIONE_BLOCCA) {
      // Il modello «appeso»: si esce solo quando la regia annulla la chiamata (sorvegliante).
      await new Promise<never>((_, rifiuta) => {
        if (r.signal?.aborted) return rifiuta(r.signal.reason);
        r.signal?.addEventListener('abort', () => rifiuta(r.signal?.reason ?? new Error('annullata')), { once: true });
      });
    }
    if (testo.trim() === COPIONE_ERRORE) {
      await attendi(this.o.primoTokenMs ?? 500, undefined, { signal: r.signal });
      throw new Error('narratore finto: errore simulato (copione [errore])');
    }
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
