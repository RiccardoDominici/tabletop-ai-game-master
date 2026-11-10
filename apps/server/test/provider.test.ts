/**
 * Provider dei modelli (docs/provider.md): il server compatibile OpenAI (finto, su una porta locale),
 * l'uscita strutturata con validazione e ripiego, le richieste Anthropic identiche a prima, la scelta
 * dei provider con le riserve, il lettore minimo.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loggerMuto } from '../src/logger';
import { ModelloAnthropic } from '../src/llm/anthropic';
import { annuncioBreve, leggiTurno, NarratoreMinimo } from '../src/llm/minimo';
import { ModelloOpenAI } from '../src/llm/openai';
import { chiediStrutturato, erroriSchema, estraiJson } from '../src/llm/strutturato';
import { caricaConfigProvider, risolvi } from '../src/provider/config';

/** Server finto compatibile OpenAI: risponde con la prossima risposta della coda (testo o JSON). */
let server: http.Server;
let url = '';
const coda: string[] = [];
const ricevute: Array<Record<string, unknown>> = [];
beforeAll(async () => {
  server = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (d) => (corpo += d));
    req.on('end', () => {
      const j = JSON.parse(corpo) as Record<string, unknown>;
      ricevute.push(j);
      const testo = coda.shift() ?? '';
      if (j['stream']) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        for (const pezzo of testo.match(/.{1,5}/gs) ?? []) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: pezzo } }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 7, prompt_tokens_details: { cached_tokens: 80 } } })}\n\n`);
        res.end('data: [DONE]\n\n');
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'x', model: j['model'], choices: [{ message: { content: testo }, finish_reason: 'stop' }], usage: { prompt_tokens: 50, completion_tokens: 5 } }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
afterAll(() => server.close());

const locale = () => new ModelloOpenAI({ url, modello: 'qwen-prova', etichetta: 'locale' });

describe('provider compatibile OpenAI', () => {
  it('chiedi e flusso: un solo messaggio di sistema (prefisso fisso), temperatura 0, usage e stop', async () => {
    coda.push('Ciao.', 'Una frase in streaming.');
    const m = locale();
    const a = await m.chiedi({ sistema: [{ testo: 'A', cache: true }, { testo: 'B' }], messaggi: [{ ruolo: 'user', testo: 'Q' }], maxTokens: 20 });
    expect(a).toMatchObject({ testo: 'Ciao.', stopReason: 'end_turn', costo: { costo_usd: 0 } });
    expect(ricevute.at(-1)).toMatchObject({ model: 'qwen-prova', temperature: 0, max_tokens: 20, messages: [{ role: 'system', content: 'A\n\nB' }, { role: 'user', content: 'Q' }] });
    const delta: string[] = [];
    const b = await m.flusso({ sistema: [{ testo: 'A' }], messaggi: [{ ruolo: 'user', testo: 'Q' }], maxTokens: 20 }, (d) => delta.push(d));
    expect(delta.join('')).toBe('Una frase in streaming.');
    expect(b.uso).toMatchObject({ input_tokens: 20, output_tokens: 7, cache_read_input_tokens: 80 });
    expect(b.stopReason).toBe('end_turn');
  });
});

describe('coda del server locale', () => {
  it('una richiesta alla volta; il lettore passa davanti; una bassa che aspetta troppo rinuncia', async () => {
    const ordine: string[] = [];
    const lento = (async (_u: string, init: RequestInit) => {
      const msg = (JSON.parse(String(init.body)) as { messages: Array<{ content: string }> }).messages.at(-1)!.content;
      ordine.push(msg);
      await new Promise((r) => setTimeout(r, 60));
      return new Response(JSON.stringify({ choices: [{ message: { content: msg }, finish_reason: 'stop' }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const base = { url: 'http://coda.prova/v1', modello: 'm', fetch: lento };
    const bassa = new ModelloOpenAI({ ...base, coda: { concorrenza: 1, priorita: 'bassa', attesaMaxMs: 500 } });
    const pigra = new ModelloOpenAI({ ...base, coda: { concorrenza: 1, priorita: 'bassa', attesaMaxMs: 10 } });
    const alta = new ModelloOpenAI({ ...base, coda: { concorrenza: 1, priorita: 'alta' } });
    const r = (m: ModelloOpenAI, t: string) => m.chiedi({ sistema: [], messaggi: [{ ruolo: 'user', testo: t }], maxTokens: 5 });
    const p1 = r(bassa, 'b1');
    const p2 = r(bassa, 'b2');
    const p3 = r(alta, 'lettore');
    const p4 = r(pigra, 'rinuncia');
    await expect(p4).rejects.toThrow(/occupato/);
    await Promise.all([p1, p2, p3]);
    expect(ordine).toEqual(['b1', 'lettore', 'b2']);
  });
});

describe('uscita strutturata senza supporto del provider', () => {
  const schema = { type: 'object', additionalProperties: false, required: ['scelta'], properties: { scelta: { type: 'string', enum: ['a', 'b'] } } };

  it('JSON dentro ```json, valido al secondo tentativo; poi il ripiego deterministico', async () => {
    coda.push('Ecco: {"scelta": "z"}', '```json\n{"scelta": "b"}\n```');
    expect(await chiediStrutturato<{ scelta: string }>(locale(), { sistema: [], messaggi: [{ ruolo: 'user', testo: 'Q' }], maxTokens: 50 }, { schema, cosa: 'prova' })).toEqual({ scelta: 'b' });
    expect(String((ricevute.at(-1)!['messages'] as Array<{ content: string }>).at(-1)!.content)).toContain('non andava');
    coda.push('niente', 'ancora niente');
    expect(await chiediStrutturato(locale(), { sistema: [], messaggi: [{ ruolo: 'user', testo: 'Q' }], maxTokens: 50 }, { schema, cosa: 'prova', ripiego: () => ({ scelta: 'a' }) })).toEqual({ scelta: 'a' });
    coda.push('{}', '{}');
    await expect(chiediStrutturato(locale(), { sistema: [], messaggi: [{ ruolo: 'user', testo: 'Q' }], maxTokens: 50 }, { schema, cosa: 'prova' })).rejects.toThrow(/nessuna risposta valida/);
  });

  it('validatore: tipi, enum, required, campi in più, lunghezze', () => {
    expect(erroriSchema(schema, { scelta: 'a' })).toEqual([]);
    expect(erroriSchema(schema, { scelta: 'a', altro: 1 })[0]).toMatch(/non previsto/);
    expect(erroriSchema(schema, {})[0]).toMatch(/manca/);
    expect(erroriSchema({ type: 'array', items: { type: 'integer' }, maxItems: 1 }, [1, 2.5])).toHaveLength(2);
    expect(() => estraiJson('senza graffe')).toThrow();
  });
});

describe('Anthropic: le stesse richieste di prima', () => {
  it('thinking spento, effort low, json_schema solo con schema, cache_control sui blocchi marcati', async () => {
    const parametri: unknown[] = [];
    const client = { messages: { create: async (p: unknown) => (parametri.push(p), { id: 'm', model: 'claude-haiku-5-5', stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: 'text', text: '{"ok":true}' }] }) } };
    const m = new ModelloAnthropic(() => client as never, 'claude-haiku-5-5');
    const r = await chiediStrutturato<{ ok: boolean }>(m, { sistema: [{ testo: 'P' }, { testo: 'S', cache: true }], messaggi: [{ ruolo: 'user', testo: 'Q' }], maxTokens: 600 }, { schema: { type: 'object' }, cosa: 'arbitro' });
    expect(r).toEqual({ ok: true });
    expect(parametri[0]).toEqual({
      model: 'claude-haiku-5-5',
      max_tokens: 600,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: { type: 'object' } } },
      system: [{ type: 'text', text: 'P' }, { type: 'text', text: 'S', cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: 'Q' }],
    });
  });
});

describe('scelta dei provider', () => {
  it('di base tutto in locale; variabili vecchie e nuove; chiave mancante → riserva', () => {
    const base = risolvi(caricaConfigProvider({}), { ambiente: {}, anthropic: '/inesistente', openrouter: '/inesistente' });
    expect(base.lettore).toMatchObject({ provider: 'locale', modo: 'minimo' });
    expect(base.voce.provider).toBe('locale');
    expect(base.immagini.provider).toBe('locale');
    const finto = risolvi(caricaConfigProvider({ CANTASTORIE_LLM: 'finto', CANTASTORIE_TTS: 'mock' }));
    expect([finto.lettore.provider, finto.arbitro_prove.provider, finto.voce.provider]).toEqual(['finto', 'regole', 'finto']);
    const cfg = caricaConfigProvider({ CANTASTORIE_LETTORE: 'anthropic', CANTASTORIE_VOCE: 'fish' });
    const senzaChiavi = risolvi(cfg, { ambiente: {}, anthropic: '/inesistente', openrouter: '/inesistente' });
    expect(senzaChiavi.lettore.provider).toBe('finto');
    expect(senzaChiavi.lettore.perche).toMatch(/ANTHROPIC_API_KEY mancante/);
    expect(senzaChiavi.voce.provider).toBe('finto');
    const conChiavi = risolvi(cfg, { ambiente: { ANTHROPIC_API_KEY: 'k', OPENROUTER_API_KEY: 'k' } });
    expect(conChiavi.lettore).toMatchObject({ provider: 'anthropic', modo: 'completo', modello: 'claude-haiku-5-5' });
    expect(conChiavi.voce.provider).toBe('openrouter');
  });
});

describe('lettore minimo', () => {
  const messaggio = [
    '## Turno 3: azioni dei giocatori',
    '- [1] Ida (pg_ida): guardo la scatolina da vicino',
    '- [2] Livia (pg_livia): seguo le impronte (azione PRIVATA: a voce narra solo ciò che gli altri possono percepire)',
    '- Vanda (pg_vanda): nessuna azione, aspetta.',
    '## Battute indicate dal Motore (…)',
    '- pg_ida (Ida): [usa] nar_scatolina > pg_ida oppure [usa] nar_velluto > pg_ida',
    '## Catalogo: battute pertinenti a questo turno (id · chi · tipo · quando)',
    '- nar_scatolina · narratore · indizio · un PG guarda la scatolina',
    '- nar_velluto · narratore · indizio · un PG tocca il velluto',
    '- nar_impronte · narratore · indizio · un PG segue le impronte',
    '## Battute d’attesa (riempitivi, solo se nessuna battuta risponde)',
    '- nar_neve · narratore · momento · la neve cade',
  ].join('\n');

  it('legge azioni, indicate, catalogo e attesa dal messaggio del turno', () => {
    const t = leggiTurno(messaggio);
    expect(t.azioni.map((a) => [a.id_pg, a.privata])).toEqual([['pg_ida', false], ['pg_livia', true]]);
    expect(t.indicate.get('pg_ida')).toEqual(['nar_scatolina', 'nar_velluto']);
    expect([...t.catalogo.keys()]).toEqual(['nar_scatolina', 'nar_velluto', 'nar_impronte']);
    expect(t.attesa).toEqual(['nar_neve']);
  });

  it('JSON del modello → protocollo: annuncio deterministico, [usa] per le battute, «nessuna» → attesa; privata senza annuncio', async () => {
    coda.push(JSON.stringify({ risposte: [{ pg: 'pg_ida', battuta: 'nessuna' }, { pg: 'pg_livia', battuta: 'nar_impronte' }] }));
    const n = new NarratoreMinimo(locale(), { log: loggerMuto() });
    const delta: string[] = [];
    const e = await n.narra({ turno: 3, sistema: [], messaggio, signal: new AbortController().signal }, (d) => delta.push(d));
    expect(e.testo).toBe('[narratore] Ida: «Guardo la scatolina da vicino».\n[usa] nar_neve > pg_ida\n[usa] nar_impronte > pg_livia\n[invito] tutti\n');
    expect(delta.join('')).toBe(e.testo);
  });

  it('il primo annuncio esce SUBITO, prima che il classificatore risponda (una chiamata per turno)', async () => {
    let chiamate = 0;
    let risposto = false;
    const lento = (async () => {
      chiamate += 1;
      await new Promise((r) => setTimeout(r, 200));
      risposto = true;
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"risposte":[{"pg":"pg_ida","battuta":"nar_scatolina"},{"pg":"pg_livia","battuta":"nessuna"}]}' }, finish_reason: 'stop' }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const n = new NarratoreMinimo(new ModelloOpenAI({ url: 'http://lento/v1', modello: 'm', fetch: lento }), { log: loggerMuto() });
    const delta: Array<{ testo: string; risposto: boolean }> = [];
    await n.narra({ turno: 3, sistema: [], messaggio, signal: new AbortController().signal }, (d) => delta.push({ testo: d, risposto }));
    expect(delta[0]).toEqual({ testo: '[narratore] Ida: «Guardo la scatolina da vicino».\n', risposto: false });
    expect(delta.slice(1).every((d) => d.risposto)).toBe(true);
    expect(chiamate).toBe(1);
  });

  it('risposte non valide due volte → ripiego: la prima battuta indicata', async () => {
    coda.push('{"risposte":[{"pg":"pg_ida","battuta":"inventata"}]}', 'non è JSON');
    const n = new NarratoreMinimo(locale(), { log: loggerMuto() });
    const e = await n.narra({ turno: 3, sistema: [], messaggio, signal: new AbortController().signal }, () => undefined);
    expect(e.testo).toBe('[narratore] Ida: «Guardo la scatolina da vicino».\n[usa] nar_scatolina > pg_ida\n[invito] tutti\n');
  });

  it('annuncio deterministico: nome + prima frase, senza intercalari, al massimo 12 parole', () => {
    expect(annuncioBreve('Nando', 'ok la fisarmonica la tiro fuori io, si balla!! gaspare dammi la mezza paga adesso')).toBe('Nando: «La fisarmonica la tiro fuori io».');
    expect(annuncioBreve('Remo', 'adelina la scatolina vuota la peso a occhio, varra due fiorini')).toBe('Remo: «Adelina la scatolina vuota la peso a occhio».');
    expect(annuncioBreve('Sorella Teodora', 'mi avvicino alle ceste del pane dei lumi e dico la preghiera della sera per tutti')).toBe('Sorella Teodora: «Mi avvicino alle ceste del pane dei lumi».');
    expect(annuncioBreve('Ida', 'ahah ok!!')).toBeNull();
    const n = annuncioBreve('Ida', 'guardo la porta del ripostiglio con calma senza farmi vedere da nessuno della sala grande')!;
    expect(n.split(' ').length).toBeLessThanOrEqual(12);
  });
});
