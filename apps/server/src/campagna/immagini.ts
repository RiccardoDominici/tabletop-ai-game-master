/**
 * Immagini della campagna per il proiettore: campagne/<id>/immagini/ + manifest.json, prodotti
 * dallo strumento strumenti/immagini/genera.py ({immagini: [{id, file, tipo, prompt, seme, …}]}).
 *
 * Id usati qui: `luogo_<id scena o nodo>` per i luoghi, `ritratto_<id_png>` per i ritratti,
 * `situazione_<id_png>_<id situazione>` (tipo `situazione`) per lo stesso PNG in un'altra
 * situazione: quelle portano i tratti nascosti (la cicatrice sotto il cappuccio) e NON sono mai un
 * ritratto né un luogo: escono solo a comando del master o dopo la rivelazione giusta.
 * Una voce del manifest conta solo se il suo file esiste: se manca, lo schermo usa lo sfondo
 * d'atmosfera (nessun errore). I file si servono da /api/immagini/<file>.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Logger } from '../logger';

export const PREFISSO_URL = '/api/immagini/';
/** Solo nomi semplici: niente percorsi, niente sorprese. */
const NOME_VALIDO = /^[a-z0-9][a-z0-9_.-]*\.(jpe?g|png|webp)$/i;

export interface VoceImmagine {
  id: string;
  file: string;
  tipo?: string;
  /** Situazioni: il PNG e gli id dopo cui mostrarla (li scrive strumenti/immagini dalla scheda). */
  png?: string;
  dopo?: string[];
}

/** Un'immagine di situazione del manifest, col PNG ricavato dall'id. */
export interface VoceSituazione {
  /** Id del manifest (situazione_png_sebastiano_senza_cappuccio). */
  id: string;
  /** PNG ritratto (null se l'id non comincia con un PNG noto). */
  png: string | null;
  /** Parte dopo il PNG (senza_cappuccio, in_n_piazza). */
  situazione: string;
  url: string;
  /** `dopo` scritto nel manifest (dalla scheda del PNG), se c'è. */
  dopo?: string[];
}

const PREFISSO_SITUAZIONE = 'situazione_';

/** È un'immagine di situazione (per tipo o per prefisso dell'id)? */
function èSituazione(v: VoceImmagine): boolean {
  return v.tipo === 'situazione' || v.id.startsWith(PREFISSO_SITUAZIONE);
}

export class CatalogoImmagini {
  private readonly perId = new Map<string, VoceImmagine>();

  constructor(
    readonly cartella: string,
    log?: Logger,
  ) {
    const manifest = path.join(cartella, 'manifest.json');
    if (!fs.existsSync(manifest)) {
      log?.info({ cartella }, 'immagini: nessun manifest, lo schermo userà lo sfondo d’atmosfera');
      return;
    }
    let voci: VoceImmagine[] = [];
    try {
      voci = ((JSON.parse(fs.readFileSync(manifest, 'utf8')) as { immagini?: VoceImmagine[] }).immagini ?? []).filter(
        (v) => typeof v?.id === 'string' && typeof v.file === 'string',
      );
    } catch (err) {
      log?.error({ manifest, err: (err as Error).message }, 'immagini: manifest illeggibile');
    }
    const mancanti: string[] = [];
    for (const v of voci) {
      if (NOME_VALIDO.test(v.file) && fs.existsSync(path.join(cartella, v.file))) this.perId.set(v.id, v);
      else mancanti.push(v.id);
    }
    log?.info({ cartella, immagini: this.perId.size, mancanti }, 'immagini: manifest caricato');
  }

  get numero(): number {
    return this.perId.size;
  }

  private url(v: VoceImmagine | undefined): string | null {
    return v ? `${PREFISSO_URL}${encodeURIComponent(v.file)}` : null;
  }

  /** Immagine del luogo; mai una situazione, anche se l'id le somigliasse. */
  luogo(idLuogo: string): string | null {
    const v = this.perId.get(`luogo_${idLuogo}`);
    return v && !èSituazione(v) && (v.tipo === undefined || v.tipo === 'luogo') ? this.url(v) : null;
  }

  /** Ritratto del PNG; una situazione (che porta i tratti nascosti) non fa mai da ritratto. */
  ritratto(idPng: string): string | null {
    const v = this.perId.get(`ritratto_${idPng}`);
    return v && !èSituazione(v) && (v.tipo === undefined || v.tipo === 'ritratto') ? this.url(v) : null;
  }

  /**
   * Immagini di situazione, col PNG ricavato dall'id (`situazione_<png>_<situazione>`, il PNG più
   * lungo che combacia). `idPng`: gli id dei PNG della campagna.
   */
  situazioni(idPng: readonly string[]): VoceSituazione[] {
    const png = [...idPng].sort((a, b) => b.length - a.length);
    const out: VoceSituazione[] = [];
    for (const v of this.perId.values()) {
      if (!èSituazione(v)) continue;
      const resto = v.id.startsWith(PREFISSO_SITUAZIONE) ? v.id.slice(PREFISSO_SITUAZIONE.length) : v.id;
      // Il PNG dal manifest se c'è (strumenti/immagini lo scrive), altrimenti dall'id.
      const chi = (typeof v.png === 'string' && png.includes(v.png) ? v.png : png.find((p) => resto.startsWith(`${p}_`))) ?? null;
      const dopo = Array.isArray(v.dopo) ? v.dopo.filter((x): x is string => typeof x === 'string') : undefined;
      out.push({ id: v.id, png: chi, situazione: chi && resto.startsWith(`${chi}_`) ? resto.slice(chi.length + 1) : resto, url: this.url(v)!, ...(dopo ? { dopo } : {}) });
    }
    return out.sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Percorso su disco di un file servibile (solo quelli del manifest), o null. */
  percorso(nomeFile: string): string | null {
    if (!NOME_VALIDO.test(nomeFile)) return null;
    for (const v of this.perId.values()) if (v.file === nomeFile) return path.join(this.cartella, v.file);
    return null;
  }
}
