/**
 * Ciò che una sessione salva nel registro e come lo stato si ricostruisce dagli eventi.
 *
 * Tipi di evento (tabella `eventi`, docs/architettura.md «Motore»):
 * - `inizio`             {campagna, modo, scena}: la sessione comincia (apertura letta dal proiettore);
 * - `fotografia`         FotografiaSessione: lo stato del gioco a un punto stabile (fine di un turno,
 *                        narrazione fermata, comando del master). Tutto tranne trascrizione e azioni;
 * - `trascrizione_turno` {turno, voci}: le voci pubbliche di un turno, scritte quando il turno è chiuso
 *                        (nella stessa transazione della fotografia: tutto o niente);
 * - `tavolo`             StatoTavoloSalvato: azioni dei giocatori e finestra, a ogni cambiamento;
 * - `privati_turno`     {turno, esiti}: gli esiti privati di un turno (`[privato pg_x]`), solo per i
 *                        telefoni dei loro PG: tornano a quei telefoni dopo una ripresa;
 * - `dispositivo`        {dispositivo, id_pg}: il telefono di un giocatore e il suo PG (id_pg null:
 *                        il master l'ha dimenticato dal pannello).
 *
 * La ricostruzione è un fold puro (ricostruisci): l'ultima fotografia, l'ultima versione di ogni
 * turno della trascrizione, l'ultimo stato del tavolo, l'ultimo PG di ogni dispositivo.
 */
import type { EsitoPrivato, FaseScena, NotaRegia, RiassuntoSerata, VoceTrascrizione } from '@cantastorie/shared';
import type { UmoreScelto } from '../audio/scena';
import type { Azione } from '../azioni/tipi';
import type { StatoProveSalvato } from '../prove/stato';

export interface StatoOrologioSalvato {
  pieni: number;
  ultimoTurno: number | null;
  partito: boolean;
  /** Turno della partenza per parte_dopo (assente: corre da subito, o archivio di prima). */
  partitoAl?: number;
  /** Turno da cui è attivo nella visita corrente della scena (ritmo minimo). */
  attivoDal?: number;
  /** Turni passati attivo nelle visite precedenti, dall'ultimo segno (ritmo minimo; assente = 0). */
  turniAccumulati?: number;
}

export interface StatoRepertorioSalvato {
  usi: Array<[string, number]>;
  ultimoUso: Array<[string, number]>;
  indizi: string[];
  menzogne: string[];
  fattiNoti: string[];
  fattiScoperti: string[];
}

export interface StatoTavoloSalvato {
  azioni: Azione[];
  /** id_pg → id dell'ultima azione del giocatore. */
  ultima: Array<[string, string]>;
  /** Finestra al momento della scrittura (null = nessuna). */
  /** `pronti` c'era negli archivi di prima di «Invia = pronto» (si ignora); `ritmo` assente = calmo. */
  finestra: { turno: number; invitati: string[]; invitoATutti: boolean; aperta: boolean; ritmo?: 'calmo' | 'concitato'; pronti?: string[] } | null;
  ultimoTurno: number;
  versioneScena: number;
  prossimoId: number;
  inPausa: boolean;
}

export interface FotografiaSessione {
  /** Fase al momento della fotografia (finestra, pausa, apertura, fermata…). */
  fase: FaseScena;
  turno: number;
  versioneScena: number;
  scena: string;
  luogo: string;
  situazione: { id: string; url: string; auto: boolean; turno: number } | null;
  situazioniMostrate: string[];
  umore: UmoreScelto | null;
  orologi: Record<string, StatoOrologioSalvato>;
  repertorio: StatoRepertorioSalvato | null;
  note: { elenco: NotaRegia[]; prossimoId: number };
  /** `automatica` c'era negli archivi di prima (pausa dopo gli stalli, tolta): si ignora. */
  pausa: { richiesta: boolean; invitoSospeso: string[] | 'tutti' | null; automatica?: boolean };
  /** Ritmo del tavolo (assente negli archivi di prima = calmo). */
  ritmo?: 'calmo' | 'concitato';
  prossimoIdTrascrizione: number;
  /** Scene già visitate in questa sessione: tornandoci si legge il rientro, non l'apertura (assente negli archivi di prima). */
  sceneVisitate?: string[];
  /** Scene che hanno già avuto il loro finale (un finale per scena; assente negli archivi di prima). */
  sceneConFinale?: string[];
  /** La serata: riassunti delle serate chiuse, chiusura, durata (assente negli archivi di prima). */
  serata?: SerataSalvata;
  /** Battute e indizi usciti solo per azioni private: la guardia dei segreti non li conta come pubblici. */
  segretiPrivati?: { battute: string[]; indizi: string[] };
  /** Presenze dei PNG decise a mano dal master (true = in scena), valide per questa scena (assente = nessuna). */
  presenzeManuali?: Array<[string, boolean]>;
  /** PNG nascosti rivelati a mano dal master (assente = nessuno). */
  rivelati?: string[];
  /** Prove e dadi (docs/prove.md): punti ferita, seme e contatore dei dadi, ultime carte. Assente = senza dadi. */
  prove?: StatoProveSalvato;
}

/** Lo stato ricostruito dal registro, pronto per Regia.ripristina. */
/** La serata nella fotografia (scena/serata.ts): serate chiuse, se l'ultima è chiusa, la durata del master. */
export interface SerataSalvata {
  /** Le serate chiuse di questa sessione, in ordine. */
  riassunti: RiassuntoSerata[];
  /** L'ultima serata è stata chiusa con «Chiudi la sessione»: la ripresa comincia col suo riassunto. */
  chiusa: boolean;
  /** Durata data dal master (null = quella del brief). */
  oreMaster: number | null;
}

export interface StatoRicostruito {
  sessione: string;
  fotografia: FotografiaSessione;
  trascrizione: VoceTrascrizione[];
  /** Esiti privati dei turni chiusi (eventi `privati_turno`). */
  privati?: EsitoPrivato[];
  tavolo: StatoTavoloSalvato | null;
  dispositivi: Map<string, string>;
  /** Turno dell'ultima fotografia e ora dell'ultimo evento (per il pannello: «ripresa al turno N»). */
  ultimoEvento: string;
}

export interface EventoRegistro {
  tipo: string;
  dati: unknown;
  ts?: string;
}

/**
 * Fold degli eventi di una sessione. null se non c'è nessuna fotografia (sessione mai partita davvero:
 * non c'è niente da riprendere).
 */
export function ricostruisci(sessione: string, eventi: readonly EventoRegistro[]): StatoRicostruito | null {
  let fotografia: FotografiaSessione | null = null;
  const turni = new Map<number, VoceTrascrizione[]>();
  const privati = new Map<number, EsitoPrivato[]>();
  let tavolo: StatoTavoloSalvato | null = null;
  const dispositivi = new Map<string, string>();
  let ultimoEvento = '';
  for (const e of eventi) {
    if (e.ts) ultimoEvento = e.ts;
    const d = e.dati as Record<string, unknown>;
    switch (e.tipo) {
      case 'fotografia':
        fotografia = d as unknown as FotografiaSessione;
        break;
      case 'trascrizione_turno':
        if (typeof d['turno'] === 'number' && Array.isArray(d['voci'])) turni.set(d['turno'], d['voci'] as VoceTrascrizione[]);
        break;
      case 'privati_turno':
        if (typeof d['turno'] === 'number' && Array.isArray(d['esiti'])) privati.set(d['turno'], d['esiti'] as EsitoPrivato[]);
        break;
      case 'tavolo':
        tavolo = d as unknown as StatoTavoloSalvato;
        break;
      case 'dispositivo':
        if (typeof d['dispositivo'] === 'string' && typeof d['id_pg'] === 'string') dispositivi.set(d['dispositivo'], d['id_pg']);
        else if (typeof d['dispositivo'] === 'string' && d['id_pg'] === null) dispositivi.delete(d['dispositivo']);
        break;
      default:
        break; // inizio e tipi futuri: niente da applicare
    }
  }
  if (!fotografia) return null;
  // Solo i turni già chiusi dalla fotografia: un turno scritto dopo (impossibile nella stessa
  // transazione, ma per prudenza) non deve comparire senza il suo stato.
  const trascrizione = [...turni.entries()]
    .filter(([t]) => t <= fotografia!.turno)
    .sort(([a], [b]) => a - b)
    .flatMap(([, voci]) => voci);
  const esitiPrivati = [...privati.entries()]
    .filter(([t]) => t <= fotografia!.turno)
    .sort(([a], [b]) => a - b)
    .flatMap(([, v]) => v);
  return { sessione, fotografia, trascrizione, ...(esitiPrivati.length ? { privati: esitiPrivati } : {}), tavolo, dispositivi, ultimoEvento };
}
