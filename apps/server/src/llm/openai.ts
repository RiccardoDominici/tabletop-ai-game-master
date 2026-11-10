/**
 * Provider compatibile OpenAI dell'interfaccia unica (llm/modello.ts): `POST {url}/chat/completions`.
 * Copre tutto ciò che parla questa API cambiando solo l'URL:
 * - in locale: mlx-lm (`mlx_lm.server`, 127.0.0.1:4613/v1 su questo Mac), llama.cpp (`llama-server`),
 *   Ollama (`/v1`), LM Studio;
 * - in rete: OpenRouter (https://openrouter.ai/api/v1) o un altro servizio, con la chiave.
 *
 * I blocchi di sistema diventano UN messaggio di sistema, sempre uguale per tutta la scena: i server
 * locali con la cache del prefisso (mlx-lm `--prompt-cache-size`, llama.cpp `cache_prompt`) riusano
 * così il KV del prefisso fisso e rielaborano solo il messaggio del turno.
 * L'uscita strutturata (`response_format: json_schema`) si chiede solo se `strutturato` è vero:
 * i server locali non la garantiscono, e lì ci pensa llm/strutturato.ts.
 */
import { calcolaCosto, TARIFFE, type UsoToken } from './costi';
import { costoZero, type ModelloLinguaggio, type RichiestaModello, type RispostaModello } from './modello';

export interface OpzioniOpenAI {
  /** Base dell'API, fino a /v1 compreso (es. http://127.0.0.1:4613/v1). */
  url: string;
  modello: string;
  /** Chiave (Bearer); assente per i server locali. Mai nei log. */
  chiave?: string;
  /** Il server garantisce `response_format: json_schema`. */
  strutturato?: boolean;
  /** Temperatura (predefinita 0: deterministico, come serve a un classificatore). */
  temperatura?: number;
  /** Tempo massimo di una richiesta (i modelli locali possono essere lenti). */
  timeoutMs?: number;
  /** Etichetta del provider per i log (locale, openrouter, openai). */
  etichetta?: string;
  /**
   * Coda per server (stesso `url`): al più `concorrenza` richieste in volo. Un server locale su una GPU
   * sola regge male le richieste in parallelo (mlx-lm: «Impacting Interactivity», 10/11/2026), e il
   * lettore non deve aspettare dietro agli arbitri: `priorita` alta passa avanti; una richiesta a
   * priorità bassa che aspetta in coda più di `attesaMaxMs` rinuncia senza partire.
   */
  coda?: { concorrenza: number; priorita: 'alta' | 'bassa'; attesaMaxMs?: number };
  /** Per i test: fetch finto. */
  fetch?: typeof fetch;
}

interface InAttesa {
  alta: boolean;
  parti: () => void;
  rinuncia: (e: Error) => void;
  timer: NodeJS.Timeout | null;
}

/** Code dei server (per URL): richieste in volo e in attesa, con la priorità del lettore. */
const CODE = new Map<string, { inVolo: number; attesa: InAttesa[] }>();

async function inCoda<T>(url: string, o: NonNullable<OpzioniOpenAI['coda']>, lavoro: () => Promise<T>): Promise<T> {
  let c = CODE.get(url);
  if (!c) CODE.set(url, (c = { inVolo: 0, attesa: [] }));
  const coda = c;
  if (coda.inVolo >= o.concorrenza) {
    await new Promise<void>((parti, rinuncia) => {
      const voce: InAttesa = { alta: o.priorita === 'alta', parti, rinuncia, timer: null };
      if (!voce.alta && o.attesaMaxMs !== undefined) {
        voce.timer = setTimeout(() => {
          coda.attesa.splice(coda.attesa.indexOf(voce), 1);
          rinuncia(new Error(`server occupato da più di ${o.attesaMaxMs} ms (precedenza al lettore)`));
        }, o.attesaMaxMs);
      }
      // L'alta priorità va prima di tutte le basse in attesa.
      const i = voce.alta ? coda.attesa.findIndex((x) => !x.alta) : -1;
      if (i >= 0) coda.attesa.splice(i, 0, voce);
      else coda.attesa.push(voce);
    });
  }
  coda.inVolo += 1;
  try {
    return await lavoro();
  } finally {
    coda.inVolo -= 1;
    const prossima = coda.attesa.shift();
    if (prossima) {
      if (prossima.timer) clearTimeout(prossima.timer);
      prossima.parti();
    }
  }
}

interface RispostaChat {
  id?: string;
  model?: string;
  choices?: Array<{ message?: { content?: string | null }; delta?: { content?: string | null }; finish_reason?: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
}

export class ModelloOpenAI implements ModelloLinguaggio {
  readonly provider = 'openai' as const;
  readonly capacita: { strutturato: boolean; preriscalda: boolean };
  readonly modello: string;
  readonly descrizione: string;
  private readonly fetch: typeof fetch;

  constructor(private readonly o: OpzioniOpenAI) {
    this.modello = o.modello;
    this.capacita = { strutturato: o.strutturato === true, preriscalda: false };
    this.descrizione = `${o.etichetta ?? 'openai'} ${o.url} ${o.modello}`;
    this.fetch = o.fetch ?? fetch;
  }

  private corpo(r: RichiestaModello, stream: boolean): Record<string, unknown> {
    const sistema = r.sistema.map((b) => b.testo).join('\n\n');
    return {
      model: this.modello,
      messages: [...(sistema ? [{ role: 'system', content: sistema }] : []), ...r.messaggi.map((m) => ({ role: m.ruolo, content: m.testo }))],
      max_tokens: r.maxTokens,
      temperature: this.o.temperatura ?? 0,
      stream,
      ...(stream ? { stream_options: { include_usage: true } } : {}),
      ...(r.schema && this.capacita.strutturato ? { response_format: { type: 'json_schema', json_schema: { name: 'risposta', strict: true, schema: r.schema } } } : {}),
    };
  }

  private async invia(r: RichiestaModello, stream: boolean): Promise<Response> {
    const segnali = [AbortSignal.timeout(this.o.timeoutMs ?? 90_000), ...(r.signal ? [r.signal] : [])];
    let risposta: Response;
    try {
      risposta = await this.fetch(`${this.o.url.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(this.o.chiave ? { authorization: `Bearer ${this.o.chiave}` } : {}) },
        body: JSON.stringify(this.corpo(r, stream)),
        signal: AbortSignal.any(segnali),
      });
    } catch (err) {
      if (r.signal?.aborted) throw err;
      throw new Error(`${this.descrizione}: irraggiungibile (${(err as Error).message})`);
    }
    if (!risposta.ok) {
      const testo = await risposta.text().catch(() => '');
      throw new Error(`${this.descrizione}: HTTP ${risposta.status} ${testo.slice(0, 200)}`);
    }
    return risposta;
  }

  private esito(testo: string, j: RispostaChat | null, finish: string | null): RispostaModello {
    const cached = j?.usage?.prompt_tokens_details?.cached_tokens ?? 0;
    const uso: UsoToken = { input_tokens: Math.max(0, (j?.usage?.prompt_tokens ?? 0) - cached), output_tokens: j?.usage?.completion_tokens ?? 0, cache_read_input_tokens: cached };
    // Le ragioni di fine nel vocabolario di Anthropic, che il resto del gioco già controlla.
    const stopReason = finish === 'stop' ? 'end_turn' : finish === 'length' ? 'max_tokens' : finish;
    return { testo, modello: j?.model ?? this.modello, stopReason, uso, costo: TARIFFE[this.modello] ? calcolaCosto(this.modello, uso) : costoZero(uso), id: j?.id ?? null };
  }

  /** In coda (se configurata) per il server di questo URL. */
  private inCoda<T>(lavoro: () => Promise<T>): Promise<T> {
    return this.o.coda ? inCoda(this.o.url, this.o.coda, lavoro) : lavoro();
  }

  chiedi(r: RichiestaModello): Promise<RispostaModello> {
    return this.inCoda(() => this.chiediOra(r));
  }

  flusso(r: RichiestaModello, onDelta: (delta: string) => void): Promise<RispostaModello> {
    return this.inCoda(() => this.flussoOra(r, onDelta));
  }

  private async chiediOra(r: RichiestaModello): Promise<RispostaModello> {
    const j = (await (await this.invia(r, false)).json()) as RispostaChat;
    const scelta = j.choices?.[0];
    return this.esito(scelta?.message?.content ?? '', j, scelta?.finish_reason ?? null);
  }

  /** Streaming SSE: righe `data: {…}`, fino a `data: [DONE]`. */
  private async flussoOra(r: RichiestaModello, onDelta: (delta: string) => void): Promise<RispostaModello> {
    const risposta = await this.invia(r, true);
    if (!risposta.body) throw new Error(`${this.descrizione}: risposta senza corpo`);
    const decoder = new TextDecoder();
    let buffer = '';
    let testo = '';
    let ultimo: RispostaChat | null = null;
    let finish: string | null = null;
    for await (const pezzo of risposta.body as unknown as AsyncIterable<Uint8Array>) {
      buffer += decoder.decode(pezzo, { stream: true });
      let i: number;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const riga = buffer.slice(0, i).trim();
        buffer = buffer.slice(i + 1);
        if (!riga.startsWith('data:')) continue;
        const dati = riga.slice(5).trim();
        if (dati === '[DONE]') continue;
        let j: RispostaChat;
        try {
          j = JSON.parse(dati) as RispostaChat;
        } catch {
          continue; // riga spezzata o commento del server
        }
        if (j.usage || !ultimo) ultimo = { ...(ultimo ?? {}), ...j };
        const scelta = j.choices?.[0];
        const delta = scelta?.delta?.content ?? '';
        if (delta) {
          testo += delta;
          onDelta(delta);
        }
        if (scelta?.finish_reason) finish = scelta.finish_reason;
      }
    }
    return this.esito(testo, ultimo, finish);
  }
}
