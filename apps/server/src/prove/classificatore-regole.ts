/**
 * Arbitro delle prove deterministico, senza modello (docs/prove.md, «Arbitro a regole»): il default
 * del profilo tutto locale (config/predefinita.yaml → arbitro_prove: regole) e la riserva quando il
 * modello manca, è lento o fallisce. Secondo il principio di Riccardo: il modello piccolo ha meno
 * responsabilità possibile; che cosa si tira lo decidono parole e dati.
 *
 * Si guarda ciò che il PG FA: il parlato (fra virgolette, o dopo «dico agli altri:») conta solo per le
 * prove sociali (prove/parole-testo.ts, senzaParlato). Le parole si confrontano intere. In ordine:
 * 1. ATTACCO: un verbo d'attacco, o un'arma della scheda usata («tiro con la fionda»: armaUsata), e un
 *    bersaglio con la scheda nominato in ciò che fa;
 * 2. AIUTO: «aiuto / do una mano a / copro» + un PG che agisce nello stesso turno;
 * 3. PROVA DELLA SCENA: almeno due parole di contenuto del suo `quando` (i nomi non contano), o una delle
 *    sue `parole` e una del `quando`; se il `quando` nomina un PNG, l'azione lo deve nominare; due prove
 *    a pari merito → nel dubbio niente;
 * 4. ABILITÀ O MOSSA per parole chiave: la tabella dell'SRD (prove/parole-chiave.ts), oppure per un set non SRD
 *    `parole_chiave` di regole.yaml, le `parole` dei passi del manuale legati a un'abilità o mossa
 *    (`per:`), e il `quando` delle mosse; due id a pari merito → niente. L'abilità con cui si attacca
 *    (`mischia`, `distanza` del set) è un attacco: senza un bersaglio con la scheda, niente tiro;
 * 5. nient'altro → nessun tiro (banale: parlare, chiedere, guardare).
 *
 * Una prova SOCIALE (persuadere, intimidire, il Carisma del set) chiede un PNG a cui il PG si rivolge
 * («Berta, …», «chiedo a Berta») o la parola sociale in ciò che fa («convinco Bertoldo»), e non solo
 * domande: chiedere è gratis. Nella e2e finale del 10 novembre (profilo A) 14 carte su 35 erano assurde:
 * «Forzare una porta» per «gli stringo la spalla», Carisma per «guardo la chiave che Berta stringe».
 * Nel dubbio, niente tiro: meglio un tiro in meno che uno assurdo.
 * La CD la decide il Motore: dati della scena, scheda del PNG (Influenzare), o la scala predefinita.
 *
 * Le parole (verbi d'attacco, d'aiuto, abilità) sono quelle della lingua dei contenuti:
 * lingue/<codice>/prove.yaml, sezione `parole` (docs/lingue.md).
 */
import { normalizza } from '../azioni/regole';
import type { Abilita } from '../campagna/regole-srd';
import type { Campagna } from '../campagna/tipi';
import { nomiDeiPng, pngNominati } from '../repertorio/pertinenza';
import type { RegoleCampagna } from '../regole/tipi';
import type { DecisioneProva, DecisioneRegole } from './tipi';
import { paroleProve } from './lingua';
import { candidatiSrd, punteggiSet } from './parole-chiave';
import { armaUsata, haVoce, inComune, paroleDi, pngRivolti, senzaParlato, soloDomande } from './parole-testo';

/** Le abilità SRD sociali: chiedono un PNG a cui rivolgersi. */
export const ABILITA_SOCIALI: ReadonlySet<Abilita> = new Set(['persuasione', 'inganno', 'intimidire', 'intrattenere']);
const SOCIALI = ABILITA_SOCIALI;

/** Una prova della scena SRD è sociale con un'abilità sociale, o col Carisma da solo. */
export function provaSocialeSrd(p: { abilita: string | null; caratteristica: string | null }): boolean {
  return p.abilita ? SOCIALI.has(p.abilita as Abilita) : p.caratteristica === 'carisma';
}

export interface IngressoClassificatore {
  campagna: Campagna;
  /** Il set del manuale, o null per l'SRD 5.2. */
  regole: RegoleCampagna | null;
  /** Armi di un personaggio (id), per l'attacco. */
  armi: (id: string) => string[];
  haScheda: (id: string) => boolean;
  /** Prove della scena: id, `quando`, le sue `parole` facoltative, e se è sociale (Carisma, persuadere…). */
  proveScena: Array<{ id: string; quando: string; parole?: string[]; sociale?: boolean }>;
  /** Le altre azioni del turno (per «aiuto»). */
  altre: Array<{ id: string; autore: string }>;
  /**
   * Set del manuale: le abilità con cui si attacca (`mischia`, `distanza`), dalle armi delle schede. Un id
   * così trovato per parole chiave non è una prova: gli attacchi li decide il gesto d'attacco (passo 1).
   */
  attacchiPer?: ReadonlySet<string>;
}

function vuota(id: string): DecisioneProva & { mossa: string | null } {
  return { id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null, mossa: null };
}

/** Le parole dei nomi di PG e PNG (e dei loro soprannomi), da non contare come contenuto. */
function paroleDeiNomi(c: Campagna): Set<string> {
  const out = new Set<string>();
  for (const parole of nomiDeiPng(c).values()) for (const p of parole) for (const w of paroleDi(p)) out.add(w);
  for (const p of c.pg) for (const w of paroleDi(p.nome)) out.add(w);
  return out;
}

/** Il migliore di una lista ordinata, se non è a pari merito col secondo (nel dubbio, niente). */
function unico<T>(xs: ReadonlyArray<{ x: T; n: number }>): T | null {
  if (!xs.length) return null;
  return xs.length > 1 && xs[1]!.n === xs[0]!.n ? null : xs[0]!.x;
}

/**
 * Step 1 alone (attack): an attack gesture or a weapon of the sheet that is USED, against an NPC with a sheet named in
 * what the PC does. Deterministic: the Engine applies it after ANY arbiter (Haiku included), because in the second
 * pass of the final end-to-end run Haiku gave «no roll» to «Lancio il dardo incantato contro il goblin che sta
 * arrivando», and the narrator killed the goblin with no damage. null = not such a clear attack.
 */
export function attaccoDiRegole(az: { id: string; testo: string; autore: string }, i: IngressoClassificatore): DecisioneProva | null {
  const fatti = senzaParlato(az.testo);
  const bersaglio = [...pngNominati(fatti, nomiDeiPng(i.campagna))].find((id) => id !== az.autore && i.haScheda(id)) ?? null;
  if (!bersaglio) return null;
  const arma = i.armi(az.autore).find((a) => armaUsata(fatti, [a])) ?? null;
  return paroleProve().attacco.test(normalizza(fatti)) || arma ? ({ ...vuota(az.id), tipo: 'attacco', bersaglio, arma } as DecisioneProva) : null;
}

export function classificaARegole(az: { id: string; testo: string; autore: string }, i: IngressoClassificatore): DecisioneProva | DecisioneRegole {
  const d = vuota(az.id);
  // Ciò che il PG fa, senza il parlato; il testo intero vale solo per le prove sociali.
  const fatti = senzaParlato(az.testo);
  const t = normalizza(fatti);
  const nomiPng = nomiDeiPng(i.campagna);
  const nomiPg = new Map(i.campagna.pg.map((p) => [p.id, [p.nome, p.nome.split(/\s+/)[0] ?? ''].map(normalizza).filter((x) => x.length > 2)]));
  const conScheda = (ids: Iterable<string>): string | null => [...ids].find((id) => id !== az.autore && i.haScheda(id)) ?? null;
  const png = conScheda(pngNominati(az.testo, nomiPng));
  const bersaglio = conScheda(pngNominati(fatti, nomiPng));
  const rivolti = pngRivolti(az.testo, nomiPng);
  const soloChiede = soloDomande(az.testo);
  /** Una prova sociale verso `p`: rivolto a lui, o la parola sociale in ciò che fa; mai solo domande. */
  const socialeVerso = (p: string | null, parolaNeiFatti: boolean): boolean => !!p && !soloChiede && (rivolti.has(p) || parolaNeiFatti);
  const s = i.regole?.sistema ?? null;

  // 1. Attacco: un verbo d'attacco o un'arma usata, contro chi ha una scheda ed è nominato in ciò che fa.
  const attacco = attaccoDiRegole(az, i);
  if (attacco) return attacco;
  const parole = paroleProve();
  // 2. Aiuto a un altro PG del turno (prima della prova della scena: chi aiuta non tira).
  if (parole.aiuto.test(t)) {
    for (const o of i.altre) {
      if (o.autore === az.autore) continue;
      const nomi = nomiPg.get(o.autore) ?? [];
      if (nomi.some((n) => new RegExp(`\\b${n}\\b`).test(t))) return { ...d, tipo: 'aiuto', aiuta: o.id } as DecisioneProva;
    }
  }
  // 3. Prova della scena: parole intere del `quando` e delle sue `parole`; il PNG del `quando`, se c'è.
  const nomi = paroleDeiNomi(i.campagna);
  const ps = i.proveScena
    .map((p) => {
      const testo = p.sociale ? az.testo : fatti;
      const parolaGiusta = !!p.parole?.length && p.parole.some((v) => haVoce(paroleDi(testo), v));
      // Una sua parola e una del `quando`, oppure due del `quando`: una parola sola («piano») non basta.
      const comuni = inComune(testo, p.quando, nomi);
      const n = comuni + (parolaGiusta ? 2 : 0);
      const abbastanza = comuni >= 2 || (parolaGiusta && comuni >= 1);
      const chi = [...pngNominati(p.quando, nomiPng)];
      // Il PNG della prova: quello del `quando`; senza, per una prova sociale quello nominato (non per le altre).
      const nominato = chi.length ? (chi.find((id) => pngNominati(az.testo, nomiPng).has(id)) ?? null) : p.sociale ? png : null;
      // Sociale: la sua parola detta come gesto («offro il pane a Grosso») vale come rivolgersi a lui.
      const nelFatto = !!p.parole?.some((v) => haVoce(paroleDi(fatti), v));
      const ok = abbastanza && (!chi.length || !!nominato) && (!p.sociale || socialeVerso(nominato, nelFatto));
      return { x: { p, nominato }, n: ok ? n : 0 };
    })
    .filter((y) => y.n > 0)
    .sort((a, b) => b.n - a.n);
  const scelta = unico(ps);
  if (scelta) return { ...d, tipo: 'prova', prova_scena: scelta.p.id, bersaglio: scelta.nominato } as DecisioneProva;
  if (ps.length) return d as DecisioneProva;
  // 4. Abilità o mossa per parole chiave.
  if (!s) {
    // Le abilità sociali dal testo intero (il parlato è il loro gesto), le altre da ciò che fa.
    const sociale = candidatiSrd(az.testo, 5).find((a) => SOCIALI.has(a)) ?? null;
    if (sociale && socialeVerso(png, candidatiSrd(fatti, 5).includes(sociale))) return { ...d, tipo: 'prova', abilita: sociale, bersaglio: png } as DecisioneProva;
    const abilita = candidatiSrd(fatti, 5).find((a) => !SOCIALI.has(a)) ?? null;
    if (!abilita) return d as DecisioneProva;
    if (bersaglio && (abilita === 'furtivita' || abilita === 'rapidita_di_mano')) return { ...d, tipo: 'contrapposta', abilita, bersaglio, abilita_bersaglio: 'percezione' } as DecisioneProva;
    return { ...d, tipo: 'prova', abilita, bersaglio } as DecisioneProva;
  }
  const idSociali = new Set([s.sociale.caratteristica, s.sociale.abilita].filter((x): x is string => !!x));
  const nelTesto = punteggiSet(az.testo, i.regole!).filter(([id]) => idSociali.has(id));
  const neiFatti = punteggiSet(fatti, i.regole!);
  const sociale = nelTesto[0]?.[0] ?? null;
  if (sociale && socialeVerso(png, neiFatti.some(([id]) => id === sociale))) return conId(d, s, sociale, png);
  const id = unico(neiFatti.filter(([x]) => !idSociali.has(x)).map(([x, n]) => ({ x, n })));
  if (!id) return d as DecisioneRegole;
  // L'abilità di un'arma è un attacco, e gli attacchi li decide il passo 1 (un gesto d'attacco o l'arma
  // usata, contro chi ha una scheda): arrivati qui c'è solo la parola («spada in mano»), niente tiro.
  if (i.attacchiPer?.has(id)) return d as DecisioneRegole;
  return conId(d, s, id, bersaglio);
}

/** La decisione per un id del set: mossa, abilità o caratteristica. */
function conId(d: ReturnType<typeof vuota>, s: RegoleCampagna['sistema'], id: string, bersaglio: string | null): DecisioneRegole {
  if (s.mosse.some((m) => m.id === id)) return { ...d, tipo: 'prova', mossa: id, bersaglio } as DecisioneRegole;
  if (s.abilita.some((a) => a.id === id)) return { ...d, tipo: 'prova', abilita: id, bersaglio } as DecisioneRegole;
  return { ...d, tipo: 'prova', caratteristica: id, bersaglio } as DecisioneRegole;
}
