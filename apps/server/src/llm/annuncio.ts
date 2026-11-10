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
  risate: RegExp | null;
  intercalari: RegExp | null;
  virgolette: RegExp | null;
  congiunzione: RegExp | null;
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
    risate: campoRegex(s, 'risate', 'gi'),
    intercalari: campoRegex(s, 'intercalari', 'i'),
    virgolette: campoRegex(s, 'virgolette', 'g'),
    congiunzione: campoRegex(s, 'congiunzione_finale', 'i'),
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

/**
 * L'annuncio deterministico: in italiano «Nome: «prima frase».», con la prima frase di ciò che il
 * giocatore ha scritto tagliata alla prima virgola o pausa (e prima di una congiunzione se va oltre), al
 * massimo `max_parole` parole col nome; in inglese la stessa frase in terza persona quando si può.
 * Niente parole che il giocatore non ha scritto. null se non resta niente.
 */
export function annuncioBreve(nome: string, testo: string): string | null {
  const r = regoleAnnuncio();
  let t = r.risate ? testo.replace(r.risate, ' ') : testo;
  t = t.replace(/[^\p{L}\p{N}\s'’,;:.!?…«»"-]/gu, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3 && r.intercalari?.test(t); i++) t = t.replace(r.intercalari, '').trim();
  if (r.virgolette) t = t.replace(r.virgolette, '').trim();
  const pezzi = t.split(/\s*[,;:.!?…]+\s*|\s+-\s+/).filter(Boolean);
  const prima = pezzi.find((x) => x.split(' ').length >= 2) ?? pezzi[0] ?? '';
  const max = Math.max(3, r.maxParole - nome.split(/\s+/).length);
  const parole = prima.split(' ').filter(Boolean);
  let frase = parole.slice(0, max).join(' ');
  // Se si taglia a metà, meglio fermarsi prima di una congiunzione («e», «ma», «poi»…; «and», «but»…).
  if (parole.length > max && r.congiunzione) frase = frase.replace(r.congiunzione, '');
  frase = frase.replace(/[\s'’-]+$/, '').trim();
  if (!frase) return null;
  const terza = inTerzaPersona(frase, r.prima);
  if (terza) return riempi(r.terza, { nome, frase: terza });
  return riempi(r.citazione, { nome, frase: `${frase.charAt(0).toUpperCase()}${frase.slice(1)}` });
}
