/**
 * L'annuncio deterministico del lettore minimo (llm/minimo.ts): al tavolo nessuno legge il telefono degli
 * altri, quindi prima dell'esito una frase breve dice cosa fa quel PG. Il modello piccolo non la scrive
 * (nelle misure inventava parole): la compone il Motore dal nome del PG e dalla prima frase breve di ciò
 * che il giocatore ha scritto, senza aggiungere niente.
 *
 * Le regole sono della lingua dei contenuti (lingue/<codice>/motore.yaml, sezione `annuncio`). The player's words are
 * attributed, never asserted in the narrator's voice: «Ida dice: «Guardo la scatolina».», «Ginestra says: "I open the
 * door."». A pack may turn the first person into the third (`terza_persona` not empty, `prima_persona`: subject
 * removed, verb conjugated, pronouns turned), but neither shipped pack does since round 4 of the coherence layer
 * (docs/coerenza.md): «Ginestra opens the door.» tells the act as done before any roll.
 */
import { campoCoppie, campoElenco, campoNumero, campoRegex, campoTesto, regole, type Sezione } from '../lingua/motore';

export interface PrimaPersona {
  /** Soggetto e verbo fusi all'inizio («i'm» → «is»). */
  contrazioni: Array<[RegExp, string]>;
  soggetto: RegExp;
  avverbi: RegExp | null;
  nonVerbi: RegExp | null;
  invariabili: ReadonlySet<string>;
  irregolari: ReadonlyMap<string, string>;
  passato: RegExp | null;
  desinenze: Array<[RegExp, string]>;
  coordinata: RegExp | null;
  senzaSoggetto: RegExp | null;
  pronomi: Array<[RegExp, string]>;
}

interface RegoleAnnuncio {
  citazione: string;
  /** The neutral frame for what is not speech («{nome}: «{frase}».»); empty = always the citation. */
  neutra: string;
  /** Words addressed to someone in the announced sentence (a second person): then the citation with «dice». */
  parlato: RegExp | null;
  /** A question opening with an interrogative: words to someone. */
  domanda: RegExp | null;
  terza: string;
  /** A PC out of play: «{nome} non agisce.». */
  fuori: string;
  /** A clause that states the world or the PC's state (a claim), not what the PC does. */
  affermazione: RegExp | null;
  /** A clause whose subject is someone else («Il goblin mi tira la lancia»). */
  terzaParte: RegExp | null;
  /** A clause that is the PC's own act in the first person («la paro», «io carico»). */
  attoDelPg: RegExp | null;
  /** The PC's own first-person verb anywhere in a clause («La fisarmonica la tiro fuori io»). */
  attoInterno: RegExp | null;
  /** Mai un annuncio vuoto: «{nome} agisce.». */
  vuoto: string;
  minContenuto: number;
  nonContenuto: RegExp | null;
  nonFinali: RegExp | null;
  congiunzioni: RegExp | null;
  abbreviazioni: ReadonlySet<string>;
  risate: RegExp | null;
  intercalari: RegExp | null;
  virgolette: RegExp | null;
  maxParole: number;
  /** The first-person turn of the language; used only when `terza` is not empty (else: always the citation). */
  prima: PrimaPersona | null;
}

const escapa = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compilaPrima(s: Sezione): PrimaPersona | null {
  const soggetto = campoRegex(s, 'soggetto', 'i');
  if (!soggetto) return null;
  return {
    contrazioni: campoCoppie(s, 'contrazioni').map(([da, a]) => [new RegExp(`^${escapa(da)}\\b`, 'i'), a]),
    soggetto,
    avverbi: campoRegex(s, 'avverbi', 'i'),
    nonVerbi: campoRegex(s, 'non_verbi', 'i'),
    invariabili: new Set(campoElenco(s, 'invariabili').map((v) => v.toLowerCase())),
    irregolari: new Map(campoCoppie(s, 'irregolari').map(([da, a]) => [da.toLowerCase(), a])),
    passato: campoRegex(s, 'passato', 'i'),
    desinenze: campoCoppie(s, 'desinenze').map(([re, a]) => [new RegExp(re), a]),
    coordinata: campoRegex(s, 'coordinata', 'i'),
    senzaSoggetto: campoRegex(s, 'coordinata_senza_soggetto', 'i'),
    pronomi: campoCoppie(s, 'pronomi').map(([re, a]) => [new RegExp(re, 'gi'), a]),
  };
}

function compila(s: Sezione): RegoleAnnuncio {
  const terza = campoTesto(s, 'terza_persona');
  const prima = s['prima_persona'];
  if (!prima || typeof prima !== 'object' || Array.isArray(prima)) throw new Error('motore.yaml: annuncio.prima_persona deve essere una sezione');
  return {
    citazione: campoTesto(s, 'citazione'),
    neutra: typeof s['neutra'] === 'string' ? s['neutra'] : '',
    parlato: campoRegex(s, 'parlato', 'iu'),
    domanda: campoRegex(s, 'domanda', 'iu'),
    terza,
    fuori: campoTesto(s, 'fuori'),
    affermazione: campoRegex(s, 'affermazione', 'i'),
    terzaParte: campoRegex(s, 'terza_parte', 'i'),
    attoDelPg: campoRegex(s, 'atto_del_pg', 'i'),
    attoInterno: campoRegex(s, 'atto_interno', 'i'),
    vuoto: campoTesto(s, 'vuoto'),
    minContenuto: campoNumero(s, 'min_contenuto'),
    nonContenuto: campoRegex(s, 'non_contenuto', 'i'),
    nonFinali: campoRegex(s, 'non_finali', 'i'),
    congiunzioni: campoRegex(s, 'congiunzioni', 'i'),
    abbreviazioni: new Set(campoElenco(s, 'abbreviazioni').map((a) => a.toLowerCase())),
    risate: campoRegex(s, 'risate', 'gi'),
    intercalari: campoRegex(s, 'intercalari', 'i'),
    virgolette: campoRegex(s, 'virgolette', 'g'),
    maxParole: campoNumero(s, 'max_parole'),
    prima: compilaPrima(prima as Sezione),
  };
}

const regoleAnnuncio = (): RegoleAnnuncio => regole('annuncio', compila);

/**
 * The language's first-person turn (`prima_persona`), compiled even when `terza_persona` is empty and the announcement
 * does not use it (both shipped packs: a turned «Ginestra opens the door.» tells the act as done before any roll).
 */
export const primaPersona = (): PrimaPersona | null => regoleAnnuncio().prima;

const riempi = (modello: string, v: Record<string, string>): string => modello.replace(/\{(\w+)\}/g, (tutto, k: string) => v[k] ?? tutto);

/** Il verbo in terza persona, o null se la parola non può essere un verbo. */
function coniuga(verbo: string, p: PrimaPersona): string | null {
  const v = verbo.toLowerCase();
  if (p.nonVerbi?.test(v) || p.avverbi?.test(v)) return null;
  if (p.invariabili.has(v) || p.passato?.test(v)) return verbo;
  const irregolare = p.irregolari.get(v);
  if (irregolare) return irregolare;
  for (const [re, sostituto] of p.desinenze) if (re.test(v)) return v.replace(re, sostituto);
  return null;
}

/** L'inizio della frase voltato («I quickly open…» → «quickly opens…»), o null se non comincia in prima persona. */
function voltaTesta(t: string, p: PrimaPersona): string | null {
  for (const [re, a] of p.contrazioni) {
    const m = re.exec(t);
    if (m) return `${a}${t.slice(m[0].length)}`;
  }
  const m = p.soggetto.exec(t);
  if (!m) return null;
  const parole = t.slice(m[0].length).split(' ').filter(Boolean);
  // Gli avverbi fra soggetto e verbo restano come sono.
  let i = 0;
  while (i < parole.length - 1 && p.avverbi?.test(parole[i]!)) i++;
  const verbo = parole[i] === undefined ? null : coniuga(parole[i]!, p);
  if (verbo === null) return null;
  parole[i] = verbo;
  return parole.join(' ');
}

/** Tutta la frase voltata: la testa, le coordinate con un nuovo «I» (fino a tre), il resto senza soggetto tagliato. */
function volta(t: string, p: PrimaPersona, profondità = 0): { testo: string; tagliata: boolean } | null {
  const testa = voltaTesta(t, p);
  if (testa === null) return null;
  // «and look inside»: il verbo senza soggetto non si sa coniugare con certezza, la frase si ferma prima.
  const corta = p.senzaSoggetto ? testa.replace(p.senzaSoggetto, '') : testa;
  const tagliata = corta !== testa;
  const m = p.coordinata && profondità < 3 ? p.coordinata.exec(corta) : null;
  if (!m) return { testo: corta, tagliata };
  const resto = volta(corta.slice(m.index + m[0].length), p, profondità + 1);
  if (!resto) return { testo: corta.slice(0, m.index), tagliata: true };
  return { testo: `${corta.slice(0, m.index)}${m[1] ?? ''} ${resto.testo}`, tagliata: tagliata || resto.tagliata };
}

const CHIUSA: Readonly<Record<string, string>> = { '"': '"', '«': '»', '“': '”' };

/** La citazione con la sua virgoletta di chiusura (il taglio dell'annuncio può averla tolta). */
function chiudiCitazione(c: string): string {
  const chiusa = CHIUSA[c[0]!];
  return chiusa && !c.slice(1).includes(chiusa) ? `${c}${chiusa}` : c;
}

/** La frase in terza persona, o null se non si può fare con certezza (allora si cita il giocatore). */
export function inTerzaPersona(frase: string, p: PrimaPersona | null = regoleAnnuncio().prima): string | null {
  if (!p) return null;
  const t = frase.replace(/’/g, "'").trim();
  // Le parole tra virgolette sono di chi parla: si volta solo ciò che viene prima, la citazione resta com'è
  // («I tell him "I need a room"» → «tells him "I need a room"»). Se la frase si è accorciata, la citazione cade.
  const q = t.search(/[«"“]/);
  const fuori = (q < 0 ? t : t.slice(0, q)).trim();
  const dentro = q < 0 ? '' : t.slice(q).trim();
  const voltata = volta(fuori, p);
  // Tagliata fino al solo verbo («I try and climb» → «tries»): dice troppo poco, meglio citare.
  if (!voltata || (voltata.tagliata && !voltata.testo.trim().includes(' '))) return null;
  let out = voltata.testo;
  for (const [re, a] of p.pronomi) out = out.replace(re, a);
  if (dentro && !voltata.tagliata) out = `${out} ${chiudiCitazione(dentro)}`;
  out = out.replace(/\s+/g, ' ').trim();
  return out || null;
}

/** La parola senza punteggiatura attorno, per i confronti con le liste del pacchetto. */
const nuda = (w: string): string => w.replace(/^[«"“(]+|[»"”).,;:!?…]+$/g, '').replace(/’/g, "'");

/** Le parole di contenuto: non nelle liste del pacchetto, e non nomi propri a metà frase («Chiedo a Ugo»). */
function contenuto(frase: string, r: RegoleAnnuncio): number {
  return frase
    .split(' ')
    .filter(Boolean)
    .filter((w, i) => {
      const n = nuda(w);
      if (!/\p{L}/u.test(n) || r.nonContenuto?.test(n)) return false;
      return !(i > 0 && /^\p{Lu}/u.test(n));
    }).length;
}

/**
 * Le frasi del testo (fino a . ! ? …), senza spezzare sul punto di un'abbreviazione («Mr. Hale»).
 * `compiuta`: finisce con ! o ? (un'esclamazione o una domanda è già un'azione intera: non si unisce alla dopo).
 */
function frasi(t: string, r: RegoleAnnuncio): string[] & { compiuta?: boolean[]; domanda?: boolean[] } {
  const out: string[] & { compiuta?: boolean[]; domanda?: boolean[] } = [];
  out.compiuta = [];
  out.domanda = [];
  let corrente = '';
  for (const pezzo of t.split(/(?<=[.!?…]["»”]?)\s+/)) {
    corrente = corrente ? `${corrente} ${pezzo}` : pezzo;
    const ultima = nuda(pezzo.split(' ').at(-1) ?? '').toLowerCase();
    if (/\.$/.test(pezzo) && r.abbreviazioni.has(ultima)) continue;
    out.compiuta.push(/[!?]["»”]?$/.test(corrente));
    out.domanda.push(/\?[!?]*["»”]?$/.test(corrente));
    out.push(corrente.replace(/[.!?…]+["»”]?$/, '').trim());
    corrente = '';
  }
  if (corrente.trim()) {
    out.compiuta.push(false);
    out.domanda.push(/\?[!?]*["»”]?$/.test(corrente.trim()));
    out.push(corrente.replace(/[.!?…]+["»”]?$/, '').trim());
  }
  return out;
}

/** Un inciso che non dice niente in testa: un vocativo («Berta,», «Ugo!»), «Anch'io,», «Me too,». */
function incisoVuoto(inciso: string, r: RegoleAnnuncio): boolean {
  const parole = inciso.split(' ').filter(Boolean);
  if (!parole.length || contenuto(inciso, r) === 0) return true;
  return parole.length === 1 && /^\p{Lu}/u.test(nuda(parole[0]!)) && !/^[^,;:]*[.!?]$/.test(inciso);
}

/**
 * Whether a clause is not the PC's own act: a claim about the world or the PC's state («Ho zero punti ferita»,
 * «Vedo tre goblin»), or a clause with someone else as subject («Il goblin mi tira la lancia»). Such words would
 * reach the table in the narrator's voice (round 4 of the coherence layer: 7 of 8 high-severity sentences).
 */
function nonDelPg(inciso: string, r: RegoleAnnuncio): boolean {
  const t = inciso.replace(/^[«"“(]+/, '').trim();
  if (r.affermazione?.test(t)) return true;
  // Someone else opens the clause, unless the PC's own verb is in it (a fronted object: «La porta la apro io»).
  return !!r.terzaParte?.test(t) && !r.attoInterno?.test(t);
}

/**
 * La frase da annunciare (docs/e2e-finale.md, D4: annunci vuoti o tagliati a metà):
 * - la prima frase del giocatore, senza gli incisi vuoti in testa (vocativi, «Anch'io», «Me too») e senza
 *   una congiunzione iniziale; se ha meno di `min_contenuto` parole di contenuto si unisce la seguente;
 * - se sta in `max` parole resta intera; se no si taglia all'ultimo confine di inciso (, ; :) prima di `max`
 *   che lasci almeno `min_contenuto` parole di contenuto, altrimenti a `max` parole, fermandosi prima di
 *   una congiunzione fra le ultime tre;
 * - mai una chiusa su articolo, preposizione, congiunzione o avverbio che regge («…prima degli», «…con»).
 */
/** How many words a first clause may go past the limit to be said whole rather than cut mid-phrase. */
const MARGINE_CLAUSOLA = 6;

export function fraseAnnuncio(testo: string, max: number, r: RegoleAnnuncio = regoleAnnuncio()): string {
  const tutte = frasi(testo, r);
  let k = 0;
  let frase = '';
  while (k < tutte.length && !frase) {
    const incisi = tutte[k]!.split(/(?<=[,;:])\s+|\s+-\s+/);
    // Leading clauses that say nothing (a vocative), or that are not the PC's own act (a claim, someone else's act).
    let altrui = false;
    while (incisi.length && (incisoVuoto(incisi[0]!.replace(/[,;:]$/, ''), r) || nonDelPg(incisi[0]!, r))) altrui = nonDelPg(incisi.shift()!, r) || altrui;
    // After someone else's clause, what follows with no subject is still theirs («…esita, guarda il compagno»): the
    // announcement starts again only at the PC's own act in the first person («…, la paro con lo scudo»).
    if (altrui) while (incisi.length && !r.attoDelPg?.test(incisi[0]!.replace(/^[«"“(]+/, '').trim())) incisi.shift();
    // Only the PC's own words: a later clause that is a claim or someone else's act ends the announcement («Pugnale
    // ancora, il goblin si gira verso di me»; round 6, CM T11).
    // After a colon the PC is saying something («Dico agli altri: i goblin non sanno…»): that clause is its words.
    const fino = incisi.findIndex((x, i) => i > 0 && !/:$/.test(incisi[i - 1]!) && nonDelPg(x, r));
    if (fino > 0) incisi.splice(fino);
    frase = incisi.join(' ').trim();
    // A lone call before more sentences («Ehi goblin!»): the next sentence says what the PC does.
    if (frase && frase.split(' ').length === 1 && k + 1 < tutte.length) frase = '';
    k++;
  }
  // Una frase sola fatta di un inciso «vuoto» per forma ma che dice qualcosa («Parla!»): resta com'è. Not a claim.
  if (!frase && tutte.length && contenuto(tutte[0]!, r) > 0 && !nonDelPg(tutte[0]!, r)) {
    frase = tutte[0]!;
    k = 1;
  }
  // Troppo poco contenuto: si unisce la frase seguente, se c'è spazio (and if it is the PC's own act too).
  // Never a sentence cut in half by the merge: the next one only if it fits whole (round 6: «… E tu, Berta, se tuo»).
  while (frase && !tutte.compiuta?.[k - 1] && contenuto(frase, r) < r.minContenuto && k < tutte.length && `${frase} ${tutte[k]}`.split(' ').length <= max && !nonDelPg(tutte[k]!, r)) frase = `${frase.replace(/[,;:]+$/, '')}. ${tutte[k++]}`;
  let parole = frase.split(' ').filter(Boolean);
  while (parole.length > 1 && r.congiunzioni?.test(nuda(parole[0]!))) parole.shift();
  // The player asked: the announcement keeps the question mark if the question is said whole (round 5: «Sei Oreste»).
  const intere = parole.length;
  const domanda = !!frase && !!tutte.domanda?.[k - 1];
  // A sentence a little past the limit is said whole: never a quote cut mid-phrase (round 6, docs/coerenza.md).
  if (parole.length > max + MARGINE_CLAUSOLA) {
    // L'ultimo confine di inciso prima del limite che dice ancora abbastanza.
    let taglio = -1;
    for (let b = Math.min(max, parole.length) - 1; b >= 0; b--) {
      if (/[,;:]$/.test(parole[b]!) && contenuto(parole.slice(0, b + 1).join(' '), r) >= r.minContenuto) {
        taglio = b + 1;
        break;
      }
    }
    // No clause boundary with enough before it: whole clauses up to a little past the limit (round 6 cut «… al goblin che
    // la sta» mid-phrase); only a clause much longer than the limit is cut.
    const confini = [...parole.map((p, i) => (/[,;:]$/.test(p) ? i + 1 : 0)).filter((b) => b > 0), parole.length];
    const intera = confini.find((b) => b > max && b <= max + MARGINE_CLAUSOLA) ?? null;
    if (taglio > 0) parole = parole.slice(0, taglio);
    else if (intera) parole = parole.slice(0, intera);
    else {
      parole = parole.slice(0, max);
      for (let c = parole.length - 1; c >= Math.max(1, parole.length - 3); c--) {
        if (r.congiunzioni?.test(nuda(parole[c]!))) {
          parole = parole.slice(0, c);
          break;
        }
      }
    }
  }
  while (parole.length > 1 && (r.nonFinali?.test(nuda(parole.at(-1)!)) || !/\p{L}|\p{N}/u.test(nuda(parole.at(-1)!)))) parole.pop();
  const fine = parole.join(' ').replace(/[\s,;:'’-]+$/, '').trim();
  return domanda && parole.length === intere && fine ? `${fine}?` : fine;
}

/**
 * L'annuncio deterministico: «Nome: «prima frase».» for an act or anything that is not speech, «Nome dice: «prima
 * frase».» for speech (`parlato`; the player's words attributed either way, never asserted as the narrator's), con la
 * frase di `fraseAnnuncio`, al massimo `max_parole` parole col nome; in inglese la stessa
 * frase in terza persona quando è un atto del PG in prima persona. Only the PC's own act is announced: a claim about
 * the world or someone else's act is left out. Niente parole che il giocatore non ha scritto. Mai vuoto: senza niente
 * da dire, «Nome agisce.»; a PC out of play, «Nome non agisce.».
 */
export function annuncioBreve(nome: string, testo: string, fuori = false): string {
  const r = regoleAnnuncio();
  // A PC out of play: what the player wrote does not happen and is not said.
  if (fuori) return riempi(r.fuori, { nome });
  let t = r.risate ? testo.replace(r.risate, ' ') : testo;
  t = t.replace(/[^\p{L}\p{N}\s'’,;:.!?…«»"-]/gu, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3 && r.intercalari?.test(t); i++) t = t.replace(r.intercalari, '').trim();
  if (r.virgolette) t = t.replace(r.virgolette, '').trim();
  // The template's own words («dice») count toward the limit too.
  const extra = riempi(r.citazione, { nome: '', frase: '' }).split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  const max = Math.max(3, r.maxParole - nome.split(/\s+/).length - extra);
  const frase = fraseAnnuncio(t, max, r);
  if (!frase || contenuto(frase, r) === 0) return riempi(r.vuoto, { nome });
  const terza = r.terza ? inTerzaPersona(frase, r.prima) : null;
  if (terza) return riempi(r.terza, { nome, frase: terza });
  const modello = r.neutra && !parlato(testo, t, frase, r) ? r.neutra : r.citazione;
  // A question keeps its «?»; no full stop right after it inside the quotes («Who pays you?”», not «?.”»).
  return riempi(modello, { nome, frase: senzaVirgolette(`${frase.charAt(0).toUpperCase()}${frase.slice(1)}`) }).replace(/\?\.(["»”])/u, '?$1');
}

/** A vocative at the head or at the end of a sentence: one or two capitalised words set off by a comma or a «!». */
const VOCATIVO_TESTA = /^\p{Lu}[\p{L}'’-]*(\s+\p{Lu}[\p{L}'’-]*)?\s*[,!]/u;
const VOCATIVO_CODA = /,\s*\p{Lu}[\p{L}'’-]*\s*[.!?…]*["»”]?\s*$/u;

/**
 * The announced words are speech (the lead's decision, 17 November): «dice» only then. Not when the announced sentence
 * is the PC's own act in the first person («Chiedo a Berta chi…», «Vado al pozzo»: an act, framed neutrally even with
 * a quote inside); speech when the player quoted words, opened or closed with a vocative («Berta, dimmi…», «Che
 * fai, Livia?»), addressed someone (`parlato`: a second person, «grazie»), or asked a question that is not its own act
 * («Chi vi paga?», «C'è qualcosa qui?»; not «Chiedo a Berta chi…»).
 */
function parlato(grezzo: string, pulito: string, frase: string, r: RegoleAnnuncio): boolean {
  const f = frase.replace(/^[«"“(]+/, '').trim();
  // A question to someone: an interrogative at its head («Chi vi paga?»), or any question that is not the PC's act.
  const domanda = /\?["»”]?$/.test(f);
  if (domanda && r.domanda?.test(f)) return true;
  if (r.attoDelPg?.test(f)) return false;
  if (domanda) return true;
  if (/[«»“”"]/.test(grezzo)) return true;
  const prima = pulito.split(/(?<=[.!?…])\s+/)[0] ?? '';
  if (VOCATIVO_TESTA.test(prima) || VOCATIVO_CODA.test(prima)) return true;
  // A call before more words («Ehi goblin! Dove sono gli altri?»): at most three words and a «!».
  const chiamata = grezzo.trim().split(/(?<=[.!?…])\s+/);
  if (chiamata.length > 1 && /!["»”]?$/.test(chiamata[0]!) && chiamata[0]!.split(/\s+/).length <= 3) return true;
  return !!r.parlato?.test(frase);
}

/**
 * Le virgolette che il giocatore ha scritto dentro la frase vanno tolte: la citazione dell'annuncio ne
 * ha una sola coppia, e una frase con «…» dentro dà «Livia: «Blocco un goblin: «Dov'è il ragazzo».»»,
 * illeggibile. Il testo resta, senza le virgolette. Solo per la citazione, non per la terza persona.
 */
export function senzaVirgolette(frase: string): string {
  return frase.replace(/\s*[«»“”"]+\s*/g, ' ').replace(/\s+([.,;:!?…])/g, '$1').replace(/\s+/g, ' ').trim();
}
