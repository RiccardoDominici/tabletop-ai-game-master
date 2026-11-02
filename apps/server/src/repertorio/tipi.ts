/**
 * Repertorio di battute pre-scritte (docs/repertorio.md): pezzi di dialogo e narrazione scritti
 * prima da un modello forte, ciascuno con condizioni (`richiede`) ed effetti sullo stato. In
 * modalità «repertorio» Haiku li sceglie con la riga `[usa] <id>` e improvvisa solo i raccordi.
 */

export const TIPI_BATTUTA = [
  'menzogna',
  'verita',
  'confessione',
  'reazione',
  'rifiuto',
  'richiesta',
  'saluto',
  'indizio',
  'segno_orologio',
  'momento',
  'transizione',
  'finale',
] as const;
export type TipoBattuta = (typeof TIPI_BATTUTA)[number];

/** Una riga del protocollo del narratore: `[etichetta] testo`. */
export interface RigaBattuta {
  /** 'narratore' oppure id_png. */
  etichetta: string;
  testo: string;
}

export interface Richiede {
  indizi_rivelati: string[];
  indizi_non_rivelati: string[];
  battute_usate: string[];
  battute_non_usate: string[];
  /** Segni già mostrati dell'orologio, estremi inclusi. */
  orologio: { id: string; min: number; max: number } | null;
}

export interface Effetti {
  rivela_indizi: string[];
  menzogna_detta: string | null;
  fatti_noti: string[];
  avanza_orologio: string | null;
}

export interface Battuta {
  id: string;
  /** 'narratore' oppure id_png. */
  chi: string;
  tipo: TipoBattuta;
  /** ≤ 15 parole, senza segreti: è ciò che vede il selettore. */
  quando: string;
  temi: string[];
  richiede: Richiede;
  /** Testo principale (primo uso). */
  testo: RigaBattuta[];
  /** Altre versioni, per gli usi successivi, nell'ordine. */
  varianti: RigaBattuta[][];
  effetti: Effetti;
  max_usi: number;
  /** File di provenienza (per gli errori). */
  file: string;
}

export interface Repertorio {
  battute: Battuta[];
  perId: Map<string, Battuta>;
  /** Avvisi non bloccanti (anche nel log). */
  avvisi: string[];
}
