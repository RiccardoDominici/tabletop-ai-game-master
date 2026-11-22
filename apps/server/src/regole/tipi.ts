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
import type { Catalogo, Monete } from './catalogo';
import type { RegolaCarico, RegolaMovimento } from './carico';
import type { RegolaTempo, RegolaViaggio } from './tempo';
import type { Progressione } from './progressione';
import type { RegolaEsperienza } from './esperienza';
import type { Mostro, RegolaBestiario } from './bestiario';
import type { Durata } from './effetti';
import type { RegolaCreazione } from './creazione';

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
  /**
   * A d100 threshold roll at this difficulty adds these percentage points to its threshold (Basic Fantasy p. 8: −20% on a
   * slimy wall); null = thresholds ignore the rung (as before).
   */
  percentuale?: number | null;
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
      soglia?: {
        dado: 6 | 20 | 100;
        predefinita: number | null;
        /** A failure band (Basic Fantasy's pick pockets: noticed above twice the target, or on 00): its name for the narrator. */
        grave?: { oltreVolte: number; colMassimo: boolean; nome: string } | null;
      } | null;
      /**
       * The Game Master rolls it in secret (M9, Basic Fantasy p. 8–9): the Engine's dice, never the player's; the card
       * only on the panel; the narrator hears how to tell a failure: `niente` (nothing to notice: listening, finding
       * traps) or `riuscita` (the character believes it worked: moving silently, hiding).
       */
      segreta?: 'niente' | 'riuscita';
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
  /** The manual's coins (regole.yaml → monete; regole/catalogo.ts). Absent = no money rules. */
  monete?: Monete | null;
  /** Weapons, armor, shields, ammunition and gear with their restrictions (regole.yaml → catalogo; regole/catalogo.ts). */
  catalogo?: Catalogo | null;
  /** Load bands by Strength and race (regole.yaml → carico; regole/carico.ts). Absent = no load rules. */
  carico?: RegolaCarico | null;
  /** Movement by worn armor and load band (regole.yaml → movimento; regole/carico.ts). */
  movimento?: RegolaMovimento | null;
  /** Game time: units, a fight's round, what a window costs (regole.yaml → tempo; regole/tempo.ts). Absent = no clock. */
  tempo?: RegolaTempo | null;
  /** Overland travel: distance per day by movement and terrain (regole.yaml → viaggio; regole/tempo.ts). */
  viaggio?: RegolaViaggio | null;
  /** How the class tables reach a sheet: attack bonus, hit dice, one level a time (regole.yaml → progressione; M1). */
  progressione?: Progressione | null;
  /** XP of defeated creatures and of treasure (regole.yaml → esperienza; regole/esperienza.ts). */
  esperienza?: RegolaEsperienza | null;
  /** How a monster's stat block becomes a sheet: hit die, attack bonus by hit dice (regole.yaml → bestiario). */
  bestiario?: RegolaBestiario | null;
  /** The manual's stat blocks (regole.yaml → mostri, regole/mostri.yaml; regole/bestiario.ts): a sheet's `mostro:`. */
  mostri?: Mostro[];
  /**
   * What one level of energy drain costs (regole.yaml → livelli_negativi, Basic Fantasy pp. 58–59; prove/drenaggio.ts):
   * added to every d20 roll and to every d100 threshold, besides one hit die of maximum hit points and one of the
   * highest-level spell slots. Absent = a drain effect does nothing (logged).
   */
  livelliNegativi?: { d20: number; percentuali: number } | null;
  /** The languages a character may know (regole.yaml → lingue; Basic Fantasy p. 4). Absent = languages are not tracked. */
  lingue?: Voce[];
  /**
   * The manual's character creation procedure (regole.yaml → creazione; regole/creazione.ts, mechanism M7): the steps,
   * the ways to generate scores, the first hit points, the starting money, spells and languages. Absent = only
   * pregenerated PCs (the Preparer writes them; the validator checks them against the classes and races all the same).
   */
  creazione?: RegolaCreazione | null;
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
  attacchi: Array<{
    id: string;
    nome: string;
    danno: FormulaDadi;
    caratteristica: string | null;
    abilita: string | null;
    tipo_danno: string | null;
    distanza: boolean;
    automatico?: boolean;
    consuma?: string;
    /** The catalog weapon the line comes from (regole/equipaggiamento.ts), or that a sheet's own line names (`arma:`). */
    arma?: string;
    /** Range band limits, one per `catalogo.gittate.fasce` (a missile or thrown line of a catalog weapon). */
    gittate?: number[];
    /** Catalog ammunition ids the line shoots: each shot spends one of the first the bearer has (prove/inventario.ts). */
    munizioni?: string[];
    /** Rate of fire: one shot every this many rounds of a fight (a crossbow). */
    ricarica?: number;
    /** A class or race restriction's attack penalty with this weapon (a magic-user's sword: −5). */
    penalita?: number;
    /** Attacking with it empties the bearer's spells of the day (a cleric's edged weapon). */
    perdeIncantesimi?: boolean;
    /** Powers of the set a hit applies to the target, each with the target's save (a ghoul's paralysis, a poison bite). */
    colpendo?: string[];
    /**
     * A monster's line printed with no damage but its effect («Damage: energy drain», a wight's touch, Basic Fantasy
     * p. 158): `colpendo` without `danno`. A hit takes no hit points (not even the set's minimum) and applies the riders.
     */
    soloEffetti?: boolean;
    /** A special action instead of an attack roll: this power of the set (a dragon's breath, a gaze). */
    potere?: string;
    /** How many times a day the line can be used (a breath: as many as the hit dice); counted by prove/risorse.ts. */
    usi?: number;
    /** What the weapon is made of or is (argento, magica…), besides its catalog weapon's `proprieta`: who it can hurt. */
    proprieta?: string[];
  }>;
  /** Starting counters of the set's resources (`scheda.risorse`: arrows, coins). */
  risorse?: Record<string, number>;
  /** Spells prepared (`vanciana`: each copy one cast) or known (`slot`), ids of the set's powers. */
  incantesimi?: string[];
  /**
   * The spells the character knows (`scheda.libro`: a magic-user's spellbook, Basic Fantasy p. 8 and 187), from which the
   * prepared `incantesimi` are chosen; absent = the sheet does not say (any of its class's spells may be prepared).
   */
  libro?: string[];
  /** The languages the character knows (`scheda.lingue`, ids of the set's `lingue`; Basic Fantasy p. 4). */
  lingue?: string[];
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
  /**
   * Experience points (`scheda.px`): a PC's total (absent = the threshold of its level); an NPC's or a minion's worth
   * when defeated (absent = the set's table by hit dice, regole/esperienza.ts).
   */
  px?: number | null;
  /** Special-ability asterisks of a monster's hit dice (`scheda.speciali`: 2 for «2**»), for its XP value. */
  speciali?: number;
  /**
   * The ability values the sheet writes by hand (`scheda.abilita`), kept apart from what the class tables give
   * (regole/progressione.ts): `abilita` is the two merged, the written ones winning (an override), and it is derived
   * again when the level changes. Absent on sheets read before M1 (tests building sheets by hand).
   */
  abilitaScritte?: Record<string, number>;
  /** The sheet's own traits (`scheda.tratti`), besides its race's and class's (regole/tratti.ts). */
  tratti?: Tratto[];
  /** The bestiary entry the sheet takes its stat block from (`scheda.mostro`, regole/bestiario.ts). */
  mostro?: string;
  /**
   * The attacks of one round, as lists of its line ids, alternatives in order (`per_round`: a ghoul's «2 claws, 1 bite»
   * = [[artiglio, artiglio, morso]]): the NPC's step uses the first one it can (prove/motore.ts). Absent = one attack.
   */
  perRound?: string[][];
  /** Hit points to roll once per creature with the session's seed (prove/bestiario.ts); `pf_massimi` is their average until then. */
  pfDaTirare?: FormulaDadi;
  /** Morale (2–12, Basic Fantasy p. 57), or one before and one after the creature is engaged (a giant ant: 7, then 12). */
  morale?: number | { prima: number; dopo: number };
  /** It surrenders instead of fleeing when its morale breaks (`si_arrende: true`: intelligent monsters, p. 57). */
  siArrende?: boolean;
  /** Its foes are surprised on 1 to this face (`sorprende: 4`: a stat block's special surprise, Basic Fantasy p. 75…). */
  sorprende?: number;
  /**
   * Regeneration (a troll, Basic Fantasy p. 152): `pf` hit points a round once hurt, never the damage of the `tranne`
   * types (fire, acid); at 0 it is down, not dead, and gets up with 1 hit point after `aZero` — unless that damage alone
   * reaches its maximum, which kills it (prove/motore.ts).
   */
  rigenera?: { pf: number; tranne: string[]; aZero: Durata | null };
  /** The attack bonus a stat block prints when it differs from its hit dice (Basic Fantasy p. 62, «in parentheses»). */
  attacco?: number;
  /** Only weapons of these kinds hurt it (`colpito_solo_da`: argento, magica; Basic Fantasy's (s) and (m), p. 62). */
  colpitoSoloDa?: string[];
  /** Damage of these types is halved (`meta`) or does nothing (`immune`): `resistenze: {fuoco: immune}` (a fire elemental). */
  resistenze?: Record<string, 'meta' | 'immune'>;
  /** The set's class id and level (`scheda.classe`, `scheda.livello`): they pick the rows of the class tables. */
  classe?: string | null;
  livello?: number | null;
  /** The set's race id (`scheda.razza`): its traits (regole/tratti.ts). */
  razza?: string | null;
  /** A monster saves as a class and level (`scheda.salva_come: {classe, livello}`, Basic Fantasy «Save As»). */
  salvaCome?: { classe: string; livello: number } | null;
  /**
   * Catalog gear the sheet starts with (`scheda.equipaggiamento`, M2): id, how many, worn (armor and shield). With it the
   * Engine derives `difesa` and `attacchi` (regole/equipaggiamento.ts); without it the sheet's own numbers stand.
   */
  equipaggiamento?: Array<{ id: string; quante: number; indossato: boolean }>;
  /** Coins by the set's coin ids (`scheda.monete: {mo: 12}`). */
  monete?: Record<string, number>;
  /** The sheet's own attack lines (special attacks, natural weapons), kept to re-derive the lines when the gear changes. */
  attacchiPropri?: SchedaGenerica['attacchi'];
  /** The AC the sheet writes by hand (kept when gear gives none). */
  difesaScritta?: number | null;
  /**
   * The sheet's own AC stands unless it wears an armor or a shield (a monster or an NPC that picked up an item in play:
   * its typed AC is natural armor, not «no armor»). Set when a sheet without starting gear gains some.
   */
  difesaPropria?: boolean;
  avvisi: string[];
}
