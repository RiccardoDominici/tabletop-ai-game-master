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
  // Chiusura della SERATA (non della scena): la dice il Motore a «Chiudi la sessione», mai il selettore.
  'chiusura',
] as const;
export type TipoBattuta = (typeof TIPI_BATTUTA)[number];

/** Una riga del protocollo del narratore: `[etichetta] testo`. */
export interface RigaBattuta {
  /** 'narratore' oppure id_png. */
  etichetta: string;
  testo: string;
}

/** Condizioni sullo stato della scena (indizi, battute, orologio), tutte vere. */
export interface CondizioniStato {
  indizi_rivelati: string[];
  indizi_non_rivelati: string[];
  battute_usate: string[];
  battute_non_usate: string[];
  /** Segni già mostrati dell'orologio, estremi inclusi. */
  orologio: { id: string; min: number; max: number } | null;
}

/** Un'alternativa di `richiede.oppure`: le stesse chiavi di `richiede`, senza `oppure` annidati. */
export interface AlternativaRichiede extends CondizioniStato {
  /** null = non detto: vale quello della base. */
  privata: boolean | null;
  da_pg: string[];
  /** null = non detto: vale quello della base. */
  prova: string | null;
}

export interface Richiede extends CondizioniStato {
  /**
   * true: la battuta risponde solo a un'azione segnata PRIVATA dal telefono (es. una confessione
   * «dove Baldrin non sente»). Assente o false: solo ad azioni pubbliche (come tutte le altre).
   */
  privata: boolean;
  /** Se non vuota: la battuta risponde solo alle azioni di questi PG («quando Assenzio le chiede…»). */
  da_pg: string[];
  /**
   * Cancello sul tiro (docs/prove.md, «Repertorio»): la battuta risponde solo a un'azione che ha
   * superato questa prova. Il valore è un'abilità o una caratteristica (`persuasione`, `forza`),
   * l'id di una prova della scena (`p_cassetta`), oppure `prova` / `salvezza` / `attacco` (una
   * qualsiasi riuscita di quel tipo). null = nessun cancello.
   */
  prova: string | null;
  /**
   * Alternative (docs/repertorio.md, «Proposte per il Motore»): la battuta è disponibile se valgono
   * le condizioni di base E almeno un'alternativa. I cancelli sull'azione valgono per l'alternativa
   * scelta. Vuota = solo la base.
   */
  oppure: AlternativaRichiede[];
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
  /** B2: non è selezionabile; le sue righe vanno nel contesto come esempi della voce del PNG. */
  solo_esempio: boolean;
  /** B2: mossa senza azione (il cane, il tempo che passa…): in catalogo solo allo stallo. */
  riempitivo: boolean;
  /** Campagne con più scene: la battuta vale solo in queste scene (`scena: id` o una lista; vuota = in tutte). */
  scene: string[];
  /**
   * Segnali audio quando la battuta esce (docs/audio.md): `umore` (vocabolario chiuso, o `auto`)
   * cambia la musica; `effetto` (tag, es. campana) parte con la prima riga. null = nessuno.
   */
  audio: { umore?: string; effetto?: string } | null;
  /** File di provenienza (per gli errori). */
  file: string;
}

export interface Repertorio {
  battute: Battuta[];
  perId: Map<string, Battuta>;
  /** Avvisi non bloccanti (anche nel log). */
  avvisi: string[];
}
