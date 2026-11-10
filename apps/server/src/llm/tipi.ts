/**
 * Interfaccia del narratore LLM, così il motore dei turni non dipende dall'SDK:
 * in produzione Haiku 5.5 (llm/haiku.ts), nei test un copione finto (llm/finto.ts).
 */
import type { Costo, UsoToken } from './costi';

export interface RichiestaNarrazione {
  turno: number;
  /** Blocchi di sistema STABILI, nell'ordine: prompt del narratore, contesto della campagna. */
  sistema: string[];
  /** Messaggio utente del turno (trascrizione + azioni). */
  messaggio: string;
  signal: AbortSignal;
  /**
   * Il turno come DATI, per chi non legge il testo (il lettore minimo): lo stesso oggetto da cui
   * narrazione/messaggio.ts compila `messaggio`, così non dipende dalla lingua dei titoli. Assente
   * (riassunto, strumenti) = vale solo il testo.
   */
  dati?: DatiTurnoLettore;
}

/**
 * Ciò che il lettore minimo usa del turno: un sottoinsieme di `DatiMessaggioTurno` (narrazione/messaggio.ts),
 * più il segno della chiamata di riparazione. Le righe di repertorio sono nel formato del protocollo
 * («- id · chi · tipo · quando», «[usa] id > pg»), uguale in ogni lingua.
 */
export interface DatiTurnoLettore {
  /** Azioni del turno nell'ordine di risoluzione; `testo: null` = il PG ha passato. */
  azioni: ReadonlyArray<{ id_pg: string; nome: string; testo: string | null; privata?: boolean }>;
  repertorio?: {
    /** Una riga per azione: «- pg_x (Nome): [usa] id > pg_x …». */
    indicate?: readonly string[];
    /** Il catalogo del turno, una battuta per riga. */
    battuteDisponibili: string;
    /** Le battute d'attesa, una per riga. */
    attesa?: string;
  };
  /** Chiamata di riparazione (azioni rimaste senza risposta): il lettore minimo non improvvisa niente. */
  riparazione?: boolean;
}

export interface EsitoNarrazione {
  testo: string;
  modello: string;
  stopReason: string | null;
  uso: UsoToken;
  costo: Costo;
  idMessaggio: string | null;
}

/** Chi narra: Haiku (Anthropic), un modello compatibile OpenAI (locale o in rete), il lettore minimo, il copione finto. */
export type NomeNarratore = 'haiku' | 'anthropic' | 'locale' | 'openrouter' | 'openai' | 'minimo' | 'finto';

export interface AzionePreclassifica {
  id_pg: string;
  nome: string;
  testo: string;
  privata: boolean;
}

export interface Narratore {
  readonly nome: NomeNarratore;
  readonly modello: string;
  /**
   * Narra in streaming: `onTesto` riceve ogni delta di testo appena arriva.
   * La promessa si risolve a stream finito (o rifiuta se interrotto o in errore).
   */
  narra(richiesta: RichiestaNarrazione, onTesto: (delta: string) => void): Promise<EsitoNarrazione>;
  /**
   * Facoltativo (lettore minimo): classifica un'azione appena inviata, in sottofondo, col catalogo che il
   * Motore le darebbe adesso; alla chiusura la scelta è già pronta. Un'azione modificata si riclassifica.
   */
  preclassifica?(azione: AzionePreclassifica, catalogo: { indicate: string[]; righe: Map<string, string> }): void;
  /** L'azione di quel PG è stata ritirata: la classificazione in corso si butta. */
  annullaPreclassifica?(id_pg: string): void;
  /** Scrive in cache i blocchi di sistema prima del primo turno (facoltativo). */
  preriscalda?(sistema: string[]): Promise<EsitoNarrazione | null>;
}
