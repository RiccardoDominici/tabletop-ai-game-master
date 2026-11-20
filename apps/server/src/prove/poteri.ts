/**
 * A character uses a power of the set (docs/regole.md §2, «Poteri»; docs/prove.md §10): a spell, a potion, a class
 * action. The Engine checks the cost (a prepared spell and a slot of its level, an item on the sheet), refuses with a
 * clear line when it is spent, picks the targets by the power's data (one, every enemy within its hit-dice limit, the
 * allies, oneself), has each target roll its own save (prove/risolutore-regole.ts, salvezzaDelBersaglio), and applies
 * the typed effects (prove/effetti.ts). The arbiters only said which power; nothing here is a model's choice.
 */
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { testo } from '../lingua';
import type { Logger } from '../logger';
import type { Potere } from '../regole/poteri';
import type { Penalita } from '../regole/catalogo';
import type { SchedaGenerica, SistemaRegole } from '../regole/tipi';
import type { FonteDadi } from './dadi';
import { applicaEffetti, type ContestoEffetti } from './effetti';
import { chiaveOggetto, chiaveSlot, type Risorse } from './risorse';
import type { EsitoTiroGenerico } from '../regole/risoluzione';

export interface ContestoPoteri {
  sistema: SistemaRegole;
  schede: ReadonlyMap<string, SchedaGenerica>;
  risorse: Risorse;
  effetti: ContestoEffetti;
  /** A target's own save (strumentiRegole.salvezzaDelBersaglio). */
  salvezza: (chi: string, abilita: string, modificatore: number, dadi: FonteDadi, privata: boolean) => { e: EsitoTiroGenerico; t: TiroMostrato } | null;
  /** The enemies of `autore` that a power can reach now: the fight's standing NPCs, or the hostile ones in the scene. */
  nemici: (autore: string) => string[];
  /** The PCs at the table with a sheet. */
  alleati: () => string[];
  /** Immune to a power or a condition by an active effect (prove/attivi.ts); the sheet's own `immune` is read here. */
  immuneAttivo?: (id: string, cosa: string) => boolean;
  /** What the caster wears forbids spells (regole/equipaggiamento.ts, penalitaIndossate): a magic-user in armor. */
  indossate?: (id: string) => Penalita & { motivi: string[] };
  log: Logger;
}

export interface UsoPotere {
  autore: string;
  potere: Potere;
  /** The target the action named (decision's `bersaglio`), or null. */
  bersaglio: string | null;
  privata: boolean;
  /** The author's dice for the effects' rolls (a PC's own, manual rolls). */
  dadiAutore: FonteDadi;
  /** A PC target's dice for its own save (manual rolls); NPCs use the Engine's. */
  dadiDelPg: (pg: string) => FonteDadi;
}

export interface EsitoPotere {
  tiri: TiroMostrato[];
  fatti: string[];
  /** Hostile uses on NPCs: they open the fight and make the NPC go for the author (prove/motore.ts). */
  ostili: Array<{ chi: string; bersaglio: string }>;
  /** null = refused (nothing spent); true = used. */
  usato: boolean;
}

const pg = (id: string): boolean => !id.startsWith('png_');

/** The hit dice of a sheet: its own `dadi_vita`, a PC's level, else unknown (null). */
function dadiVita(sch: SchedaGenerica | undefined): number | null {
  return sch?.dadiVita ?? (sch && !sch.di_png ? (sch.livello ?? null) : null);
}

/** Who the power can reach, by its data: unaffected types and immunities first, then the hit-dice limit. */
function bersagli(c: ContestoPoteri, u: UsoPotere, fatti: string[]): string[] {
  const p = u.potere;
  const nome = c.effetti.nome;
  let candidati: string[];
  switch (p.bersaglio) {
    case 'se_stesso':
      return [u.autore];
    case 'alleati':
      candidati = c.alleati().filter((id) => !c.effetti.stato.fuoriGioco(id) || c.effetti.stato.fuoriGioco(id) === 'a_terra');
      break;
    case 'uno':
      // One named target; without one, a power that does no harm is the author's own (a potion, a healing spell).
      candidati = u.bersaglio && c.schede.has(u.bersaglio) ? [u.bersaglio] : p.ostile ? [] : [u.autore];
      break;
    case 'nemici':
      candidati = u.bersaglio && c.schede.has(u.bersaglio) && !pg(u.bersaglio) ? [u.bersaglio] : c.nemici(u.autore);
      break;
  }
  const toccati = candidati.filter((id) => {
    const sch = c.schede.get(id);
    const tipi = sch?.tipo ?? [];
    const immune = sch?.immune?.includes(p.id) || p.immuni.some((t) => tipi.includes(t)) || (p.soloTipi.length > 0 && !p.soloTipi.some((t) => tipi.includes(t))) || c.immuneAttivo?.(id, p.id);
    if (immune) fatti.push(testo('prove.poteri.immune', { bersaglio: nome(id), potere: p.nome }));
    return !immune && c.effetti.stato.fuoriGioco(id) !== 'morto' && c.effetti.stato.fuoriGioco(id) !== 'fuggito';
  });
  if (p.dadiVitaMax === null) return toccati;
  // Basic Fantasy's sleep: every creature of up to N hit dice, or, if there is none, a single one up to M.
  const ignoti = toccati.filter((id) => dadiVita(c.schede.get(id)) === null);
  if (ignoti.length) c.log.warn({ potere: p.id, senza_dadi_vita: ignoti }, 'powers: target sheets without dadi_vita count as within the limit');
  const entro = toccati.filter((id) => (dadiVita(c.schede.get(id)) ?? 0) <= p.dadiVitaMax!);
  if (entro.length || p.oppureUnoFinoA === null) {
    for (const id of toccati) if (!entro.includes(id)) fatti.push(testo('prove.poteri.troppo_forte', { bersaglio: nome(id), potere: p.nome }));
    return entro;
  }
  const uno = toccati.find((id) => (dadiVita(c.schede.get(id)) ?? 0) <= p.oppureUnoFinoA!);
  return uno ? [uno] : [];
}

/** Use a power: check and spend its cost, pick the targets, their saves, the effects. */
export function usaPotere(c: ContestoPoteri, u: UsoPotere): EsitoPotere {
  const p = u.potere;
  const nome = c.effetti.nome;
  const chi = nome(u.autore);
  const out: EsitoPotere = { tiri: [], fatti: [], ostili: [], usato: false };
  const sch = c.schede.get(u.autore);
  // The cost first: nothing is spent if it is refused.
  let livello = 1;
  let costo = '';
  if (p.tipo === 'pericolo') {
    out.fatti.push(testo('prove.poteri.pericolo', { nome: chi, potere: p.nome }));
    return out;
  }
  if (p.tipo === 'incantesimo') {
    const l = c.risorse.puoLanciare(u.autore, p);
    if (!l.ok) {
      out.fatti.push(testo(`prove.poteri.rifiuto_${l.motivo}`, { nome: chi, potere: p.nome, livello: l.livello ?? '' }));
      c.log.info({ autore: u.autore, potere: p.id, motivo: l.motivo, livello: l.livello }, 'powers: spell refused, nothing spent');
      return out;
    }
    livello = sch?.livello ?? sch?.dadiVita ?? 1;
    // In armor a magic-user casts nothing (Basic Fantasy p. 187): refused (nothing spent), or the attempt fails and the
    // spell is lost (`senza_incantesimi: perso`).
    const vieta = c.indossate?.(u.autore);
    if (vieta?.senzaIncantesimi) {
      const cosa = vieta.motivi.join(', ').toLowerCase();
      if (vieta.senzaIncantesimi === 'perso') {
        c.risorse.lancia(u.autore, p, l.livello);
        out.usato = true;
        out.fatti.push(testo('prove.equipaggiamento.incantesimo_perso', { nome: chi, potere: p.nome, cosa }));
      } else out.fatti.push(testo('prove.equipaggiamento.incantesimo_vietato', { nome: chi, potere: p.nome, cosa }));
      c.log.info({ autore: u.autore, potere: p.id, perso: vieta.senzaIncantesimi === 'perso' }, 'gear: no spells while wearing this armor');
      return out;
    }
    c.risorse.lancia(u.autore, p, l.livello);
    const restanti = c.risorse.restanti(u.autore, chiaveSlot(l.livello));
    costo = restanti === null ? testo('prove.poteri.costo_incantesimo_senza_slot', { livello: l.livello }) : testo('prove.poteri.costo_incantesimo', { livello: l.livello, restanti });
  } else if (p.tipo === 'oggetto') {
    if (!c.risorse.spendi(u.autore, chiaveOggetto(p.id))) {
      out.fatti.push(testo('prove.poteri.rifiuto_oggetto', { nome: chi, potere: p.nome }));
      return out;
    }
    costo = testo('prove.poteri.costo_oggetto', { restanti: c.risorse.restanti(u.autore, chiaveOggetto(p.id)) ?? 0 });
  }
  out.usato = true;
  out.fatti.push(testo('prove.poteri.usa', { nome: chi, potere: p.nome, costo }));
  const chiDentro = bersagli(c, u, out.fatti);
  if (!chiDentro.length) {
    out.fatti.push(testo('prove.poteri.nessun_bersaglio', { potere: p.nome }));
    c.log.info({ autore: u.autore, potere: p.id }, 'powers: used, but no target within its reach');
    return out;
  }
  if (p.descrittivo && !p.effetti.length) out.fatti.push(testo('prove.poteri.descrittivo', { potere: p.nome, bersagli: chiDentro.map(nome).join(', ') }));
  for (const id of chiDentro) {
    if (p.ostile && !pg(id) && pg(u.autore)) out.ostili.push({ chi: u.autore, bersaglio: id });
    let dimezza = false;
    if (p.salvezza && id !== u.autore) {
      const s = c.salvezza(id, p.salvezza.abilita, p.salvezza.modificatore, pg(id) ? u.dadiDelPg(id) : c.effetti.dadi, u.privata);
      if (s) {
        out.tiri.push(s.t);
        if (s.e.riuscita && p.salvezza.esito === 'annulla') {
          out.fatti.push(testo('prove.poteri.resiste', { bersaglio: nome(id), potere: p.nome }));
          continue;
        }
        dimezza = s.e.riuscita && p.salvezza.esito === 'dimezza';
      }
    }
    const x = applicaEffetti({ effetti: p.effetti, bersaglio: id, autore: u.autore, fonte: p.nome, livello, dimezza, privata: u.privata, dadiAutore: u.dadiAutore }, c.effetti);
    out.tiri.push(...x.tiri);
    out.fatti.push(...x.fatti);
  }
  c.log.info({ autore: u.autore, potere: p.id, livello, bersagli: chiDentro, ostili: out.ostili.length }, 'powers: used');
  return out;
}
