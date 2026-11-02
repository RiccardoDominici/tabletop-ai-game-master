/**
 * Audio della campagna per il proiettore: campagne/<id>/audio/ + manifest.json, prodotti dalla
 * pipeline audio (docs/audio.md, «Manifest»). Specchio di CatalogoImmagini.
 *
 * Sezioni del manifest e id usati qui:
 * - `brani`    musica di luogo, `luogo_<id scena o nodo>`, in loop;
 * - `umori`    musica d'umore, `umore_<tag>` (tensione, mistero, battaglia…), in loop;
 * - `temi`     motivo breve di un PNG, `tema_<id_png>`, una volta sola;
 * - `ambienti` strati in loop di un luogo, `amb_<luogo>_<tag>` (o campo `luogo` esplicito);
 * - `effetti`  colpi singoli, `sfx_<tag>`;
 * - `crediti`  righe d'attribuzione (CC BY), mostrate nella pagina dei crediti.
 *
 * Una voce conta solo se il suo file esiste e ha un nome semplice (niente percorsi): se manca,
 * il proiettore resta in silenzio su quello strato, senza errori. I file si servono da
 * /api/audio/<file>; il catalogo pubblico (GET /api/audio) dà al proiettore url, loop e guadagni.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CatalogoAudioPubblico, TipoTracciaAudio, TracciaAudio } from '@cantastorie/shared';
import type { Logger } from '../logger';

export const PREFISSO_URL_AUDIO = '/api/audio/';

/** Solo nomi semplici con un'estensione audio che Chrome sa decodificare. */
const NOME_VALIDO = /^[a-z0-9][a-z0-9_.-]*\.(ogg|opus|mp3|m4a|wav|flac|webm)$/i;
/** Id delle voci: minuscole, cifre e trattini bassi (finiscono nello stato e nei log). */
const ID_VALIDO = /^[a-z0-9][a-z0-9_]{0,95}$/;

/** Sonorità di riferimento della pipeline (loudnorm a due passate, docs/audio.md). */
export const LUFS_RIFERIMENTO = -23;
/** Correzione massima ricavata dai LUFS dichiarati (±12 dB): un valore assurdo non assorda. */
const CORREZIONE_MAX_DB = 12;

/** Sezione del manifest → tipo della traccia, e se per natura suona in loop. */
const SEZIONI: ReadonlyArray<readonly [string, TipoTracciaAudio, boolean]> = [
  ['brani', 'musica', true],
  ['umori', 'umore', true],
  ['temi', 'tema', false],
  ['ambienti', 'ambiente', true],
  ['effetti', 'effetto', false],
];

/** Mime per estensione (per la rotta /api/audio/:file). */
const MIME: Record<string, string> = {
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  flac: 'audio/flac',
  webm: 'audio/webm',
};

/** Voce del manifest così com'è scritta (campi facoltativi tollerati, gli sconosciuti ignorati). */
interface VoceManifest {
  id?: unknown;
  file?: unknown;
  loop?: unknown;
  volume?: unknown;
  lufs?: unknown;
  durata_s?: unknown;
  loop_inizio_s?: unknown;
  loop_fine_s?: unknown;
  giunta_s?: unknown;
  luogo?: unknown;
  tag?: unknown;
}

/** Traccia valida in memoria: quella pubblica più il nome del file e il luogo (ambienti). */
interface VoceAudio {
  traccia: TracciaAudio;
  file: string;
  /** Solo per gli ambienti con il campo `luogo` esplicito. */
  luogo: string | null;
}

function numeroOppure(v: unknown, predefinito: number | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : predefinito;
}

/**
 * Guadagno lineare della traccia: `volume` del manifest (0–2, predefinito 1) per la correzione
 * verso LUFS_RIFERIMENTO se la voce dichiara i suoi LUFS (la pipeline normalizza già: di solito 0 dB).
 */
export function guadagnoTraccia(volume: unknown, lufs: unknown): number {
  const v = Math.min(2, Math.max(0, numeroOppure(volume, 1) ?? 1));
  const l = numeroOppure(lufs, null);
  if (l === null) return v;
  const db = Math.min(CORREZIONE_MAX_DB, Math.max(-CORREZIONE_MAX_DB, LUFS_RIFERIMENTO - l));
  return Number((v * 10 ** (db / 20)).toFixed(4));
}

export class CatalogoAudio {
  private readonly perId = new Map<string, VoceAudio>();
  private readonly righeCrediti: string[] = [];

  constructor(
    readonly cartella: string,
    log?: Logger,
  ) {
    const manifest = path.join(cartella, 'manifest.json');
    if (!fs.existsSync(manifest)) {
      log?.info({ cartella }, 'audio: nessun manifest, il proiettore suonerà solo la voce');
      return;
    }
    let dati: Record<string, unknown> = {};
    try {
      const letto: unknown = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (letto && typeof letto === 'object') dati = letto as Record<string, unknown>;
    } catch (err) {
      log?.error({ manifest, err: (err as Error).message }, 'audio: manifest illeggibile');
      return;
    }
    const scartate: Array<{ id: unknown; motivo: string }> = [];
    for (const [sezione, tipo, loopPredefinito] of SEZIONI) {
      const voci = Array.isArray(dati[sezione]) ? (dati[sezione] as VoceManifest[]) : [];
      for (const v of voci) {
        const motivo = this.aggiungi(v, tipo, loopPredefinito);
        if (motivo) scartate.push({ id: v?.id, motivo });
      }
    }
    if (Array.isArray(dati['crediti'])) {
      for (const r of dati['crediti'] as unknown[]) if (typeof r === 'string' && r.trim()) this.righeCrediti.push(r.trim());
    }
    const perTipo: Record<string, number> = {};
    for (const v of this.perId.values()) perTipo[v.traccia.tipo] = (perTipo[v.traccia.tipo] ?? 0) + 1;
    log?.info({ cartella, tracce: this.perId.size, perTipo, crediti: this.righeCrediti.length, scartate }, 'audio: manifest caricato');
  }

  /** Aggiunge una voce valida; restituisce il motivo dello scarto, o null. */
  private aggiungi(v: VoceManifest, tipo: TipoTracciaAudio, loopPredefinito: boolean): string | null {
    if (!v || typeof v !== 'object') return 'voce non valida';
    if (typeof v.id !== 'string' || !ID_VALIDO.test(v.id)) return 'id non valido';
    if (typeof v.file !== 'string' || !NOME_VALIDO.test(v.file)) return 'nome di file non valido';
    if (!fs.existsSync(path.join(this.cartella, v.file))) return 'file mancante';
    if (this.perId.has(v.id)) return 'id doppio';
    const loopInizio = numeroOppure(v.loop_inizio_s, null);
    const loopFine = numeroOppure(v.loop_fine_s, null);
    // Punti di loop incoerenti: si usa il file intero (meglio una giunta che un loop rotto).
    const puntiValidi = loopInizio !== null && loopFine !== null && loopInizio >= 0 && loopFine > loopInizio;
    this.perId.set(v.id, {
      file: v.file,
      luogo: typeof v.luogo === 'string' && ID_VALIDO.test(v.luogo) ? v.luogo : null,
      traccia: {
        id: v.id,
        tipo,
        url: `${PREFISSO_URL_AUDIO}${encodeURIComponent(v.file)}`,
        loop: typeof v.loop === 'boolean' ? v.loop : loopPredefinito,
        guadagno: guadagnoTraccia(v.volume, v.lufs),
        durata_s: numeroOppure(v.durata_s, null),
        loop_inizio_s: puntiValidi ? loopInizio : null,
        loop_fine_s: puntiValidi ? loopFine : null,
        giunta_s: Math.min(10, Math.max(0, numeroOppure(v.giunta_s, 0) ?? 0)),
      },
    });
    return null;
  }

  get numero(): number {
    return this.perId.size;
  }

  get crediti(): readonly string[] {
    return this.righeCrediti;
  }

  /** La traccia `id` se esiste ed è del tipo atteso. */
  private di(id: string, tipo: TipoTracciaAudio): string | null {
    return this.perId.get(id)?.traccia.tipo === tipo ? id : null;
  }

  /** Musica del luogo (`luogo_<id>`), o null. */
  musicaLuogo(idLuogo: string): string | null {
    return this.di(`luogo_${idLuogo}`, 'musica');
  }

  /** Musica d'umore (`umore_<tag>`), o null. */
  umore(tag: string): string | null {
    return this.di(`umore_${tag}`, 'umore');
  }

  /** Tema del PNG (`tema_<id_png>`), o null. */
  tema(idPng: string): string | null {
    return this.di(`tema_${idPng}`, 'tema');
  }

  /** Tutti i brani d'umore: tag → id. */
  umori(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const v of this.perId.values()) if (v.traccia.tipo === 'umore' && v.traccia.id.startsWith('umore_')) out[v.traccia.id.slice('umore_'.length)] = v.traccia.id;
    return out;
  }

  /**
   * Strati d'ambiente di un luogo. Vale il campo `luogo` della voce, se c'è; altrimenti l'id
   * `amb_<luogo>_<tag>`, col luogo noto più lungo che combacia (`n_piazza` contro `n_piazza_alta`).
   * `luoghiNoti`: gli id di scene e nodi della campagna.
   */
  ambienti(idLuogo: string, luoghiNoti: readonly string[]): string[] {
    const noti = [...new Set([...luoghiNoti, idLuogo])].sort((a, b) => b.length - a.length);
    const out: string[] = [];
    for (const v of this.perId.values()) {
      if (v.traccia.tipo !== 'ambiente') continue;
      if (v.luogo !== null) {
        if (v.luogo === idLuogo) out.push(v.traccia.id);
        continue;
      }
      const resto = v.traccia.id.startsWith('amb_') ? v.traccia.id.slice(4) : null;
      if (resto && noti.find((l) => resto.startsWith(`${l}_`)) === idLuogo) out.push(v.traccia.id);
    }
    return out.sort();
  }

  /** Catalogo pubblico per il proiettore (GET /api/audio). */
  pubblico(): CatalogoAudioPubblico {
    const tracce: Record<string, TracciaAudio> = {};
    for (const v of this.perId.values()) tracce[v.traccia.id] = v.traccia;
    return { tracce, crediti: [...this.righeCrediti] };
  }

  /** Percorso su disco di un file servibile (solo quelli del manifest), o null. */
  percorso(nomeFile: string): string | null {
    if (!NOME_VALIDO.test(nomeFile)) return null;
    for (const v of this.perId.values()) if (v.file === nomeFile) return path.join(this.cartella, v.file);
    return null;
  }

  /** Mime del file per la risposta HTTP. */
  static mime(nomeFile: string): string {
    const est = nomeFile.split('.').pop()?.toLowerCase() ?? '';
    return MIME[est] ?? 'application/octet-stream';
  }
}
