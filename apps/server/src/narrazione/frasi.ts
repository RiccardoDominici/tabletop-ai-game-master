/**
 * Divisore incrementale di frasi italiane, per mandare alla voce ogni frase appena è completa.
 *
 * Riceve il testo di UN segmento (senza a capo: le righe le gestisce il parser del narratore)
 * a pezzi arbitrari, come arrivano dallo streaming, e restituisce le frasi finite.
 *
 * Una frase finisce dopo un gruppo di terminatori (. ! ? … ...) seguito da spazio e da un
 * carattere che NON è una lettera minuscola. Serve guardare un carattere avanti: «Aspetta...
 * forse no» resta una frase sola, «Chi va là? chiese» pure. Il costo è il tempo di un token.
 *
 * Casi gestiti:
 * - virgolette « » “ ” e "…": dentro una citazione non si spezza (salvo frasi lunghissime);
 *   le virgolette di chiusura dopo il terminatore restano nella frase («Fermi.» → una frase);
 * - numeri: «3.500» o «1,5» non spezzano (dopo il punto non c'è spazio);
 * - abbreviazioni comuni (sig., dott., prof., …) e iniziali maiuscole («A. Rossi»);
 * - frase troppo lunga senza terminatori: si spezza a «,» «;» «:» oltre `maxCaratteri`,
 *   e in ultima istanza a uno spazio oltre `maxDuro`, così la voce non aspetta troppo.
 */

export interface OpzioniDivisore {
  /** Oltre questa lunghezza si accetta di spezzare a , ; : (default 220). */
  maxCaratteri?: number;
  /** Oltre questa lunghezza si spezza al primo spazio (default 420). */
  maxDuro?: number;
}

const TERMINATORI = new Set(['.', '!', '?', '…']);
/** Caratteri di chiusura che restano attaccati alla frase dopo il terminatore. */
const CHIUSURE = new Set(['»', '”', '"', "'", ')', ']', '’']);
const PAUSE = new Set([',', ';', ':']);

/** Abbreviazioni dopo cui il punto non chiude la frase (confronto minuscolo, senza punto). */
const ABBREVIAZIONI = new Set([
  'sig', 'sigg', 'sig.ra', 'sig.na', 'dott', 'dott.ssa', 'dr', 'prof', 'prof.ssa', 'avv', 'ing',
  'mons', 'gen', 'col', 'cav', 'on', 'egr', 'gent', 'spett', 'ill', 'mr', 'mrs', 'st', 's', 'ss',
  'n', 'nr', 'pag', 'pagg', 'cap', 'art', 'vol', 'fig', 'tel', 'ca', 'cfr', 'es', 'p.es',
]);

function èSpazio(c: string | undefined): boolean {
  return c !== undefined && /\s/.test(c);
}

function èMinuscola(c: string | undefined): boolean {
  return c !== undefined && c !== c.toUpperCase() && c === c.toLowerCase();
}

/** True se la frase contiene almeno una lettera o una cifra (scarta «…» o «»» isolati). */
export function haContenuto(frase: string): boolean {
  return /[\p{L}\p{N}]/u.test(frase);
}

/** Normalizza gli spazi interni di una frase. */
export function pulisciSpazi(frase: string): string {
  return frase.replace(/\s+/g, ' ').trim();
}

export class DivisoreFrasi {
  private buf = '';
  private readonly maxCaratteri: number;
  private readonly maxDuro: number;

  constructor(opzioni: OpzioniDivisore = {}) {
    this.maxCaratteri = opzioni.maxCaratteri ?? 220;
    this.maxDuro = opzioni.maxDuro ?? 420;
  }

  /** Aggiunge testo e restituisce le frasi che ora sono sicuramente complete. */
  aggiungi(testo: string): string[] {
    this.buf += testo;
    const frasi: string[] = [];
    for (;;) {
      const taglio = this.trovaTaglio();
      if (taglio === null) break;
      const frase = pulisciSpazi(this.buf.slice(0, taglio.fine));
      this.buf = this.buf.slice(taglio.ripresa);
      if (haContenuto(frase)) frasi.push(frase);
    }
    return frasi;
  }

  /** Fine del segmento: quello che resta è l'ultima frase. */
  chiudi(): string[] {
    const resto = pulisciSpazi(this.buf);
    this.buf = '';
    return haContenuto(resto) ? [resto] : [];
  }

  /** Testo in attesa (per i test e per il debug). */
  get inAttesa(): string {
    return this.buf;
  }

  /**
   * Cerca il primo punto di taglio sicuro nel buffer.
   * `fine` = dove finisce la frase (esclusivo), `ripresa` = da dove riparte il buffer.
   * null = serve altro testo per decidere.
   */
  private trovaTaglio(): { fine: number; ripresa: number } | null {
    const b = this.buf;
    // Profondità delle citazioni: « » e “ ” si annidano, " si alterna.
    let profondità = 0;
    let doppioAperto = false;
    for (let i = 0; i < b.length; i++) {
      const c = b[i]!;
      if (c === '«' || c === '“') profondità++;
      else if ((c === '»' || c === '”') && profondità > 0) profondità--;
      else if (c === '"') doppioAperto = !doppioAperto;

      const dentroCitazione = profondità > 0 || doppioAperto;

      if (TERMINATORI.has(c)) {
        // Gruppo di terminatori, poi le chiusure (virgolette, parentesi).
        let j = i + 1;
        while (j < b.length && TERMINATORI.has(b[j]!)) j++;
        let prof: number = profondità;
        let doppio: boolean = doppioAperto;
        while (j < b.length && CHIUSURE.has(b[j]!)) {
          const ch = b[j]!;
          if ((ch === '»' || ch === '”') && prof > 0) prof--;
          else if (ch === '"') {
            if (!doppio) break; // un " di apertura non è una chiusura
            doppio = false;
          }
          j++;
        }
        if (j >= b.length) return null; // non sappiamo ancora cosa segue
        if (!èSpazio(b[j])) {
          // «3.5», «ah...no»: nessun taglio; si riprende a guardare dopo il gruppo.
          profondità = prof;
          doppioAperto = doppio;
          i = j - 1;
          continue;
        }
        let k = j;
        while (k < b.length && èSpazio(b[k])) k++;
        if (k >= b.length) return null; // serve il carattere dopo lo spazio
        const dopoCitazione = prof > 0 || doppio;
        const lunga = i > this.maxCaratteri;
        const continua = èMinuscola(b[k]);
        const abbreviazione = c === '.' && j === i + 1 && this.èAbbreviazione(b, i);
        if (!continua && !abbreviazione && (!dopoCitazione || lunga)) {
          return { fine: j, ripresa: k };
        }
        // Le chiusure consumate hanno già aggiornato le virgolette: si riparte da j.
        profondità = prof;
        doppioAperto = doppio;
        i = j - 1;
        continue;
      }

      // Frase lunga senza terminatori: pausa forte oltre maxCaratteri, spazio oltre maxDuro.
      if (i > this.maxCaratteri && PAUSE.has(c) && !dentroCitazione) {
        if (i + 1 >= b.length) return null;
        if (èSpazio(b[i + 1])) {
          let k = i + 1;
          while (k < b.length && èSpazio(b[k])) k++;
          if (k >= b.length) return null;
          return { fine: i + 1, ripresa: k };
        }
      }
      if (i > this.maxDuro && èSpazio(c)) {
        let k = i;
        while (k < b.length && èSpazio(b[k])) k++;
        if (k >= b.length) return null;
        return { fine: i, ripresa: k };
      }
    }
    return null;
  }

  /** La parola che precede il punto in posizione `i` è un'abbreviazione o un'iniziale? */
  private èAbbreviazione(b: string, i: number): boolean {
    let s = i;
    while (s > 0 && !èSpazio(b[s - 1]) && !'«“("\''.includes(b[s - 1]!)) s--;
    const parola = b.slice(s, i);
    if (!parola) return false;
    // Iniziale: una sola lettera maiuscola («A. Rossi»).
    if (parola.length === 1 && /\p{Lu}/u.test(parola)) return true;
    return ABBREVIAZIONI.has(parola.toLowerCase());
  }
}

/** Divide un testo intero (non in streaming), per esempio il testo d'apertura della scena. */
export function dividiTesto(testo: string, opzioni?: OpzioniDivisore): string[] {
  const d = new DivisoreFrasi(opzioni);
  const frasi: string[] = [];
  // Gli a capo chiudono la frase come in streaming.
  for (const riga of testo.split(/\r?\n/)) {
    frasi.push(...d.aggiungi(riga));
    frasi.push(...d.chiudi());
  }
  return frasi;
}
