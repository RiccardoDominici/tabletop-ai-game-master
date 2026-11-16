/**
 * The candidate checker of docs/coerenza.md («Frozen replay set»): a deterministic mention filter picks the sentences a
 * coherence rule is about (someone out of play or absent named, a creature noun nobody in play answers to, the target
 * of a blow that hurt next to a miss word), and a small fast model answers ONE yes/no question on each, with the
 * ledger's rows: «does this sentence make X act, speak or be present now?». The words that decide are the model's, not
 * a word list; the Engine decides what to ask and what is true.
 *
 * Here: the question (pure, from the language pack `coerenza.domanda`) and the call (any ModelloLinguaggio with
 * structured output). Not wired into the narration: it is scored offline first (strumenti/coerenza-domanda.ts) and is
 * adopted only if it beats the rules on the frozen set; profile A (no fast model) keeps the rules.
 */
import { nomeBreve } from '../campagna/nomi';
import { testo } from '../lingua';
import type { ModelloLinguaggio } from '../llm/modello';
import { righeVeroAdesso } from './blocco';
import type { EntitaRegistro, Registro } from './registro';

/** What the filter flagged in a sentence: `fuori:<id>`, `assente:<id>`, `parla:<id>`, `nome:<noun>`, `colpo:<id>`. */
export interface DatiDomanda {
  registro: Registro;
  frase: string;
  prima: string;
  menzioni: readonly string[];
  /** For `colpo:<id>`: who hit that target this turn. */
  colpi?: ReadonlyArray<{ chi: string; bersaglio: string }>;
}

const SCHEMA = {
  type: 'object',
  properties: { risposta: { type: 'string', enum: ['si', 'no'] } },
  required: ['risposta'],
  additionalProperties: false,
} as const;

function statoDi(e: EntitaRegistro): string {
  return e.presenza !== 'in_scena' && e.stato !== 'morto' && e.stato !== 'fuggito' ? testo('coerenza.domanda.assente') : testo(`coerenza.stato.${e.stato}`, { nome: nomeBreve(e.nome) });
}

/** The question for one flagged sentence (several mentions: «… Oppure: …»), or null when there is nothing to ask. */
export function domandaPer(d: DatiDomanda): { sistema: string; messaggio: string } | null {
  const per = new Map(d.registro.entita.map((e) => [e.id, e]));
  const parti: string[] = [];
  const chiesti = new Set<string>();
  for (const m of d.menzioni) {
    const [tipo, valore] = m.split(':') as [string, string];
    if ((tipo === 'fuori' || tipo === 'assente' || tipo === 'parla') && !chiesti.has(valore)) {
      const e = per.get(valore);
      if (!e) continue;
      chiesti.add(valore);
      parti.push(testo('coerenza.domanda.chi', { nome: nomeBreve(e.nome), stato: statoDi(e) }));
    } else if (tipo === 'nome' && !chiesti.has(m)) {
      chiesti.add(m);
      const titolari = d.registro.entita.filter((e) => e.tipo !== 'pg' && e.nomi.some((n) => n.toLowerCase() === valore));
      const caduti = titolari.length ? testo('coerenza.domanda.caduti', { elenco: titolari.map(statoDi).join('; ') }) : '';
      parti.push(testo('coerenza.domanda.nome', { parola: valore, caduti }));
    } else if (tipo === 'colpo' && !chiesti.has(m)) {
      chiesti.add(m);
      for (const k of (d.colpi ?? []).filter((x) => x.bersaglio === valore)) {
        parti.push(testo('coerenza.domanda.colpo', { chi: nomeBreve(per.get(k.chi)?.nome ?? k.chi), bersaglio: nomeBreve(per.get(valore)?.nome ?? valore) }));
      }
    }
  }
  if (!parti.length) return null;
  return {
    sistema: testo('coerenza.domanda.sistema'),
    messaggio: testo('coerenza.domanda.messaggio', {
      vero: righeVeroAdesso(d.registro).join('\n'),
      prima: d.prima || '—',
      frase: d.frase,
      domanda: parti.join(testo('coerenza.domanda.oppure')),
    }),
  };
}

/** Asks the model; true = the sentence does what was asked (a violation). An unreadable answer is «no» (logged by the caller). */
export async function chiedi(modello: ModelloLinguaggio, q: { sistema: string; messaggio: string }, signal?: AbortSignal): Promise<{ si: boolean; ms: number; grezza: string }> {
  const t0 = Date.now();
  const r = await modello.chiedi({
    sistema: [{ testo: q.sistema, cache: true }],
    messaggi: [{ ruolo: 'user', testo: q.messaggio }],
    maxTokens: 20,
    ...(modello.capacita.strutturato ? { schema: SCHEMA as unknown as Record<string, unknown> } : {}),
    ...(signal ? { signal } : {}),
  });
  let si = false;
  try {
    si = (JSON.parse(r.testo) as { risposta?: string }).risposta === 'si';
  } catch {
    si = /^\s*s[iì]/iu.test(r.testo);
  }
  return { si, ms: Date.now() - t0, grezza: r.testo };
}
