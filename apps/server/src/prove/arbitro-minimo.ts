/**
 * Arbitro delle prove MINIMO (docs/provider.md): un'opzione da scegliere a mano in config
 * (`arbitro_prove: {provider: locale, modo: minimo}`); il default in locale è `regole`, cioè nessun
 * modello e il classificatore del Motore (prove/classificatore-regole.ts, «dadi»).
 * Misurato il 10/11/2026 sulla 4730: l'arbitro completo con Qwen3 4B impiegava 15–36 s a chiamata.
 *
 * Qui il modello sceglie poco, e le regole restano in un posto solo:
 * 1. le parole chiave del classificatore (lingue/<codice>/prove.yaml) danno al più tre abilità candidate;
 * 2. nessuna candidata → nessuna decisione: decide la riserva a regole del Motore (scena, attacchi, aiuto);
 * 3. altrimenti un prompt corto: l'azione, le candidate come enum, la difficoltà; JSON, 3 s al massimo;
 * 4. il modello non risponde in tempo o male → nessuna decisione, e decide di nuovo la riserva del Motore.
 */
import type { Logger } from '../logger';
import { ABILITA_INFLUENZA, type Abilita } from '../campagna/regole-srd';
import { sommaCosti } from '../llm/costi';
import type { ModelloLinguaggio, RispostaModello } from '../llm/modello';
import { chiediStrutturato } from '../llm/strutturato';
import { daGrezza, type DecisioneGrezza, type MisuraProve } from './arbitro-haiku';
import { testo } from '../lingua';
import { promptProve } from './lingua';
import { candidatiSrd } from './parole-chiave';
import type { ArbitroProve, AzioneDaClassificare, DecisioneProva, IngressoArbitroProve } from './tipi';

const DIFF = ['molto_facile', 'facile', 'media', 'difficile', 'molto_difficile'] as const;

/** Le abilità candidate dalle parole chiave (prove/parole-chiave.ts, la stessa tabella del classificatore a regole). */
export function candidatiAbilita(testo: string, max = 3): Abilita[] {
  return candidatiSrd(testo, max);
}

export function pngInScena(righe: string): Array<{ id: string; nome: string }> {
  return [...righe.matchAll(/^- (png_[\w-]+) = ([^·\n]+?)(?: ·|$)/gm)].map((m) => ({ id: m[1]!, nome: m[2]!.trim() }));
}

function pngNominato(testo: string, png: ReadonlyArray<{ id: string; nome: string }>): string | null {
  const t = testo.toLowerCase();
  return png.find((p) => t.includes(p.id.replace(/^png_/, '')) || p.nome.toLowerCase().split(/\s+/).some((n) => n.length >= 3 && new RegExp(`\\b${n}\\b`).test(t)))?.id ?? null;
}

function grezza(id: string, x: Partial<DecisioneGrezza>): DecisioneGrezza {
  return { id, tipo: 'nessuna', abilita: '', caratteristica: '', bersaglio: '', arma: '', prova_scena: '', difficolta: '', abilita_bersaglio: '', vantaggio: 'nessuno', motivo: '', aiuta: '', reazione_png: '', reazione_quando: 'nessuna', ...x };
}

export interface OpzioniArbitroMinimo {
  log: Logger;
  onMisura?: (m: MisuraProve) => void;
  /** Tempo massimo per azione; poi decide la riserva a regole del Motore. */
  attesaMs?: number;
}

export class ArbitroProveMinimo implements ArbitroProve {
  constructor(
    private readonly modello: () => ModelloLinguaggio,
    private readonly o: OpzioniArbitroMinimo,
  ) {}

  /** Solo le azioni che il modello ha deciso davvero: le altre le classifica la riserva del Motore. */
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    const png = pngInScena(i.personaggi);
    const out: Record<string, DecisioneProva> = {};
    for (const a of i.azioni) {
      const d = await this.una(a, png);
      if (d) out[a.id] = d;
    }
    return out;
  }

  private async una(a: AzioneDaClassificare, png: ReadonlyArray<{ id: string; nome: string }>): Promise<DecisioneProva | null> {
    const candidate = candidatiAbilita(a.testo);
    if (!candidate.length) return null;
    const t0 = performance.now();
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['tipo', 'abilita', 'difficolta'],
      properties: { tipo: { type: 'string', enum: ['nessuna', 'prova'] }, abilita: { type: 'string', enum: ['', ...candidate] }, difficolta: { type: 'string', enum: ['', ...DIFF] } },
    };
    // Il prompt corto nella lingua dei contenuti (prompts/<lingua>/arbitro-minimo.md); gli id restano quelli dello schema.
    const sistema = promptProve('arbitro-minimo');
    const risposte: RispostaModello[] = [];
    try {
      const r = await chiediStrutturato<{ tipo: string; abilita: string; difficolta: string }>(
        this.modello(),
        { sistema: [{ testo: sistema, cache: true }], messaggi: [{ ruolo: 'user', testo: testo('prove.minimo.messaggio', { nome: a.nome, testo: a.testo, abilita: candidate.join(', ') }) }], maxTokens: 40, signal: AbortSignal.timeout(this.o.attesaMs ?? 3000) },
        { schema, cosa: 'arbitro delle prove (minimo)', log: this.o.log, onRisposta: (x) => risposte.push(x) },
      );
      if (r.tipo !== 'prova' || !r.abilita) return daGrezza(grezza(a.id, { tipo: 'nessuna' }));
      // Influenza verso un PNG: la CD la dà la sua scheda (difficoltà vuota).
      const bersaglio = ABILITA_INFLUENZA.has(r.abilita as Abilita) ? pngNominato(a.testo, png) : null;
      return daGrezza(grezza(a.id, { tipo: 'prova', abilita: r.abilita, ...(bersaglio ? { bersaglio } : { difficolta: (DIFF as readonly string[]).includes(r.difficolta) ? r.difficolta : 'media' }) }));
    } catch (err) {
      this.o.log.warn({ azione: a.id, err: (err as Error).message }, 'prove: arbitro minimo senza risposta in tempo, decide la riserva a regole');
      return null;
    } finally {
      if (risposte.length) this.o.onMisura?.({ ms: Math.round(performance.now() - t0), azioni: 1, costo: risposte.map((x) => x.costo).reduce(sommaCosti) });
    }
  }
}
