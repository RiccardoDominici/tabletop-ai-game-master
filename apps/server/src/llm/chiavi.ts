/**
 * Ricerca delle chiavi API (Anthropic, OpenRouter, …) in un ordine fisso, uguale in tutto il repo:
 *
 *   1. variabile d'ambiente (es. ANTHROPIC_API_KEY, OPENROUTER_API_KEY);
 *   2. file `.env` nella radice del repository (è fuori da git, vedi .gitignore; modello in .env.example);
 *   3. file «precedente» indicato da configurazione, ultimo ripiego: un file di un altro progetto
 *      (per Riccardo, sul suo Mac, il file godExperiment/agora). Se il file non esiste, si salta.
 *
 * Regole di sicurezza (vincolanti):
 * - dal file si legge SOLO la riga che comincia con `NOME=`; le altre righe non vengono interpretate,
 *   copiate, conservate né scritte nei log;
 * - la riga deve essere una sola: due o più → errore (senza mostrare contenuti);
 * - una riga vuota vale come «non impostata» e si passa al passo successivo;
 * - il valore non si stampa mai: i log dicono solo l'origine (`ambiente`, `env-radice`, `file-precedente`)
 *   e la lunghezza, mai i caratteri;
 * - i file non vengono mai modificati né fatti `source`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Radice del repository: apps/server/src/llm → quattro livelli su. */
export const RADICE_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
/** Il file .env che l'utente crea alla radice (copiando .env.example). */
export const FILE_ENV_RADICE = path.join(RADICE_REPO, '.env');

export type OrigineChiave = 'ambiente' | 'env-radice' | 'file-precedente';

export interface ChiaveTrovata {
  valore: string;
  origine: OrigineChiave;
}

export interface SorgentiChiave {
  /** Ambiente da cui leggere la variabile (predefinito: process.env). */
  ambiente?: Record<string, string | undefined>;
  /** File .env alla radice (predefinito: <repo>/.env). */
  fileEnvRadice?: string;
  /** Ultimo ripiego: file con la riga `NOME=…` di un altro progetto. Assente o inesistente → si salta. */
  filePrecedente?: string;
}

export class ErroreChiave extends Error {
  override name = 'ErroreChiave';
}

/**
 * Restituisce la chiave `nome` dal primo passo che la contiene. Lancia `ErroreChiave` se nessun passo
 * la trova; il messaggio nomina i passi controllati, mai i valori.
 */
export function cercaChiave(nome: string, sorgenti: SorgentiChiave = {}): ChiaveTrovata {
  const ambiente = sorgenti.ambiente ?? process.env;
  const daAmbiente = pulisci(ambiente[nome]);
  if (daAmbiente) return { valore: daAmbiente, origine: 'ambiente' };

  const daRadice = leggiRigaOpzionale(sorgenti.fileEnvRadice ?? FILE_ENV_RADICE, `${nome}=`);
  if (daRadice) return { valore: daRadice, origine: 'env-radice' };

  if (sorgenti.filePrecedente) {
    const daPrecedente = leggiRigaOpzionale(sorgenti.filePrecedente, `${nome}=`);
    if (daPrecedente) return { valore: daPrecedente, origine: 'file-precedente' };
  }

  const passi = [
    `la variabile d'ambiente ${nome}`,
    `una riga ${nome}= nel file .env alla radice del repo (vedi .env.example)`,
  ];
  if (sorgenti.filePrecedente) passi.push('il file di ripiego configurato');
  throw new ErroreChiave(`${nome} non trovata. Controllato: ${passi.join('; ')}.`);
}

/**
 * Legge da un file la sola riga `PREFISSO…` e ne restituisce il valore. Il file deve esistere e avere
 * una sola riga col prefisso (vuota = errore). Usato per i file espliciti, come prima.
 */
export function leggiRigaChiave(percorsoFile: string, PREFISSO: string): string {
  let contenuto: string;
  try {
    contenuto = fs.readFileSync(percorsoFile, 'utf8');
  } catch (err) {
    const codice = (err as NodeJS.ErrnoException).code ?? 'sconosciuto';
    throw new ErroreChiave(`file della chiave non leggibile (${codice}): ${percorsoFile}`);
  }
  const { valore, quante } = estraiRiga(contenuto, PREFISSO);
  contenuto = '';
  if (quante === 0) throw new ErroreChiave(`nessuna riga ${PREFISSO}… nel file della chiave`);
  if (quante > 1) throw new ErroreChiave(`più di una riga ${PREFISSO}… nel file della chiave (${quante})`);
  if (!valore) throw new ErroreChiave(`la riga ${PREFISSO}… è vuota`);
  return valore;
}

/** Chiave Anthropic da un file con una sola riga `ANTHROPIC_API_KEY=…`. */
export function leggiChiaveAnthropic(percorsoFile: string): string {
  return leggiRigaChiave(percorsoFile, 'ANTHROPIC_API_KEY=');
}

/** Descrizione sicura della chiave per i log: solo lunghezza e presenza, mai caratteri. */
export function descriviChiave(chiave: string | undefined): string {
  return chiave ? `presente (${chiave.length} caratteri)` : 'assente';
}

/** Come `leggiRigaChiave`, ma un file mancante o senza la riga (o con la riga vuota) dà `undefined`. */
function leggiRigaOpzionale(percorsoFile: string, PREFISSO: string): string | undefined {
  if (!fs.existsSync(percorsoFile)) return undefined;
  const contenuto = fs.readFileSync(percorsoFile, 'utf8');
  const { valore, quante } = estraiRiga(contenuto, PREFISSO);
  if (quante > 1) throw new ErroreChiave(`più di una riga ${PREFISSO}… nel file ${percorsoFile} (${quante})`);
  return valore || undefined;
}

/** Cerca la riga col prefisso: conta le occorrenze e restituisce il valore pulito dell'ultima. */
function estraiRiga(contenuto: string, PREFISSO: string): { valore: string; quante: number } {
  let valore = '';
  let quante = 0;
  for (const riga of contenuto.split(/\r?\n/)) {
    if (!riga.startsWith(PREFISSO)) continue;
    quante += 1;
    valore = pulisci(riga.slice(PREFISSO.length)) ?? '';
  }
  return { valore, quante };
}

/** Toglie spazi e virgolette che racchiudono il valore (come farebbe una shell); vuoto → undefined. */
function pulisci(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  let t = v.trim();
  if (t.length >= 2 && (t[0] === '"' || t[0] === "'") && t[t.length - 1] === t[0]) t = t.slice(1, -1).trim();
  return t || undefined;
}
