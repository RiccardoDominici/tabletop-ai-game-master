/**
 * Dizionario «schermo» dell'interfaccia, lingua en (docs/lingue.md). Chiavi piatte «schermo.…», segnaposto {nome}.
 * Le chiavi sono quelle di lingua/it/schermo.ts: il compilatore e lingua.test.ts controllano che non ne manchi nessuna.
 */
export const schermo = {
} satisfies Record<keyof typeof import('../it/schermo').schermo, string>;
