/**
 * Provider Anthropic dell'interfaccia unica (llm/modello.ts). Fa ESATTAMENTE le richieste che il
 * gioco faceva prima a Haiku 5.5, così il comportamento non cambia:
 * - thinking disattivato, output_config.effort 'low' (+ format json_schema con `schema`);
 * - cache_control 'ephemeral' sui blocchi di sistema marcati `cache`;
 * - niente temperature/top_p/top_k, niente prefill.
 * Il client (chiave, baseURL fisso su api.anthropic.com) lo crea llm/haiku.ts → creaClientAnthropic.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { calcolaCosto, TARIFFE, type UsoToken } from './costi';
import { costoZero, type ModelloLinguaggio, type RichiestaModello, type RispostaModello } from './modello';

export class ModelloAnthropic implements ModelloLinguaggio {
  readonly provider = 'anthropic' as const;
  readonly capacita = { strutturato: true, preriscalda: true };
  readonly descrizione: string;

  constructor(
    private readonly client: () => Anthropic,
    readonly modello: string,
  ) {
    this.descrizione = `anthropic ${modello}`;
  }

  /** I parametri della richiesta, gli stessi per chiedi, flusso e preriscaldamento. */
  parametri(r: RichiestaModello) {
    return {
      model: this.modello,
      max_tokens: r.maxTokens,
      thinking: { type: 'disabled' as const },
      output_config: r.schema ? { effort: 'low' as const, format: { type: 'json_schema' as const, schema: r.schema } } : { effort: 'low' as const },
      system: r.sistema.map((b) => (b.cache ? { type: 'text' as const, text: b.testo, cache_control: { type: 'ephemeral' as const } } : { type: 'text' as const, text: b.testo })),
      messages: r.messaggi.map((m) => ({ role: m.ruolo, content: m.testo })),
    };
  }

  private costo(uso: UsoToken) {
    return TARIFFE[this.modello] ? calcolaCosto(this.modello, uso) : costoZero(uso);
  }

  async chiedi(r: RichiestaModello): Promise<RispostaModello> {
    const risposta = await this.client().messages.create(this.parametri(r) as Parameters<Anthropic['messages']['create']>[0], r.signal ? { signal: r.signal } : undefined) as Anthropic.Message;
    const uso = risposta.usage as unknown as UsoToken;
    const blocco = risposta.content.find((b) => b.type === 'text');
    return {
      testo: blocco && blocco.type === 'text' ? blocco.text : '',
      modello: risposta.model,
      stopReason: risposta.stop_reason ?? null,
      uso,
      costo: this.costo(uso),
      id: risposta.id,
    };
  }

  async flusso(r: RichiestaModello, onDelta: (delta: string) => void): Promise<RispostaModello> {
    const stream = this.client().messages.stream(this.parametri(r) as Parameters<Anthropic['messages']['stream']>[0], r.signal ? { signal: r.signal } : undefined);
    let testo = '';
    for await (const evento of stream) {
      if (evento.type === 'content_block_delta' && evento.delta.type === 'text_delta') {
        testo += evento.delta.text;
        onDelta(evento.delta.text);
      }
    }
    const finale = await stream.finalMessage();
    const uso = finale.usage as unknown as UsoToken;
    return { testo, modello: finale.model, stopReason: finale.stop_reason ?? null, uso, costo: this.costo(uso), id: finale.id };
  }
}
