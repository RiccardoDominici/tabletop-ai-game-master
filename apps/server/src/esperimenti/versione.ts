/**
 * Versione del codice su cui gira un esperimento, per il riepilogo: commit di HEAD e file non
 * committati che cambiano ciò che si misura (server, tipi condivisi, prompt, campagna). Una run
 * fatta su un albero sporco (altri agenti al lavoro su apps/server) si riconosce dal riepilogo,
 * e la si rifà da un worktree pulito (git worktree add <cartella> <commit>).
 */
import { spawnSync } from 'node:child_process';
import { RADICE_REPO } from '../percorsi';

export interface VersioneCodice {
  commit: string | null;
  /** File modificati o nuovi sotto i percorsi che contano (vuoto = albero pulito). */
  modificati: string[];
  /** Cartella del repository da cui gira il server (un worktree ha la sua). */
  radice: string;
}

function git(args: string[]): string | null {
  const r = spawnSync('git', ['-C', RADICE_REPO, ...args], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

export function versioneCodice(campagna: string): VersioneCodice {
  const percorsi = ['apps/server', 'packages/shared', 'prompts', `campagne/${campagna}`];
  const stato = git(['status', '--porcelain', '--', ...percorsi]);
  return {
    commit: git(['rev-parse', 'HEAD']),
    // «?? apps/server/node_modules» è il collegamento di un worktree, non codice.
    modificati: (stato ?? '').split('\n').filter((r) => r.trim() && !/node_modules/.test(r)).map((r) => r.trim()),
    radice: RADICE_REPO,
  };
}
