/**
 * Uscita strutturata su qualsiasi provider (llm/modello.ts).
 * - Provider con `capacita.strutturato` (Anthropic): lo schema va nella richiesta, come prima; la
 *   risposta si legge come JSON. Gli errori si comportano come prima: lanciano.
 * - Provider senza (i modelli locali): lo schema va nel messaggio con l'istruzione di rispondere solo
 *   JSON; la risposta si estrae (anche da ```json … ```), si valida in modo severo contro lo schema e,
 *   se non va, si ritenta UNA volta dicendo l'errore. Poi `ripiego` (deterministico) se c'è, altrimenti
 *   un errore: chi chiama ha già la sua riserva a regole (arbitri) o il suo «nessuna».
 */
import type { Logger } from '../logger';
import type { ModelloLinguaggio, RichiestaModello, RispostaModello } from './modello';

type Schema = Record<string, unknown>;

/** Errori di un valore rispetto allo schema (sottoinsieme di JSON Schema usato nel gioco). Vuoto = valido. */
export function erroriSchema(schema: Schema, v: unknown, dove = '$'): string[] {
  const tipo = schema['type'];
  const err: string[] = [];
  if (Array.isArray(schema['enum']) && !(schema['enum'] as unknown[]).includes(v)) return [`${dove}: valore ${JSON.stringify(v)} fuori da ${JSON.stringify(schema['enum'])}`];
  const tipi = Array.isArray(tipo) ? (tipo as string[]) : typeof tipo === 'string' ? [tipo] : [];
  const tipoDi = (x: unknown): string => (x === null ? 'null' : Array.isArray(x) ? 'array' : Number.isInteger(x) ? 'integer' : typeof x);
  if (tipi.length && !tipi.some((t) => t === tipoDi(v) || (t === 'number' && tipoDi(v) === 'integer'))) return [`${dove}: atteso ${tipi.join('|')}, trovato ${tipoDi(v)}`];
  if (tipoDi(v) === 'object') {
    const o = v as Record<string, unknown>;
    const props = (schema['properties'] ?? {}) as Record<string, Schema>;
    for (const r of (schema['required'] ?? []) as string[]) if (!(r in o)) err.push(`${dove}.${r}: manca`);
    for (const [k, x] of Object.entries(o)) {
      if (props[k]) err.push(...erroriSchema(props[k]!, x, `${dove}.${k}`));
      else if (schema['additionalProperties'] === false) err.push(`${dove}.${k}: campo non previsto`);
    }
  } else if (tipoDi(v) === 'array' && schema['items']) {
    (v as unknown[]).forEach((x, i) => err.push(...erroriSchema(schema['items'] as Schema, x, `${dove}[${i}]`)));
    if (typeof schema['maxItems'] === 'number' && (v as unknown[]).length > (schema['maxItems'] as number)) err.push(`${dove}: più di ${schema['maxItems']} elementi`);
  } else if (tipoDi(v) === 'string' && typeof schema['maxLength'] === 'number' && (v as string).length > (schema['maxLength'] as number)) {
    err.push(`${dove}: più lungo di ${schema['maxLength']} caratteri`);
  }
  return err;
}

/** Il primo oggetto JSON nel testo (tollera ```json … ``` e testo attorno). */
export function estraiJson(testo: string): unknown {
  const t = testo.replace(/```(?:json)?/gi, '');
  const inizio = t.indexOf('{');
  const fine = t.lastIndexOf('}');
  if (inizio < 0 || fine <= inizio) throw new Error('nessun oggetto JSON nella risposta');
  return JSON.parse(t.slice(inizio, fine + 1));
}

export interface OpzioniStrutturato<T> {
  schema: Schema;
  /** Per i log: cosa si chiedeva («relazioni», «prova», «battuta»). */
  cosa: string;
  log?: Logger;
  /** Risultato deterministico se il modello non dà una risposta valida (assente = errore). */
  ripiego?: (motivo: string) => T;
  /** Controlli in più oltre lo schema (id che devono esistere…): messaggio d'errore o null. */
  controlla?: (v: T) => string | null;
  /** Ogni risposta del modello (misure, costi). */
  onRisposta?: (r: RispostaModello) => void;
}

const ISTRUZIONE = (schema: Schema): string =>
  `Rispondi SOLO con un oggetto JSON valido per questo schema, senza testo prima o dopo, senza commenti:\n${JSON.stringify(schema)}`;

export async function chiediStrutturato<T>(m: ModelloLinguaggio, r: Omit<RichiestaModello, 'schema'>, o: OpzioniStrutturato<T>): Promise<T> {
  if (m.capacita.strutturato) {
    const risposta = await m.chiedi({ ...r, schema: o.schema });
    o.onRisposta?.(risposta);
    if (risposta.stopReason !== 'end_turn') throw new Error(`${o.cosa}: stop_reason ${String(risposta.stopReason)}`);
    if (!risposta.testo) throw new Error(`${o.cosa}: risposta senza testo`);
    return JSON.parse(risposta.testo) as T;
  }
  // Senza uscita strutturata: istruzione nel messaggio, validazione severa, un ritentativo.
  const ultimo = r.messaggi.at(-1);
  const messaggi = ultimo ? [...r.messaggi.slice(0, -1), { ...ultimo, testo: `${ultimo.testo}\n\n${ISTRUZIONE(o.schema)}` }] : [{ ruolo: 'user' as const, testo: ISTRUZIONE(o.schema) }];
  let motivo = '';
  for (let tentativo = 1; tentativo <= 2; tentativo++) {
    const correzione = tentativo > 1 ? [{ ruolo: 'user' as const, testo: `La risposta di prima non andava (${motivo}). ${ISTRUZIONE(o.schema)}` }] : [];
    try {
      const risposta = await m.chiedi({ ...r, messaggi: [...messaggi, ...correzione] });
      o.onRisposta?.(risposta);
      const v = estraiJson(risposta.testo);
      const errori = erroriSchema(o.schema, v);
      if (errori.length) throw new Error(errori.slice(0, 3).join('; '));
      const extra = o.controlla?.(v as T) ?? null;
      if (extra) throw new Error(extra);
      if (tentativo > 1) o.log?.info({ cosa: o.cosa, modello: m.descrizione }, 'llm: risposta strutturata valida al ritentativo');
      return v as T;
    } catch (err) {
      if (r.signal?.aborted) throw err;
      motivo = (err as Error).message.slice(0, 200);
      o.log?.warn({ cosa: o.cosa, modello: m.descrizione, tentativo, motivo }, 'llm: risposta strutturata non valida');
    }
  }
  if (o.ripiego) {
    o.log?.warn({ cosa: o.cosa, modello: m.descrizione, motivo }, 'llm: si usa il ripiego deterministico');
    return o.ripiego(motivo);
  }
  throw new Error(`${o.cosa}: nessuna risposta valida dal modello (${motivo})`);
}
