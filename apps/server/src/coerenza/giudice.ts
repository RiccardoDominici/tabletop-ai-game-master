/**
 * The yes/no judge of the narration (docs/coerenza.md, «The candidate in play»): the candidate v2 scored on the frozen
 * set and the held-out set, now in the public answer. For every narrator sentence the rules have left alone, the
 * mention filter (coerenza/menzioni.ts) says whether a coherence rule is about it; if so, a small fast model gets ONE
 * question with the ledger's rows (coerenza/domanda.ts), within a deadline. On «si» the Engine says its own line (a
 * fallen one's state, who is really there, the blow as the card has it) once per turn, and drops the sentence after
 * that; the model never rewrites it. The sentence right after a «si» is asked too (a carried subject).
 *
 * The rules it replaces (R-fuori, and R-inesistente and the absorbed-blow branch, which are in observation) run in
 * the shadow on every sentence, so their carried subject stays right, and decide only on a deadline or an error. The
 * card rules of R-esito (pair, fall, a PC told down) and every other rule stay in VerificaTurno, before the judge.
 */
import type { Logger } from '../logger';
import { nomeBreve } from '../campagna/nomi';
import { testo } from '../lingua';
import type { ModelloLinguaggio } from '../llm/modello';
import type { CorrezioneEsito } from '../narrazione/guardia-esiti';
import { chiedi, domandaPer } from './domanda';
import { frasePresenti } from './inesistenti';
import { daChiedere, menzioniDi, presentiNominati, type ContestoMenzioni } from './menzioni';
import { inOsservazione } from './osservazione';
import type { Registro } from './registro';
import type { IdRegola } from './verifica';

export interface OpzioniGiudice {
  modello: ModelloLinguaggio;
  /** Deadline of one question, in milliseconds. */
  ms: number;
  registro: Registro;
  contesto: ContestoMenzioni;
  /** The rules the judge replaces, run on every sentence; their verdict is used on a deadline or an error. */
  ombra: (testo: string) => CorrezioneEsito;
  log: Logger;
  turno: number;
  /**
   * A silent exit (an NPC in the scene named by a sentence leaves it with no `[esce]`): asked aside, never blocking the
   * voice; on «si» the director takes it as the narrator's `[esce]`. Absent: not asked.
   */
  uscita?: (id: string) => void;
}

export interface DecisioneGiudice {
  /** The Engine's line, or '' to drop the sentence. */
  testo: string;
  regola: IdRegola;
  motivo: string;
  /** Who decided: the model's answer, or the rules after a deadline or an error. */
  fonte: 'domanda' | 'regole';
  ms: number;
}

const PRIORITA = ['parla', 'fuori', 'nome', 'colpo', 'assente'];

export class GiudiceDomande {
  private prima = '';
  private siPrima = false;
  private ultime: string[] = [];
  /** Entities and nouns whose line was said in this turn (each is said once). */
  private readonly detti = new Set<string>();

  constructor(private readonly o: OpzioniGiudice) {}

  /**
   * One narrator sentence, in order. `giaToccata`: a rule before the judge already changed it (the judge only keeps
   * its state). Null: the sentence stays as it is.
   */
  async giudica(frase: string, giaToccata = false, signal?: AbortSignal): Promise<DecisioneGiudice | null> {
    const ombra = this.o.ombra(frase);
    this.chiediUscite(frase, this.prima);
    const grezze = menzioniDi(frase, 'narratore', this.o.contesto);
    const menzioni = grezze.length ? daChiedere(grezze, this.o.contesto) : this.siPrima ? this.ultime : [];
    const prima = this.prima;
    this.prima = frase;
    if (giaToccata) {
      this.siPrima = true;
      if (grezze.length) this.ultime = menzioni;
      return null;
    }
    if (!menzioni.length) {
      this.siPrima = false;
      return null;
    }
    const q = domandaPer({ registro: this.o.registro, frase, prima, menzioni, colpi: this.o.contesto.colpi.filter((k) => k.riuscita && k.danno > 0) });
    if (!q) {
      this.siPrima = false;
      return null;
    }
    const controllo = new AbortController();
    const timer = setTimeout(() => controllo.abort(new Error('deadline')), this.o.ms);
    const fuori = (): void => controllo.abort(new Error('aborted'));
    signal?.addEventListener('abort', fuori, { once: true });
    const t0 = Date.now();
    try {
      const r = await chiedi(this.o.modello, q, controllo.signal);
      this.o.log.info({ turno: this.o.turno, frase, menzioni, si: r.si, ms: r.ms }, 'coherence: question answered');
      this.siPrima = r.si;
      if (grezze.length) this.ultime = menzioni;
      if (!r.si) return null;
      return { ...this.linea(grezze.length ? menzioni : []), fonte: 'domanda', ms: r.ms };
    } catch (err) {
      const ms = Date.now() - t0;
      this.o.log.warn({ turno: this.o.turno, frase, menzioni, ms, err: err instanceof Error ? err.message : String(err) }, 'coherence: question not answered in time, the rules decide');
      this.siPrima = false;
      // The conservative rules: only what changes the text today (a rule in observation stays in observation).
      if (!ombra || inOsservazione(ombra.motivo)) return null;
      const regola: IdRegola = ombra.motivo === 'creatura_inesistente' ? 'R-inesistente' : ombra.motivo === 'fuori_gioco_agisce' ? 'R-fuori' : 'R-esito';
      return { testo: ombra.testo, regola, motivo: ombra.motivo, fonte: 'regole', ms };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', fuori);
    }
  }

  /** One question per NPC in the scene the sentence names: does it leave now? Not awaited (the voice goes on). */
  private chiediUscite(frase: string, prima: string): void {
    if (!this.o.uscita) return;
    for (const m of presentiNominati(frase, this.o.contesto)) {
      const q = domandaPer({ registro: this.o.registro, frase, prima, menzioni: [m] });
      if (!q) continue;
      const id = m.split(':')[1]!;
      const controllo = new AbortController();
      const timer = setTimeout(() => controllo.abort(new Error('deadline')), this.o.ms * 3);
      void chiedi(this.o.modello, q, controllo.signal)
        .then((r) => {
          this.o.log.info({ turno: this.o.turno, frase, png: id, si: r.si, ms: r.ms }, 'coherence: exit question answered');
          if (r.si) this.o.uscita?.(id);
        })
        .catch((err: unknown) => this.o.log.info({ turno: this.o.turno, png: id, err: err instanceof Error ? err.message : String(err) }, 'coherence: exit question not answered'))
        .finally(() => clearTimeout(timer));
    }
  }

  /** The Engine's line for the first mention by priority, once per entity or noun in the turn; '' afterwards. */
  private linea(menzioni: readonly string[]): { testo: string; regola: IdRegola; motivo: string } {
    const m = [...menzioni].sort((a, b) => PRIORITA.indexOf(a.split(':')[0]!) - PRIORITA.indexOf(b.split(':')[0]!))[0];
    if (!m) return { testo: '', regola: 'R-fuori', motivo: 'fuori_gioco_agisce' };
    const [tipo, valore] = m.split(':') as [string, string];
    const una = (chiave: string, t: string): string => {
      if (this.detti.has(chiave)) return '';
      this.detti.add(chiave);
      return t;
    };
    const e = this.o.registro.entita.find((x) => x.id === valore);
    if ((tipo === 'fuori' || tipo === 'parla') && e) {
      const chiave = e.stato === 'morto' ? 'fuori_morto' : e.stato === 'fuggito' || e.presenza !== 'in_scena' ? 'fuori_fuggito' : 'fuori_a_terra';
      return { testo: una(valore, testo(`prove.guardia.${chiave}`, { nome: nomeBreve(e.nome) })), regola: 'R-fuori', motivo: 'fuori_gioco_agisce' };
    }
    if (tipo === 'nome') {
      const a = this.o.contesto.assenti.find((x) => x.parola === valore);
      return { testo: a ? una(m, frasePresenti(this.o.registro, [a])) : '', regola: 'R-inesistente', motivo: 'creatura_inesistente' };
    }
    if (tipo === 'colpo') {
      const k = this.o.contesto.colpi.find((x) => x.bersaglio === valore && x.riuscita && x.danno > 0);
      const chi = this.o.registro.entita.find((x) => x.id === k?.chi);
      return { testo: k && chi && e ? una(m, testo('prove.guardia.colpisce', { chi: nomeBreve(chi.nome), bersaglio: nomeBreve(e.nome) })) : '', regola: 'R-esito', motivo: 'colpo_assorbito' };
    }
    return { testo: '', regola: 'R-assente', motivo: 'png_assente' };
  }
}
