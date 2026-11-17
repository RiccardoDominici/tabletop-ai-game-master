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
  parole: {
    abilita: Record<string, string[]>;
    attacco: string[];
    /** The PC's own attack in the first person (whole words): an attack with no target named, in a fight. */
    attacco_mio?: string[];
    /** A short go-on with no verb (whole clause, or after a weapon of the sheet): the PC's attack again, in a fight. */
    attacco_ancora?: string[];
    /**
     * Whole words that may aim a go-on at a target in the same clause («Ancora contro il goblin», «Again at the
     * goblin»): prepositions and articles. Anything else there and it is no go-on.
     */
    attacco_verso?: string[];
    aiuto: string[];
    senz_armi: string[];
    /** Parole intere dell'arbitro a regole (prove/parole-testo.ts). */
    finali: string[];
    generiche: string[];
    parlato: string[];
    chiedere: string[];
    interrogative: string[];
    modi_del_dire: string[];
    rivolto: string[];
    uso_arma: string[];
    arma_ferma: string[];
    /** What makes a check easier or harder (prove/difficolta.ts). */
    difficolta?: { piu_facile: string[]; piu_difficile: string[] };
    /** SRD skills of routine moves that roll only when a difficulty signal makes them hard. */
    abilita_se_difficile?: Record<string, string[]>;
  };
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
  /** `attacco_mio`, whole words. */
  attaccoMio: RegExp;
  /**
   * `attacco_ancora`: the go-on words opening the clause, after an optional word (group 1, the weapon), and the rest of
   * the clause (group 2, the target's words, if any). Longest first, so «ancora una volta» is not «ancora» + a rest.
   */
  attaccoAncora: RegExp;
  /** `attacco_verso`, the words that aim a go-on at the target named in its clause. */
  attaccoVerso: ReadonlySet<string>;
  aiuto: RegExp;
  /** Sull'id dell'arma scelta dall'arbitro (snake_case), in qualsiasi punto. */
  senzArmi: RegExp;
  /** Routine moves (SRD skill) that roll only when something makes them hard. */
  seDifficile: Array<{ abilita: string; re: RegExp }>;
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
      attaccoMio: parole.attacco_mio?.length ? new RegExp(`\\b(${parole.attacco_mio.join('|')})\\b`) : MAI,
      attaccoAncora: parole.attacco_ancora?.length ? new RegExp(`^(?:(\\S+)\\s+)?(?:${[...parole.attacco_ancora].sort((a, b) => b.length - a.length).join('|')})(?:\\s+(.+))?$`) : MAI,
      attaccoVerso: new Set(parole.attacco_verso ?? []),
      aiuto: inizioParola(parole.aiuto),
      senzArmi: parole.senz_armi.length ? new RegExp(parole.senz_armi.join('|')) : MAI,
      seDifficile: Object.entries(parole.abilita_se_difficile ?? {}).map(([abilita, voci]) => ({ abilita, re: inizioParola(voci) })),
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
