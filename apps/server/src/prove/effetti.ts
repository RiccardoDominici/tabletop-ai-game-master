/**
 * The Engine applies typed effects (regole/effetti.ts; docs/regole.md §2, «Effetti tipati»): damage, healing, a fall by
 * the set's table, a trap's attack, save-or-die, and the timed ones (a condition, a bonus, an immunity) that live in the
 * Engine state (prove/attivi.ts). Hit points change here through every source that is not a weapon: spells, potions,
 * traps, falls, poison, rest. Each damage or healing roll gets a card like an attack's, and a fact for the narrator.
 *
 * Deterministic given the dice. The caller has already resolved who the target is and the target's own save (a save
 * that negates drops the effects before they come here; one for half sets `dimezza`). It works the same for the SRD
 * path and for any rule set: it needs only the Engine state, the dice and a few callbacks.
 */
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import type { FormulaDadi } from '../campagna/regole-srd';
import { testo } from '../lingua';
import type { Logger } from '../logger';
import { formulaAlLivello, perLivello, type EffettoTipato } from '../regole/effetti';
import { passiCaduta, type RegolaCadute } from '../regole/salute';
import type { FonteDadi } from './dadi';
import { danno as tiraDanno, tiraD20 } from './regole';
import type { StatoProve } from './stato';
import { dannoMostrato, fraseDanno, salute, tipoDanno } from './testi';

export interface ContestoEffetti {
  turno: number;
  stato: StatoProve;
  /** The Engine's dice: hazards, NPC casters, every roll that is not a PC's own. */
  dadi: FonteDadi;
  nome: (id: string) => string;
  /** The set's falling table; null = the set has none (a fall then deals nothing, and the log says why). */
  cadute: RegolaCadute | null;
  /** How the set names hit points and what zero means (danni.nome, danni.a_zero). */
  danni: { nome: string; aZero: string };
  /** A sheet's Armor Class, for a trap's attack (null = no sheet, the trap hits). */
  difesa?: (id: string) => number | null;
  /** Hit points rose above zero: the fight lifts its at-zero condition and the dying window ends. */
  dopoCura?: (id: string) => void;
  /** Hit points just fell to zero outside the fight's own steps: the set's rule at zero (prove/morte.ts). */
  aZero?: (id: string, fatti: string[], tiri: TiroMostrato[]) => void;
  /** The inventory (prove/inventario.ts): items and coins gained or lost. Absent = the set has no catalog (logged). */
  inventario?: {
    oggetto(chi: string, id: string, n: number): { ok: boolean; fatto: string };
    aggiungiMonete(chi: string, m: Record<string, number>): { ok: boolean; fatto: string };
  };
  /** Energy drain (prove/drenaggio.ts): `n` levels on `id`; its facts. Absent = the set has no `livelli_negativi` (logged). */
  drena?: (id: string, n: number, fatti: string[]) => void;
  /** The timed effects (conditions, bonuses, immunities): absent = they are not applied (logged). */
  attivi?: {
    aggiungi(id: string, e: Extract<EffettoTipato, { tipo: 'condizione' | 'bonus' | 'immunita' }>, fonte: string, livello: number, dadi: FonteDadi): string | null;
    ferito(id: string): string[];
    stabilizza(id: string): boolean;
  };
  log: Logger;
}

/** One application of a list of effects to one target. */
export interface Applicazione {
  effetti: readonly EffettoTipato[];
  bersaglio: string;
  /** Who acts (the caster, the one who drinks), or null for a hazard (trap, fall, poison). */
  autore: string | null;
  /** What it is, for the card and the fact («Cura ferite leggere», «Fossa coperta»). */
  fonte: string;
  /** The caster's level (scaling dice, durations); 1 for hazards. */
  livello: number;
  /** The target's save for half succeeded: damage is halved, rounded down. */
  dimezza?: boolean;
  privata?: boolean;
  /** A PC's own dice for its damage or healing (manual rolls); absent = the Engine's. */
  dadiAutore?: FonteDadi;
}

export interface EsitoEffetti {
  tiri: TiroMostrato[];
  fatti: string[];
  /** Hit points taken and healed in all (for the log and the tests). */
  danno: number;
  cura: number;
}

const pg = (id: string): boolean => !id.startsWith('png_');

/** How the target stands after the change: a PC's numbers, an NPC's words only (the narrator never says an NPC's HP). */
function stato(ctx: ContestoEffetti, id: string): string {
  const p = ctx.stato.puntiFerita(id);
  if (!p) return '';
  const danni = ctx.danni.nome.toLowerCase();
  if (!pg(id)) return salute(p.attuali, p.massimi);
  return p.attuali <= 0 ? testo('prove.salute.set_a_terra', { danni, a_zero: ctx.danni.aZero }) : testo('prove.salute.set', { attuali: p.attuali, danni, massimi: p.massimi });
}

function carta(ctx: ContestoEffetti, a: Applicazione, x: Partial<TiroMostrato>): TiroMostrato {
  // A hazard's card is the victim's (it has no author); a power's is its author's, aimed at the target.
  const chi = a.autore ?? a.bersaglio;
  return {
    id: ctx.stato.nuovoIdTiro(),
    turno: ctx.turno,
    chi,
    nome: ctx.nome(chi),
    di_png: !pg(chi),
    tipo: 'attacco',
    etichetta: a.fonte,
    dadi: [],
    dado: 0,
    vantaggio: null,
    motivo_vantaggio: null,
    modificatore: 0,
    totale: 0,
    contro: { tipo: 'soglia', valore: 0, descrizione: testo('prove.cd.colpisce_sempre') },
    bersaglio: a.autore && a.autore !== a.bersaglio ? { id: a.bersaglio, nome: ctx.nome(a.bersaglio) } : null,
    riuscita: true,
    critico: false,
    fallimento_critico: false,
    danno: null,
    a_terra: false,
    privata: a.privata ?? false,
    avversario: null,
    automatico: true,
    ...x,
  };
}

/** Damage to the target: HP down (never below 0), the card's damage line, the wake-on-injury conditions, the rule at 0. */
function infliggi(ctx: ContestoEffetti, a: Applicazione, f: FormulaDadi, dadi: FonteDadi, tipoDannoId: string | null, out: EsitoEffetti, x: Partial<TiroMostrato> = {}): void {
  const d = tiraDanno(dadi, f, 0, false);
  const totale = a.dimezza ? Math.floor(d.totale / 2) : d.totale;
  const prima = ctx.stato.puntiFerita(a.bersaglio);
  const r = ctx.stato.danneggia(a.bersaglio, totale, false, tipoDannoId);
  const t = carta(ctx, a, { totale, ...x, danno: dannoMostrato({ formula: d.formula, dadi: d.dadi, bonus: d.bonus, totale, tipo: tipoDannoId }) });
  t.a_terra = (ctx.stato.puntiFerita(a.bersaglio)?.attuali ?? 1) <= 0;
  out.tiri.push(t);
  out.danno += totale;
  const meta = a.dimezza ? testo('prove.effetti.dimezzato') : '';
  out.fatti.push(testo('prove.effetti.danno', { fonte: a.fonte, nome: ctx.nome(a.bersaglio), danno: fraseDanno(totale, tipoDannoId ? tipoDanno(tipoDannoId) : null), meta, stato: stato(ctx, a.bersaglio) }));
  ctx.log.info({ bersaglio: a.bersaglio, fonte: a.fonte, formula: d.formula, dadi: d.dadi, totale, dimezza: !!a.dimezza, pf: ctx.stato.puntiFerita(a.bersaglio) }, 'effects: damage applied');
  if (totale > 0) for (const c of ctx.attivi?.ferito(a.bersaglio) ?? []) out.fatti.push(testo('prove.effetti.svegliato', { nome: ctx.nome(a.bersaglio), condizione: c.toLowerCase() }));
  if (r?.a_terra && prima && prima.attuali > 0) ctx.aZero?.(a.bersaglio, out.fatti, out.tiri);
}

/** Apply each effect in order to the target. Never throws: an effect it cannot apply is logged and skipped. */
export function applicaEffetti(a: Applicazione, ctx: ContestoEffetti): EsitoEffetti {
  const out: EsitoEffetti = { tiri: [], fatti: [], danno: 0, cura: 0 };
  const dadiAutore = a.dadiAutore ?? ctx.dadi;
  for (const e of a.effetti) {
    if (ctx.stato.fuoriGioco(a.bersaglio) === 'morto' && e.tipo !== 'cura') continue;
    switch (e.tipo) {
      case 'danno': {
        // As much as the author's current hit points (a breath in some manuals): no dice to roll.
        if (e.pariAiPf) {
          const pf = a.autore ? (ctx.stato.puntiFerita(a.autore)?.attuali ?? 0) : 0;
          infliggi(ctx, a, { numero: 0, facce: 0, bonus: pf }, ctx.dadi, e.tipoDanno, out);
          break;
        }
        const f = formulaAlLivello(e, a.livello);
        // Several missiles of one spell (magic missile): their sum is the same dice, n times.
        const n = e.colpi ? perLivello(e.colpi, a.livello, true) : 1;
        infliggi(ctx, a, { numero: f.numero * n, facce: f.facce, bonus: f.bonus * n }, a.autore ? dadiAutore : ctx.dadi, e.tipoDanno, out);
        break;
      }
      case 'cura': {
        const f = formulaAlLivello(e, a.livello);
        const d = tiraDanno(a.autore ? dadiAutore : ctx.dadi, f, 0, false);
        const prima = ctx.stato.puntiFerita(a.bersaglio);
        const dopo = ctx.stato.curaRegola(a.bersaglio, d.totale);
        if (!prima || !dopo) {
          out.fatti.push(testo('prove.effetti.cura_morto', { nome: ctx.nome(a.bersaglio), fonte: a.fonte }));
          ctx.log.info({ bersaglio: a.bersaglio, fonte: a.fonte }, 'effects: healing on a dead character does nothing (only the Game Master revives)');
          break;
        }
        const curati = dopo.attuali - prima.attuali;
        out.cura += curati;
        out.tiri.push(carta(ctx, a, { tipo: 'prova', bersaglio: a.autore && a.autore !== a.bersaglio ? { id: a.bersaglio, nome: ctx.nome(a.bersaglio) } : null, totale: curati, cura: true, danno: dannoMostrato({ formula: d.formula, dadi: d.dadi, bonus: d.bonus, totale: curati, tipo: null }) }));
        out.fatti.push(testo('prove.effetti.cura', { fonte: a.fonte, nome: ctx.nome(a.bersaglio), n: curati, danni: ctx.danni.nome.toLowerCase(), stato: stato(ctx, a.bersaglio) }));
        if (prima.attuali <= 0 && dopo.attuali > 0) ctx.dopoCura?.(a.bersaglio);
        ctx.log.info({ bersaglio: a.bersaglio, fonte: a.fonte, formula: d.formula, dadi: d.dadi, curati, pf: dopo }, 'effects: healing applied');
        break;
      }
      case 'caduta': {
        const r = ctx.cadute;
        const passi = r ? passiCaduta(r, e.altezza) : 0;
        const altezza = `${e.altezza}${r?.unita ? ` ${r.unita}` : ''}`;
        if (!r || passi === 0) {
          out.fatti.push(testo('prove.effetti.caduta_lieve', { nome: ctx.nome(a.bersaglio), altezza }));
          if (!r) ctx.log.warn({ bersaglio: a.bersaglio, altezza: e.altezza }, 'effects: a fall, but the rule set has no falling table (cadute): no damage');
          break;
        }
        const f = { numero: r.dadi.numero * passi, facce: r.dadi.facce, bonus: r.dadi.bonus * passi };
        infliggi(ctx, { ...a, fonte: testo('prove.effetti.fonte_caduta', { fonte: a.fonte, altezza }) }, f, ctx.dadi, null, out);
        break;
      }
      case 'attacco': {
        // A trap attacks like a monster: d20 + its bonus against the victim's Armor Class (no sheet: it hits).
        const ca = ctx.difesa?.(a.bersaglio) ?? null;
        const d = tiraD20(ctx.dadi, null);
        const totale = d.dado + e.bonus;
        const riuscita = ca === null || d.dado === 20 || (d.dado !== 1 && totale >= ca);
        const x: Partial<TiroMostrato> = { automatico: false, dadi: d.dadi, dado: d.dado, modificatore: e.bonus, totale, contro: { tipo: 'CA', valore: ca ?? 0, descrizione: null }, riuscita, critico: d.dado === 20, fallimento_critico: d.dado === 1 };
        const regola = testo('prove.effetti.regola_attacco', { bonus: e.bonus >= 0 ? `+${e.bonus}` : `−${-e.bonus}`, ca: ca ?? '—', totale });
        if (!riuscita) {
          out.tiri.push(carta(ctx, a, x));
          out.fatti.push(testo('prove.effetti.attacco_mancato', { fonte: a.fonte, nome: ctx.nome(a.bersaglio), regola }));
          break;
        }
        out.fatti.push(testo('prove.effetti.attacco_colpito', { fonte: a.fonte, nome: ctx.nome(a.bersaglio), regola }));
        infliggi(ctx, a, e.dadi, ctx.dadi, null, out, x);
        break;
      }
      case 'morte': {
        const p = ctx.stato.puntiFerita(a.bersaglio);
        if (p) ctx.stato.danneggia(a.bersaglio, p.attuali);
        ctx.stato.segnaUscito(a.bersaglio, 'morto');
        out.fatti.push(testo('prove.effetti.morte', { nome: ctx.nome(a.bersaglio), fonte: a.fonte }));
        ctx.log.info({ bersaglio: a.bersaglio, fonte: a.fonte }, 'effects: save or die, dead');
        break;
      }
      case 'stabilizza': {
        const ok = ctx.attivi?.stabilizza(a.bersaglio) ?? false;
        out.fatti.push(testo(ok ? 'prove.effetti.stabilizzato' : 'prove.effetti.non_serve_stabilizzare', { nome: ctx.nome(a.bersaglio), fonte: a.fonte }));
        break;
      }
      case 'drenaggio': {
        if (!ctx.drena) {
          ctx.log.warn({ bersaglio: a.bersaglio, livelli: e.livelli }, 'effects: energy drain, but the set has no livelli_negativi: skipped');
          break;
        }
        ctx.drena(a.bersaglio, e.livelli, out.fatti);
        break;
      }
      case 'oggetto':
      case 'monete': {
        if (!ctx.inventario) {
          ctx.log.warn({ bersaglio: a.bersaglio, effetto: e.tipo }, 'effects: no inventory here (the set has no catalog), skipped');
          break;
        }
        const r = e.tipo === 'oggetto' ? ctx.inventario.oggetto(a.bersaglio, e.oggetto, e.quante) : ctx.inventario.aggiungiMonete(a.bersaglio, e.monete);
        if (r.fatto) out.fatti.push(r.fatto);
        break;
      }
      case 'condizione':
      case 'bonus':
      case 'immunita': {
        if (!ctx.attivi) {
          ctx.log.warn({ bersaglio: a.bersaglio, effetto: e.tipo }, 'effects: timed effects are not available here, skipped');
          break;
        }
        const fatto = ctx.attivi.aggiungi(a.bersaglio, e, a.fonte, a.livello, a.autore ? dadiAutore : ctx.dadi);
        if (fatto) out.fatti.push(fatto);
        break;
      }
    }
  }
  return out;
}
