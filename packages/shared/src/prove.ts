/**
 * @tabletop-ai-gm/shared — prove e tiri di dado (docs/prove.md).
 *
 * Il Motore tira i dadi (mai il modello) e manda a proiettore e telefoni una «carta» per ogni
 * tiro: chi tira, cosa (abilità, caratteristica, arma), i d20 con la faccia che conta, il
 * modificatore calcolato dalla scheda, il totale, la CD o la CA da battere e l'esito. Per gli
 * attacchi anche il danno. Un tiro di un'azione PRIVATA arriva solo al telefono di quel giocatore.
 */

/** Tipo di tiro (SRD 5.2, «Tiri di d20»). */
export type TipoTiro =
  /** Prova di caratteristica, con o senza abilità (Persuasione, Atletica, Forza…). */
  | 'prova'
  /** Tiro salvezza contro un pericolo. */
  | 'salvezza'
  /** Tiro per colpire contro la Classe Armatura, poi il danno. */
  | 'attacco'
  /** Prova contro il punteggio passivo di un PNG (10 + modificatore) o contro il tiro di un altro PG. */
  | 'contrapposta';

export type Vantaggio = 'vantaggio' | 'svantaggio';

/** Il danno di un attacco andato a segno. */
export interface DannoMostrato {
  /** Formula dei dadi come la mostra la carta: «1d8+2» (raddoppiata nel critico: «2d8+2»). */
  formula: string;
  /** Facce uscite sui dadi del danno. */
  dadi: number[];
  /** Bonus fisso (modificatore della caratteristica dell'arma). */
  bonus: number;
  totale: number;
  /** Tipo di danno («perforante»), se la scheda lo dice: l'id com'è scritto nella scheda. */
  tipo: string | null;
  /**
   * Il tipo come si legge dopo il totale, nella lingua dei contenuti («perforanti», «da fuoco»,
   * «piercing»): lo compone il Motore (lingue/<codice>/prove.yaml), l'interfaccia lo mostra com'è.
   * Assente nelle carte di prima (si ripiega sul tipo, con la grammatica italiana).
   */
  nome_tipo?: string | null;
}

/** Il tiro dell'avversario in una prova contrapposta tra due PG. */
export interface TiroAvversario {
  nome: string;
  etichetta: string;
  dadi: number[];
  dado: number;
  modificatore: number;
  totale: number;
}

/** Una carta di tiro, così come la mostrano proiettore e telefono. */
export interface TiroMostrato {
  /** Progressivo stabile del Motore («t17»): chiave React e animazione una volta sola. */
  id: string;
  /** Turno di narrazione in cui il tiro conta. */
  turno: number;
  /** Chi tira: id_pg, oppure id_png quando è un PNG che attacca. */
  chi: string;
  nome: string;
  di_png: boolean;
  tipo: TipoTiro;
  /** «Persuasione (Carisma)», «Tiro salvezza su Destrezza», «Balestra leggera». */
  etichetta: string;
  /** I d20 tirati: uno, oppure due con vantaggio o svantaggio. */
  dadi: number[];
  /** Il d20 che conta (il più alto col vantaggio, il più basso con lo svantaggio). */
  dado: number;
  vantaggio: Vantaggio | null;
  /** Perché c'è il vantaggio o lo svantaggio, in poche parole («Corrado lo aiuta»). */
  motivo_vantaggio: string | null;
  /** Modificatore totale, calcolato dalla scheda (caratteristica + competenza + bonus). */
  modificatore: number;
  totale: number;
  /** Il numero da raggiungere: CD (prove e salvezze) o CA (attacchi). */
  contro: { tipo: 'CD' | 'CA' | 'soglia' | 'fasce'; valore: number; descrizione: string | null };
  /** Bersaglio dell'attacco o dell'azione (PNG o PG), se c'è. */
  bersaglio: { id: string; nome: string } | null;
  riuscita: boolean;
  /** 20 naturale su un tiro per colpire: colpo critico (dadi del danno raddoppiati). */
  critico: boolean;
  /** 1 naturale su un tiro per colpire: manca sempre. */
  fallimento_critico: boolean;
  danno: DannoMostrato | null;
  /** Dopo questo tiro il bersaglio è a 0 punti ferita. */
  a_terra: boolean;
  /**
   * An attack that always hits (the set's `attacchi.tipo: automatico`, or a sheet weapon with `automatico: true`):
   * nothing is rolled to hit, only damage. The card shows «automatico: 1d6 = 7 danni», not «7 contro soglia 0».
   */
  automatico?: boolean;
  /** Tiro di un'azione privata: solo sul telefono del suo giocatore. */
  privata: boolean;
  /** Prova contrapposta tra due PG: il tiro dell'altro. */
  avversario: TiroAvversario | null;
  /**
   * Set di regole non SRD (docs/regole.md). Assenti = d20 contro CD o CA, come sempre.
   * - `risoluzione`: come si è tirato; con '2d6_fasce' `dadi` sono i d6 e `dado` la loro somma; con
   *   'sotto_soglia' `dado` è il tiro e `contro` la soglia da non superare (`contro.tipo` 'soglia').
   * - `facce`: facce dei dadi in `dadi` (20 se assente).
   * - `grado`: l'esito a gradi del manuale («Successo con un costo», «Successo difficile»).
   */
  risoluzione?: 'd20_cd' | '2d6_fasce' | 'sotto_soglia';
  facce?: number;
  grado?: { id: 'successo' | 'parziale' | 'fallimento' | 'critico' | 'disastro'; nome: string } | null;
  /** La regola applicata, in parole: «Persuasione: Carisma + competenza, CD 15», «2d6+Fascino: 7–9». */
  regola?: string;
}

/** Punti ferita attuali e massimi (PG sul telefono; PNG solo nel pannello del master). */
export interface PuntiFerita {
  attuali: number;
  massimi: number;
}

// ------------------------------------------------------------------ combattimento (docs/combattimento.md)

/** Un combattente nella barra dell'iniziativa. */
export interface CombattentePubblico {
  id: string;
  nome: string;
  di_png: boolean;
  /** Valore d'iniziativa (individuale); null con l'iniziativa per schieramento o senza. */
  iniziativa: number | null;
  /** Tocca a lui (o al suo schieramento) adesso. */
  corrente: boolean;
  /** Punti ferita: dei PG sempre; dei PNG per la sola barra del proiettore (niente numeri a voce). */
  pf: PuntiFerita | null;
  condizioni: Array<{ id: string; nome: string; icona: string }>;
  stato: 'in_gioco' | 'a_terra' | 'stabile' | 'morto' | 'fuggito';
  /** PG a 0 con i tiri salvezza contro la morte (SRD). */
  tiri_morte: { successi: number; fallimenti: number } | null;
}

/** Lo scontro in corso (StatoTavolo.combattimento): proiettore, telefoni, pannello del master. */
export interface CombattimentoPubblico {
  round: number;
  /** Fase del round (B/X: movimento, proiettili, magia, mischia); null con una sola fase. */
  fase: string | null;
  iniziativa: 'individuale' | 'per_schieramento' | 'nessuna';
  /** In ordine d'iniziativa (PG e PNG). */
  combattenti: CombattentePubblico[];
  /** PG che devono agire adesso (vuoto senza iniziativa: agisce chi vuole). */
  turno_di: string[];
  /** Economia del turno del set, per il telefono («Azione: una», «Movimento: …»). */
  azioni: Array<{ nome: string; quante: string }>;
}
