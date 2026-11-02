/**
 * Cache dell'audio pre-generato delle battute del repertorio: cache/audio/<sha>.pcm + indice.json.
 *
 * La chiave è lo sha256 di «voce_id \n testo per la voce», dove il testo per la voce è ottenuto
 * ESATTAMENTE come in gioco (`testoPerVoce`: stessa pulizia delle righe del narratore, poi la
 * sostituzione dei nomi con la `pronuncia`). Così lo script di pre-generazione e il server
 * trovano lo stesso file per la stessa riga; se la riga cambia, cambia la chiave.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pulisciFrase } from '../narrazione/parser';
import { ID_NARRATORE } from '../campagna/tipi';
import type { Pronunciatore } from './pronuncia';

export interface VoceIndice {
  voce: string;
  testo: string;
  sample_rate: number;
  secondi: number;
  byte: number;
  creato: string;
}

/** Testo che va alla voce per una riga del protocollo (stessa normalizzazione del gioco). */
export function testoPerVoce(etichetta: string, testo: string, pronuncia: Pronunciatore): { mostrato: string; voce: string } {
  const mostrato = pulisciFrase(testo, etichetta !== ID_NARRATORE);
  return { mostrato, voce: pronuncia(mostrato) };
}

export function chiaveAudio(voce: string, testoVoce: string): string {
  return createHash('sha256').update(`${voce}\n${testoVoce}`).digest('hex');
}

export class CacheAudio {
  private indice: Record<string, VoceIndice> = {};
  private readonly fileIndice: string;

  constructor(readonly cartella: string) {
    this.fileIndice = path.join(cartella, 'indice.json');
    if (fs.existsSync(this.fileIndice)) {
      try {
        this.indice = JSON.parse(fs.readFileSync(this.fileIndice, 'utf8')) as Record<string, VoceIndice>;
      } catch {
        this.indice = {};
      }
    }
  }

  percorso(chiave: string): string {
    return path.join(this.cartella, `${chiave}.pcm`);
  }

  /** La voce c'è (file presente e non vuoto)? */
  ha(chiave: string): boolean {
    const p = this.percorso(chiave);
    return fs.existsSync(p) && fs.statSync(p).size > 0;
  }

  info(chiave: string): VoceIndice | undefined {
    return this.indice[chiave];
  }

  get voci(): number {
    return Object.keys(this.indice).length;
  }

  /** Scrive un PCM nella cache (file temporaneo + rename: mai file a metà) e aggiorna l'indice. */
  scrivi(chiave: string, pcm: Buffer, meta: Omit<VoceIndice, 'byte' | 'secondi' | 'creato'>): void {
    fs.mkdirSync(this.cartella, { recursive: true });
    const tmp = `${this.percorso(chiave)}.tmp`;
    fs.writeFileSync(tmp, pcm);
    fs.renameSync(tmp, this.percorso(chiave));
    this.indice[chiave] = { ...meta, byte: pcm.length, secondi: pcm.length / 2 / meta.sample_rate, creato: new Date().toISOString() };
    const tmpIndice = `${this.fileIndice}.tmp`;
    fs.writeFileSync(tmpIndice, JSON.stringify(this.indice, null, 1));
    fs.renameSync(tmpIndice, this.fileIndice);
  }

  leggi(chiave: string): { pcm: Buffer; sampleRate: number } | null {
    if (!this.ha(chiave)) return null;
    return { pcm: fs.readFileSync(this.percorso(chiave)), sampleRate: this.indice[chiave]?.sample_rate ?? 24_000 };
  }
}
