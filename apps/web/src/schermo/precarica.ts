/**
 * Precaricamento delle immagini (luoghi vicini, ritratti): oggetti Image fuori dal DOM, senza
 * doppioni, con un tetto alla memoria. Testato in precarica.test.ts con una fabbrica finta.
 *
 * - `precarica(urls)`: avvia il download di ciò che non è già in cache (solo rete + cache HTTP).
 * - `carica(url)`: download + decodifica (`img.decode()`), così l'immagine è pronta da dipingere
 *   senza scatti quando parte la dissolvenza. Risolve true/false, non rifiuta mai.
 */

/** Il minimo di HTMLImageElement che serve qui (nei test basta un oggetto finto). */
export interface ImmagineCaricabile {
  decode(): Promise<void>;
}

export type FabbricaImmagini = (url: string) => ImmagineCaricabile;

/** Immagini tenute in memoria (le più vecchie si lasciano al garbage collector). */
export const MASSIMO_IN_MEMORIA = 48;

/** Fabbrica del browser: decodifica asincrona, nessun nodo nel DOM. */
export const fabbricaBrowser: FabbricaImmagini = (url) => {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  return img;
};

interface Voce {
  img: ImmagineCaricabile;
  /** Promessa della decodifica, creata alla prima `carica` (il precaricamento non decodifica). */
  pronta: Promise<boolean> | null;
}

export class Precaricatore {
  /** Map in ordine d'inserimento: la prima voce è la più vecchia (si scarta per prima). */
  private readonly voci = new Map<string, Voce>();

  constructor(
    private readonly fabbrica: FabbricaImmagini = fabbricaBrowser,
    private readonly massimo = MASSIMO_IN_MEMORIA,
  ) {}

  /** Avvia il download delle URL nuove (le altre sono già in corso o in cache). */
  precarica(urls: Iterable<string>): void {
    for (const url of urls) {
      if (url) this.voce(url);
    }
  }

  /** Scarica e decodifica `url`; true se è pronta da dipingere, false se il caricamento fallisce. */
  carica(url: string): Promise<boolean> {
    const voce = this.voce(url);
    if (!voce.pronta) {
      voce.pronta = voce.img.decode().then(
        () => true,
        () => {
          // Fallita: via dalla cache, così un nuovo tentativo riparte da zero.
          this.voci.delete(url);
          return false;
        },
      );
    }
    return voce.pronta;
  }

  /** Quante URL sono tenute (per test e HUD). */
  get dimensione(): number {
    return this.voci.size;
  }

  private voce(url: string): Voce {
    const esistente = this.voci.get(url);
    if (esistente) {
      // Usata di nuovo: diventa la più recente.
      this.voci.delete(url);
      this.voci.set(url, esistente);
      return esistente;
    }
    const nuova: Voce = { img: this.fabbrica(url), pronta: null };
    this.voci.set(url, nuova);
    while (this.voci.size > this.massimo) {
      const piuVecchia = this.voci.keys().next().value;
      if (piuVecchia === undefined) break;
      this.voci.delete(piuVecchia);
    }
    return nuova;
  }
}

/** URL da precaricare per la scena: prima i luoghi probabili, poi tutti i ritratti, senza doppioni. */
export function urlDaPrecaricare(prossime: readonly string[], ritratti: Readonly<Record<string, string>>): string[] {
  return [...new Set([...prossime, ...Object.values(ritratti)].filter((u) => u.length > 0))];
}
