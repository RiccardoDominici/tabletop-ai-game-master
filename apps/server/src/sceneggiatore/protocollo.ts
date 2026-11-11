/**
 * Il protocollo fra il server e lo sceneggiatore (docs/sceneggiatore.md): file JSON in una cartella
 * sorvegliata, `<cartella dei log>/sceneggiatore/`. Il server scrive una richiesta in `richieste/`, lo
 * sceneggiatore (scripts/sceneggiatore.sh, un processo a parte con Claude Code in modalità `-p`) scrive
 * la risposta in `risposte/` con lo stesso id, e tiene `vivo.json` aggiornato finché gira. Niente rete:
 * due processi della stessa macchina, e il server non aspetta mai una risposta per andare avanti.
 */
import fs from 'node:fs';
import path from 'node:path';

export const CARTELLA_SCENEGGIATORE = 'sceneggiatore';
export const FILE_VIVO = 'vivo.json';
export const FILE_REGISTRO_SCENEGGIATORE = 'sceneggiatore.jsonl';
/** Oltre questo silenzio lo sceneggiatore non c'è più: il server smette di chiedere. */
export const VIVO_ENTRO_MS = 20_000;

/** `chiusura`: «Chiudi la sessione» senza una battuta di chiusura che valga adesso; il tavolo aspetta. */
export type TipoRichiesta = 'prossime' | 'subito' | 'chiusura';

/** Ciò che lo sceneggiatore riceve: la scena così com'è al tavolo, e che cosa scrivere. */
export interface RichiestaSceneggiatore {
  id: string;
  tipo: TipoRichiesta;
  /** ISO 8601. */
  creata: string;
  turno: number;
  /** Cartella della campagna (lo sceneggiatore legge da lì schede, canone e repertorio). */
  campagna: string;
  scena: { id: string; titolo: string; png_presenti: string[] };
  /** `subito`: l'azione rimasta senza battuta («nessuna»), a cui scrivere la risposta; `privata`: la sente solo quel PG. */
  azione?: { id_pg: string; nome: string; testo: string; privata?: boolean };
  /** Le ultime righe che il tavolo ha sentito («Nome: testo»). */
  trascrizione: string[];
  stato: { indizi_rivelati: string[]; fatti_noti: string[]; battute_usate: string[]; orologi: Record<string, string> };
  /** Prefisso degli id da usare (unici nella partita). */
  prefisso: string;
  /**
   * Da non ripetere (sceneggiatore/ripetizioni.ts): attacchi e immagini degli ultimi turni, e i tic dei PNG
   * usciti nelle loro ultime righe (id → tic).
   */
  gia_usati?: { attacchi: string[]; immagini: string[]; tic: Record<string, string[]> };
  /**
   * Parole con la maiuscola sentite al tavolo che il lessico di pronuncia non conosce (voce/lessico-vivo.ts):
   * per quelle che sono nomi propri lo sceneggiatore risponde anche con `pronunce:` (docs/pronuncia.md).
   */
  nomi_senza_pronuncia?: string[];
  /** Quante battute scrivere. */
  quante: number;
}

export interface RispostaSceneggiatore {
  id: string;
  esito: 'ok' | 'errore' | 'saltata';
  /** Millisecondi della chiamata a Claude Code. */
  ms: number;
  /** Le battute, nel formato del repertorio (`battute: [...]`), come testo YAML. */
  yaml?: string;
  errore?: string;
}

export function cartelle(radice: string): { radice: string; richieste: string; risposte: string; vivo: string; registro: string } {
  return {
    radice,
    richieste: path.join(radice, 'richieste'),
    risposte: path.join(radice, 'risposte'),
    vivo: path.join(radice, FILE_VIVO),
    registro: path.join(radice, FILE_REGISTRO_SCENEGGIATORE),
  };
}

/** Scrittura atomica (file temporaneo e rename): l'altro processo non legge mai un file a metà. */
export function scriviJson(file: string, dati: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(dati, null, 2));
  fs.renameSync(tmp, file);
}

export function leggiJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

/** Lo sceneggiatore gira (ha scritto `vivo.json` da poco)? */
export function sceneggiatoreVivo(radice: string, adesso: number): boolean {
  const v = leggiJson<{ ts: number }>(cartelle(radice).vivo);
  return !!v && typeof v.ts === 'number' && adesso - v.ts < VIVO_ENTRO_MS;
}
