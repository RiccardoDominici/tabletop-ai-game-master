/**
 * Lettore minimo (docs/provider.md, «Lettore»): con un modello locale piccolo il lettore non scrive
 * prosa. Per ogni azione del turno sceglie UNA battuta del catalogo che il Motore ha già preparato (o
 * «nessuna») e, al più, scrive l'annuncio in terza persona. Tutto il resto viene dal repertorio scritto
 * da Claude Code. Il risultato è il protocollo di sempre (`[narratore] …`, `[usa] id > pg`, `[invito]`),
 * quindi parser, regia, voce e controlli non cambiano.
 *
 * - Ingresso: il messaggio del turno (narrazione/messaggio.ts), da cui si leggono le azioni, le battute
 *   indicate dal Motore, il catalogo e le battute d'attesa.
 * - Il modello risponde in JSON (llm/strutturato.ts: validazione severa, un ritentativo). Il ripiego è
 *   deterministico: la prima battuta indicata per quell'azione, altrimenti «nessuna».
 * - «nessuna»: una battuta d'attesa del repertorio (riempitivo), se il Motore ne ha messe; mai prosa nuova.
 * - L'annuncio passa da una guardia: una riga, col nome del PG, senza markup, ≤ 20 parole; se no, niente
 *   annuncio. Le azioni PRIVATE non si annunciano mai.
 */
import type { Logger } from '../logger';
import { costoZero, type ModelloLinguaggio, type RispostaModello } from './modello';
import { chiediStrutturato } from './strutturato';
import type { EsitoNarrazione, Narratore, RichiestaNarrazione } from './tipi';

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

/** Legge dal messaggio del turno le sezioni che servono al lettore minimo. */
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
  const indicate = new Map<string, string[]>();
  for (const r of trova(/^Battute indicate dal Motore/)) {
    const m = /^- (pg_[\w-]+) /.exec(r.trim());
    if (m) indicate.set(m[1]!, [...r.matchAll(/\[usa\] ([\w-]+) >/g)].map((x) => x[1]!));
  }
  const catalogo = new Map<string, string>();
  for (const r of trova(/^Catalogo: battute pertinenti/)) {
    const m = /^- ([\w-]+) · /.exec(r.trim());
    if (m) catalogo.set(m[1]!, r.trim().slice(2));
  }
  const attesa = trova(/^Battute d.attesa/).map((r) => /^- ([\w-]+)/.exec(r.trim())?.[1]).filter((x): x is string => !!x);
  return { azioni, indicate, catalogo, attesa };
}

const PROMPT = `Sei il lettore di una partita di D&D in italiano. Non scrivi la storia: per ogni azione scegli l'ID della battuta che le risponde, fra i candidati di quell'azione, oppure "nessuna".
Per ogni azione scrivi anche "annuncio": una frase breve in terza persona col nome del personaggio, solo ciò che il giocatore ha scritto (es. "Mirta guarda le impronte nella neve."). Per le azioni PRIVATE l'annuncio è "".
"battuta" è SOLO l'id (la parola prima dei due punti), mai il testo.
Esempio di risposta: {"risposte":[{"pg":"pg_mirta","battuta":"nar_impronte","annuncio":"Mirta guarda le impronte nella neve."}]}`;

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
        required: ['pg', 'battuta', 'annuncio'],
        properties: { pg: { type: 'string' }, battuta: { type: 'string' }, annuncio: { type: 'string', maxLength: 200 } },
      },
    },
  },
};

type Risposte = { risposte: Array<{ pg: string; battuta: string; annuncio: string }> };

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

/** L'annuncio passa solo se è una frase breve, in terza persona, col nome del PG e senza markup. */
export function annuncioValido(annuncio: string, nome: string): string | null {
  const a = annuncio.replace(/\s+/g, ' ').trim();
  if (!a || /[[\]<>\n]/.test(a)) return null;
  const parole = a.split(' ').length;
  const primo = nome.split(/\s+/)[0]!;
  if (parole > 20 || !a.toLowerCase().includes(primo.toLowerCase())) return null;
  if (/\b(io|mi|tu|ti|voi|vi)\b/i.test(a.split(' ').slice(0, 2).join(' '))) return null;
  return /[.!?…]$/.test(a) ? a : `${a}.`;
}

export interface OpzioniMinimo {
  log: Logger;
  maxTokens?: number;
}

export class NarratoreMinimo implements Narratore {
  readonly nome = 'minimo' as const;
  readonly modello: string;

  constructor(
    private readonly m: ModelloLinguaggio,
    private readonly o: OpzioniMinimo,
  ) {
    this.modello = m.modello;
  }

  async narra(r: RichiestaNarrazione, onTesto: (delta: string) => void): Promise<EsitoNarrazione> {
    const t = leggiTurno(r.messaggio);
    const risposte: RispostaModello[] = [];
    let scelte: Risposte['risposte'] = [];
    if (t.azioni.length) {
      const per = new Map(t.azioni.map((a) => [a.id_pg, candidati(t, a.id_pg, a.testo)]));
      const elenco = t.azioni
        .map((a, i) => {
          const c = per.get(a.id_pg)!;
          const righe = c.map((id) => `   - ${rigaBreve(t, id)}`).join('\n') || '   (nessun candidato: battuta "nessuna")';
          return `${i + 1}. ${a.nome} (${a.id_pg})${a.privata ? ' [PRIVATA]' : ''}: ${a.testo}\n   Candidati (id: quando):\n${righe}`;
        })
        .join('\n');
      const ripiego = (): Risposte => ({ risposte: t.azioni.map((a) => ({ pg: a.id_pg, battuta: t.indicate.get(a.id_pg)?.[0] ?? 'nessuna', annuncio: '' })) });
      const risposta = await chiediStrutturato<Risposte>(
        this.m,
        { sistema: [{ testo: PROMPT, cache: true }], messaggi: [{ ruolo: 'user', testo: `Azioni del turno:\n${elenco}` }], maxTokens: this.o.maxTokens ?? 40 + 50 * t.azioni.length, signal: r.signal },
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
      scelte = risposta.risposte;
    }
    const testo = this.protocollo(t, scelte);
    onTesto(testo);
    const uso = risposte.reduce((a, x) => ({ input_tokens: a.input_tokens + x.uso.input_tokens, output_tokens: a.output_tokens + x.uso.output_tokens, cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (x.uso.cache_read_input_tokens ?? 0) }), { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 });
    this.o.log.info({ turno: r.turno, azioni: t.azioni.length, scelte: scelte.map((s) => `${s.pg}:${s.battuta}`), chiamate: risposte.length }, 'lettore minimo: scelte del turno');
    return { testo, modello: this.modello, stopReason: 'end_turn', uso, costo: risposte.reduce((a, x) => (x.costo.costo_usd ? { ...a, costo_usd: a.costo_usd + x.costo.costo_usd } : a), costoZero(uso)), idMessaggio: null };
  }

  /** Le righe del protocollo: per ogni azione annuncio (se valido) e battuta; poi l'invito. */
  protocollo(t: TurnoLetto, scelte: Risposte['risposte']): string {
    const righe: string[] = [];
    const attesa = [...t.attesa];
    const usate = new Set<string>();
    for (const a of t.azioni) {
      const s = scelte.find((x) => x.pg === a.id_pg);
      const annuncio = a.privata ? null : annuncioValido(s?.annuncio ?? '', a.nome);
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
