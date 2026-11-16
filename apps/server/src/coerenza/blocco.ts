/**
 * «Cosa è vero adesso» (docs/coerenza.md §2): the rows of the coherence ledger that the narrator and the selector need
 * for this turn, in a few lines of the content language. It replaces the section «PNG fuori gioco» (the fallen are rows
 * like the others) and adds what that section never said: who is in the scene and how they are, who left it and when,
 * how the PCs are, and this turn's public outcomes in one line each (the details stay in «Esiti dei tiri»).
 *
 * Only what the table may know: a hidden NPC is not listed, a private action's card is not an outcome here (its wound
 * is: the NPC's state is public), and the private facts stay out (they reach only that PC's reply, docs/coerenza.md
 * §2, audience split). Pure: a ledger in, lines out.
 */
import { nomeBreve } from '../campagna/nomi';
import { testo } from '../lingua';
import type { EntitaRegistro, Registro } from './registro';

/** At most this many rows (the block must stay small: it is in every call). */
export const RIGHE_MASSIME = 12;

function stato(e: EntitaRegistro): string {
  return testo(`coerenza.stato.${e.stato}`, { nome: e.nome });
}

/** The lines of the block (without the title); empty when there is nothing to say. */
export function righeVeroAdesso(r: Registro): string[] {
  const righe: string[] = [];
  const inScena = r.entita.filter((e) => e.tipo !== 'pg' && e.presenza === 'in_scena' && e.stato !== 'nascosto');
  if (inScena.length) righe.push(testo('coerenza.in_scena', { elenco: inScena.map(stato).join('; ') }));
  const usciti = r.entita.filter((e) => e.tipo !== 'pg' && e.presenza === 'uscito' && e.uscito);
  if (usciti.length) {
    const elenco = usciti.map((e) => testo('coerenza.uscito', { nome: e.nome, turno: e.uscito!.turno, verso: e.uscito!.verso ? testo('coerenza.verso', { luogo: e.uscito!.verso }) : '' }));
    righe.push(testo('coerenza.usciti', { elenco: elenco.join('; ') }));
  }
  const pg = r.entita.filter((e) => e.tipo === 'pg');
  if (pg.length) righe.push(testo('coerenza.pg', { elenco: pg.map(stato).join('; ') }));
  const esiti = r.esiti.filter((x) => !x.privata).map((x) => {
    const chi = nomeBreve(x.nome);
    if (x.tipo === 'attacco' && x.bersaglio) {
      const chiave = x.aTerra ? 'coerenza.esito_a_terra' : x.riuscita ? 'coerenza.esito_colpito' : 'coerenza.esito_mancato';
      return testo(chiave, { chi, bersaglio: nomeBreve(x.bersaglio.nome) });
    }
    return testo(x.riuscita ? 'coerenza.prova_riuscita' : 'coerenza.prova_fallita', { chi, etichetta: x.etichetta });
  });
  if (esiti.length) righe.push(testo('coerenza.esiti', { elenco: esiti.join('; ') }));
  const negati = r.negati.filter((n) => !n.privata);
  if (negati.length) {
    const nome = (id: string): string => r.entita.find((e) => e.id === id)?.nome ?? id;
    righe.push(testo('coerenza.negati', { elenco: negati.map((n) => testo('coerenza.negato', { png: nome(n.png), pg: nomeBreve(nome(n.autore)) })).join('; ') }));
  }
  return righe.slice(0, RIGHE_MASSIME);
}

/** The block for the message: its title and lines, or null when there is nothing to say. */
export function bloccoVeroAdesso(r: Registro): { titolo: string; righe: string[] } | null {
  const righe = righeVeroAdesso(r);
  return righe.length ? { titolo: testo('coerenza.titolo'), righe } : null;
}
