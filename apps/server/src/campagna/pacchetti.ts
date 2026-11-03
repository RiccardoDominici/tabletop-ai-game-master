/**
 * Pacchetti di sessione (docs/strati.md, «File»): una campagna a più sessioni ha
 * `sessioni/<nn>/` con sessione.yaml, scene/, png/ (solo di quella sessione), repertorio/,
 * immagini/ e audio/ (solo il nuovo). Il Motore gioca il livello di campagna (stile, campagna.yaml,
 * png/ ricorrenti, pg.yaml, risorse che durano) PIÙ il pacchetto corrente. Una campagna senza
 * sessioni/ è una one-shot e si carica come sempre.
 *
 * sessione.yaml porta la parte «di sessione» che in una one-shot sta in campagna.yaml:
 *   riassunto_iniziale   letto all'apertura, prima della prima scena;
 *   scene: [id, ...]     ordine delle scene (la prima apre la sessione);
 *   pieni_all_inizio     {orologio della campagna: segni già pieni} all'inizio di questa sessione;
 *   orologi, canone, rivelazioni, nodi, colli_di_bottiglia(_nota), ...: si UNISCONO a campagna.yaml
 *   (liste accodate; un id ripetuto è un errore);
 *   titolo, preparazione: non vanno al narratore.
 *
 * Altre regole (docs/strati.md, «Regole di unione»): png/ del pacchetto con l'id di un PNG ricorrente
 * sostituisce la scheda intera; repertorio/parole_segrete.yaml del pacchetto sostituisce quello della
 * campagna; le battute vengono solo dal pacchetto; immagini e audio dai due livelli, il pacchetto
 * vince a parità di id.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { DatiYaml } from './tipi';

export const CARTELLA_SESSIONI = 'sessioni';
export const FILE_SESSIONE = 'sessione.yaml';

/** Chiavi di sessione.yaml che il compilatore usa ma che il narratore non vede. */
const CHIAVI_NON_AL_NARRATORE = new Set(['riassunto_iniziale', 'scene', 'titolo', 'numero', 'id', 'preparazione', 'pieni_all_inizio']);

export interface Pacchetto {
  /** Numero della sessione (dal nome della cartella: «02» → 2). */
  numero: number;
  /** Nome della cartella così com'è («02»). */
  etichetta: string;
  cartella: string;
}

export class ErrorePacchetto extends Error {
  override name = 'ErrorePacchetto';
}

/**
 * I pacchetti della campagna, in ordine di numero. Vuoto = one-shot. Conta solo una cartella con un
 * nome di sole cifre e un sessione.yaml dentro; due cartelle con lo stesso numero sono un errore.
 */
export function elencoPacchetti(cartellaCampagna: string): Pacchetto[] {
  const radice = path.join(cartellaCampagna, CARTELLA_SESSIONI);
  if (!fs.existsSync(radice)) return [];
  const out: Pacchetto[] = [];
  for (const nome of fs.readdirSync(radice).sort()) {
    if (!/^\d+$/.test(nome)) continue;
    const cartella = path.join(radice, nome);
    if (!fs.statSync(cartella).isDirectory() || !fs.existsSync(path.join(cartella, FILE_SESSIONE))) continue;
    const numero = Number(nome);
    const doppio = out.find((p) => p.numero === numero);
    if (doppio) throw new ErrorePacchetto(`${CARTELLA_SESSIONI}/${doppio.etichetta} e ${CARTELLA_SESSIONI}/${nome}: stesso numero di sessione`);
    out.push({ numero, etichetta: nome, cartella });
  }
  return out.sort((a, b) => a.numero - b.numero);
}

/** Il pacchetto dopo `numero` (il primo con numero maggiore), o null. */
export function pacchettoDopo(pacchetti: readonly Pacchetto[], numero: number): Pacchetto | null {
  return pacchetti.find((p) => p.numero > numero) ?? null;
}

const idDi = (x: unknown): string | null => (x && typeof x === 'object' && typeof (x as DatiYaml)['id'] === 'string' ? ((x as DatiYaml)['id'] as string) : null);

/**
 * campagna.yaml (livello di campagna) + sessione.yaml (il pacchetto) → ciò che vede il narratore.
 * Liste accodate (id ripetuto → errore); per le altre chiavi vale la sessione, con un avviso.
 * `pieni_all_inizio` della sessione sostituisce quello degli orologi della campagna.
 */
export function unisciSessione(campagna: DatiYaml, sessione: DatiYaml, dove: string, avvisa: (msg: string) => void): DatiYaml {
  const out: DatiYaml = { ...campagna };
  for (const [chiave, valore] of Object.entries(sessione)) {
    if (CHIAVI_NON_AL_NARRATORE.has(chiave)) continue;
    const prima = out[chiave];
    if (prima === undefined) {
      out[chiave] = valore;
    } else if (Array.isArray(prima) && Array.isArray(valore)) {
      const visti = new Set(prima.map(idDi).filter((x): x is string => x !== null));
      for (const v of valore) {
        const id = idDi(v);
        if (id && visti.has(id)) throw new ErrorePacchetto(`${dove}: ${chiave} ripete l'id «${id}» già definito in campagna.yaml`);
      }
      out[chiave] = [...prima, ...valore];
    } else {
      avvisa(`${dove}: «${chiave}» c'è anche in campagna.yaml; vale quello della sessione`);
      out[chiave] = valore;
    }
  }
  // Il punto di partenza degli orologi della campagna in questa sessione (dopo «il mondo si muove»).
  const pieni = sessione['pieni_all_inizio'];
  if (pieni !== undefined && pieni !== null) {
    if (typeof pieni !== 'object' || Array.isArray(pieni)) throw new ErrorePacchetto(`${dove}: pieni_all_inizio dev'essere {id_orologio: numero}`);
    const orologi = Array.isArray(out['orologi']) ? (out['orologi'] as DatiYaml[]) : [];
    for (const [id, n] of Object.entries(pieni as DatiYaml)) {
      const i = orologi.findIndex((o) => idDi(o) === id);
      if (i < 0) throw new ErrorePacchetto(`${dove}: pieni_all_inizio cita l'orologio «${id}», che non esiste`);
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) throw new ErrorePacchetto(`${dove}: pieni_all_inizio.${id} dev'essere un intero ≥ 0`);
      orologi[i] = { ...orologi[i], pieni_all_inizio: n };
    }
    out['orologi'] = orologi;
  }
  return out;
}

/** Ordine delle scene del pacchetto: quello di sessione.yaml `scene`, poi quelle non elencate (con avviso). */
export function ordinaScene<T extends { id: string }>(scene: T[], ordine: unknown, dove: string, avvisa: (msg: string) => void): T[] {
  if (ordine === undefined || ordine === null) return scene;
  if (!Array.isArray(ordine) || !ordine.every((x) => typeof x === 'string')) throw new ErrorePacchetto(`${dove}: scene dev'essere una lista di id di scena`);
  const out: T[] = [];
  for (const id of ordine as string[]) {
    const s = scene.find((x) => x.id === id);
    if (!s) throw new ErrorePacchetto(`${dove}: scene cita «${id}», che non ha un file in scene/`);
    if (out.includes(s)) throw new ErrorePacchetto(`${dove}: scene ripete «${id}»`);
    out.push(s);
  }
  for (const s of scene) {
    if (out.includes(s)) continue;
    avvisa(`${dove}: la scena «${s.id}» non è nell'elenco scene: va in fondo`);
    out.push(s);
  }
  return out;
}
