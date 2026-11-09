/**
 * @cantastorie/shared — il set di regole della campagna come lo vedono i telefoni (docs/regole.md).
 *
 * Ogni campagna gioca con un set di regole: quello ricavato dal manuale dell'utente (manuali/, mai nel
 * repository) oppure, senza manuale, l'SRD 5.2. Il telefono mostra il riassunto nella scheda «Regole»
 * e può chiedere una regola: la risposta arriva solo a quel telefono, presa dai passi del manuale.
 */

/** Come si risolve un tiro nel set (regole.yaml → risoluzione.tipo). */
export type TipoRisoluzione =
  /** d20 + modificatore contro una CD (SRD 5.2 e simili). */
  | 'd20_cd'
  /** 2d6 + statistica, a fasce: 10+ pieno, 7–9 con un costo, 6- fallimento (PbtA). */
  | '2d6_fasce'
  /** Tiro sotto una soglia della scheda: d100 (alla Cthulhu) o d20 (alla Cairn). */
  | 'sotto_soglia';

/** Il set di regole per il telefono (evento `regole:leggi`). */
export interface RegolePubbliche {
  id: string;
  nome: string;
  risoluzione: TipoRisoluzione;
  /** riassunto.md del set: breve, per i giocatori (markdown semplice: titoli, elenchi, grassetto). */
  riassunto: string;
  /** Da dove viene il set: titolo del manuale, o «SRD 5.2». */
  fonte: string;
  /** Licenza dichiarata del manuale e attribuzione, per i crediti. */
  licenza: string;
  attribuzione: string | null;
  /** Si possono fare domande sulle regole (c'è un modello e ci sono passi del manuale). */
  domande: boolean;
}

/** Risposta a «Chiedi una regola» (evento `regole:chiedi`): solo per il telefono che ha chiesto. */
export type RispostaRegola =
  | {
      ok: true;
      /** Risposta breve, in italiano, presa dai passi del manuale. */
      testo: string;
      /** Titoli dei passi usati («Convincere qualcuno», «Vantaggio e svantaggio»). */
      fonti: string[];
    }
  | { ok: false; errore: string };
