/**
 * @tabletop-ai-gm/shared — pannello del master (docs/architettura.md, «Pannello master»).
 *
 * Un umano sul Mac deve poter correggere o fermare il master IA. Il pannello entra nella stanza
 * Socket.IO "master" con un token stampato nel log del server all'avvio: i telefoni non lo
 * conoscono e non possono entrarci. Il server manda `master:stato` (istantanea completa) a ogni
 * cambiamento; il pannello comanda con `master:comando`. Ogni comando finisce nel log come evento.
 *
 * Il pannello vede anche ciò che i telefoni non vedono: azioni private (segnate), segni degli
 * orologi, battute del repertorio. Non vede mai le conoscenze private dei PG.
 */
import type { ScortaScheda } from './prove';
import type { StatoAzione, StatoTavolo } from './dominio';
import type { RichiestaTiroMaster, TiroMostrato } from './prove';
import type { CreazioneMaster, PassoCreazione } from './creazione';

/** Orologio di una minaccia, con i segni scritti (il master li conosce tutti). */
export interface OrologioMaster {
  id: string;
  nome: string;
  /** Segni già mostrati. */
  pieni: number;
  segmenti: number;
  /** Testi dei segni, in ordine (i primi `pieni` sono già stati mostrati). */
  segni: string[];
  /** Prossimo segno da mostrare (null se l'orologio è completo). */
  prossimo: string | null;
  /** Il ritmo minimo impone di mostrarlo nella prossima risposta. */
  dovuto: boolean;
  /** Turno dell'ultimo segno mostrato (null = mai). */
  ultimo_turno: number | null;
  /** Cosa succede a orologio completo. */
  al_completo: string | null;
  /** Sta correndo. False: aspetta una battuta o un indizio (`parte_dopo`); il +1 del master lo fa partire. */
  partito: boolean;
}

/** Collegamento di un'azione verso un'altra (dipendenza o conflitto). */
export interface LegameAzione {
  /** Id dell'altra azione. */
  id: string;
  /** Nome breve dell'autore dell'altra azione. */
  nome: string;
}

/** Un'azione dei giocatori come la vede il master: anche le private (segnate), con i legami. */
export interface AzioneMaster {
  id: string;
  id_pg: string;
  nome: string;
  testo: string;
  privata: boolean;
  stato: StatoAzione;
  motivo: string | null;
  /** Turno (finestra) in cui entra. */
  turno: number;
  /** Epoch ms del primo invio. */
  inviata_alle: number;
  dipende_da: LegameAzione[];
  conflitti: Array<LegameAzione & { esclusivo: boolean; /** Questa azione vince il conflitto. */ vince: boolean }>;
  /** Si può saltare (in coda o da confermare). */
  saltabile: boolean;
}

/** Nota di regia: entra nel messaggio del narratore per i prossimi `turni_rimasti` turni. */
export interface NotaRegia {
  id: string;
  testo: string;
  turni_rimasti: number;
  turni_totali: number;
  /** Turno in cui il master l'ha scritta. */
  creata_al_turno: number;
}

/** Battuta del repertorio (modalità B), senza il testo se non è ancora uscita. */
export interface BattutaMaster {
  id: string;
  chi: string;
  tipo: string;
  quando: string;
  usi: number;
  max_usi: number;
  /** Scena a cui la battuta è legata (null = tutte). */
  scena: string | null;
}

export interface RepertorioMaster {
  /** Battute già uscite, con quante volte. */
  usate: BattutaMaster[];
  /** Battute disponibili adesso (condizioni vere, usi rimasti), escluse le `solo_esempio`. */
  disponibili: BattutaMaster[];
  /** Quante battute non sono disponibili adesso (condizioni false, già esaurite, altra scena). */
  non_disponibili: number;
  indizi_rivelati: string[];
}

/** Luogo che il master può mettere sul proiettore. */
export interface LuogoMaster {
  id: string;
  nome: string;
  tipo: 'scena' | 'nodo';
  /** URL dell'immagine (null = lo schermo userà lo sfondo d'atmosfera). */
  immagine: string | null;
}

/** Scena della campagna (scena.yaml + scene/*.yaml). */
export interface ScenaMaster {
  id: string;
  titolo: string;
  /** Nodo (luogo) della scena. */
  luogo: string;
  corrente: boolean;
}

/** Immagine di situazione (`situazione_<png>_<id>` nel manifest): solo a comando o dopo la rivelazione giusta. */
export interface SituazioneMaster {
  id: string;
  /** PNG ritratto nella situazione (null se non si ricava). */
  png: string | null;
  /** Etichetta leggibile («Sebastiano: cicatrice»). */
  nome: string;
  url: string;
  /** Adesso è sul proiettore. */
  in_onda: boolean;
  /** Rivelazione che la fa comparire da sola (id di indizio o battuta), se c'è. */
  dopo: string | null;
}

/** Audio della scena per il pannello: cosa suona e cosa si può comandare (nomi non segreti). */
export interface AudioMaster {
  /** Musica del luogo corrente (id del catalogo), null = nessuna. */
  musica: string | null;
  /** Umore scelto (tag, es. «tensione»), null = automatico (la musica del luogo). */
  umore: string | null;
  /** Umori con un brano nel catalogo (tag), in ordine alfabetico. */
  umori: string[];
  /** Effetti del catalogo (id sfx_<tag>), in ordine alfabetico. */
  effetti: string[];
  /** Strati d'ambiente del luogo corrente. */
  ambienti: string[];
}

/** Un comando del master, come è finito nel log. */
export interface EventoMaster {
  /** ISO 8601. */
  ts: string;
  comando: TipoComandoMaster;
  ok: boolean;
  /** Riassunto leggibile («orologio o_colpevole +1 → 3/6», «rifiutato: la finestra è chiusa»). */
  dettagli: string;
  /** Deciso dal Motore (riga [umore]/[effetto] del narratore, audio di una battuta), non dal master. */
  automatico?: boolean;
}

/** Istantanea completa per il pannello del master. */
export interface StatoMaster {
  /** Lo stesso stato che vedono telefoni e schermo (fase, turno, finestra, trascrizione pubblica…). */
  tavolo: StatoTavolo;
  modo: 'improvvisa' | 'repertorio';
  pausa: {
    /** Il master ha chiesto la pausa: alla fine della narrazione in corso non si apre la finestra. */
    richiesta: boolean;
    /** Il tavolo è fermo in pausa adesso (fase 'pausa'). */
    attiva: boolean;
  };
  /** Il narratore (LLM o voce) sta lavorando: «Ferma la narrazione» ha effetto. */
  narrazione_in_corso: boolean;
  scene: ScenaMaster[];
  luoghi: LuogoMaster[];
  situazioni: SituazioneMaster[];
  orologi: OrologioMaster[];
  /** Azioni vive (in coda, da confermare) e quelle dell'ultimo turno, private comprese. */
  azioni: AzioneMaster[];
  note: NotaRegia[];
  limiti_note: { max: number; turni_max: number };
  /** Solo in modalità repertorio. */
  repertorio: RepertorioMaster | null;
  /** Ultimi comandi del master (il più recente per ultimo). */
  eventi: EventoMaster[];
  /** Musica, umori ed effetti (assente se il server non ha un catalogo audio). */
  audio?: AudioMaster;
  /** Sessione salvata nel registro (assente se il server non salva). */
  sessione?: SessioneMaster;
  /** Tutti i PNG della campagna con la presenza in scena (per il pannello: anche quelli mai incontrati). */
  presenze?: PresenzaMaster[];
  /**
   * Combattimento (docs/combattimento.md): chi ha una scheda coi suoi PF (correggibili), le condizioni
   * del set. Lo scontro in corso è in `tavolo.combattimento`. Assente senza dadi.
   */
  combattimento?: CombattimentoMaster;
  /** Rolls (docs/prove.md §8–9): who rolls, the open requests WITH the DC, and the last turn's cards as rolled. */
  tiri?: TiriMaster;
  /** The world that moves (docs/mondo.md). Absent on servers that do not have it. */
  mondo?: MondoMaster;
  /** The coherence ledger (docs/coerenza.md): what is true now and what changed. Absent on servers that do not have it. */
  coerenza?: CoerenzaMaster;
  /** The PCs being built at the table (docs/creazione.md), one per phone. Absent when the campaign has no creation. */
  creazione?: CreazioneMaster[];
}

/** The coherence ledger as the Game Master sees it (docs/coerenza.md §2): every character, the journal, the violations. */
export interface CoerenzaMaster {
  entita: Array<{
    id: string;
    nome: string;
    tipo: 'pg' | 'png' | 'gregario' | 'improvvisato';
    stato: 'in_piedi' | 'ferito' | 'grave' | 'a_terra' | 'morente' | 'morto' | 'fuggito' | 'nascosto';
    presenza: 'in_scena' | 'uscito' | 'altrove';
  }>;
  /** Facts known only to some PCs (private outcomes and actions), the most recent last. */
  privati: Array<{ turno: number; testo: string; conosciuto_da: string[] }>;
  /** The journal's last events: who changed, from what to what, why. */
  eventi: Array<{ turno: number; tipo: string; id: string; da: string | null; a: string; causa: string }>;
  /** The checker's last violations: the rule, what was done, the sentence and what was said instead. */
  violazioni: Array<{ turno: number; regola: string; azione: string; etichetta: string; frase: string; sostituto: string[]; id_pg?: string }>;
}

/** The rolls as the Game Master sees them: DCs, private actions, values entered. Absent without dice. */
export interface TiriMaster {
  /** The campaign's setting (or the instance's override): players roll at the table, or the Engine rolls. */
  giocatori: 'manuale' | 'automatico';
  /** The Game Master's background rolls: hidden, sometimes shown, always shown. */
  master: 'nascosti' | 'a_volte' | 'visibili';
  /** The open wait's requests (empty when nobody must roll). */
  richieste: RichiestaTiroMaster[];
  /** The last turn's cards, DC and private ones included. */
  carte: TiroMostrato[];
  /** What the Game Master can ask from the panel: the set's skills, abilities and saves, and its difficulties. */
  catalogo: { prove: Array<{ id: string; nome: string }>; difficolta: Array<{ id: string; nome: string; valore: number | null }> };
  /** The PCs with a sheet (who can be asked for a check). */
  pg: Array<{ id: string; nome: string }>;
  /**
   * The Game Master's own rolls (docs/prove.md §9), the last ones: what asked for them and why (never shown to the
   * table), the die, the target, yes/no, and whether the table saw it.
   */
  del_master: Array<{ id: string; turno: number; origine: string; motivo: string; dado: number; almeno: number; valore: number; riuscito: boolean; mostrato: boolean }>;
  /** Checks the Game Master asked, waiting for the next closed window. */
  chieste: Array<{ id: string; id_pg: string; nome_pg: string; nome: string; difficolta: string | null; privata: boolean }>;
  /** The set's reaction tables the Game Master can roll (absent or empty = none), and the NPCs whose attitude may follow. */
  reazioni?: { tabelle: Array<{ id: string; nome: string }>; png: Array<{ id: string; nome: string }> };
}

/**
 * The world that moves (docs/mondo.md), for the panel: attitudes changed in play, the world's log (consequences of
 * marks, omens, off-screen events), marks owed by facts, the stall counter. `cosa` may be secret: the panel shows it
 * only with spoilers visible.
 */
export interface MondoMaster {
  atteggiamenti: Array<{ png: string; nome: string; pg: string; nome_pg: string; stato: string; base: string | null; turno: number; causa: string }>;
  cronaca: Array<{ turno: number; id: string; tipo: string; orologio: string; segno: number; cosa: string; visto: boolean; emerso_al_turno: number | null }>;
  /** Clocks with marks owed by facts (avanza_quando gates), active or not. */
  debiti: Array<{ orologio: string; nome: string; debito: number }>;
  /** Consecutive stalls so far (0 = none). */
  stallo: number;
  /**
   * What the Game Master can set by hand (A25): every NPC with its attitude now towards each PC (null = no card entry),
   * and the PCs. Absent from older servers.
   */
  scelte?: { png: Array<{ id: string; nome: string; verso: Record<string, string | null> }>; pg: Array<{ id: string; nome: string }> };
}

export interface CombattimentoMaster {
  attivo: boolean;
  /** Manual rolls: a fight opened from the panel, starting at the next closed window (the players roll initiative). */
  chiesto?: boolean;
  schede: Array<{ id: string; nome: string; di_png: boolean; pf: { attuali: number; massimi: number }; scorta?: ScortaScheda }>;
  condizioni: Array<{ id: string; nome: string; icona: string; testo: string }>;
  /** The kinds of rest of the rule set (docs/prove.md §10): the panel's «Riposo» buttons. Absent or empty = none. */
  riposi?: Array<{ id: string; nome: string }>;
  /** The set's catalog and coins for the gear controls (docs/prove.md §10). Absent = the set has none. */
  catalogo?: { voci: Array<{ id: string; nome: string; tipo: string; luce: boolean }>; monete: Array<{ id: string; nome: string }> };
  /** The game clock (docs/prove.md §11): the time, the lights with the time left, the set's units and terrains. */
  tempo?: { ora: string; trascorso: string | null; luci: Array<{ chi: string; oggetto: string; nome: string; restante: string }>; unita: Array<{ id: string; nome: string }>; terreni: Array<{ id: string; nome: string }>; unita_viaggio: string | null };
  /**
   * Experience points (docs/prove.md §12): each PC's XP, level and next threshold (`sale`: it reaches the next level,
   * taken between sessions), the treasure found and not yet back to safety, this session's awards. Absent without XP rules.
   */
  esperienza?: EsperienzaMaster;
}

/** The XP box of the panel (CombattimentoMaster.esperienza). */
export interface EsperienzaMaster {
  pg: Array<{ id: string; nome: string; px: number; livello: number; prossimo: number | null; sale: boolean }>;
  /** Treasure waiting to be marked back to safety, written in the set's coins; null = none. */
  tesoro: string | null;
  guadagni: Array<{ turno: number; fonte: 'sconfitto' | 'tesoro' | 'master'; motivo: string; totale: number; quote: Record<string, number>; testo: string }>;
}

/** Un PNG nel pannello: se è in scena, e se il master l'ha deciso a mano (altrimenti dice la scena). */
export interface PresenzaMaster {
  id: string;
  nome: string;
  presente: boolean;
  manuale: boolean;
  /** Ha già parlato nella trascrizione di questa sessione. */
  incontrato: boolean;
  /** Scheda con `nascosto: true`: non si mostra al tavolo finché non parla o il master non lo rivela. */
  nascosto: boolean;
  /** Il master l'ha rivelato a mano (comando `rivela`): da quel momento si mostra anche se muto. */
  rivelato: boolean;
}

/** La sessione di gioco salvata: il server la riprende da sola dopo un riavvio. */
/** La serata vista dal pannello (chiusura guidata, docs/richieste-2026-11-09.md §9). */
export interface SerataMaster {
  /** Durata prevista in ore (`ore_per_sessione` del brief, o quella data dal master). */
  ore: number;
  /** Da dove viene la durata: il brief, il predefinito (2,5) o il pannello. */
  origine_ore: 'brief' | 'predefinito' | 'master';
  /** Minuti dall'inizio della serata (avvio o ripresa); null = la serata non è cominciata. */
  minuti_passati: number | null;
  /** Minuti alla fine prevista (negativi = oltre); null = non cominciata. */
  minuti_rimasti: number | null;
  /** Mancano MINUTI_PREAVVISO o meno: il narratore riceve il consiglio di avvicinarsi a una pausa naturale. */
  fine_vicina: boolean;
  /** Il consiglio è sospeso perché la scena è in un climax. */
  climax: boolean;
  /** «Chiudi la sessione» è possibile adesso (gioco in corso, nessuna narrazione). */
  chiudibile: boolean;
  /** La chiusura guidata è in corso (narrazione di chiusura e riassunto). */
  chiusura_in_corso: boolean;
  /** La serata è stata chiusa (si aspetta Riprendi, Prossima sessione o Fine sessione). */
  chiusa: boolean;
}

export interface SessioneMaster {
  /** Id (ISO dell'inizio) della sessione in corso; null = nessuna ancora (scena non avviata). */
  id: string | null;
  /** ISO 8601 dell'inizio. */
  creata: string | null;
  /** Eventi scritti nel registro. */
  eventi: number;
  /** Ultima ripresa dopo un riavvio: quando, e da che turno. */
  ripresa: { quando: string; turno: number } | null;
  /** Sessione ripresa dal registro che aspetta il proiettore («Inizia sessione») per ripartire. */
  in_attesa_di_ripresa: { quando: string; turno: number } | null;
  /**
   * Campagna a più sessioni (docs/strati.md): il pacchetto sessioni/<nn>/ che si gioca e quello dopo.
   * Assente in una one-shot.
   */
  pacchetti?: PacchettiMaster;
  /** La serata: durata prevista, tempo passato, preavviso di fine, chiusura guidata. */
  serata?: SerataMaster;
  /** Ultimo registro scritto da «Fine sessione» (anche in una one-shot). */
  registro?: { sessione: string; file: string; turni: number } | null;
  /** «Fine sessione» è possibile adesso (c'è una sessione in corso). */
  fine_possibile?: boolean;
  /** Telefoni ricordati (token del dispositivo, abbreviato nel pannello) e il loro PG. */
  telefoni?: Array<{ dispositivo: string; id_pg: string; nome: string; collegato: boolean }>;
}

export interface PacchettiMaster {
  corrente: { numero: number; etichetta: string; titolo: string };
  /** Tutti i pacchetti della campagna, in ordine. */
  elenco: Array<{ numero: number; etichetta: string }>;
  /** Il pacchetto dopo: `pronta` se si carica senza errori, altrimenti `motivo` dice perché no. null = è l'ultimo. */
  prossima: { numero: number; etichetta: string; titolo: string | null; pronta: boolean; motivo: string | null } | null;
  /** Avviso della scelta all'avvio (es. «la sessione 02 è finita e la 03 non c'è ancora»). */
  avviso: string | null;
}

/** Comandi del pannello. Il server li valida tutti: il client non è fidato. */
export type ComandoMaster =
  /** Pausa: nessuna nuova finestra; la narrazione in corso finisce. */
  | { tipo: 'pausa' }
  /** Riprende: riapre la finestra (o la ripropone se era aperta). */
  | { tipo: 'riprendi' }
  /** Ferma subito la narrazione (LLM + voce) e mette il tavolo in pausa. */
  | { tipo: 'ferma_narrazione' }
  /** Cambia il luogo sul proiettore (dissolvenza). */
  | { tipo: 'luogo'; luogo: string }
  /** Passa a un'altra scena della campagna (cambia anche il luogo). */
  | { tipo: 'scena'; scena: string }
  /** Mostra un'immagine di situazione sul proiettore (null = toglila). */
  | { tipo: 'situazione'; id: string | null }
  /** Avanza (+1) o riporta indietro (-1) un orologio di un segno. */
  | { tipo: 'orologio'; id: string; passo: 1 | -1 }
  /** «Risolvi ora»: chiude subito la finestra, il narratore risponde alle azioni inviate (senza aspettare chi manca). */
  | { tipo: 'chiudi_finestra' }
  /** Ritmo del tavolo: concitato (conto alla rovescia) o calmo; a finestra aperta vale subito. */
  | { tipo: 'ritmo'; ritmo: 'calmo' | 'concitato' }
  /** Salta l'azione di un giocatore: non entra nel turno (torna nella sua casella da riscrivere). */
  | { tipo: 'salta_azione'; id_azione: string }
  /** Nota di regia per i prossimi `turni` turni (1–15; al massimo 3 note insieme). */
  | { tipo: 'nota'; testo: string; turni: number }
  /** Toglie una nota di regia prima della scadenza. */
  | { tipo: 'togli_nota'; id: string }
  /** Umore della musica (tag del catalogo); null = automatico, la musica del luogo. */
  | { tipo: 'umore'; umore: string | null }
  /** Suona un effetto del catalogo (sfx_<tag>) sul proiettore. */
  | { tipo: 'effetto'; id: string }
  /** Chiude la sessione salvata e ricomincia da capo (il pannello chiede conferma). */
  | { tipo: 'nuova_sessione' }
  /** Fine sessione: il gioco si ferma, la sessione si chiude e il server scrive il registro (registro.yaml). */
  | { tipo: 'fine_sessione' }
  /**
   * Chiusura guidata della serata: il narratore chiude il momento (immagine finale, un aggancio), poi il
   * proiettore mostra «Cosa è successo stasera» e si scrive il registro. La sessione resta riprendibile.
   */
  | { tipo: 'chiudi_sessione' }
  /** Durata prevista della serata, in ore (0,5–8): sostituisce `ore_per_sessione` del brief. */
  | { tipo: 'durata_sessione'; ore: number }
  /** Combattimento (docs/combattimento.md): comincia lo scontro con i PG al tavolo e i PNG ostili in scena. */
  | { tipo: 'combattimento_inizia' }
  /** «Termina combattimento». */
  | { tipo: 'combattimento_termina' }
  /** Punti ferita di un PG o PNG con la scheda (cura o danno a mano). */
  | { tipo: 'pf'; id: string; valore: number }
  /** Mette o toglie una condizione a un combattente (solo durante lo scontro). */
  | { tipo: 'condizione'; id: string; condizione: string; attiva: boolean }
  /** A rest for the party (docs/prove.md §10): `riposo` is an id of `CombattimentoMaster.riposi`. Not during a fight. */
  | { tipo: 'riposo'; riposo: string }
  /**
   * A hazard the Game Master applies to a character (docs/prove.md §10): damage or healing by a formula («2d6»), or a
   * fall of `valore` in the unit of the set's falling table; `fonte` names it on the card («Frana»).
   */
  | { tipo: 'pericolo'; id: string; cosa: 'danno' | 'cura' | 'caduta'; valore: string | number; fonte?: string }
  /**
   * A character's gear and coins (docs/prove.md §10, the set's catalog): an item found or lost (`oggetto`, `quante` may be
   * negative), coins gained or paid (`monete`: coin id → amount, negative = pay that much with change), a purchase or a
   * sale (`compra`, `vendi`; `prezzo` like «15 ma», default the catalog's), an armor or shield put on or taken off
   * (`indossa`, `togli`). The fact goes to the transcript and to the narrator in the next turn.
   */
  | { tipo: 'inventario'; id: string; cosa: 'oggetto' | 'monete' | 'compra' | 'vendi' | 'indossa' | 'togli'; oggetto?: string; quante?: number; monete?: Record<string, number>; prezzo?: string }
  /**
   * The game clock (docs/prove.md §11): time passes (`avanza`, `durata` in the set's units: {ora: 1}), a journey
   * (`viaggio`: `distanza` in the set's unit and a `terreno` id), or a light lit or put out (`accendi`, `spegni`: `id` the
   * character, `oggetto` a catalog light). Not during a fight, whose rounds are the clock.
   */
  | { tipo: 'tempo'; cosa: 'avanza' | 'viaggio' | 'accendi' | 'spegni'; durata?: Record<string, number>; distanza?: number; terreno?: string; id?: string; oggetto?: string }
  /**
   * Experience points (docs/prove.md §12): an award (`assegna`: `px`, to the PC `pg` or, without it, the party in equal
   * shares, with a reason) or the treasure found so far marked back to safety (`tesoro`, when the set counts it then).
   */
  | { tipo: 'esperienza'; cosa: 'assegna' | 'tesoro'; px?: number; pg?: string; motivo?: string }
  /**
   * Manual rolls (docs/prove.md §8): the Game Master enters the dice for a player's open request (`valori`), or switches
   * it to the Engine's dice (`valori: null`); `id: '*'` switches every open request.
   */
  | { tipo: 'tiro'; id: string; valori: number[] | null }
  /**
   * The Game Master asks a PC for a check (docs/prove.md §8): `cosa` from `TiriMaster.catalogo.prove`
   * («abilita:percezione»), `difficolta` an id of `catalogo.difficolta` or null for the set's default, `motivo` a few
   * words for the narrator. It joins the next closed window.
   */
  | { tipo: 'chiedi_prova'; id_pg: string; cosa: string; difficolta: string | null; motivo?: string; privata?: boolean }
  /** Campagna a pacchetti: (fine sessione se serve, poi) si passa al pacchetto dopo, dal suo riassunto iniziale. */
  | { tipo: 'prossima_sessione' }
  /** Cambia (o dimentica, con null) il PG ricordato di un telefono: vale dal suo prossimo collegamento. */
  | { tipo: 'dispositivo'; dispositivo: string; id_pg: string | null }
  /** Mette un PNG in scena o altrove a mano (null = torna a quanto dice la scena). Vale finché non cambia scena. */
  | { tipo: 'presenza'; id_png: string; presente: boolean | null }
  /** Rivela a mano un PNG nascosto (scheda `nascosto: true`): si mostra al tavolo anche senza aver parlato. */
  | { tipo: 'rivela'; id_png: string }
  /**
   * Sets an NPC's attitude by hand (docs/mondo.md §4, A25): towards one PC or every PC (`tutti`), any state, no limits;
   * cause `master` in the log, the snapshot and registro.yaml.
   */
  | { tipo: 'atteggiamento'; id_png: string; id_pg: string; stato: 'ostile' | 'indifferente' | 'amichevole' }
  /**
   * Creation at the table (docs/creazione.md): approve or undo one step of a phone's draft, approve the finished PC (it
   * joins the campaign), discard a draft, or give the starting spells when the set says the Game Master picks them.
   */
  | { tipo: 'creazione'; azione: 'approva' | 'scarta' | 'approva_passo' | 'annulla_passo' | 'incantesimi'; id: string; passo?: PassoCreazione; libro?: string[] }
  /**
   * A reaction roll of the set's tables (docs/prove.md §9; Basic Fantasy pp. 46, 50): the Engine rolls the table's dice +
   * the lead PC's characteristic bonus + the Game Master's adjustment; the band goes to the narrator, the card to the
   * panel; with an NPC, its attitude towards that PC follows the band (when the table says one).
   */
  | { tipo: 'reazione'; tabella: string; id_pg: string; id_png?: string | null; aggiustamento?: number };

export type TipoComandoMaster = ComandoMaster['tipo'];

/** Limiti delle note di regia (manuale: al massimo 3 note, che restano per 15 turni). */
export const NOTE_REGIA_MAX = 3;
export const NOTE_REGIA_TURNI_MAX = 15;
export const NOTA_REGIA_MAX_CARATTERI = 280;

/** Risposta a `master:entra`. */
export type EsitoEntrataMaster = { ok: true; stato: StatoMaster } | { ok: false; errore: string };
