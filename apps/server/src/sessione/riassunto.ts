/**
 * Riassunto della serata e «La volta scorsa…» (docs/richieste-2026-11-09.md §9, docs/strati.md
 * «Riassunto e chiusura»).
 *
 * Il materiale è SOLO ciò che il tavolo ha sentito: la trascrizione pubblica (narrazione, battute,
 * azioni pubbliche). Mai le azioni private, gli esiti `[privato]` (non entrano in trascrizione) né i
 * fatti `noto_ai_pg: false` del canone (qui il canone non entra). Il modello (Haiku, lo stesso client
 * del narratore con un altro prompt di sistema) scrive tre-cinque frasi; poi una guardia
 * deterministica con le parole segrete della campagna: una parola ancora segreta che nel materiale non
 * c'era fa scartare il testo, e si legge la riserva (un elenco di fatti detti a voce).
 *
 * Su disco: `riassunto.yaml` accanto al registro (sessioni/<nn>/ per i pacchetti, logs/registri/… per
 * le one-shot), una voce per serata chiusa.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { RiassuntoSerata, VoceTrascrizione } from '@cantastorie/shared';
import { elencoPacchetti } from '../campagna/pacchetti';
import type { Campagna } from '../campagna/tipi';
import type { Narratore } from '../llm/tipi';
import { testo } from '../lingua';
import { prompt } from '../lingua/motore';
import type { Logger } from '../logger';
import { segretiNelTesto, type ParolaSegreta, type StatoPubblico } from '../repertorio/segreti';
import { FILE_TRASCRIZIONE } from './registro';
import { yamlStabile } from './scrivi-registro';

export const FILE_RIASSUNTO = 'riassunto.yaml';
/** Caratteri di trascrizione pubblica dati al modello (le voci più recenti): basta per una serata. */
export const MAX_MATERIALE = 8000;
/** Frasi al massimo di un riassunto (la voce le legge tutte di fila). */
export const MAX_FRASI = 5;
/** Fili aperti al massimo nella schermata di fine serata. */
export const MAX_FILI = 3;
/** Attesa massima del modello per un riassunto, poi la riserva. */
export const ATTESA_MODELLO_MS = 20_000;

/** Il prompt del riassunto nella lingua dei contenuti: prompts/<codice>/riassunto.md. */
export const promptRiassunto = (): string => prompt('riassunto');

/** Righe che il tavolo ha sentito (niente righe di sistema; le private non sono in trascrizione). */
export function materialePubblico(voci: readonly VoceTrascrizione[], max = MAX_MATERIALE): string {
  const righe = voci.filter((v) => v.tipo === 'narrazione' || v.tipo === 'battuta' || v.tipo === 'azione').map((v) => `${v.tipo === 'azione' ? testo('modelli.riassunto.azione', { nome: v.nome }) : v.nome}: ${v.testo}`);
  const out: string[] = [];
  let n = 0;
  for (let i = righe.length - 1; i >= 0; i--) {
    n += righe[i]!.length + 1;
    if (n > max) break;
    out.unshift(righe[i]!);
  }
  return out.join('\n');
}

/** Il testo del modello diviso in riassunto (al massimo MAX_FRASI frasi) e fili aperti. */
export function analizzaRiassunto(grezzo: string): { testo: string; fili: string[] } {
  const fili: string[] = [];
  const corpo: string[] = [];
  for (const riga of grezzo.split('\n').map((r) => r.trim()).filter(Boolean)) {
    const filo = /^FILO:\s*(.+)$/i.exec(riga);
    if (filo) fili.push(filo[1]!.trim());
    else corpo.push(riga.replace(/^\[[^\]]+\]\s*/, '').replace(/^[-*#>]+\s*/, ''));
  }
  const frasi = corpo.join(' ').split(/(?<=[.!?…])\s+/).filter(Boolean).slice(0, MAX_FRASI);
  return { testo: frasi.join(' ').trim(), fili: fili.slice(0, MAX_FILI) };
}

/**
 * Le parole ancora segrete che il testo dice e che il materiale non conteneva: ciò che si è sentito al
 * tavolo è pubblico (anche se la campagna lo tiene in parole_segrete), il resto no.
 */
export function paroleScappate(testo: string, materiale: string, parole: ParolaSegreta[], pubblico: StatoPubblico | null): string[] {
  const nelMateriale = new Set(segretiNelTesto(materiale, parole, pubblico).map((p) => p.parola));
  return segretiNelTesto(testo, parole, pubblico).filter((p) => !nelMateriale.has(p.parola)).map((p) => p.parola);
}

/** La riserva: fatti detti a voce, senza modello. Le righe con una parola segreta si tolgono. */
export function riservaDa(o: { scene: string[]; segni: string[]; parole: ParolaSegreta[]; pubblico: StatoPubblico | null }): string {
  const righe: string[] = [];
  // Frasi della riserva: dal pacchetto della lingua (sezione `sessione.riassunto`), lette a voce.
  if (o.scene.length) righe.push(testo('sessione.riassunto.passati_da', { scene: o.scene.join(', ') }));
  for (const s of o.segni.slice(-2)) righe.push(s.endsWith('.') ? s : `${s}.`);
  const pulite = righe.filter((r) => segretiNelTesto(r, o.parole, o.pubblico).length === 0);
  return pulite.length ? pulite.join(' ') : testo('sessione.riassunto.riprende');
}

export interface EsitoRiassunto {
  testo: string;
  fili: string[];
  /** 'modello' = Haiku, passato dalla guardia; 'riserva' = l'elenco di fatti (modello assente, in errore o scartato). */
  origine: 'modello' | 'riserva';
  /** Perché la riserva (per il log). */
  motivo?: string;
}

/**
 * Scrive il riassunto col modello e lo controlla; in ogni caso restituisce qualcosa da leggere.
 * `narratore`: il client del narratore (null = solo riserva).
 */
export async function scriviRiassunto(
  o: { narratore: Narratore | null; log: Logger },
  r: { materiale: string; parole: ParolaSegreta[]; pubblico: StatoPubblico | null; riserva: string; turno: number; attesaMs?: number },
): Promise<EsitoRiassunto> {
  const riserva = (motivo: string): EsitoRiassunto => {
    o.log.warn({ motivo }, 'riassunto: si usa la riserva');
    return { testo: r.riserva, fili: [], origine: 'riserva', motivo };
  };
  if (!o.narratore) return riserva('nessun modello');
  if (!r.materiale.trim()) return riserva('trascrizione pubblica vuota');
  // Il messaggio fuori dal try: lì dentro `testo` è il testo del riassunto, non la funzione delle frasi fisse.
  const messaggio = testo('modelli.riassunto.messaggio', { materiale: r.materiale });
  const controllo = new AbortController();
  const timer = setTimeout(() => controllo.abort(new Error('tempo scaduto')), r.attesaMs ?? ATTESA_MODELLO_MS);
  try {
    const esito = await o.narratore.narra(
      { turno: r.turno, sistema: [promptRiassunto()], messaggio, signal: controllo.signal },
      () => undefined,
    );
    const { testo, fili } = analizzaRiassunto(esito.testo);
    if (!testo) return riserva('testo vuoto');
    const scappate = paroleScappate([testo, ...fili].join(' '), r.materiale, r.parole, r.pubblico);
    if (scappate.length) return riserva(`parole segrete non dette al tavolo: ${scappate.join(', ')}`);
    o.log.info({ caratteri: testo.length, fili: fili.length, costo: esito.costo }, 'riassunto: scritto dal modello');
    return { testo, fili, origine: 'modello' };
  } catch (err) {
    return riserva(`modello: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Le frasi da leggere a voce per «La volta scorsa…». */
export function frasiLaVoltaScorsa(riassunto: string): string[] {
  const t = riassunto.trim();
  const frasi = t.split(/(?<=[.!?…])\s+/).filter(Boolean);
  // «La volta scorsa.» nella lingua attiva; se il riassunto comincia già così (senza badare alle
  // maiuscole né al punto finale) non si ripete.
  const apertura = testo('sessione.riassunto.la_volta_scorsa');
  const inizio = apertura.replace(/[.!?…]+$/, '').toLowerCase();
  return t.toLowerCase().startsWith(inizio) ? frasi : [apertura, ...frasi];
}

// ------------------------------------------------------------------------------------------- file

/** Le serate scritte in un riassunto.yaml (vuoto se il file non c'è o non si legge). */
export function leggiRiassunti(cartella: string): RiassuntoSerata[] {
  const f = path.join(cartella, FILE_RIASSUNTO);
  if (!fs.existsSync(f)) return [];
  try {
    const d = YAML.parse(fs.readFileSync(f, 'utf8')) as { serate?: unknown } | null;
    return Array.isArray(d?.serate) ? (d!.serate as RiassuntoSerata[]).filter((s) => s && typeof s.testo === 'string') : [];
  } catch {
    return [];
  }
}

/** Aggiunge (o sostituisce, stessa `quando`) una serata al riassunto.yaml della cartella. */
export function scriviRiassuntoSerata(cartella: string, s: RiassuntoSerata, log?: Logger): string {
  fs.mkdirSync(cartella, { recursive: true });
  const serate = [...leggiRiassunti(cartella).filter((x) => x.quando !== s.quando), s];
  const file = path.join(cartella, FILE_RIASSUNTO);
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, yamlStabile({ serate }, '# Riassunti delle serate: solo fatti pubblici, scritti dal server a «Chiudi la sessione». Li leggono i telefoni (Diario).'), 'utf8');
  fs.renameSync(tmp, file);
  log?.info({ file, serate: serate.length }, 'riassunto della serata scritto');
  return file;
}

/** Campagna a pacchetti: le serate chiuse dei pacchetti prima di quello in gioco (per il Diario e la volta scorsa). */
export function riassuntiPrecedenti(c: Campagna): RiassuntoSerata[] {
  const corrente = c.pacchetto?.numero;
  if (corrente === undefined) return [];
  return elencoPacchetti(c.cartella)
    .filter((p) => p.numero < corrente)
    .flatMap((p) => leggiRiassunti(p.cartella));
}

/** La trascrizione pubblica del pacchetto precedente (scritta col registro), se c'è. */
export function trascrizionePrecedente(c: Campagna): VoceTrascrizione[] {
  const corrente = c.pacchetto?.numero;
  if (corrente === undefined) return [];
  const prima = elencoPacchetti(c.cartella).filter((p) => p.numero < corrente).at(-1);
  const f = prima ? path.join(prima.cartella, FILE_TRASCRIZIONE) : null;
  if (!f || !fs.existsSync(f)) return [];
  try {
    const d = YAML.parse(fs.readFileSync(f, 'utf8')) as { voci?: unknown } | null;
    return Array.isArray(d?.voci) ? (d!.voci as VoceTrascrizione[]) : [];
  } catch {
    return [];
  }
}
