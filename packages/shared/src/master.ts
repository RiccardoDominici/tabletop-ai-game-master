/**
 * @cantastorie/shared — pannello del master (docs/architettura.md, «Pannello master»).
 *
 * Un umano sul Mac deve poter correggere o fermare il master IA. Il pannello entra nella stanza
 * Socket.IO "master" con un token stampato nel log del server all'avvio: i telefoni non lo
 * conoscono e non possono entrarci. Il server manda `master:stato` (istantanea completa) a ogni
 * cambiamento; il pannello comanda con `master:comando`. Ogni comando finisce nel log come evento.
 *
 * Il pannello vede anche ciò che i telefoni non vedono: azioni private (segnate), segni degli
 * orologi, battute del repertorio. Non vede mai le conoscenze private dei PG.
 */
import type { StatoAzione, StatoTavolo } from './dominio';

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
}

/** La sessione di gioco salvata: il server la riprende da sola dopo un riavvio. */
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
  /** Campagna a pacchetti: (fine sessione se serve, poi) si passa al pacchetto dopo, dal suo riassunto iniziale. */
  | { tipo: 'prossima_sessione' }
  /** Cambia (o dimentica, con null) il PG ricordato di un telefono: vale dal suo prossimo collegamento. */
  | { tipo: 'dispositivo'; dispositivo: string; id_pg: string | null };

export type TipoComandoMaster = ComandoMaster['tipo'];

/** Limiti delle note di regia (manuale: al massimo 3 note, che restano per 15 turni). */
export const NOTE_REGIA_MAX = 3;
export const NOTE_REGIA_TURNI_MAX = 15;
export const NOTA_REGIA_MAX_CARATTERI = 280;

/** Risposta a `master:entra`. */
export type EsitoEntrataMaster = { ok: true; stato: StatoMaster } | { ok: false; errore: string };
