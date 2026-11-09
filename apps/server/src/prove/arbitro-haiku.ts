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
import type Anthropic from '@anthropic-ai/sdk';
import type { Logger } from '../logger';
import { calcolaCosto, type Costo, type UsoToken } from '../llm/costi';
import { ABILITA, CARATTERISTICHE, DIFFICOLTA, type Abilita, type Caratteristica, type Difficolta } from '../campagna/regole-srd';
import type { ArbitroProve, AzioneDaClassificare, DecisioneProva, IngressoArbitroProve, TipoDecisione } from './tipi';

export const PROMPT_ARBITRO_PROVE = `Sei l'arbitro delle prove di una partita di D&D 5e (regole SRD 5.2) dal vivo, in italiano. I giocatori scrivono sul telefono cosa fanno i loro personaggi (PG). Per ogni azione decidi se serve un tiro di dado, e quale. Non narri e non tiri i dadi: lo fa il programma, con le schede. Rispondi solo con il JSON richiesto.

Regola d'oro (SRD 5.2): si tira solo quando l'esito è incerto E il fallimento conta, cioè cambierebbe qualcosa nella storia. Altrimenti niente tiro.

Tipi:
- «nessuna»: azione banale o sicura: camminare, guardarsi intorno, parlare, chiedere, rispondere, salutare, mangiare, prendere o dare un oggetto a portata, aspettare. Anche chiedere qualcosa a un PNG è «nessuna»: risponde il PNG, secondo la sua scheda. Anche chiedere a un PNG ciò che vuole già fare.
- «impossibile»: non può riuscire come scritta, nemmeno con un tiro fortunato: volare senza mezzi, sollevare una casa, convincere qualcuno di ciò che va contro il suo desiderio più forte, agire su chi non c'è o su ciò che non esiste in scena. Niente tiro. In «motivo» il perché, una frase per il giocatore, dentro la finzione.
- «prova»: tentativo incerto e rischioso: arrampicarsi, saltare, forzare, scassinare, cercare ciò che è nascosto, seguire tracce, ricordare un sapere, curare una ferita, calmare un animale, convincere, ingannare, intimidire o incantare un PNG che esita (bersaglio = quel PNG). Scegli l'abilità; se nessuna abilità va bene, solo la caratteristica.
- «salvezza»: il PG reagisce a un pericolo che lo colpisce: una trappola, un crollo, un veleno, una caduta, una magia, il freddo.
- «attacco»: il PG colpisce o tira a una creatura con un'arma o a mani nude. bersaglio = id della creatura; arma = id di un'arma della scheda del PG, la più vicina a ciò che ha scritto (vuoto = a mani nude).
- «contrapposta»: il PG agisce contro l'attenzione o la forza di un PNG che gli si oppone: nascondersi o passare non visto davanti a lui (furtivita contro percezione), sfilargli qualcosa di dosso (rapidita_di_mano contro percezione), afferrarlo, spingerlo, trattenerlo (atletica contro atletica). bersaglio = id; abilita_bersaglio = l'abilità del PNG che si oppone. Convincere, mentire, minacciare o incantare un PNG NON è contrapposta: è «prova» con persuasione, inganno, intimidire o intrattenere.
- «aiuto»: il PG aiuta un altro PG proprio nell'azione che quello sta facendo (azione Aiutare). In «aiuta» l'id di quell'azione. Non tira.

Difficoltà, solo per «prova» e «salvezza»:
- se l'azione è una delle «Prove della scena», metti il suo id in prova_scena: la CD la sa il programma;
- se è persuasione, inganno, intimidire o intrattenere verso un PNG, lascia vuota la difficoltà: la CD viene dalla scheda del PNG;
- altrimenti scegli dalla scala: molto_facile, facile, media, difficile, molto_difficile, quasi_impossibile. Nel dubbio, media.

Vantaggio o svantaggio: solo per una circostanza chiara, scritta nell'azione o nella narrazione: un attrezzo adatto, una posizione migliore, la sorpresa, il buio, la fretta, una ferita, un bersaglio a terra o legato, tirare con un'arma a distanza mentre un nemico ti sta già addosso in mischia (la narrazione lo dice). Nel dubbio, nessuno. L'atteggiamento dei PNG e l'aiuto dei compagni li conta già il programma: non metterli.

«motivo»: solo con vantaggio, svantaggio o «impossibile»; al massimo dieci parole per i giocatori, senza segreti. In tutti gli altri casi stringa vuota.

Reazione: se l'azione scatena l'attacco di un PNG contro chi la fa (attaccare un PNG ostile e armato che resta in piedi, aggredirlo, fallire mentre gli si passa davanti di nascosto), indica il PNG in reazione_png e in reazione_quando «sempre» o «se_fallisce». Altrimenti reazione_png vuoto e reazione_quando «nessuna». Mai reazioni di PNG amichevoli o indifferenti, salvo una lotta già in corso.

Le azioni PRIVATA si giudicano come le altre. Usa solo id degli elenchi. Un campo che non serve è una stringa vuota.`;

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
  return `- id ${a.id} · ${a.nome} (${a.autore})${a.privata ? ' · PRIVATA' : ''}: «${a.testo}»`;
}

/** Il messaggio utente della chiamata (esportato per i test e per valutare il prompt). */
export function messaggioProve(i: IngressoArbitroProve): string {
  return [
    `Ultima narrazione:\n${i.narrazione || '(nessuna)'}`,
    `Personaggi:\n${i.personaggi || '(nessuno)'}`,
    `Prove della scena (id · quando · prova):\n${i.proveScena || '(nessuna)'}`,
    i.altre.length ? `Altre azioni dei PG in questo turno:\n${i.altre.map(riga).join('\n')}` : '',
    `Azioni da giudicare:\n${i.azioni.map(riga).join('\n')}`,
    'Per ogni azione da giudicare: serve un tiro, e quale?',
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
    private readonly client: () => Anthropic,
    private readonly o: { modello: string; log: Logger; onMisura?: (m: MisuraProve) => void; maxTokens?: number },
  ) {}

  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    const t0 = performance.now();
    const risposta = await this.client().messages.create({
      model: this.o.modello,
      // ~110 token per decisione; margine per qualche azione insieme.
      max_tokens: this.o.maxTokens ?? 300 + 160 * i.azioni.length,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA_PROVE as unknown as Record<string, unknown> } },
      system: [
        { type: 'text', text: PROMPT_ARBITRO_PROVE },
        { type: 'text', text: `Scena (parte pubblica):\n${i.scena}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: messaggioProve(i) }],
    });
    const ms = Math.round(performance.now() - t0);
    const costo = calcolaCosto(this.o.modello, risposta.usage as unknown as UsoToken);
    this.o.onMisura?.({ ms, azioni: i.azioni.length, costo });
    if (risposta.stop_reason !== 'end_turn') throw new Error(`arbitro delle prove: stop_reason ${String(risposta.stop_reason)}`);
    const testo = risposta.content.find((b) => b.type === 'text');
    if (!testo || testo.type !== 'text') throw new Error('arbitro delle prove: risposta senza testo');
    const r = JSON.parse(testo.text) as { decisioni: DecisioneGrezza[] };
    const ids = new Set(i.azioni.map((a) => a.id));
    const out: Record<string, DecisioneProva> = {};
    for (const g of r.decisioni ?? []) if (ids.has(g.id)) out[g.id] = daGrezza(g);
    this.o.log.debug({ ms, azioni: i.azioni.map((a) => a.id), decisioni: out }, 'prove: decisioni dell\'arbitro');
    return out;
  }
}
