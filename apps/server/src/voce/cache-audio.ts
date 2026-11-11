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
import { soloParole } from './espressione';

export interface VoceIndice {
  voce: string;
  /** The exact text sent to the voice (respellings of the names included: the key is computed from it). */
  testo: string;
  /** The text shown (no respellings, no markup): the same line said another way is recognised by it. */
  mostrato?: string;
  sample_rate: number;
  secondi: number;
  byte: number;
  creato: string;
}

/**
 * Testo che va alla voce per una riga del protocollo (stessa normalizzazione del gioco).
 * Una riga del repertorio può avere direzioni, suoni e tag di drama-3 (voce/espressione.ts):
 * `mostrato` è senza (proiettore, trascrizione), `voce` li tiene (la pipeline li toglie per Qwen).
 * Senza markup il risultato è quello di sempre, e così le chiavi dell'audio già pre-generato.
 */
export function testoPerVoce(etichetta: string, testo: string, pronuncia: Pronunciatore): { mostrato: string; voce: string } {
  const pulito = pulisciFrase(testo, etichetta !== ID_NARRATORE);
  return { mostrato: soloParole(pulito), voce: pronuncia(pulito) };
}

export function chiaveAudio(voce: string, testoVoce: string): string {
  return createHash('sha256').update(`${voce}\n${testoVoce}`).digest('hex');
}

/**
 * Chiave dell'audio di un motore espressivo (drama-3): motore, voce e testo ESATTO mandato (direzione
 * predefinita compresa). Se cambiano la scheda o la riga, cambia la chiave. Se si cambia la voce Fish
 * di un voce_id nel registro, va svuotata cache/audio-fish.
 */
export function chiaveAudioEspressiva(motore: string, voce: string, testoEspressivo: string): string {
  return chiaveAudio(`${motore}:${voce}`, testoEspressivo);
}

/**
 * Why a line of the plan is not in the cache. The key hashes the exact text sent to the voice, names respelled by the
 * lexicon included (voce/pronuncia.ts), so a changed respelling is a new key and the line is generated again; here we
 * only say why: `nuova` (never generated), `pronuncia` (an entry of the same line and voice says the words
 * differently: a lexicon change), `direzione` (same words, another expressive direction).
 */
export type MotivoDaGenerare = 'nuova' | 'pronuncia' | 'direzione';

/** Words for the comparison: no markup, lowercase; `senzaAccenti` for entries written before `mostrato` existed. */
const parole = (t: string, senzaAccenti = false): string => {
  const w = soloParole(t).toLowerCase().replace(/\s+/g, ' ').trim();
  return senzaAccenti ? w.normalize('NFD').replace(/\p{M}/gu, '') : w;
};

export class CacheAudio {
  private indice: Record<string, VoceIndice> = {};
  /** Lookup «voce + line» → words said, built on demand (motivo) and reset on every write. */
  private perRiga: Map<string, string[]> | null = null;
  private readonly fileIndice: string;
  /** Cache di drama-3 (voci diverse da Qwen: cartella a parte), se configurata. */
  readonly fish: CacheAudio | null;

  constructor(
    readonly cartella: string,
    cartellaFish?: string,
  ) {
    this.fish = cartellaFish ? new CacheAudio(cartellaFish) : null;
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
    this.perRiga = null;
    const tmpIndice = `${this.fileIndice}.tmp`;
    fs.writeFileSync(tmpIndice, JSON.stringify(this.indice, null, 1));
    fs.renameSync(tmpIndice, this.fileIndice);
  }

  /**
   * Why a line is to be generated (call it for a key the cache does not have). The same line is recognised by its
   * shown text; an entry written before `mostrato` existed by its words without accents (an accent-only respelling,
   * «Bènni» → «Benni», is a lexicon change; any other respelling of an old entry counts as `nuova`).
   */
  motivo(voce: string, mostrato: string, testoVoce: string): MotivoDaGenerare {
    if (!this.perRiga) {
      this.perRiga = new Map();
      for (const e of Object.values(this.indice)) {
        const k = e.mostrato !== undefined ? `${e.voce}\n=${parole(e.mostrato)}` : `${e.voce}\n~${parole(e.testo, true)}`;
        this.perRiga.set(k, [...(this.perRiga.get(k) ?? []), parole(e.testo)]);
      }
    }
    const dette = this.perRiga.get(`${voce}\n=${parole(mostrato)}`) ?? this.perRiga.get(`${voce}\n~${parole(testoVoce, true)}`);
    if (!dette) return 'nuova';
    return dette.includes(parole(testoVoce)) ? 'direzione' : 'pronuncia';
  }

  leggi(chiave: string): { pcm: Buffer; sampleRate: number } | null {
    if (!this.ha(chiave)) return null;
    return { pcm: fs.readFileSync(this.percorso(chiave)), sampleRate: this.indice[chiave]?.sample_rate ?? 24_000 };
  }
}
