/**
 * Lettura della chiave Anthropic da un file .env che contiene ANCHE altri segreti.
 *
 * Regole di sicurezza (vincolanti):
 * - si legge il file riga per riga e si guarda SOLO se la riga comincia con `ANTHROPIC_API_KEY=`;
 *   le altre righe non vengono interpretate, copiate, conservate né scritte nei log;
 * - la riga deve essere una sola: zero o più di una → errore (senza mostrare contenuti);
 * - il valore non si stampa mai; gli errori dicono solo cosa manca, mai cosa c'è;
 * - il file non viene mai modificato e non viene mai fatto `source`.
 */
import fs from 'node:fs';

const PREFISSO = 'ANTHROPIC_API_KEY=';

export class ErroreChiave extends Error {
  override name = 'ErroreChiave';
}

/**
 * Restituisce il valore della chiave. Toglie spazi e virgolette che la racchiudono
 * (`"…"` o `'…'`), come farebbe una shell, e nient'altro.
 */
export function leggiChiaveAnthropic(percorsoFile: string): string {
  return leggiRigaChiave(percorsoFile, PREFISSO);
}

/**
 * Stesse regole per un'altra chiave dello stesso tipo di file (es. `OPENROUTER_API_KEY=` per la voce
 * drama-3): solo la riga col prefisso, una sola, mai stampata.
 */
export function leggiRigaChiave(percorsoFile: string, PREFISSO: string): string {
  let contenuto: string;
  try {
    contenuto = fs.readFileSync(percorsoFile, 'utf8');
  } catch (err) {
    const codice = (err as NodeJS.ErrnoException).code ?? 'sconosciuto';
    throw new ErroreChiave(`file della chiave non leggibile (${codice}): ${percorsoFile}`);
  }

  let trovata: string | undefined;
  let quante = 0;
  // Solo confronto del prefisso: le altre righe non vengono toccate in alcun modo.
  for (const riga of contenuto.split(/\r?\n/)) {
    if (!riga.startsWith(PREFISSO)) continue;
    quante += 1;
    trovata = riga.slice(PREFISSO.length);
  }
  // Il contenuto del file non serve più: lo si lascia al garbage collector senza altri riferimenti.
  contenuto = '';

  if (quante === 0) throw new ErroreChiave(`nessuna riga ${PREFISSO}… nel file della chiave`);
  if (quante > 1) throw new ErroreChiave(`più di una riga ${PREFISSO}… nel file della chiave (${quante})`);

  const valore = togliVirgolette((trovata ?? '').trim());
  if (!valore) throw new ErroreChiave(`la riga ${PREFISSO}… è vuota`);
  return valore;
}

function togliVirgolette(v: string): string {
  if (v.length >= 2) {
    const primo = v[0];
    const ultimo = v[v.length - 1];
    if ((primo === '"' && ultimo === '"') || (primo === "'" && ultimo === "'")) return v.slice(1, -1).trim();
  }
  return v;
}

/** Descrizione sicura della chiave per i log: solo lunghezza e presenza, mai caratteri. */
export function descriviChiave(chiave: string | undefined): string {
  return chiave ? `presente (${chiave.length} caratteri)` : 'assente';
}
