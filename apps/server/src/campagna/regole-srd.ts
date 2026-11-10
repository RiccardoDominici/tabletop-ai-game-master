/**
 * Tabelle e formule SRD 5.2 (CC-BY-4.0, Wizards of the Coast) che servono alle schede numeriche e alle
 * prove. Logica pura, senza stato. Gli id (forza, rapidita_di_mano, giaco_di_maglia…) sono stabili e
 * uguali in ogni lingua; i NOMI da mostrare dipendono dalla lingua dei contenuti (docs/lingue.md) e si
 * leggono al momento dell'uso da lingue/<codice>/prove.yaml: italiano dall'SRD 5.2.1 in italiano,
 * inglese dall'SRD 5.2 in inglese.
 *
 * Attribuzione (obbligatoria nei crediti): «This work includes material from the System Reference
 * Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
 * International License.»
 */
import { nomeDi } from '../prove/lingua';

/** Le sei caratteristiche, con id brevi e stabili (quelli delle schede YAML). */
export const CARATTERISTICHE = ['forza', 'destrezza', 'costituzione', 'intelligenza', 'saggezza', 'carisma'] as const;
export type Caratteristica = (typeof CARATTERISTICHE)[number];

/**
 * Una tabella id → nome che legge il pacchetto della lingua attiva a ogni accesso: chi importa
 * NOME_ABILITA (anche fuori dalle prove, per esempio le schede) mostra sempre i nomi della lingua in uso.
 */
function vistaNomi<K extends string>(ids: readonly K[], nome: (k: K) => string): Readonly<Record<K, string>> {
  const o = {} as Record<K, string>;
  for (const k of ids) Object.defineProperty(o, k, { enumerable: true, get: () => nome(k) });
  return Object.freeze(o);
}

/** Nome da mostrare di una caratteristica, nella lingua dei contenuti. */
export function nomeCaratteristica(c: Caratteristica): string {
  return nomeDi('caratteristiche', c);
}

export const NOME_CARATTERISTICA: Readonly<Record<Caratteristica, string>> = vistaNomi(CARATTERISTICHE, nomeCaratteristica);

/** Le diciotto abilità (SRD 5.2, «Abilità»), id in snake_case senza accenti. */
export const ABILITA = [
  'acrobazia',
  'addestrare_animali',
  'arcano',
  'atletica',
  'furtivita',
  'indagare',
  'inganno',
  'intimidire',
  'intrattenere',
  'intuizione',
  'medicina',
  'natura',
  'percezione',
  'persuasione',
  'rapidita_di_mano',
  'religione',
  'sopravvivenza',
  'storia',
] as const;
export type Abilita = (typeof ABILITA)[number];

/** Caratteristica di ogni abilità (SRD 5.2). */
export const CARATTERISTICA_DI: Record<Abilita, Caratteristica> = {
  acrobazia: 'destrezza',
  addestrare_animali: 'saggezza',
  arcano: 'intelligenza',
  atletica: 'forza',
  furtivita: 'destrezza',
  indagare: 'intelligenza',
  inganno: 'carisma',
  intimidire: 'carisma',
  intrattenere: 'carisma',
  intuizione: 'saggezza',
  medicina: 'saggezza',
  natura: 'intelligenza',
  percezione: 'saggezza',
  persuasione: 'carisma',
  rapidita_di_mano: 'destrezza',
  religione: 'intelligenza',
  sopravvivenza: 'saggezza',
  storia: 'intelligenza',
};

/** Nome da mostrare di un'abilità, nella lingua dei contenuti. */
export function nomeAbilita(a: Abilita): string {
  return nomeDi('abilita', a);
}

export const NOME_ABILITA: Readonly<Record<Abilita, string>> = vistaNomi(ABILITA, nomeAbilita);

/** Abilità dell'azione Influenzare (SRD 5.2, «Influenzare»): si usano verso un PNG esitante. */
export const ABILITA_INFLUENZA: ReadonlySet<Abilita> = new Set(['persuasione', 'inganno', 'intimidire', 'intrattenere', 'addestrare_animali']);

/** Toglie accenti, maiuscole e separatori: «Rapidità di mano» → «rapidita_di_mano». */
export function chiave(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’`]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Sinonimi accettati nelle schede (abbreviazioni italiane, nomi inglesi dell'SRD). */
const SINONIMI_CARATTERISTICA: Record<string, Caratteristica> = {
  for: 'forza',
  str: 'forza',
  strength: 'forza',
  des: 'destrezza',
  dex: 'destrezza',
  dexterity: 'destrezza',
  cos: 'costituzione',
  con: 'costituzione',
  constitution: 'costituzione',
  int: 'intelligenza',
  intelligence: 'intelligenza',
  sag: 'saggezza',
  wis: 'saggezza',
  wisdom: 'saggezza',
  car: 'carisma',
  cha: 'carisma',
  charisma: 'carisma',
};

const SINONIMI_ABILITA: Record<string, Abilita> = {
  acrobatics: 'acrobazia',
  animal_handling: 'addestrare_animali',
  addestrare: 'addestrare_animali',
  arcana: 'arcano',
  athletics: 'atletica',
  stealth: 'furtivita',
  investigation: 'indagare',
  deception: 'inganno',
  intimidation: 'intimidire',
  performance: 'intrattenere',
  insight: 'intuizione',
  medicine: 'medicina',
  nature: 'natura',
  perception: 'percezione',
  persuasion: 'persuasione',
  sleight_of_hand: 'rapidita_di_mano',
  religion: 'religione',
  survival: 'sopravvivenza',
  history: 'storia',
};

export function comeCaratteristica(v: unknown): Caratteristica | null {
  if (typeof v !== 'string') return null;
  const k = chiave(v);
  if ((CARATTERISTICHE as readonly string[]).includes(k)) return k as Caratteristica;
  return SINONIMI_CARATTERISTICA[k] ?? null;
}

export function comeAbilita(v: unknown): Abilita | null {
  if (typeof v !== 'string') return null;
  const k = chiave(v);
  if ((ABILITA as readonly string[]).includes(k)) return k as Abilita;
  return SINONIMI_ABILITA[k] ?? null;
}

/** Modificatore di caratteristica (SRD 5.2): (punteggio − 10) / 2, arrotondato per difetto. */
export function modificatore(punteggio: number): number {
  return Math.floor((punteggio - 10) / 2);
}

/** Bonus di competenza per livello o grado di sfida (SRD 5.2): +2 a 1–4, +3 a 5–8, … +9 a 29–30. */
export function bonusCompetenza(livelloOGs: number): number {
  const l = Math.max(1, Math.ceil(livelloOGs));
  return 2 + Math.floor((l - 1) / 4);
}

/** «1/2», «0.25», 3 → numero (grado di sfida dei PNG). */
export function comeGradoSfida(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
  if (typeof v === 'string') {
    const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(v);
    if (m) return Number(m[1]) / Number(m[2]);
    const n = Number(v.replace(',', '.'));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/** Classi Difficoltà tipiche (SRD 5.2). */
export const DIFFICOLTA = {
  molto_facile: 5,
  facile: 10,
  media: 15,
  difficile: 20,
  molto_difficile: 25,
  quasi_impossibile: 30,
} as const;
export type Difficolta = keyof typeof DIFFICOLTA;

/** Nome di una difficoltà (minuscolo: si legge dentro una frase), nella lingua dei contenuti. */
export function nomeDifficolta(d: Difficolta): string {
  return nomeDi('difficolta', d);
}

export const NOME_DIFFICOLTA: Readonly<Record<Difficolta, string>> = vistaNomi(Object.keys(DIFFICOLTA) as Difficolta[], nomeDifficolta);

/** Armature (SRD 5.2, «Armature»): CA base, quanta Destrezza si somma (null = tutta). */
export interface DatiArmatura {
  /** Nome da mostrare, nella lingua dei contenuti (letto a ogni accesso). */
  readonly nome: string;
  base: number;
  /** Massimo della Destrezza aggiunta: null = tutta, 0 = niente (armature pesanti). */
  maxDestrezza: number | null;
}

/** Nome da mostrare di un'armatura (id di ARMATURE), nella lingua dei contenuti. */
export function nomeArmatura(id: string): string {
  return nomeDi('armature', id);
}

/** Un'armatura con il nome letto dal pacchetto della lingua attiva. */
function armatura(id: string, base: number, maxDestrezza: number | null): DatiArmatura {
  return Object.freeze({ get nome() { return nomeArmatura(id); }, base, maxDestrezza });
}

export const ARMATURE: Record<string, DatiArmatura> = {
  armatura_imbottita: armatura('armatura_imbottita', 11, null),
  armatura_di_cuoio: armatura('armatura_di_cuoio', 11, null),
  armatura_di_cuoio_borchiato: armatura('armatura_di_cuoio_borchiato', 12, null),
  armatura_di_pelle: armatura('armatura_di_pelle', 12, 2),
  giaco_di_maglia: armatura('giaco_di_maglia', 13, 2),
  corazza_a_scaglie: armatura('corazza_a_scaglie', 14, 2),
  corazza_di_piastre: armatura('corazza_di_piastre', 14, 2),
  mezza_armatura: armatura('mezza_armatura', 15, 2),
  corazza_ad_anelli: armatura('corazza_ad_anelli', 14, 0),
  cotta_di_maglia: armatura('cotta_di_maglia', 16, 0),
  corazza_a_strisce: armatura('corazza_a_strisce', 17, 0),
  armatura_a_piastre: armatura('armatura_a_piastre', 18, 0),
};

/**
 * Sinonimi brevi delle armature («cuoio», «piastre») e i nomi dell'SRD inglese, interi o brevi: una
 * scheda si legge uguale in ogni lingua.
 */
const SINONIMI_ARMATURA: Record<string, string> = {
  imbottita: 'armatura_imbottita',
  padded: 'armatura_imbottita',
  padded_armor: 'armatura_imbottita',
  cuoio: 'armatura_di_cuoio',
  leather: 'armatura_di_cuoio',
  leather_armor: 'armatura_di_cuoio',
  cuoio_borchiato: 'armatura_di_cuoio_borchiato',
  studded_leather: 'armatura_di_cuoio_borchiato',
  studded_leather_armor: 'armatura_di_cuoio_borchiato',
  pelle: 'armatura_di_pelle',
  hide: 'armatura_di_pelle',
  hide_armor: 'armatura_di_pelle',
  chain_shirt: 'giaco_di_maglia',
  scale_mail: 'corazza_a_scaglie',
  breastplate: 'corazza_di_piastre',
  half_plate: 'mezza_armatura',
  half_plate_armor: 'mezza_armatura',
  ring_mail: 'corazza_ad_anelli',
  chain_mail: 'cotta_di_maglia',
  splint: 'corazza_a_strisce',
  splint_armor: 'corazza_a_strisce',
  plate: 'armatura_a_piastre',
  plate_armor: 'armatura_a_piastre',
  piastre: 'armatura_a_piastre',
};

export function comeArmatura(v: unknown): DatiArmatura | null {
  if (typeof v !== 'string') return null;
  const k = chiave(v);
  return ARMATURE[k] ?? ARMATURE[SINONIMI_ARMATURA[k] ?? ''] ?? null;
}

/** Bonus dello scudo alla CA (SRD 5.2). */
export const BONUS_SCUDO = 2;

/** CA da armatura (o senza: 10 + Destrezza), scudo e bonus extra. */
export function classeArmatura(modDestrezza: number, armatura: DatiArmatura | null, scudo: boolean, extra = 0): number {
  const base = armatura ? armatura.base + (armatura.maxDestrezza === null ? modDestrezza : Math.min(modDestrezza, armatura.maxDestrezza)) : 10 + modDestrezza;
  return base + (scudo ? BONUS_SCUDO : 0) + extra;
}

/** Formula di dadi «2d6+3», «1d8», «d4-1», «5». */
export interface FormulaDadi {
  numero: number;
  facce: number;
  bonus: number;
}

export function leggiFormula(v: unknown): FormulaDadi | null {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return { numero: 0, facce: 0, bonus: v };
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, '').toLowerCase();
  const m = /^(\d*)d(\d+)([+-]\d+)?$/.exec(t);
  if (m) {
    const numero = m[1] ? Number(m[1]) : 1;
    const facce = Number(m[2]);
    if (numero < 1 || numero > 40 || ![2, 3, 4, 6, 8, 10, 12, 20, 100].includes(facce)) return null;
    return { numero, facce, bonus: m[3] ? Number(m[3]) : 0 };
  }
  if (/^\d+$/.test(t)) return { numero: 0, facce: 0, bonus: Number(t) };
  return null;
}

export function scriviFormula(f: FormulaDadi): string {
  const dadi = f.numero > 0 ? `${f.numero}d${f.facce}` : '';
  if (!dadi) return String(f.bonus);
  return f.bonus ? `${dadi}${f.bonus > 0 ? '+' : ''}${f.bonus}` : dadi;
}

/** «+3», «−1», «+0» come sulle schede. */
export function conSegno(n: number): string {
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
}
