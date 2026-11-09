/**
 * Registro delle voci (assets/voci/voci.yaml) visto dal server: per ogni voce_id il `reference_id`
 * della voce pubblica Fish Audio che drama-3 usa (`fish`). I campi di Qwen (file, testo_rif) li legge
 * il servizio Python; qui servono solo id e fish.
 */
import fs from 'node:fs';
import { parse } from 'yaml';

export interface VoceRegistro {
  id: string;
  /** reference_id della voce pubblica Fish (32 cifre esadecimali). */
  fish: string | null;
  descrizione: string;
}

const RE_FISH = /^[0-9a-f]{32}$/;

/** Legge il registro; voci senza `fish` valido restano senza (il motore fish le rifiuta con 404). */
export function caricaRegistroVoci(percorso: string): Map<string, VoceRegistro> {
  const dati = parse(fs.readFileSync(percorso, 'utf8')) as { voci?: unknown };
  const voci = new Map<string, VoceRegistro>();
  if (!Array.isArray(dati?.voci)) throw new Error(`${percorso}: serve una chiave «voci» con un elenco`);
  for (const r of dati.voci as Array<Record<string, unknown>>) {
    const id = typeof r?.['id'] === 'string' ? r['id'].trim() : '';
    if (!id) continue;
    const fish = typeof r['fish'] === 'string' && RE_FISH.test(r['fish'].trim()) ? r['fish'].trim() : null;
    voci.set(id, { id, fish, descrizione: typeof r['descrizione'] === 'string' ? r['descrizione'] : '' });
  }
  return voci;
}
