/**
 * Which respelling the ear test keeps (docs/pronuncia.md, «The ear test»). The score is rough (a phonetic key on a
 * Whisper transcription: «ZEER-eye» once beat the intended «ZEER-ay»), so it does not choose between respellings that
 * are heard right: the model interprets. The intended respelling (the Preparer's `grafia`, else the proposer's first
 * candidate, else the name as written) is kept unless the transcription shows it clearly wrong: below GIUSTA and more
 * than PARI under the best. Only then the score decides, and among the respellings within PARI of the best it
 * prefers one that only adds accent marks to the name (Whisper does not hear the stress), then the name as written,
 * then the order given.
 */

/** Score differences within this are not a reason to change respelling. */
export const PARI = 0.05;
/** From this score up a respelling is heard right (the wrong readings measured so far score 0.3–0.75). */
export const GIUSTA = 0.8;

export interface SceltaGrafia {
  scelta: string;
  /** `intesa`: the model's choice was kept; `punteggio`: it came back clearly wrong and the score chose. */
  motivo: 'intesa' | 'punteggio';
}

const senzaAccenti = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '');

export function scegliGrafia(o: {
  /** The model's intended respelling. */
  intesa: string;
  /** The name as written. */
  nome: string;
  /** All the respellings tried, in order of preference (the name first, then the model's order). */
  candidati: readonly string[];
  /** Score of a respelling; undefined when it was not heard (listening failed). */
  punti: (g: string) => number | undefined;
}): SceltaGrafia {
  const p = (g: string): number => o.punti(g) ?? -1;
  const tutti = [...new Set([o.intesa, ...o.candidati])];
  const migliore = Math.max(...tutti.map(p));
  const intesa = p(o.intesa);
  if (intesa >= 0 && (intesa >= migliore - PARI || intesa >= GIUSTA)) return { scelta: o.intesa, motivo: 'intesa' };
  const pari = tutti.filter((g) => p(g) >= migliore - PARI);
  const soloAccenti = (g: string): boolean => g !== o.nome && senzaAccenti(g).toLowerCase() === senzaAccenti(o.nome).toLowerCase();
  return { scelta: pari.find(soloAccenti) ?? (pari.includes(o.nome) ? o.nome : pari[0]!), motivo: 'punteggio' };
}
