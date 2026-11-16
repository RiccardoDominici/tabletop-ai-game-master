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

/**
 * The state class of a character a line assumes (`richiede.stati`, docs/repertorio.md): in play (standing, wounded,
 * hidden), down (on the ground or dying), dead, fled.
 */
export const CLASSI_STATO = ['in_gioco', 'a_terra', 'morto', 'fuggito'] as const;
export type ClasseStato = (typeof CLASSI_STATO)[number];

/**
 * The outcome a line tells (`richiede.esito`, docs/repertorio.md «Facts a line carries»): a blow that landed, missed,
 * downed its target, or a flight. `chi`: who struck or fled (an NPC); absent = the PC whose action the line answers.
 * `bersaglio`: who was struck (absent = any). The Engine offers the line only for an action whose card says so.
 */
export const TIPI_ESITO = ['colpito', 'mancato', 'a_terra', 'fugge'] as const;
export type TipoEsito = (typeof TIPI_ESITO)[number];
export interface EsitoBattuta {
  tipo: TipoEsito;
  chi: string | null;
  bersaglio: string | null;
}

export interface Richiede extends CondizioniStato {
  /** The outcome the line tells, checked against this turn's cards; null = it tells none. Only in the base. */
  esito: EsitoBattuta | null;
  /**
   * The states the line assumes, by NPC (docs/repertorio.md, «Facts a line carries»): «il corpo di Zirrà giace…»
   * assumes `{png_zirra: [a_terra, morto]}`, «Zirrà ride» `{png_zirra: [in_gioco]}`. The Engine checks them against
   * the ledger before the line enters the catalogue. Only in the base, not in an alternative. Empty = none.
   */
  stati: Record<string, ClasseStato[]>;
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
  /**
   * Stall material (docs/mondo.md §5, «Prepared stall lines»): the Engine says it at a stall move of this level, in the
   * line's scenes: 1 a soft move of the scene's danger, 2 a proactive clue (it reveals one), 3 a summary of the leads
   * the PCs know (gated on what they found). Never in the reader's catalogue nor among its waiting lines: round 4 burnt
   * every filler of the stall game as a waiting line by T6, and its one S1 at T14 found none. Absent = none.
   */
  stallo?: 1 | 2 | 3 | null;
  /** Campagne con più scene: la battuta vale solo in queste scene (`scena: id` o una lista; vuota = in tutte). */
  scene: string[];
  /**
   * Segnali audio quando la battuta esce (docs/audio.md): `umore` (vocabolario chiuso, o `auto`)
   * cambia la musica; `effetto` (tag, es. campana) parte con la prima riga. null = nessuno.
   */
  audio: { umore?: string; effetto?: string } | null;
  /**
   * NPCs who act in the line's narrator rows, besides who speaks (docs/repertorio.md, «Facts a line carries»): each
   * must be in the scene and in play for the line to be offered. null = the line has no tags (an older repertoire):
   * the Engine takes every NPC a narrator row names as acting.
   */
  attori: string[] | null;
  /** NPCs the line only talks about (no presence asked): they are not taken as acting. */
  menzionati: string[];
  /**
   * Engine-only (the sceneggiatore's `subito`): the last turn whose actions the line may answer. A line written for
   * one action is not offered once that action's moment has passed. Absent = no limit.
   */
  fino_al_turno?: number;
  /** File di provenienza (per gli errori). */
  file: string;
}

export interface Repertorio {
  battute: Battuta[];
  perId: Map<string, Battuta>;
  /** Avvisi non bloccanti (anche nel log). */
  avvisi: string[];
}
