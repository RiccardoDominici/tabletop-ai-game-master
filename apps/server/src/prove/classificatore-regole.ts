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
 *    sue `parole` e una del `quando`; and the intent: one of its `parole`, or the action word of the `quando`
 *    (intentoDelQuando: nouns alone are not enough); se il `quando` nomina un PNG, l'azione lo deve nominare; due prove
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
 * La CD la decide il Motore: dati della scena, scheda del PNG (Influenzare), o la scala del set, from its default rung
 * moved by what makes the action easier or harder (prove/difficolta.ts).
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

const parole0 = paroleProve;
import { candidatiSrd, punteggiSet } from './parole-chiave';
import { armaUsata, haVoce, inComune, intentoDelQuando, paroleDi, pngRivolti, senzaParlato, soloDomande } from './parole-testo';
import { difficoltaDa, scalaDifficolta, segnaliDifficolta } from './difficolta';

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
  /**
   * The sentences of the last narration and of the scene's public description: a hard condition there that touches
   * the action makes a check harder (prove/difficolta.ts). Absent = only the action's own words count.
   */
  scena?: readonly string[];
  /**
   * The scene's minion (campagna/gregari.ts) an action names by its words («la sentinella»), the first one standing;
   * null = none. Absent = the campaign has no minions.
   */
  gregario?: (fatti: string) => string | null;
  /** The scene has no creature with stats standing (no NPC with a sheet, no minion): an attack there hits nobody. */
  nessunNemico?: boolean;
  /**
   * In a fight: the enemy a PC's own attack with no target named goes to (its last target still standing, else the
   * first enemy standing in the turn order), or null. Absent = no fight.
   */
  bersaglioImplicito?: (autore: string) => string | null;
  /** Le altre azioni del turno (per «aiuto»). */
  altre: Array<{ id: string; autore: string }>;
  /**
   * Set del manuale: le abilità con cui si attacca (`mischia`, `distanza`), dalle armi delle schede. Un id
   * così trovato per parole chiave non è una prova: gli attacchi li decide il gesto d'attacco (passo 1).
   */
  attacchiPer?: ReadonlySet<string>;
  /**
   * A manual's set with powers (regole/poteri.ts): the powers a PC can call by name — the spells on its sheet (spent
   * ones too, so the Engine refuses them with a clear line), its items, the class actions anyone has — with the words
   * that call each (its `parole` and its name). Absent = no powers.
   */
  poteriDi?: (autore: string) => ReadonlyArray<{ id: string; parole: readonly string[] }>;
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
 * A short go-on in the action's first clause, in a fight («Ancora!», «Pugnale ancora», «Ancora contro il goblin»):
 * `attacco_ancora` of the pack opening the clause, after at most one word that is one of the PC's weapons (its id's
 * words), and then nothing, or only words that aim it (`attacco_verso`: «contro», «sul»), weapon words and the words of
 * ONE target with stats. Round 6, CM T11: «Pugnale ancora, il goblin si gira verso di me» got no roll; round 7, CA T11
 * the same action still got none, because «il goblin» named later sent it down the named-target path, which wanted an
 * attack verb. `bersaglio`: the target named in the go-on's own clause, or null for a bare go-on (the PC's last
 * target: a name in a later clause is not where the blow goes, «Ancora! Bertoldo, scappa»). null = no go-on
 * («Ancora non capisco…», «Fiume ancora»).
 */
function attaccoAncora(
  fatti: string,
  armi: readonly string[],
  bersaglioDi: (testo: string) => string | null,
  nomeDi: (bersaglio: string) => ReadonlySet<string>,
): { bersaglio: string | null; arma: string | null } | null {
  const primo = normalizza(fatti.split(/[,;:.!?…]/)[0] ?? '').replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
  const parole = paroleProve();
  const m = parole.attaccoAncora.exec(primo);
  if (!m) return null;
  const [, parola, coda] = m;
  const pezzi = (a: string): string[] => a.split(/[_\s]+/).map(normalizza);
  const arma = parola ? (armi.find((a) => pezzi(a).includes(parola)) ?? null) : null;
  if (parola && !arma) return null;
  if (!coda) return { bersaglio: null, arma };
  const bersaglio = bersaglioDi(coda);
  if (!bersaglio) return null;
  const diArmi = new Set(armi.flatMap(pezzi));
  // Each word left must aim, be a weapon's, or be the target's: a word of one of its names, or one naming it alone.
  const suo = nomeDi(bersaglio);
  const resto = coda.split(' ').filter((w) => !parole.attaccoVerso.has(w) && !diArmi.has(w) && !suo.has(w) && bersaglioDi(w) !== bersaglio);
  return resto.length ? null : { bersaglio, arma: arma ?? armi.find((a) => pezzi(a).some((w) => coda.split(' ').includes(w))) ?? null };
}

/**
 * Step 1 alone (attack): an attack gesture or a weapon of the sheet that is USED, against an NPC with a sheet named in
 * what the PC does. Deterministic: the Engine applies it after ANY arbiter (Haiku included), because in the second
 * pass of the final end-to-end run Haiku gave «no roll» to «Lancio il dardo incantato contro il goblin che sta
 * arrivando», and the narrator killed the goblin with no damage. null = not such a clear attack.
 * In order: a named target (an NPC with a sheet, by name or alias, or a minion of the scene) with an attack verb
 * (`attacco`, or in a fight the first-person `attacco_mio`) or a weapon used; then, in a fight only, a go-on (`attaccoAncora`)
 * and the PC's own attack in the first person with no target named, both at the PC's last target.
 */
/**
 * Every match of the PC's attack words in the text is negated: a negation of the pack (`attacco_negazioni`) at most
 * three words before it, with only short words (clitics: «lo», «gli») between. «Non lo colpisco ancora, aspetto la
 * risposta» is no attack (final round, attempt 6, CM T17 and CA T14: the last-target rule rolled one). false = there
 * is an attack word that is not negated, or none at all.
 */
export function attaccoNegato(t: string, ...espressioni: RegExp[]): boolean {
  const neg = paroleProve().attaccoNegazioni;
  if (!neg.size) return false;
  let n = 0;
  for (const re of espressioni) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    for (let m = g.exec(t); m; m = g.exec(t)) {
      if (m[0].length === 0) {
        g.lastIndex++;
        continue;
      }
      n++;
      const prima = t.slice(0, m.index).split(/[\s,;:.!?]+/).filter(Boolean).slice(-3);
      const k = prima.map((w) => neg.has(w)).lastIndexOf(true);
      if (k < 0 || prima.slice(k + 1).some((w) => w.length > 3)) return false;
    }
  }
  return n > 0;
}

export function attaccoDiRegole(az: { id: string; testo: string; autore: string }, i: IngressoClassificatore): DecisioneProva | null {
  const fatti = senzaParlato(az.testo);
  const t = normalizza(fatti);
  const armi = i.armi(az.autore);
  const nomi = nomiDeiPng(i.campagna);
  // A named NPC with a sheet, or else a minion of the scene named by its type's words (C5: «colpisco la sentinella»).
  const bersaglioDi = (testo: string): string | null => [...pngNominati(testo, nomi)].find((id) => id !== az.autore && i.haScheda(id)) ?? i.gregario?.(testo) ?? null;
  const nominato = bersaglioDi(fatti);
  // The weapon used whose name the action says most fully: «la spada corta alle spalle» is the sneak attack's line,
  // not the plain «spada corta» that comes first on the sheet.
  const parole = paroleDi(fatti);
  const quante = (a: string): number => paroleDi(a).filter((w) => parole.includes(w)).length;
  const arma = armi.filter((a) => armaUsata(fatti, [a])).sort((x, y) => quante(y) - quante(x))[0] ?? null;
  const attacco = (bersaglio: string, conArma: string | null): DecisioneProva => ({ ...vuota(az.id), tipo: 'attacco', bersaglio, arma: conArma }) as DecisioneProva;
  // The first-person words count with a named target only in a fight: «Tiro ancora la corda verso Ruggero» outside one
  // is no attack (attacco_mio has «tiro ancora»), and an attack would open a fight.
  // A negated attack verb is no attack («Non lo colpisco ancora»), whatever else the sentence names.
  if (attaccoNegato(t, paroleProve().attaccoMio, paroleProve().attacco)) return null;
  if (nominato && (paroleProve().attacco.test(t) || (!!i.bersaglioImplicito && paroleProve().attaccoMio.test(t)) || arma)) return attacco(nominato, arma);
  if (!i.bersaglioImplicito) return null;
  // In a fight, a go-on with no verb: at the target named in its own clause, else at the PC's last target.
  const ancora = attaccoAncora(fatti, armi, bersaglioDi, (id) => new Set((nomi.get(id) ?? []).flatMap((n) => n.split(/\s+/))));
  if (ancora) {
    const bersaglio = ancora.bersaglio ?? i.bersaglioImplicito(az.autore);
    return bersaglio ? attacco(bersaglio, arma ?? ancora.arma) : null;
  }
  // In a fight, the PC's own attack in the first person with no target named («lo colpisco ancora», «carico quello al
  // centro»): its last target, so the attack is rolled (round 5: «nessun tiro» for five declared attacks). Only the
  // first-person words (`attacco_mio`): «il goblin mi colpisce» is a player's claim, not an attack.
  if (nominato || !paroleProve().attaccoMio.test(t)) return null;
  const bersaglio = i.bersaglioImplicito(az.autore);
  return bersaglio ? attacco(bersaglio, arma) : null;
}

/**
 * Step 0 (a manual's set with powers): a power of the PC named in what it does («lancio il dardo incantato contro il
 * goblin», «bevo la pozione», «fascio le ferite di Livia»), by one of its words, whole. Its target: an NPC with a sheet
 * named there, or a PC named there; none = the power's own data decides (prove/poteri.ts). Deterministic: the Engine
 * applies it after ANY arbiter, before the attack step, so a spell is never rolled as an unlimited weapon. Two powers
 * named at once → nothing (in doubt, no roll). null = no power named.
 */
export function potereDiRegole(az: { id: string; testo: string; autore: string }, i: IngressoClassificatore): DecisioneRegole | null {
  const poteri = i.poteriDi?.(az.autore) ?? [];
  if (!poteri.length) return null;
  const fatti = senzaParlato(az.testo);
  const parole = paroleDi(fatti);
  const nominati = poteri.filter((p) => p.parole.some((v) => haVoce(parole, v)));
  if (nominati.length !== 1) return null;
  const nomi = nomiDeiPng(i.campagna);
  const png = [...pngNominati(fatti, nomi)].find((id) => id !== az.autore && i.haScheda(id)) ?? i.gregario?.(fatti) ?? null;
  const t = normalizza(fatti);
  const pgNominato = i.campagna.pg.find((p) => p.id !== az.autore && [p.nome, p.nome.split(/\s+/)[0] ?? ''].map(normalizza).some((n) => n.length > 2 && new RegExp(`\\b${n}\\b`).test(t)))?.id ?? null;
  return { ...vuota(az.id), tipo: 'potere', potere: nominati[0]!.id, bersaglio: png ?? pgNominato } as DecisioneRegole;
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

  // 0. A power of the PC named in what it does (a manual's set with powers): before the attack step.
  const potere = potereDiRegole(az, i);
  if (potere) return potere;
  // 1. Attacco: un verbo d'attacco o un'arma usata, contro chi ha una scheda ed è nominato in ciò che fa.
  const attacco = attaccoDiRegole(az, i);
  if (attacco) return attacco;
  // An attack gesture at no creature the data knows (no NPC named, no minion of the scene): an attack on nobody, so
  // the resolver tells the narrator not to invent an enemy to hit (C5: «colpisco la sentinella» with no sentry).
  // Only when the scene has nobody with stats standing: «colpisco quello in fondo» next to an enemy stays a doubt (no
  // roll, nothing said), it does not become «there is nobody».
  if (i.nessunNemico && !pngNominati(fatti, nomiPng).size && (parole0().attacco.test(t) || i.armi(az.autore).some((a) => armaUsata(fatti, [a])))) {
    return { ...d, tipo: 'attacco', bersaglio: null } as DecisioneProva;
  }
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
      // The intent must match too: one of the check's own `parole`, or the action word of its `quando` (shared nouns alone
      // rolled Perception for «Resto vicino al camino» against «un PG guarda la corda … vicino al camino»).
      const intento = parolaGiusta || intentoDelQuando(testo, p.quando, nomi);
      const abbastanza = intento && (comuni >= 2 || (parolaGiusta && comuni >= 1));
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
  // 4. Abilità o mossa per parole chiave. The difficulty, when no data sets it, follows what makes the action easier
  // or harder, in its own words and in the scene (prove/difficolta.ts), on the set's ladder.
  const segnali = segnaliDifficolta(fatti, i.scena ?? [], nomi);
  const difficolta = difficoltaDa(scalaDifficolta(s), segnali.gradini);
  if (!s) {
    // Le abilità sociali dal testo intero (il parlato è il loro gesto), le altre da ciò che fa.
    const sociale = candidatiSrd(az.testo, 5).find((a) => SOCIALI.has(a)) ?? null;
    if (sociale && socialeVerso(png, candidatiSrd(fatti, 5).includes(sociale))) return { ...d, tipo: 'prova', abilita: sociale, bersaglio: png } as DecisioneProva;
    // A routine move (climbing onto, running across) rolls only when a signal makes it hard: no chance of meaningful
    // failure, no roll (SRD 5.2, «When to roll»).
    const abilita = candidatiSrd(fatti, 5).find((a) => !SOCIALI.has(a)) ?? (segnali.gradini > 0 ? (abilitaSeDifficile(fatti) as Abilita | null) : null);
    if (!abilita) return d as DecisioneProva;
    if (bersaglio && (abilita === 'furtivita' || abilita === 'rapidita_di_mano')) return { ...d, tipo: 'contrapposta', abilita, bersaglio, abilita_bersaglio: 'percezione' } as DecisioneProva;
    return { ...d, tipo: 'prova', abilita, bersaglio, difficolta: difficolta as DecisioneProva['difficolta'] } as DecisioneProva;
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
  return { ...conId(d, s, id, bersaglio), difficolta };
}

/** The SRD skill of a routine move that rolls only when something makes it hard (lingue/<code>/prove.yaml). */
function abilitaSeDifficile(fatti: string): string | null {
  const t = normalizza(fatti);
  return paroleProve().seDifficile.find(({ re }) => re.test(t))?.abilita ?? null;
}

/** La decisione per un id del set: mossa, abilità o caratteristica. */
function conId(d: ReturnType<typeof vuota>, s: RegoleCampagna['sistema'], id: string, bersaglio: string | null): DecisioneRegole {
  if (s.mosse.some((m) => m.id === id)) return { ...d, tipo: 'prova', mossa: id, bersaglio } as DecisioneRegole;
  if (s.abilita.some((a) => a.id === id)) return { ...d, tipo: 'prova', abilita: id, bersaglio } as DecisioneRegole;
  return { ...d, tipo: 'prova', caratteristica: id, bersaglio } as DecisioneRegole;
}
