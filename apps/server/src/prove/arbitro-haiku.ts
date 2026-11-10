/**
 * Arbitro delle prove con Claude Haiku 5.5 e uscita strutturata (come l'arbitro delle azioni,
 * azioni/arbitro-haiku.ts: `output_config.format` con `json_schema`, thinking spento, effort basso,
 * prompt di sistema e scena pubblica in cache).
 *
 * Decide soltanto CHE COSA si tira (o se non si tira): tipo di tiro, caratteristica e abilità,
 * bersaglio, arma, la prova dei dati della scena o la difficoltà della scala SRD, vantaggio o
 * svantaggio con il motivo, l'aiuto, la reazione di un PNG. Numeri, dadi ed esiti li fa il Motore
 * (prove/risolutore.ts), che scarta anche ciò che non torna (id inesistenti, armi che il PG non ha).
 *
 * Una chiamata può classificare più azioni insieme (alla chiusura, quelle rimaste senza giudizio);
 * di solito ne classifica una, appena inviata, così alla chiusura la decisione è già pronta.
 */
import type { Logger } from '../logger';
import { sommaCosti, type Costo } from '../llm/costi';
import type { ModelloLinguaggio, RispostaModello } from '../llm/modello';
import { chiediStrutturato } from '../llm/strutturato';
import { ABILITA, CARATTERISTICHE, DIFFICOLTA, type Abilita, type Caratteristica, type Difficolta } from '../campagna/regole-srd';
import { testo } from '../lingua';
import { promptProve } from './lingua';
import type { ArbitroProve, AzioneDaClassificare, DecisioneProva, IngressoArbitroProve, TipoDecisione } from './tipi';

/**
 * Il prompt di sistema dell'arbitro, nella lingua dei contenuti: prompts/<lingua>/arbitro-prove.md.
 * Gli id dello schema (tipi, abilità, difficoltà) restano gli stessi in ogni lingua.
 */
export function promptArbitroProve(): string {
  return promptProve('arbitro-prove');
}

const TIPI: readonly TipoDecisione[] = ['nessuna', 'impossibile', 'prova', 'salvezza', 'attacco', 'contrapposta', 'aiuto'];

export const SCHEMA_PROVE = {
  type: 'object',
  properties: {
    decisioni: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tipo: { type: 'string', enum: [...TIPI] },
          abilita: { type: 'string', enum: ['', ...ABILITA] },
          caratteristica: { type: 'string', enum: ['', ...CARATTERISTICHE] },
          bersaglio: { type: 'string' },
          arma: { type: 'string' },
          prova_scena: { type: 'string' },
          difficolta: { type: 'string', enum: ['', ...Object.keys(DIFFICOLTA)] },
          abilita_bersaglio: { type: 'string', enum: ['', ...ABILITA] },
          vantaggio: { type: 'string', enum: ['nessuno', 'vantaggio', 'svantaggio'] },
          motivo: { type: 'string' },
          aiuta: { type: 'string' },
          reazione_png: { type: 'string' },
          reazione_quando: { type: 'string', enum: ['nessuna', 'sempre', 'se_fallisce'] },
        },
        required: ['id', 'tipo', 'abilita', 'caratteristica', 'bersaglio', 'arma', 'prova_scena', 'difficolta', 'abilita_bersaglio', 'vantaggio', 'motivo', 'aiuta', 'reazione_png', 'reazione_quando'],
        additionalProperties: false,
      },
    },
  },
  required: ['decisioni'],
  additionalProperties: false,
} as const;

/** La decisione come esce dallo schema (stringhe vuote = niente). */
export interface DecisioneGrezza {
  id: string;
  tipo: string;
  abilita: string;
  caratteristica: string;
  bersaglio: string;
  arma: string;
  prova_scena: string;
  difficolta: string;
  abilita_bersaglio: string;
  vantaggio: string;
  motivo: string;
  aiuta: string;
  reazione_png: string;
  reazione_quando: string;
}

const vuoto = (s: string | undefined): string | null => (s && s.trim() ? s.trim() : null);

/** Dalla forma dello schema ai tipi del Motore (valori fuori elenco → null). */
export function daGrezza(g: DecisioneGrezza): DecisioneProva {
  const tipo = (TIPI as readonly string[]).includes(g.tipo) ? (g.tipo as TipoDecisione) : 'nessuna';
  const abil = (ABILITA as readonly string[]).includes(g.abilita) ? (g.abilita as Abilita) : null;
  const car = (CARATTERISTICHE as readonly string[]).includes(g.caratteristica) ? (g.caratteristica as Caratteristica) : null;
  const diff = g.difficolta in DIFFICOLTA ? (g.difficolta as Difficolta) : null;
  const abilB = (ABILITA as readonly string[]).includes(g.abilita_bersaglio) ? (g.abilita_bersaglio as Abilita) : null;
  const png = vuoto(g.reazione_png);
  const quando = g.reazione_quando === 'sempre' || g.reazione_quando === 'se_fallisce' ? g.reazione_quando : null;
  return {
    id: g.id,
    tipo,
    abilita: abil,
    caratteristica: car,
    bersaglio: vuoto(g.bersaglio),
    arma: vuoto(g.arma),
    prova_scena: vuoto(g.prova_scena),
    difficolta: diff,
    abilita_bersaglio: abilB,
    vantaggio: g.vantaggio === 'vantaggio' || g.vantaggio === 'svantaggio' ? g.vantaggio : null,
    motivo: (g.motivo ?? '').trim(),
    aiuta: vuoto(g.aiuta),
    reazione: png && quando ? { png, condizione: quando } : null,
  };
}

function riga(a: AzioneDaClassificare): string {
  return testo('prove.arbitro.riga', { id: a.id, nome: a.nome, autore: a.autore, privata: a.privata ? testo('prove.arbitro.privata') : '', testo: a.testo });
}

/** La scena pubblica come blocco di sistema (in cache) per gli arbitri. */
export function scenaPerArbitro(scena: string): string {
  return testo('prove.arbitro.scena', { scena });
}

/** Il messaggio utente della chiamata (esportato per i test e per valutare il prompt). */
export function messaggioProve(i: IngressoArbitroProve): string {
  const nessuna = testo('prove.arbitro.nessuna');
  return [
    testo('prove.arbitro.narrazione', { narrazione: i.narrazione || nessuna }),
    testo('prove.arbitro.personaggi', { personaggi: i.personaggi || testo('prove.arbitro.nessuno') }),
    testo('prove.arbitro.prove_scena', { prove: i.proveScena || nessuna }),
    i.altre.length ? testo('prove.arbitro.altre', { azioni: i.altre.map(riga).join('\n') }) : '',
    testo('prove.arbitro.da_giudicare', { azioni: i.azioni.map(riga).join('\n') }),
    testo('prove.arbitro.domanda'),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export interface MisuraProve {
  ms: number;
  azioni: number;
  costo: Costo;
}

export class ArbitroProveHaiku implements ArbitroProve {
  constructor(
    private readonly modello: () => ModelloLinguaggio,
    private readonly o: { modello: string; log: Logger; onMisura?: (m: MisuraProve) => void; maxTokens?: number },
  ) {}

  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    const t0 = performance.now();
    const risposte: RispostaModello[] = [];
    let r: { decisioni: DecisioneGrezza[] };
    try {
      r = await chiediStrutturato<{ decisioni: DecisioneGrezza[] }>(
        this.modello(),
        {
          sistema: [{ testo: promptArbitroProve() }, { testo: scenaPerArbitro(i.scena), cache: true }],
          messaggi: [{ ruolo: 'user', testo: messaggioProve(i) }],
          // ~110 token per decisione; margine per qualche azione insieme.
          maxTokens: this.o.maxTokens ?? 300 + 160 * i.azioni.length,
        },
        { schema: SCHEMA_PROVE as unknown as Record<string, unknown>, cosa: 'arbitro delle prove', log: this.o.log, onRisposta: (x) => risposte.push(x) },
      );
    } finally {
      if (risposte.length) this.o.onMisura?.({ ms: Math.round(performance.now() - t0), azioni: i.azioni.length, costo: risposte.map((x) => x.costo).reduce(sommaCosti) });
    }
    const ms = Math.round(performance.now() - t0);
    const ids = new Set(i.azioni.map((a) => a.id));
    const out: Record<string, DecisioneProva> = {};
    for (const g of r.decisioni ?? []) if (ids.has(g.id)) out[g.id] = daGrezza(g);
    this.o.log.debug({ ms, azioni: i.azioni.map((a) => a.id), decisioni: out }, 'prove: decisioni dell\'arbitro');
    return out;
  }
}
