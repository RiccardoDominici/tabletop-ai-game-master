/**
 * Arbitro delle prove MINIMO (docs/provider.md), per i modelli locali piccoli. Misurato il 10/11/2026
 * sulla 4730: l'arbitro completo (prove/arbitro-haiku.ts) con Qwen3 4B impiegava 15–36 s a chiamata
 * (prompt lungo, quattordici campi da scrivere), troppo per i 4 s che la regia gli dà alla chiusura.
 *
 * Qui il lavoro grosso lo fanno le regole, e al modello resta una scelta piccola:
 * 1. parole chiave → abilità candidate (al più tre) e «attacco» se l'azione colpisce qualcuno;
 * 2. nessuna candidata → «nessuna», senza chiamare il modello (parlare, chiedere, guardarsi intorno);
 * 3. altrimenti un prompt corto: l'azione, le candidate come enum, la difficoltà; risposta in JSON;
 * 4. il modello non risponde in tempo o risponde male → ripiego a regole: la prova con l'abilità più
 *    probabile (difficoltà media; per le abilità d'influenza verso un PNG la CD la dà la sua scheda),
 *    oppure l'attacco al PNG nominato con l'arma nominata.
 * Bersaglio, arma e reazione li deduce il codice dalle righe dei personaggi (prove/motore.ts).
 */
import type { Logger } from '../logger';
import { ABILITA_INFLUENZA, type Abilita } from '../campagna/regole-srd';
import { sommaCosti } from '../llm/costi';
import type { ModelloLinguaggio, RispostaModello } from '../llm/modello';
import { chiediStrutturato } from '../llm/strutturato';
import { daGrezza, type DecisioneGrezza, type MisuraProve } from './arbitro-haiku';
import type { ArbitroProve, AzioneDaClassificare, DecisioneProva, IngressoArbitroProve } from './tipi';

/** Radici italiane → abilità SRD, nell'ordine di probabilità (la prima che combacia vince il ripiego). */
const PAROLE: ReadonlyArray<[RegExp, Abilita]> = [
  [/\b(convinc|persuad|prego|supplic|tratt[oa]|contratt|rassicur)/, 'persuasione'],
  [/\b(ment[oi]|mentir|ingann|bluff|finge|fingo|invent)/, 'inganno'],
  [/\b(minacc|intimid|spavent|ringhi)/, 'intimidire'],
  [/\b(cant[oa]|suon[oa]|ball[oa]|recit|esib)/, 'intrattenere'],
  [/\b(nascond|furtiv|soppiatto|sgattaiol|non vist|in silenzio|di nascosto|pedin)/, 'furtivita'],
  [/\b(scassin|serratur|grimaldell|borseggi|sfil|ruba|rubo|destrezza di mano)/, 'rapidita_di_mano'],
  [/\b(arrampic|scal[oa]|salt[oa]|nuot|sollev|forz[oa]|sfond|spingo|spinge|trascin|afferr|lott)/, 'atletica'],
  [/\b(equilibr|acrobaz|capriol|schiv|rotol)/, 'acrobazia'],
  [/\b(cerc[oa]|frug|ispezion|esamin|indag|studio|analizz|rovist)/, 'indagare'],
  [/\b(ascolt|osserv|scrut|guardo bene|tendo l'orecchio|annus|sbirci)/, 'percezione'],
  [/\b(tracc|impront|orme|segu[oi] le|sentiero|orient)/, 'sopravvivenza'],
  [/\b(cur[oa]|fascia|medic|ferit|febbr|malat|sintom|polso)/, 'medicina'],
  [/\b(calm[oa]|accarezz|cane|cavall|mul[oaei]\b|animal|ammans)/, 'addestrare_animali'],
  [/\b(intu|sincer|capire se ment|leggo nel|lo guardo negli occhi)/, 'intuizione'],
  [/\b(ricord|storia|legg?end|antic|stemma)/, 'storia'],
  [/\b(preghier|preg[oa] |santo|sacr|benedi|rito|religio)/, 'religione'],
  [/\b(magi|incant|rune|arcan|pozion)/, 'arcano'],
  [/\b(erb[ae]|pianta|fungh|veleno|natura|bosco|neve fresca)/, 'natura'],
];
const ATTACCO = /\b(attacc|colpisc|colpir|ferisc|accoltell|pugnal|spar[oa]|tir[oa] (una|un|la|il) (freccia|dardo|quadrello|coltello)|con la balestra|con l'arco|con la spada|uccid|ammazz|mi scaglio)/;
const DIFF = ['molto_facile', 'facile', 'media', 'difficile', 'molto_difficile'] as const;

export function candidatiAbilita(testo: string, max = 3): Abilita[] {
  const t = testo.toLowerCase();
  const out: Abilita[] = [];
  for (const [re, a] of PAROLE) if (re.test(t) && !out.includes(a)) out.push(a);
  return out.slice(0, max);
}

interface Personaggio {
  id: string;
  nome: string;
  armi: string[];
  ostile: boolean;
}

/** Le righe «- id = Nome · armi: a, b · verso i PG: …» di prove/motore.ts (PG e PNG in scena). */
export function leggiPersonaggi(righe: string): { pg: Map<string, Personaggio>; png: Personaggio[] } {
  const pg = new Map<string, Personaggio>();
  const png: Personaggio[] = [];
  for (const r of righe.split('\n')) {
    const m = /^- ((?:pg|png)_[\w-]+) = ([^·]+?)(?: · (.*))?$/.exec(r.trim());
    if (!m) continue;
    const resto = m[3] ?? '';
    const armi = /armi: ([^·]+)/.exec(resto)?.[1]?.split(',').map((s) => s.trim()).filter((s) => s && !/^nessuna/.test(s)) ?? [];
    const p = { id: m[1]!, nome: m[2]!.trim(), armi, ostile: /ostil/.test(resto) };
    if (p.id.startsWith('pg_')) pg.set(p.id, p);
    else png.push(p);
  }
  return { pg, png };
}

/** Il PNG nominato nell'azione (per nome o per id), o null. */
export function pngNominato(testo: string, png: readonly Personaggio[]): Personaggio | null {
  const t = testo.toLowerCase();
  return png.find((p) => t.includes(p.id.replace(/^png_/, '')) || p.nome.toLowerCase().split(/\s+/).some((n) => n.length >= 3 && new RegExp(`\\b${n}\\b`).test(t))) ?? null;
}

function grezza(id: string, x: Partial<DecisioneGrezza>): DecisioneGrezza {
  return { id, tipo: 'nessuna', abilita: '', caratteristica: '', bersaglio: '', arma: '', prova_scena: '', difficolta: '', abilita_bersaglio: '', vantaggio: 'nessuno', motivo: '', aiuta: '', reazione_png: '', reazione_quando: 'nessuna', ...x };
}

export interface OpzioniArbitroMinimo {
  log: Logger;
  onMisura?: (m: MisuraProve) => void;
  /** Tempo massimo per azione prima del ripiego a regole (la regia ne dà 4 alla chiusura). */
  attesaMs?: number;
}

export class ArbitroProveMinimo implements ArbitroProve {
  constructor(
    private readonly modello: () => ModelloLinguaggio,
    private readonly o: OpzioniArbitroMinimo,
  ) {}

  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    const personaggi = leggiPersonaggi(i.personaggi);
    const out: Record<string, DecisioneProva> = {};
    for (const a of i.azioni) out[a.id] = await this.una(a, personaggi);
    return out;
  }

  /** La decisione di un'azione: regole prima, il modello solo se serve scegliere, ripiego a regole. */
  private async una(a: AzioneDaClassificare, p: ReturnType<typeof leggiPersonaggi>): Promise<DecisioneProva> {
    const t0 = performance.now();
    const testo = a.testo.toLowerCase();
    const candidate = candidatiAbilita(testo);
    const bersaglio = pngNominato(testo, p.png);
    const attacco = ATTACCO.test(testo) && !!bersaglio;
    // Regola prima del modello: nessuna parola da prova e nessun attacco → niente tiro.
    if (!candidate.length && !attacco) return daGrezza(grezza(a.id, { tipo: 'nessuna' }));
    const armi = p.pg.get(a.autore)?.armi ?? [];
    const arma = armi.find((x) => testo.includes(x.replace(/_/g, ' '))) ?? armi[0] ?? '';
    const decisione = (tipo: string, abilita: string, difficolta: string): DecisioneProva => {
      if (tipo === 'attacco' && bersaglio) {
        return daGrezza(grezza(a.id, { tipo: 'attacco', bersaglio: bersaglio.id, arma, ...(bersaglio.ostile && bersaglio.armi.length ? { reazione_png: bersaglio.id, reazione_quando: 'sempre' } : {}) }));
      }
      if (tipo !== 'prova' || !abilita) return daGrezza(grezza(a.id, { tipo: 'nessuna' }));
      // Influenza verso un PNG: la CD la dà la sua scheda (difficoltà vuota).
      const influenza = ABILITA_INFLUENZA.has(abilita as Abilita) && bersaglio;
      return daGrezza(grezza(a.id, { tipo: 'prova', abilita, ...(influenza ? { bersaglio: bersaglio.id } : { difficolta: (DIFF as readonly string[]).includes(difficolta) ? difficolta : 'media' }) }));
    };
    const ripiego = (): { tipo: string; abilita: string; difficolta: string } => (attacco ? { tipo: 'attacco', abilita: '', difficolta: '' } : { tipo: 'prova', abilita: candidate[0]!, difficolta: 'media' });
    const tipi = ['nessuna', 'prova', ...(attacco ? ['attacco'] : [])];
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['tipo', 'abilita', 'difficolta'],
      properties: { tipo: { type: 'string', enum: tipi }, abilita: { type: 'string', enum: ['', ...candidate] }, difficolta: { type: 'string', enum: ['', ...DIFF] } },
    };
    const sistema =
      'Arbitro di D&D 5e. Si tira solo se l’esito è incerto e il fallimento conta. tipo: "nessuna" (banale o sicura), "prova" (con una delle abilità date)' +
      (attacco ? ', "attacco" (colpisce qualcuno)' : '') +
      '. difficolta solo per "prova": molto_facile, facile, media, difficile, molto_difficile (nel dubbio media). Rispondi solo JSON, es. {"tipo":"prova","abilita":"atletica","difficolta":"media"}.';
    const risposte: RispostaModello[] = [];
    try {
      const r = await chiediStrutturato<{ tipo: string; abilita: string; difficolta: string }>(
        this.modello(),
        { sistema: [{ testo: sistema, cache: true }], messaggi: [{ ruolo: 'user', testo: `Azione di ${a.nome}: «${a.testo}»\nAbilità possibili: ${candidate.join(', ') || '(nessuna)'}` }], maxTokens: 40, signal: AbortSignal.timeout(this.o.attesaMs ?? 3000) },
        { schema, cosa: 'arbitro delle prove (minimo)', log: this.o.log, onRisposta: (x) => risposte.push(x), ripiego },
      );
      return decisione(r.tipo, r.abilita, r.difficolta);
    } catch (err) {
      // Tempo scaduto o interrotto: ripiego a regole, mai un turno senza decisione.
      this.o.log.warn({ azione: a.id, err: (err as Error).message }, 'prove: arbitro minimo senza risposta in tempo, ripiego a regole');
      const x = ripiego();
      return decisione(x.tipo, x.abilita, x.difficolta);
    } finally {
      const ms = Math.round(performance.now() - t0);
      if (risposte.length) this.o.onMisura?.({ ms, azioni: 1, costo: risposte.map((x) => x.costo).reduce(sommaCosti) });
      this.o.log.debug({ azione: a.id, ms, candidate, attacco }, 'prove: decisione dell’arbitro minimo');
    }
  }
}
