/**
 * Campagna caricata in memoria (F0). I dati grezzi YAML restano disponibili (`dati`) perché
 * il compilatore di contesto li rende per il narratore; i campi tipizzati sono quelli che
 * il motore usa davvero (voci, nomi, apertura, atmosfera).
 */

export type DatiYaml = Record<string, unknown>;

export interface PngCaricato {
  /** Id = nome del file senza .yaml (es. png_ottavia): è l'etichetta del narratore. */
  id: string;
  nome: string;
  /** voce.tts.voce_id della scheda; 'narratore' se manca (con errore nel log). */
  voce_id: string;
  dati: DatiYaml;
  /**
   * Scheda con `nascosto: true` (richiesta 2 del 9 novembre): è in scena per il Motore, ma non si mostra
   * al proiettore né al telefono finché non ha parlato o il master non lo rivela. Assente = false.
   */
  nascosto?: boolean;
}

export interface PgCaricato {
  id: string;
  nome: string;
  /** Una riga per il telefono: specie, classe, aspetto. */
  descrizione: string;
  /** Scheda senza `conoscenze_private` (quelle non vanno mai al narratore). */
  pubblico: DatiYaml;
  /** Conoscenze private: solo per il telefono di quel giocatore. */
  privato: unknown[];
}

export interface ScenaCaricata {
  id: string;
  titolo: string;
  /** Frasi lette dal narratore all'avvio: riassunto della sessione + apertura della scena. */
  apertura: string[];
  /** musica.tag della scena (per lo sfondo dello schermo). */
  umore: string;
  intensita: number | null;
  png_presenti: string[];
  /**
   * Il ritorno in una scena già visitata (playtest di nozze-neve: tornando in casera si rileggeva
   * l'apertura col riassunto di sessione). `battuta`: id di una battuta del repertorio da far dire
   * (modalità B, se è ancora disponibile; `rientro: tr_casera` nella scheda); `frasi`: il testo
   * `rientro` della scheda, o la prima frase della sua apertura (riserva anche per la battuta).
   */
  rientro: { battuta: string | null; frasi: string[] };
  dati: DatiYaml;
}

export interface Campagna {
  id: string;
  cartella: string;
  titolo: string;
  stile: DatiYaml;
  /** campagna.yaml senza `preparazione` (che non va al narratore). */
  campagnaNarratore: DatiYaml;
  /**
   * Scena CORRENTE. Al caricamento è la prima (scena.yaml); la regia lavora su una copia della
   * campagna con la scena in corso (vedi `conScena`), così contesto, orologi attivi e immagini
   * seguono la scena senza cambiare il resto.
   */
  scena: ScenaCaricata;
  /** Tutte le scene, nell'ordine: scena.yaml, scena_*.yaml, scene/*.yaml (come il validatore). */
  scene: ScenaCaricata[];
  png: PngCaricato[];
  pg: PgCaricato[];
  /** Testo comune a tutti i PG (pg.yaml: situazione_comune), se c'è. */
  situazioneComune: string | null;
  /** Alias minuscoli → id (nomi propri di PNG e PG), senza ambiguità. */
  alias: Record<string, string>;
  /** Avvisi raccolti durante il caricamento (anche nel log). */
  avvisi: string[];
  /**
   * Pacchetto di sessione giocato (campagne a più sessioni: sessioni/<nn>/, docs/strati.md);
   * null = one-shot, caricata come sempre.
   */
  pacchetto: PacchettoCaricato | null;
  /** Cartella delle battute (modalità B): repertorio/ del pacchetto, o della campagna in una one-shot. */
  cartellaRepertorio: string;
  /**
   * Cartella con il parole_segrete.yaml che vale (una sola): quella del pacchetto se ne ha uno, se
   * no quella della campagna. Il pacchetto sostituisce, non si unisce.
   */
  cartelleSegreti: string[];
}

/** Il pacchetto di sessione caricato. */
export interface PacchettoCaricato {
  numero: number;
  /** Nome della cartella («02»). */
  etichetta: string;
  cartella: string;
  /** sessione.yaml → titolo, o «Sessione 02». */
  titolo: string;
}

export const ID_NARRATORE = 'narratore';
export const NOME_NARRATORE = 'Narratore';

/** La stessa campagna con un'altra scena corrente (copia superficiale: il resto è condiviso). */
export function conScena(c: Campagna, idScena: string): Campagna {
  const scena = c.scene.find((s) => s.id === idScena);
  if (!scena) throw new Error(`scena inesistente: ${idScena}`);
  return scena === c.scena ? c : { ...c, scena };
}
