/**
 * Un turno di narrazione: chiama il narratore in streaming, passa ogni delta al parser del
 * protocollo, manda ogni frase completa alla pipeline della voce (subito, senza aspettare la
 * fine della risposta) e registra le misure lato LLM. Non decide cosa succede dopo: restituisce
 * l'invito alla regia.
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
  segmento: number;
  indice: number;
}

export interface EsitoTurnoNarrato {
  invito: string[] | 'tutti' | null;
  esito: EsitoNarrazione | null;
  frasi: number;
  anomalie: number;
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
}

/** Voce e nome da mostrare per un'etichetta del narratore. */
export function voceDi(campagna: Campagna, etichetta: string): { voce_id: string; nome: string } {
  if (etichetta === ID_NARRATORE) return { voce_id: ID_NARRATORE, nome: NOME_NARRATORE };
  const png = campagna.png.find((p) => p.id === etichetta);
  return png ? { voce_id: png.voce_id, nome: png.nome } : { voce_id: ID_NARRATORE, nome: NOME_NARRATORE };
}

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
  let anomalie = 0;
  let invito: string[] | 'tutti' | null = null;

  const gestisci = (eventi: EventoNarratore[]): void => {
    for (const e of eventi) {
      if (e.tipo === 'frase') {
        if (p.signal.aborted) return;
        p.misuratore.segna('llm_prima_frase', p.ora());
        const { voce_id, nome } = voceDi(campagna, e.etichetta);
        const frase: FraseDaDire = {
          id_frase: `t${p.turno}-f${indice}`,
          turno: p.turno,
          indice,
          parlante: e.etichetta,
          nome,
          voce_id,
          testo: e.testo,
        };
        p.onFrase({ etichetta: e.etichetta, nome, testo: e.testo, segmento: e.segmento, indice });
        pipeline.accoda(frase);
        indice += 1;
      } else if (e.tipo === 'invito') {
        invito = e.invitati;
        log.info({ turno: p.turno, invito: e.invitati, grezzo: e.grezzo }, 'narratore: invito');
      } else {
        anomalie += 1;
        // Il contratto chiede che le deviazioni dal protocollo finiscano nel log come errori.
        log.error({ turno: p.turno, codice: e.codice, dettaglio: e.dettaglio }, 'narratore: protocollo non rispettato');
      }
    }
  };

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
    return { invito, esito, frasi: indice, anomalie, errore: null, interrotto: false };
  } catch (err) {
    const interrotto = p.signal.aborted;
    if (!interrotto) log.error({ turno: p.turno, err: (err as Error).message, nome: (err as Error).name }, 'narratore: chiamata fallita');
    // Le frasi già arrivate sono valide: si chiude il parser per non perdere l'ultima.
    if (!interrotto) gestisci(parser.chiudi());
    p.misuratore.imposta('llm_fine', p.ora());
    return { invito, esito: null, frasi: indice, anomalie, errore: interrotto ? null : (err as Error).message, interrotto };
  }
}
