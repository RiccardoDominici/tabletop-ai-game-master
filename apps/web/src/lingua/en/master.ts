/**
 * Dizionario «master» dell'interfaccia, lingua en (docs/lingue.md). Chiavi piatte «master.…», segnaposto {nome}.
 * Le chiavi sono quelle di lingua/it/master.ts: il compilatore e lingua.test.ts controllano che non ne manchi nessuna.
 */
export const master = {
} satisfies Record<keyof typeof import('../it/master').master, string>;
