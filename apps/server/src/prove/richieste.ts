/**
 * Manual rolls (docs/prove.md §8): what a player is asked to roll with real dice, how the values they enter are
 * checked, and what a card may show the table when the DC is secret.
 *
 * A request is read off the card of a dry run of the resolver (MotoreProve.richiesteGiocatori): the label, the dice,
 * the player's bonus, advantage. So there is one source of truth for modifiers and dice per rule set (the resolvers),
 * and nothing here recomputes a modifier.
 */
import type { RichiestaTiro, RichiestaTiroMaster, TiroMostrato } from '@tabletop-ai-gm/shared';
import { totaleRichiesta } from '@tabletop-ai-gm/shared';

/** The values a player (or the Game Master for them) entered for a request; null = switched to the Engine's dice. */
export interface TiroInserito {
  richiesta: RichiestaTiro;
  valori: number[] | null;
  da: 'telefono' | 'master' | 'dettato' | 'motore';
}

/** The request matching a dry-run card of the action's own test. */
export function richiestaDaCarta(t: TiroMostrato, idAzione: string, turno: number): RichiestaTiroMaster {
  const facce = t.facce ?? 20;
  const sottoSoglia = t.risoluzione === 'sotto_soglia';
  const somma = t.risoluzione === '2d6_fasce';
  const quanti = t.dadi.length;
  // Two dice: advantage keeps the best (the highest; on a roll-under the lowest), disadvantage the worst.
  const migliore: 'alto' | 'basso' = sottoSoglia ? 'basso' : 'alto';
  const peggiore: 'alto' | 'basso' = sottoSoglia ? 'alto' : 'basso';
  const tieni = somma ? (t.vantaggio === 'svantaggio' ? 'basso' : 'alto') : quanti > 1 ? (t.vantaggio === 'svantaggio' ? peggiore : migliore) : null;
  return {
    id: `r_${idAzione}`,
    id_azione: idAzione,
    turno,
    chi: t.chi,
    nome: t.nome,
    privata: t.privata,
    tipo: t.tipo,
    etichetta: t.etichetta,
    facce,
    quanti,
    tieni,
    somma,
    // 2d6 with an extra die keeps two of three.
    tenuti: somma ? Math.min(2, quanti) : 1,
    modificatore: sottoSoglia ? 0 : t.modificatore,
    vantaggio: t.vantaggio,
    motivo_vantaggio: t.motivo_vantaggio,
    sotto_soglia: sottoSoglia,
    contro: t.contro,
    bersaglio: t.bersaglio,
    regola: t.regola ?? null,
    valori: null,
  };
}

/** The request as the table may see it: no DC, AC, threshold, target or rule text. */
export function richiestaPubblica(r: RichiestaTiroMaster | RichiestaTiro): RichiestaTiro {
  const { id, id_azione, turno, chi, nome, privata, tipo, etichetta, facce, quanti, tieni, somma, tenuti, modificatore, vantaggio, motivo_vantaggio, sotto_soglia, dal_master } = r;
  return { id, id_azione, turno, chi, nome, privata, tipo, etichetta, facce, quanti, tieni, somma, tenuti, modificatore, vantaggio, motivo_vantaggio, sotto_soglia, ...(dal_master ? { dal_master } : {}) };
}

/** Why the values do not fit the request: the wrong number of dice, or a die off its faces (null = they fit). */
export function erroreValori(r: Pick<RichiestaTiro, 'facce' | 'quanti' | 'tieni' | 'somma' | 'tenuti' | 'modificatore'>, valori: unknown): 'quanti' | 'facce' | null {
  if (!Array.isArray(valori) || valori.length !== r.quanti) return 'quanti';
  if (totaleRichiesta(r, valori as number[]) === null) return 'facce';
  return null;
}

/**
 * A card of a roll asked to a player (manual rolls, `manuale` set) as the table sees it: the dice, the bonus, the total
 * and the outcome, never the number to beat (docs/prove.md §8). The Engine's own cards keep everything: NPC attacks
 * (the PC's AC is not a secret), death saves against the rule's fixed DC, every card of automatic rolls.
 */
export function cartaPerIlTavolo(t: TiroMostrato): TiroMostrato {
  if (!t.manuale || t.di_png || t.automatico || t.contro_nascosto) return t;
  const { regola: _regola, ...resto } = t;
  return { ...resto, contro: { tipo: t.contro.tipo, valore: 0, descrizione: null }, contro_nascosto: true };
}
