/**
 * Immagini della campagna per il proiettore: campagne/<id>/immagini/ + manifest.json, prodotti
 * dallo strumento strumenti/immagini/genera.py ({immagini: [{id, file, tipo, prompt, seme, …}]}).
 *
 * Id usati qui: `luogo_<id scena o nodo>` per i luoghi, `ritratto_<id_png>` per i ritratti.
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
  tipo: string;
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

  private url(id: string): string | null {
    const v = this.perId.get(id);
    return v ? `${PREFISSO_URL}${encodeURIComponent(v.file)}` : null;
  }

  luogo(idLuogo: string): string | null {
    return this.url(`luogo_${idLuogo}`);
  }

  ritratto(idPng: string): string | null {
    return this.url(`ritratto_${idPng}`);
  }

  /** Percorso su disco di un file servibile (solo quelli del manifest), o null. */
  percorso(nomeFile: string): string | null {
    if (!NOME_VALIDO.test(nomeFile)) return null;
    for (const v of this.perId.values()) if (v.file === nomeFile) return path.join(this.cartella, v.file);
    return null;
  }
}
