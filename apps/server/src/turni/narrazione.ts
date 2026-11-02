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
 */
import type { Campagna } from '../campagna/tipi';
import { ID_NARRATORE, NOME_NARRATORE } from '../campagna/tipi';
import type { Logger } from '../logger';
import type { EsitoNarrazione, Narratore } from '../llm/tipi';
import type { MisuratoreTurno } from '../metriche/misure';
import { ParserNarratore, type EventoNarratore } from '../narrazione/parser';
import type { FraseDaDire, PipelineVoce } from '../voce/pipeline';

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

export type EsitoUsaTurno = { ok: true; righe: RigaPronta[]; versione: number } | { ok: false; motivo: string };

/** Voce dell'uscita del turno, nell'ordine di ascolto. */
export type VoceUscita =
  | { tipo: 'usa'; id: string; per: string | null; versione: number; righe: Array<{ etichetta: string; testo: string }> }
  | { tipo: 'usa_rifiutato'; id: string; per: string | null; motivo: string }
  | { tipo: 'improvvisata'; etichetta: string; testo: string };

export interface EsitoTurnoNarrato {
  invito: string[] | 'tutti' | null;
  /** Id proposti con [orologio] (li valida la regia). */
  orologi: string[];
  esito: EsitoNarrazione | null;
  frasi: number;
  /** Deviazioni dal protocollo (già nel log), per il registro delle narrazioni. */
  anomalie: Array<{ codice: string; dettaglio: string }>;
  /** Uscita del turno in ordine (righe pre-scritte, improvvisate, [usa] rifiutati). */
  uscita: VoceUscita[];
  righe_prescritte: number;
  righe_improvvisate: number;
  usa_rifiutati: number;
  /** Errore del narratore (non per interruzione). */
  errore: string | null;
  interrotto: boolean;
}

export interface ParametriTurno {
  turno: number;
  sistema: string[];
  messaggio: string;
  signal: AbortSignal;
  misuratore: MisuratoreTurno;
  ora: () => number;
  /** Ogni frase, per la trascrizione pubblica. */
  onFrase: (frase: FraseNarrata) => void;
  /** Testo per la voce (nomi con gli accenti di pronuncia). */
  pronuncia: (testo: string) => string;
  /** Modalità repertorio: fa uscire una battuta (null = `[usa]` non ammesso in questa modalità). */
  usa?: ((id: string, per: string | null) => EsitoUsaTurno) | null;
  /** Prefisso degli id delle frasi (le risposte di riparazione non devono collidere). */
  prefissoFrasi?: string;
  /** Anomalie da non registrare (es. l'invito mancante in una risposta di riparazione). */
  ignora?: ReadonlySet<string>;
}

/** Voce e nome da mostrare per un'etichetta del narratore. */
export function voceDi(campagna: Campagna, etichetta: string): { voce_id: string; nome: string } {
  if (etichetta === ID_NARRATORE) return { voce_id: ID_NARRATORE, nome: NOME_NARRATORE };
  const png = campagna.png.find((p) => p.id === etichetta);
  return png ? { voce_id: png.voce_id, nome: png.nome } : { voce_id: ID_NARRATORE, nome: NOME_NARRATORE };
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
  const uscita: VoceUscita[] = [];
  /** Riga improvvisata in corso (per segmento del parser). */
  let rigaAperta: { segmento: number; voce: Extract<VoceUscita, { tipo: 'improvvisata' }> } | null = null;
  let righePrescritte = 0;
  let righeImprovvisate = 0;
  let usaRifiutati = 0;
  let invito: string[] | 'tutti' | null = null;
  const orologi: string[] = [];

  const accoda = (f: Omit<FraseDaDire, 'id_frase' | 'turno' | 'indice'>): void => {
    p.misuratore.segna('llm_prima_frase', p.ora());
    pipeline.accoda({ ...f, id_frase: `t${p.turno}-${p.prefissoFrasi ?? 'f'}${indice}`, turno: p.turno, indice });
    indice += 1;
  };

  const gestisci = (eventi: EventoNarratore[]): void => {
    for (const e of eventi) {
      if (p.signal.aborted) return;
      if (e.tipo === 'frase') {
        const { voce_id, nome } = voceDi(campagna, e.etichetta);
        p.onFrase({ etichetta: e.etichetta, nome, testo: e.testo, segmento: e.segmento, indice });
        const perVoce = p.pronuncia(e.testo);
        accoda({ parlante: e.etichetta, nome, voce_id, testo: e.testo, ...(perVoce !== e.testo ? { testo_voce: perVoce } : {}) });
        if (rigaAperta && rigaAperta.segmento === e.segmento) rigaAperta.voce.testo += ` ${e.testo}`;
        else {
          const voce = { tipo: 'improvvisata' as const, etichetta: e.etichetta, testo: e.testo };
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
        uscita.push({ tipo: 'usa', id: e.id, per: e.per, versione: esito.versione, righe: esito.righe.map((r) => ({ etichetta: r.etichetta, testo: r.testo })) });
        for (const r of esito.righe) {
          const { voce_id, nome } = voceDi(campagna, r.etichetta);
          p.onFrase({ etichetta: r.etichetta, nome, testo: r.testo, segmento: segmentoBattuta++, indice, battuta: e.id });
          accoda({ parlante: r.etichetta, nome, voce_id, testo: r.testo, testo_voce: r.testo_voce, chiave_cache: r.chiave_cache });
          righePrescritte += 1;
        }
        log.info({ turno: p.turno, battuta: e.id, versione: esito.versione, righe: esito.righe.length }, 'repertorio: battuta uscita');
      } else if (e.tipo === 'orologio') {
        orologi.push(e.id);
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

  const risultato = (esito: EsitoNarrazione | null, errore: string | null, interrotto: boolean): EsitoTurnoNarrato => ({
    invito,
    orologi,
    esito,
    frasi: indice,
    anomalie,
    uscita,
    righe_prescritte: righePrescritte,
    righe_improvvisate: righeImprovvisate,
    usa_rifiutati: usaRifiutati,
    errore,
    interrotto,
  });

  try {
    const esito = await narratore.narra(
      { turno: p.turno, sistema: p.sistema, messaggio: p.messaggio, signal: p.signal },
      (delta) => {
        p.misuratore.segna('llm_primo_token', p.ora());
        gestisci(parser.aggiungi(delta));
      },
    );
    gestisci(parser.chiudi());
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
    if (!interrotto) gestisci(parser.chiudi());
    p.misuratore.imposta('llm_fine', p.ora());
    return risultato(null, interrotto ? null : (err as Error).message, interrotto);
  }
}
