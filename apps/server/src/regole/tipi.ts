/**
 * Set di regole di una campagna (docs/regole.md): campagne/<id>/regole/regole.yaml, ricavato dal
 * manuale dell'utente (manuali/, mai nel repository) o, senza manuale, l'SRD 5.2 prodotto dal codice.
 *
 * Il Motore lo usa per tirare (risoluzione, caratteristiche, modificatori, difficoltà, vantaggio,
 * attacchi, danni); l'arbitro per decidere che cosa si tira col vocabolario del manuale; il telefono
 * per far capire le regole (riassunto.md, «Chiedi una regola» sui passi in estratti/).
 */
import type { TipoRisoluzione } from '@tabletop-ai-gm/shared';
import type { FormulaDadi } from '../campagna/regole-srd';
import type { Combattimento } from './combattimento';
import type { RegolaCadute, TipoRiposo } from './salute';
import type { TiriSalvezza } from './salvezze';
import type { Classe } from './classi';
import type { Potere } from './poteri';
import type { Magia, Risorsa } from './risorse';
import type { Razza, Tratto } from './tratti';

export interface Voce {
  id: string;
  nome: string;
}

export interface Fascia {
  /** Totale minimo, incluso; null = tutto il resto (la fascia più bassa). */
  min: number | null;
  esito: 'successo' | 'parziale' | 'fallimento';
  nome: string;
  /** Che cosa vuol dire per il racconto (per il narratore); null = il significato standard dell'esito. */
  significato: string | null;
}

export interface Difficolta extends Voce {
  /** d20_cd: la CD. */
  valore: number | null;
  /** sotto_soglia: la soglia si divide per questo (difficile = 2, estrema = 5). */
  divisore: number | null;
  /** 2d6_fasce: si somma al tiro (rischiosa = −1). */
  modificatore: number | null;
}

/** Gradi di successo di un tiro sotto soglia (d100: estremo = un quinto, difficile = metà). */
export interface Grado {
  divisore: number;
  nome: string;
  significato: string | null;
}

export interface Mossa extends Voce {
  /** Quando si usa, in parole (la vede l'arbitro). */
  quando: string;
  caratteristica: string;
  esiti: { successo: string; parziale: string | null; fallimento: string };
}

/**
 * A situational attack modifier of the set (regole.yaml → `modificatori`; regole/modificatori.ts): from behind, a
 * charge, range. It applies to a PC's attack whose action has one of its `parole`, of the kind `attacchi`, with a
 * weapon whose id has one of `armi` (empty = any), unless the attack uses an ability of `non_con`.
 */
export interface Modificatore {
  id: string;
  nome: string;
  /** Added to the attack roll (Basic Fantasy: +2 from behind, +2 charging, +1 short range, −2 long range). */
  bonus: number;
  attacchi: 'tutti' | 'mischia' | 'distanza';
  parole: string[];
  armi: string[];
  nonCon: string[];
  /** `doppio`: a hit deals double damage (Basic Fantasy's charge, p. 52). */
  danno: 'normale' | 'doppio';
}

export interface SistemaRegole {
  id: string;
  nome: string;
  /** L'SRD 5.2 del codice (prove/risolutore.ts) invece del motore generico. */
  srd: boolean;
  /** Riassunto per il narratore in una o due frasi (regole.yaml → per_il_narratore); null = dal set. */
  perNarratore: string | null;
  fonte: { titolo: string; autore: string | null; file: string | null };
  licenza: { nome: string; libera: boolean; attribuzione: string | null };
  risoluzione: {
    tipo: TipoRisoluzione;
    /** Facce del dado: 20 (d20_cd, sotto_soglia d20), 100 (sotto_soglia d100), 6 (2d6_fasce). */
    facce: number;
    /** Quanti dadi si sommano (2 per 2d6_fasce, 1 altrimenti). */
    numero: number;
    fasce: Fascia[];
    gradi: Grado[];
    /**
     * sotto_soglia: questo tiro o meno è un critico; questo o più un disastro. d20_cd: il dado naturale da
     * questo in su è un critico (riesce), da `disastro` in giù fallisce comunque. Nel d20_cd, se il set non li
     * scrive, valgono quelli dell'SRD (20 e 1); `null` scritto li toglie.
     */
    critico: number | null;
    disastro: number | null;
    /**
     * d20_cd: critico e disastro valgono solo per gli attacchi (SRD), per gli attacchi e i tiri salvezza (le abilità
     * del set con `salvezza: true`; Basic Fantasy p. 60: «as with attack rolls, a natural 20 is always a success»), o
     * per tutti i tiri. The death saves of the fight keep their own (`combattimento.danni.tiri_morte`).
     */
    critici: 'attacchi' | 'attacchi_e_salvezze' | 'tutti';
  };
  caratteristiche: Voce[];
  /**
   * `soglia`: l'abilità si tira a parte, sotto una soglia (percentuali del ladro: d100; «x su 6»: d6), col
   * valore della scheda come soglia (25 = 25%, 2 = 2 su 6). `predefinita`: la soglia di chi non ha il valore
   * nella scheda («1 su 6» per tutti); null = chi non ce l'ha tira come una prova qualunque del set.
   * `salvezza`: the ability is a saving throw of the manual (the Engine cannot tell one by its id): with
   * `risoluzione.critici: attacchi_e_salvezze` its natural d20s count as an attack's do.
   */
  abilita: Array<
    Voce & {
      caratteristica: string | null;
      soglia?: { dado: 6 | 20 | 100; predefinita: number | null } | null;
      salvezza?: boolean | string;
      /** An attack with this ability deals double damage (Basic Fantasy's sneak attack, p. 9: twice the weapon's roll). */
      danno?: 'doppio';
      /** Usable once per target per fight (the sneak attack); then the attack rolls with `ripiego` instead. */
      unaVoltaPerBersaglio?: boolean;
      /** The ability an attack falls back to once this one is spent on that target (`mischia`). */
      ripiego?: string | null;
    }
  >;
  /** Come il valore di una caratteristica entra nel tiro. */
  /**
   * Come una caratteristica diventa il numero del tiro: `srd` (punteggio − 10) / 2; `diretto` (la scheda
   * scrive già il bonus); `soglia` (sotto_soglia: il valore è la soglia); `tabella` (la scheda scrive il
   * punteggio, il bonus viene dalla tabella del manuale: Basic Fantasy 13–15 = +1, `tabellaModificatori`).
   */
  modificatore: 'srd' | 'diretto' | 'soglia' | 'tabella';
  /** Con `tabella`: righe dal punteggio più basso, `da` incluso («da 13: +1»); null altrimenti. */
  tabellaModificatori: Array<{ da: number; mod: number }> | null;
  difficolta: Difficolta[];
  difficoltaPredefinita: string;
  vantaggio: { tipo: 'due_dadi' | 'dado_bonus' | 'bonus' | 'nessuno'; valore: number };
  /**
   * `dannoCritico`: con un critico i dadi del danno raddoppiano (SRD) o no; `dannoMinimo`: un colpo andato
   * a segno fa almeno questi danni (Basic Fantasy: 1).
   */
  attacchi: { tipo: 'prova' | 'automatico'; armaturaRiduce: boolean; parzialeScambio: boolean; dannoCritico: 'doppio' | 'normale'; dannoMinimo: number };
  danni: { nome: string; aZero: string };
  condizioni: Array<Voce & { effetto: string }>;
  sociale: { caratteristica: string | null; abilita: string | null; nota: string | null };
  mosse: Mossa[];
  sottosistemi: Array<Voce & { testo: string }>;
  /** Come si combatte nel set (docs/combattimento.md). */
  combattimento: Combattimento;
  /** Arbitro a regole: id di abilità, mossa o caratteristica → parole che lo chiamano (regole.yaml → parole_chiave). */
  paroleChiave: Record<string, string[]>;
  /** Situational attack modifiers the set declares (absent or empty = none: the SRD, most sets). */
  modificatori?: Modificatore[];
  /** Falling damage by the manual's table (regole.yaml → cadute; regole/salute.ts). Absent = none. */
  cadute?: RegolaCadute | null;
  /** The kinds of rest and what they heal and refresh (regole.yaml → riposo; regole/salute.ts). Absent = none. */
  riposo?: TipoRiposo[];
  /** The save table's columns and each class's rows (regole.yaml → tiri_salvezza, classi; regole/salvezze.ts). */
  tiriSalvezza?: TiriSalvezza | null;
  /** The classes of the set and their level tables (regole.yaml → classi; regole/classi.ts). Absent = none. */
  classi?: Classe[];
  /** Spells, items, class actions and hazards as typed effects (regole.yaml → poteri; regole/poteri.ts). */
  poteri?: Potere[];
  /** Per-character counters and what refreshes them (regole.yaml → risorse; regole/risorse.ts). */
  risorse?: Risorsa[];
  /** How spells are prepared (regole.yaml → magia); null = `slot`. */
  magia?: Magia | null;
  /** The races and their traits (regole.yaml → razze; regole/tratti.ts). */
  razze?: Razza[];
}

/** Un passo del manuale (regole/estratti/*.md), per l'arbitro e per «Chiedi una regola». */
export interface Estratto {
  id: string;
  titolo: string;
  parole: string[];
  pagina: string | null;
  testo: string;
  /** L'abilità, mossa o caratteristica del set a cui il passo si riferisce (`per:`), per l'arbitro a regole. */
  per: string | null;
}

/** Il set caricato, con i testi per i giocatori. */
export interface RegoleCampagna {
  sistema: SistemaRegole;
  riassunto: string;
  estratti: Estratto[];
  /** Cartella del set (null = SRD del codice, senza cartella nella campagna). */
  cartella: string | null;
  avvisi: string[];
}

/** Scheda di un PG o PNG per un set non SRD: i valori seguono le caratteristiche del set. */
export interface SchedaGenerica {
  id: string;
  nome: string;
  di_png: boolean;
  /** id della caratteristica → valore (bonus, punteggio o soglia, secondo `modificatore`). */
  caratteristiche: Record<string, number>;
  /** id dell'abilità → bonus (d20, 2d6) o soglia (sotto_soglia). */
  abilita: Record<string, number>;
  pf_massimi: number;
  /** d20_cd: la CA; altrimenti null. */
  difesa: number | null;
  /** Attacchi automatici: riduce il danno subito. */
  armatura: number;
  /** `automatico`: quest'arma colpisce sempre, si tira solo il danno (il dardo incantato). */
  attacchi: Array<{ id: string; nome: string; danno: FormulaDadi; caratteristica: string | null; abilita: string | null; tipo_danno: string | null; distanza: boolean; automatico?: boolean; consuma?: string }>;
  /** Starting counters of the set's resources (`scheda.risorse`: arrows, coins). */
  risorse?: Record<string, number>;
  /** Spells prepared (`vanciana`: each copy one cast) or known (`slot`), ids of the set's powers. */
  incantesimi?: string[];
  /** Spell slots by spell level (index 0 = 1st level), when the sheet writes them (an NPC caster); else the class table. */
  slot?: number[] | null;
  /** Items with a power and how many (`scheda.oggetti: {pozione_guarigione: 2}`). */
  oggetti?: Record<string, number>;
  /** Creature types (`scheda.tipo`: umanoide, non_morto), read by a power's `immuni` and `solo_tipi`. */
  tipo?: string[];
  /** Powers and conditions this creature is immune to (`scheda.immune`). */
  immune?: string[];
  /** Hit dice, for powers limited by them (`scheda.dadi_vita`); a PC's are its level. */
  dadiVita?: number | null;
  /** The sheet's own traits (`scheda.tratti`), besides its race's and class's (regole/tratti.ts). */
  tratti?: Tratto[];
  /** The set's class id and level (`scheda.classe`, `scheda.livello`): they pick the rows of the class tables. */
  classe?: string | null;
  livello?: number | null;
  /** The set's race id (`scheda.razza`): its traits (regole/tratti.ts). */
  razza?: string | null;
  /** A monster saves as a class and level (`scheda.salva_come: {classe, livello}`, Basic Fantasy «Save As»). */
  salvaCome?: { classe: string; livello: number } | null;
  avvisi: string[];
}
