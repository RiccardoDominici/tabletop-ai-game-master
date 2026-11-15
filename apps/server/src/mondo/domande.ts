/**
 * World questions and NPCs' own checks (docs/prove.md §9): an uncertain fact a scene leaves to chance — is the guard
 * awake? does the miller notice the PC creeping behind him? — written in the scene sheet with the fact that asks it
 * (the gate grammar of `avanza_quando`, docs/mondo.md §2) and either its odds (a die) or an NPC's own check (its sheet,
 * through the set's resolver). When the fact happens in that scene the Engine rolls through the Game Master's roll path
 * (hidden by default, sometimes shown, `regole.tiri_master`), never the model. The answer is canon for the rest of the
 * session: the narrator gets it as a line of the world's section, and the question is never asked again.
 *
 *   scene/<id>.yaml →
 *     domande:
 *       - id: d_guardia_sveglia
 *         domanda: "La guardia alla porta è sveglia?"     # the Game Master's words (panel, log): never said at the table
 *         quando: azione                                  # a fact, with its keys: temi, ids, turni, prove
 *         temi: [guardia, porta]
 *         tiro: {dado: 6, almeno: 3}                       # «yes» on 3+ (visibile: true shows it anyway) — or:
 *         prova_png: {png: png_guardia, prova: abilita:percezione, difficolta: media}   # the NPC's check
 *         se_si: "La guardia è sveglia e guarda la strada."
 *         se_no: "La guardia sonnecchia sullo sgabello."
 *
 * Pure logic over the facts the world receives: the director's hooks roll (mondo/tiri.ts, prove/tiri-master.ts).
 */
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { Logger } from '../logger';
import { apre, portaDa, type FattoDelGioco, type Porta } from './porte';
import type { EsitoTiroMondo, RichiestaTiroMondo } from './tiri';

/** An NPC's own check, as the scene writes it: the catalogue id of what is rolled and the set's difficulty. */
export interface ProvaDelPng {
  png: string;
  /** «abilita:percezione», «caratteristica:forza», «salvezza:destrezza» (the ids of the panel's «Chiedi una prova»). */
  prova: string;
  /** An id of the set's difficulty scale; null = the set's default. */
  difficolta: string | null;
  visibile: boolean;
}

export interface DomandaDelMondo {
  id: string;
  scena: string;
  domanda: string;
  /** When it is asked: a fact of the gate grammar (the gate's `orologio` is the question's id). */
  porta: Porta;
  /** The odds of «yes» (a die), or null when an NPC's check answers. */
  tiro: { dado: number; almeno: number; visibile: boolean } | null;
  prova: ProvaDelPng | null;
  si: string;
  no: string;
}

/** The request of an NPC's own check to the Game Master's roll path. */
export interface RichiestaProvaPng extends ProvaDelPng {
  origine: string;
  motivo: string;
  turno: number;
}

/** An answer, as the director gives it to the narrator. */
export interface RispostaDelMondo {
  id: string;
  turno: number;
  si: boolean;
  /** The fact the narrator gets (the sheet's `se_si` or `se_no`). */
  fatto: string;
}

const testoDi = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** One question of a scene sheet, or null (logged through `avvisa`) when the Engine cannot read it. */
export function domandaDa(scena: string, d: DatiYaml, avvisa: (m: string) => void): DomandaDelMondo | null {
  const id = testoDi(d['id']);
  const dove = `${scena}: domande[${id || '?'}]`;
  if (!id) {
    avvisa(`${dove}: a question without id, ignored`);
    return null;
  }
  // The gate's keys are the question's own (tiro included: the odds of «yes»).
  const { prova_png: _p, se_si: _s, se_no: _n, domanda: _d, id: _i, ...gate } = d;
  const porta = portaDa(id, 0, gate, (m) => avvisa(`${dove}: ${m}`));
  if (!porta) {
    avvisa(`${dove}: no readable «quando»: ignored`);
    return null;
  }
  const si = testoDi(d['se_si']);
  const no = testoDi(d['se_no']);
  if (!si || !no) {
    avvisa(`${dove}: se_si and se_no are both needed (the narrator must get an answer either way): ignored`);
    return null;
  }
  const pp = d['prova_png'];
  let prova: ProvaDelPng | null = null;
  if (pp && typeof pp === 'object' && !Array.isArray(pp)) {
    const x = pp as DatiYaml;
    const png = testoDi(x['png']);
    const cosa = testoDi(x['prova']);
    if (png && cosa) prova = { png, prova: cosa, difficolta: testoDi(x['difficolta']) || null, visibile: x['visibile'] === true };
  }
  const tiro = porta.tiro;
  if ((tiro === null) === (prova === null)) {
    avvisa(`${dove}: exactly one of tiro {dado, almeno} or prova_png {png, prova}: ignored`);
    return null;
  }
  return { id, scena, domanda: testoDi(d['domanda']) || id, porta: { ...porta, tiro: null }, tiro, prova, si, no };
}

/** Every question of the campaign's scene sheets. */
export function domandeDellaCampagna(c: Campagna, avvisa: (m: string) => void = () => {}): DomandaDelMondo[] {
  const out: DomandaDelMondo[] = [];
  for (const s of c.scene) {
    const grezze = s.dati['domande'];
    if (!Array.isArray(grezze)) continue;
    for (const g of grezze) {
      if (!g || typeof g !== 'object' || Array.isArray(g)) continue;
      const q = domandaDa(s.id, g as DatiYaml, avvisa);
      if (!q) continue;
      if (out.some((x) => x.id === q.id)) avvisa(`${s.id}: domande[${q.id}] repeated, the first one counts`);
      else out.push(q);
    }
  }
  return out;
}

export interface OpzioniDomande {
  /** The world's roll hook (Game Master side): the odds of a question. */
  tira: (r: RichiestaTiroMondo) => EsitoTiroMondo;
  /** An NPC's own check (the set's resolver with its sheet); null = it cannot be rolled (no sheet, no dice, NPC down). */
  provaDelPng?: (r: RichiestaProvaPng) => EsitoTiroMondo | null;
  log: Logger;
}

/** The questions of the campaign in play: which are answered, and the answers still to give the narrator. */
export class DomandeInGioco {
  private readonly risposte = new Map<string, RispostaDelMondo>();
  private daDare: RispostaDelMondo[] = [];

  constructor(
    readonly domande: readonly DomandaDelMondo[],
    private readonly o: OpzioniDomande,
  ) {}

  /**
   * The facts of one moment in scene `scena`: each open question of that scene whose fact happened is rolled once,
   * and its answer queued for the narrator. A question that cannot be rolled now (an NPC's check without a sheet or
   * dice) stays open and is logged: the model never answers it instead.
   */
  fatti(scena: string, fatti: readonly FattoDelGioco[], turno: number): RispostaDelMondo[] {
    const nuove: RispostaDelMondo[] = [];
    for (const q of this.domande) {
      if (q.scena !== scena || this.risposte.has(q.id) || !fatti.some((f) => apre(q.porta, f))) continue;
      const base = { origine: q.id, motivo: q.domanda, turno };
      const esito = q.tiro ? this.o.tira({ ...base, ...q.tiro }) : (this.o.provaDelPng?.({ ...base, ...q.prova! }) ?? null);
      if (!esito) {
        this.o.log.warn({ turno, domanda: q.id, png: q.prova?.png }, 'world: question not rolled (the NPC has no sheet or no dice), it stays open');
        continue;
      }
      const r: RispostaDelMondo = { id: q.id, turno, si: esito.riuscito, fatto: esito.riuscito ? q.si : q.no };
      this.risposte.set(q.id, r);
      this.daDare.push(r);
      nuove.push(r);
      this.o.log.info({ turno, domanda: q.id, scena, si: r.si, valore: esito.valore, dado: `d${esito.dado}`, mostrato: esito.visibile }, 'world: question answered by the dice');
    }
    return nuove;
  }

  /** The answers not yet given to the narrator (the director puts them in the next message). */
  prendi(): RispostaDelMondo[] {
    const out = this.daDare;
    this.daDare = [];
    return out;
  }

  /** Every answer of the session (panel, log between sessions). */
  date(): RispostaDelMondo[] {
    return [...this.risposte.values()];
  }

  esporta(): { risposte: RispostaDelMondo[]; daDare: RispostaDelMondo[] } {
    return { risposte: this.date().map((r) => ({ ...r })), daDare: this.daDare.map((r) => ({ ...r })) };
  }

  importa(s: { risposte?: RispostaDelMondo[]; daDare?: RispostaDelMondo[] } | undefined): void {
    this.risposte.clear();
    for (const r of s?.risposte ?? []) if (typeof r?.id === 'string') this.risposte.set(r.id, { ...r });
    this.daDare = (s?.daDare ?? []).filter((r) => typeof r?.id === 'string').map((r) => ({ ...r }));
  }
}
