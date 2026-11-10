/**
 * Dizionario «telefono» dell'interfaccia, lingua en (docs/lingue.md). Chiavi piatte «telefono.…», segnaposto {nome}.
 * Le chiavi sono quelle di lingua/it/telefono.ts: il compilatore e lingua.test.ts controllano che non ne manchi nessuna.
 */
export const telefono = {
} satisfies Record<keyof typeof import('../it/telefono').telefono, string>;
