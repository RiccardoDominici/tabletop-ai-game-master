/**
 * Scrittura append-only di file JSONL (logs/turni.jsonl, logs/costi.jsonl).
 * Una riga per oggetto, scritta in modo sincrono: sono pochi eventi per turno e così una riga
 * non si perde se il processo viene fermato subito dopo.
 */
import fs from 'node:fs';
import path from 'node:path';

export class RegistroJsonl {
  constructor(readonly file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  scrivi(oggetto: Record<string, unknown>): void {
    fs.appendFileSync(this.file, `${JSON.stringify(oggetto)}\n`);
  }

  /** Legge tutte le righe (per i test e per il riepilogo delle latenze). */
  leggi<T = Record<string, unknown>>(): T[] {
    if (!fs.existsSync(this.file)) return [];
    return fs
      .readFileSync(this.file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((r) => JSON.parse(r) as T);
  }
}
