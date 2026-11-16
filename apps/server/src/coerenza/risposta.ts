/**
 * The Engine's acknowledgement of a player's action whose answer the checker dropped (docs/coerenza.md, «After round
 * 3»). Round 3 had 5 turns where every sentence answering an action named a creature nobody in play answers to (the
 * players kept attacking «the goblin», dead or invented): the yes/no judge dropped them, the mode-B repair call
 * retold the same goblin and was dropped again, and the table heard nothing about that player's action.
 *
 * The acknowledgement says only what the Engine knows: who tried, what (an attack, a check), and how it went, from the
 * action's own card or, with no card, from the ledger's state of the action's target. Never the narrator-facing
 * `fatto` line, never a new detail. Pure: the director decides when it is needed and says it before the invitation.
 */
import { nomeBreve } from '../campagna/nomi';
import { testo } from '../lingua';
import type { Registro } from './registro';

/** One action and what the Engine resolved for it. */
export interface AzioneDaConfermare {
  pg: { id: string; nome: string };
  /** The arbiter's decision: its type and target (null: nothing decided, e.g. no rules arbiter). */
  decisione: { tipo: string; bersaglio: string | null } | null;
  /** The PC's own cards of this action, in order (no NPC's and no Game Master's). */
  carte: ReadonlyArray<{ tipo: string; riuscita: boolean; bersaglio: { id: string; nome: string } | null }>;
}

/** The short line that answers the action (lingue/<code>/testi-coerenza.yaml, `coerenza.risposta`). */
export function confermaDelMotore(a: AzioneDaConfermare, registro: Registro): string {
  const chi = nomeBreve(a.pg.nome);
  // The card says it: a blow that landed or missed, a check passed or failed.
  const colpo = a.carte.find((k) => k.tipo === 'attacco' && k.bersaglio);
  if (colpo) return testo(colpo.riuscita ? 'prove.guardia.colpisce' : 'prove.guardia.manca', { chi, bersaglio: nomeBreve(colpo.bersaglio!.nome) });
  const prova = a.carte[0];
  if (prova) return testo(prova.riuscita ? 'coerenza.risposta.riuscita' : 'coerenza.risposta.fallita', { chi });
  // No card: the target's state in the ledger is why (it fell before, it fled, it is not here).
  const bersaglio = a.decisione?.bersaglio ? registro.entita.find((e) => e.id === a.decisione!.bersaglio) : undefined;
  if (bersaglio && bersaglio.tipo !== 'pg') {
    const via = bersaglio.stato === 'fuggito' || bersaglio.presenza !== 'in_scena';
    const giu = bersaglio.stato === 'a_terra' || bersaglio.stato === 'morente' || bersaglio.stato === 'morto';
    if (via || giu) return testo(via ? 'coerenza.risposta.bersaglio_via' : 'coerenza.risposta.bersaglio_a_terra', { chi, bersaglio: nomeBreve(bersaglio.nome) });
  }
  if (a.decisione?.tipo === 'impossibile') return testo('coerenza.risposta.impossibile', { chi });
  return testo('coerenza.risposta.tentativo', { chi });
}
