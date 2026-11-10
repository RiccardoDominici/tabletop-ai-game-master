/**
 * Arbitro delle prove deterministico, senza modello (docs/prove.md, «Arbitro a regole»): il default
 * del profilo tutto locale (config/predefinita.yaml → arbitro_prove: regole) e la riserva quando il
 * modello manca, è lento o fallisce. Secondo il principio di Riccardo: il modello piccolo ha meno
 * responsabilità possibile; che cosa si tira lo decidono parole e dati.
 *
 * In ordine:
 * 1. ATTACCO: un verbo d'attacco, o un'arma della scheda dell'autore, e un bersaglio con la scheda nominato;
 * 2. AIUTO: «aiuto / do una mano a / copro» + un PG che agisce nello stesso turno;
 * 3. PROVA DELLA SCENA: il suo `quando` ha almeno due radici in comune con l'azione (i nomi non
 *    contano), o una delle sue `parole`;
 * 4. ABILITÀ O MOSSA per parole chiave: la tabella dell'SRD (prove/parole-chiave.ts), oppure per un set non SRD
 *    `parole_chiave` di regole.yaml, le `parole` dei passi del manuale legati a un'abilità o mossa
 *    (`per:`), e il `quando` delle mosse;
 * 5. nient'altro → nessun tiro (banale: parlare, chiedere, guardare).
 * La CD la decide il Motore: dati della scena, scheda del PNG (Influenzare), o la scala predefinita.
 *
 * Le parole (verbi d'attacco, d'aiuto, abilità) sono quelle della lingua dei contenuti:
 * lingue/<codice>/prove.yaml, sezione `parole` (docs/lingue.md).
 */
import { normalizza } from '../azioni/regole';
import type { Abilita } from '../campagna/regole-srd';
import type { Campagna } from '../campagna/tipi';
import { radici } from '../narrazione/privato';
import { nomiDeiPng, pngNominati } from '../repertorio/pertinenza';
import type { RegoleCampagna } from '../regole/tipi';
import type { DecisioneProva, DecisioneRegole } from './tipi';
import { paroleProve } from './lingua';
import { candidatiSet, candidatiSrd } from './parole-chiave';

const SOCIALI: ReadonlySet<Abilita> = new Set(['persuasione', 'inganno', 'intimidire', 'intrattenere']);

export interface IngressoClassificatore {
  campagna: Campagna;
  /** Il set del manuale, o null per l'SRD 5.2. */
  regole: RegoleCampagna | null;
  /** Armi di un personaggio (id), per l'attacco. */
  armi: (id: string) => string[];
  haScheda: (id: string) => boolean;
  /** Prove della scena: id, `quando` e le sue `parole` facoltative. */
  proveScena: Array<{ id: string; quando: string; parole?: string[] }>;
  /** Le altre azioni del turno (per «aiuto»). */
  altre: Array<{ id: string; autore: string }>;
}

function vuota(id: string): DecisioneProva & { mossa: string | null } {
  return { id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null, mossa: null };
}

/** Quante radici del testo stanno in `quando` (i nomi dei personaggi non contano: dicono a chi, non che cosa). */
function somiglianza(testo: string, quando: string, nomi: ReadonlySet<string> = new Set()): number {
  const a = radici(testo, nomi);
  return [...radici(quando, nomi)].filter((r) => a.has(r)).length;
}

/** Le parole dei nomi di PG e PNG (e dei loro soprannomi), da non contare come contenuto. */
function paroleDeiNomi(c: Campagna): Set<string> {
  const out = new Set<string>();
  for (const parole of nomiDeiPng(c).values()) for (const p of parole) for (const w of p.split(/\s+/)) out.add(w);
  for (const p of c.pg) for (const w of normalizza(p.nome).split(/\s+/)) out.add(w);
  return out;
}

function haParola(testo: string, parole: readonly string[]): boolean {
  const a = radici(testo);
  return parole.some((p) => [...radici(p)].some((r) => a.has(r)));
}

export function classificaARegole(az: { id: string; testo: string; autore: string }, i: IngressoClassificatore): DecisioneProva | DecisioneRegole {
  const d = vuota(az.id);
  const t = normalizza(az.testo);
  const nomiPg = new Map(i.campagna.pg.map((p) => [p.id, [p.nome, p.nome.split(/\s+/)[0] ?? ''].map(normalizza).filter((x) => x.length > 2)]));
  const nominati = [...pngNominati(az.testo, nomiDeiPng(i.campagna))].filter((id) => id !== az.autore);
  const png = nominati.find((id) => i.haScheda(id)) ?? null;
  const s = i.regole?.sistema ?? null;

  // 1. Attacco: un verbo d'attacco o un'arma della scheda, contro chi ha una scheda.
  const armi = i.armi(az.autore);
  const arma = armi.find((a) => a.split('_').some((p) => p.length > 3 && t.includes(p))) ?? null;
  const parole = paroleProve();
  if (png && (parole.attacco.test(t) || arma)) return { ...d, tipo: 'attacco', bersaglio: png, arma } as DecisioneProva;
  // 2. Aiuto a un altro PG del turno (prima della prova della scena: chi aiuta non tira).
  if (parole.aiuto.test(t)) {
    for (const o of i.altre) {
      if (o.autore === az.autore) continue;
      const nomi = nomiPg.get(o.autore) ?? [];
      if (nomi.some((n) => new RegExp(`\\b${n}\\b`).test(t))) return { ...d, tipo: 'aiuto', aiuta: o.id } as DecisioneProva;
    }
  }
  // 3. Prova della scena.
  const nomi = paroleDeiNomi(i.campagna);
  const ps = i.proveScena
    .map((p) => ({ p, n: somiglianza(az.testo, p.quando, nomi) + (p.parole?.length && haParola(az.testo, p.parole) ? 2 : 0) }))
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n)[0];
  if (ps) return { ...d, tipo: 'prova', prova_scena: ps.p.id, bersaglio: png } as DecisioneProva;
  // 4. Abilità o mossa per parole chiave.
  if (!s) {
    const abilita = candidatiSrd(az.testo, 1)[0];
    if (!abilita) return d as DecisioneProva;
    if (SOCIALI.has(abilita) && !png) return d as DecisioneProva; // parlare a nessuno in particolare
    if (png && (abilita === 'furtivita' || abilita === 'rapidita_di_mano')) return { ...d, tipo: 'contrapposta', abilita, bersaglio: png, abilita_bersaglio: 'percezione' } as DecisioneProva;
    return { ...d, tipo: 'prova', abilita, bersaglio: png } as DecisioneProva;
  }
  const id = candidatiSet(az.testo, i.regole!, 1)[0] ?? null;
  if (!id) return d as DecisioneRegole;
  if (s.mosse.some((m) => m.id === id)) return { ...d, tipo: 'prova', mossa: id, bersaglio: png } as DecisioneRegole;
  if (s.abilita.some((a) => a.id === id)) return { ...d, tipo: 'prova', abilita: id, bersaglio: png } as DecisioneRegole;
  return { ...d, tipo: 'prova', caratteristica: id, bersaglio: png } as DecisioneRegole;
}
