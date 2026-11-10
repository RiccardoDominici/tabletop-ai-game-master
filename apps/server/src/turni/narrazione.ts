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
import type { EsitoGuardiaSegreti } from '../narrazione/guardia-segreti';

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
  | { ok: false; motivo: string };

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
  | { tipo: 'improvvisata'; etichetta: string; testo: string; frasi?: string[]; segmento?: number; privato?: string };

export interface EsitoTurnoNarrato {
  invito: string[] | 'tutti' | null;
  /** Id proposti con [orologio] (li valida la regia). */
  orologi: string[];
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
   * pubblica che racconta la sua azione privata (null = la frase resta al tavolo).
   */
  spostaPrivata?: (testo: string, segmento: number) => { id_pg: string; comuni: string[] } | null;
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
}

/** Voce e nome da mostrare per un'etichetta del narratore. */
export function voceDi(campagna: Campagna, etichetta: string): { voce_id: string; nome: string } {
  if (etichetta === ID_NARRATORE) return { voce_id: ID_NARRATORE, nome: nomeNarratore() };
  const png = campagna.png.find((p) => p.id === etichetta);
  return png ? { voce_id: png.voce_id, nome: png.nome } : { voce_id: ID_NARRATORE, nome: nomeNarratore() };
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
  /** Segmenti (righe) già sostituiti dalla guardia dei segreti: il resto della riga non si dice. */
  const segmentiFermati = new Set<number>();
  const idPng = new Set(campagna.png.map((x) => x.id));
  let invito: string[] | 'tutti' | null = null;
  const orologi: string[] = [];
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
    const base: CueAudio = cuePendente ?? { origine: 'narratore' };
    cuePendente = tipo === 'umore' ? { ...base, umore: r.valore as string | null } : { ...base, effetto: r.valore as string };
    log.info({ turno: p.turno, tipo, tag, valore: r.valore }, `audio: [${tipo}] per la prossima frase`);
  };

  const accoda = (f: Omit<FraseDaDire, 'id_frase' | 'turno' | 'indice'>): void => {
    p.misuratore.segna('llm_prima_frase', p.ora());
    pipeline.accoda({ ...f, id_frase: `t${p.turno}-${p.prefissoFrasi ?? 'f'}${indice}`, turno: p.turno, indice });
    indice += 1;
  };

  const gestisci = (grezzi: EventoNarratore[]): void => {
    const eventi = espressione.trasforma(grezzi);
    for (const e of eventi) {
      if (p.signal.aborted) return;
      if (e.tipo === 'frase') {
        // Numeri delle regole a voce (PF, CA, CD): via prima della voce, li mostra già la carta del tiro.
        const senzaNumeri = togliNumeriRegole(e.testo);
        if (senzaNumeri.tolti.length) {
          anomalie.push({ codice: 'numeri_regole', dettaglio: `${senzaNumeri.tolti.join(', ')}: «${e.testo.slice(0, 120)}»` });
          log.warn({ turno: p.turno, etichetta: e.etichetta, tolti: senzaNumeri.tolti, testo: e.testo }, 'narratore: numeri delle regole a voce, tolti');
          e.testo = senzaNumeri.testo;
          e.voce = togliNumeriRegole(e.voce).testo;
        }
        // Un PNG che non è nella scena non parla (playtest di nozze-neve: Zelia e Adelina rispondevano da
        // scene dove non stanno, e le loro voci erano state scelte per non trovarsi mai insieme).
        if (p.presenti && idPng.has(e.etichetta) && !p.presenti.has(e.etichetta)) {
          scartateAssenti += 1;
          anomalie.push({ codice: 'png_assente', dettaglio: `${e.etichetta} non è in questa scena: «${e.testo.slice(0, 120)}»` });
          log.warn({ turno: p.turno, etichetta: e.etichetta, testo: e.testo }, 'narratore: riga di un PNG assente dalla scena, scartata');
          continue;
        }
        const motivoScarto = p.scartaFrase?.(e.testo) ?? null;
        if (motivoScarto) {
          // Fuori dalla finzione: non si sente e non si scrive. La regia rimedia a fine turno.
          scartate += 1;
          anomalie.push({ codice: 'fuori_finzione', dettaglio: `${motivoScarto}: «${e.testo.slice(0, 120)}»` });
          log.warn({ turno: p.turno, etichetta: e.etichetta, motivo: motivoScarto, testo: e.testo }, 'narratore: frase fuori dalla finzione, scartata');
          continue;
        }
        // Una riga al tavolo che racconta l'azione privata di un PG va al suo telefono, non si scarta.
        let privato = e.privato;
        if (!privato && p.spostaPrivata) {
          const d = p.spostaPrivata(e.testo, e.segmento);
          if (d) {
            privato = d.id_pg;
            anomalie.push({ codice: 'privata_al_tavolo', dettaglio: `${d.id_pg}: «${e.testo.slice(0, 120)}»` });
            log.warn({ turno: p.turno, id_pg: d.id_pg, comuni: d.comuni, testo: e.testo }, "narratore: riga al tavolo sull'azione privata di un PG, spostata al suo telefono");
          }
        }
        // Segreto ancora nascosto in una riga al tavolo: al telefono di chi l'ha chiesto in privato, oppure
        // la deviazione del PNG al posto della riga (una volta per riga), con il log.
        if (!privato && segmentiFermati.has(e.segmento)) continue;
        const segreto = !privato && p.guardiaSegreti ? p.guardiaSegreti(e.etichetta, e.testo) : null;
        if (segreto) {
          scartateSegreti += 1;
          anomalie.push({ codice: 'segreto_al_tavolo', dettaglio: `${e.etichetta} (${segreto.parole.join(', ')}): «${e.testo.slice(0, 120)}»` });
          if (segreto.privato) {
            privato = segreto.privato;
            log.warn({ turno: p.turno, etichetta: e.etichetta, parole: segreto.parole, id_pg: privato, testo: e.testo }, 'narratore: segreto in una riga al tavolo, spostata al telefono di chi ha agito in privato');
          } else {
            segmentiFermati.add(e.segmento);
            rigaAperta = null;
            log.warn({ turno: p.turno, etichetta: e.etichetta, parole: segreto.parole, testo: e.testo, sostituto: segreto.sostituto?.map((r) => r.testo) ?? null }, 'narratore: segreto in una riga al tavolo, riga fermata');
            for (const r of segreto.sostituto ?? []) {
              const v = voceDi(campagna, r.etichetta);
              p.onFrase({ etichetta: r.etichetta, nome: v.nome, testo: r.testo, segmento: e.segmento, indice });
              const perVoceSost = p.pronuncia(r.testo);
              accoda({ parlante: r.etichetta, nome: v.nome, voce_id: v.voce_id, testo: r.testo, ...(perVoceSost !== r.testo ? { testo_voce: perVoceSost } : {}) });
              uscita.push({ tipo: 'improvvisata', etichetta: r.etichetta, testo: r.testo, segmento: e.segmento });
              righeImprovvisate += 1;
            }
            continue;
          }
        }
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
        } else {
          const voce = { tipo: 'improvvisata' as const, etichetta: e.etichetta, testo: e.testo, frasi: [idFrase], segmento: e.segmento, ...(privato ? { privato: privato } : {}) };
          uscita.push(voce);
          rigaAperta = { segmento: e.segmento, voce };
          righeImprovvisate += 1;
        }
      } else if (e.tipo === 'usa') {
        rigaAperta = null;
        const esito = p.usa ? p.usa(e.id, e.per) : { ok: false as const, motivo: '[usa] non ammesso in modalità improvvisa' };
        if (!esito.ok) {
          usaRifiutati += 1;
          uscita.push({ tipo: 'usa_rifiutato', id: e.id, per: e.per, motivo: esito.motivo });
          log.error({ turno: p.turno, battuta: e.id, per: e.per, motivo: esito.motivo }, 'repertorio: [usa] rifiutato');
          continue;
        }
        uscita.push({ tipo: 'usa', id: e.id, per: esito.per !== undefined ? esito.per : e.per, versione: esito.versione, righe: esito.righe.map((r) => ({ etichetta: r.etichetta, testo: r.testo })) });
        for (const [i, r] of esito.righe.entries()) {
          const { voce_id, nome } = voceDi(campagna, r.etichetta);
          const fr = { etichetta: r.etichetta, nome, testo: r.testo, segmento: segmentoBattuta++, indice, battuta: e.id };
          if (esito.privato) p.onPrivato?.({ ...fr, id_pg: esito.privato });
          else p.onFrase(fr);
          // L'audio della battuta (e un segnale del narratore in attesa) va con la sua prima riga.
          const cue = i === 0 && !esito.privato ? prendiCue(esito.audio) : undefined;
          accoda({ parlante: r.etichetta, nome, voce_id, testo: r.testo, testo_voce: r.testo_voce, chiave_cache: r.chiave_cache, ...(cue ? { cue } : {}), ...(esito.privato ? { solo_pg: esito.privato } : {}) });
          righePrescritte += 1;
        }
        log.info({ turno: p.turno, battuta: e.id, versione: esito.versione, righe: esito.righe.length }, 'repertorio: battuta uscita');
      } else if (e.tipo === 'orologio') {
        orologi.push(e.id);
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
      chiudiCue();
    }
    p.misuratore.imposta('llm_fine', p.ora());
    return risultato(null, interrotto ? null : (err as Error).message, interrotto);
  }
}
