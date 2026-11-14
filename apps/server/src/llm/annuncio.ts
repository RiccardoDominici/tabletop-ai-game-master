/**
 * L'annuncio deterministico del lettore minimo (llm/minimo.ts): al tavolo nessuno legge il telefono degli
 * altri, quindi prima dell'esito una frase breve dice cosa fa quel PG. Il modello piccolo non la scrive
 * (nelle misure inventava parole): la compone il Motore dal nome del PG e dalla prima frase breve di ciò
 * che il giocatore ha scritto, senza aggiungere niente.
 *
 * Le regole sono della lingua dei contenuti (lingue/<codice>/motore.yaml, sezione `annuncio`):
 * - italiano: le parole del giocatore si citano («Ida: «Guardo la scatolina».»), come sempre;
 * - inglese: la prima persona si volta in terza («I open the door» → «Ginestra opens the door.»): soggetto
 *   tolto, verbo coniugato (desinenze, irregolari, modali), pronomi voltati (my → their). Quando la frase
 *   non comincia con «I» o il verbo non si riconosce, si torna alla citazione, che è sempre corretta.
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
  terza: string;
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
  /** null = la lingua non volta la prima persona: sempre la citazione. */
  prima: PrimaPersona | null;
}

const escapa = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compilaPrima(s: Sezione, terza: string): PrimaPersona | null {
  const soggetto = campoRegex(s, 'soggetto', 'i');
  if (!terza || !soggetto) return null;
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
    terza,
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
    prima: compilaPrima(prima as Sezione, terza),
  };
}

const regoleAnnuncio = (): RegoleAnnuncio => regole('annuncio', compila);

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
function frasi(t: string, r: RegoleAnnuncio): string[] & { compiuta?: boolean[] } {
  const out: string[] & { compiuta?: boolean[] } = [];
  out.compiuta = [];
  let corrente = '';
  for (const pezzo of t.split(/(?<=[.!?…]["»”]?)\s+/)) {
    corrente = corrente ? `${corrente} ${pezzo}` : pezzo;
    const ultima = nuda(pezzo.split(' ').at(-1) ?? '').toLowerCase();
    if (/\.$/.test(pezzo) && r.abbreviazioni.has(ultima)) continue;
    out.compiuta.push(/[!?]["»”]?$/.test(corrente));
    out.push(corrente.replace(/[.!?…]+["»”]?$/, '').trim());
    corrente = '';
  }
  if (corrente.trim()) {
    out.compiuta.push(false);
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
 * La frase da annunciare (docs/e2e-finale.md, D4: annunci vuoti o tagliati a metà):
 * - la prima frase del giocatore, senza gli incisi vuoti in testa (vocativi, «Anch'io», «Me too») e senza
 *   una congiunzione iniziale; se ha meno di `min_contenuto` parole di contenuto si unisce la seguente;
 * - se sta in `max` parole resta intera; se no si taglia all'ultimo confine di inciso (, ; :) prima di `max`
 *   che lasci almeno `min_contenuto` parole di contenuto, altrimenti a `max` parole, fermandosi prima di
 *   una congiunzione fra le ultime tre;
 * - mai una chiusa su articolo, preposizione, congiunzione o avverbio che regge («…prima degli», «…con»).
 */
export function fraseAnnuncio(testo: string, max: number, r: RegoleAnnuncio = regoleAnnuncio()): string {
  const tutte = frasi(testo, r);
  let k = 0;
  let frase = '';
  while (k < tutte.length && !frase) {
    const incisi = tutte[k]!.split(/(?<=[,;:])\s+|\s+-\s+/);
    while (incisi.length && incisoVuoto(incisi[0]!.replace(/[,;:]$/, ''), r)) incisi.shift();
    frase = incisi.join(' ').trim();
    k++;
  }
  // Una frase sola fatta di un inciso «vuoto» per forma ma che dice qualcosa («Parla!»): resta com'è.
  if (!frase && tutte.length && contenuto(tutte[0]!, r) > 0) {
    frase = tutte[0]!;
    k = 1;
  }
  // Troppo poco contenuto: si unisce la frase seguente, se c'è spazio.
  while (frase && !tutte.compiuta?.[k - 1] && contenuto(frase, r) < r.minContenuto && k < tutte.length && frase.split(' ').length < max) frase = `${frase}. ${tutte[k++]}`;
  let parole = frase.split(' ').filter(Boolean);
  while (parole.length > 1 && r.congiunzioni?.test(nuda(parole[0]!))) parole.shift();
  if (parole.length > max) {
    // L'ultimo confine di inciso prima del limite che dice ancora abbastanza.
    let taglio = -1;
    for (let b = Math.min(max, parole.length) - 1; b >= 0; b--) {
      if (/[,;:]$/.test(parole[b]!) && contenuto(parole.slice(0, b + 1).join(' '), r) >= r.minContenuto) {
        taglio = b + 1;
        break;
      }
    }
    if (taglio > 0) parole = parole.slice(0, taglio);
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
  return parole.join(' ').replace(/[\s,;:'’-]+$/, '').trim();
}

/**
 * L'annuncio deterministico: in italiano «Nome: «prima frase».», con la frase di `fraseAnnuncio`, al
 * massimo `max_parole` parole col nome; in inglese la stessa frase in terza persona quando si può.
 * Niente parole che il giocatore non ha scritto. Mai vuoto: senza niente da dire, «Nome agisce.».
 */
export function annuncioBreve(nome: string, testo: string): string {
  const r = regoleAnnuncio();
  let t = r.risate ? testo.replace(r.risate, ' ') : testo;
  t = t.replace(/[^\p{L}\p{N}\s'’,;:.!?…«»"-]/gu, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3 && r.intercalari?.test(t); i++) t = t.replace(r.intercalari, '').trim();
  if (r.virgolette) t = t.replace(r.virgolette, '').trim();
  const max = Math.max(3, r.maxParole - nome.split(/\s+/).length);
  const frase = fraseAnnuncio(t, max, r);
  if (!frase || contenuto(frase, r) === 0) return riempi(r.vuoto, { nome });
  const terza = inTerzaPersona(frase, r.prima);
  if (terza) return riempi(r.terza, { nome, frase: terza });
  return riempi(r.citazione, { nome, frase: senzaVirgolette(`${frase.charAt(0).toUpperCase()}${frase.slice(1)}`) });
}

/**
 * Le virgolette che il giocatore ha scritto dentro la frase vanno tolte: la citazione dell'annuncio ne
 * ha una sola coppia, e una frase con «…» dentro dà «Livia: «Blocco un goblin: «Dov'è il ragazzo».»»,
 * illeggibile. Il testo resta, senza le virgolette. Solo per la citazione, non per la terza persona.
 */
export function senzaVirgolette(frase: string): string {
  return frase.replace(/\s*[«»“”"]+\s*/g, ' ').replace(/\s+([.,;:!?…])/g, '$1').replace(/\s+/g, ' ').trim();
}
