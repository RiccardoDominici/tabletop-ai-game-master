/**
 * Archivio delle sessioni di gioco: SQLite (node:sqlite, integrato in Node: niente moduli nativi da
 * compilare), un registro di eventi APPEND-ONLY per sessione (docs/architettura.md, «Motore»: lo
 * stato si ricava dal registro). Una sessione è «in_corso» finché non se ne comincia un'altra.
 *
 * Tabelle:
 *   sessioni(id, campagna, modo, creata, aggiornata, stato, turno, motivo_chiusura, pacchetto)
 *   eventi(seq, sessione, ts, tipo, turno, dati JSON)
 *
 * `pacchetto` è il numero di sessioni/<nn>/ giocato (campagne a più sessioni, docs/strati.md);
 * null per una one-shot. La colonna si aggiunge da sola agli archivi di prima (migrazione additiva).
 *
 * WAL + synchronous NORMAL: un processo che muore (kill, crash) non perde gli eventi già scritti;
 * le scritture di un passaggio (es. trascrizione del turno + fotografia) vanno in una transazione.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Logger } from '../logger';

// node:sqlite è ancora «sperimentale» in Node 25: si zittisce solo QUEL avviso, gli altri restano.
const emettiAvviso = process.emitWarning.bind(process);
let filtroInstallato = false;
function caricaSqlite(): typeof import('node:sqlite') {
  if (!filtroInstallato) {
    filtroInstallato = true;
    process.emitWarning = ((avviso: string | Error, ...resto: unknown[]) => {
      const testo = typeof avviso === 'string' ? avviso : avviso.message;
      if (/SQLite is an experimental feature/i.test(testo)) return;
      (emettiAvviso as (...a: unknown[]) => void)(avviso, ...resto);
    }) as typeof process.emitWarning;
  }
  return createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
}

export type StatoSessione = 'in_corso' | 'chiusa';

export interface InfoSessione {
  id: string;
  campagna: string;
  modo: string;
  /** ISO 8601. */
  creata: string;
  aggiornata: string;
  stato: StatoSessione;
  /** Ultimo turno registrato. */
  turno: number;
  eventi: number;
  /** Perché è stata chiusa (null finché è in corso). */
  motivo_chiusura: string | null;
  /** Numero del pacchetto sessioni/<nn>/ (null = one-shot). */
  pacchetto: number | null;
}

/** Motivo di chiusura scritto da «Fine sessione»: la sessione dopo parte dal pacchetto seguente. */
export const MOTIVO_FINE_SESSIONE = 'fine sessione';

export interface EventoSalvato {
  seq: number;
  ts: string;
  tipo: string;
  turno: number | null;
  dati: unknown;
}

export class ArchivioSessioni {
  private readonly db: import('node:sqlite').DatabaseSync;

  constructor(
    readonly file: string,
    private readonly log?: Logger,
  ) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const { DatabaseSync } = caricaSqlite();
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS sessioni (
        id TEXT PRIMARY KEY, campagna TEXT NOT NULL, modo TEXT NOT NULL,
        creata TEXT NOT NULL, aggiornata TEXT NOT NULL, stato TEXT NOT NULL,
        turno INTEGER NOT NULL DEFAULT 0, motivo_chiusura TEXT
      );
      CREATE TABLE IF NOT EXISTS eventi (
        seq INTEGER PRIMARY KEY AUTOINCREMENT, sessione TEXT NOT NULL REFERENCES sessioni(id),
        ts TEXT NOT NULL, tipo TEXT NOT NULL, turno INTEGER, dati TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS eventi_per_sessione ON eventi (sessione, seq);
    `);
    // Migrazione additiva: gli archivi scritti prima delle campagne a pacchetti non hanno la colonna.
    const colonne = (this.db.prepare('PRAGMA table_info(sessioni)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('pacchetto')) {
      this.db.exec('ALTER TABLE sessioni ADD COLUMN pacchetto INTEGER');
      log?.info({ file }, 'sessioni: archivio aggiornato (colonna pacchetto)');
    }
    log?.info({ file }, 'sessioni: archivio aperto');
  }

  private info(riga: Record<string, unknown> | undefined): InfoSessione | null {
    if (!riga) return null;
    const conta = this.db.prepare('SELECT COUNT(*) AS n FROM eventi WHERE sessione = ?').get(riga['id'] as string) as { n: number };
    return {
      id: riga['id'] as string,
      campagna: riga['campagna'] as string,
      modo: riga['modo'] as string,
      creata: riga['creata'] as string,
      aggiornata: riga['aggiornata'] as string,
      stato: riga['stato'] as StatoSessione,
      turno: Number(riga['turno']),
      eventi: Number(conta.n),
      motivo_chiusura: typeof riga['motivo_chiusura'] === 'string' ? (riga['motivo_chiusura'] as string) : null,
      pacchetto: riga['pacchetto'] === null || riga['pacchetto'] === undefined ? null : Number(riga['pacchetto']),
    };
  }

  /** La sessione in corso più recente di questa campagna e modalità, o null. */
  inCorso(campagna: string, modo: string): InfoSessione | null {
    const riga = this.db
      .prepare("SELECT * FROM sessioni WHERE campagna = ? AND modo = ? AND stato = 'in_corso' ORDER BY aggiornata DESC LIMIT 1")
      .get(campagna, modo) as Record<string, unknown> | undefined;
    return this.info(riga);
  }

  sessione(id: string): InfoSessione | null {
    return this.info(this.db.prepare('SELECT * FROM sessioni WHERE id = ?').get(id) as Record<string, unknown> | undefined);
  }

  /**
   * Le sessioni di una campagna, dalla più recente (per creazione; a parità, l'ordine d'inserimento).
   * Serve alla scelta del pacchetto all'avvio e a scripts/registro.sh.
   */
  elenco(campagna: string): InfoSessione[] {
    const righe = this.db.prepare('SELECT * FROM sessioni WHERE campagna = ? ORDER BY creata DESC, rowid DESC').all(campagna) as Array<Record<string, unknown>>;
    return righe.map((r) => this.info(r)!);
  }

  /** Telefono → PG di una sessione (l'ultimo evento `dispositivo` di ogni telefono vince). */
  dispositivi(sessione: string): Map<string, string> {
    const out = new Map<string, string>();
    const righe = this.db.prepare("SELECT dati FROM eventi WHERE sessione = ? AND tipo = 'dispositivo' ORDER BY seq").all(sessione) as Array<{ dati: string }>;
    for (const r of righe) {
      try {
        const d = JSON.parse(r.dati) as { dispositivo?: unknown; id_pg?: unknown };
        if (typeof d.dispositivo === 'string' && typeof d.id_pg === 'string') out.set(d.dispositivo, d.id_pg);
        else if (typeof d.dispositivo === 'string' && d.id_pg === null) out.delete(d.dispositivo); // dimenticato dal master
      } catch {
        // riga illeggibile: la si salta (come in eventi())
      }
    }
    return out;
  }

  /** Nuova sessione in corso; chiude le altre in corso della stessa campagna (una sola alla volta). */
  crea(id: string, campagna: string, modo: string, pacchetto: number | null = null): InfoSessione {
    const ora = new Date().toISOString();
    this.transazione(() => {
      this.db
        .prepare("UPDATE sessioni SET stato = 'chiusa', motivo_chiusura = 'nuova sessione', aggiornata = ? WHERE campagna = ? AND stato = 'in_corso'")
        .run(ora, campagna);
      this.db
        .prepare("INSERT INTO sessioni (id, campagna, modo, creata, aggiornata, stato, pacchetto) VALUES (?, ?, ?, ?, ?, 'in_corso', ?)")
        .run(id, campagna, modo, ora, ora, pacchetto);
    });
    this.log?.info({ sessione: id, campagna, modo, pacchetto }, 'sessioni: nuova sessione');
    return this.sessione(id)!;
  }

  /** Aggiunge eventi in una transazione (tutti o nessuno). */
  aggiungi(sessione: string, eventi: ReadonlyArray<{ tipo: string; dati: unknown }>, turno: number | null = null): void {
    if (eventi.length === 0) return;
    const ora = new Date().toISOString();
    const inserisci = this.db.prepare('INSERT INTO eventi (sessione, ts, tipo, turno, dati) VALUES (?, ?, ?, ?, ?)');
    this.transazione(() => {
      for (const e of eventi) inserisci.run(sessione, ora, e.tipo, turno, JSON.stringify(e.dati));
      if (turno !== null) this.db.prepare('UPDATE sessioni SET aggiornata = ?, turno = ? WHERE id = ?').run(ora, turno, sessione);
      else this.db.prepare('UPDATE sessioni SET aggiornata = ? WHERE id = ?').run(ora, sessione);
    });
  }

  /** Eventi di una sessione, in ordine. Una riga illeggibile si salta (con un avviso), non ferma la ripresa. */
  eventi(sessione: string): EventoSalvato[] {
    const righe = this.db.prepare('SELECT seq, ts, tipo, turno, dati FROM eventi WHERE sessione = ? ORDER BY seq').all(sessione) as Array<Record<string, unknown>>;
    const out: EventoSalvato[] = [];
    for (const r of righe) {
      try {
        out.push({ seq: Number(r['seq']), ts: r['ts'] as string, tipo: r['tipo'] as string, turno: r['turno'] === null ? null : Number(r['turno']), dati: JSON.parse(r['dati'] as string) });
      } catch (err) {
        this.log?.warn({ sessione, seq: r['seq'], err: (err as Error).message }, 'sessioni: evento illeggibile, saltato');
      }
    }
    return out;
  }

  chiudiSessione(id: string, motivo: string): void {
    this.db.prepare("UPDATE sessioni SET stato = 'chiusa', motivo_chiusura = ?, aggiornata = ? WHERE id = ?").run(motivo, new Date().toISOString(), id);
    this.log?.info({ sessione: id, motivo }, 'sessioni: sessione chiusa');
  }

  /** Chiude le sessioni in corso di una campagna (avvio con --nuova). Restituisce quante. */
  chiudiInCorso(campagna: string, motivo: string): number {
    const r = this.db
      .prepare("UPDATE sessioni SET stato = 'chiusa', motivo_chiusura = ?, aggiornata = ? WHERE campagna = ? AND stato = 'in_corso'")
      .run(motivo, new Date().toISOString(), campagna);
    return Number(r.changes);
  }

  chiudi(): void {
    if (this.db.isOpen) this.db.close();
  }

  private transazione(f: () => void): void {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      f();
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}
