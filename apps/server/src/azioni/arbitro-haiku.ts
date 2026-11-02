/**
 * Arbitro con Claude Haiku 5.5 e uscita strutturata (skill claude-api: `output_config.format`
 * con `type: 'json_schema'`; schemi con `additionalProperties: false`, senza vincoli numerici o di
 * lunghezza, che l'API non supporta). Chiamate brevi, non in streaming, thinking spento, effort
 * basso. Il prompt di sistema e il riassunto pubblico della scena stanno in blocchi in cache.
 *
 * Consiglia soltanto: dipendenze, conflitti, giudizio delle azioni vecchie, effetto di un cambio.
 * Gli stati e gli avvisi li decide il Motore (azioni/tavolo.ts), che filtra anche i suggerimenti
 * non ammessi (es. dipendere da un'azione privata altrui).
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { Logger } from '../logger';
import { calcolaCosto, type Costo, type UsoToken } from '../llm/costi';
import type { Arbitro, AzioneArbitro, ContestoArbitro, EsitoRelazioni, Giudizio } from './tipi';

export const PROMPT_ARBITRO = `Sei l'arbitro delle azioni di una partita di D&D dal vivo, in italiano. Più giocatori scrivono sul telefono, nello stesso momento, cosa fanno i loro personaggi (PG). Tu non narri: dici al programma come le azioni si collegano tra loro e con la narrazione. Rispondi solo con il JSON richiesto.

Definizioni.
- DIPENDENZA: l'azione nuova ha senso solo insieme a un'altra azione in coda, o per via di essa: si unisce («anch'io», «faccio lo stesso»), segue o accompagna il suo autore («lo seguo», «vado con Ginestra», «resto dietro di lei»), lo aiuta o lo copre mentre la fa («copro Corrado», «gli faccio luce mentre apre»), o fa qualcosa che presuppone quell'azione. Indica l'id dell'azione da cui dipende, non quello di chi la segue a sua volta.
- NON è una dipendenza: nominare, salutare o guardare un altro PG; parlargli in personaggio; fare una cosa simile per conto proprio; rivolgersi allo stesso PNG con domande diverse; chiedere aiuto a un PNG; paragoni («come Ginestra, ho fame»).
- Da un'azione PRIVATA di un altro giocatore non si può dipendere: l'autore non la vede.
- CONFLITTO ESCLUSIVO: le due azioni non possono riuscire entrambe come scritte: lo stesso oggetto unico (la chiave, la borsa), la stessa porta o lo stesso passaggio usati in modi opposti (uno apre, l'altro sbarra), mosse che si escludono (portare fuori il cane / chiuderlo nel retro).
- CONFLITTO NON ESCLUSIVO: due azioni agiscono sulla STESSA persona o sullo STESSO oggetto e spingono in direzioni diverse, ma si possono tentare entrambe (uno minaccia il nano, l'altro lo blandisce; due attaccano lo stesso avversario; consigli opposti alla stessa persona: sono parole, si dicono entrambe). Due domande compatibili allo stesso PNG, due che guardano la stessa cosa, o azioni in posti diversi NON sono un conflitto.
- Dire a qualcuno di aprire o chiudere qualcosa non è aprirlo o chiuderlo: il conflitto esclusivo riguarda azioni fisiche dei PG sulla stessa cosa.
- I conflitti valgono anche con azioni private.
- AZIONE VECCHIA: scritta prima dell'ultima narrazione. «valida» se si può ancora fare come scritta; «dubbia» se la narrazione ha cambiato qualcosa su cui l'azione contava ma potrebbe avere ancora senso (va chiesto al giocatore); «impossibile» solo se la narrazione l'ha resa impossibile del tutto, anche aspettando un momento (la persona è sparita o non c'è più, l'oggetto è distrutto o portato via, la porta è chiusa a chiave e chi agisce non ha modo di aprirla). Se qualcuno si è solo allontanato per poco o la situazione è cambiata ma l'intento si può ancora inseguire, è «dubbia». Per dubbia e impossibile scrivi «motivo»: una frase breve per il giocatore che dice cosa è cambiato, al presente, senza segreti e senza il contenuto di azioni private altrui. Per valida, motivo vuoto.
- CAMBIO: l'autore di un'azione l'ha modificata; per ogni azione che ne dipendeva di' se il cambio la tocca («toccata»: true se ciò su cui contava non vale più, per esempio va altrove o fa altro; false se aggiunge solo un dettaglio o resta nella stessa direzione).

Nel dubbio non inventare collegamenti: un avviso inutile disturba il tavolo.`;

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

function riga(a: AzioneArbitro): string {
  return `- id ${a.id} · ${a.nome} (${a.autore})${a.privata ? ' · PRIVATA' : ''}: «${a.testo}»`;
}

export interface MisuraChiamata {
  tipo: 'relazioni' | 'vecchie' | 'cambio';
  ms: number;
  costo: Costo;
}

export class ArbitroHaiku implements Arbitro {
  constructor(
    private readonly client: () => Anthropic,
    private readonly o: { modello: string; log: Logger; onMisura?: (m: MisuraChiamata) => void; maxTokens?: number },
  ) {}

  private async chiedi<T>(tipo: MisuraChiamata['tipo'], ctx: ContestoArbitro, schema: Record<string, unknown>, messaggio: string): Promise<T> {
    const t0 = performance.now();
    const risposta = await this.client().messages.create({
      model: this.o.modello,
      max_tokens: this.o.maxTokens ?? 600,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      system: [
        { type: 'text', text: PROMPT_ARBITRO },
        { type: 'text', text: `Scena (parte pubblica):\n${ctx.scena}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: messaggio }],
    });
    const ms = Math.round(performance.now() - t0);
    const costo = calcolaCosto(this.o.modello, risposta.usage as unknown as UsoToken);
    this.o.onMisura?.({ tipo, ms, costo });
    if (risposta.stop_reason !== 'end_turn') throw new Error(`arbitro: stop_reason ${String(risposta.stop_reason)}`);
    const testo = risposta.content.find((b) => b.type === 'text');
    if (!testo || testo.type !== 'text') throw new Error('arbitro: risposta senza testo');
    return JSON.parse(testo.text) as T;
  }

  async relazioni(i: ContestoArbitro & { nuova: AzioneArbitro; coda: AzioneArbitro[] }): Promise<EsitoRelazioni> {
    const msg = [
      `Ultima narrazione:\n${i.narrazione || '(nessuna)'}`,
      `Azioni già in coda:\n${i.coda.map(riga).join('\n')}`,
      `Azione nuova:\n${riga(i.nuova)}`,
      'Da quali azioni in coda dipende l’azione nuova, e con quali è in conflitto? Usa solo id dell’elenco «in coda».',
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
      `Narrazione appena arrivata (dopo che queste azioni erano state scritte):\n${i.narrazione || '(nessuna)'}`,
      `Azioni scritte prima:\n${i.azioni.map(riga).join('\n')}`,
      'Giudica ogni azione: valida, dubbia o impossibile, con il motivo per il giocatore.',
    ].join('\n\n');
    const r = await this.chiedi<{ giudizi: Array<{ id: string; giudizio: Giudizio; motivo: string }> }>('vecchie', i, SCHEMA_VECCHIE, msg);
    const ids = new Set(i.azioni.map((a) => a.id));
    return Object.fromEntries(r.giudizi.filter((g) => ids.has(g.id)).map((g) => [g.id, { giudizio: g.giudizio, motivo: g.motivo }]));
  }

  async cambio(i: ContestoArbitro & { prima: AzioneArbitro; dopo: AzioneArbitro; dipendenti: AzioneArbitro[] }): Promise<Record<string, { toccata: boolean }>> {
    const msg = [
      `Ultima narrazione:\n${i.narrazione || '(nessuna)'}`,
      `Azione prima del cambio:\n${riga(i.prima)}`,
      `Azione dopo il cambio:\n${riga(i.dopo)}`,
      `Azioni che ne dipendevano:\n${i.dipendenti.map(riga).join('\n')}`,
      'Per ogni azione che ne dipendeva: il cambio la tocca?',
    ].join('\n\n');
    const r = await this.chiedi<{ dipendenti: Array<{ id: string; toccata: boolean }> }>('cambio', i, SCHEMA_CAMBIO, msg);
    return Object.fromEntries(r.dipendenti.map((d) => [d.id, { toccata: d.toccata }]));
  }
}
