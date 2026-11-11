/**
 * Percorsi del repository, ricavati da questo file (ESM: niente __dirname).
 * src/percorsi.ts → apps/server → apps → radice del repo.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qui = path.dirname(fileURLToPath(import.meta.url));

/** Radice del repository tabletop-ai-game-master. */
export const RADICE_REPO = path.resolve(qui, '..', '..', '..');

/** Cartella dei log JSONL (fuori da git). */
export const CARTELLA_LOG = path.join(RADICE_REPO, 'logs');

/** Pagine web compilate da Vite. */
export const CARTELLA_WEB_DIST = path.join(RADICE_REPO, 'apps', 'web', 'dist');
