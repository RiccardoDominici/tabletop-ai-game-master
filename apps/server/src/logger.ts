/**
 * Log strutturato del server.
 *
 * - logs/server.jsonl: sempre JSON, una riga per evento (il log applicativo).
 * - stdout: leggibile (pino-pretty) quando è un terminale, JSON altrimenti.
 *
 * Regola: nei log non finiscono mai chiavi né il contenuto del file della chiave.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import pino from 'pino';

export type Logger = pino.Logger;

export function creaLogger(opzioni: { livello: string; cartellaLog: string; nomeFile?: string }): Logger {
  fs.mkdirSync(opzioni.cartellaLog, { recursive: true });
  const fileLog = path.join(opzioni.cartellaLog, opzioni.nomeFile ?? 'server.jsonl');
  const flussi: pino.StreamEntry[] = [
    { level: 'debug', stream: pino.destination({ dest: fileLog, append: true, sync: false, mkdir: true }) },
  ];
  if (process.stdout.isTTY) {
    // pino-pretty come stream in-process: niente worker, i messaggi restano in ordine.
    flussi.push({ level: opzioni.livello as pino.Level, stream: creaPretty() });
  } else {
    flussi.push({ level: opzioni.livello as pino.Level, stream: process.stdout });
  }
  return pino(
    {
      level: 'debug',
      base: { app: 'cantastorie' },
      timestamp: pino.stdTimeFunctions.isoTime,
      // Difesa in profondità: se per errore un oggetto con questi campi finisce in un log.
      redact: { paths: ['apiKey', '*.apiKey', 'chiave', '*.chiave', 'headers["x-api-key"]'], censor: '[omessa]' },
    },
    pino.multistream(flussi),
  );
}

/** Logger muto per i test. */
export function loggerMuto(): Logger {
  return pino({ level: 'silent' });
}

function creaPretty(): NodeJS.WritableStream {
  // pino-pretty è solo una devDependency e serve solo quando stdout è un terminale.
  const richiedi = createRequire(import.meta.url);
  try {
    const pretty = richiedi('pino-pretty') as (o: Record<string, unknown>) => NodeJS.WritableStream;
    return pretty({ colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname,app' });
  } catch {
    return process.stdout;
  }
}
