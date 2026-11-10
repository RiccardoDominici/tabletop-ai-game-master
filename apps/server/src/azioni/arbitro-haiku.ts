/**
 * Arbitro con Claude Haiku 5.5 e uscita strutturata (skill claude-api: `output_config.format`
 * con `type: 'json_schema'`; schemi con `additionalProperties: false`, senza vincoli numerici o di
 * lunghezza, che l'API non supporta). Chiamate brevi, non in streaming, thinking spento, effort
 * basso. Il prompt di sistema e il riassunto pubblico della scena stanno in blocchi in cache.
 *
 * Consiglia soltanto: dipendenze, conflitti, giudizio delle azioni vecchie, effetto di un cambio.
 * Gli stati e gli avvisi li decide il Motore (azioni/tavolo.ts), che filtra anche i suggerimenti
 * non ammessi (es. dipendere da un'azione privata altrui).
 *
 * Prompt e messaggi sono nella lingua dei contenuti: prompts/<codice>/arbitro-azioni.md e
 * lingue/<codice>/testi-modelli.yaml (`modelli.arbitro`). I campi JSON restano uguali in ogni lingua.
 */
import { testo } from '../lingua';
import { prompt } from '../lingua/motore';
import type { Logger } from '../logger';
import { sommaCosti, type Costo } from '../llm/costi';
import type { ModelloLinguaggio, RispostaModello } from '../llm/modello';
import { chiediStrutturato } from '../llm/strutturato';
import type { Arbitro, AzioneArbitro, ContestoArbitro, EsitoRelazioni, Giudizio } from './tipi';

/** Il prompt di sistema dell'arbitro nella lingua dei contenuti: prompts/<codice>/arbitro-azioni.md. */
export const promptArbitro = (): string => prompt('arbitro-azioni');

const SCHEMA_RELAZIONI = {
  type: 'object',
  properties: {
    dipende_da: { type: 'array', items: { type: 'string' } },
    conflitti: {
      type: 'array',
      items: {
        type: 'object',
        properties: { con: { type: 'string' }, esclusivo: { type: 'boolean' } },
        required: ['con', 'esclusivo'],
        additionalProperties: false,
      },
    },
  },
  required: ['dipende_da', 'conflitti'],
  additionalProperties: false,
} as const;

const SCHEMA_VECCHIE = {
  type: 'object',
  properties: {
    giudizi: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          giudizio: { type: 'string', enum: ['valida', 'dubbia', 'impossibile'] },
          motivo: { type: 'string' },
        },
        required: ['id', 'giudizio', 'motivo'],
        additionalProperties: false,
      },
    },
  },
  required: ['giudizi'],
  additionalProperties: false,
} as const;

const SCHEMA_CAMBIO = {
  type: 'object',
  properties: {
    dipendenti: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, toccata: { type: 'boolean' } },
        required: ['id', 'toccata'],
        additionalProperties: false,
      },
    },
  },
  required: ['dipendenti'],
  additionalProperties: false,
} as const;

/** Un'azione nel messaggio all'arbitro (lingue/<codice>/testi-modelli.yaml, `modelli.arbitro`). */
function riga(a: AzioneArbitro): string {
  return testo('modelli.arbitro.riga', { id: a.id, nome: a.nome, autore: a.autore, privata: a.privata ? testo('modelli.arbitro.privata') : '', testo: a.testo });
}

const oNessuna = (n: string): string => n || testo('modelli.arbitro.nessuna');

export interface MisuraChiamata {
  tipo: 'relazioni' | 'vecchie' | 'cambio';
  ms: number;
  costo: Costo;
}

export class ArbitroHaiku implements Arbitro {
  constructor(
    /** Il modello (llm/modello.ts): Anthropic come prima, o un provider locale/compatibile OpenAI. */
    private readonly modello: () => ModelloLinguaggio,
    private readonly o: { modello: string; log: Logger; onMisura?: (m: MisuraChiamata) => void; maxTokens?: number },
  ) {}

  private async chiedi<T>(tipo: MisuraChiamata['tipo'], ctx: ContestoArbitro, schema: Record<string, unknown>, messaggio: string): Promise<T> {
    const t0 = performance.now();
    const risposte: RispostaModello[] = [];
    try {
      return await chiediStrutturato<T>(
        this.modello(),
        {
          sistema: [{ testo: promptArbitro() }, { testo: testo('modelli.arbitro.scena', { scena: ctx.scena }), cache: true }],
          messaggi: [{ ruolo: 'user', testo: messaggio }],
          maxTokens: this.o.maxTokens ?? 600,
        },
        { schema, cosa: `arbitro ${tipo}`, log: this.o.log, onRisposta: (r) => risposte.push(r) },
      );
    } finally {
      // Una misura per chiamata del gioco, anche quando un provider locale ha ritentato.
      if (risposte.length) this.o.onMisura?.({ tipo, ms: Math.round(performance.now() - t0), costo: risposte.map((r) => r.costo).reduce(sommaCosti) });
    }
  }

  async relazioni(i: ContestoArbitro & { nuova: AzioneArbitro; coda: AzioneArbitro[] }): Promise<EsitoRelazioni> {
    const msg = [
      testo('modelli.arbitro.ultima_narrazione', { narrazione: oNessuna(i.narrazione) }),
      testo('modelli.arbitro.in_coda', { azioni: i.coda.map(riga).join('\n') }),
      testo('modelli.arbitro.nuova', { azione: riga(i.nuova) }),
      testo('modelli.arbitro.domanda_relazioni'),
    ].join('\n\n');
    const r = await this.chiedi<{ dipende_da: string[]; conflitti: Array<{ con: string; esclusivo: boolean }> }>('relazioni', i, SCHEMA_RELAZIONI, msg);
    const ids = new Set(i.coda.map((a) => a.id));
    return {
      dipende_da: r.dipende_da.filter((id) => ids.has(id)),
      conflitti: r.conflitti.filter((c) => ids.has(c.con)),
      fonte: 'modello',
    };
  }

  async vecchie(i: ContestoArbitro & { azioni: AzioneArbitro[] }): Promise<Record<string, { giudizio: Giudizio; motivo: string }>> {
    const msg = [
      testo('modelli.arbitro.narrazione_arrivata', { narrazione: oNessuna(i.narrazione) }),
      testo('modelli.arbitro.scritte_prima', { azioni: i.azioni.map(riga).join('\n') }),
      testo('modelli.arbitro.domanda_vecchie'),
    ].join('\n\n');
    const r = await this.chiedi<{ giudizi: Array<{ id: string; giudizio: Giudizio; motivo: string }> }>('vecchie', i, SCHEMA_VECCHIE, msg);
    const ids = new Set(i.azioni.map((a) => a.id));
    return Object.fromEntries(r.giudizi.filter((g) => ids.has(g.id)).map((g) => [g.id, { giudizio: g.giudizio, motivo: g.motivo }]));
  }

  async cambio(i: ContestoArbitro & { prima: AzioneArbitro; dopo: AzioneArbitro; dipendenti: AzioneArbitro[] }): Promise<Record<string, { toccata: boolean }>> {
    const msg = [
      testo('modelli.arbitro.ultima_narrazione', { narrazione: oNessuna(i.narrazione) }),
      testo('modelli.arbitro.prima_del_cambio', { azione: riga(i.prima) }),
      testo('modelli.arbitro.dopo_il_cambio', { azione: riga(i.dopo) }),
      testo('modelli.arbitro.dipendenti', { azioni: i.dipendenti.map(riga).join('\n') }),
      testo('modelli.arbitro.domanda_cambio'),
    ].join('\n\n');
    const r = await this.chiedi<{ dipendenti: Array<{ id: string; toccata: boolean }> }>('cambio', i, SCHEMA_CAMBIO, msg);
    return Object.fromEntries(r.dipendenti.map((d) => [d.id, { toccata: d.toccata }]));
  }
}
