/**
 * Registro delle voci (assets/voci/voci.yaml) visto dal server: per ogni voce_id il `reference_id`
 * della voce pubblica Fish Audio che drama-3 usa, nella lingua dei contenuti (docs/lingue.md).
 * I campi di Qwen (file, testo_rif) li legge il servizio Python; qui servono solo id e fish.
 *
 * Forme accettate per `fish`:
 *   fish: <id>                 vecchia forma, solo italiano (resta valida)
 *   fish: {it: <id>, en: <id>} una voce per lingua
 * La lingua è quella dei contenuti (`linguaAttiva()`, impostata da `preparaCampagna` prima del registro).
 * Se la voce non ha un id per quella lingua, si ripiega sull'italiano e si avvisa: meglio una voce
 * italiana in una campagna inglese che il silenzio (la riserva Qwen resta a valle, come sempre).
 */
import fs from 'node:fs';
import { parse } from 'yaml';
import { LINGUA_RIFERIMENTO, LINGUE, linguaAttiva, type Lingua } from '../lingua';

export interface VoceRegistro {
  id: string;
  /** reference_id Fish della lingua scelta (32 cifre esadecimali); null se manca anche quello italiano. */
  fish: string | null;
  /** Lingua a cui appartiene `fish`: può essere l'italiano di ripiego. */
  fishLingua?: Lingua | null;
  /** Tutti gli id Fish letti dal file, per lingua. */
  fishPerLingua?: Partial<Record<Lingua, string>>;
  descrizione: string;
}

export interface OpzioniRegistro {
  /** Lingua dei contenuti da usare (predefinita: quella attiva del processo). */
  lingua?: Lingua;
  /** Dove finiscono gli avvisi (predefinito: console.warn). */
  avviso?: (messaggio: string) => void;
}

const RE_FISH = /^[0-9a-f]{32}$/;

/** `fish` come nel file: stringa (solo italiano) o mappa per lingua. Ignora gli id che non sono reference_id. */
export function leggiFishPerLingua(valore: unknown): Partial<Record<Lingua, string>> {
  const esito: Partial<Record<Lingua, string>> = {};
  if (typeof valore === 'string') {
    if (RE_FISH.test(valore.trim())) esito[LINGUA_RIFERIMENTO] = valore.trim();
    return esito;
  }
  if (!valore || typeof valore !== 'object' || Array.isArray(valore)) return esito;
  for (const lingua of LINGUE) {
    const id = (valore as Record<string, unknown>)[lingua];
    if (typeof id === 'string' && RE_FISH.test(id.trim())) esito[lingua] = id.trim();
  }
  return esito;
}

/** Legge il registro e sceglie, per ogni voce, il reference_id della lingua richiesta. */
export function caricaRegistroVoci(percorso: string, opzioni: OpzioniRegistro = {}): Map<string, VoceRegistro> {
  const lingua = opzioni.lingua ?? linguaAttiva();
  const avviso = opzioni.avviso ?? ((m: string) => console.warn(m));
  const dati = parse(fs.readFileSync(percorso, 'utf8')) as { voci?: unknown };
  const voci = new Map<string, VoceRegistro>();
  if (!Array.isArray(dati?.voci)) throw new Error(`${percorso}: serve una chiave «voci» con un elenco`);
  for (const r of dati.voci as Array<Record<string, unknown>>) {
    const id = typeof r?.['id'] === 'string' ? r['id'].trim() : '';
    if (!id) continue;
    const perLingua = leggiFishPerLingua(r['fish']);
    let fish: string | null = perLingua[lingua] ?? null;
    let fishLingua: Lingua | null = fish ? lingua : null;
    if (!fish && lingua !== LINGUA_RIFERIMENTO && perLingua[LINGUA_RIFERIMENTO]) {
      fish = perLingua[LINGUA_RIFERIMENTO]!;
      fishLingua = LINGUA_RIFERIMENTO;
      avviso(`voce «${id}»: nessun reference_id Fish in «${lingua}», uso quello italiano`);
    } else if (!fish) {
      avviso(`voce «${id}»: nessun reference_id Fish utilizzabile (lingua ${lingua})`);
    }
    voci.set(id, {
      id,
      fish,
      fishLingua,
      fishPerLingua: perLingua,
      descrizione: typeof r['descrizione'] === 'string' ? r['descrizione'] : '',
    });
  }
  return voci;
}
