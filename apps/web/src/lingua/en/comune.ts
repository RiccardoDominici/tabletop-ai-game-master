/**
 * Dizionario «comune» dell'interfaccia, lingua en (docs/lingue.md). Chiavi piatte «comune.…», segnaposto {nome}.
 * Le chiavi sono quelle di lingua/it/comune.ts: il compilatore e lingua.test.ts controllano che non ne manchi nessuna.
 */
export const comune = {
  /** Congiunzione dell'ultimo elemento di un elenco («A, B e C»), con gli spazi. */
  'comune.elenco.e': ' and ',
} satisfies Record<keyof typeof import('../it/comune').comune, string>;
