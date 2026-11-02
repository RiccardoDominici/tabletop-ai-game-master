/**
 * Dal tag d'atmosfera della scena (`scena.umore`, vocabolario chiuso del manuale: esplorazione_tesa,
 * taverna_calda, rito_sacro, combattimento_epico, lutto…) e dall'intensità 1–5 ai parametri dello
 * sfondo animato del proiettore. Puro e testato (umori.test.ts).
 *
 * In F0 non ci sono immagini: lo sfondo è un gradiente lento di tre «macchie» di colore.
 */

export interface Tavolozza {
  /** Nome della tavolozza (utile in HUD/test). */
  nome: string;
  /** Colore di fondo, quasi nero ma tinto. */
  fondo: string;
  /** Tre macchie di colore che derivano lentamente. */
  c1: string;
  c2: string;
  c3: string;
}

const TAVOLOZZE = {
  esplorazione_tesa: { nome: 'esplorazione_tesa', fondo: '#090d12', c1: '#1d4b4d', c2: '#352a58', c3: '#7a5826' },
  taverna_calda: { nome: 'taverna_calda', fondo: '#130a05', c1: '#8f3e12', c2: '#b77a2c', c3: '#4f1d1a' },
  rito_sacro: { nome: 'rito_sacro', fondo: '#0c0913', c1: '#b8913c', c2: '#55388a', c3: '#d9c79a' },
  mistero: { nome: 'mistero', fondo: '#060911', c1: '#22365f', c2: '#3d2860', c3: '#1b4a50' },
  tensione: { nome: 'tensione', fondo: '#0e0707', c1: '#5f1919', c2: '#2b2d3d', c3: '#7a3912' },
  combattimento_epico: { nome: 'combattimento_epico', fondo: '#110505', c1: '#b5311e', c2: '#df7a1e', c3: '#3b1a4d' },
  lutto: { nome: 'lutto', fondo: '#090a0f', c1: '#39414f', c2: '#28283a', c3: '#5a5268' },
  orrore: { nome: 'orrore', fondo: '#050505', c1: '#3d0d12', c2: '#1d2a1e', c3: '#2a1630' },
  inseguimento: { nome: 'inseguimento', fondo: '#0a0b10', c1: '#7a2a16', c2: '#20456b', c3: '#a0601c' },
  riposo: { nome: 'riposo', fondo: '#0a0c10', c1: '#2a4a5e', c2: '#5e4a2a', c3: '#33284a' },
  vittoria: { nome: 'vittoria', fondo: '#0e0b06', c1: '#c08a2a', c2: '#2a5e4a', c3: '#e0b860' },
  predefinito: { nome: 'predefinito', fondo: '#0e0c15', c1: '#3a2955', c2: '#5c401d', c3: '#1e3b47' },
} satisfies Record<string, Tavolozza>;

type NomeTavolozza = keyof typeof TAVOLOZZE;

/**
 * Parole chiave per i tag non previsti (il vocabolario crescerà): la prima che compare vince.
 * L'ordine conta: «esplora» prima di «tesa», «combatt» prima di «tension».
 */
const PAROLE_CHIAVE: ReadonlyArray<readonly [NomeTavolozza, readonly string[]]> = [
  ['combattimento_epico', ['combatt', 'battaglia', 'boss', 'scontro', 'duello']],
  ['inseguimento', ['insegui', 'fuga', 'corsa']],
  ['orrore', ['orrore', 'horror', 'incubo', 'macabro']],
  ['taverna_calda', ['taverna', 'locanda', 'festa', 'osteria']],
  ['rito_sacro', ['rito', 'sacro', 'tempio', 'preghiera', 'divino']],
  ['lutto', ['lutto', 'pathos', 'triste', 'perdita', 'funebre']],
  ['vittoria', ['vittoria', 'trionfo', 'gloria']],
  ['riposo', ['riposo', 'calma', 'bivacco', 'quiete']],
  ['esplorazione_tesa', ['esplora', 'viaggio', 'cammino']],
  ['mistero', ['mister', 'indagine', 'enigma', 'segreto']],
  ['tensione', ['tension', 'tesa', 'teso', 'pericolo', 'agguato', 'minaccia']],
];

export function tavolozzaPerUmore(umore: string | null | undefined): Tavolozza {
  const tag = (umore ?? '').trim().toLowerCase();
  if (!tag) return TAVOLOZZE.predefinito;
  if (tag in TAVOLOZZE) return TAVOLOZZE[tag as NomeTavolozza];
  for (const [nome, parole] of PAROLE_CHIAVE) {
    if (parole.some((p) => tag.includes(p))) return TAVOLOZZE[nome];
  }
  return TAVOLOZZE.predefinito;
}

export interface ParametriSfondo {
  tavolozza: Tavolozza;
  /** Durata di un ciclo di deriva (s): più intensità, più movimento. */
  durataS: number;
  /** Opacità delle macchie: più intensità, colori più presenti. */
  opacita: number;
}

/** Intensità usata quando la scena non la indica. */
const INTENSITA_PREDEFINITA = 3;

export function parametriSfondo(umore: string | null | undefined, intensita: number | null | undefined): ParametriSfondo {
  const grezza = intensita ?? INTENSITA_PREDEFINITA;
  const i = Number.isFinite(grezza) ? Math.min(5, Math.max(1, Math.round(grezza))) : INTENSITA_PREDEFINITA;
  return {
    tavolozza: tavolozzaPerUmore(umore),
    durataS: 48 - (i - 1) * 7, // 48 s (calma) → 20 s (climax)
    opacita: Number((0.5 + (i - 1) * 0.08).toFixed(2)), // 0,50 → 0,82
  };
}
