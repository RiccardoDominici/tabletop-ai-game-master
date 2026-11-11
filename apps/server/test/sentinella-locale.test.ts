/**
 * Watchdog of the local model server (provider/sentinella-locale.ts; e2e second pass, N6): the server dies in the
 * middle of a game, the turn goes on at once with the reader's rules fallback and the waiting lines, the watchdog
 * notices, restarts it (here a fake restart that brings the fake server back), logs every step, and the next turn
 * uses the model again.
 */
import http from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import type { Logger } from '../src/logger';
import { NarratoreMinimo } from '../src/llm/minimo';
import { ModelloOpenAI } from '../src/llm/openai';
import { FabbricaModelli } from '../src/provider/fabbrica';
import { caricaConfigProvider, risolvi } from '../src/provider/config';
import { SentinellaLocale, type EsitoRiavvio } from '../src/provider/sentinella-locale';
import { loggerMuto } from '../src/logger';

/** A fake OpenAI-compatible server that can die and come back on the same port. */
class ServerFinto {
  porta = 0;
  private server: http.Server | null = null;
  private readonly socket = new Set<Socket>();
  readonly risposte: string[] = [];
  chiamate = 0;

  get url(): string {
    return `http://127.0.0.1:${this.porta}/v1`;
  }

  async accendi(): Promise<void> {
    const s = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url?.endsWith('/models')) return void res.end(JSON.stringify({ data: [{ id: 'qwen-prova' }] }));
      let corpo = '';
      req.on('data', (d) => (corpo += d));
      req.on('end', () => {
        this.chiamate += 1;
        const j = JSON.parse(corpo) as Record<string, unknown>;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 'x', model: j['model'], choices: [{ message: { content: this.risposte.shift() ?? '' }, finish_reason: 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 5 } }));
      });
    });
    s.on('connection', (c) => (this.socket.add(c), c.on('close', () => this.socket.delete(c))));
    await new Promise<void>((r) => s.listen(this.porta, '127.0.0.1', r));
    this.porta = (s.address() as AddressInfo).port;
    this.server = s;
  }

  async spegni(): Promise<void> {
    const s = this.server;
    this.server = null;
    if (!s) return;
    for (const c of this.socket) c.destroy();
    await new Promise<void>((r) => s.close(() => r()));
  }
}

/** A logger that keeps every line (level, message, fields). */
function loggerSpia(): { log: Logger; righe: Array<{ livello: string; msg: string; dati: Record<string, unknown> }> } {
  const righe: Array<{ livello: string; msg: string; dati: Record<string, unknown> }> = [];
  const scrivi = (livello: string) => (dati: Record<string, unknown> | string, msg?: string) =>
    void righe.push(typeof dati === 'string' ? { livello, msg: dati, dati: {} } : { livello, msg: msg ?? '', dati });
  const log = { info: scrivi('info'), warn: scrivi('warn'), error: scrivi('error'), debug: scrivi('debug'), trace: scrivi('trace'), fatal: scrivi('fatal') } as unknown as Logger;
  (log as unknown as { child: () => Logger }).child = () => log;
  return { log, righe };
}

const finché = async (cond: () => boolean, ms = 5000): Promise<void> => {
  const fine = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > fine) throw new Error('condition not met');
    await new Promise((r) => setTimeout(r, 20));
  }
};

const MESSAGGIO = [
  '## Turno 3: azioni dei giocatori',
  '- [1] Ida (pg_ida): guardo la scatolina da vicino',
  '## Battute indicate dal Motore (…)',
  '- pg_ida (Ida): [usa] nar_scatolina > pg_ida oppure [usa] nar_velluto > pg_ida',
  '## Catalogo: battute pertinenti a questo turno (id · chi · tipo · quando)',
  '- nar_scatolina · narratore · indizio · un PG guarda la scatolina',
  '- nar_velluto · narratore · indizio · un PG tocca il velluto',
  '## Battute d’attesa (riempitivi, solo se nessuna battuta risponde)',
  '- nar_neve · narratore · momento · la neve cade',
].join('\n');

const finti: ServerFinto[] = [];
const sentinelle: SentinellaLocale[] = [];
afterEach(async () => {
  for (const s of sentinelle.splice(0)) s.ferma();
  for (const f of finti.splice(0)) await f.spegni();
});

async function preparazione(o: { riavvia: ((f: ServerFinto) => Promise<EsitoRiavvio>) | null; maxRiavvii?: number }) {
  const finto = new ServerFinto();
  finti.push(finto);
  await finto.accendi();
  const { log, righe } = loggerSpia();
  const sentinella = new SentinellaLocale({ url: finto.url, log, riavvia: o.riavvia ? () => o.riavvia!(finto) : null, intervalloMs: 40, pausaRiavvioMs: 0, ...(o.maxRiavvii ? { maxRiavvii: o.maxRiavvii } : {}) });
  sentinelle.push(sentinella);
  const modello = new ModelloOpenAI({ url: finto.url, modello: 'qwen-prova', etichetta: 'locale', timeoutMs: 3000, sentinella });
  const lettore = new NarratoreMinimo(modello, { log: loggerMuto() });
  const turno = async (): Promise<{ testo: string; ms: number }> => {
    const t0 = Date.now();
    const e = await lettore.narra({ turno: 3, sistema: [], messaggio: MESSAGGIO, signal: new AbortController().signal }, () => undefined);
    return { testo: e.testo, ms: Date.now() - t0 };
  };
  return { finto, sentinella, modello, turno, righe };
}

describe('local model server watchdog', () => {
  it('the server dies mid-game: the turn goes on with the fallback, the watchdog restarts it, the model is back', async () => {
    let riavvii = 0;
    const { finto, sentinella, modello, turno, righe } = await preparazione({
      riavvia: async (f) => {
        riavvii += 1;
        await new Promise((r) => setTimeout(r, 150)); // the model loads
        await f.accendi();
        return { ok: true, uscita: 'lettore locale: pronto su :port' };
      },
    });
    // Turn 1, server up: the model answers «nessuna» → a waiting line.
    finto.risposte.push(JSON.stringify({ risposte: [{ pg: 'pg_ida', battuta: 'nessuna' }] }));
    expect((await turno()).testo).toContain('[usa] nar_neve > pg_ida');

    // The server dies (no answer at all, like mlx-lm killed by macOS).
    await finto.spegni();
    const giu = await turno();
    // The rules fallback: the first line the Engine indicated; at once, not after a timeout.
    expect(giu.testo).toContain('[usa] nar_scatolina > pg_ida');
    expect(giu.ms).toBeLessThan(1500);
    await finché(() => sentinella.stato === 'riavvio');
    // During the restart a request is refused at once (no retry, no timeout).
    const t0 = Date.now();
    await expect(modello.chiedi({ sistema: [], messaggi: [{ ruolo: 'user', testo: 'ok' }], maxTokens: 1 })).rejects.toThrow(/server down/);
    expect(Date.now() - t0).toBeLessThan(100);
    expect((await turno()).testo).toContain('[usa] nar_scatolina > pg_ida');

    await finché(() => sentinella.stato === 'su');
    expect(riavvii).toBe(1);
    // Back: the model answers again.
    const prima = finto.chiamate;
    finto.risposte.push(JSON.stringify({ risposte: [{ pg: 'pg_ida', battuta: 'nar_velluto' }] }));
    expect((await turno()).testo).toContain('[usa] nar_velluto > pg_ida');
    expect(finto.chiamate).toBe(prima + 1);

    const messaggi = righe.map((r) => `${r.livello} ${r.msg}`);
    expect(messaggi).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^error local model server DOWN/),
        expect.stringMatching(/^warn local model server: restarting/),
        expect.stringMatching(/^info local model server: restarted/),
        expect.stringMatching(/^info local model server UP again/),
      ]),
    );
    const su = righe.find((r) => r.msg === 'local model server UP again')!;
    expect(su.dati['richieste_alle_riserve']).toBeGreaterThanOrEqual(2);
  }, 15_000);

  it('a server you start yourself (avvio: no): it says so, never restarts, and notices when it is back', async () => {
    const { finto, sentinella, righe } = await preparazione({ riavvia: null });
    await finto.spegni();
    await sentinella.controlla();
    await sentinella.controlla();
    expect(sentinella.stato).toBe('giu');
    expect(righe.some((r) => r.livello === 'warn' && /restart it with scripts\/lettore-avvio\.sh/.test(r.msg))).toBe(true);
    await finto.accendi();
    await sentinella.controlla();
    expect(sentinella.stato).toBe('su');
  });

  it('a restart that keeps failing is given up after maxRiavvii, said once', async () => {
    let riavvii = 0;
    const { finto, sentinella, righe } = await preparazione({ riavvia: async () => (riavvii++, { ok: false, uscita: 'lettore locale: terminato durante l’avvio' }), maxRiavvii: 2 });
    await finto.spegni();
    for (let i = 0; i < 8; i++) await sentinella.controlla();
    expect(riavvii).toBe(2);
    expect(righe.filter((r) => /restart given up/.test(r.msg))).toHaveLength(1);
    expect(righe.filter((r) => /restart did not bring it back/.test(r.msg))).toHaveLength(2);
  });

  it('the factory gives every local component the same watchdog for one server', () => {
    const cfg = caricaConfigProvider({});
    const scelte = risolvi(cfg, { anthropic: '/nessun/file', openrouter: '/nessun/file' });
    const create: string[] = [];
    const fabbrica = new FabbricaModelli(cfg, scelte, {
      fileChiaveAnthropic: '/nessun/file',
      fileChiaveOpenRouter: '/nessun/file',
      maxTokens: 100,
      log: loggerMuto(),
      sentinellaLocale: (url) => (create.push(url), new SentinellaLocale({ url, log: loggerMuto(), riavvia: null })),
    });
    const locali = (['lettore', 'riassunto', 'regole'] as const).filter((c) => scelte[c].provider === 'locale');
    for (const c of locali) fabbrica.modello(c);
    expect(locali.length).toBeGreaterThan(0);
    expect(create).toEqual([scelte[locali[0]!].url]);
    fabbrica.chiudi();
  });
});
