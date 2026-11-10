/**
 * Configurazione dei provider (docs/provider.md): chi fa cosa nel gioco.
 *
 *   config/predefinita.yaml   tracciato, di base tutto in locale (zero centesimi, nessuna chiave)
 *   config/locale.yaml        non tracciato, le scelte di questo computer (scripts/configura.sh)
 *   CANTASTORIE_<COMPONENTE>  variabili d'ambiente, vincono su tutto (e i nomi vecchi: CANTASTORIE_LLM,
 *                             CANTASTORIE_ARBITRO, CANTASTORIE_VOCE/TTS, con lo stesso significato di prima)
 *
 * `risolvi` sceglie per ogni componente il primo provider DISPONIBILE della catena [provider, ...riserve]
 * (chiave trovata, URL dato) e dice perché; non apre connessioni (il server locale lo controlla l'avvio).
 * Sotto vitest config/locale.yaml non si legge: le prove non dipendono dalla macchina.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { cercaChiave, RADICE_REPO } from '../llm/chiavi';

export const COMPONENTI = ['lettore', 'arbitro_azioni', 'arbitro_prove', 'riassunto', 'regole', 'voce', 'immagini'] as const;
export type NomeComponente = (typeof COMPONENTI)[number];
export const PROVIDER = ['locale', 'anthropic', 'openrouter', 'openai', 'regole', 'finto', 'nessuno'] as const;
export type NomeProviderConfig = (typeof PROVIDER)[number];

export interface Backend {
  url?: string;
  modello?: string;
  /** Nome della variabile con la chiave (openai), o quella standard del provider. */
  chiave?: string;
  avvio?: 'mlx' | 'no';
  strutturato?: boolean;
  timeout_ms?: number;
}

export interface VoceComponente {
  provider: NomeProviderConfig;
  modello?: string;
  /** Solo provider openai: base dell'API e variabile della chiave. */
  url?: string;
  chiave?: string;
  riserve?: NomeProviderConfig[];
  /** Solo lettore e arbitro_prove: minimo | completo | auto (minimo in locale). */
  modo?: 'minimo' | 'completo' | 'auto';
}

export interface ConfigProvider {
  backend: { locale: Backend; openrouter: Backend; anthropic: Backend; [altro: string]: Backend };
  componenti: Record<NomeComponente, VoceComponente>;
  /** File letti, per il log. */
  file: string[];
}

export interface Scelta {
  componente: NomeComponente;
  provider: NomeProviderConfig;
  modello: string | null;
  url: string | null;
  /** Solo lettore e arbitro_prove: il modo effettivo. */
  modo?: 'minimo' | 'completo';
  /** Perché questo provider (o perché i precedenti della catena sono stati saltati). */
  perche: string;
}

const CARTELLA = path.join(RADICE_REPO, 'config');

function leggiYaml(file: string): Record<string, unknown> | null {
  if (!fs.existsSync(file)) return null;
  const d = parse(fs.readFileSync(file, 'utf8')) as unknown;
  return d && typeof d === 'object' ? (d as Record<string, unknown>) : null;
}

/** Unione profonda: gli oggetti si uniscono, il resto (anche gli elenchi) si sostituisce. */
function unisci(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const prima = out[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && prima && typeof prima === 'object' && !Array.isArray(prima) ? unisci(prima as Record<string, unknown>, v as Record<string, unknown>) : v;
  }
  return out;
}

/** I nomi vecchi delle variabili, con il significato di prima. */
function daVariabiliVecchie(env: NodeJS.ProcessEnv): Partial<Record<NomeComponente, NomeProviderConfig>> {
  const out: Partial<Record<NomeComponente, NomeProviderConfig>> = {};
  const llm = env['CANTASTORIE_LLM']?.trim();
  if (llm === 'finto') Object.assign(out, { lettore: 'finto', arbitro_azioni: 'regole', arbitro_prove: 'regole', riassunto: 'regole', regole: 'regole' });
  if (llm === 'haiku') Object.assign(out, { lettore: 'anthropic' });
  const arbitro = env['CANTASTORIE_ARBITRO']?.trim();
  if (arbitro === 'regole') Object.assign(out, { arbitro_azioni: 'regole', arbitro_prove: 'regole', regole: 'regole' });
  if (arbitro === 'haiku') Object.assign(out, { arbitro_azioni: 'anthropic', arbitro_prove: 'anthropic', regole: 'anthropic' });
  const voce = (env['CANTASTORIE_VOCE'] ?? env['CANTASTORIE_TTS'])?.trim();
  if (voce === 'fish') out.voce = 'openrouter';
  else if (voce === 'qwen') out.voce = 'locale';
  else if (voce === 'finta' || voce === 'mock') out.voce = 'finto';
  return out;
}

export function caricaConfigProvider(env: NodeJS.ProcessEnv = process.env, cartella = env['CANTASTORIE_CONFIG']?.trim() || CARTELLA): ConfigProvider {
  const file = [path.join(cartella, 'predefinita.yaml')];
  if (!process.env['VITEST'] || env['CANTASTORIE_CONFIG']) file.push(path.join(cartella, 'locale.yaml'));
  let d: Record<string, unknown> = {};
  const letti: string[] = [];
  for (const f of file) {
    const y = leggiYaml(f);
    if (y) {
      d = unisci(d, y);
      letti.push(path.relative(RADICE_REPO, f));
    }
  }
  const componenti = (d['componenti'] ?? {}) as Record<string, VoceComponente>;
  // Variabili: prima i nomi vecchi, poi CANTASTORIE_<COMPONENTE> (vince).
  const sovrascritti: Partial<Record<NomeComponente, NomeProviderConfig>> = daVariabiliVecchie(env);
  for (const c of COMPONENTI) {
    const v = env[`CANTASTORIE_${c.toUpperCase()}`]?.trim() as NomeProviderConfig | undefined;
    if (v && (PROVIDER as readonly string[]).includes(v)) sovrascritti[c] = v;
  }
  const finale = {} as Record<NomeComponente, VoceComponente>;
  for (const c of COMPONENTI) {
    const base = componenti[c] ?? { provider: 'nessuno' };
    const forzato = sovrascritti[c];
    // Un provider forzato da variabile vale senza riserve (si è chiesto quello), salvo la riserva deterministica.
    finale[c] = forzato ? { ...base, provider: forzato, riserve: (base.riserve ?? []).filter((r) => r === 'regole' || r === 'finto') } : base;
  }
  const backend = (d['backend'] ?? {}) as ConfigProvider['backend'];
  return { backend: { ...backend, locale: backend.locale ?? {}, openrouter: backend.openrouter ?? {}, anthropic: backend.anthropic ?? {} }, componenti: finale, file: letti };
}

export interface FontiChiavi {
  /** File di ripiego per ANTHROPIC_API_KEY (config.llm.fileChiave). */
  anthropic?: string;
  /** File di ripiego per OPENROUTER_API_KEY (config.voce.fish.fileChiave). */
  openrouter?: string;
  ambiente?: NodeJS.ProcessEnv;
}

export function chiaveDisponibile(nome: string, filePrecedente: string | undefined, ambiente: NodeJS.ProcessEnv | undefined): boolean {
  try {
    cercaChiave(nome, { ...(filePrecedente ? { filePrecedente } : {}), ...(ambiente ? { ambiente } : {}) });
    return true;
  } catch {
    return false;
  }
}

/** Il provider di ogni componente: il primo della catena che si può usare, e perché. */
export function risolvi(cfg: ConfigProvider, chiavi: FontiChiavi = {}): Record<NomeComponente, Scelta> {
  const out = {} as Record<NomeComponente, Scelta>;
  for (const c of COMPONENTI) {
    const v = cfg.componenti[c];
    const catena = [v.provider, ...(v.riserve ?? [])];
    const saltati: string[] = [];
    let scelta: Scelta | null = null;
    for (const p of catena) {
      const motivoNo = nonDisponibile(cfg, c, v, p, chiavi);
      if (motivoNo) {
        saltati.push(`${p}: ${motivoNo}`);
        continue;
      }
      const modello = p === 'locale' && c === 'voce' ? 'qwen3-tts (services/voce)' : p === 'locale' && c === 'immagini' ? 'flux2-klein-4b (mflux, strumenti/immagini)' : p === 'locale' ? (v.provider === 'locale' ? v.modello : undefined) ?? cfg.backend.locale.modello ?? null : p === 'anthropic' ? (v.provider === p ? v.modello : undefined) ?? cfg.backend.anthropic.modello ?? 'claude-haiku-5-5' : p === 'openrouter' || p === 'openai' ? v.modello ?? cfg.backend[p]?.modello ?? null : null;
      const url = p === 'locale' && (c === 'voce' || c === 'immagini') ? null : p === 'locale' ? cfg.backend.locale.url ?? null : p === 'openrouter' ? cfg.backend.openrouter.url ?? 'https://openrouter.ai/api/v1' : p === 'openai' ? v.url ?? cfg.backend['openai']?.url ?? null : null;
      scelta = {
        componente: c,
        provider: p,
        modello,
        url,
        perche: saltati.length ? `riserva (${saltati.join('; ')})` : p === v.provider ? `configurato (${cfg.file.join(' + ') || 'nessun file'})` : 'riserva',
      };
      break;
    }
    scelta ??= { componente: c, provider: c === 'voce' || c === 'lettore' ? 'finto' : 'regole', modello: null, url: null, perche: `nessun provider disponibile (${saltati.join('; ')})` };
    // Lettore e arbitro delle prove: in locale il modo minimo (un modello piccolo non regge il prompt completo).
    if (c === 'lettore' || c === 'arbitro_prove') {
      const modo = v.modo ?? 'auto';
      scelta.modo = modo === 'auto' ? (scelta.provider === 'locale' ? 'minimo' : 'completo') : modo;
    }
    out[c] = scelta;
  }
  return out;
}

function nonDisponibile(cfg: ConfigProvider, c: NomeComponente, v: VoceComponente, p: NomeProviderConfig, chiavi: FontiChiavi): string | null {
  switch (p) {
    case 'anthropic':
      if (c === 'voce' || c === 'immagini') return 'non fa questo lavoro';
      return chiaveDisponibile('ANTHROPIC_API_KEY', chiavi.anthropic, chiavi.ambiente) ? null : 'chiave ANTHROPIC_API_KEY mancante';
    case 'openrouter':
      return chiaveDisponibile('OPENROUTER_API_KEY', chiavi.openrouter, chiavi.ambiente) ? null : 'chiave OPENROUTER_API_KEY mancante';
    case 'openai': {
      const url = v.url ?? cfg.backend['openai']?.url;
      if (!url) return 'manca url';
      const nome = v.chiave ?? cfg.backend['openai']?.chiave;
      return nome && !chiaveDisponibile(nome, undefined, chiavi.ambiente) ? `chiave ${nome} mancante` : null;
    }
    case 'locale':
      return c === 'voce' || c === 'immagini' || cfg.backend.locale.url ? null : 'backend.locale.url mancante';
    case 'regole':
      return c === 'lettore' || c === 'voce' ? 'non ha una riserva a regole' : null;
    default:
      return null;
  }
}

/** Righe leggibili per il log d'avvio: «lettore → locale (minimo) qwen… — configurato». */
export function descriviScelte(s: Record<NomeComponente, Scelta>): string[] {
  return COMPONENTI.map((c) => {
    const x = s[c];
    return `${c.padEnd(15)} → ${x.provider}${x.modo ? ` (${x.modo})` : ''}${x.modello ? ` ${x.modello}` : ''} — ${x.perche}`;
  });
}
