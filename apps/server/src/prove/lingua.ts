/**
 * La lingua dei dadi e delle regole (docs/lingue.md, docs/prove.md): nomi SRD (caratteristiche, abilità,
 * difficoltà, armature, condizioni, tipi di danno) e parole chiave dell'arbitro a regole da
 * lingue/<codice>/prove.yaml, prompt degli arbitri da prompts/<codice>/<nome>.md.
 *
 * Tutto si legge AL MOMENTO DELL'USO dal pacchetto della lingua attiva (impostata all'avvio, src/lingua):
 * nessun modulo fissa un nome o una parola chiave quando viene importato. Le parole chiave compilate e i
 * prompt letti restano in memoria per pacchetto (una lingua per processo, docs/lingue.md).
 *
 * Le frasi fisse (righe di fatto, carte, messaggi) stanno invece in lingue/<codice>/testi-prove.yaml e si
 * chiedono con `testo('prove.…')` (src/lingua).
 */
import { leggiPrompt, linguaAttiva, pacco, type Lingua } from '../lingua';

/** I nomi di prove.yaml (`nomi:`), per id stabile (uguale in ogni lingua). */
export interface NomiProve {
  caratteristiche: Record<string, string>;
  abilita: Record<string, string>;
  difficolta: Record<string, string>;
  armature: Record<string, string>;
  vantaggio: Record<string, string>;
  contro: Record<string, string>;
  atteggiamenti: Record<string, string>;
  colpo_senz_armi: string;
  a_mani_nude: string;
  danni: { nome: Record<string, string>; plurale: Record<string, string>; regola_plurale: string[] };
  condizioni: Record<string, { nome: string; testo: string }>;
  combattimento: {
    turno: string;
    azione: string;
    una: string;
    azioni_srd: Record<string, { nome: string; quante: string }>;
  };
}

/** Il file prove.yaml di un pacchetto. */
export interface PacchettoProve {
  nomi: NomiProve;
  srd: { danni: { nome: string; a_zero: string }; sociale: string; attribuzione: string };
  parole: { abilita: Record<string, string[]>; attacco: string[]; aiuto: string[]; senz_armi: string[] };
}

/** Le sezioni di `nomi:` che sono semplici tabelle id → nome. */
export type TabellaNomi = 'caratteristiche' | 'abilita' | 'difficolta' | 'armature' | 'vantaggio' | 'contro' | 'atteggiamenti';

/** prove.yaml della lingua attiva (già controllato rispetto all'italiano da src/lingua). */
export function datiProve(): PacchettoProve {
  return pacco().prove as unknown as PacchettoProve;
}

/**
 * Il nome di un id nella lingua attiva. Un id senza nome è un errore di programmazione (manca nella
 * tabella italiana, quindi in tutte): si lancia, così i test lo trovano subito.
 */
export function nomeDi(tabella: TabellaNomi, id: string): string {
  const v = datiProve().nomi?.[tabella]?.[id];
  if (typeof v !== 'string') throw new Error(`prove.yaml (${linguaAttiva()}): manca nomi.${tabella}.${id}`);
  return v;
}

/** Come nomeDi, ma un id sconosciuto resta com'è (valori che vengono dai dati, non dal codice). */
export function nomeOppure(tabella: TabellaNomi, id: string): string {
  const v = datiProve().nomi?.[tabella]?.[id];
  return typeof v === 'string' ? v : id;
}

/** Le parole chiave compilate (prove/parole-chiave.ts, prove/classificatore-regole.ts, prove/risolutore.ts). */
export interface ParoleCompilate {
  /** Abilità SRD nell'ordine del file: la prima che trova vince. */
  abilita: Array<{ abilita: string; re: RegExp }>;
  attacco: RegExp;
  aiuto: RegExp;
  /** Sull'id dell'arma scelta dall'arbitro (snake_case), in qualsiasi punto. */
  senzArmi: RegExp;
}

/** Nessuna parola: un'espressione che non trova mai niente (non `\b()`, che troverebbe tutto). */
const MAI = /(?!)/;

/** Radici che cominciano una parola: `\b(a|b|c)`, come la tabella italiana di sempre. */
function inizioParola(voci: readonly string[]): RegExp {
  return voci.length ? new RegExp(`\\b(${voci.join('|')})`) : MAI;
}

const compilate = new WeakMap<object, ParoleCompilate>();

/** Le parole chiave della lingua attiva, compilate una volta per pacchetto. */
export function paroleProve(): ParoleCompilate {
  const p = datiProve();
  let c = compilate.get(p);
  if (!c) {
    const parole = p.parole;
    c = {
      abilita: Object.entries(parole.abilita).map(([abilita, voci]) => ({ abilita, re: inizioParola(voci) })),
      attacco: inizioParola(parole.attacco),
      aiuto: inizioParola(parole.aiuto),
      senzArmi: parole.senz_armi.length ? new RegExp(parole.senz_armi.join('|')) : MAI,
    };
    compilate.set(p, c);
  }
  return c;
}

const prompt = new Map<string, string>();

/**
 * Un prompt dei dadi o delle regole (prompts/<lingua>/<nome>.md) con i segnaposto `{nome}` sostituiti.
 * Il file finisce con un a capo che il prompt non ha. I valori non si rileggono: un `{x}` dentro il
 * riassunto delle regole resta com'è.
 */
export function promptProve(nome: string, valori: Record<string, string | number> = {}, lingua: Lingua = linguaAttiva()): string {
  const chiave = `${lingua}/${nome}`;
  let t = prompt.get(chiave);
  if (t === undefined) {
    t = leggiPrompt(nome, lingua).replace(/\r?\n$/, '');
    prompt.set(chiave, t);
  }
  return t.replace(/\{(\w+)\}/g, (tutto, n: string) => (n in valori ? String(valori[n]) : tutto));
}

/** I prompt di questo modulo (per i test: ogni lingua li ha, con gli stessi segnaposto). */
export const PROMPT_PROVE = ['arbitro-prove', 'arbitro-minimo', 'risponditore-regole'] as const;
