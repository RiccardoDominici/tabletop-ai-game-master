/**
 * Voce espressiva (fish-audio/drama-3, docs/ricerca-voce-drama3.md): il narratore, il selettore e il
 * Preparatore possono scrivere nelle righe del protocollo tre cose che la sintesi INTERPRETA e non legge:
 *
 *   [offesa, ma a voce bassa] Non venni.     ← direzione: vale fino alla prossima, dentro la riga
 *   Lo so io. [sigh] Lo so io.               ← suono: un evento puntuale (sigh, laugh, breath, pause…)
 *   Promettimi <whisper>che non lo dici</whisper>.   ← tag accoppiati, SEMPRE chiusi
 *
 * Qui stanno le regole che valgono ovunque:
 * - `analizza`: separa le PAROLE (proiettore, telefoni, trascrizione, cronologia per Haiku, voce Qwen)
 *   dal testo ESPRESSIVO (solo per drama-3), con una guardia severa: tag sconosciuti, chiusure senza
 *   apertura e direzioni troppo lunghe si tolgono e finiscono tra le anomalie (nel log); un tag ancora
 *   aperto a fine frase si chiude lì, così a drama-3 arriva sempre un testo bilanciato (un tag non
 *   chiuso verrebbe letto ad alta voce).
 * - `EspressioneTurno`: lo stato di una risposta del narratore. Le frasi di una riga vanno alla voce una
 *   per volta (richieste separate), quindi la direzione della riga e i tag aperti si riportano sulle
 *   frasi seguenti della STESSA riga; una riga nuova riparte pulita.
 * - `direzionePredefinita`: la direzione di chi parla quando la riga non ne ha una (scheda del PNG,
 *   carta di stile per il narratore).
 * - `soloParole`: toglie tutto il markup (per i motori che non lo capiscono, come Qwen).
 */
import type { Campagna, DatiYaml } from '../campagna/tipi';
import { ID_NARRATORE } from '../campagna/tipi';
import type { EventoNarratore } from '../narrazione/parser';

type EventoFrase = Extract<EventoNarratore, { tipo: 'frase' }>;
/** Evento del parser dopo la voce espressiva: la frase ha le parole in `testo` e il testo per drama-3 in `voce`. */
export type EventoEspressivo = Exclude<EventoNarratore, EventoFrase> | (EventoFrase & { voce: string });

/** Tag accoppiati di drama-3: si aprono e si chiudono, mai annidati in modo incrociato. */
export const TAG_ACCOPPIATI: ReadonlySet<string> = new Set(['whisper', 'emphasis', 'soft', 'fast', 'slow', 'stress', 'forceful']);

/**
 * Suoni (eventi puntuali): non diventano la direzione corrente della riga. Inglese come negli esempi
 * ufficiali; si accettano anche le forme italiane più ovvie, che drama-3 capisce come direzioni.
 */
export const SUONI: ReadonlySet<string> = new Set([
  'sigh', 'sighs', 'laugh', 'laughs', 'laughing', 'chuckle', 'chuckles', 'breath', 'breathes', 'deep breath',
  'shaky breath', 'pause', 'long pause', 'cough', 'coughs', 'gasp', 'gasps', 'sniff', 'groan', 'hum',
  'sospiro', 'sospira', 'risata', 'ride', 'risatina', 'respiro', 'respira', 'pausa', 'tosse', 'tossisce',
]);

/** Una direzione scritta dal narratore o dal Preparatore: breve (oltre, si toglie e si registra). */
export const MAX_DIREZIONE = 80;
/** La direzione predefinita composta dalla scheda può essere un po' più lunga, ma non troppo. */
export const MAX_DIREZIONE_PREDEFINITA = 110;
/** Oltre questa lunghezza una parentesi quadra non è markup: è testo rotto (si toglie). */
const MAX_PARENTESI = 160;

export interface AnomaliaEspressione {
  codice: 'tag_sconosciuto' | 'tag_chiuso_senza_apertura' | 'tag_non_chiuso' | 'direzione_lunga' | 'parentesi_spaiata' | 'direzione_vuota';
  dettaglio: string;
}

export interface Analisi {
  /** Testo senza markup: si mostra e si scrive nella trascrizione. */
  parole: string;
  /** Testo per drama-3: direzioni, suoni e tag validi, tag bilanciati. */
  espressivo: string;
  /** Il testo espressivo comincia con una direzione (non un suono): niente direzione predefinita. */
  iniziaConDirezione: boolean;
  /** Ultima direzione vista (non i suoni): vale per le frasi seguenti della stessa riga. */
  direzione: string | null;
  /** Tag rimasti aperti alla fine (già chiusi in `espressivo`): da riaprire nella frase seguente. */
  aperti: string[];
  anomalie: AnomaliaEspressione[];
}

type Pezzo =
  | { tipo: 'testo'; testo: string }
  | { tipo: 'quadra'; contenuto: string }
  | { tipo: 'apre'; tag: string; grezzo: string }
  | { tipo: 'chiude'; tag: string; grezzo: string };

/** Divide il testo in pezzi: testo normale, [quadre], <tag> e </tag>. */
function pezzi(testo: string): Pezzo[] {
  const out: Pezzo[] = [];
  const re = /\[([^[\]]{0,160})\]|<(\/?)([A-Za-z][A-Za-z_-]{0,24})\s*>/g;
  let ultimo = 0;
  for (let m = re.exec(testo); m; m = re.exec(testo)) {
    if (m.index > ultimo) out.push({ tipo: 'testo', testo: testo.slice(ultimo, m.index) });
    if (m[1] !== undefined) out.push({ tipo: 'quadra', contenuto: m[1] });
    else out.push({ tipo: m[2] ? 'chiude' : 'apre', tag: m[3]!.toLowerCase(), grezzo: m[0] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < testo.length) out.push({ tipo: 'testo', testo: testo.slice(ultimo) });
  return out;
}

/** Spazi normalizzati e niente spazio prima della punteggiatura (dopo aver tolto un suono a metà). */
function sistemaSpazi(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/\s+([,.;:!?…»”)])/g, '$1').replace(/([«“(])\s+/g, '$1').trim();
}

export function èSuono(contenuto: string): boolean {
  return SUONI.has(contenuto.trim().toLowerCase().replace(/\s+/g, ' '));
}

/**
 * Analizza una frase (o una riga intera). `aperti` sono i tag rimasti aperti dalla frase precedente
 * della stessa riga: si riaprono all'inizio.
 */
export function analizza(testo: string, opzioni: { aperti?: readonly string[] } = {}): Analisi {
  const anomalie: AnomaliaEspressione[] = [];
  const parole: string[] = [];
  const voce: string[] = [];
  const pila: string[] = [];
  for (const t of opzioni.aperti ?? []) {
    if (!TAG_ACCOPPIATI.has(t)) continue;
    pila.push(t);
    voce.push(`<${t}>`);
  }
  let direzione: string | null = null;
  let iniziaConDirezione = false;
  let primaDelTesto = true;

  for (const p of pezzi(testo)) {
    if (p.tipo === 'testo') {
      // Una parentesi quadra rimasta sola (una direzione spezzata, testo rotto): via, da tutte e due le parti.
      let t = p.testo;
      if (/[[\]]/.test(t)) {
        anomalie.push({ codice: 'parentesi_spaiata', dettaglio: `parentesi quadra spaiata tolta: «${tronca(t)}»` });
        t = t.replace(/\[[^\]]*$/, ' ').replace(/[[\]]/g, ' ');
      }
      if (t.trim()) primaDelTesto = false;
      parole.push(t);
      voce.push(t);
      continue;
    }
    if (p.tipo === 'quadra') {
      const c = p.contenuto.replace(/\s+/g, ' ').trim();
      if (!c) {
        anomalie.push({ codice: 'direzione_vuota', dettaglio: 'parentesi quadre vuote tolte' });
        continue;
      }
      const suono = èSuono(c);
      if (!suono && c.length > MAX_DIREZIONE) {
        anomalie.push({ codice: 'direzione_lunga', dettaglio: `direzione di ${c.length} caratteri (max ${MAX_DIREZIONE}) tolta: «${tronca(c)}»` });
        continue;
      }
      if (c.length > MAX_PARENTESI) continue;
      parole.push(' ');
      voce.push(` [${c}] `);
      if (!suono) {
        direzione = c;
        // Una direzione prima di ogni parola (anche dopo un suono): la riga ha la sua, niente predefinita.
        if (primaDelTesto) iniziaConDirezione = true;
      }
      continue;
    }
    if (!TAG_ACCOPPIATI.has(p.tag)) {
      anomalie.push({ codice: 'tag_sconosciuto', dettaglio: `tag sconosciuto tolto: ${p.grezzo}` });
      continue;
    }
    if (p.tipo === 'apre') {
      pila.push(p.tag);
      voce.push(`<${p.tag}>`);
      continue;
    }
    // Chiusura: deve corrispondere a un tag aperto; se ce ne sono altri sopra, si chiudono prima.
    const i = pila.lastIndexOf(p.tag);
    if (i < 0) {
      anomalie.push({ codice: 'tag_chiuso_senza_apertura', dettaglio: `chiusura senza apertura tolta: ${p.grezzo}` });
      continue;
    }
    while (pila.length > i) voce.push(`</${pila.pop()!}>`);
  }
  const aperti = [...pila];
  while (pila.length) voce.push(`</${pila.pop()!}>`);
  const espressivo = sistemaSpazi(voce.join('').replace(/<([a-z]+)>\s*<\/\1>/g, ' '));
  return { parole: sistemaSpazi(parole.join('')), espressivo, iniziaConDirezione, direzione, aperti, anomalie };
}

/** Il testo senza markup (per i motori che non lo capiscono e per tutto ciò che si mostra). */
export function soloParole(testo: string): string {
  if (!/[[<]/.test(testo)) return testo;
  return analizza(testo).parole;
}

/** True se il testo contiene markup espressivo (direzioni, suoni o tag). */
export function haMarkup(testo: string): boolean {
  return /\[[^[\]]*\]|<\/?[A-Za-z][A-Za-z_-]*\s*>/.test(testo);
}

/** Mette la direzione predefinita davanti, se il testo non comincia già con una direzione sua. */
export function conDirezione(analisi: Pick<Analisi, 'espressivo' | 'iniziaConDirezione'>, predefinita: string | null): string {
  if (analisi.iniziaConDirezione || !predefinita) return analisi.espressivo;
  return `[${predefinita}] ${analisi.espressivo}`;
}

/**
 * Testo che va a drama-3 per una riga: guardia (anomalie da registrare) e, se la riga non ha una
 * direzione sua, quella predefinita di chi parla. È il punto unico per la pipeline del gioco e per la
 * pre-generazione (strumenti/prerender-fish.ts): la chiave della cache (voce/cache-audio.ts) dipende da
 * questo testo esatto, quindi le due strade devono usare questa funzione e basta.
 */
export function testoEspressivoDi(testo: string, predefinita: string | null): { espressivo: string; anomalie: AnomaliaEspressione[] } {
  const a = analizza(testo);
  return { espressivo: conDirezione(a, predefinita), anomalie: a.anomalie };
}

/** Stato di una risposta del narratore: direzione e tag che passano da una frase all'altra della riga. */
export class EspressioneTurno {
  private segmento = -1;
  private direzione: string | null = null;
  private aperti: string[] = [];
  /** Markup di una «frase» senza parole (un suono, una direzione da sola): va davanti alla prossima. */
  private sospeso = '';

  constructor(private readonly segnala: (a: AnomaliaEspressione & { segmento: number }) => void = () => undefined) {}

  /**
   * Una frase del parser: restituisce le parole da mostrare e il testo per drama-3 (autosufficiente:
   * la direzione della riga davanti, i tag riaperti e chiusi). `parole` vuote = niente da dire.
   */
  frase(segmento: number, testo: string): { parole: string; voce: string } {
    if (segmento !== this.segmento) this.nuovaRiga(segmento);
    const a = analizza(this.sospeso ? `${this.sospeso} ${testo}` : testo, { aperti: this.aperti });
    this.sospeso = '';
    for (const x of a.anomalie) this.segnala({ ...x, segmento });
    if (!a.parole) {
      // Solo markup: la direzione vale per ciò che segue, il resto aspetta la prossima frase.
      if (a.direzione) this.direzione = a.direzione;
      this.sospeso = a.espressivo.replace(/<\/?[a-z]+>/g, '').trim();
      this.aperti = a.aperti;
      return { parole: '', voce: '' };
    }
    const voce = a.iniziaConDirezione || !this.direzione ? a.espressivo : `[${this.direzione}] ${a.espressivo}`;
    if (a.direzione) this.direzione = a.direzione;
    this.aperti = a.aperti;
    return { parole: a.parole, voce };
  }

  /**
   * Gli eventi del parser con le frasi separate: `testo` = parole (proiettore, trascrizione, cronologia
   * per Haiku), `voce` = testo per drama-3. Una frase di solo markup sparisce (il markup va alla dopo).
   */
  trasforma(eventi: readonly EventoNarratore[]): EventoEspressivo[] {
    const out: EventoEspressivo[] = [];
    for (const e of eventi) {
      if (e.tipo !== 'frase') {
        out.push(e);
        continue;
      }
      const x = this.frase(e.segmento, e.testo);
      if (x.parole) out.push({ ...e, testo: x.parole, voce: x.voce });
    }
    return out;
  }

  /** Fine della risposta: un tag ancora aperto nell'ultima riga è un errore di protocollo (già chiuso). */
  chiudi(): void {
    this.nuovaRiga(this.segmento + 1);
  }

  private nuovaRiga(segmento: number): void {
    if (this.aperti.length) {
      this.segnala({ codice: 'tag_non_chiuso', dettaglio: `tag mai chiusi nella riga: ${this.aperti.map((t) => `<${t}>`).join(' ')} (chiusi a fine frase)`, segmento: this.segmento });
    }
    this.segmento = segmento;
    this.direzione = null;
    this.aperti = [];
    this.sospeso = '';
  }
}

// ------------------------------------------------------------------ direzioni predefinite

function stringa(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function oggetto(v: unknown): DatiYaml | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as DatiYaml) : null;
}

/** Accorcia a un confine di virgola o punto e virgola, senza spezzare parole. */
function accorcia(s: string, max: number): string {
  const t = s.replace(/[[\]<>]/g, '').replace(/\s+/g, ' ').trim().replace(/[.;:,]+$/, '');
  if (t.length <= max) return t;
  const taglio = t.slice(0, max);
  const i = Math.max(taglio.lastIndexOf(','), taglio.lastIndexOf(';'));
  return (i > max / 3 ? taglio.slice(0, i) : taglio.slice(0, taglio.lastIndexOf(' '))).trim();
}

/** Direzione dalla scheda di un PNG: `voce.tts.direzione` se c'è, altrimenti composta da carattere, timbro, età e velocità. */
export function direzioneDaScheda(dati: DatiYaml): string | null {
  const voce = oggetto(dati['voce']);
  const tts = oggetto(voce?.['tts']);
  const esplicita = stringa(tts?.['direzione']) ?? stringa(voce?.['direzione']);
  if (esplicita) return accorcia(esplicita, MAX_DIREZIONE_PREDEFINITA);
  const parti: string[] = [];
  // Il primo tratto della superficie («burbero e rumoroso, batte il bastone…» → «burbero e rumoroso»).
  const personalita = oggetto(dati['personalita']);
  const superficie = personalita?.['superficie'];
  const primo = Array.isArray(superficie) ? stringa(superficie[0]) : stringa(superficie);
  if (primo) parti.push(primo.split(/[,;]/)[0]!.trim());
  const timbro = stringa(tts?.['timbro']);
  if (timbro) parti.push(`timbro ${timbro}`);
  const eta = stringa(tts?.['eta_apparente']) ?? (typeof tts?.['eta_apparente'] === 'number' ? String(tts['eta_apparente']) : null);
  if (eta) parti.push(`sui ${eta.replace(/\s*-\s*/, '-')} anni`);
  const velocita = typeof tts?.['velocita'] === 'number' ? (tts['velocita'] as number) : null;
  if (velocita !== null && velocita <= 0.92) parti.push('parla adagio');
  else if (velocita !== null && velocita >= 1.08) parti.push('parla svelto');
  if (!parti.length) return null;
  return accorcia(parti.join('; '), MAX_DIREZIONE_PREDEFINITA);
}

/** Direzione del narratore dalla carta di stile: `direzione_voce` se c'è, altrimenti la prima frase di `registro_narratore`. */
export function direzioneDaStile(stile: DatiYaml): string | null {
  const esplicita = stringa(stile['direzione_voce']);
  if (esplicita) return accorcia(esplicita, MAX_DIREZIONE_PREDEFINITA);
  const registro = stringa(stile['registro_narratore']);
  if (!registro) return null;
  return accorcia(registro.split(/(?<=[.!?])\s/)[0]!, MAX_DIREZIONE_PREDEFINITA);
}

const cacheDirezioni = new WeakMap<Campagna, Map<string, string | null>>();

/** Direzione predefinita di chi parla (memorizzata per campagna: le schede non cambiano a partita in corso). */
export function direzionePredefinita(campagna: Campagna, parlante: string): string | null {
  let m = cacheDirezioni.get(campagna);
  if (!m) {
    m = new Map();
    m.set(ID_NARRATORE, direzioneDaStile(campagna.stile));
    for (const p of campagna.png) m.set(p.id, direzioneDaScheda(p.dati));
    cacheDirezioni.set(campagna, m);
  }
  return m.get(parlante) ?? null;
}

function tronca(s: string, n = 60): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
