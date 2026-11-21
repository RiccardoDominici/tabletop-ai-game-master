/**
 * Combattimento del Motore (docs/combattimento.md), guidato dalla sezione `combattimento:` del set.
 *
 * - Entra in combattimento quando un PG attacca un PNG con la scheda (o un PNG reagisce attaccando),
 *   oppure col pannello del master: PG al tavolo, PNG coinvolti e PNG ostili in scena con la scheda.
 * - Ordine dall'iniziativa del set: individuale (d20 + Destrezza nell'SRD, fissa), per schieramento
 *   (1d6 per parte, B/X, si ritira a ogni round), nessuna (PbtA: niente turni, solo PF e condizioni).
 * - Round = FASI ordinate; in ogni fase gli attori nell'ordine. Il PASSO corrente dice chi tocca:
 *   un passo di PG apre la finestra solo per loro; i passi dei PNG li esegue il Motore da solo
 *   (attacco al PG che li ha colpiti, se no a quello che ha agito per ultimo, se no al primo in piedi).
 * - A 0: condizione «Privo di sensi» e tiri contro la morte (SRD), oppure fuori gioco; morale (B/X).
 * - Fine: nemici a terra o fuggiti, PG tutti a terra, morale fallito, o il master.
 *
 * Tutto deterministico data la FonteDadi; lo stato si salva nella fotografia della sessione.
 */
import type { EsitoMorte } from './fatti-dovuti';
import type { CombattimentoPubblico, TiroMostrato } from '@tabletop-ai-gm/shared';
import type { Logger } from '../logger';
import type { Combattimento, Condizione, Effetto, Fase } from '../regole/combattimento';
import type { FonteDadi } from './dadi';
import type { StatoProve } from './stato';
import { testo } from '../lingua';
import { fraseAttaccoPng } from './testi';

export type Lato = 'pg' | 'png';
export type EsitoCombattente = 'in_gioco' | 'stabile' | 'morto' | 'fuggito';

export interface Partecipante {
  id: string;
  nome: string;
  lato: Lato;
  iniziativa: number | null;
  mod: number;
  /** Condizioni attive; `fino`: il round all'inizio del quale scade (null = finché non si toglie). */
  condizioni: Array<{ id: string; fino: number | null }>;
  tiriMorte: { successi: number; fallimenti: number } | null;
  esito: EsitoCombattente;
  /** L'ultimo PG che lo ha attaccato (bersaglio preferito del PNG). */
  aggressore: string | null;
}

export interface Passo {
  fase: Fase;
  lato: Lato;
  attori: string[];
}

export interface StatoCombattimentoSalvato {
  round: number;
  indice: number;
  partecipanti: Partecipante[];
  primo: Lato;
  passi: Passo[];
  moraleControllato: string[];
  ultimoPg: string | null;
}

/**
 * One attack of an NPC's step: its card and its text; a hit's riders or a special's other cards (the targets' saves and
 * damage: `altri`); `frase` replaces the «X colpisce Y» sentence (a breath: «X usa Soffio.»).
 */
export interface AttaccoDelPng {
  t: TiroMostrato;
  testo: string;
  altri?: TiroMostrato[];
  frase?: string;
}

/** Ciò che il Motore delle prove dà allo scontro (dadi, PF, attacchi coi resolver del set). */
export interface DipendenzeCombattimento {
  regole: Combattimento;
  stato: StatoProve;
  dadi: () => FonteDadi;
  nome: (id: string) => string;
  /**
   * Un PNG attacca un PG nella fase (`png` della fase): carte + testi, già con i danni; vuoto = niente. A monster with
   * several attacks a round (`per_round`, a ghoul's claw, claw, bite) makes them all, each with its card; when the target
   * drops, `prossimo` gives the next one (null = nobody left standing).
   */
  attacca: (png: string, pg: string, fase: Fase, turno: number, prossimo: () => string | null) => Array<AttaccoDelPng> | AttaccoDelPng | null;
  /** Morale del PNG (scheda `morale`), per il set con `fine.morale`. */
  morale: (png: string) => number | null;
  /**
   * An NPC's morale before and after it is engaged (a giant ant: 7, then 12) and whether it surrenders instead of fleeing
   * when it breaks (`si_arrende` on its sheet). Absent or null = `morale` for both, flight.
   */
  moraleDi?: (png: string) => { prima: number; dopo: number; resa: boolean } | null;
  /** A broken NPC surrenders (the set's `fine.morale.resa` condition, for the scene: prove/attivi.ts); its fact. */
  arrende?: (png: string, condizione: string, fatti: string[]) => void;
  /** Whether the table sees the morale roll, a Game Master's roll (`tiri_master`; `morale`: the lowest score read). */
  mostraMorale?: (morale: number) => boolean;
  nuovoIdTiro: () => string;
  /**
   * A PC's own dice for one of the fight's rolls (manual rolls, docs/prove.md §8: initiative, a death save); null =
   * the Engine's. NPC rolls and side rolls (surprise, initiative by sides) never ask for it.
   */
  dadiDelPg?: (pg: string, gruppo: { per: 'iniziativa' | 'morte'; etichetta: string; modificatore?: number; contro?: number; giro?: number }) => FonteDadi | null;
  /**
   * Conditions a character has outside the fight's own (timed effects of powers and hazards, prove/attivi.ts), by id:
   * they count as the fight's (a sleeping guard loses its turn). Absent = none.
   */
  condizioniEsterne?: (id: string) => string[];
  /** A new round began: the timed effects tick (prove/attivi.ts); the facts of what ended go to the narrator. */
  nuovoRound?: (fatti: string[]) => void;
  /**
   * A combatant's own surprise range modifier (a race trait: Basic Fantasy's elves −1, regole/tratti.ts): the side's
   * die is read against each member's range, as the manual says (p. 50). Absent = 0 for everyone.
   */
  sorpresaMod?: (id: string) => number;
  /**
   * A PC's own save for the death rule (`tiri_morte.abilita`, Basic Fantasy p. 188): its number, its bonus and whether
   * the save's naturals count. null = no such save on its sheet (the fixed `cd` then).
   */
  salvezzaMorte?: (id: string, abilita: string) => { contro: number; modificatore: number; naturali: boolean } | null;
  /** A death save made with a dying window (`tiri_morte.finestra`): the window starts (prove/morte.ts); its fact. */
  morente?: (id: string, fatti: string[]) => void;
  /** Every PC is down: nobody can bind the dying ones, so their windows end now (prove/morte.ts). */
  senzaSoccorso?: (fatti: string[]) => void;
  log: Logger;
}

export interface EsitoCombattimento {
  /** Righe di fatto in più per il narratore (turni dei PNG, tiri contro la morte, morale, fine). */
  fatti: string[];
  tiri: TiroMostrato[];
  /** Situazione per il narratore: round, fase, ordine, chi tocca ora. null fuori dal combattimento. */
  intestazione: string | null;
  /** PG da invitare adesso (null = decide il narratore: niente iniziativa o combattimento finito). */
  invitati: string[] | null;
  /** Il combattimento è finito in questo turno (motivo), o null. */
  finito: string | null;
  /** The fight ended in this turn because every PC in it is down, dead or fled (the defeat path, scena/regia.ts). */
  sconfitta?: boolean;
  /** Gli esiti dei tiri contro la morte del turno: fatti che il tavolo deve sentire (prove/fatti-dovuti.ts). */
  morte: Array<{ id: string; nome: string; esito: EsitoMorte }>;
  /** Chi è fuggito in questo turno (morale): lascia la scena, e il tavolo lo deve sentire. */
  fuggiti: Array<{ id: string; nome: string }>;
  /**
   * The turn order just rolled (the fight starts, or a new round re-rolls individual initiative), names first to last:
   * the table hears it from the Engine (scena/regia.ts, annunciaOrdine). Third e2e pass, bug 6: the order was only in
   * the narrator's facts and on the projector's bar, and no table line ever said it. Absent = not rolled in this turn
   * (nor at the Game Master's click just before it: a fight opened from the panel with automatic rolls).
   */
  ordine?: string[];
}

const VUOTO: EsitoCombattimento = { fatti: [], tiri: [], intestazione: null, invitati: null, finito: null, morte: [], fuggiti: [] };

export class GestoreCombattimento {
  private s: StatoCombattimentoSalvato | null = null;
  /** Esiti dei tiri contro la morte di questa chiamata di dopoAzioni (vanno nell'esito). */
  private morte: EsitoCombattimento['morte'] = [];
  /** Fughe di questa chiamata di dopoAzioni (vanno nell'esito). */
  private fuggiti: EsitoCombattimento['fuggiti'] = [];
  /** The order rolled in this call of dopoAzioni (start of the fight, or a new round's individual initiative). */
  private ordineTirato: string[] | null = null;
  /** The combatants of the last fight that ended (until the next one starts). */
  private ultimiPartecipanti: Partecipante[] = [];
  /** Cards rolled outside a step's own list (the morale roll), added to the turn's cards when it closes. */
  private carteInPiu: TiroMostrato[] = [];
  /** The turn being resolved (`dopoAzioni`), for the cards made deep inside it. */
  private turnoInCorso = 0;

  constructor(private readonly d: DipendenzeCombattimento) {}

  get attivo(): boolean {
    return this.s !== null;
  }

  /** The fight's current round (1 = the first), or null outside a fight. */
  get round(): number | null {
    return this.s?.round ?? null;
  }

  /** Con un ordine di turni (iniziativa individuale o per schieramento). */
  get aTurni(): boolean {
    return this.s !== null && this.d.regole.iniziativa.tipo !== 'nessuna';
  }

  /** PG che devono agire adesso (passo corrente, in piedi), o null. */
  turnoDi(): string[] | null {
    if (!this.s || !this.aTurni) return null;
    const p = this.s.passi[this.s.indice];
    return p && p.lato === 'pg' ? p.attori.filter((id) => this.puoAgire(id)) : null;
  }

  private part(id: string): Partecipante | undefined {
    return this.s?.partecipanti.find((p) => p.id === id);
  }

  private cond(id: string): Condizione | undefined {
    return this.d.regole.condizioni.find((c) => c.id === id);
  }

  /** The combatants of a side still standing in the fight (in play, above 0): the reach of a power on «nemici». */
  inPiedi(lato: Lato): string[] {
    return (this.s?.partecipanti ?? []).filter((p) => p.lato === lato && p.esito === 'in_gioco' && !this.d.stato.aTerra(p.id)).map((p) => p.id);
  }

  /**
   * Every combatant of a side in the fight, standing or not; after a fight ends, those of the fight just ended (a fight
   * that starts and ends in one pass: every undead turned at once). The XP ledger reads the defeated (prove/esperienza.ts).
   */
  partecipanti(lato: Lato): string[] {
    return (this.s?.partecipanti ?? this.ultimiPartecipanti).filter((p) => p.lato === lato).map((p) => p.id);
  }

  /** Condizioni attive di un personaggio, per i resolver (prove/condizioni.ts). */
  condizioniDi(id: string): Array<{ nome: string; effetti: Effetto[] }> {
    const p = this.part(id);
    // The timed effects' conditions (prove/attivi.ts) count in and out of the fight, once each.
    const ids = [...new Set([...(p?.condizioni.map((c) => c.id) ?? []), ...(this.d.condizioniEsterne?.(id) ?? [])])];
    return ids.flatMap((c) => {
      const x = this.cond(c);
      return x ? [{ nome: x.nome, effetti: x.effetti }] : [];
    });
  }

  /** Out of the fight by a condition (asleep, charmed): its end and morale count it as down; it does not act. */
  private fuoriPerCondizione(id: string): boolean {
    return !!this.haEffetto(id, 'fuori_combattimento');
  }

  /**
   * The condition that makes a character lose this round (surprise, a stun: effect `perde_turno`), by name; null = none
   * or no fight. The lines of the round must not have it act (final round, attempt 4, PR T11/T13: a surprised Zirrà
   * snapped her fingers and kicked the fire).
   */
  perdeIlTurno(id: string): string | null {
    if (!this.attivo) return null;
    // A condition that ended in this very turn still holds for its narration (final round, attempt 5, CM T9: «Grosso:
    // Sorpreso finisce.» came before the narration, and Grosso's filler line was heard before the new round's order).
    return this.haEffetto(id, 'perde_turno') ?? this.persiNelTurno.get(id) ?? null;
  }

  /** Lose-turn conditions that ended in the turn being resolved (`dopoAzioni`), by character: they hold for its narration. */
  private persiNelTurno = new Map<string, string>();

  private haEffetto(id: string, e: Effetto): string | null {
    return this.condizioniDi(id).find((c) => c.effetti.includes(e))?.nome ?? null;
  }

  private puoAgire(id: string): boolean {
    const p = this.part(id);
    return !!p && p.esito === 'in_gioco' && !this.d.stato.aTerra(id) && !this.haEffetto(id, 'perde_turno');
  }

  aggiungiCondizione(id: string, condizione: string, round: number | null = null): boolean {
    const p = this.part(id);
    if (!p || !this.cond(condizione)) return false;
    p.condizioni = [...p.condizioni.filter((c) => c.id !== condizione), { id: condizione, fino: round === null ? null : this.s!.round + round }];
    return true;
  }

  togliCondizione(id: string, condizione: string): boolean {
    const p = this.part(id);
    if (!p) return false;
    const prima = p.condizioni.length;
    p.condizioni = p.condizioni.filter((c) => c.id !== condizione);
    return p.condizioni.length !== prima;
  }

  // ------------------------------------------------------------------ inizio, ordine, passi

  /**
   * Il combattente esce: morto o fuggito, anche per lo stato delle prove (presenza, catalogo,
   * narratore: prove/stato.ts, fuoriGioco), che resta dopo la fine dello scontro.
   */
  private esce(p: Partecipante, esito: 'morto' | 'fuggito'): void {
    p.esito = esito;
    this.d.stato.segnaUscito(p.id, esito);
    if (esito === 'fuggito') this.fuggiti.push({ id: p.id, nome: p.nome });
    this.d.log.info({ id: p.id, esito }, 'combattimento: esce dallo scontro');
  }

  /**
   * Comincia lo scontro: tira l'iniziativa del set. Restituisce il fatto per il narratore; `dopo`
   * riceve i fatti di chi è già a 0 (l'attacco che ha aperto lo scontro): il morale (B/X).
   */
  inizia(candidati: Array<{ id: string; lato: Lato; mod: number }>, dopo: string[] = [], apre: Lato | null = null): string {
    this.ultimiPartecipanti = [];
    const r = this.d.regole;
    const dadi = this.d.dadi();
    const partecipanti: Partecipante[] = candidati.map((c) => ({
      id: c.id,
      nome: this.d.nome(c.id),
      lato: c.lato,
      mod: c.mod,
      iniziativa: r.iniziativa.tipo === 'individuale' ? this.dadiIniziativa(c.id, c.lato, c.mod, dadi).tira(r.iniziativa.dado) + c.mod : null,
      condizioni: [],
      tiriMorte: null,
      esito: 'in_gioco',
      aggressore: null,
    }));
    if (r.iniziativa.tipo === 'individuale') {
      GestoreCombattimento.ordina(partecipanti, r.iniziativa.pari === 'simultanei');
      this.ordineTirato = partecipanti.map((p) => p.nome);
    }
    this.s = { round: 1, indice: 0, partecipanti, primo: 'pg', passi: [], moraleControllato: [], ultimoPg: null };
    const lati = this.tiraLati();
    this.s.passi = this.costruisciPassi();
    const sorpresa = this.tiraSorpresa(apre);
    // Chi va a 0 prima di cominciare (l'attacco che ha aperto lo scontro) ha già le sue condizioni.
    // La e2e finale: qui il morale si tirava senza i fatti, «CEDONO» si perdeva e chi fuggiva restava.
    for (const p of partecipanti) this.controllaZero(p, dopo);
    const ordine =
      r.iniziativa.tipo === 'individuale'
        ? testo('prove.combattimento.iniziativa', { ordine: partecipanti.map((p) => `${p.nome} ${p.iniziativa}`).join(', ') })
        : r.iniziativa.tipo === 'per_schieramento'
          ? testo('prove.combattimento.iniziativa_schieramento', { pg: lati!.pg, png: lati!.png, primo: testo(this.s.primo === 'pg' ? 'prove.combattimento.agiscono_prima_pg' : 'prove.combattimento.agiscono_prima_png') })
          : testo('prove.combattimento.senza_iniziativa');
    this.d.log.info({ partecipanti: partecipanti.map((p) => ({ id: p.id, lato: p.lato, iniziativa: p.iniziativa })), primo: this.s.primo }, 'combattimento: inizia');
    return [testo('prove.combattimento.inizia', { ordine }), ...sorpresa].join(' ');
  }

  /**
   * Surprise (the set's `combattimento.sorpresa`, B/X): one die for each side that can be surprised — only the side
   * attacked when an attack opened the fight (`apre` is the attacker's side), both when the Game Master opened it. A
   * surprised side's combatants get the set's condition for the first round. Returns the facts for the narrator.
   */
  private tiraSorpresa(apre: Lato | null): string[] {
    const so = this.d.regole.sorpresa;
    const s = this.s!;
    if (!so) return [];
    const dadi = this.d.dadi();
    const fatti: string[] = [];
    const lati: Lato[] = apre === 'pg' ? ['png'] : apre === 'png' ? ['pg'] : ['pg', 'png'];
    const nomeCond = this.cond(so.condizione)?.nome ?? so.condizione;
    for (const lato of lati) {
      const membri = s.partecipanti.filter((p) => p.lato === lato && p.esito === 'in_gioco');
      if (!membri.length) continue;
      const valore = dadi.tira(so.dado);
      // One die per side, read against each member's own range (a trait may lower it: the elf's −1).
      const colti = membri.filter((p) => valore <= so.finoA + (this.d.sorpresaMod?.(p.id) ?? 0));
      const sorpresi = colti.length === membri.length;
      for (const p of colti) this.aggiungiCondizione(p.id, so.condizione, 1);
      this.d.log.info({ lato, dado: `d${so.dado}`, valore, fino_a: so.finoA, sorpresi: colti.map((p) => p.id), chi: membri.map((p) => p.id) }, 'combattimento: sorpresa');
      const chi = testo(lato === 'pg' ? 'prove.combattimento.lato_pg' : 'prove.combattimento.lato_png');
      if (colti.length && !sorpresi) fatti.push(testo('prove.combattimento.sorpresi_alcuni', { chi, valore, dado: so.dado, nomi: colti.map((p) => p.nome).join(', '), condizione: nomeCond.toLowerCase() }));
      else fatti.push(testo(sorpresi ? 'prove.combattimento.sorpresi' : 'prove.combattimento.non_sorpresi', { chi, valore, dado: so.dado, condizione: nomeCond.toLowerCase() }));
    }
    return fatti;
  }

  /** The side of a candidate (null if not among them). */
  private partecipante(candidati: ReadonlyArray<{ id: string; lato: Lato }>, id: string): Lato | null {
    return candidati.find((c) => c.id === id)?.lato ?? null;
  }

  /**
   * Iniziativa individuale: dal più alto; pari: modificatore più alto, poi i PG, poi l'id (deterministico). With
   * simultaneous ties (`pari: simultanei`) the modifier does not break them: the tied PCs come first, then the tied
   * NPCs, who act at that same moment (costruisciPassi, dopoAzioni).
   */
  private static ordina(partecipanti: Partecipante[], simultanei = false): void {
    const lato = (a: Partecipante, b: Partecipante): number => (a.lato === b.lato ? 0 : a.lato === 'pg' ? -1 : 1);
    partecipanti.sort((a, b) => b.iniziativa! - a.iniziativa! || (simultanei ? 0 : b.mod - a.mod) || lato(a, b) || a.id.localeCompare(b.id));
  }

  /**
   * Iniziativa individuale ritirata a ogni round (`ogni_round`, Basic Fantasy: 1d6 + Destrezza a ogni round):
   * prima si tirava una volta sola, e `ogni_round` valeva solo per schieramento. Morti e fuggiti non tirano.
   */
  private ritiraIndividuale(): string {
    const s = this.s!;
    const dadi = this.d.dadi();
    for (const p of s.partecipanti) p.iniziativa = p.esito === 'morto' || p.esito === 'fuggito' ? p.iniziativa : this.dadiIniziativa(p.id, p.lato, p.mod, dadi).tira(this.d.regole.iniziativa.dado) + p.mod;
    GestoreCombattimento.ordina(s.partecipanti, this.d.regole.iniziativa.pari === 'simultanei');
    const vivi = s.partecipanti.filter((p) => p.esito !== 'morto' && p.esito !== 'fuggito');
    this.ordineTirato = vivi.map((p) => p.nome);
    this.d.log.info({ round: s.round, ordine: vivi.map((p) => ({ id: p.id, iniziativa: p.iniziativa })) }, 'combattimento: iniziativa ritirata');
    return testo('prove.combattimento.round_individuale', { round: s.round, ordine: vivi.map((p) => `${p.nome} ${p.iniziativa}`).join(', ') });
  }

  /** The die of one combatant's individual initiative: a PC's own (manual rolls), an NPC's from the Engine. */
  private dadiIniziativa(id: string, lato: Lato, mod: number, motore: FonteDadi): FonteDadi {
    if (lato !== 'pg') return motore;
    return this.d.dadiDelPg?.(id, { per: 'iniziativa', etichetta: testo('prove.richiesta.etichetta_iniziativa'), modificatore: mod, giro: this.s?.round ?? 1 }) ?? motore;
  }

  /** Per schieramento: un dado per parte, pari si ritira (al quinto pari, prima i PG). */
  private tiraLati(): { pg: number; png: number } | null {
    const r = this.d.regole;
    if (r.iniziativa.tipo !== 'per_schieramento' || !this.s) return null;
    const dadi = this.d.dadi();
    let pg = 0;
    let png = 0;
    for (let i = 0; i < 5 && pg === png; i++) {
      pg = dadi.tira(r.iniziativa.dado);
      png = dadi.tira(r.iniziativa.dado);
    }
    this.s.primo = png > pg ? 'png' : 'pg';
    return { pg, png };
  }

  /** I passi del round: fasi × ordine (individuale) o fasi × schieramenti (per schieramento). */
  private costruisciPassi(): Passo[] {
    const s = this.s!;
    const r = this.d.regole;
    const vivi = s.partecipanti.filter((p) => p.esito !== 'morto' && p.esito !== 'fuggito');
    const out: Passo[] = [];
    if (r.iniziativa.tipo === 'nessuna') return out;
    for (const fase of r.fasi) {
      if (r.iniziativa.tipo === 'individuale') {
        // Simultaneous ties: the tied combatants of one side share a step (the tied PCs' window opens for all of them).
        for (const p of vivi) {
          const ultimo = out.at(-1);
          const insieme = r.iniziativa.pari === 'simultanei' && ultimo && ultimo.fase === fase && ultimo.lato === p.lato && this.part(ultimo.attori[0]!)?.iniziativa === p.iniziativa;
          if (insieme) ultimo.attori.push(p.id);
          else out.push({ fase, lato: p.lato, attori: [p.id] });
        }
      } else {
        for (const lato of s.primo === 'pg' ? (['pg', 'png'] as const) : (['png', 'pg'] as const)) {
          const attori = vivi.filter((p) => p.lato === lato).map((p) => p.id);
          if (attori.length) out.push({ fase, lato, attori });
        }
      }
    }
    return out;
  }

  /** Passo dopo; a fine round un round nuovo (iniziativa ritirata se il set lo vuole, condizioni scadute). */
  private avanza(fatti: string[]): void {
    const s = this.s!;
    s.indice += 1;
    if (s.indice < s.passi.length) return;
    s.round += 1;
    s.indice = 0;
    for (const p of s.partecipanti) {
      const scadute = p.condizioni.filter((c) => c.fino !== null && c.fino <= s.round);
      const persa = scadute.map((c) => this.cond(c.id)).find((c) => c?.effetti.includes('perde_turno'));
      if (persa) this.persiNelTurno.set(p.id, persa.nome);
      if (scadute.length) fatti.push(testo('prove.combattimento.finisce', { nome: p.nome, condizioni: scadute.map((c) => this.cond(c.id)?.nome ?? c.id).join(', ') }));
      p.condizioni = p.condizioni.filter((c) => !scadute.includes(c));
    }
    this.d.nuovoRound?.(fatti);
    if (this.d.regole.iniziativa.ogniRound && this.d.regole.iniziativa.tipo === 'individuale') fatti.push(this.ritiraIndividuale());
    else if (this.d.regole.iniziativa.ogniRound) {
      const lati = this.tiraLati();
      if (lati) fatti.push(testo('prove.combattimento.round', { round: s.round, pg: lati.pg, png: lati.png, primo: testo(s.primo === 'pg' ? 'prove.combattimento.prima_pg' : 'prove.combattimento.prima_png') }));
    }
    s.passi = this.costruisciPassi();
  }

  // ------------------------------------------------------------------ dopo le azioni dei PG

  /**
   * Dopo la risoluzione delle azioni del turno: entra in combattimento se c'è stato un attacco,
   * registra chi ha attaccato chi, poi esegue i passi dei PNG (e i tiri contro la morte) fino al
   * prossimo passo di PG in piedi, o alla fine dello scontro.
   */
  dopoAzioni(o: {
    turno: number;
    /** Gli attacchi del turno (PG → PNG e PNG → PG), per entrare in combattimento e per i bersagli. */
    attacchi: Array<{ chi: string; bersaglio: string }>;
    /** PG che hanno agito in questo turno. */
    autori: string[];
    candidati: () => Array<{ id: string; lato: Lato; mod: number }>;
    /**
     * The Game Master opened the fight from the panel with manual rolls (docs/prove.md §8): it starts here, after this
     * turn's actions, as one an attack opens does, so the players' initiative is asked like any of their rolls.
     */
    apri?: boolean;
  }): EsitoCombattimento {
    const fatti: string[] = [];
    const tiri: TiroMostrato[] = [];
    this.morte = [];
    this.persiNelTurno = new Map();
    this.fuggiti = [];
    this.carteInPiu = [];
    this.turnoInCorso = o.turno;
    // An order rolled at the Game Master's click (`inizia` from the panel, automatic rolls) is still to be said: it is
    // kept for this call's result, so the table hears it in the fight's first turn (A3 of docs/da-fare.md).
    let appenaIniziato = false;
    if (!this.s) {
      if (!o.attacchi.length && !o.apri) return { ...VUOTO, morte: [], fuggiti: [] };
      const dopo: string[] = [];
      // The side of whoever struck first: B/X surprise rolls only for the side attacked (the Game Master's fight with
      // no attack: both sides, as from the panel).
      const primo = o.attacchi[0]?.chi;
      const apre: Lato | null = primo ? this.partecipante(o.candidati(), primo) : null;
      fatti.push(this.inizia(o.candidati(), dopo, apre), ...dopo);
      appenaIniziato = true;
    }
    const s = this.s!;
    for (const a of o.attacchi) {
      const b = this.part(a.bersaglio);
      if (b && this.part(a.chi)?.lato === 'pg') b.aggressore = a.chi;
    }
    if (o.autori.length) s.ultimoPg = o.autori.at(-1)!;
    // Simultaneous ties (`pari: simultanei`): the NPCs with the same number as the PC step just played act at that same
    // moment, so one the PCs dropped in this turn still strikes in its tied step (Basic Fantasy p. 51). Read before the
    // fall is recorded; nothing new is saved, the numbers are the participants'.
    const insieme = this.pariDelPassoGiocato(o.attacchi, appenaIniziato);
    for (const p of s.partecipanti) this.controllaZero(p, fatti);
    // Morale when the monsters first meet opposition (a PC's attack or hostile power on one of them, Basic Fantasy
    // p. 57), or when a lone one is down to half its hit points.
    const opposizione = o.attacchi.some((a) => this.part(a.chi)?.lato === 'pg' && this.part(a.bersaglio)?.lato === 'png');
    this.controllaMorale(fatti, opposizione);
    if (!this.aTurni) {
      // Senza iniziativa niente turni: solo la fine dello scontro.
      this.controllaFine(fatti, { turno: o.turno, tiri });
      return this.chiudi(o.turno, fatti, tiri);
    }
    // The PC step just played is consumed; a fight just started runs from its first step. An NPC step at the head was
    // not played by anyone: it runs now. That is the fight the Game Master opened at the click (automatic rolls), whose
    // next window used to skip an NPC first in the order (A3 of docs/da-fare.md).
    if (!appenaIniziato && s.passi[s.indice]?.lato !== 'png') this.avanza(fatti);
    for (let guardia = 0; guardia < 60 && this.s; guardia++) {
      const p = this.s.passi[this.s.indice];
      // A tied NPC dropped at this same moment strikes before the fight can end with its fall.
      if (!(insieme.size && p?.lato === 'png') && this.controllaFine(fatti, { turno: o.turno, tiri })) break;
      if (!p) {
        this.avanza(fatti);
        continue;
      }
      if (p.lato === 'png') {
        for (const id of p.attori) this.turnoPng(id, p.fase, o.turno, fatti, tiri, insieme.has(id));
        insieme.clear();
        this.avanza(fatti);
        continue;
      }
      for (const id of p.attori) this.inizioTurnoPg(id, o.turno, fatti, tiri);
      if (this.controllaFine(fatti, { turno: o.turno, tiri })) break;
      if (p.attori.some((id) => this.puoAgire(id))) break;
      this.avanza(fatti);
    }
    return this.chiudi(o.turno, fatti, tiri);
  }

  private chiudi(turno: number, fatti: string[], tiri: TiroMostrato[]): EsitoCombattimento {
    void turno;
    const { morte, fuggiti } = this;
    tiri.push(...this.carteInPiu);
    this.carteInPiu = [];
    // The order is said at the end of the turn: who died or fled in it since the roll is not in it (final round,
    // attempt 4, CM T24: «Livia muore.», then «Ordine del round: Livia, Nespola, Grosso.»).
    const fuori = new Set((this.s?.partecipanti ?? []).filter((p) => p.esito === 'morto' || p.esito === 'fuggito').map((p) => p.nome));
    const tirato = this.ordineTirato?.filter((n) => !fuori.has(n)) ?? null;
    this.ordineTirato = null;
    const sconfitta = this.sconfittaPg;
    this.sconfittaPg = false;
    if (!this.s) return { fatti, tiri, intestazione: null, invitati: null, finito: fatti.at(-1) ?? testo('prove.combattimento.fine'), morte, fuggiti, ...(sconfitta ? { sconfitta: true } : {}) };
    const invitati = this.turnoDi();
    const ordine = tirato ? { ordine: tirato } : {};
    return { fatti, tiri, intestazione: this.intestazione(), invitati: invitati && invitati.length ? invitati : null, finito: null, morte, fuggiti, ...ordine };
  }

  /**
   * The NPCs that act at the same moment as the PC step about to be consumed (simultaneous ties): those with its
   * initiative number, in the step right after it, that this turn's attacks dropped. Empty with the fixed order.
   */
  private pariDelPassoGiocato(attacchi: ReadonlyArray<{ chi: string; bersaglio: string }>, appenaIniziato: boolean): Set<string> {
    const s = this.s!;
    const passo = s.passi[s.indice];
    const dopo = s.passi[s.indice + 1];
    if (this.d.regole.iniziativa.pari !== 'simultanei' || appenaIniziato || passo?.lato !== 'pg' || dopo?.lato !== 'png' || dopo.fase !== passo.fase) return new Set();
    const numero = this.part(passo.attori[0]!)?.iniziativa;
    const colpiti = new Set(attacchi.filter((a) => passo.attori.includes(a.chi)).map((a) => a.bersaglio));
    return new Set(dopo.attori.filter((id) => {
      const p = this.part(id);
      return !!p && p.iniziativa === numero && p.esito === 'in_gioco' && colpiti.has(id) && this.d.stato.aTerra(id);
    }));
  }

  /**
   * Il PNG agisce da solo nella sua fase: attacca (se la fase lo prevede) il bersaglio scelto. `insieme`: it acts at
   * the same moment as the PCs who dropped it (simultaneous ties), so its fall does not stop this one blow.
   */
  private turnoPng(id: string, fase: Fase, turno: number, fatti: string[], tiri: TiroMostrato[], insieme = false): void {
    const p = this.part(id);
    if (!p || (!insieme && (p.esito !== 'in_gioco' || this.d.stato.aTerra(id)))) return;
    // Falling at this same moment, the condition at zero («Privo di sensi») does not stop the one blow; any other does.
    const perde = insieme ? (p.condizioni.filter((c) => c.id !== this.d.regole.condizioneAZero).map((c) => this.cond(c.id)).find((c) => c?.effetti.includes('perde_turno'))?.nome ?? null) : (this.haEffetto(id, 'perde_turno') ?? this.haEffetto(id, 'fuori_combattimento'));
    if (perde) {
      fatti.push(testo('prove.combattimento.png_non_agisce', { nome: p.nome, condizione: perde.toLowerCase() }));
      return;
    }
    // Its own step in the new round: the condition that ended in this turn no longer holds for the narration.
    this.persiNelTurno.delete(id);
    if (!fase.png) return;
    const bersaglio = this.bersaglioDi(p);
    if (!bersaglio) return;
    const r0 = this.d.attacca(id, bersaglio, fase, turno, () => this.bersaglioDi(p));
    const rs = Array.isArray(r0) ? r0 : r0 ? [r0] : [];
    // Several attacks in one step (a monster's `per_round`): one fact each, numbered, so the narrator tells every blow.
    for (const [i, r] of rs.entries()) {
      tiri.push(r.t, ...(r.altri ?? []));
      const chiave = insieme ? 'prove.combattimento.turno_png_insieme' : rs.length > 1 ? 'prove.combattimento.turno_png_piu' : 'prove.combattimento.turno_png';
      fatti.push(testo(chiave, { nome: p.nome, frase: r.frase ?? fraseAttaccoPng(r.t), dettagli: r.testo, n: i + 1, di: rs.length }));
      // Everyone the attack reached (a breath reaches several; a rider's own cards): who went to 0 now.
      const colpiti = new Set([r.t, ...(r.altri ?? [])].map((t) => t.bersaglio?.id ?? (t.chi !== id ? t.chi : null)).filter((x): x is string => !!x));
      for (const c of colpiti) {
        const b = this.part(c);
        if (b) this.controllaZero(b, fatti);
      }
    }
    if (insieme && rs.length) this.d.log.info({ png: id, bersaglio, iniziativa: p.iniziativa }, 'combat: a tied NPC strikes at the same moment it falls');
    if (rs.length > 1) this.d.log.info({ png: id, attacchi: rs.map((r) => ({ linea: r.t.etichetta, bersaglio: r.t.bersaglio?.id ?? null, riuscita: r.t.riuscita })) }, 'combat: a monster makes its attacks of the round');
  }

  /** Bersaglio del PNG: chi lo ha attaccato, se no il PG che ha agito per ultimo, se no il primo in piedi. */
  private bersaglioDi(p: Partecipante): string | null {
    const ok = (id: string | null): id is string => !!id && this.part(id)?.lato === 'pg' && this.part(id)!.esito === 'in_gioco' && !this.d.stato.aTerra(id);
    if (ok(p.aggressore)) return p.aggressore;
    if (ok(this.s!.ultimoPg)) return this.s!.ultimoPg;
    return this.s!.partecipanti.find((x) => ok(x.id))?.id ?? null;
  }

  /** Inizio del turno di un PG: tiro contro la morte se è a 0 (SRD), o il turno perso per una condizione. */
  private inizioTurnoPg(id: string, turno: number, fatti: string[], tiri: TiroMostrato[]): void {
    const p = this.part(id);
    if (!p || p.esito !== 'in_gioco') return;
    const tm = this.d.regole.danni.tiriMorte;
    if (this.d.stato.aTerra(id) && p.tiriMorte && tm) {
      // The PC's own save when the rule says so (Basic Fantasy: save vs. Death Ray), else the rule's fixed DC.
      const sv = tm.abilita ? (this.d.salvezzaMorte?.(id, tm.abilita) ?? null) : null;
      const contro = sv?.contro ?? tm.cd;
      const mod = sv?.modificatore ?? 0;
      // The dying PC's player rolls it (manual rolls); the number is the rule's, public.
      const dado = (this.d.dadiDelPg?.(id, { per: 'morte', etichetta: testo('prove.combattimento.etichetta_morte'), contro, ...(mod ? { modificatore: mod } : {}) }) ?? this.d.dadi()).tira(20);
      const riuscita = sv?.naturali && dado === 20 ? true : sv?.naturali && dado === 1 ? false : dado + mod >= contro;
      // Il 20 e l'1 naturali solo se il set li ha (SRD sì; Basic Fantasy no).
      const venti = dado === 20 && tm.ventiRialza;
      if (venti) {
        this.d.stato.cura(id, 1);
        p.tiriMorte = null;
        if (this.d.regole.condizioneAZero) this.togliCondizione(id, this.d.regole.condizioneAZero);
      } else if (dado === 1 && tm.unoDoppio) p.tiriMorte.fallimenti += 2;
      else if (riuscita) p.tiriMorte.successi += 1;
      else p.tiriMorte.fallimenti += 1;
      tiri.push(this.cartaMorte(p, dado, riuscita, turno, tm, contro, mod));
      let esito: string;
      let comeVa: EsitoMorte = 'morente';
      if (venti) {
        esito = testo('prove.combattimento.morte_venti');
        comeVa = 'rialzato';
      } else if (p.tiriMorte && p.tiriMorte.fallimenti >= tm.fallimenti) {
        this.esce(p, 'morto');
        // The set's count, not «third»: Basic Fantasy dies at the first failure (run of 15 November).
        esito = testo('prove.combattimento.morte_morto', { n: tm.fallimenti });
        comeVa = 'morto';
      } else if (p.tiriMorte && p.tiriMorte.successi >= tm.successi && tm.finestra && this.d.morente) {
        // Alive, but dying: the window starts, and only binding or healing saves it (prove/morte.ts).
        p.tiriMorte = null;
        esito = testo('prove.combattimento.morte_finestra');
        comeVa = 'morente';
        fatti.push(testo('prove.combattimento.tiro_morte', { nome: p.nome, dado: dado + mod, cd: contro, esito }));
        this.d.morente(id, fatti);
        this.morte.push({ id: p.id, nome: p.nome, esito: comeVa });
        return;
      } else if (p.tiriMorte && p.tiriMorte.successi >= tm.successi) {
        p.esito = 'stabile';
        p.tiriMorte = null;
        esito = testo('prove.combattimento.morte_stabile', { n: tm.successi });
        comeVa = 'stabile';
      } else esito = testo('prove.combattimento.morte_parziale', { esito: testo(riuscita ? 'prove.combattimento.morte_riuscito' : 'prove.combattimento.morte_fallito'), successi: p.tiriMorte!.successi, fallimenti: p.tiriMorte!.fallimenti });
      fatti.push(testo('prove.combattimento.tiro_morte', { nome: p.nome, dado: dado + mod, cd: contro, esito }));
      this.morte.push({ id: p.id, nome: p.nome, esito: comeVa });
      return;
    }
    const perde = this.haEffetto(id, 'perde_turno');
    if (perde && !this.d.stato.aTerra(id)) fatti.push(testo('prove.combattimento.salta_turno', { nome: p.nome, condizione: perde.toLowerCase() }));
  }

  private cartaMorte(p: Partecipante, dado: number, riuscita: boolean, turno: number, tm: NonNullable<Combattimento['danni']['tiriMorte']>, cd = tm.cd, mod = 0): TiroMostrato {
    return {
      id: this.d.nuovoIdTiro(),
      turno,
      chi: p.id,
      nome: p.nome,
      di_png: false,
      tipo: 'salvezza',
      etichetta: testo('prove.combattimento.etichetta_morte'),
      dadi: [dado],
      dado,
      vantaggio: null,
      motivo_vantaggio: null,
      modificatore: mod,
      totale: dado + mod,
      contro: { tipo: 'CD', valore: cd, descrizione: null },
      bersaglio: null,
      riuscita,
      // Sulla carta il 20 e l'1 sono speciali solo se il set dà loro un effetto.
      critico: dado === 20 && tm.ventiRialza,
      fallimento_critico: dado === 1 && tm.unoDoppio,
      danno: null,
      a_terra: true,
      privata: false,
      avversario: null,
    };
  }

  /** Chi è appena andato a 0: condizione del set, tiri contro la morte, oppure fuori gioco o morto. */
  private controllaZero(p: Partecipante, fatti?: string[]): void {
    if (p.esito !== 'in_gioco' || !this.d.stato.aTerra(p.id)) return;
    // Dead by an effect (a poison's save failed: prove/effetti.ts), not just at zero: out of the fight, no death save.
    if (this.d.stato.fuoriGioco(p.id) === 'morto') {
      this.esce(p, 'morto');
      if (p.lato === 'png') this.controllaMorale(fatti ?? []);
      return;
    }
    const r = this.d.regole;
    const cz = r.condizioneAZero;
    if (cz && !p.condizioni.some((c) => c.id === cz)) p.condizioni.push({ id: cz, fino: null });
    if (p.lato === 'pg') {
      if (r.danni.pgAZero === 'tiri_morte' && !p.tiriMorte) p.tiriMorte = { successi: 0, fallimenti: 0 };
      if (r.danni.pgAZero === 'morte') this.esce(p, 'morto');
    } else {
      // Fuori gioco: resta nello scontro a 0 (si vede «a terra»), non agisce più.
      if (r.danni.pngAZero === 'morte') this.esce(p, 'morto');
      this.controllaMorale(fatti ?? []);
    }
  }

  /**
   * Morale (B/X, Basic Fantasy p. 57). When: the set's `fine.quando` — the first opposition (a PC attacks one of them),
   * the first of them down (the reading before R4, and `morale: true`'s), half of them down or a lone one at half its
   * hit points; each once a fight. One 2d6 for the side, the Game Master's roll (hidden unless `tiri_master` shows it),
   * read against each NPC's own morale — its `prima` at the fight's first check, `dopo` later (a giant ant's 7, then
   * 12); 12 never fails. Higher breaks: it flees, or with `si_arrende` and the set's `resa` condition it surrenders
   * (out of the fight for the scene). Asleep, charmed or held count as down.
   */
  private controllaMorale(fatti: string[], opposizione = false): void {
    const s = this.s;
    if (!s || !this.d.regole.fine.morale) return;
    const quando = this.d.regole.fine.quando ?? ['primo_caduto', 'meta'];
    const png = s.partecipanti.filter((p) => p.lato === 'png');
    const giu = (p: Partecipante): boolean => p.esito === 'morto' || p.esito === 'fuggito' || this.d.stato.aTerra(p.id) || this.fuoriPerCondizione(p.id);
    const caduti = png.filter(giu).length;
    const vivi = png.filter((p) => !giu(p));
    if (!vivi.length) return;
    const fatto = (k: string): boolean => s.moraleControllato.includes(k);
    const pf = this.d.stato.puntiFerita(vivi[0]!.id);
    const meta = png.length > 1 ? caduti * 2 >= png.length : !!pf && pf.attuali * 2 <= pf.massimi;
    const soglia =
      opposizione && quando.includes('prima_opposizione') && !fatto('opposizione') ? 'opposizione'
      : quando.includes('primo_caduto') && caduti >= 1 && !fatto('primo') ? 'primo'
      : quando.includes('meta') && meta && !fatto('meta') ? 'meta'
      : null;
    if (!soglia) return;
    const primoControllo = !s.moraleControllato.length;
    s.moraleControllato.push(soglia);
    const dadi = this.d.dadi();
    const a = dadi.tira(6);
    const b = dadi.tira(6);
    const tiro = a + b;
    const voci = vivi.map((p) => {
      const m = this.d.moraleDi?.(p.id) ?? null;
      const valore = m ? (primoControllo ? m.prima : m.dopo) : (this.d.morale(p.id) ?? 7);
      return { p, valore, resa: !!m?.resa && !!this.d.regole.fine.resa };
    });
    const cedono = voci.filter((x) => tiro > x.valore);
    const tengono = voci.filter((x) => tiro <= x.valore);
    // The card: the Game Master's roll; the lowest morale is the number it is read against on the panel.
    const minimo = Math.min(...voci.map((x) => x.valore));
    const carta: TiroMostrato = { id: this.d.nuovoIdTiro(), turno: this.turnoInCorso, chi: vivi[0]!.id, nome: testo('prove.combattimento.morale_chi'), di_png: true, tipo: 'prova', etichetta: testo('prove.combattimento.morale_etichetta'), dadi: [a, b], dado: tiro, vantaggio: null, motivo_vantaggio: null, modificatore: 0, totale: tiro, contro: { tipo: 'soglia', valore: minimo, descrizione: null }, bersaglio: null, riuscita: !cedono.length, critico: false, fallimento_critico: false, danno: null, a_terra: false, privata: false, avversario: null, risoluzione: 'sotto_soglia', facce: 6, regola: testo('prove.combattimento.morale_regola', { tiro, morale: minimo }) };
    if (!(this.d.mostraMorale?.(minimo) ?? false)) carta.nascosta = true;
    this.carteInPiu.push(carta);
    this.d.log.info({ quando: soglia, tiro, morale: voci.map((x) => ({ id: x.p.id, morale: x.valore })), cedono: cedono.map((x) => x.p.id), mostrata: !carta.nascosta }, 'combat: morale checked');
    const uniforme = voci.every((x) => x.valore === voci[0]!.valore) && !cedono.some((x) => x.resa);
    if (!cedono.length) {
      fatti.push(uniforme ? testo('prove.combattimento.morale_tengono', { tiro, morale: minimo }) : testo('prove.combattimento.morale_misto', { tiro, tengono: testo('prove.combattimento.morale_tengono_chi', { nomi: tengono.map((x) => `${x.p.nome} (${x.valore})`).join(', ') }), cedono: '', arresi: '' }));
      return;
    }
    const fuggono = cedono.filter((x) => !x.resa);
    const arresi = cedono.filter((x) => x.resa);
    for (const x of fuggono) this.esce(x.p, 'fuggito');
    for (const x of arresi) this.d.arrende?.(x.p.id, this.d.regole.fine.resa!, fatti);
    if (uniforme) fatti.push(testo('prove.combattimento.morale_cedono', { tiro, morale: minimo, nomi: fuggono.map((x) => x.p.nome).join(', ') }));
    else
      fatti.push(
        testo('prove.combattimento.morale_misto', {
          tiro,
          tengono: tengono.length ? testo('prove.combattimento.morale_tengono_chi', { nomi: tengono.map((x) => `${x.p.nome} (${x.valore})`).join(', ') }) : '',
          cedono: fuggono.length ? testo('prove.combattimento.morale_fuggono_chi', { nomi: fuggono.map((x) => `${x.p.nome} (${x.valore})`).join(', ') }) : '',
          arresi: arresi.length ? testo('prove.combattimento.morale_arresi_chi', { nomi: arresi.map((x) => `${x.p.nome} (${x.valore})`).join(', ') }) : '',
        }),
      );
  }

  /** Set when the fight ends because every PC in it is out; read (and cleared) by chiudi. */
  private sconfittaPg = false;

  /** Fine dello scontro: nemici fuori combattimento, o PG tutti a terra. true se è finito. */
  private controllaFine(fatti: string[], tiriDelTurno?: { turno: number; tiri: TiroMostrato[] }): boolean {
    const s = this.s;
    if (!s) return true;
    const fuori = (p: Partecipante): boolean => p.esito !== 'in_gioco' || this.d.stato.aTerra(p.id) || this.fuoriPerCondizione(p.id);
    const png = s.partecipanti.filter((p) => p.lato === 'png');
    const pg = s.partecipanti.filter((p) => p.lato === 'pg');
    if (png.length && png.every(fuori)) return this.termina(testo(png.some((p) => p.esito === 'fuggito') ? 'prove.combattimento.fine_fuggiti' : 'prove.combattimento.fine_nemici'), fatti);
    if (pg.length && pg.every(fuori)) {
      if (tiriDelTurno) this.morteSenzaSoccorso(pg, tiriDelTurno.turno, fatti, tiriDelTurno.tiri);
      // A natural 20 (SRD) puts a PC back on its feet with 1 HP: then the fight goes on.
      if (pg.every(fuori)) {
        this.sconfittaPg = true;
        return this.termina(testo('prove.combattimento.fine_pg'), fatti);
      }
    }
    return false;
  }

  /**
   * Every PC is down: nobody can help the dying ones, so their death saves are rolled now, to the end (stable or
   * dead). Before, the fight ended with them dying and no rule ever rolled again (SRD run of 15 November).
   */
  private morteSenzaSoccorso(pg: Partecipante[], turno: number, fatti: string[], tiri: TiroMostrato[]): void {
    const morenti = pg.filter((p) => p.esito === 'in_gioco' && p.tiriMorte && this.d.stato.aTerra(p.id));
    if (!morenti.length) {
      // Only dying windows (Basic Fantasy), no saves left to roll: nobody can bind them now.
      this.d.senzaSoccorso?.(fatti);
      return;
    }
    fatti.push(testo('prove.combattimento.morte_senza_soccorso'));
    for (const p of morenti) {
      for (let i = 0; i < 10 && p.esito === 'in_gioco' && p.tiriMorte && this.d.stato.aTerra(p.id); i++) this.inizioTurnoPg(p.id, turno, fatti, tiri);
    }
    // A dying window (Basic Fantasy) cannot be saved by anyone now: it ends.
    this.d.senzaSoccorso?.(fatti);
    this.d.log.info({ morenti: morenti.map((p) => ({ id: p.id, esito: p.esito, pf: this.d.stato.puntiFerita(p.id)?.attuali })) }, 'combattimento: every PC down, the death saves rolled to the end');
  }

  /**
   * The enemy a PC's attack with no target named goes to (prove/classificatore-regole.ts): `preferito` (its last
   * target) if it is still in the fight and standing, else the first enemy standing in the turn order; null = none, or
   * no fight.
   */
  bersaglioImplicito(pg: string, preferito: string | null): string | null {
    const s = this.s;
    if (!s || this.part(pg)?.lato !== 'pg') return null;
    const inPiedi = s.partecipanti.filter((p) => p.lato === 'png' && p.esito === 'in_gioco' && !this.d.stato.aTerra(p.id));
    return inPiedi.find((p) => p.id === preferito)?.id ?? inPiedi.find((p) => p.aggressore === pg)?.id ?? inPiedi[0]?.id ?? null;
  }

  /** Fine dello scontro (anche dal master). Le condizioni a 0 restano; le altre finiscono. */
  termina(motivo: string, fatti: string[] = []): true {
    if (this.s) {
      for (const p of this.s.partecipanti) p.condizioni = p.condizioni.filter((c) => c.id === this.d.regole.condizioneAZero && this.d.stato.aTerra(p.id));
      this.d.log.info({ motivo, round: this.s.round }, 'combattimento: finito');
    }
    fatti.push(testo('prove.combattimento.finito', { motivo }));
    this.ultimiPartecipanti = this.s ? [...this.s.partecipanti] : [];
    this.s = null;
    this.ordineTirato = null;
    return true;
  }

  /** The dying window ran out (prove/morte.ts): the PC dies, in the fight too. */
  segnaMorto(id: string): void {
    const p = this.part(id);
    if (p && p.esito !== 'morto') this.esce(p, 'morto');
    else if (!p) this.d.stato.segnaUscito(id, 'morto');
  }

  /** Bound (a power with `stabilizza`): stable at 0, no more death saves. False if it was not down in this fight. */
  stabilizza(id: string): boolean {
    const p = this.part(id);
    if (!p || p.esito !== 'in_gioco' || !this.d.stato.aTerra(id)) return false;
    p.tiriMorte = null;
    p.esito = 'stabile';
    return true;
  }

  /** Il master cambia i PF: chi torna sopra 0 si rialza (niente più tiri contro la morte). */
  dopoCura(id: string): void {
    const p = this.part(id);
    if (!p || this.d.stato.aTerra(id)) return;
    p.tiriMorte = null;
    if (p.esito === 'stabile') p.esito = 'in_gioco';
    if (this.d.regole.condizioneAZero) this.togliCondizione(id, this.d.regole.condizioneAZero);
  }

  // ------------------------------------------------------------------ narratore e schermi

  private intestazione(): string {
    const s = this.s!;
    const r = this.d.regole;
    if (r.iniziativa.tipo === 'nessuna') return testo('prove.combattimento.intestazione_senza');
    const p = s.passi[s.indice];
    const fase = r.fasi.length > 1 && p ? testo('prove.combattimento.intestazione_fase', { fase: p.fase.nome }) : '';
    const ordine = r.iniziativa.tipo === 'individuale' ? testo('prove.combattimento.intestazione_ordine', { ordine: s.partecipanti.filter((x) => x.esito !== 'morto' && x.esito !== 'fuggito').map((x) => x.nome).join(', ') }) : '';
    const ora = this.turnoDi() ?? [];
    const tocca = ora.length ? testo('prove.combattimento.intestazione_tocca', { chi: ora.map((id) => `${this.d.nome(id)} (${id})`).join(', '), pronome: testo(ora.length > 1 ? 'prove.combattimento.loro' : 'prove.combattimento.lui_o_lei') }) : '';
    return testo('prove.combattimento.intestazione', { round: s.round, fase, ordine, tocca });
  }

  vista(pf: (id: string) => { attuali: number; massimi: number } | null): CombattimentoPubblico | null {
    const s = this.s;
    if (!s) return null;
    const r = this.d.regole;
    const ora = new Set(this.turnoDi() ?? []);
    const passo = s.passi[s.indice];
    // By sides, the side acting first this round comes first on the bar (the live check of A2 showed the PCs listed
    // first in a round the NPCs led); individual initiative is already sorted.
    const inOrdine = r.iniziativa.tipo === 'per_schieramento' ? [...s.partecipanti].sort((a, b) => Number(a.lato !== s.primo) - Number(b.lato !== s.primo)) : s.partecipanti;
    return {
      round: s.round,
      fase: r.fasi.length > 1 && passo ? passo.fase.nome : null,
      iniziativa: r.iniziativa.tipo,
      combattenti: inOrdine.map((p) => ({
        id: p.id,
        nome: p.nome,
        di_png: p.lato === 'png',
        iniziativa: p.iniziativa,
        corrente: ora.has(p.id) || (passo?.lato === 'png' && passo.attori.includes(p.id)),
        pf: pf(p.id),
        condizioni: [...new Set([...p.condizioni.map((c) => c.id), ...(this.d.condizioniEsterne?.(p.id) ?? [])])].flatMap((c) => {
          const x = this.cond(c);
          return x ? [{ id: x.id, nome: x.nome, icona: x.icona }] : [];
        }),
        stato: p.esito === 'in_gioco' && this.d.stato.aTerra(p.id) ? 'a_terra' : p.esito,
        tiri_morte: p.tiriMorte ? { ...p.tiriMorte } : null,
      })),
      turno_di: [...ora],
      azioni: r.azioni.map((a) => ({ nome: a.nome, quante: a.quante })),
    };
  }

  esporta(): StatoCombattimentoSalvato | null {
    return this.s ? structuredClone(this.s) : null;
  }

  importa(s: StatoCombattimentoSalvato | null | undefined): void {
    this.s = s ? structuredClone(s) : null;
  }
}
