/**
 * Arbitro delle prove per un set di regole non SRD (docs/regole.md, «Arbitro»): come
 * prove/arbitro-haiku.ts, ma col vocabolario del manuale. Nel prompt di sistema (in cache) vanno la
 * regola d'oro, il riassunto del set e gli elenchi di caratteristiche, abilità, mosse e difficoltà;
 * nel messaggio solo i passi del manuale pertinenti alle azioni (ricerca per parole chiave, pochi
 * righi), così il contesto di Haiku resta piccolo.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { Logger } from '../logger';
import { calcolaCosto, type UsoToken } from '../llm/costi';
import { cercaEstratti, testoEstratto } from '../regole/estratti';
import type { RegoleCampagna } from '../regole/tipi';
import { messaggioProve, type MisuraProve } from './arbitro-haiku';
import type { ArbitroProve, DecisioneRegole, IngressoArbitroProve, TipoDecisione } from './tipi';

const TIPI: readonly TipoDecisione[] = ['nessuna', 'impossibile', 'prova', 'attacco', 'aiuto'];

/** Prompt di sistema per il set (stabile per tutta la sessione: va in cache). */
export function promptArbitroRegole(r: RegoleCampagna): string {
  const s = r.sistema;
  const elenco = (xs: Array<{ id: string; nome: string }>): string => xs.map((x) => `${x.id} (${x.nome})`).join(', ') || '(nessuna)';
  return [
    `Sei l'arbitro delle prove di una partita di gioco di ruolo dal vivo, in italiano, con le regole del manuale «${s.nome}». I giocatori scrivono cosa fanno i loro personaggi (PG). Per ogni azione decidi se serve un tiro e quale, con il vocabolario di questo manuale. Non narri e non tiri i dadi: lo fa il programma. Rispondi solo con il JSON richiesto.`,
    `Regola d'oro: si tira solo quando l'esito è incerto E il fallimento conta. Azioni banali o sicure (parlare, chiedere, guardarsi intorno, camminare): «nessuna». Ciò che non può riuscire come scritto: «impossibile», con il motivo in una frase. Un PG che aiuta l'azione di un altro: «aiuto», con l'id di quell'azione in «aiuta». Colpire una creatura: «attacco», con bersaglio e arma della scheda. Tutto il resto che è incerto e rischioso: «prova».`,
    s.mosse.length
      ? `Mosse del manuale: se l'azione è una di queste, metti il suo id in «mossa» (la statistica la sa il programma):\n${s.mosse.map((m) => `- ${m.id} (${m.nome}): ${m.quando}`).join('\n')}`
      : '',
    `Per una «prova» senza mossa scegli l'abilità o, se nessuna va bene, la caratteristica.\n- Caratteristiche: ${elenco(s.caratteristiche)}\n- Abilità: ${elenco(s.abilita)}\n- Difficoltà: ${elenco(s.difficolta)} (nel dubbio ${s.difficoltaPredefinita})`,
    s.sociale.nota ? `Prove sociali nel manuale: ${s.sociale.nota}` : '',
    s.vantaggio.tipo !== 'nessuno' ? 'Vantaggio o svantaggio: solo per una circostanza chiara scritta nell\'azione o nella narrazione; «motivo» in poche parole, senza segreti. Altrimenti «nessuno» e motivo vuoto.' : 'Il manuale non ha vantaggio o svantaggio: «nessuno».',
    'Reazione: se l\'azione scatena l\'attacco di un PNG ostile contro chi la fa, il PNG in reazione_png e «sempre» o «se_fallisce» in reazione_quando; altrimenti vuoto e «nessuna».',
    `Riassunto delle regole:\n${r.riassunto.slice(0, 2500)}`,
    'Usa solo id degli elenchi. Un campo che non serve è una stringa vuota.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function schemaRegole(r: RegoleCampagna): Record<string, unknown> {
  const s = r.sistema;
  const ids = (xs: Array<{ id: string }>): string[] => ['', ...xs.map((x) => x.id)];
  return {
    type: 'object',
    properties: {
      decisioni: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tipo: { type: 'string', enum: [...TIPI] },
            mossa: { type: 'string', enum: ids(s.mosse) },
            abilita: { type: 'string', enum: ids(s.abilita) },
            caratteristica: { type: 'string', enum: ids(s.caratteristiche) },
            difficolta: { type: 'string', enum: ids(s.difficolta) },
            bersaglio: { type: 'string' },
            arma: { type: 'string' },
            prova_scena: { type: 'string' },
            vantaggio: { type: 'string', enum: ['nessuno', 'vantaggio', 'svantaggio'] },
            motivo: { type: 'string' },
            aiuta: { type: 'string' },
            reazione_png: { type: 'string' },
            reazione_quando: { type: 'string', enum: ['nessuna', 'sempre', 'se_fallisce'] },
          },
          required: ['id', 'tipo', 'mossa', 'abilita', 'caratteristica', 'difficolta', 'bersaglio', 'arma', 'prova_scena', 'vantaggio', 'motivo', 'aiuta', 'reazione_png', 'reazione_quando'],
          additionalProperties: false,
        },
      },
    },
    required: ['decisioni'],
    additionalProperties: false,
  };
}

type Grezza = Record<'id' | 'tipo' | 'mossa' | 'abilita' | 'caratteristica' | 'difficolta' | 'bersaglio' | 'arma' | 'prova_scena' | 'vantaggio' | 'motivo' | 'aiuta' | 'reazione_png' | 'reazione_quando', string>;
const v = (x: string | undefined): string | null => (x && x.trim() ? x.trim() : null);

export function daGrezzaRegole(g: Grezza, r: RegoleCampagna): DecisioneRegole {
  const s = r.sistema;
  const tra = (x: string, xs: Array<{ id: string }>): string | null => (xs.some((y) => y.id === x) ? x : null);
  const png = v(g.reazione_png);
  const quando = g.reazione_quando === 'sempre' || g.reazione_quando === 'se_fallisce' ? g.reazione_quando : null;
  return {
    id: g.id,
    tipo: (TIPI as readonly string[]).includes(g.tipo) ? (g.tipo as TipoDecisione) : 'nessuna',
    mossa: tra(g.mossa, s.mosse),
    abilita: tra(g.abilita, s.abilita),
    caratteristica: tra(g.caratteristica, s.caratteristiche),
    difficolta: tra(g.difficolta, s.difficolta),
    abilita_bersaglio: null,
    bersaglio: v(g.bersaglio),
    arma: v(g.arma),
    prova_scena: v(g.prova_scena),
    vantaggio: g.vantaggio === 'vantaggio' || g.vantaggio === 'svantaggio' ? g.vantaggio : null,
    motivo: (g.motivo ?? '').trim(),
    aiuta: v(g.aiuta),
    reazione: png && quando ? { png, condizione: quando } : null,
  };
}

/** I passi del manuale pertinenti alle azioni da giudicare (al massimo tre, pochi righi ciascuno). */
export function passiPerAzioni(r: RegoleCampagna, testi: string[]): string {
  const visti = new Map<string, string>();
  for (const t of testi) for (const e of cercaEstratti(r.estratti, t, 2)) if (!visti.has(e.id) && visti.size < 3) visti.set(e.id, testoEstratto(e, 8));
  return [...visti.values()].join('\n\n');
}

export class ArbitroRegoleHaiku implements ArbitroProve<DecisioneRegole> {
  private readonly sistema: string;
  private readonly schema: Record<string, unknown>;
  constructor(
    private readonly regole: RegoleCampagna,
    private readonly client: () => Anthropic,
    private readonly o: { modello: string; log: Logger; onMisura?: (m: MisuraProve) => void },
  ) {
    this.sistema = promptArbitroRegole(regole);
    this.schema = schemaRegole(regole);
  }

  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneRegole>> {
    const t0 = performance.now();
    const passi = passiPerAzioni(this.regole, i.azioni.map((a) => a.testo));
    const messaggio = `${passi ? `Passi del manuale pertinenti:\n${passi}\n\n` : ''}${messaggioProve(i)}`;
    const risposta = await this.client().messages.create({
      model: this.o.modello,
      max_tokens: 300 + 160 * i.azioni.length,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: this.schema } },
      system: [
        { type: 'text', text: this.sistema },
        { type: 'text', text: `Scena (parte pubblica):\n${i.scena}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: messaggio }],
    });
    const ms = Math.round(performance.now() - t0);
    this.o.onMisura?.({ ms, azioni: i.azioni.length, costo: calcolaCosto(this.o.modello, risposta.usage as unknown as UsoToken) });
    if (risposta.stop_reason !== 'end_turn') throw new Error(`arbitro delle regole: stop_reason ${String(risposta.stop_reason)}`);
    const testo = risposta.content.find((b) => b.type === 'text');
    if (!testo || testo.type !== 'text') throw new Error('arbitro delle regole: risposta senza testo');
    const ids = new Set(i.azioni.map((a) => a.id));
    const out: Record<string, DecisioneRegole> = {};
    for (const g of (JSON.parse(testo.text) as { decisioni: Grezza[] }).decisioni ?? []) if (ids.has(g.id)) out[g.id] = daGrezzaRegole(g, this.regole);
    this.o.log.debug({ ms, passi: passi.length, decisioni: out }, 'prove: decisioni dell’arbitro (set del manuale)');
    return out;
  }
}
