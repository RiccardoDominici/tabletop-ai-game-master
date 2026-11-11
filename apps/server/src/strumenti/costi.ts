/**
 * Quanto costa una sessione di gioco: somma logs/costi.jsonl per sessione dell'archivio (sessioni.sqlite),
 * separando l'LLM (turni, riparazioni, arbitro, preriscaldamento) dalla voce (drama-3, righe `tipo: voce`).
 *
 *   scripts/costi.sh                 le ultime 10 sessioni dell'istanza (4610: logs/; altra porta: logs/porta-N/)
 *   scripts/costi.sh --tutte         tutte
 *   scripts/costi.sh --json          per gli script
 *   scripts/costi.sh --log <cartella>  costi.jsonl e sessioni.sqlite di un'altra cartella
 *
 * Una riga va alla sessione che era aperta in quel momento: dalla sua creazione all'ultimo evento
 * (+10 minuti). Le righe fuori da ogni sessione (istanze di prova senza archivio, preriscaldamenti
 * prima di «Inizia») si raccolgono per giorno, come «fuori sessione».
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { CARTELLA_LOG } from '../percorsi';

export interface RigaCosto {
  ts: string;
  tipo: string;
  costo_usd?: number;
  turno?: number;
  byte_testo?: number;
  secondi_audio?: number;
}

export interface SessioneArchivio {
  id: string;
  campagna: string;
  creata: string;
  aggiornata: string;
  turno: number;
}

export interface CostoSessione {
  sessione: string;
  campagna: string;
  inizio: string;
  /** Turni narrati (righe `turno` dell'LLM). */
  turni: number;
  llm_usd: number;
  voce_usd: number;
  totale_usd: number;
  voce_byte: number;
  voce_minuti: number;
  usd_per_turno: number | null;
}

const MARGINE_MS = 10 * 60_000;

const tondo = (x: number, cifre = 4): number => Math.round(x * 10 ** cifre) / 10 ** cifre;

/** Somma le righe per sessione (le sessioni in qualsiasi ordine). Funzione pura: la provano i test. */
export function sommaPerSessione(righe: readonly RigaCosto[], sessioni: readonly SessioneArchivio[]): CostoSessione[] {
  const ordinate = [...sessioni].sort((a, b) => a.creata.localeCompare(b.creata));
  const gruppi = new Map<string, { info: Omit<CostoSessione, 'turni' | 'llm_usd' | 'voce_usd' | 'totale_usd' | 'voce_byte' | 'voce_minuti' | 'usd_per_turno'>; turni: Set<number>; llm: number; voce: number; byte: number; secondi: number }>();
  for (const r of righe) {
    const t = Date.parse(r.ts);
    if (!Number.isFinite(t)) continue;
    // L'ultima sessione cominciata prima della riga, se era ancora viva.
    let s: SessioneArchivio | undefined;
    for (const x of ordinate) if (Date.parse(x.creata) <= t) s = x;
    if (s && t > Date.parse(s.aggiornata) + MARGINE_MS) s = undefined;
    const chiave = s ? s.id : `fuori-${r.ts.slice(0, 10)}`;
    let g = gruppi.get(chiave);
    if (!g) {
      g = {
        info: s ? { sessione: s.id, campagna: s.campagna, inizio: s.creata } : { sessione: 'fuori sessione', campagna: '?', inizio: r.ts.slice(0, 10) },
        turni: new Set(),
        llm: 0,
        voce: 0,
        byte: 0,
        secondi: 0,
      };
      gruppi.set(chiave, g);
    }
    const usd = typeof r.costo_usd === 'number' ? r.costo_usd : 0;
    if (r.tipo === 'voce') {
      g.voce += usd;
      g.byte += r.byte_testo ?? 0;
      g.secondi += r.secondi_audio ?? 0;
    } else {
      g.llm += usd;
      if (r.tipo === 'turno' && typeof r.turno === 'number') g.turni.add(r.turno);
    }
  }
  return [...gruppi.values()]
    .map((g) => {
      const totale = g.llm + g.voce;
      return {
        ...g.info,
        turni: g.turni.size,
        llm_usd: tondo(g.llm),
        voce_usd: tondo(g.voce),
        totale_usd: tondo(totale),
        voce_byte: g.byte,
        voce_minuti: tondo(g.secondi / 60, 1),
        usd_per_turno: g.turni.size ? tondo(totale / g.turni.size, 5) : null,
      };
    })
    .sort((a, b) => a.inizio.localeCompare(b.inizio));
}

export function leggiRighe(file: string): RigaCosto[] {
  if (!fs.existsSync(file)) return [];
  const out: RigaCosto[] = [];
  for (const riga of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!riga.trim()) continue;
    try {
      out.push(JSON.parse(riga) as RigaCosto);
    } catch {
      /* riga troncata (server fermato a metà scrittura): si salta */
    }
  }
  return out;
}

/** Sessioni dell'archivio, in sola lettura (nessun archivio = nessuna sessione). */
export function leggiSessioni(file: string): SessioneArchivio[] {
  if (!fs.existsSync(file)) return [];
  const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return db.prepare('SELECT id, campagna, creata, aggiornata, turno FROM sessioni').all() as unknown as SessioneArchivio[];
  } finally {
    db.close();
  }
}

function principale(argv: string[]): void {
  const i = argv.indexOf('--log');
  const porta = process.env['TAGM_PORTA'] ?? '4610';
  const cartella = i >= 0 ? path.resolve(argv[i + 1] ?? '.') : (process.env['TAGM_LOG'] ?? (porta === '4610' ? CARTELLA_LOG : path.join(CARTELLA_LOG, `porta-${porta}`)));
  const somme = sommaPerSessione(leggiRighe(path.join(cartella, 'costi.jsonl')), leggiSessioni(path.join(cartella, 'sessioni.sqlite')));
  const scelte = argv.includes('--tutte') ? somme : somme.slice(-10);
  if (argv.includes('--json')) {
    console.log(JSON.stringify(scelte, null, 1));
    return;
  }
  console.log(`Costi per sessione (${path.relative(process.cwd(), cartella) || '.'}):`);
  console.log('inizio               campagna          turni   LLM $    voce $   totale $  $/turno   voce: KB  minuti');
  for (const s of scelte) {
    console.log(
      [
        s.inizio.slice(0, 19).padEnd(20),
        s.campagna.slice(0, 16).padEnd(17),
        String(s.turni).padStart(5),
        s.llm_usd.toFixed(4).padStart(8),
        s.voce_usd.toFixed(4).padStart(8),
        s.totale_usd.toFixed(4).padStart(9),
        (s.usd_per_turno?.toFixed(4) ?? '—').padStart(8),
        (s.voce_byte / 1000).toFixed(1).padStart(10),
        s.voce_minuti.toFixed(1).padStart(7),
      ].join(' '),
    );
  }
  if (!scelte.length) console.log('(nessuna riga di costo)');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) principale(process.argv.slice(2));
