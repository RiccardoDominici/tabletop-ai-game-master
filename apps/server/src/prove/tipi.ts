/**
 * Tipi del modulo prove (docs/prove.md): la decisione dell'arbitro per un'azione, l'ingresso
 * dell'arbitro e l'esito di un turno di tiri.
 */
import type { TiroMostrato } from '@cantastorie/shared';
import type { Abilita, Caratteristica, Difficolta } from '../campagna/regole-srd';
import type { EsitoCombattimento } from './combattimento';

/**
 * Che cosa serve per risolvere un'azione.
 * - nessuna: l'azione è banale o non ha un fallimento interessante → riesce, senza tiro;
 * - impossibile: non può riuscire come scritta → niente tiro, il narratore dice «sì, ma» o perché no;
 * - prova: prova di caratteristica (con o senza abilità) contro una CD;
 * - salvezza: tiro salvezza contro un pericolo;
 * - attacco: tiro per colpire contro la CA di un bersaglio, con un'arma della scheda;
 * - contrapposta: abilità del PG contro il passivo di un PNG (o contro il tiro di un altro PG);
 * - aiuto: il PG aiuta l'azione di un altro (azione Aiutare, SRD 5.2): quella ha vantaggio.
 */
export type TipoDecisione = 'nessuna' | 'impossibile' | 'prova' | 'salvezza' | 'attacco' | 'contrapposta' | 'aiuto';

export interface DecisioneProva {
  /** Id dell'azione. */
  id: string;
  tipo: TipoDecisione;
  caratteristica: Caratteristica | null;
  abilita: Abilita | null;
  /** id_png o id_pg verso cui è diretta (attacco, influenza, contrapposta). */
  bersaglio: string | null;
  /** Id dell'arma (attacchi della scheda) per gli attacchi. */
  arma: string | null;
  /** Prova scritta nei dati della scena (id), se l'azione è proprio quella. */
  prova_scena: string | null;
  /** Difficoltà dalla scala SRD, quando i dati non danno una CD. */
  difficolta: Difficolta | null;
  /** Abilità del bersaglio nelle contrapposte (Percezione contro Furtività…). */
  abilita_bersaglio: Abilita | null;
  vantaggio: 'vantaggio' | 'svantaggio' | null;
  /** Una frase breve: perché c'è vantaggio o svantaggio, o perché è impossibile (senza segreti). */
  motivo: string;
  /** tipo «aiuto»: id dell'azione aiutata. */
  aiuta: string | null;
  /**
   * Il PNG che reagisce attaccando l'autore: «sempre» (lo si è attaccato ed è ancora in piedi, o la
   * lotta è in corso), «se_fallisce» (l'azione fallita lo scatena). null = nessuna reazione.
   */
  reazione: { png: string; condizione: 'sempre' | 'se_fallisce' } | null;
}

/**
 * Decisione per un set di regole non SRD (docs/regole.md): stessi campi, ma caratteristiche, abilità e
 * difficoltà sono gli id del set, e c'è la mossa (PbtA) se il set ne ha.
 */
export interface DecisioneRegole extends Omit<DecisioneProva, 'caratteristica' | 'abilita' | 'difficolta' | 'abilita_bersaglio'> {
  caratteristica: string | null;
  abilita: string | null;
  difficolta: string | null;
  abilita_bersaglio: string | null;
  mossa: string | null;
}

/** Azione come la vede l'arbitro delle prove. */
export interface AzioneDaClassificare {
  id: string;
  autore: string;
  nome: string;
  testo: string;
  privata: boolean;
}

export interface IngressoArbitroProve {
  /** Riassunto pubblico della scena (lo stesso dell'arbitro delle azioni). */
  scena: string;
  /** Ultima narrazione pubblica. */
  narrazione: string;
  /** Righe pronte: PG al tavolo, PNG in scena con le loro schede (per id, attacchi, atteggiamenti). */
  personaggi: string;
  /** Righe pronte: prove scritte nei dati della scena (id · quando · abilità). */
  proveScena: string;
  /** Le azioni da classificare. */
  azioni: AzioneDaClassificare[];
  /** Altre azioni pubbliche in coda (per «aiuto» e contesto), già classificate o no. */
  altre: AzioneDaClassificare[];
}

export interface ArbitroProve<D = DecisioneProva> {
  classifica(i: IngressoArbitroProve): Promise<Record<string, D>>;
}

/** Esito dei tiri di un'azione: le carte e il fatto per il narratore. */
export interface EsitoAzioneProve {
  id_azione: string;
  autore: string;
  decisione: DecisioneProva | null;
  tiri: TiroMostrato[];
  /** Riga per il narratore («Ida, Persuasione contro Baldrin: 17 contro CD 15, riuscita.»). */
  fatto: string;
  /** Prove riuscite di questa azione, come le cerca il cancello `richiede.prova` del repertorio. */
  riuscite: string[];
  /**
   * Prove FALLITE di questa azione (stessi id): una battuta legata a una di queste con `richiede.prova`
   * non risponde all'azione, nemmeno per un'altra strada di `oppure` (e2e finale, D2).
   */
  fallite: string[];
  /** Esito complessivo dell'azione dell'autore: null = nessun tiro. */
  riuscita: boolean | null;
}

export interface EsitoTurnoProve {
  turno: number;
  perAzione: Map<string, EsitoAzioneProve>;
  /** Tutte le carte del turno, in ordine (anche le private: il filtro lo fa chi le manda). */
  tiri: TiroMostrato[];
  /** Righe per il narratore (in ordine di risoluzione), già con le marcature delle azioni private. */
  fatti: string[];
  /** Millisecondi spesi ad aspettare l'arbitro alla chiusura (0 = tutto già pronto). */
  attesa_ms: number;
  /** Azioni classificate solo alla chiusura (l'arbitro all'invio non c'era o era vecchio). */
  tardive: string[];
  /** Lo scontro dopo questo turno (invitati, intestazione per il narratore, fine), o null. */
  combattimento: EsitoCombattimento | null;
}
