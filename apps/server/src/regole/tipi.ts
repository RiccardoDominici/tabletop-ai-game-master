/**
 * Set di regole di una campagna (docs/regole.md): campagne/<id>/regole/regole.yaml, ricavato dal
 * manuale dell'utente (manuali/, mai nel repository) o, senza manuale, l'SRD 5.2 prodotto dal codice.
 *
 * Il Motore lo usa per tirare (risoluzione, caratteristiche, modificatori, difficoltà, vantaggio,
 * attacchi, danni); l'arbitro per decidere che cosa si tira col vocabolario del manuale; il telefono
 * per far capire le regole (riassunto.md, «Chiedi una regola» sui passi in estratti/).
 */
import type { TipoRisoluzione } from '@cantastorie/shared';
import type { FormulaDadi } from '../campagna/regole-srd';
import type { Combattimento } from './combattimento';

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
    /** d20_cd: critico e disastro valgono solo per gli attacchi (SRD) o per tutti i tiri. */
    critici: 'attacchi' | 'tutti';
  };
  caratteristiche: Voce[];
  abilita: Array<Voce & { caratteristica: string | null }>;
  /** Come il valore di una caratteristica entra nel tiro. */
  modificatore: 'srd' | 'diretto' | 'soglia';
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
  attacchi: Array<{ id: string; nome: string; danno: FormulaDadi; caratteristica: string | null; abilita: string | null; tipo_danno: string | null; distanza: boolean }>;
  avvisi: string[];
}
