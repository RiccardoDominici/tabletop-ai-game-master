/**
 * Dalle scelte dei provider (provider/config.ts) ai modelli veri (llm/modello.ts) e ai narratori.
 * Un modello per (provider, modello), condiviso fra i componenti che lo usano; creato al primo uso, così
 * una chiave si legge solo quando serve davvero. Le chiavi non finiscono mai nei log.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { Logger } from '../logger';
import { ModelloAnthropic } from '../llm/anthropic';
import { cercaChiave } from '../llm/chiavi';
import { creaClientAnthropic, NarratoreHaiku } from '../llm/haiku';
import { NarratoreMinimo } from '../llm/minimo';
import type { ModelloLinguaggio } from '../llm/modello';
import { NarratoreModello } from '../llm/narratore';
import { ModelloOpenAI } from '../llm/openai';
import type { Narratore } from '../llm/tipi';
import type { ConfigProvider, NomeComponente, Scelta } from './config';

/** Provider che sono un modello di linguaggio (gli altri: regole, finto, nessuno). */
export const PROVIDER_LLM = new Set(['locale', 'anthropic', 'openrouter', 'openai']);

export interface OpzioniFabbrica {
  /** File di ripiego per le chiavi (dopo ambiente e .env alla radice). */
  fileChiaveAnthropic: string;
  fileChiaveOpenRouter: string;
  maxTokens: number;
  log: Logger;
}

export class FabbricaModelli {
  private readonly modelli = new Map<string, ModelloLinguaggio>();
  private clientAnthropic: Anthropic | null = null;

  constructor(
    readonly cfg: ConfigProvider,
    readonly scelte: Record<NomeComponente, Scelta>,
    private readonly o: OpzioniFabbrica,
  ) {}

  /** Il componente usa un modello di linguaggio (non regole, finto o nessuno). */
  usaModello(c: NomeComponente): boolean {
    return PROVIDER_LLM.has(this.scelte[c].provider);
  }

  /** Il modello del componente (creato al primo uso e condiviso), o null se il componente non ne usa. */
  modello(c: NomeComponente): ModelloLinguaggio | null {
    const s = this.scelte[c];
    if (!this.usaModello(c)) return null;
    const chiave = `${s.provider}|${s.url ?? ''}|${s.modello ?? ''}`;
    let m = this.modelli.get(chiave);
    if (m) return m;
    const loc = this.cfg.backend.locale;
    switch (s.provider) {
      case 'anthropic':
        m = new ModelloAnthropic(() => (this.clientAnthropic ??= creaClientAnthropic(this.o.fileChiaveAnthropic, this.o.log)), s.modello ?? 'claude-haiku-5-5');
        break;
      case 'locale':
        m = new ModelloOpenAI({ url: s.url!, modello: s.modello ?? loc.modello ?? 'locale', strutturato: loc.strutturato === true, timeoutMs: loc.timeout_ms ?? 120_000, etichetta: 'locale' });
        break;
      case 'openrouter':
        m = new ModelloOpenAI({
          url: s.url!,
          modello: s.modello ?? 'anthropic/claude-haiku-5.5',
          chiave: cercaChiave('OPENROUTER_API_KEY', { filePrecedente: this.o.fileChiaveOpenRouter }).valore,
          strutturato: this.cfg.backend.openrouter.strutturato !== false,
          etichetta: 'openrouter',
        });
        break;
      default: {
        const v = this.cfg.componenti[c];
        const nome = v.chiave ?? this.cfg.backend['openai']?.chiave;
        m = new ModelloOpenAI({ url: s.url!, modello: s.modello ?? 'modello', ...(nome ? { chiave: cercaChiave(nome).valore } : {}), strutturato: this.cfg.backend['openai']?.strutturato === true, etichetta: 'openai' });
      }
    }
    this.modelli.set(chiave, m);
    return m;
  }

  /**
   * Il lettore (narratore o selettore) di un componente: completo (scrive le righe) o minimo
   * (classificatore + annuncio). Con Anthropic in modo completo è il NarratoreHaiku di sempre.
   * null se il componente non usa un modello (il chiamante mette il finto o la riserva).
   */
  narratore(c: NomeComponente, modo: 'minimo' | 'completo' = this.scelte[c].modo ?? 'completo'): Narratore | null {
    const s = this.scelte[c];
    if (!this.usaModello(c)) return null;
    if (modo === 'minimo') return new NarratoreMinimo(this.modello(c)!, { log: this.o.log.child({ modulo: 'lettore-minimo' }) });
    if (s.provider === 'anthropic') {
      return new NarratoreHaiku({ modello: s.modello ?? 'claude-haiku-5-5', maxTokens: this.o.maxTokens, fileChiave: this.o.fileChiaveAnthropic, log: this.o.log });
    }
    return new NarratoreModello(s.provider === 'locale' ? 'locale' : s.provider === 'openrouter' ? 'openrouter' : 'openai', this.modello(c)!, this.o.maxTokens);
  }
}
