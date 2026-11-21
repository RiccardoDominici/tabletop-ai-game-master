/**
 * A power rolled against a class table (`poteri[].tabella`, docs/regole.md §2): Basic Fantasy's Turn Undead (p. 57–58),
 * written as data so any manual's version fits. The Engine, never a model:
 * 1. the author's class must have the power's rows (`classi[].tabelle.<id>`), else it cannot; a failed attempt locks
 *    the power for the set's `dopo_fallimento` (a turn: an immunity of the author to `uso:<id>`, prove/attivi.ts);
 * 2. the targets are the reachable enemies of the power's types (`solo_tipi`); each one's column is the one its sheet's
 *    `tipo` names, else the one of its hit dice (the last column holds «9 or more»);
 * 3. the author rolls the table's die once for the group (its own dice: manual rolls ask it at the table); the cell of
 *    its level's row says: a number to reach, `T` (it works), `D` (it works, and harms), null (it cannot); checked from
 *    the weakest target up, stopping at the first that resists;
 * 4. on a success the author rolls the hit dice affected (`colpiti`: 2d6), spent weakest first, at least one creature;
 *    the surplus is lost; a `D` target takes `distrugge` (1d8 × level), rolled once for all (0 HP: destroyed), and every
 *    affected one still standing gets the power's effects (the turned condition, 2d4 turns);
 * 5. any target that resisted makes the attempt a failure (a partial one too, p. 58): the lockout starts.
 */
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { testo } from '../lingua';
import type { Potere } from '../regole/poteri';
import { rigaDi, type ValoreTabella } from '../regole/progressione';
import type { SchedaGenerica } from '../regole/tipi';
import type { FonteDadi } from './dadi';
import { applicaEffetti } from './effetti';
import { danno as tiraDanno } from './regole';
import type { ContestoPoteri, EsitoPotere, UsoPotere } from './poteri';

/** The immunity id that locks a power for its author after a failure. */
export const bloccoDi = (potere: string): string => `uso:${potere}`;

/** The hit dice of a target sheet (its `dadi_vita`; a PC's level), 1 when unknown. */
function dadiVita(sch: SchedaGenerica | undefined): number {
  return sch?.dadiVita ?? (sch && !sch.di_png ? (sch.livello ?? 1) : 1);
}

/** The column of a target: the one its `tipo` names, else by its hit dice (the highest column at or below them). */
function colonnaDi(p: Potere, sch: SchedaGenerica | undefined): number {
  const col = p.tabella!.colonne;
  const perTipo = col.findIndex((c) => sch?.tipo?.includes(c.id));
  if (perTipo >= 0) return perTipo;
  const dv = dadiVita(sch);
  let i = 0;
  for (const [k, c] of col.entries()) if (dv >= c.dadiVita) i = k;
  return i;
}

const riesce = (cella: ValoreTabella, dado: number): boolean => cella === 'T' || cella === 'D' || (typeof cella === 'number' && dado >= cella);

/** The author's card of the table roll: the die, the number of the weakest target's cell, success or not. */
function cartaDelTiro(c: ContestoPoteri, u: UsoPotere, dado: number, facce: number, cella: ValoreTabella, riuscita: boolean): TiroMostrato {
  const nome = c.effetti.nome(u.autore);
  return {
    id: c.effetti.stato.nuovoIdTiro(),
    turno: c.effetti.turno,
    chi: u.autore,
    nome,
    di_png: u.autore.startsWith('png_'),
    tipo: 'prova',
    etichetta: u.potere.nome,
    dadi: [dado],
    dado,
    facce,
    vantaggio: null,
    motivo_vantaggio: null,
    modificatore: 0,
    totale: dado,
    contro: { tipo: 'CD', valore: typeof cella === 'number' ? cella : 0, descrizione: typeof cella === 'number' ? null : cella === null ? testo('prove.scacciare.cella_no') : testo('prove.scacciare.cella_auto') },
    bersaglio: null,
    riuscita,
    critico: false,
    fallimento_critico: false,
    danno: null,
    a_terra: false,
    privata: u.privata,
    avversario: null,
  };
}

/**
 * Use a table power (called by prove/poteri.ts usaPotere for a power with `tabella`). `bersagli`: the targets the power
 * reaches (its types and immunities already applied).
 */
export function usaTabella(c: ContestoPoteri, u: UsoPotere, bersagli: string[], out: EsitoPotere): void {
  const p = u.potere;
  const t = p.tabella!;
  const nome = c.effetti.nome;
  const chi = nome(u.autore);
  const sch = c.schede.get(u.autore);
  const classe = sch?.classe ? (c.sistema.classi ?? []).find((x) => x.id === sch.classe) : undefined;
  const righe = classe?.progressione.tabelle[p.id];
  const livello = sch?.livello ?? 1;
  const riga = righe?.length ? rigaDi(righe, livello) : null;
  if (!riga) {
    out.fatti.push(testo('prove.scacciare.non_sa', { nome: chi, potere: p.nome }));
    c.log.info({ autore: u.autore, potere: p.id, classe: sch?.classe ?? null }, 'table power: the author\'s class has no row for it');
    return;
  }
  if (c.immuneAttivo?.(u.autore, bloccoDi(p.id))) {
    out.fatti.push(testo('prove.scacciare.bloccato', { nome: chi, potere: p.nome }));
    c.log.info({ autore: u.autore, potere: p.id }, 'table power: locked after a failed attempt');
    return;
  }
  if (!bersagli.length) {
    out.fatti.push(testo('prove.poteri.nessun_bersaglio', { potere: p.nome }));
    return;
  }
  // Who is already under the power's effect (turned and gone) is not a target again.
  const condizioni = p.effetti.flatMap((e) => (e.tipo === 'condizione' ? [e.condizione] : []));
  const liberi = bersagli.filter((id) => !condizioni.some((k) => c.condizioni?.(id).includes(k)));
  if (!liberi.length) {
    out.fatti.push(testo('prove.poteri.nessun_bersaglio', { potere: p.nome }));
    return;
  }
  out.usato = true;
  for (const id of liberi) if (p.ostile && id.startsWith('png_') && !u.autore.startsWith('png_')) out.ostili.push({ chi: u.autore, bersaglio: id });
  // Weakest first: by the column, then by the hit dice.
  const ordine = liberi.map((id) => ({ id, col: colonnaDi(p, c.schede.get(id)), dv: dadiVita(c.schede.get(id)) })).sort((a, b) => a.col - b.col || a.dv - b.dv);
  const dadi = u.dadiProva ?? u.dadiAutore;
  const dado = tiraDanno(dadi, t.dado, 0, false).totale;
  const riusciti: typeof ordine = [];
  let resiste = false;
  for (const x of ordine) {
    if (!riesce(riga.valori[x.col] ?? null, dado)) {
      resiste = true;
      break;
    }
    riusciti.push(x);
  }
  if (riusciti.length < ordine.length) resiste = true;
  const prima = riga.valori[ordine[0]!.col] ?? null;
  out.tiri.push(cartaDelTiro(c, u, dado, t.dado.facce, prima, riusciti.length > 0));
  out.fatti.push(testo('prove.scacciare.tiro', { nome: chi, potere: p.nome, dado, esito: riusciti.length ? testo('prove.scacciare.riesce', { n: riusciti.length }) : testo('prove.scacciare.fallisce') }));
  // The hit dice affected: spent weakest first; at least one creature when the roll succeeded.
  const colpiti: typeof ordine = [];
  if (riusciti.length) {
    const pool = t.colpiti ? tiraDanno(u.dadiAutore, t.colpiti, 0, false).totale : Number.POSITIVE_INFINITY;
    let resto = pool;
    for (const x of riusciti) {
      if (colpiti.length && x.dv > resto) break;
      colpiti.push(x);
      resto -= x.dv;
    }
    if (t.colpiti) out.fatti.push(testo('prove.scacciare.colpiti', { dadi: pool, nomi: colpiti.map((x) => nome(x.id)).join(', ') }));
  }
  // A «D» cell: the damage is rolled once and dealt to each such target; the survivors are turned like the others.
  const daDanneggiare = colpiti.filter((x) => riga.valori[x.col] === 'D');
  let danno: number | null = null;
  if (daDanneggiare.length && t.distrugge) {
    const f = t.distrugge.perLivello ? { numero: t.distrugge.dadi.numero * Math.max(1, livello), facce: t.distrugge.dadi.facce, bonus: t.distrugge.dadi.bonus * Math.max(1, livello) } : t.distrugge.dadi;
    danno = tiraDanno(u.dadiEffetto ?? u.dadiAutore, f, 0, false).totale;
  }
  for (const x of colpiti) {
    if (danno !== null && riga.valori[x.col] === 'D') {
      const d = applicaEffetti({ effetti: [{ tipo: 'danno', dadi: { numero: 0, facce: 0, bonus: danno }, dadiPerLivello: null, bonusPerLivello: null, colpi: null, tipoDanno: null }], bersaglio: x.id, autore: u.autore, fonte: p.nome, livello, privata: u.privata }, c.effetti);
      out.tiri.push(...d.tiri);
      out.fatti.push(...d.fatti);
      if (c.effetti.stato.fuoriGioco(x.id)) {
        out.fatti.push(testo('prove.scacciare.distrutto', { nome: nome(x.id) }));
        continue;
      }
    }
    // The effects' own dice (how long the turned stay away) are the Game Master's: the Engine's.
    const e = applicaEffetti({ effetti: p.effetti, bersaglio: x.id, autore: u.autore, fonte: p.nome, livello, privata: u.privata, dadiAutore: c.effetti.dadi as FonteDadi }, c.effetti);
    out.tiri.push(...e.tiri);
    out.fatti.push(...e.fatti);
  }
  // A failure, partial too, locks the power for a while (Basic Fantasy p. 58: a full turn).
  if (resiste && t.dopoFallimento) {
    c.effetti.attivi?.aggiungi(u.autore, { tipo: 'immunita', a: [bloccoDi(p.id)], durata: t.dopoFallimento }, p.nome, livello, c.effetti.dadi);
    out.fatti.push(testo('prove.scacciare.attesa', { nome: chi, potere: p.nome }));
  }
  c.log.info({ autore: u.autore, potere: p.id, livello, dado, bersagli: ordine.map((x) => [x.id, riga.valori[x.col]]), colpiti: colpiti.map((x) => x.id), danno, resiste }, 'table power: rolled against the class table');
}
