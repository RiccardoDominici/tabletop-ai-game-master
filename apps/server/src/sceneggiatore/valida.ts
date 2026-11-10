/**
 * Le battute scritte dallo sceneggiatore entrano nel repertorio solo se passano le stesse regole delle
 * battute preparate (docs/sceneggiatore.md, «Controllo»):
 * - forma: il caricatore del repertorio (repertorio/caricatore.ts) le legge come un file qualsiasi
 *   (campi, tipi, etichette delle righe, PNG con scheda);
 * - voci: parla solo il narratore o un PNG presente nella scena;
 * - cancelli e stato: niente `richiede` né `effetti` (una battuta scritta al volo non rivela indizi, non
 *   cambia fatti né orologi: le rivelazioni restano quelle preparate); scena = quella in corso, max_usi 1;
 * - tipi: solo reazioni, momenti, richieste, rifiuti, saluti (mai indizi, confessioni, menzogne, segni,
 *   finali, transizioni, chiusure);
 * - segreti: nessuna parola ancora segreta che il tavolo non abbia sentito (narrazione/guardia-segreti.ts);
 * - i PG sono dei giocatori: una riga del narratore che ha un PG per soggetto («Gunda apre il pugno»)
 *   decide al posto di un giocatore, e la battuta esce (pgCheAgisce). Il vocativo («Gunda, …») va bene;
 * - azione privata: il Motore aggiunge `richiede: {privata: true}`, così la battuta, se non si dice
 *   subito, risponde dopo solo ad azioni private (mai ad alta voce).
 * Funzione pura sul testo YAML; la scrittura temporanea serve solo a riusare il caricatore.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import type { Campagna } from '../campagna/tipi';
import { ID_NARRATORE } from '../campagna/tipi';
import { segretiNascosti } from '../narrazione/guardia-segreti';
import { caricaRepertorio, ErroreRepertorio } from '../repertorio/caricatore';
import type { ParolaSegreta, StatoPubblico } from '../repertorio/segreti';
import type { Battuta, TipoBattuta } from '../repertorio/tipi';

const FILE = 'sceneggiatore.yaml';
export const TIPI_SCENEGGIATORE: ReadonlySet<TipoBattuta> = new Set<TipoBattuta>(['reazione', 'momento', 'richiesta', 'rifiuto', 'saluto']);
/** Righe al massimo per battuta, e caratteri per riga: si leggono a voce. */
export const MAX_RIGHE = 4;
export const MAX_CARATTERI_RIGA = 240;

export interface ContestoValidazione {
  campagna: Campagna;
  scena: string;
  presenti: ReadonlySet<string>;
  /** Le battute già nel repertorio vivo (per l'unicità degli id). */
  esistenti: ReadonlyMap<string, Battuta>;
  prefisso: string;
  parole: ParolaSegreta[];
  pubblico: StatoPubblico | null;
  /** Ciò che il tavolo ha già sentito (trascrizione pubblica). */
  detto: string;
  /** La battuta risponde a un'azione privata (va al telefono di quel PG). */
  privata?: boolean;
}

export interface EsitoValidazione {
  accettate: Battuta[];
  scartate: Array<{ id: string; motivo: string }>;
}

/** Estrae il blocco YAML dal testo di Claude Code (anche dentro un recinto ```yaml). */
export function estraiYaml(testo: string): string {
  const recinto = /```(?:ya?ml)?\s*\n([\s\S]*?)```/i.exec(testo);
  return (recinto ? recinto[1]! : testo).trim();
}

export function validaBattute(testo: string, ctx: ContestoValidazione): EsitoValidazione {
  const scartate: EsitoValidazione['scartate'] = [];
  let grezzo: unknown;
  try {
    grezzo = YAML.parse(estraiYaml(testo));
  } catch (err) {
    return { accettate: [], scartate: [{ id: '*', motivo: `YAML non valido: ${(err as Error).message.split('\n')[0]}` }] };
  }
  const lista = Array.isArray(grezzo) ? grezzo : Array.isArray((grezzo as { battute?: unknown } | null)?.battute) ? (grezzo as { battute: unknown[] }).battute : null;
  if (!lista) return { accettate: [], scartate: [{ id: '*', motivo: 'nessun elenco «battute»' }] };

  // 1. Forma imposta dal Motore: id unici col prefisso, scena in corso, un uso, niente cancelli né effetti.
  const pulite: Record<string, unknown>[] = [];
  const visti = new Set<string>();
  lista.forEach((x, k) => {
    if (!x || typeof x !== 'object') return void scartate.push({ id: `#${k + 1}`, motivo: 'non è una battuta' });
    const b = { ...(x as Record<string, unknown>) };
    let id = typeof b['id'] === 'string' ? b['id'] : '';
    if (!id.startsWith(ctx.prefisso) || ctx.esistenti.has(id) || visti.has(id)) id = `${ctx.prefisso}${k + 1}`;
    if (ctx.esistenti.has(id) || visti.has(id)) return void scartate.push({ id, motivo: 'id ripetuto' });
    visti.add(id);
    const tipo = b['tipo'] as TipoBattuta;
    if (!TIPI_SCENEGGIATORE.has(tipo)) return void scartate.push({ id, motivo: `tipo non ammesso per lo sceneggiatore: ${String(tipo)}` });
    if (b['richiede'] !== undefined || b['effetti'] !== undefined) return void scartate.push({ id, motivo: 'richiede/effetti non ammessi: le rivelazioni restano quelle preparate' });
    delete b['varianti'];
    delete b['solo_esempio'];
    delete b['audio'];
    pulite.push({ ...b, id, scena: ctx.scena, max_usi: 1, ...(ctx.privata ? { richiede: { privata: true } } : {}) });
  });

  // 2. Il caricatore del repertorio, su un file temporaneo con queste sole battute; chi sbaglia esce.
  let battute = carica(pulite, ctx.campagna, scartate);

  // 3. Voci, lunghezza, segreti, PG.
  const nomi = nomiDeiPg(ctx.campagna);
  battute = battute.filter((b) => {
    const parlanti = [b.chi, ...b.testo.map((r) => r.etichetta)];
    const assente = parlanti.find((p) => p !== ID_NARRATORE && !ctx.presenti.has(p));
    if (assente) return void scartate.push({ id: b.id, motivo: `${assente} non è nella scena` }), false;
    if (!b.temi.length) return void scartate.push({ id: b.id, motivo: 'senza temi: non entrerebbe mai in catalogo' }), false;
    if (b.testo.length > MAX_RIGHE || b.testo.some((r) => r.testo.length > MAX_CARATTERI_RIGA)) return void scartate.push({ id: b.id, motivo: 'troppo lunga per la voce' }), false;
    const segreti = segretiNascosti(b.testo.map((r) => r.testo).join(' '), ctx.parole, ctx.pubblico, ctx.detto);
    if (segreti.length) return void scartate.push({ id: b.id, motivo: `parole segrete: ${segreti.join(', ')}` }), false;
    const agisce = b.testo.filter((r) => r.etichetta === ID_NARRATORE).map((r) => pgCheAgisce(r.testo, nomi)).find((x) => x !== null);
    if (agisce) return void scartate.push({ id: b.id, motivo: `decide per un PG: «${agisce}»` }), false;
    return true;
  });
  return { accettate: battute, scartate };
}

/** I nomi con cui una riga può indicare un PG: nome intero, primo nome, alias della campagna. */
export function nomiDeiPg(c: Campagna): string[] {
  const out = new Set<string>();
  for (const p of c.pg) {
    out.add(p.nome);
    const primo = p.nome.split(/\s+/)[0];
    if (primo && primo.length > 2) out.add(primo);
  }
  for (const [alias, id] of Object.entries(c.alias)) if (c.pg.some((p) => p.id === id) && alias.length > 2) out.add(alias);
  return [...out].sort((a, b) => b.length - a.length);
}

/**
 * Una frase che ha un PG per soggetto, cioè il nome all'inizio della frase (o dopo una virgola) seguito
 * da un verbo: «Gunda apre il pugno», «Poi Remo si alza», «Remo e Vanda ridono». Restituisce la frase, o
 * null. Non contano il vocativo («Gunda, la sala aspetta»), il complemento («guarda Gunda») e il
 * genitivo («il pugno di Gunda»).
 */
export function pgCheAgisce(testo: string, nomi: readonly string[]): string | null {
  for (const frase of testo.split(/(?<=[.!?…;:])\s+/)) {
    for (const n of nomi) {
      const nome = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const soggetto = new RegExp(`(?:^|[,]\\s+|\\b(?:e|ed|poi|allora|ma|quando|mentre)\\s+)${nome}(?![\\p{L}\\p{N}])(?!\\s*,)\\s+(?:e\\s+\\p{Lu}\\p{L}*\\s+)?(?:non\\s+)?(?:(?:si|ci|ne|lo|la|li|le|gli|vi|mi|ti)\\s+)?\\p{Ll}`, 'iu');
      if (soggetto.test(frase.trim())) return frase.trim();
    }
  }
  return null;
}

/** Legge le battute col caricatore vero; quelle con errori si tolgono e si riprova una volta. */
function carica(pulite: Record<string, unknown>[], c: Campagna, scartate: EsitoValidazione['scartate']): Battuta[] {
  let restanti = pulite;
  for (let tentativo = 0; tentativo < 2 && restanti.length; tentativo++) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sceneggiatore-'));
    try {
      fs.writeFileSync(path.join(dir, FILE), YAML.stringify({ battute: restanti }));
      return caricaRepertorio(c, undefined, dir).battute;
    } catch (err) {
      if (!(err instanceof ErroreRepertorio)) throw err;
      const colpevoli = new Set<number>();
      for (const e of err.errori) {
        const perPosto = new RegExp(`${FILE}#(\\d+)`).exec(e);
        const k = perPosto ? Number(perPosto[1]) - 1 : restanti.findIndex((b) => e.startsWith(`${String(b['id'])}:`));
        if (k >= 0) colpevoli.add(k);
      }
      if (!colpevoli.size) {
        for (const b of restanti) scartate.push({ id: String(b['id']), motivo: err.errori[0] ?? 'repertorio non valido' });
        return [];
      }
      for (const k of colpevoli) scartate.push({ id: String(restanti[k]!['id']), motivo: err.errori.find((e) => e.includes(`#${k + 1}`) || e.startsWith(`${String(restanti[k]!['id'])}:`)) ?? 'non valida' });
      restanti = restanti.filter((_, k) => !colpevoli.has(k));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  return [];
}
