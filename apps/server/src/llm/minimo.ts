/**
 * Lettore minimo (docs/provider.md, «Lettore»): con un modello locale piccolo il lettore non scrive
 * prosa. Per ogni azione del turno sceglie UNA battuta del catalogo che il Motore ha già preparato (o
 * «nessuna»). L'annuncio NON lo scrive il modello (nelle misure di «lettore» inventava parole nel 66%
 * dei casi): è deterministico, il nome del PG e la prima frase breve di ciò che ha scritto il giocatore,
 * che telefoni e proiettore mostrano già per intero. Tutto il resto viene dal repertorio scritto
 * da Claude Code. Il risultato è il protocollo di sempre (`[narratore] …`, `[usa] id > pg`, `[invito]`),
 * quindi parser, regia, voce e controlli non cambiano.
 *
 * - Ingresso: il messaggio del turno (narrazione/messaggio.ts), da cui si leggono le azioni, le battute
 *   indicate dal Motore, il catalogo e le battute d'attesa.
 * - Il modello risponde in JSON (llm/strutturato.ts: validazione severa, un ritentativo). Il ripiego è
 *   deterministico: la prima battuta indicata per quell'azione, altrimenti «nessuna».
 * - «nessuna»: una battuta d'attesa del repertorio (riempitivo), se il Motore ne ha messe; mai prosa nuova.
 * - Annuncio: `annuncioBreve` (llm/annuncio.ts: nome + prima frase, tagliata alla prima virgola o pausa,
 *   ≤ 12 parole; in inglese in terza persona). Le azioni PRIVATE non si annunciano mai.
 * - Lingua: prompt in prompts/<codice>/lettore-minimo.md, righe del messaggio in lingue/<codice>/
 *   testi-modelli.yaml (`modelli.lettore`). Il turno arriva come DATI (`RichiestaNarrazione.dati`, lo stesso
 *   oggetto da cui narrazione/messaggio.ts compila il testo): il lettore non dipende dai titoli del
 *   messaggio, che cambiano con la lingua. `leggiTurno` (dal testo italiano) resta per strumenti e prove
 *   che passano solo il messaggio.
 */
import { testo } from '../lingua';
import { prompt } from '../lingua/motore';
import type { Logger } from '../logger';
import { annuncioBreve } from './annuncio';
import { costoZero, type ModelloLinguaggio, type RispostaModello } from './modello';
import { chiediStrutturato } from './strutturato';
import type { AzionePreclassifica, DatiTurnoLettore, EsitoNarrazione, Narratore, RichiestaNarrazione } from './tipi';

export { annuncioBreve };

export interface AzioneLetta {
  id_pg: string;
  nome: string;
  testo: string;
  privata: boolean;
}

export interface TurnoLetto {
  azioni: AzioneLetta[];
  /** pg → battute indicate dal Motore, nell'ordine. */
  indicate: Map<string, string[]>;
  /** Catalogo: id → riga «id · chi · tipo · quando». */
  catalogo: Map<string, string>;
  /** Battute d'attesa (riempitivi) disponibili per «nessuna». */
  attesa: string[];
}

/** «- pg_x (Nome): [usa] id > pg_x oppure [usa] …» → pg → id indicati (righe nel formato del protocollo). */
function indicateDa(righe: readonly string[]): Map<string, string[]> {
  const indicate = new Map<string, string[]>();
  for (const r of righe) {
    const m = /^- (pg_[\w-]+) /.exec(r.trim());
    if (m) indicate.set(m[1]!, [...r.matchAll(/\[usa\] ([\w-]+) >/g)].map((x) => x[1]!));
  }
  return indicate;
}

/** «- id · chi · tipo · quando» → id → riga (senza il trattino). */
function catalogoDa(righe: readonly string[]): Map<string, string> {
  const catalogo = new Map<string, string>();
  for (const r of righe) {
    const m = /^- ([\w-]+) · /.exec(r.trim());
    if (m) catalogo.set(m[1]!, r.trim().slice(2));
  }
  return catalogo;
}

/** «- id …» → gli id delle battute d'attesa. */
const attesaDa = (righe: readonly string[]): string[] => righe.map((r) => /^- ([\w-]+)/.exec(r.trim())?.[1]).filter((x): x is string => !!x);

/**
 * Il turno dai DATI del Motore (lo stesso oggetto da cui narrazione/messaggio.ts compila il testo): azioni,
 * privacy e «nessuna azione» sono campi, non frasi; indicate, catalogo e attesa sono righe nel formato del
 * protocollo (id, «[usa] id > pg», «id · chi · tipo · quando»), uguale in ogni lingua.
 */
export function turnoDaDati(d: DatiTurnoLettore): TurnoLetto {
  const azioni = d.azioni.filter((a): a is typeof a & { testo: string } => !!a.testo).map((a) => ({ id_pg: a.id_pg, nome: a.nome, testo: a.testo.trim(), privata: !!a.privata }));
  const rep = d.repertorio;
  return {
    azioni,
    indicate: indicateDa(rep?.indicate ?? []),
    catalogo: catalogoDa((rep?.battuteDisponibili ?? '').split('\n')),
    attesa: attesaDa((rep?.attesa ?? '').split('\n')),
  };
}

/**
 * Legge dal messaggio del turno (testo italiano) le sezioni che servono al lettore minimo. Solo per chi
 * passa il messaggio senza i dati (strumenti, prove): il Motore passa sempre `dati`.
 */
export function leggiTurno(messaggio: string): TurnoLetto {
  const sezioni = new Map<string, string[]>();
  let corrente: string | null = null;
  for (const riga of messaggio.split('\n')) {
    const h = /^##\s+(.*)$/.exec(riga);
    if (h) {
      corrente = h[1]!;
      sezioni.set(corrente, []);
    } else if (corrente) sezioni.get(corrente)!.push(riga);
  }
  const trova = (inizio: RegExp): string[] => [...sezioni.entries()].find(([t]) => inizio.test(t))?.[1] ?? [];
  const azioni: AzioneLetta[] = [];
  for (const r of trova(/^Turno \d+: azioni dei giocatori/)) {
    const m = /^- (?:\[\d+\] )?(.+?) \((pg_[\w-]+)\): (.*)$/.exec(r.trim());
    if (!m || /^nessuna azione, aspetta\.$/.test(m[3]!)) continue;
    const privata = m[3]!.includes('(azione PRIVATA');
    azioni.push({ nome: m[1]!, id_pg: m[2]!, testo: m[3]!.replace(/\s*\(azione PRIVATA[^)]*\)\s*$/, '').trim(), privata });
  }
  return {
    azioni,
    indicate: indicateDa(trova(/^Battute indicate dal Motore/)),
    catalogo: catalogoDa(trova(/^Catalogo: battute pertinenti/)),
    attesa: attesaDa(trova(/^Battute d.attesa/)),
  };
}

/** Il prompt del lettore nella lingua dei contenuti: prompts/<codice>/lettore-minimo.md. */
const promptLettore = (): string => prompt('lettore-minimo');

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['risposte'],
  properties: {
    risposte: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['pg', 'battuta'],
        properties: { pg: { type: 'string' }, battuta: { type: 'string' } },
      },
    },
  },
};

type Risposte = { risposte: Array<{ pg: string; battuta: string }> };

const radici = (s: string): Set<string> => new Set((s.toLowerCase().match(/\p{L}{4,}/gu) ?? []).map((w) => w.slice(0, 5)));

/**
 * Candidati di un'azione, pochi perché un modello piccolo legge piano: le indicate dal Motore, poi le
 * battute del catalogo il cui «quando» condivide più radici col testo dell'azione (al più `max` in tutto).
 */
export function candidati(t: TurnoLetto, pg: string, testo = '', max = 6): string[] {
  const ind = t.indicate.get(pg) ?? [];
  const mie = radici(testo);
  const punteggio = (id: string): number => [...radici(t.catalogo.get(id) ?? '')].filter((r) => mie.has(r)).length;
  const resto = [...t.catalogo.keys()].filter((id) => !ind.includes(id)).map((id) => [id, punteggio(id)] as const);
  resto.sort((a, b) => b[1] - a[1]);
  return [...ind, ...resto.filter(([, p]) => p > 0).map(([id]) => id)].slice(0, Math.max(max, ind.length));
}

/** «id: quando» dalla riga del catalogo «id · chi · tipo · quando». */
function rigaBreve(t: TurnoLetto, id: string): string {
  const riga = t.catalogo.get(id) ?? id;
  const parti = riga.split(' · ');
  return parti.length >= 4 ? `${parti[0]}: ${parti.slice(3).join(' · ')}` : riga;
}

/** Quanto dura a voce una frase breve (≈ 2,6 parole al secondo, più l'attacco della voce). */
export function durataStimata(frase: string): number {
  return 600 + 380 * frase.split(/\s+/).filter(Boolean).length;
}

function attesa(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((risolvi) => {
    const t = setTimeout(risolvi, ms);
    signal.addEventListener('abort', () => (clearTimeout(t), risolvi()), { once: true });
  });
}

export interface OpzioniMinimo {
  log: Logger;
  /**
   * Quanti annunci dire mentre il classificatore lavora. 'tutti' con la voce remota (drama-3): l'attesa
   * si copre gratis. 'primo' quando voce e lettore sono locali sulla stessa GPU: la voce che genera gli
   * annunci rallentava il classificatore di 1,5–2 volte (misura del 10/11/2026), quindi solo il primo
   * esce subito e gli altri dopo il lettore.
   */
  annunciInAnticipo?: 'tutti' | 'primo';
  maxTokens?: number;
}

/** Una classificazione fatta all'invio: per quale testo, e la scelta (o null se fallita). */
interface Preclassificata {
  testo: string;
  controllo: AbortController;
  scelta: Promise<string | null>;
  inizio: number;
}

export class NarratoreMinimo implements Narratore {
  readonly nome = 'minimo' as const;
  readonly modello: string;
  /** Per PG: l'azione inviata e la sua battuta scelta in anticipo (il turno non ha scadenza). */
  private readonly pronte = new Map<string, Preclassificata>();
  /** Le risposte del modello date in anticipo, da contare nel turno che le usa. */
  private risposteAnticipo: RispostaModello[] = [];

  constructor(
    private readonly m: ModelloLinguaggio,
    private readonly o: OpzioniMinimo,
  ) {
    this.modello = m.modello;
  }

  /**
   * All'invio di un'azione: la si classifica subito, da sola, col catalogo che il Motore le darebbe adesso.
   * Mentre gli altri scrivono il lettore ha tempo; alla chiusura resta da fare solo ciò che manca.
   */
  preclassifica(azione: AzionePreclassifica, catalogo: { indicate: string[]; righe: Map<string, string> }): void {
    const prima = this.pronte.get(azione.id_pg);
    if (prima?.testo === azione.testo) return;
    prima?.controllo.abort(new Error('azione cambiata'));
    const controllo = new AbortController();
    const t: TurnoLetto = { azioni: [{ ...azione }], indicate: new Map([[azione.id_pg, catalogo.indicate]]), catalogo: catalogo.righe, attesa: [] };
    const inizio = performance.now();
    const scelta = this.classifica(t, controllo.signal, this.risposteAnticipo)
      .then((r) => r.find((x) => x.pg === azione.id_pg)?.battuta ?? null)
      .catch(() => null);
    this.pronte.set(azione.id_pg, { testo: azione.testo, controllo, scelta, inizio });
    void scelta.then((b) => this.o.log.info({ id_pg: azione.id_pg, battuta: b, ms: Math.round(performance.now() - inizio) }, 'lettore minimo: azione classificata all’invio'));
  }

  annullaPreclassifica(id_pg: string): void {
    this.pronte.get(id_pg)?.controllo.abort(new Error('azione ritirata'));
    this.pronte.delete(id_pg);
  }

  /**
   * Le scelte fatte all'invio che valgono ancora: stesso testo, e battuta ancora fra i candidati di
   * quell'azione nel catalogo della chiusura (dipendenze e stato possono averla tolta). Le altre: da rifare.
   */
  private async giaPronte(t: TurnoLetto): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const a of t.azioni) {
      const p = this.pronte.get(a.id_pg);
      if (!p || p.testo !== a.testo) continue;
      const b = await p.scelta;
      if (b === null) continue;
      if (b === 'nessuna' || candidati(t, a.id_pg, a.testo).includes(b)) out.set(a.id_pg, b);
    }
    return out;
  }

  /**
   * Il turno, in streaming, per nascondere l'attesa del classificatore:
   * 1. il primo annuncio (deterministico) parte SUBITO, alla chiusura della finestra: il tavolo sente
   *    qualcosa entro un secondo;
   * 2. mentre il classificatore lavora (una chiamata sola per tutte le azioni del turno), gli annunci
   *    seguenti escono al ritmo stimato della voce;
   * 3. poi le battute scelte, nell'ordine delle azioni (con l'annuncio davanti per chi non l'ha avuto).
   */
  async narra(r: RichiestaNarrazione, onTesto: (delta: string) => void): Promise<EsitoNarrazione> {
    const risposte: RispostaModello[] = [];
    let testo = '';
    const emetti = (x: string): void => {
      testo += x;
      onTesto(x);
    };
    const esito = (): EsitoNarrazione => {
      const uso = risposte.reduce((a, x) => ({ input_tokens: a.input_tokens + x.uso.input_tokens, output_tokens: a.output_tokens + x.uso.output_tokens, cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (x.uso.cache_read_input_tokens ?? 0) }), { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 });
      return { testo, modello: this.modello, stopReason: 'end_turn', uso, costo: risposte.reduce((a, x) => (x.costo.costo_usd ? { ...a, costo_usd: a.costo_usd + x.costo.costo_usd } : a), costoZero(uso)), idMessaggio: null };
    };
    // Chiamata di riparazione (azioni rimaste senza risposta): il lettore minimo non improvvisa niente.
    if (r.dati ? r.dati.riparazione : /^## Azioni rimaste senza risposta/m.test(r.messaggio)) {
      emetti('[invito] tutti\n');
      return esito();
    }
    const t = r.dati ? turnoDaDati(r.dati) : leggiTurno(r.messaggio);
    const pubbliche = t.azioni.filter((a) => !a.privata);
    const annunci = new Map(pubbliche.map((a) => [a.id_pg, annuncioBreve(a.nome, a.testo)]));
    const detti = new Set<string>();
    const annuncia = (a: AzioneLetta): void => {
      detti.add(a.id_pg);
      const x = annunci.get(a.id_pg);
      if (x) emetti(`[narratore] ${x}\n`);
    };
    let prossimo = 0;
    if (pubbliche.length) annuncia(pubbliche[prossimo++]!);
    let finito = false;
    // Le azioni già classificate all'invio non tornano al modello: una chiamata sola per quelle che mancano.
    const scelta = (async (): Promise<Risposte['risposte']> => {
      const pronte = await this.giaPronte(t);
      const mancano = t.azioni.filter((a) => !pronte.has(a.id_pg));
      const nuove = mancano.length ? await this.classifica({ ...t, azioni: mancano }, r.signal, risposte) : [];
      risposte.push(...this.risposteAnticipo.splice(0));
      for (const a of t.azioni) this.pronte.delete(a.id_pg);
      this.o.log.info({ turno: r.turno, gia_pronte: pronte.size, da_fare: mancano.length }, 'lettore minimo: scelte pronte alla chiusura');
      return [...[...pronte].map(([pg, battuta]) => ({ pg, battuta })), ...nuove];
    })().finally(() => {
      finito = true;
    });
    // Gli annunci seguenti mentre il classificatore lavora, al ritmo stimato della voce.
    while (!finito && prossimo < pubbliche.length && this.o.annunciInAnticipo !== 'primo') {
      const precedente = annunci.get(pubbliche[prossimo - 1]!.id_pg) ?? '';
      await Promise.race([scelta.catch(() => undefined), attesa(durataStimata(precedente), r.signal)]);
      if (!finito && !r.signal.aborted) annuncia(pubbliche[prossimo++]!);
    }
    const scelte = await scelta;
    emetti(this.protocollo(t, scelte, detti));
    this.o.log.info({ turno: r.turno, azioni: t.azioni.length, annunci_subito: detti.size, scelte: scelte.map((s) => `${s.pg}:${s.battuta}`), chiamate: risposte.length }, 'lettore minimo: scelte del turno');
    return esito();
  }

  /** Una chiamata sola per tutte le azioni del turno: per ognuna un id del catalogo o «nessuna». */
  private async classifica(t: TurnoLetto, signal: AbortSignal, risposte: RispostaModello[]): Promise<Risposte['risposte']> {
    const per = new Map(t.azioni.map((a) => [a.id_pg, candidati(t, a.id_pg, a.testo)]));
    const elenco = t.azioni
      .map((a, i) => {
        const c = per.get(a.id_pg)!;
        const righe = c.map((id) => `   - ${rigaBreve(t, id)}`).join('\n') || testo('modelli.lettore.nessun_candidato');
        return testo('modelli.lettore.riga', { numero: i + 1, nome: a.nome, id_pg: a.id_pg, privata: a.privata ? testo('modelli.lettore.privata') : '', testo: a.testo, candidati: righe });
      })
      .join('\n');
    const ripiego = (): Risposte => ({ risposte: t.azioni.map((a) => ({ pg: a.id_pg, battuta: t.indicate.get(a.id_pg)?.[0] ?? 'nessuna' })) });
    const r = await chiediStrutturato<Risposte>(
      this.m,
      { sistema: [{ testo: promptLettore(), cache: true }], messaggi: [{ ruolo: 'user', testo: testo('modelli.lettore.azioni', { elenco }) }], maxTokens: this.o.maxTokens ?? 40 + 30 * t.azioni.length, signal },
      {
        schema: SCHEMA,
        cosa: 'lettore minimo',
        log: this.o.log,
        onRisposta: (x) => risposte.push(x),
        ripiego,
        // Solo PG del turno e battute fra i candidati di QUELL'azione (o «nessuna»).
        controlla: (v) => {
          for (const x of v.risposte) {
            if (!per.has(x.pg)) return `pg ${x.pg} non ha un'azione in questo turno`;
            if (x.battuta !== 'nessuna' && !per.get(x.pg)!.includes(x.battuta)) return `${x.battuta} non è fra i candidati di ${x.pg}`;
          }
          return null;
        },
      },
    );
    return r.risposte;
  }

  /** Le righe del protocollo: per ogni azione l'annuncio (se non già detto) e la battuta; poi l'invito. */
  protocollo(t: TurnoLetto, scelte: Risposte['risposte'], giaAnnunciati: ReadonlySet<string> = new Set()): string {
    const righe: string[] = [];
    const attesa = [...t.attesa];
    const usate = new Set<string>();
    for (const a of t.azioni) {
      const s = scelte.find((x) => x.pg === a.id_pg);
      const annuncio = a.privata || giaAnnunciati.has(a.id_pg) ? null : annuncioBreve(a.nome, a.testo);
      if (annuncio) righe.push(`[narratore] ${annuncio}`);
      let id = s?.battuta && s.battuta !== 'nessuna' && !usate.has(s.battuta) ? s.battuta : null;
      // «nessuna»: una battuta d'attesa del repertorio, mai per un'azione privata (si sentirebbe al tavolo).
      if (!id && !a.privata) id = attesa.shift() ?? null;
      if (id) {
        usate.add(id);
        righe.push(`[usa] ${id} > ${a.id_pg}`);
      }
    }
    // Nessuna azione (stallo): una battuta d'attesa, o la prima del catalogo che non chiude la scena.
    if (!t.azioni.length) {
      const id = attesa[0] ?? [...t.catalogo.entries()].find(([, riga]) => !/ · (finale|chiusura) · /.test(riga))?.[0];
      if (id) righe.push(`[usa] ${id}`);
    }
    righe.push('[invito] tutti');
    return `${righe.join('\n')}\n`;
  }
}
