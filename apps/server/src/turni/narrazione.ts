/**
 * Un turno di narrazione: chiama il narratore in streaming, passa ogni delta al parser del
 * protocollo, manda ogni frase completa alla pipeline della voce (subito, senza aspettare la
 * fine della risposta) e registra le misure lato LLM. Non decide cosa succede dopo: restituisce
 * l'invito alla regia.
 *
 * Modalità repertorio: una riga `[usa] <id>` chiede alla regia di far uscire una battuta
 * pre-scritta (`p.usa`). Le sue righe entrano nella stessa coda della voce, nello stesso ordine,
 * con l'audio pre-generato. L'uscita del turno (`uscita`) registra in ordine righe pre-scritte,
 * righe improvvisate e `[usa]` rifiutati: serve alla trascrizione e ai conteggi dell'esperimento.
 *
 * Audio (docs/audio.md): `[umore]` ed `[effetto]` non si leggono; il segnale si attacca alla frase
 * che segue (l'effetto parte con lei sul proiettore), e l'audio di una battuta alla sua prima riga.
 * Un effetto rimasto dopo l'ultima frase suona a voce del turno finita; un umore rimasto si applica
 * subito (`cueSenzaFrase`). Vocabolario e catalogo li controlla la regia (`audio`).
 */
import type { CorrezioneEsito } from '../narrazione/guardia-esiti';
import { togliNumeriRegole } from '../narrazione/numeri-regole';
import type { Campagna } from '../campagna/tipi';
import { ID_NARRATORE, nomeNarratore } from '../campagna/tipi';
import type { Logger } from '../logger';
import type { DatiTurnoLettore, EsitoNarrazione, Narratore } from '../llm/tipi';
import type { MisuratoreTurno } from '../metriche/misure';
import { ParserNarratore, type EventoNarratore } from '../narrazione/parser';
import type { FraseDaDire, PipelineVoce } from '../voce/pipeline';
import { EspressioneTurno } from '../voce/espressione';
import type { CueAudio, Risolto } from '../audio/cue';
import { testo as testoFisso } from '../lingua';
import { linguaDettato } from '../dettato/lingua';
import { normalizza } from '../azioni/regole';
import type { EsitoGuardiaSegreti } from '../narrazione/guardia-segreti';
import { togliIdBattute } from '../narrazione/id-battute';
import { frasePerRipetizione, VerificaTurno, type Violazione } from '../coerenza/verifica';
import { annuncioBreve } from '../llm/annuncio';

export interface FraseNarrata {
  etichetta: string;
  nome: string;
  testo: string;
  /** Riga della trascrizione: le frasi con lo stesso segmento si uniscono. */
  segmento: number;
  indice: number;
  /** Viene da una battuta pre-scritta (id). */
  battuta?: string;
}

/** Una riga di una battuta pronta per la voce (la prepara la regia). */
export interface RigaPronta {
  etichetta: string;
  /** Testo mostrato (trascrizione, sottotitolo). */
  testo: string;
  /** Testo per la voce (pronuncia). */
  testo_voce: string;
  /** Chiave dell'audio pre-generato. */
  chiave_cache: string;
}

/** `per`: il PG a cui la battuta risponde davvero, se il Motore l'ha dedotto o corretto (assente = quello del [usa]). */
export type EsitoUsaTurno =
  | {
      ok: true;
      righe: RigaPronta[];
      versione: number;
      audio?: CueAudio;
      per?: string | null;
      /** La battuta risponde a un'azione PRIVATA di questo PG: le sue righe vanno solo a lui. */
      privato?: string;
    }
  | {
      ok: false;
      motivo: string;
      /** Righe da dire al posto della battuta rifiutata (la deviazione del PNG), e a chi se l'azione era privata. */
      sostituto?: Array<{ etichetta: string; testo: string }>;
      privato?: string;
    };

/** Voce dell'uscita del turno, nell'ordine di ascolto. */
export type VoceUscita =
  | {
      tipo: 'usa';
      id: string;
      per: string | null;
      versione: number;
      righe: Array<{ etichetta: string; testo: string }>;
      /** Aggiunta dal Motore (es. segno d'orologio dovuto e dimenticato), non scritta dal modello. */
      motore?: boolean;
    }
  | { tipo: 'usa_rifiutato'; id: string; per: string | null; motivo: string }
  /** `frasi`: id delle frasi mandate alla voce; `segmento`: la riga della trascrizione. */
  /** `motore`: righe dette dal Motore (fatti dello scontro che la narrazione non aveva detto), non dal modello. */
  /** `attribuita`: the Engine's announcement of a player's action (llm/annuncio.ts): the player's words, not narration. */
  | { tipo: 'improvvisata'; etichetta: string; testo: string; frasi?: string[]; segmento?: number; privato?: string; motore?: boolean; attribuita?: boolean };

export interface EsitoTurnoNarrato {
  invito: string[] | 'tutti' | null;
  /** Id proposti con [orologio] (li valida la regia). */
  orologi: string[];
  /** Attitude changes proposed with [atteggiamento] (the director checks them: docs/mondo.md §4). */
  atteggiamenti: Array<{ png: string; pg: string; stato: string }>;
  /** Presence changes the narrator proposed ([esce]/[entra], docs/coerenza.md §1): the director checks them. */
  presenze: Array<{ png: string; presente: boolean; verso: string | null }>;
  /** Minor characters the narrator brought in with [nuovo png] (mode A, docs/coerenza.md): the director registers them. */
  nuoviPng: Array<{ nome: string; ruolo: string | null }>;
  /** Ritmo chiesto con [ritmo] (vale l'ultima riga), null se il narratore non l'ha detto. */
  ritmo: 'concitato' | 'calmo' | null;
  esito: EsitoNarrazione | null;
  frasi: number;
  /** Deviazioni dal protocollo (già nel log), per il registro delle narrazioni. */
  anomalie: Array<{ codice: string; dettaglio: string }>;
  /** Uscita del turno in ordine (righe pre-scritte, improvvisate, [usa] rifiutati). */
  uscita: VoceUscita[];
  righe_prescritte: number;
  righe_improvvisate: number;
  usa_rifiutati: number;
  /** Frasi scartate prima della voce perché fuori dalla finzione (mosse contro lo stallo). */
  scartate: number;
  /** Frasi improvvisate di PNG che non sono nella scena (`presenti`), scartate prima della voce. */
  scartate_assenti: number;
  /** Frasi improvvisate pubbliche fermate dalla guardia dei segreti (spostate al telefono o sostituite). */
  scartate_segreti: number;
  /** Errore del narratore (non per interruzione). */
  errore: string | null;
  interrotto: boolean;
}

export interface ParametriTurno {
  turno: number;
  /** Id delle battute del repertorio: se un id compare tra parentesi nel testo, si toglie (narrazione/id-battute.ts). */
  idBattute?: ReadonlySet<string>;
  sistema: string[];
  messaggio: string;
  /** Il turno come dati (lo stesso oggetto del messaggio), per il lettore minimo: non legge il testo. */
  dati?: DatiTurnoLettore;
  signal: AbortSignal;
  misuratore: MisuratoreTurno;
  ora: () => number;
  /** Ogni frase, per la trascrizione pubblica. */
  onFrase: (frase: FraseNarrata) => void;
  /**
   * Una frase privata (`[privato pg_x]`, o una battuta che risponde a un'azione privata): va solo al
   * telefono di quel PG, mai nella trascrizione pubblica. Senza questo gancio la frase si scarta.
   */
  onPrivato?: (frase: FraseNarrata & { id_pg: string }) => void;
  /** Testo per la voce (nomi con gli accenti di pronuncia). */
  pronuncia: (testo: string) => string;
  /** Modalità repertorio: fa uscire una battuta (null = `[usa]` non ammesso in questa modalità). */
  usa?: ((id: string, per: string | null) => EsitoUsaTurno) | null;
  /** Prefisso degli id delle frasi (le risposte di riparazione non devono collidere). */
  prefissoFrasi?: string;
  /** Anomalie da non registrare (es. l'invito mancante in una risposta di riparazione). */
  ignora?: ReadonlySet<string>;
  /** Righe [umore]/[effetto]: la regia controlla il tag (vocabolario chiuso, catalogo della campagna). */
  audio?: { umore(tag: string): Risolto<string | null>; effetto(tag: string): Risolto<string> };
  /** Un [umore]/[effetto] scartato (tag sconosciuto o assente dal catalogo): per il registro del master. */
  cueRifiutato?: (tipo: 'umore' | 'effetto', tag: string, motivo: string) => void;
  /** Un umore scritto dopo l'ultima frase: non ha una frase a cui legarsi, si applica subito. */
  cueSenzaFrase?: (cue: CueAudio) => void;
  /**
   * Guardia: il motivo per scartare una frase improvvisata prima della voce (null = la frase va).
   * La usa la regia nelle mosse contro lo stallo (narrazione/finzione.ts).
   */
  scartaFrase?: (testo: string) => string | null;
  /**
   * Guardia delle azioni private (narrazione/privato.ts): il PG al cui telefono spostare una frase
   * pubblica che racconta la sua azione privata, o la riga di un PNG che risponde a quella
   * (`etichetta` = chi parla; null = la frase resta al tavolo).
   */
  spostaPrivata?: (testo: string, segmento: number, etichetta: string) => { id_pg: string; comuni: string[] } | null;
  /**
   * PNG nella scena in corso (`png_presenti`): una riga improvvisata `[png_x]` di un PNG che non c'è si
   * scarta prima della voce, con una riga di log (assente = nessun filtro).
   */
  presenti?: ReadonlySet<string>;
  /**
   * Guardia dei segreti (narrazione/guardia-segreti.ts): per una frase improvvisata PUBBLICA, che cosa
   * fare se direbbe un segreto ancora nascosto (null = la frase va). La decide la regia.
   */
  guardiaSegreti?: (etichetta: string, testo: string) => EsitoGuardiaSegreti | null;
  /**
   * Combat outcome guard (narrazione/guardia-esiti.ts): a narrator sentence that contradicts the turn's cards
   * (a standing NPC falls, a miss told as a hit) is replaced by the Engine's line before the voice.
   */
  correggiEsito?: (testo: string, opz?: { prescritta?: boolean }) => CorrezioneEsito;
  /**
   * Refusal guard (narrazione/guardia-rifiuti.ts): the lines that replace a sentence where an NPC gives in after a
   * failed social check this turn, or null.
   */
  rifiutoDopoProva?: (etichetta: string, testo: string) => Array<{ etichetta: string; testo: string }> | null;
  /**
   * The sentences the table heard in the last turns (normalised): an improvised sentence said again word for word is
   * dropped (third e2e pass, bug 10: «Il mulo di Ugo sbuffa al cancello.» at T2 and T3). Repertoire lines have their own
   * pause between uses (repertorio/stato.ts).
   */
  giàSentite?: ReadonlySet<string>;
  /** Every sentence heard in this visit of the scene (R-ripetuta for catchphrases) and the NPCs' tics just heard. */
  giàSentiteVisita?: ReadonlySet<string>;
  ticVietati?: ReadonlyMap<string, readonly string[]>;
  /** What this turn's first call already said (for its repair call): repeated word for word, it is dropped. */
  detteNelTurno?: ReadonlySet<string>;
  /** Every violation the checker caught, with its rule (coerenza/verifica.ts): the director logs and counts it. */
  onViolazione?: (v: Violazione) => void;
  /** The Engine lines said in this turn, shared by its calls and by the judge (coerenza/verifica.ts, `lineeDette`). */
  lineeDette?: Set<string>;
  /**
   * The yes/no judge (coerenza/giudice.ts, docs/coerenza.md «The candidate in play»): every public narrator sentence
   * after the rules, in order; a decision replaces the sentence with the Engine's line or drops it (never a repair).
   */
  giudice?: {
    giudica(
      frase: string,
      giaToccata: boolean,
      signal?: AbortSignal,
      primaFrase?: { apri: (testo: string) => boolean },
    ): Promise<{ testo: string; regola: Violazione['regola']; motivo: string; fonte: string; ms: number; aperta?: boolean } | null>;
  } | null;
  /**
   * The targeted repair (docs/coerenza.md §3): the director asks the model to rewrite a sentence that broke a fact rule,
   * within its deadline; null = no repair (the Engine's sentence stays). Asked only when the voice has slack: never for
   * the first sentence of the answer.
   */
  ripara?: (r: { regola: string; frase: string; motivo: string; sostituto: string }) => Promise<string | null>;
  /**
   * The private reply of the audience split (docs/coerenza.md §2): every sentence and every repertoire line of this call
   * goes only to this PC's phone; invitations, clocks, attitudes, pace and audio cues of the call are ignored (the
   * public call moves the table).
   */
  soloPg?: string;
}

export { frasePerRipetizione };

/** The old anomaly code and log line of each rule (the run measures and the evidence views read them). */
function anomaliaDi(v: Violazione): { codice: string; messaggio: string } {
  const motivo = typeof v.dettaglio?.['motivo'] === 'string' ? (v.dettaglio['motivo'] as string) : null;
  if (v.azione === 'riparata') return { codice: 'riparata', messaggio: 'coherence: sentence repaired by the model, said instead of the Engine line' };
  switch (v.regola) {
    case 'R-numeri':
      return { codice: 'numeri_regole', messaggio: 'narratore: numeri delle regole a voce, tolti' };
    case 'R-esito':
    case 'R-fuori':
    case 'R-inesistente':
      return v.azione === 'aggiunta'
        ? { codice: 'creatura_inesistente', messaggio: 'coherence: who is really there, said by the Engine' }
        : v.azione === 'tolta'
        ? { codice: motivo ?? v.regola, messaggio: 'narrator: sentence contradicts the Engine, its line already said this turn: dropped' }
        : { codice: motivo ?? v.regola, messaggio: 'narrator: sentence contradicts the Engine, replaced by its line' };
    case 'R-assente':
      return { codice: 'png_assente', messaggio: 'narratore: riga di un PNG assente dalla scena, scartata' };
    case 'R-finzione':
      return { codice: 'fuori_finzione', messaggio: 'narratore: frase fuori dalla finzione, scartata' };
    case 'R-privato':
      return { codice: 'privata_al_tavolo', messaggio: "narratore: riga al tavolo sull'azione privata di un PG, spostata al suo telefono" };
    case 'R-segreto':
      return v.azione === 'spostata'
        ? { codice: 'segreto_al_tavolo', messaggio: 'narratore: segreto in una riga al tavolo, spostata al telefono di chi ha agito in privato' }
        : { codice: 'segreto_al_tavolo', messaggio: 'narratore: segreto in una riga al tavolo, riga fermata' };
    case 'R-rifiuto':
      return { codice: 'rifiuto_dopo_prova', messaggio: 'narrator: NPC gives in after a failed social check, replaced by its refusal' };
    case 'R-ripetuta':
      return { codice: 'ripetuta', messaggio: 'narrator: sentence said word for word in the last turns, dropped' };
    case 'R-eco':
      return { codice: 'eco', messaggio: 'narrator: sentence restates a player\'s words beyond the announcement, dropped' };
    case 'R-dovuto':
      return { codice: 'fatto_dovuto', messaggio: 'prove: fatti dello scontro non detti dalla narrazione, li dice il Motore' };
  }
}

/** Voce e nome da mostrare per un'etichetta del narratore. */
export function voceDi(campagna: Campagna, etichetta: string): { voce_id: string; nome: string } {
  if (etichetta === ID_NARRATORE) return { voce_id: ID_NARRATORE, nome: nomeNarratore() };
  const png = campagna.png.find((p) => p.id === etichetta);
  return png ? { voce_id: png.voce_id, nome: png.nome } : { voce_id: ID_NARRATORE, nome: nomeNarratore() };
}

/** The language's function words (dettato/lingua.ts, `parole_comuni`), plain forms: left out of R-eco's comparison. */
function paroleVuote(): ReadonlySet<string> {
  return new Set([...linguaDettato().paroleComuni].map((w) => normalizza(w)));
}

/** I segmenti delle battute stanno in un intervallo a parte, per non unirsi alle righe improvvisate. */
const BASE_SEGMENTI_BATTUTE = 100_000;

export async function narraTurno(
  dip: { campagna: Campagna; narratore: Narratore; pipeline: PipelineVoce; log: Logger },
  p: ParametriTurno,
): Promise<EsitoTurnoNarrato> {
  const { campagna, narratore, pipeline, log } = dip;
  const parser = new ParserNarratore({
    idPng: campagna.png.map((x) => x.id),
    idPg: campagna.pg.map((x) => x.id),
    alias: campagna.alias,
  });
  let indice = 0;
  let segmentoBattuta = BASE_SEGMENTI_BATTUTE;
  const anomalie: Array<{ codice: string; dettaglio: string }> = [];
  // Voce espressiva (voce/espressione.ts): direzioni, suoni e tag di drama-3 vanno solo alla voce, mai
  // al proiettore né alla trascrizione (e quindi nemmeno nella cronologia che Haiku rilegge).
  const espressione = new EspressioneTurno((a) => {
    anomalie.push({ codice: a.codice, dettaglio: a.dettaglio });
    log.warn({ turno: p.turno, segmento: a.segmento, codice: a.codice, dettaglio: a.dettaglio }, 'narratore: markup espressivo corretto');
  });
  const uscita: VoceUscita[] = [];
  /** Riga improvvisata in corso (per segmento del parser). */
  let rigaAperta: { segmento: number; voce: Extract<VoceUscita, { tipo: 'improvvisata' }> } | null = null;
  let righePrescritte = 0;
  let righeImprovvisate = 0;
  let usaRifiutati = 0;
  let scartate = 0;
  let scartateAssenti = 0;
  let scartateSegreti = 0;
  // The coherence checker of this call (coerenza/verifica.ts): one pipeline of named rules for every sentence. Each
  // violation keeps its old anomaly code and log line (the run measures read them) and goes to the director as one
  // record with its rule (docs/coerenza.md §3).
  const segnala = (v0: Violazione): void => {
    // A private reply's violation belongs to that PC's phone, not to the table (the director's acknowledgements
    // look only at the public sentences dropped).
    const v = p.soloPg && !v0.id_pg ? { ...v0, id_pg: p.soloPg } : v0;
    if (v.regola === 'R-finzione') scartate += 1;
    if (v.regola === 'R-assente') scartateAssenti += 1;
    if (v.regola === 'R-segreto') scartateSegreti += 1;
    const vecchio = anomaliaDi(v);
    anomalie.push({ codice: vecchio.codice, dettaglio: `«${v.frase.slice(0, 120)}»${v.sostituto?.length ? ` → «${v.sostituto.join(' ')}»` : ''}` });
    log.warn({ turno: p.turno, regola: v.regola, etichetta: v.etichetta, testo: v.frase, azione: v.azione, ...(v.sostituto ? { sostituto: v.sostituto } : {}), ...(v.id_pg ? { id_pg: v.id_pg } : {}), ...(v.battuta ? { battuta: v.battuta } : {}), ...v.dettaglio }, vecchio.messaggio);
    p.onViolazione?.(v);
  };
  const verifica = new VerificaTurno(
    {
      turno: p.turno,
      ...(p.correggiEsito ? { correggiEsito: p.correggiEsito } : {}),
      ...(p.presenti ? { presenti: p.presenti } : {}),
      idPng: new Set(campagna.png.map((x) => x.id)),
      ...(p.scartaFrase ? { scartaFrase: p.scartaFrase } : {}),
      ...(p.spostaPrivata ? { spostaPrivata: p.spostaPrivata } : {}),
      ...(p.guardiaSegreti ? { guardiaSegreti: p.guardiaSegreti } : {}),
      ...(p.rifiutoDopoProva ? { rifiutoDopoProva: p.rifiutoDopoProva } : {}),
      ...(p.giàSentite ? { giàSentite: p.giàSentite } : {}),
      ...(p.giàSentiteVisita ? { giàSentiteVisita: p.giàSentiteVisita } : {}),
      ...(p.ticVietati ? { ticVietati: p.ticVietati } : {}),
      ...(p.detteNelTurno ? { detteNelTurno: p.detteNelTurno } : {}),
      ...(p.lineeDette ? { lineeDette: p.lineeDette } : {}),
      // R-eco: this turn's public actions, the language's function words (coerenza/eco.ts).
      ...(p.dati?.azioni?.length ? { eco: { azioni: p.dati.azioni.filter((a) => a.testo && !a.privata).map((a) => a.testo!), vuote: paroleVuote() } } : {}),
      nomiPg: [...new Set(campagna.pg.flatMap((x) => [x.nome, x.nome.split(/\s+/)[0] ?? '']).map(frasePerRipetizione).filter((x) => x.length > 2))],
    },
    segnala,
  );
  // The minimal reader's announcements (llm/annuncio.ts): the players' own words, attributed. A sentence inside one is
  // not the narrator's assertion: no fact rule and no judge on it (docs/coerenza.md, «After round 4»).
  const annunci = (p.dati?.azioni ?? []).filter((a) => a.testo && !a.privata).map((a) => annuncioBreve(a.nome, a.testo!, a.fuori));
  const attribuita = (t: string): boolean => {
    const x = t.trim();
    return x.length > 0 && annunci.some((a) => a.includes(x));
  };
  const idPng = new Set(campagna.png.map((x) => x.id));
  let invito: string[] | 'tutti' | null = null;
  const orologi: string[] = [];
  const atteggiamenti: Array<{ png: string; pg: string; stato: string }> = [];
  const presenze: Array<{ png: string; presente: boolean; verso: string | null }> = [];
  const nuoviPng: Array<{ nome: string; ruolo: string | null }> = [];
  let ritmo: 'concitato' | 'calmo' | null = null;
  /** Segnale audio in attesa della prossima frase. */
  let cuePendente: CueAudio | null = null;
  /** Il segnale per la prossima frase: quello in attesa unito a quello della battuta (che vince). */
  const prendiCue = (battuta?: CueAudio): CueAudio | undefined => {
    const c = cuePendente;
    cuePendente = null;
    if (!c && !battuta) return undefined;
    const origine = [c?.origine, battuta?.origine].filter(Boolean).join(' + ');
    return { ...c, ...battuta, origine };
  };
  const cueNarratore = (tipo: 'umore' | 'effetto', tag: string): void => {
    if (!p.audio) {
      log.warn({ turno: p.turno, tipo, tag }, 'audio: riga del narratore ignorata (nessun catalogo audio)');
      return;
    }
    const r = tipo === 'umore' ? p.audio.umore(tag) : p.audio.effetto(tag);
    if (!r.ok) {
      log.warn({ turno: p.turno, tipo, tag, motivo: r.motivo }, `audio: [${tipo}] ignorato`);
      p.cueRifiutato?.(tipo, tag, r.motivo);
      return;
    }
    // L'origine si mostra nel pannello del master: nella lingua dei contenuti.
    const base: CueAudio = cuePendente ?? { origine: testoFisso('audio.origine_narratore') };
    cuePendente = tipo === 'umore' ? { ...base, umore: r.valore as string | null } : { ...base, effetto: r.valore as string };
    log.info({ turno: p.turno, tipo, tag, valore: r.valore }, `audio: [${tipo}] per la prossima frase`);
  };

  const accoda = (f: Omit<FraseDaDire, 'id_frase' | 'turno' | 'indice'>): void => {
    p.misuratore.segna('llm_prima_frase', p.ora());
    pipeline.accoda({ ...f, id_frase: `t${p.turno}-${p.prefissoFrasi ?? 'f'}${indice}`, turno: p.turno, indice });
    indice += 1;
  };

  /** Stops a line and says the replacement lines in its place (secrets guard, refusal guard). */
  const sostituisci = (segmento: number, righe: ReadonlyArray<{ etichetta: string; testo: string }>): void => {
    rigaAperta = null;
    for (const r of righe) {
      const v = voceDi(campagna, r.etichetta);
      p.onFrase({ etichetta: r.etichetta, nome: v.nome, testo: r.testo, segmento, indice });
      const perVoceSost = p.pronuncia(r.testo);
      accoda({ parlante: r.etichetta, nome: v.nome, voce_id: v.voce_id, testo: r.testo, ...(perVoceSost !== r.testo ? { testo_voce: perVoceSost } : {}) });
      uscita.push({ tipo: 'improvvisata', etichetta: r.etichetta, testo: r.testo, segmento });
      righeImprovvisate += 1;
    }
  };

  /** Un id di battuta scritto tra parentesi non arriva alla voce: si toglie, e la frase che resta vuota si scarta. */
  const togliIdDalTesto = (grezzi: EventoNarratore[]): EventoNarratore[] => {
    if (!p.idBattute?.size) return grezzi;
    const out: EventoNarratore[] = [];
    for (const e of grezzi) {
      if (e.tipo !== 'frase') {
        out.push(e);
        continue;
      }
      const r = togliIdBattute(e.testo, p.idBattute);
      for (const id of r.tolti) {
        anomalie.push({ codice: 'id_battuta_in_testo', dettaglio: `[${id}] tolto dal testo: non si legge` });
        log.warn({ turno: p.turno, etichetta: e.etichetta, id }, 'narratore: id di una battuta del repertorio scritto tra parentesi, tolto (non si legge)');
      }
      if (r.tolti.length && !r.testo) continue;
      out.push(r.tolti.length ? { ...e, testo: r.testo } : e);
    }
    return out;
  };

  // The events are handled in order on one queue: a sentence that waits for its repair holds the ones after it.
  let coda: Promise<void> = Promise.resolve();
  const gestisci = (grezzi: EventoNarratore[]): void => {
    coda = coda.then(() => gestisciOra(grezzi)).catch((err: unknown) => {
      log.error({ turno: p.turno, err: (err as Error).message }, 'narratore: gestione delle frasi fallita');
    });
  };
  const gestisciOra = async (grezzi: EventoNarratore[]): Promise<void> => {
    const eventi = espressione.trasforma(togliIdDalTesto(grezzi));
    for (const e of eventi) {
      if (p.signal.aborted) return;
      if (e.tipo === 'frase') {
        // One checker, the rules in a fixed order (coerenza/verifica.ts, docs/coerenza.md §3).
        const parolePg = e.etichetta === ID_NARRATORE && attribuita(e.testo);
        let d = verifica.verifica({ etichetta: e.etichetta, testo: e.testo, voce: e.voce, segmento: e.segmento, ...(e.privato ? { privato: e.privato } : {}), ...(parolePg ? { attribuita: true } : {}) });
        if (d.tipo === 'togli') continue;
        // A fact rule broke and the voice has slack (not the first sentence): one targeted repair, within its deadline.
        if (d.tipo === 'dici' && d.riparabile && p.ripara && indice > 0 && !p.soloPg) {
          const r = d.riparabile;
          const nuova = await p.ripara({ regola: r.regola, frase: r.originale, motivo: r.motivo, sostituto: d.testo });
          if (p.signal.aborted) return;
          if (nuova && verifica.confermaRiparata(e.etichetta, r.originale, nuova, r.regola)) d = { ...d, testo: nuova, voce: nuova };
        }
        if (d.tipo === 'sostituisci') {
          sostituisci(e.segmento, d.righe);
          continue;
        }
        // The yes/no judge, on the public narrator sentences the rules left alone (it keeps its state on the others).
        if (p.giudice && !p.soloPg && !d.privato && e.etichetta === ID_NARRATORE && !parolePg) {
          const originale = e.testo;
          // Nothing of this turn in the voice yet (this call, the repair call, the Engine's lines before the narration):
          // the first sentence never waits for the answer; the judge may say the Engine's line now (docs/coerenza.md,
          // «First audio»).
          const primaFrase = !p.misuratore.ha('llm_prima_frase') && !p.misuratore.ha('voce_richiesta');
          const apertura = primaFrase
            ? {
                apri: (t: string): boolean => {
                  // Said once a turn. Heard in the last turns is no reason to keep it back: refusing it there cost 4,
                  // 4 and 1 catches on the replay sets (docs/coerenza.md, «First audio»).
                  if (!verifica.segnaLinea(t)) return false;
                  // Its own row of the transcript (not merged with the sentence): the judge's later lines see it was said.
                  sostituisci(segmentoBattuta++, [{ etichetta: ID_NARRATORE, testo: t }]);
                  return true;
                },
              }
            : undefined;
          const g = await p.giudice.giudica(d.testo, d.testo !== originale || !!d.riparabile, p.signal, apertura);
          if (p.signal.aborted) return;
          if (g?.aperta) {
            // The Engine's line was said as the opener: the sentence it stands for is dropped.
            segnala({ turno: p.turno, regola: g.regola, etichetta: e.etichetta, frase: d.testo, azione: 'sostituita', sostituto: [g.testo], dettaglio: { motivo: g.motivo, fonte: g.fonte, ms: g.ms, apertura: true } });
            continue;
          }
          if (g) {
            // Heard in the last turns, or said in this turn already (by the rules before the judge, or by the judge).
            const ripetuta = !!g.testo && (!!p.giàSentite?.has(frasePerRipetizione(g.testo)) || !verifica.segnaLinea(g.testo));
            const azione = g.testo && !ripetuta ? 'sostituita' : 'tolta';
            segnala({ turno: p.turno, regola: g.regola, etichetta: e.etichetta, frase: d.testo, azione, ...(azione === 'sostituita' ? { sostituto: [g.testo] } : {}), dettaglio: { motivo: g.motivo, fonte: g.fonte, ms: g.ms } });
            if (azione === 'tolta') continue;
            d = { ...d, testo: g.testo, voce: g.testo };
          }
        }
        e.testo = d.testo;
        e.voce = d.voce;
        const privato = p.soloPg ?? d.privato;
        const { voce_id, nome } = voceDi(campagna, e.etichetta);
        // Esito privato: al telefono di quel PG (testo, e voce solo lì); mai nella trascrizione pubblica.
        if (privato) {
          if (!p.onPrivato) {
            log.warn({ turno: p.turno, privato: privato }, 'narratore: riga privata senza destinatario, scartata');
            continue;
          }
          p.onPrivato({ etichetta: e.etichetta, nome, testo: e.testo, segmento: e.segmento, indice, id_pg: privato });
        } else {
          p.onFrase({ etichetta: e.etichetta, nome, testo: e.testo, segmento: e.segmento, indice });
        }
        const perVoce = p.pronuncia(e.voce);
        const idFrase = `t${p.turno}-${p.prefissoFrasi ?? 'f'}${indice}`;
        // Un segnale audio suonerebbe sul proiettore: resta per la prossima frase pubblica.
        const cue = privato ? undefined : prendiCue();
        accoda({ parlante: e.etichetta, nome, voce_id, testo: e.testo, ...(perVoce !== e.testo ? { testo_voce: perVoce } : {}), ...(cue ? { cue } : {}), ...(privato ? { solo_pg: privato } : {}) });
        if (rigaAperta && rigaAperta.segmento === e.segmento && (rigaAperta.voce.privato ?? null) === (privato ?? null)) {
          rigaAperta.voce.testo += ` ${e.testo}`;
          rigaAperta.voce.frasi!.push(idFrase);
          if (rigaAperta.voce.attribuita && !parolePg) delete rigaAperta.voce.attribuita;
        } else {
          const voce: Extract<VoceUscita, { tipo: 'improvvisata' }> = { tipo: 'improvvisata', etichetta: e.etichetta, testo: e.testo, frasi: [idFrase], segmento: e.segmento, ...(privato ? { privato: privato } : {}), ...(parolePg ? { attribuita: true } : {}) };
          uscita.push(voce);
          rigaAperta = { segmento: e.segmento, voce };
          righeImprovvisate += 1;
        }
      } else if (e.tipo === 'usa') {
        rigaAperta = null;
        const usata = p.usa ? p.usa(e.id, e.per) : { ok: false as const, motivo: '[usa] non ammesso in modalità improvvisa' };
        // The private reply: a line it uses goes only to that phone, whatever the line.
        const esito = p.soloPg && usata.ok ? { ...usata, privato: p.soloPg } : p.soloPg && !usata.ok ? { ...usata, privato: p.soloPg } : usata;
        if (!esito.ok) {
          usaRifiutati += 1;
          uscita.push({ tipo: 'usa_rifiutato', id: e.id, per: e.per, motivo: esito.motivo });
          // Comportamento atteso (il Motore controlla il selettore), non un errore: avviso, col motivo.
          log.warn({ turno: p.turno, battuta: e.id, per: e.per, motivo: esito.motivo }, 'repertorio: [usa] rifiutato');
          // Un rilascio fuori contesto: al suo posto la deviazione del PNG (al telefono, se l'azione era privata).
          for (const r of esito.sostituto ?? []) {
            const v = voceDi(campagna, r.etichetta);
            const fr = { etichetta: r.etichetta, nome: v.nome, testo: r.testo, segmento: segmentoBattuta++, indice };
            if (esito.privato) p.onPrivato?.({ ...fr, id_pg: esito.privato });
            else p.onFrase(fr);
            const perVoce = p.pronuncia(r.testo);
            accoda({ parlante: r.etichetta, nome: v.nome, voce_id: v.voce_id, testo: r.testo, ...(perVoce !== r.testo ? { testo_voce: perVoce } : {}), ...(esito.privato ? { solo_pg: esito.privato } : {}) });
            uscita.push({ tipo: 'improvvisata', etichetta: r.etichetta, testo: r.testo, segmento: fr.segmento, ...(esito.privato ? { privato: esito.privato } : {}) });
            righeImprovvisate += 1;
          }
          continue;
        }
        // A prewritten line can contradict the state too (docs/coerenza.md §3): its narrator rows go through the fact rules.
        const righe: RigaPronta[] = esito.privato
          ? esito.righe
          : esito.righe.flatMap((r): RigaPronta[] => {
              const v = verifica.verificaBattuta(e.id, r);
              if (v === null) return [r];
              if (v === '') return [];
              // The Engine's line: no prerecorded audio for it (an empty key is no cache).
              return [{ ...r, testo: v, testo_voce: p.pronuncia(v), chiave_cache: '' }];
            });
        uscita.push({ tipo: 'usa', id: e.id, per: esito.per !== undefined ? esito.per : e.per, versione: esito.versione, righe: righe.map((r) => ({ etichetta: r.etichetta, testo: r.testo })) });
        for (const [i, r] of righe.entries()) {
          const { voce_id, nome } = voceDi(campagna, r.etichetta);
          const fr = { etichetta: r.etichetta, nome, testo: r.testo, segmento: segmentoBattuta++, indice, battuta: e.id };
          if (esito.privato) p.onPrivato?.({ ...fr, id_pg: esito.privato });
          else p.onFrase(fr);
          // L'audio della battuta (e un segnale del narratore in attesa) va con la sua prima riga.
          const cue = i === 0 && !esito.privato ? prendiCue(esito.audio) : undefined;
          accoda({ parlante: r.etichetta, nome, voce_id, testo: r.testo, testo_voce: r.testo_voce, chiave_cache: r.chiave_cache, ...(cue ? { cue } : {}), ...(esito.privato ? { solo_pg: esito.privato } : {}) });
          righePrescritte += 1;
        }
        log.info({ turno: p.turno, battuta: e.id, versione: esito.versione, righe: righe.length }, 'repertorio: battuta uscita');
      } else if (p.soloPg && e.tipo !== 'anomalia') {
        // The private reply does not move the table: its invitation, clocks, attitudes, pace and cues are ignored.
        log.info({ turno: p.turno, tipo: e.tipo, id_pg: p.soloPg }, 'narrator: protocol line of a private reply ignored');
      } else if (e.tipo === 'orologio') {
        orologi.push(e.id);
      } else if (e.tipo === 'presenza') {
        presenze.push({ png: e.png, presente: e.presente, verso: e.verso });
        log.info({ turno: p.turno, png: e.png, presente: e.presente, verso: e.verso, grezzo: e.grezzo }, 'narrator: presence change proposed');
      } else if (e.tipo === 'nuovo_png') {
        nuoviPng.push({ nome: e.nome, ruolo: e.ruolo });
        log.info({ turno: p.turno, nome: e.nome, ruolo: e.ruolo, grezzo: e.grezzo }, 'narrator: improvised character proposed');
      } else if (e.tipo === 'atteggiamento') {
        atteggiamenti.push({ png: e.png, pg: e.pg, stato: e.stato });
        log.info({ turno: p.turno, png: e.png, pg: e.pg, stato: e.stato, grezzo: e.grezzo }, 'narrator: attitude change proposed');
      } else if (e.tipo === 'ritmo') {
        ritmo = e.ritmo;
        log.info({ turno: p.turno, ritmo: e.ritmo, grezzo: e.grezzo }, 'narratore: ritmo');
      } else if (e.tipo === 'umore' || e.tipo === 'effetto') {
        cueNarratore(e.tipo, e.tag);
      } else if (e.tipo === 'invito') {
        invito = e.invitati;
        log.info({ turno: p.turno, invito: e.invitati, grezzo: e.grezzo }, 'narratore: invito');
      } else {
        if (p.ignora?.has(e.codice)) continue;
        anomalie.push({ codice: e.codice, dettaglio: e.dettaglio });
        // Il contratto chiede che le deviazioni dal protocollo finiscano nel log come errori;
        // l'etichetta riconosciuta da un alias (senza png_, maiuscole) è solo un avviso.
        const livello = e.codice === 'etichetta_alias' ? 'warn' : 'error';
        log[livello]({ turno: p.turno, codice: e.codice, dettaglio: e.dettaglio }, 'narratore: protocollo non rispettato');
      }
    }
  };

  /** Un segnale rimasto senza frase dopo di sé: effetto a voce finita, umore subito. */
  const chiudiCue = (): void => {
    espressione.chiudi(); // fine della risposta: un tag rimasto aperto nell'ultima riga si registra
    const c = cuePendente;
    cuePendente = null;
    if (!c || p.signal.aborted) return;
    if (c.effetto) pipeline.effettoFineTurno(p.turno, c.effetto);
    if (c.umore !== undefined) p.cueSenzaFrase?.({ umore: c.umore, origine: c.origine });
    log.info({ turno: p.turno, ...c }, 'audio: segnale dopo l’ultima frase');
  };

  const risultato = (esito: EsitoNarrazione | null, errore: string | null, interrotto: boolean): EsitoTurnoNarrato => ({
    invito,
    orologi,
    atteggiamenti,
    presenze,
    nuoviPng,
    ritmo,
    esito,
    frasi: indice,
    anomalie,
    uscita,
    righe_prescritte: righePrescritte,
    righe_improvvisate: righeImprovvisate,
    usa_rifiutati: usaRifiutati,
    scartate,
    scartate_assenti: scartateAssenti,
    scartate_segreti: scartateSegreti,
    errore,
    interrotto,
  });

  try {
    const esito = await narratore.narra(
      { turno: p.turno, sistema: p.sistema, messaggio: p.messaggio, ...(p.dati ? { dati: p.dati } : {}), signal: p.signal },
      (delta) => {
        p.misuratore.segna('llm_primo_token', p.ora());
        gestisci(parser.aggiungi(delta));
      },
    );
    gestisci(parser.chiudi());
    await coda;
    chiudiCue();
    p.misuratore.imposta('llm_fine', p.ora());
    p.misuratore.impostaCosto(esito.costo);
    if (esito.stopReason && esito.stopReason !== 'end_turn') {
      log.error({ turno: p.turno, stop_reason: esito.stopReason }, 'narratore: risposta non conclusa normalmente');
    }
    return risultato(esito, null, false);
  } catch (err) {
    const interrotto = p.signal.aborted;
    if (!interrotto) log.error({ turno: p.turno, err: (err as Error).message, nome: (err as Error).name }, 'narratore: chiamata fallita');
    // Le frasi già arrivate sono valide: si chiude il parser per non perdere l'ultima.
    if (!interrotto) {
      gestisci(parser.chiudi());
      await coda;
      chiudiCue();
    }
    p.misuratore.imposta('llm_fine', p.ora());
    return risultato(null, interrotto ? null : (err as Error).message, interrotto);
  }
}
