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
  dati: DatiYaml;
}

export interface Campagna {
  id: string;
  cartella: string;
  titolo: string;
  stile: DatiYaml;
  /** campagna.yaml senza `preparazione` (che non va al narratore). */
  campagnaNarratore: DatiYaml;
  scena: ScenaCaricata;
  png: PngCaricato[];
  pg: PgCaricato[];
  /** Testo comune a tutti i PG (pg.yaml: situazione_comune), se c'è. */
  situazioneComune: string | null;
  /** Alias minuscoli → id (nomi propri di PNG e PG), senza ambiguità. */
  alias: Record<string, string>;
  /** Avvisi raccolti durante il caricamento (anche nel log). */
  avvisi: string[];
}

export const ID_NARRATORE = 'narratore';
export const NOME_NARRATORE = 'Narratore';
