/**
 * La sezione `combattimento:` di regole.yaml (docs/combattimento.md): come si combatte nel set.
 * Iniziativa (individuale, per schieramento, nessuna), struttura del round in FASI ordinate, economia
 * delle azioni, modello del danno e cosa succede a 0, condizioni con effetti MECCANICI (un elenco
 * chiuso di effetti che il Motore applica ai tiri), fine del combattimento (nemici a terra, fuga,
 * resa, morale). Senza la sezione: l'SRD 5.2 completo per l'SRD, valori sensati per gli altri tipi.
 * I nomi del codice (condizioni, fasi, azioni dell'SRD) sono nella lingua dei contenuti, letti quando
 * si costruisce il combattimento (prove.yaml, nomi.condizioni e nomi.combattimento).
 */
import type { TipoRisoluzione } from '@cantastorie/shared';
import { datiProve } from '../prove/lingua';

/** Effetti meccanici che il Motore sa applicare (le condizioni li combinano). */
export const EFFETTI = [
  'svantaggio_attacchi',
  'vantaggio_attacchi',
  'svantaggio_prove',
  'svantaggio_salvezze',
  'attacchi_contro_vantaggio',
  'attacchi_contro_svantaggio',
  'critico_contro',
  'fallisce_salvezze_forza_destrezza',
  'perde_turno',
  'non_si_muove',
] as const;
export type Effetto = (typeof EFFETTI)[number];

export interface Condizione {
  id: string;
  nome: string;
  effetti: Effetto[];
  /** Testo del manuale (per narratore, telefono e pannello). */
  testo: string;
  /** Icona breve per proiettore e telefono (un emoji o due lettere). */
  icona: string;
}

export interface Fase {
  id: string;
  nome: string;
  /**
   * Che cosa fanno i PNG da soli in questa fase: `attacco_distanza`, `attacco_mischia`, `attacco`
   * (qualsiasi arma), oppure niente (movimento, magia: li racconta il narratore se i PG li cercano).
   */
  png: 'attacco' | 'attacco_distanza' | 'attacco_mischia' | null;
}

export interface Combattimento {
  iniziativa: {
    tipo: 'individuale' | 'per_schieramento' | 'nessuna';
    /** Dado dell'iniziativa: 20 per l'SRD, 6 per B/X. */
    dado: number;
    /** Caratteristica che si somma (id del set); null = nessuna. */
    caratteristica: string | null;
    /** Si ritira a ogni round (B/X); altrimenti resta fissa. */
    ogniRound: boolean;
  };
  /** Fasi del round, in ordine. Con l'iniziativa individuale di solito una sola: «turno». */
  fasi: Fase[];
  /** Economia del turno, per il telefono e il narratore. */
  azioni: Array<{ id: string; nome: string; quante: string }>;
  danni: {
    modello: 'pf' | 'ferite' | 'stress';
    /** A 0 un PG: tiri contro la morte (SRD), fuori gioco, o morto. */
    pgAZero: 'tiri_morte' | 'fuori_gioco' | 'morte';
    pngAZero: 'morte' | 'fuori_gioco';
    /**
     * Tiri contro la morte. `ventiRialza`: un 20 naturale rimette in piedi con 1 PF; `unoDoppio`: un 1 naturale
     * conta due fallimenti. Sono regole dell'SRD 5.2: valgono se il set non dice altro (`venti_rialza`,
     * `uno_doppio` di `tiri_morte`); prima valevano per ogni set, anche dove il manuale non le ha.
     */
    tiriMorte: { cd: number; successi: number; fallimenti: number; ventiRialza: boolean; unoDoppio: boolean } | null;
  };
  condizioni: Condizione[];
  /** Condizione data a chi va a 0 (Privo di sensi nell'SRD); null = nessuna. */
  condizioneAZero: string | null;
  fine: {
    /** Morale dei PNG (B/X): 2d6 contro il morale della scheda, dopo il primo caduto e a metà caduti. */
    morale: boolean;
  };
}

/**
 * Le 15 condizioni dell'SRD 5.2 (più la Schivata) con i loro effetti meccanici: id, icona ed effetti
 * sono del codice; nome e testo, nella lingua dei contenuti, da lingue/<codice>/prove.yaml
 * (nomi.condizioni.<id>: italiano dall'SRD 5.2.1 in italiano, inglese dall'SRD 5.2).
 */
const EFFETTI_SRD: ReadonlyArray<{ id: string; icona: string; effetti: Effetto[] }> = [
  { id: 'accecato', icona: '👁', effetti: ['svantaggio_attacchi', 'attacchi_contro_vantaggio'] },
  { id: 'affascinato', icona: '💗', effetti: [] },
  { id: 'assordato', icona: '🔇', effetti: [] },
  { id: 'indebolimento', icona: '😩', effetti: ['svantaggio_prove'] },
  { id: 'spaventato', icona: '😱', effetti: ['svantaggio_attacchi', 'svantaggio_prove'] },
  { id: 'afferrato', icona: '✊', effetti: ['non_si_muove'] },
  { id: 'incapacitato', icona: '💫', effetti: ['perde_turno'] },
  { id: 'invisibile', icona: '👻', effetti: ['vantaggio_attacchi', 'attacchi_contro_svantaggio'] },
  { id: 'paralizzato', icona: '🧊', effetti: ['perde_turno', 'non_si_muove', 'fallisce_salvezze_forza_destrezza', 'attacchi_contro_vantaggio', 'critico_contro'] },
  { id: 'pietrificato', icona: '🗿', effetti: ['perde_turno', 'non_si_muove', 'fallisce_salvezze_forza_destrezza', 'attacchi_contro_vantaggio'] },
  { id: 'avvelenato', icona: '🤢', effetti: ['svantaggio_attacchi', 'svantaggio_prove'] },
  { id: 'prono', icona: '⬇', effetti: ['svantaggio_attacchi', 'attacchi_contro_vantaggio'] },
  { id: 'trattenuto', icona: '⛓', effetti: ['non_si_muove', 'svantaggio_attacchi', 'attacchi_contro_vantaggio', 'svantaggio_salvezze'] },
  { id: 'stordito', icona: '💥', effetti: ['perde_turno', 'fallisce_salvezze_forza_destrezza', 'attacchi_contro_vantaggio'] },
  { id: 'privo_di_sensi', icona: '💤', effetti: ['perde_turno', 'non_si_muove', 'fallisce_salvezze_forza_destrezza', 'attacchi_contro_vantaggio', 'critico_contro'] },
  { id: 'schivata', icona: '🛡', effetti: ['attacchi_contro_svantaggio'] },
];

/** Le condizioni dell'SRD con nome e testo nella lingua attiva (lette adesso). */
export function condizioniSrd(): Condizione[] {
  const nomi = datiProve().nomi.condizioni;
  return EFFETTI_SRD.map((c) => {
    const n = nomi[c.id];
    if (!n) throw new Error(`prove.yaml: manca nomi.condizioni.${c.id}`);
    return { id: c.id, nome: n.nome, icona: c.icona, effetti: [...c.effetti], testo: n.testo };
  });
}

export function combattimentoSrd(): Combattimento {
  const n = datiProve().nomi.combattimento;
  const azione = (id: 'movimento' | 'azione' | 'bonus' | 'reazione'): { id: string; nome: string; quante: string } => ({ id, ...n.azioni_srd[id]! });
  return {
    iniziativa: { tipo: 'individuale', dado: 20, caratteristica: 'destrezza', ogniRound: false },
    fasi: [{ id: 'turno', nome: n.turno, png: 'attacco' }],
    azioni: [azione('movimento'), azione('azione'), azione('bonus'), azione('reazione')],
    danni: { modello: 'pf', pgAZero: 'tiri_morte', pngAZero: 'morte', tiriMorte: { cd: 10, successi: 3, fallimenti: 3, ventiRialza: true, unoDoppio: true } },
    condizioni: condizioniSrd(),
    condizioneAZero: 'privo_di_sensi',
    fine: { morale: false },
  };
}

/** Senza la sezione: SRD per l'SRD; per gli altri tipi un combattimento semplice e coerente. */
export function combattimentoPredefinito(tipo: TipoRisoluzione, srd: boolean, caratteristiche: string[]): Combattimento {
  if (srd) return combattimentoSrd();
  const n = datiProve().nomi.combattimento;
  return {
    // Il 2d6 alla PbtA non ha iniziativa: la scena segue la finzione e i PNG colpiscono con lo scambio.
    iniziativa: tipo === '2d6_fasce' ? { tipo: 'nessuna', dado: 6, caratteristica: null, ogniRound: false } : { tipo: 'individuale', dado: tipo === 'sotto_soglia' ? 10 : 20, caratteristica: caratteristiche.includes('destrezza') ? 'destrezza' : null, ogniRound: false },
    fasi: [{ id: 'turno', nome: n.turno, png: 'attacco' }],
    azioni: [{ id: 'azione', nome: n.azione, quante: n.una }],
    danni: { modello: 'pf', pgAZero: 'fuori_gioco', pngAZero: 'fuori_gioco', tiriMorte: null },
    condizioni: [],
    condizioneAZero: null,
    fine: { morale: false },
  };
}

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const SNAKE = /^[a-z0-9_]+$/;

/** Legge `combattimento:` di regole.yaml sopra i valori predefiniti del tipo; errori per il validatore. */
export function leggiCombattimento(v: unknown, base: Combattimento, caratteristiche: ReadonlySet<string>, errori: string[]): Combattimento {
  const d = ogg(v);
  if (!d) return base;
  const out: Combattimento = structuredClone(base);
  const ini = ogg(d['iniziativa']);
  if (ini) {
    const tipo = ini['tipo'];
    if (tipo !== undefined && tipo !== 'individuale' && tipo !== 'per_schieramento' && tipo !== 'nessuna') errori.push('combattimento.iniziativa.tipo: individuale, per_schieramento o nessuna');
    else if (tipo) out.iniziativa.tipo = tipo;
    if (typeof ini['dado'] === 'number' && [4, 6, 8, 10, 12, 20].includes(ini['dado'])) out.iniziativa.dado = ini['dado'];
    else if (ini['dado'] !== undefined) errori.push('combattimento.iniziativa.dado: 4, 6, 8, 10, 12 o 20');
    const car = ini['caratteristica'];
    if (car === null) out.iniziativa.caratteristica = null;
    else if (typeof car === 'string') {
      if (!caratteristiche.has(car)) errori.push(`combattimento.iniziativa.caratteristica inesistente «${car}»`);
      else out.iniziativa.caratteristica = car;
    }
    if (typeof ini['ogni_round'] === 'boolean') out.iniziativa.ogniRound = ini['ogni_round'];
  }
  if (Array.isArray(d['fasi'])) {
    const fasi: Fase[] = [];
    for (const [i, x] of d['fasi'].entries()) {
      const o = ogg(x);
      const id = str(o?.['id']);
      const png = o?.['png'] ?? null;
      if (!o || !id || !SNAKE.test(id)) errori.push(`combattimento.fasi[${i + 1}]: serve un id snake_case`);
      else if (png !== null && png !== 'attacco' && png !== 'attacco_distanza' && png !== 'attacco_mischia') errori.push(`combattimento.fasi.${id}.png: attacco, attacco_distanza, attacco_mischia o vuoto`);
      else fasi.push({ id, nome: str(o['nome']) ?? id, png: png as Fase['png'] });
    }
    if (!fasi.length) errori.push('combattimento.fasi: almeno una');
    else out.fasi = fasi;
  }
  if (Array.isArray(d['azioni'])) out.azioni = d['azioni'].flatMap((x) => { const o = ogg(x); const id = str(o?.['id']); return o && id ? [{ id, nome: str(o['nome']) ?? id, quante: str(o['quante']) ?? datiProve().nomi.combattimento.una }] : []; });
  const dan = ogg(d['danni']);
  if (dan) {
    if (dan['modello'] !== undefined) {
      if (['pf', 'ferite', 'stress'].includes(dan['modello'] as string)) out.danni.modello = dan['modello'] as Combattimento['danni']['modello'];
      else errori.push('combattimento.danni.modello: pf, ferite o stress');
    }
    const az = ogg(dan['a_zero']) ?? {};
    if (az['pg'] !== undefined) {
      if (['tiri_morte', 'fuori_gioco', 'morte'].includes(az['pg'] as string)) out.danni.pgAZero = az['pg'] as Combattimento['danni']['pgAZero'];
      else errori.push('combattimento.danni.a_zero.pg: tiri_morte, fuori_gioco o morte');
    }
    if (az['png'] !== undefined) {
      if (['morte', 'fuori_gioco'].includes(az['png'] as string)) out.danni.pngAZero = az['png'] as Combattimento['danni']['pngAZero'];
      else errori.push('combattimento.danni.a_zero.png: morte o fuori_gioco');
    }
    const tm = ogg(dan['tiri_morte']);
    if (tm) {
      const bool = (k: string): boolean => {
        if (tm[k] === undefined) return true;
        if (typeof tm[k] !== 'boolean') errori.push(`combattimento.danni.tiri_morte.${k}: true o false`);
        return tm[k] !== false;
      };
      out.danni.tiriMorte = {
        cd: typeof tm['cd'] === 'number' ? tm['cd'] : 10,
        successi: typeof tm['successi'] === 'number' ? tm['successi'] : 3,
        fallimenti: typeof tm['fallimenti'] === 'number' ? tm['fallimenti'] : 3,
        ventiRialza: bool('venti_rialza'),
        unoDoppio: bool('uno_doppio'),
      };
    }
    if (out.danni.pgAZero === 'tiri_morte' && !out.danni.tiriMorte) out.danni.tiriMorte = { cd: 10, successi: 3, fallimenti: 3, ventiRialza: true, unoDoppio: true };
  }
  if (Array.isArray(d['condizioni'])) {
    const cond: Condizione[] = [];
    for (const [i, x] of d['condizioni'].entries()) {
      const o = ogg(x);
      const id = str(o?.['id']);
      if (!o || !id || !SNAKE.test(id)) {
        errori.push(`combattimento.condizioni[${i + 1}]: serve un id snake_case`);
        continue;
      }
      const eff = Array.isArray(o['effetti']) ? o['effetti'] : [];
      for (const e of eff) if (!(EFFETTI as readonly unknown[]).includes(e)) errori.push(`combattimento.condizioni.${id}: effetto sconosciuto «${String(e)}» (ammessi: ${EFFETTI.join(', ')})`);
      cond.push({ id, nome: str(o['nome']) ?? id, effetti: eff.filter((e): e is Effetto => (EFFETTI as readonly unknown[]).includes(e)), testo: str(o['testo']) ?? '', icona: str(o['icona']) ?? id.slice(0, 2).toUpperCase() });
    }
    out.condizioni = cond;
  }
  if (d['condizione_a_zero'] !== undefined) {
    const c = d['condizione_a_zero'];
    if (c === null) out.condizioneAZero = null;
    else if (typeof c === 'string' && out.condizioni.some((x) => x.id === c)) out.condizioneAZero = c;
    else errori.push(`combattimento.condizione_a_zero: «${String(c)}» non è tra le condizioni`);
  }
  const fine = ogg(d['fine']);
  if (fine && typeof fine['morale'] === 'boolean') out.fine.morale = fine['morale'];
  return out;
}
