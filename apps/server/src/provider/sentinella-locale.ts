/**
 * Watchdog of the local model server (mlx-lm on 127.0.0.1:4613, docs/provider.md, «When the local server stops»).
 *
 * In the second e2e pass (docs/e2e-finale.md §9, N6) the server died halfway through a game. Nobody noticed: every
 * request waited for its timeout or failed, the reader fell back in silence and nothing restarted it. Here:
 *
 * - health: every `intervalloMs` a GET {url}/models (2 s); and every request of the local models reports its outcome
 *   (`segnala`): after `soglia` failures in a row (connection refused, timeout, HTTP 5xx) the server counts as down;
 * - while it is down, `disponibile()` is false: the local models refuse at once (llm/openai.ts), so the reader goes
 *   straight to its rules fallback and the waiting lines, and the action and dice arbiters to their rules, instead of
 *   each request waiting for its timeout; the turn goes on;
 * - restart: `riavvia()` (by default scripts/lettore-avvio.sh, which also restarts a server that answers /models but
 *   no longer generates), at most once every `pausaRiavvioMs`, at most `maxRiavvii` times in `finestraMs`; then it
 *   gives up and says how to restart it by hand. With `backend.locale.avvio: no` (a server you start yourself) it
 *   never restarts, it only says so;
 * - every change is logged: down (why, how many requests failed), restart (outcome, seconds, last lines of the
 *   script), back (after how long, how many requests went to the fallbacks).
 */
import { spawn } from 'node:child_process';
import type { Logger } from '../logger';
import { RADICE_REPO } from '../percorsi';

export type StatoSentinella = 'su' | 'giu' | 'riavvio';

/** What a local model sees of the watchdog (llm/openai.ts). */
export interface SentinellaModello {
  disponibile(): boolean;
  segnala(ok: boolean, motivo?: string): void;
}

export interface EsitoRiavvio {
  ok: boolean;
  /** The last lines the restart printed (for the log). */
  uscita: string;
}

export interface OpzioniSentinella {
  /** Base of the API, up to /v1 (http://127.0.0.1:4613/v1). */
  url: string;
  log: Logger;
  /** How to restart the server; null = it is not ours to restart (`avvio: no`, a remote host). */
  riavvia: (() => Promise<EsitoRiavvio>) | null;
  intervalloMs?: number;
  timeoutPingMs?: number;
  /** Failures in a row (pings or requests) before the server counts as down. */
  soglia?: number;
  pausaRiavvioMs?: number;
  maxRiavvii?: number;
  finestraMs?: number;
  fetch?: typeof fetch;
  adesso?: () => number;
}

export class SentinellaLocale implements SentinellaModello {
  private statoAttuale: StatoSentinella = 'su';
  private falliti = 0;
  private timer: NodeJS.Timeout | null = null;
  private controllo: Promise<void> | null = null;
  private giuDa: number | null = null;
  /** Requests refused while the server was down (they went to the fallbacks). */
  private rifiutate = 0;
  private tentativi: number[] = [];
  private arreso = false;
  private ultimoMotivo = '';

  constructor(private readonly o: OpzioniSentinella) {}

  get stato(): StatoSentinella {
    return this.statoAttuale;
  }

  disponibile(): boolean {
    if (this.statoAttuale === 'su') return true;
    this.rifiutate += 1;
    return false;
  }

  /** Starts the periodic check (idempotent). The first local request calls it. */
  avvia(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.controlla(), this.o.intervalloMs ?? 10_000);
    this.timer.unref();
  }

  ferma(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** The outcome of a real request. A failure counts like a failed ping; a success resets the count. */
  segnala(ok: boolean, motivo?: string): void {
    this.avvia();
    if (ok) {
      this.falliti = 0;
      return;
    }
    this.falliti += 1;
    this.ultimoMotivo = motivo ?? 'request failed';
    if (this.statoAttuale === 'su' && this.falliti >= (this.o.soglia ?? 2)) void this.giu(`${this.falliti} requests in a row failed: ${this.ultimoMotivo}`);
  }

  /** One health check now (also the timer's). Never throws. */
  controlla(): Promise<void> {
    this.controllo ??= this.verifica().finally(() => (this.controllo = null));
    return this.controllo;
  }

  private async ping(): Promise<string | null> {
    try {
      const r = await (this.o.fetch ?? fetch)(`${this.o.url.replace(/\/$/, '')}/models`, { signal: AbortSignal.timeout(this.o.timeoutPingMs ?? 2000) });
      await r.arrayBuffer().catch(() => undefined);
      return r.ok ? null : `GET /models: HTTP ${r.status}`;
    } catch (err) {
      return `GET /models: ${(err as Error).message}`;
    }
  }

  private async verifica(): Promise<void> {
    if (this.statoAttuale === 'riavvio') return;
    const errore = await this.ping();
    if (!errore) {
      if (this.statoAttuale === 'giu') this.su('it answers again');
      else this.falliti = Math.min(this.falliti, (this.o.soglia ?? 2) - 1);
      return;
    }
    this.falliti += 1;
    this.ultimoMotivo = errore;
    if (this.statoAttuale === 'su' && this.falliti >= (this.o.soglia ?? 2)) await this.giu(errore);
    else if (this.statoAttuale === 'giu') await this.provaRiavvio();
  }

  private adesso(): number {
    return this.o.adesso?.() ?? Date.now();
  }

  private async giu(motivo: string): Promise<void> {
    if (this.statoAttuale !== 'su') return;
    this.statoAttuale = 'giu';
    this.giuDa = this.adesso();
    this.rifiutate = 0;
    this.o.log.error(
      { url: this.o.url, motivo, riavvio: this.o.riavvia ? 'automatic' : 'by hand' },
      'local model server DOWN: the reader uses its rules fallback and the waiting lines, the arbiters their rules',
    );
    if (!this.o.riavvia) this.o.log.warn({ url: this.o.url }, 'local model server: not restarted automatically (backend.locale.avvio: no); restart it with scripts/lettore-avvio.sh');
    await this.provaRiavvio();
  }

  private su(come: string): void {
    const secondi = this.giuDa === null ? 0 : Math.round((this.adesso() - this.giuDa) / 100) / 10;
    this.statoAttuale = 'su';
    this.falliti = 0;
    this.giuDa = null;
    this.arreso = false;
    this.o.log.info({ url: this.o.url, secondi_giu: secondi, richieste_alle_riserve: this.rifiutate, come }, 'local model server UP again');
    this.rifiutate = 0;
  }

  private async provaRiavvio(): Promise<void> {
    if (!this.o.riavvia || this.statoAttuale !== 'giu') return;
    const adesso = this.adesso();
    this.tentativi = this.tentativi.filter((t) => adesso - t < (this.o.finestraMs ?? 15 * 60_000));
    const ultimo = this.tentativi.at(-1);
    if (ultimo !== undefined && adesso - ultimo < (this.o.pausaRiavvioMs ?? 60_000)) return;
    if (this.tentativi.length >= (this.o.maxRiavvii ?? 3)) {
      if (!this.arreso) this.o.log.error({ url: this.o.url, tentativi: this.tentativi.length }, 'local model server: restart given up; the game goes on with the fallbacks; restart it with scripts/lettore-avvio.sh');
      this.arreso = true;
      return;
    }
    this.tentativi.push(adesso);
    this.statoAttuale = 'riavvio';
    this.o.log.warn({ url: this.o.url, tentativo: this.tentativi.length }, 'local model server: restarting (scripts/lettore-avvio.sh)');
    const t0 = this.adesso();
    let esito: EsitoRiavvio;
    try {
      esito = await this.o.riavvia();
    } catch (err) {
      esito = { ok: false, uscita: (err as Error).message };
    }
    const secondi = Math.round((this.adesso() - t0) / 100) / 10;
    const errore = esito.ok ? await this.ping() : 'restart failed';
    if (!errore) {
      this.o.log.info({ url: this.o.url, secondi, uscita: esito.uscita }, 'local model server: restarted');
      this.statoAttuale = 'giu'; // su() wants to come from «down»
      this.su('restarted');
      return;
    }
    this.statoAttuale = 'giu';
    this.o.log.error({ url: this.o.url, secondi, errore, uscita: esito.uscita }, 'local model server: restart did not bring it back');
  }
}

/**
 * The default restart: scripts/lettore-avvio.sh with the port of the URL (it refuses the game's ports 4610–4612) and
 * the configured model; up to `attesaMs` (the script waits for the model to load). Only for a server on this computer.
 */
export function riavviaConScript(url: string, modello: string | null, attesaMs = 240_000): (() => Promise<EsitoRiavvio>) | null {
  const u = new URL(url);
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(u.hostname)) return null;
  const porta = u.port || '80';
  return () =>
    new Promise((ok) => {
      const p = spawn('bash', [`${RADICE_REPO}/scripts/lettore-avvio.sh`, ...(modello ? [modello] : [])], { cwd: RADICE_REPO, env: { ...process.env, LETTORE_PORTA: porta }, stdio: ['ignore', 'pipe', 'pipe'] });
      let uscita = '';
      const timer = setTimeout(() => p.kill('SIGTERM'), attesaMs);
      p.stdout.on('data', (d) => (uscita += String(d)));
      p.stderr.on('data', (d) => (uscita += String(d)));
      p.on('error', (e) => (clearTimeout(timer), ok({ ok: false, uscita: e.message })));
      p.on('close', (code) => {
        clearTimeout(timer);
        ok({ ok: code === 0, uscita: uscita.trim().split('\n').slice(-3).join(' | ') });
      });
    });
}
