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
 *
 * The first sentence of a turn's audio never waits for the answer (docs/coerenza.md, «First audio»: round 3 waited
 * 0.9–2.5 s in 6 of 15 turns). When it is flagged, the Engine's line for its mention (the fallen one's state, who is
 * really there) is true whatever the answer and is what a «si» would say: it is said at once, while the question runs;
 * then «si» drops the sentence and «no» lets it follow. With no such line (an absent NPC, a line heard in the last
 * turns) the rules decide the sentence now and the question goes on aside, only for the carried subject of the next
 * sentence; a late «si» there is reported (`tardiva`), the sentence having been said.
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
  /** A «si» that came after its sentence was said (the first one, asked aside): the director records it. */
  tardiva?: (x: { frase: string; regola: IdRegola; motivo: string; ms: number }) => void;
}

/**
 * The first sentence of the turn's audio: `apri` says the Engine's line now (false: it may not, e.g. the table heard it
 * in the last turns). Absent: the sentence is not the first, the voice has slack and the judge may wait.
 */
export interface PrimaFrase {
  apri: (testo: string) => boolean;
}

export interface DecisioneGiudice {
  /** The Engine's line, or '' to drop the sentence. */
  testo: string;
  /** The line was already said as the opener (PrimaFrase): the sentence is dropped, nothing more is queued. */
  aperta?: boolean;
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
  /** The question on the first sentence, asked aside: the next sentence waits for it (its carried subject). */
  private aParte: Promise<void> | null = null;

  constructor(private readonly o: OpzioniGiudice) {}

  /**
   * One narrator sentence, in order. `giaToccata`: a rule before the judge already changed it (the judge only keeps
   * its state). `primaFrase`: nothing of the turn is in the voice yet (see the module comment). Null: the sentence
   * stays as it is.
   */
  async giudica(frase: string, giaToccata = false, signal?: AbortSignal, primaFrase?: PrimaFrase): Promise<DecisioneGiudice | null> {
    // The first sentence's question, asked aside, is this sentence's carry: wait for it (the voice has slack now).
    if (this.aParte) {
      await this.aParte;
      this.aParte = null;
    }
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
    const mie = grezze.length ? menzioni : [];
    if (primaFrase) {
      const l = this.linea(mie, true);
      if (l.testo && primaFrase.apri(l.testo)) {
        this.detti.add(l.chiave);
        this.o.log.info({ turno: this.o.turno, frase, menzioni, linea: l.testo }, 'coherence: first sentence flagged, the Engine line said while the question runs');
        const r = await this.chiediEntro(q, frase, menzioni, signal);
        if ('si' in r) {
          this.siPrima = r.si;
          if (grezze.length) this.ultime = menzioni;
          // «no»: the sentence follows the line; «si»: the line took its place.
          return r.si ? { testo: l.testo, regola: l.regola, motivo: l.motivo, fonte: 'domanda', ms: r.ms, aperta: true } : null;
        }
        this.siPrima = false;
        const d = this.dalleRegole(ombra, r.ms);
        return d ? { ...d, testo: l.testo, aperta: true } : null;
      }
      // No line to open with: the rules decide now; the answer, when it comes, is only the next sentence's carry.
      const decisa = this.dalleRegole(ombra, 0);
      this.o.log.info({ turno: this.o.turno, frase, menzioni, regole: decisa ? decisa.motivo : null }, 'coherence: first sentence flagged, decided by the rules, the question goes on aside');
      this.siPrima = false;
      this.aParte = this.chiediEntro(q, frase, menzioni, signal).then((r) => {
        if (!('si' in r)) return;
        this.siPrima = r.si;
        if (grezze.length) this.ultime = menzioni;
        if (r.si && !decisa) {
          const l2 = this.linea(mie, true);
          this.o.tardiva?.({ frase, regola: l2.regola, motivo: l2.motivo, ms: r.ms });
        }
      });
      return decisa;
    }
    const r = await this.chiediEntro(q, frase, menzioni, signal);
    if (!('si' in r)) {
      this.siPrima = false;
      return this.dalleRegole(ombra, r.ms);
    }
    this.siPrima = r.si;
    if (grezze.length) this.ultime = menzioni;
    if (!r.si) return null;
    return { ...this.linea(mie), fonte: 'domanda', ms: r.ms };
  }

  /** One question within the deadline: the answer, or a deadline / an error (logged here). */
  private async chiediEntro(q: { sistema: string; messaggio: string }, frase: string, menzioni: readonly string[], signal?: AbortSignal): Promise<{ si: boolean; ms: number } | { ms: number }> {
    const controllo = new AbortController();
    const timer = setTimeout(() => controllo.abort(new Error('deadline')), this.o.ms);
    const fuori = (): void => controllo.abort(new Error('aborted'));
    signal?.addEventListener('abort', fuori, { once: true });
    const t0 = Date.now();
    try {
      const r = await chiedi(this.o.modello, q, controllo.signal);
      this.o.log.info({ turno: this.o.turno, frase, menzioni, si: r.si, ms: r.ms }, 'coherence: question answered');
      return { si: r.si, ms: r.ms };
    } catch (err) {
      const ms = Date.now() - t0;
      this.o.log.warn({ turno: this.o.turno, frase, menzioni, ms, err: err instanceof Error ? err.message : String(err) }, 'coherence: question not answered in time, the rules decide');
      return { ms };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', fuori);
    }
  }

  /** The shadow rules' verdict after a deadline: only what changes the text today (a rule in observation stays so). */
  private dalleRegole(ombra: CorrezioneEsito, ms: number): DecisioneGiudice | null {
    if (!ombra || inOsservazione(ombra.motivo)) return null;
    const regola: IdRegola = ombra.motivo === 'creatura_inesistente' ? 'R-inesistente' : ombra.motivo === 'fuori_gioco_agisce' ? 'R-fuori' : 'R-esito';
    return { testo: ombra.testo, regola, motivo: ombra.motivo, fonte: 'regole', ms };
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

  /**
   * The Engine's line for the first mention by priority, once per entity or noun in the turn; '' afterwards. `prova`:
   * only look (the caller marks `chiave` as said if it says the line).
   */
  private linea(menzioni: readonly string[], prova = false): { testo: string; regola: IdRegola; motivo: string; chiave: string } {
    const m = [...menzioni].sort((a, b) => PRIORITA.indexOf(a.split(':')[0]!) - PRIORITA.indexOf(b.split(':')[0]!))[0];
    if (!m) return { testo: '', regola: 'R-fuori', motivo: 'fuori_gioco_agisce', chiave: '' };
    const [tipo, valore] = m.split(':') as [string, string];
    let chiave = '';
    const una = (k: string, t: string): string => {
      chiave = k;
      if (this.detti.has(k)) return '';
      if (!prova) this.detti.add(k);
      return t;
    };
    const e = this.o.registro.entita.find((x) => x.id === valore);
    if ((tipo === 'fuori' || tipo === 'parla') && e) {
      const riga = e.stato === 'morto' ? 'fuori_morto' : e.stato === 'fuggito' || e.presenza !== 'in_scena' ? 'fuori_fuggito' : 'fuori_a_terra';
      return { testo: una(valore, testo(`prove.guardia.${riga}`, { nome: nomeBreve(e.nome) })), regola: 'R-fuori', motivo: 'fuori_gioco_agisce', chiave };
    }
    if (tipo === 'nome') {
      const a = this.o.contesto.assenti.find((x) => x.parola === valore);
      return { testo: a ? una(m, frasePresenti(this.o.registro, [a])) : '', regola: 'R-inesistente', motivo: 'creatura_inesistente', chiave };
    }
    if (tipo === 'colpo') {
      const k = this.o.contesto.colpi.find((x) => x.bersaglio === valore && x.riuscita && x.danno > 0);
      const chi = this.o.registro.entita.find((x) => x.id === k?.chi);
      return { testo: k && chi && e ? una(m, testo('prove.guardia.colpisce', { chi: nomeBreve(chi.nome), bersaglio: nomeBreve(e.nome) })) : '', regola: 'R-esito', motivo: 'colpo_assorbito', chiave };
    }
    return { testo: '', regola: 'R-assente', motivo: 'png_assente', chiave };
  }
}
