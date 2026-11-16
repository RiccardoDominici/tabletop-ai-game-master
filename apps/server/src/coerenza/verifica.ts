/**
 * The coherence checker (docs/coerenza.md §3): every sentence of a turn, before the voice, through one pipeline of
 * named rules, in a fixed order. Each rule wraps a guard that already existed (its word lists and its tests stay where
 * they were); what is new is that they share one interface, one order, one decision per sentence and one record per
 * violation: `{regola, frase, azione}`, logged («coerenza: violazione»), written to the narration log and counted per
 * rule by the run measures, so a leak that a rule caught can no longer leave no trace.
 *
 * Rules, in order (each stops the pipeline when it drops, replaces or moves the sentence, except R-numeri which only
 * rewrites it):
 * - R-numeri: rule numbers aloud (HP, AC, DC) are taken out (narrazione/numeri-regole.ts);
 * - R-esito / R-fuori: a narrator sentence against the turn's cards, or about someone out of play acting
 *   (narrazione/guardia-esiti.ts, guardia-fuori.ts): the Engine's line, once per turn;
 * - R-assente: a line of an NPC not in the scene is dropped;
 * - R-finzione: a sentence out of the fiction (narrazione/finzione.ts) is dropped;
 * - R-privato: a public sentence that tells a private action or answers it goes to that PC's phone (narrazione/privato.ts);
 * - R-segreto: a secret still hidden goes to the phone of who asked in private, or the NPC's deflection replaces the line;
 * - R-rifiuto: an NPC who refused after a failed social check does not give in: its refusal replaces the line;
 * - R-ripetuta: a sentence the table heard word for word in the last turns is dropped.
 * The repertoire's lines (mode B, the local minimal reader) go through the rules that judge facts, R-esito and R-fuori:
 * a prewritten line can contradict the state too. Pure logic around the closures the director builds for the turn.
 */
import { ID_NARRATORE } from '../campagna/tipi';
import type { CorrezioneEsito } from '../narrazione/guardia-esiti';
import type { EsitoGuardiaSegreti } from '../narrazione/guardia-segreti';
import { togliNumeriRegole } from '../narrazione/numeri-regole';
import { normalizza } from '../azioni/regole';

export type IdRegola = 'R-numeri' | 'R-esito' | 'R-fuori' | 'R-inesistente' | 'R-assente' | 'R-finzione' | 'R-privato' | 'R-segreto' | 'R-rifiuto' | 'R-ripetuta' | 'R-dovuto';
export const REGOLE: readonly IdRegola[] = ['R-numeri', 'R-esito', 'R-fuori', 'R-inesistente', 'R-assente', 'R-finzione', 'R-privato', 'R-segreto', 'R-rifiuto', 'R-ripetuta', 'R-dovuto'];

/** What the checker did with the sentence. */
export type AzioneViolazione = 'riscritta' | 'sostituita' | 'tolta' | 'spostata' | 'aggiunta' | 'riparata' | 'osservata';

export interface Violazione {
  turno: number;
  regola: IdRegola;
  /** Who said it: 'narratore' or an NPC id. */
  etichetta: string;
  frase: string;
  azione: AzioneViolazione;
  /** The sentence(s) said instead, for `sostituita`/`aggiunta`. */
  sostituto?: string[];
  /** The PC whose phone got it, for `spostata`. */
  id_pg?: string;
  /** A prewritten line of the repertoire (its id), not an improvised sentence. */
  battuta?: string;
  dettaglio?: Record<string, unknown>;
}

/** The guards of the turn, as the director builds them (each optional: absent = that rule does not apply). */
export interface RegoleTurno {
  turno: number;
  /** `prescritta`: a repertoire row (some rules judge only the improvised narration). */
  correggiEsito?: (testo: string, opz?: { prescritta?: boolean }) => CorrezioneEsito;
  /** NPCs in the scene who can speak; with `idPng`, a line of any other NPC is dropped. */
  presenti?: ReadonlySet<string>;
  idPng: ReadonlySet<string>;
  scartaFrase?: (testo: string) => string | null;
  spostaPrivata?: (testo: string, segmento: number, etichetta: string) => { id_pg: string; comuni: string[] } | null;
  guardiaSegreti?: (etichetta: string, testo: string) => EsitoGuardiaSegreti | null;
  rifiutoDopoProva?: (etichetta: string, testo: string) => Array<{ etichetta: string; testo: string }> | null;
  giàSentite?: ReadonlySet<string>;
  /** What this turn's earlier call already said (the repair call of mode B): a repeat of it is dropped, names or not. */
  detteNelTurno?: ReadonlySet<string>;
  /** The PCs' names (normalised as `frasePerRipetizione`): a sentence that names one is never a repetition. */
  nomiPg: readonly string[];
  /**
   * The Engine lines said in this turn, shared by the turn's calls (the answer and its repair) and by the yes/no
   * judge's lines and opener: each line once a turn. Absent: this call's own set.
   */
  lineeDette?: Set<string>;
}

export interface FraseDaVerificare {
  etichetta: string;
  testo: string;
  voce: string;
  segmento: number;
  /** Already private (a `[privato pg_x]` line). */
  privato?: string;
  /**
   * The player's own words, attributed («Livia dice: «…»», the minimal reader's announcement): not the narrator's
   * assertion, so the fact rules (R-esito, R-fuori, R-inesistente) and R-numeri do not judge it.
   */
  attribuita?: boolean;
}

export type Decisione =
  | {
      tipo: 'dici';
      testo: string;
      voce: string;
      privato?: string;
      /**
       * The sentence broke a fact rule and `testo` is the Engine's line: the director may ask the model for a targeted
       * repair of `originale` (docs/coerenza.md §3) and, if the repair passes `confermaRiparata`, say it instead.
       */
      riparabile?: { regola: IdRegola; originale: string; motivo: string };
    }
  | { tipo: 'togli' }
  | { tipo: 'sostituisci'; righe: Array<{ etichetta: string; testo: string }> };

/** A sentence as the word-for-word repetition check compares it: lower case, no accents, no punctuation. */
export function frasePerRipetizione(t: string): string {
  return normalizza(t).replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

const REGOLA_DI_MOTIVO: Record<NonNullable<CorrezioneEsito>['motivo'], IdRegola> = {
  colpo_contrario: 'R-esito',
  caduta_senza_fatto: 'R-esito',
  fuori_gioco_agisce: 'R-fuori',
  creatura_inesistente: 'R-inesistente',
  colpo_assorbito: 'R-esito',
  // An unnamed attack or flight whose actor, by the cards, is out of play (coerenza/attori.ts): R-fuori's line.
  attore_implicito: 'R-fuori',
};

/** The checker of one narration call (the answer, or its repair): it remembers what it has already replaced or said. */
export class VerificaTurno {
  /** Engine lines that already replaced a sentence in this turn (each is said once). */
  private readonly sostituti: Set<string>;
  /** Sentences said at the table in this call (normalised), for R-ripetuta. */
  private readonly detteOra = new Set<string>();
  /** Lines stopped by R-segreto: the rest of the line is not said. */
  private readonly segmentiFermati = new Set<number>();

  constructor(
    private readonly r: RegoleTurno,
    private readonly segnala: (v: Violazione) => void,
  ) {
    this.sostituti = r.lineeDette ?? new Set();
  }

  /**
   * An Engine line said outside the rules (the yes/no judge's, or its opener): false if this turn already said it
   * (the caller drops the sentence instead), else it counts as said for the rules too.
   */
  segnaLinea(testo: string): boolean {
    if (this.sostituti.has(testo)) return false;
    this.sostituti.add(testo);
    return true;
  }

  private viola(v: Omit<Violazione, 'turno'>): void {
    this.segnala({ turno: this.r.turno, ...v });
  }

  /** The decision for one improvised sentence. `e.testo` and `e.voce` are not changed: the decision carries the text. */
  verifica(e: FraseDaVerificare): Decisione {
    let testo = e.testo;
    let voce = e.voce;
    const senzaNumeri = e.attribuita ? { testo, tolti: [] as string[] } : togliNumeriRegole(testo);
    if (senzaNumeri.tolti.length) {
      this.viola({ regola: 'R-numeri', etichetta: e.etichetta, frase: testo, azione: 'riscritta', sostituto: [senzaNumeri.testo], dettaglio: { tolti: senzaNumeri.tolti } });
      testo = senzaNumeri.testo;
      voce = togliNumeriRegole(voce).testo;
    }
    const correzione = e.etichetta === ID_NARRATORE && !e.attribuita ? (this.r.correggiEsito?.(testo) ?? null) : null;
    let corretta = false;
    let riparabile: { regola: IdRegola; originale: string; motivo: string } | undefined;
    if (correzione) {
      const regola = REGOLA_DI_MOTIVO[correzione.motivo];
      // The same Engine line twice in a turn is said once (the third e2e pass heard one twice in a row).
      if (correzione.testo === '' || this.sostituti.has(correzione.testo)) {
        this.viola({ regola, etichetta: e.etichetta, frase: testo, azione: 'tolta', dettaglio: { motivo: correzione.motivo, gia_detta: true } });
        return { tipo: 'togli' };
      }
      this.viola({ regola, etichetta: e.etichetta, frase: testo, azione: 'sostituita', sostituto: [correzione.testo], dettaglio: { motivo: correzione.motivo } });
      this.sostituti.add(correzione.testo);
      // The absent-creature line is what the table must hear (who is really there): it is not rewritten by the model;
      // nor is an unnamed actor's (a rewrite is confirmed only by the card rules, and round 2's rewrites brought the
      // invented goblin back).
      if (regola !== 'R-inesistente' && correzione.motivo !== 'attore_implicito') riparabile = { regola, originale: testo, motivo: correzione.motivo };
      testo = correzione.testo;
      voce = correzione.testo;
      corretta = true;
    }
    if (this.r.presenti && this.r.idPng.has(e.etichetta) && !this.r.presenti.has(e.etichetta)) {
      this.viola({ regola: 'R-assente', etichetta: e.etichetta, frase: testo, azione: 'tolta' });
      return { tipo: 'togli' };
    }
    const motivoScarto = this.r.scartaFrase?.(testo) ?? null;
    if (motivoScarto) {
      this.viola({ regola: 'R-finzione', etichetta: e.etichetta, frase: testo, azione: 'tolta', dettaglio: { motivo: motivoScarto } });
      return { tipo: 'togli' };
    }
    let privato = e.privato;
    if (!privato && this.r.spostaPrivata) {
      const d = this.r.spostaPrivata(testo, e.segmento, e.etichetta);
      if (d) {
        privato = d.id_pg;
        this.viola({ regola: 'R-privato', etichetta: e.etichetta, frase: testo, azione: 'spostata', id_pg: d.id_pg, dettaglio: { comuni: d.comuni } });
      }
    }
    if (!privato && this.segmentiFermati.has(e.segmento)) return { tipo: 'togli' };
    const segreto = !privato && this.r.guardiaSegreti ? this.r.guardiaSegreti(e.etichetta, testo) : null;
    if (segreto) {
      if (segreto.privato) {
        privato = segreto.privato;
        this.viola({ regola: 'R-segreto', etichetta: e.etichetta, frase: testo, azione: 'spostata', id_pg: privato, dettaglio: { parole: segreto.parole } });
      } else {
        const righe = segreto.sostituto ?? [];
        this.viola({ regola: 'R-segreto', etichetta: e.etichetta, frase: testo, azione: righe.length ? 'sostituita' : 'tolta', sostituto: righe.map((x) => x.testo), dettaglio: { parole: segreto.parole } });
        this.segmentiFermati.add(e.segmento);
        return { tipo: 'sostituisci', righe };
      }
    }
    const rifiuto = !privato && this.r.rifiutoDopoProva ? this.r.rifiutoDopoProva(e.etichetta, testo) : null;
    if (rifiuto) {
      this.viola({ regola: 'R-rifiuto', etichetta: e.etichetta, frase: testo, azione: rifiuto.length ? 'sostituita' : 'tolta', sostituto: rifiuto.map((x) => x.testo) });
      this.segmentiFermati.add(e.segmento);
      return { tipo: 'sostituisci', righe: rifiuto };
    }
    // Said word for word in the last turns, or already in this call: dropped. A sentence that names a PC is never a
    // repetition (a turn prompt, an outcome), nor is an Engine line that replaced one.
    if (!privato && !corretta && (this.r.giàSentite || this.r.detteNelTurno)) {
      const k = frasePerRipetizione(testo);
      const nominaPg = this.r.nomiPg.some((n) => ` ${k} `.includes(` ${n} `));
      // Within the turn a repeat is always redundant; across turns a sentence that names a PC may come back.
      const nelTurno = this.detteOra.has(k) || !!this.r.detteNelTurno?.has(k);
      if (k.length >= 12 && (nelTurno || (!nominaPg && !!this.r.giàSentite?.has(k)))) {
        this.viola({ regola: 'R-ripetuta', etichetta: e.etichetta, frase: testo, azione: 'tolta' });
        return { tipo: 'togli' };
      }
      this.detteOra.add(k);
    }
    return { tipo: 'dici', testo, voce, ...(privato ? { privato } : {}), ...(riparabile ? { riparabile } : {}) };
  }

  /**
   * A repaired sentence (docs/coerenza.md §3) is said only if the fact rules pass on it and it has no rule numbers; the
   * repair itself is recorded as one more violation record, `riparata`, of the same rule.
   */
  confermaRiparata(etichetta: string, originale: string, riparata: string, regola: IdRegola): boolean {
    const t = riparata.trim();
    if (!t || togliNumeriRegole(t).tolti.length) return false;
    if (this.r.correggiEsito?.(t)) return false;
    this.viola({ regola, etichetta, frase: originale, azione: 'riparata', sostituto: [t] });
    return true;
  }

  /**
   * One row of a repertoire line (mode B, the local reader): the rules that judge facts, R-esito and R-fuori, on narrator
   * rows. A prewritten line was written for a state that may not hold any more. Returns the text to say (the Engine's
   * line instead of the row), '' to drop the row, or null when the row stays as written.
   */
  verificaBattuta(battuta: string, riga: { etichetta: string; testo: string }): string | null {
    if (riga.etichetta !== ID_NARRATORE || !this.r.correggiEsito) return null;
    const c = this.r.correggiEsito(riga.testo, { prescritta: true });
    if (!c) return null;
    const regola = REGOLA_DI_MOTIVO[c.motivo];
    if (c.testo === '' || this.sostituti.has(c.testo)) {
      this.viola({ regola, etichetta: riga.etichetta, frase: riga.testo, azione: 'tolta', battuta, dettaglio: { motivo: c.motivo } });
      return '';
    }
    this.sostituti.add(c.testo);
    this.viola({ regola, etichetta: riga.etichetta, frase: riga.testo, azione: 'sostituita', sostituto: [c.testo], battuta, dettaglio: { motivo: c.motivo } });
    return c.testo;
  }
}
