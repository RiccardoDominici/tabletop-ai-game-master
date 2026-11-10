/**
 * Arbitro delle prove per un set di regole non SRD (docs/regole.md, «Arbitro»): come
 * prove/arbitro-haiku.ts, ma col vocabolario del manuale. Nel prompt di sistema (in cache) vanno la
 * regola d'oro, il riassunto del set e gli elenchi di caratteristiche, abilità, mosse e difficoltà;
 * nel messaggio solo i passi del manuale pertinenti alle azioni (ricerca per parole chiave, pochi
 * righi), così il contesto di Haiku resta piccolo.
 */
import type { Logger } from '../logger';
import { sommaCosti } from '../llm/costi';
import type { ModelloLinguaggio, RispostaModello } from '../llm/modello';
import { chiediStrutturato } from '../llm/strutturato';
import { cercaEstratti, testoEstratto } from '../regole/estratti';
import type { RegoleCampagna } from '../regole/tipi';
import { testo } from '../lingua';
import { messaggioProve, scenaPerArbitro, type MisuraProve } from './arbitro-haiku';
import type { ArbitroProve, DecisioneRegole, IngressoArbitroProve, TipoDecisione } from './tipi';

const TIPI: readonly TipoDecisione[] = ['nessuna', 'impossibile', 'prova', 'attacco', 'aiuto'];

/**
 * Prompt di sistema per il set (stabile per tutta la sessione: va in cache), a pezzi dal pacchetto della
 * lingua dei contenuti (testi-prove.yaml, prove.arbitro_regole.*): alcuni pezzi ci sono solo se il set li ha.
 */
export function promptArbitroRegole(r: RegoleCampagna): string {
  const s = r.sistema;
  const elenco = (xs: Array<{ id: string; nome: string }>): string => xs.map((x) => `${x.id} (${x.nome})`).join(', ') || testo('prove.arbitro.nessuna');
  return [
    testo('prove.arbitro_regole.intro', { nome: s.nome }),
    testo('prove.arbitro_regole.regola_oro'),
    s.mosse.length ? testo('prove.arbitro_regole.mosse', { mosse: s.mosse.map((m) => `- ${m.id} (${m.nome}): ${m.quando}`).join('\n') }) : '',
    testo('prove.arbitro_regole.prova', { caratteristiche: elenco(s.caratteristiche), abilita: elenco(s.abilita), difficolta: elenco(s.difficolta), predefinita: s.difficoltaPredefinita }),
    s.sociale.nota ? testo('prove.arbitro_regole.sociale', { nota: s.sociale.nota }) : '',
    testo(s.vantaggio.tipo !== 'nessuno' ? 'prove.arbitro_regole.vantaggio' : 'prove.arbitro_regole.senza_vantaggio'),
    testo('prove.arbitro_regole.reazione'),
    testo('prove.arbitro_regole.riassunto', { riassunto: r.riassunto.slice(0, 2500) }),
    testo('prove.arbitro_regole.finale'),
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
    private readonly modello: () => ModelloLinguaggio,
    private readonly o: { modello: string; log: Logger; onMisura?: (m: MisuraProve) => void },
  ) {
    this.sistema = promptArbitroRegole(regole);
    this.schema = schemaRegole(regole);
  }

  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneRegole>> {
    const t0 = performance.now();
    const passi = passiPerAzioni(this.regole, i.azioni.map((a) => a.testo));
    const messaggio = `${passi ? testo('prove.arbitro_regole.passi', { passi }) : ''}${messaggioProve(i)}`;
    const risposte: RispostaModello[] = [];
    let r: { decisioni: Grezza[] };
    try {
      r = await chiediStrutturato<{ decisioni: Grezza[] }>(
        this.modello(),
        {
          sistema: [{ testo: this.sistema }, { testo: scenaPerArbitro(i.scena), cache: true }],
          messaggi: [{ ruolo: 'user', testo: messaggio }],
          maxTokens: 300 + 160 * i.azioni.length,
        },
        { schema: this.schema, cosa: 'arbitro delle regole', log: this.o.log, onRisposta: (x) => risposte.push(x) },
      );
    } finally {
      if (risposte.length) this.o.onMisura?.({ ms: Math.round(performance.now() - t0), azioni: i.azioni.length, costo: risposte.map((x) => x.costo).reduce(sommaCosti) });
    }
    const ms = Math.round(performance.now() - t0);
    const ids = new Set(i.azioni.map((a) => a.id));
    const out: Record<string, DecisioneRegole> = {};
    for (const g of r.decisioni ?? []) if (ids.has(g.id)) out[g.id] = daGrezzaRegole(g, this.regole);
    this.o.log.debug({ ms, passi: passi.length, decisioni: out }, 'prove: decisioni dell’arbitro (set del manuale)');
    return out;
  }
}
