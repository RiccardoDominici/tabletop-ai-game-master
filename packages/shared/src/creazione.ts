/**
 * @tabletop-ai-gm/shared — creating a character at the table (mechanism M7; docs/creazione.md).
 *
 * Each phone builds its PC step by step, by the steps of the campaign's rule set (regole.yaml → creazione). The phone
 * sends one action at a time (`creazione:azione`); the Engine checks it against the manual's rules and answers with the
 * whole draft (`VistaCreazione`): what is done, what is legal now (only legal choices can succeed; the illegal ones are
 * shown with the reason), the dice still to roll. The Game Master's panel sees every draft (`StatoMaster.creazione`)
 * and can approve or undo a step, and approves the finished PC, which then joins the campaign.
 */

/** The closed list of steps (the set lists the ones its manual has, in its order). */
export type PassoCreazione = 'caratteristiche' | 'razza' | 'classe' | 'punti_ferita' | 'monete' | 'acquisti' | 'incantesimi' | 'lingue' | 'descrizione';

export type StatoPassoCreazione = 'da_fare' | 'fatto' | 'approvato';

/** The dice of the next roll a step waits for (manual rolls: the player enters each die). */
export interface DadiDaTirare {
  numero: number;
  facce: number;
  bonus: number;
  /** What the roll is for («Forza», «Punti ferita del 1° livello», «Monete»). */
  per: string;
}

export interface SceltaCreazione {
  id: string;
  nome: string;
  /** Legal now; false = shown greyed with `motivo` (the requirement it misses). */
  ammessa: boolean;
  motivo: string | null;
}

export interface VoceAcquisto {
  id: string;
  nome: string;
  tipo: 'arma' | 'armatura' | 'scudo' | 'munizione' | 'attrezzo';
  /** The price as the manual writes it («10 mo», «5 ma»), of a pack of `confezione` items. */
  costo: string;
  confezione: number;
  /** Weight of one item, in the set's unit. */
  peso: number;
  /** How many the character has bought. */
  quante: number;
  /** A restriction of the race or class forbids it (the reason); null = it may buy it. */
  vietato: string | null;
  /** A restriction's penalty if it uses it anyway («−5 a colpire»); null = none. */
  penalita: string | null;
}

export interface VistaCreazione {
  id: string;
  stato: 'in_corso' | 'pronta' | 'approvata';
  /** The PC's id once approved (the phone then picks it). */
  id_pg: string | null;
  /** The player rolls real dice and enters them (the campaign's `regole.tiri_giocatori`); false = the Engine rolls. */
  manuale: boolean;
  livello: number;
  passi: Array<{ id: PassoCreazione; nome: string; stato: StatoPassoCreazione; riassunto: string | null }>;
  /** The first step not done yet (null = all done). */
  corrente: PassoCreazione | null;
  /** The next roll the draft waits for, whatever the step (null = none). */
  da_tirare: DadiDaTirare | null;
  caratteristiche: {
    metodo: { id: string; nome: string; tipo: 'dadi' | 'schiera' | 'punti'; ordine: 'fisso' | 'libero' };
    nomi: Array<{ id: string; nome: string }>;
    /** Each roll made, in order: its dice and the score they give (and, in order, the characteristic). */
    tiri: Array<{ caratteristica: string | null; dadi: number[]; punteggio: number }>;
    /** Values still to place (dice rolled to assign, a fixed array). */
    da_assegnare: number[] | null;
    /** Point buy: the points and what each score costs. */
    punti: { totale: number; costi: Array<{ valore: number; costo: number }> } | null;
    /** The scores now (null until all are set), with the race's adjustments, and the bonus each gives. */
    punteggi: Record<string, number> | null;
    bonus: Record<string, number> | null;
    /** The Game Master's options the campaign allows, and how many times each can still be used. */
    opzioni: Array<{ id: string; nome: string; tipo: 'punti' | 'scambio' | 'riordino'; restanti: number | null }>;
    /** No class is open with these scores: the remedies the campaign allows (null = not hopeless, or none allowed). */
    senza_speranza: Array<'ritira' | 'ribalta'> | null;
  };
  razze: SceltaCreazione[];
  classi: SceltaCreazione[];
  razza: string | null;
  classe: string | null;
  punti_ferita: {
    /** The class die («1d8», a race's cap applied), the characteristic's bonus and the minimum. */
    dado: string | null;
    bonus: number;
    minimo: number;
    /** `massimo`: the first level's die counts its maximum, nothing to roll. */
    massimo: boolean;
    livelli: Array<{ livello: number; dadi: number[] | null; totale: number | null }>;
    totale: number | null;
  };
  monete: { formula: string | null; dadi: number[] | null; totale: number | null; moneta: string | null };
  acquisti: {
    voci: VoceAcquisto[];
    /** Coins left, by coin. */
    monete: Array<{ id: string; nome: string; quante: number }>;
    peso: number;
    carico: { nome: string; limite: number | null; movimento: number | null } | null;
    /** The unit of the weights (`carico.unita`) and of the movement (`movimento.unita`). */
    unita: string | null;
    unita_movimento: string | null;
    /** Armor Class with what is bought (worn: the first armor and shield) and the attack lines. */
    difesa: number | null;
    attacchi: string[];
  } | null;
  incantesimi: {
    come: 'scelta' | 'master' | 'tiro';
    fissi: Array<{ id: string; nome: string }>;
    a_scelta: number;
    /** The spells the book may take (the class's, of the allowed spell level), and which are in it now. */
    scelte: Array<{ id: string; nome: string; livello: number }>;
    libro: string[];
    /** Spells per day by spell level at the starting level, and the ones prepared for today. */
    slot: number[];
    preparati: string[];
  } | null;
  lingue: { proprie: Array<{ id: string; nome: string }>; extra: number; scelte: Array<{ id: string; nome: string }>; lingue: string[] } | null;
  descrizione: { nome: string; aspetto: string; concetto: string; pronomi: string };
  /** Why the sheet is not legal yet (grave) or what to look at (not grave), in the content language. */
  problemi: Array<{ codice: string; grave: boolean; testo: string }>;
}

/** What a phone asks of its draft (`creazione:azione`); every one is checked by the Engine. */
export type AzioneCreazione =
  /** Opens a draft for this phone (or returns the one it has). */
  | { tipo: 'inizia' }
  /** The next roll of the draft: the dice the player rolled (manual), or null for the Engine's (automatic). */
  | { tipo: 'tira'; valori: number[] | null }
  /** Places the values to assign (rolled with `ordine: libero`, a fixed array, the full shuffle): characteristic → value. */
  | { tipo: 'assegna'; valori: Record<string, number> }
  /** Point buy: characteristic → score. */
  | { tipo: 'punti'; valori: Record<string, number> }
  /** A Game Master's option the campaign allows: point swapping (from `da` to `a`) or swapping two scores. */
  | { tipo: 'opzione'; opzione: string; da: string; a: string }
  /** The hopeless character's remedies: roll again, or flip every score. */
  | { tipo: 'rimedio'; rimedio: 'ritira' | 'ribalta' }
  | { tipo: 'scegli'; passo: 'razza' | 'classe'; id: string }
  | { tipo: 'compra'; id: string; quante: number }
  | { tipo: 'vendi'; id: string; quante: number }
  | { tipo: 'incantesimi'; libro: string[]; preparati: string[] }
  | { tipo: 'lingue'; lingue: string[] }
  | { tipo: 'descrizione'; nome: string; aspetto?: string; concetto?: string; pronomi?: string }
  /** The step is done (the scores after the options, the purchases): the next one opens. */
  | { tipo: 'conferma'; passo: PassoCreazione }
  /** Redo a step (and the steps that depend on it), unless the Game Master approved it. */
  | { tipo: 'indietro'; passo: PassoCreazione };

export type EsitoCreazione = { ok: true; bozza: VistaCreazione } | { ok: false; errore: string; bozza: VistaCreazione | null };

/** A draft as the Game Master's panel sees it: the phone's view plus who is building it. */
export interface CreazioneMaster extends VistaCreazione {
  /** The first characters of the phone's device token (never the whole token). */
  telefono: string;
  /** The rolls entered on the phone, for the Game Master to compare with the real dice. */
  tiri_inseriti: Array<{ per: string; dadi: number[]; manuale: boolean }>;
}

/** Whether this campaign lets the players build PCs at the table (the table state: the phone's choice screen). */
export interface CreazioneTavolo {
  modo: 'al_tavolo' | 'entrambi';
}
