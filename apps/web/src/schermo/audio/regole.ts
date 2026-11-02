/**
 * Regole dell'audio del proiettore, PURE (niente Web Audio, niente timer): le usa il regista
 * (regista.ts) e si provano in Node con un orologio finto (regole.test.ts).
 *
 * - IsteresiMusica: la musica non cambia più di una volta ogni `intervalloMs` (60 s), salvo un
 *   cambio esplicito (umore scelto dal master o dal Motore, cambio di scena). Partire dal silenzio
 *   non è un «cambio» che fa ballare la musica: avviene subito, ma fa partire l'intervallo.
 * - MemoriaTemi: il tema di un PNG suona una volta sola per scena, alla sua prima battuta.
 * - PianoDucking: musica e ambienti scendono di ~9 dB poco prima che la voce cominci e risalgono
 *   solo dopo una tenuta di silenzio (niente «pompaggio» tra una frase e l'altra).
 */

// ------------------------------------------------------------------ utilità

/** Decibel → guadagno lineare. */
export function dbALineare(db: number): number {
  return 10 ** (db / 20);
}

/** Guadagno lineare → decibel (−∞ per 0). */
export function lineareADb(g: number): number {
  return g > 0 ? 20 * Math.log10(g) : -Infinity;
}

/**
 * Curva di dissolvenza a potenza costante (seno/coseno) da `da` ad `a`: in una dissolvenza
 * incrociata tra due brani diversi la somma delle potenze resta costante (niente buco a metà).
 * `entrata`: true = da 0 verso `a` (seno), false = da `da` verso 0 (coseno).
 */
export function curvaPotenzaCostante(punti: number, valore: number, entrata: boolean): Float32Array<ArrayBuffer> {
  const n = Math.max(2, Math.floor(punti));
  const curva = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = i / (n - 1);
    curva[i] = valore * (entrata ? Math.sin((x * Math.PI) / 2) : Math.cos((x * Math.PI) / 2));
  }
  // Estremi esatti: il brano che esce arriva davvero a zero, quello che entra al suo volume.
  curva[0] = entrata ? 0 : valore;
  curva[n - 1] = entrata ? valore : 0;
  return curva;
}

// ------------------------------------------------------------------ isteresi della musica

export const INTERVALLO_MUSICA_MS = 60_000;

export interface RichiestaMusica {
  /** Brano voluto (id del catalogo), null = silenzio. */
  id: string | null;
  /** Cambio esplicito (umore del master/Motore, cambio di scena): non aspetta l'intervallo. */
  forza: boolean;
}

export type DecisioneMusica =
  /** Si passa subito a `id` (dissolvenza incrociata). */
  | { tipo: 'cambia'; id: string | null }
  /** Troppo presto: `id` resta in attesa; richiamare `scadenza` fra `traMs`. */
  | { tipo: 'rimanda'; id: string | null; traMs: number }
  /** Niente da fare (è già il brano corrente, o non c'è niente in attesa). */
  | { tipo: 'resta' };

export class IsteresiMusica {
  private corrente: string | null = null;
  /** Brano in attesa che l'intervallo scada (undefined = nessuno). */
  private pendente: string | null | undefined = undefined;
  private ultimoCambio: number | null = null;

  constructor(readonly intervalloMs: number = INTERVALLO_MUSICA_MS) {}

  get branoCorrente(): string | null {
    return this.corrente;
  }

  get branoPendente(): string | null | undefined {
    return this.pendente;
  }

  /** Nuova richiesta (a ogni stato della scena che cambia la musica voluta). */
  chiedi(r: RichiestaMusica, ora: number): DecisioneMusica {
    if (r.id === this.corrente) {
      // Si è tornati al brano che suona: quello in attesa non serve più.
      this.pendente = undefined;
      return { tipo: 'resta' };
    }
    // Dal silenzio si parte subito; un cambio esplicito pure.
    if (r.forza || this.corrente === null || this.trascorso(ora) >= this.intervalloMs) return this.cambia(r.id, ora);
    this.pendente = r.id;
    return { tipo: 'rimanda', id: r.id, traMs: this.intervalloMs - this.trascorso(ora) };
  }

  /** Il timer del rinvio è scaduto: applica il brano in attesa, se serve ancora. */
  scadenza(ora: number): DecisioneMusica {
    if (this.pendente === undefined) return { tipo: 'resta' };
    const id = this.pendente;
    if (id === this.corrente) {
      this.pendente = undefined;
      return { tipo: 'resta' };
    }
    if (this.trascorso(ora) < this.intervalloMs) return { tipo: 'rimanda', id, traMs: this.intervalloMs - this.trascorso(ora) };
    return this.cambia(id, ora);
  }

  /** Dimentica tutto (sessione ricominciata). */
  azzera(): void {
    this.corrente = null;
    this.pendente = undefined;
    this.ultimoCambio = null;
  }

  private trascorso(ora: number): number {
    return this.ultimoCambio === null ? Infinity : ora - this.ultimoCambio;
  }

  private cambia(id: string | null, ora: number): DecisioneMusica {
    this.corrente = id;
    this.pendente = undefined;
    this.ultimoCambio = ora;
    return { tipo: 'cambia', id };
  }
}

// ------------------------------------------------------------------ temi dei PNG

export class MemoriaTemi {
  private scena: string | null = null;
  private readonly suonati = new Set<string>();

  /**
   * True la prima volta che `png` parla nella scena `scena` (e da lì in poi false, fino a una
   * scena nuova o ad `azzera`). Il cambio di scena dimentica i temi della scena prima.
   */
  deveSuonare(scena: string, png: string): boolean {
    if (scena !== this.scena) {
      this.scena = scena;
      this.suonati.clear();
    }
    if (this.suonati.has(png)) return false;
    this.suonati.add(png);
    return true;
  }

  /** Temi già suonati nella scena corrente (debug). */
  get elenco(): string[] {
    return [...this.suonati].map((p) => `${this.scena}:${p}`);
  }

  azzera(): void {
    this.scena = null;
    this.suonati.clear();
  }
}

// ------------------------------------------------------------------ ducking sotto la voce

/** Di quanto scendono musica e ambienti sotto la voce (dB). */
export const DUCKING_DB = -9;

export interface OpzioniDucking {
  /** Guadagno sotto la voce (lineare). */
  livello: number;
  /** La discesa comincia così tanto prima della voce (s), se la voce è programmata in anticipo. */
  anticipoS: number;
  /** Costante di tempo della discesa (s, setTargetAtTime): ~95 % in 3τ. */
  attaccoTau: number;
  /** Silenzio della voce oltre il quale si risale (s): copre le pause tra le frasi. */
  tenutaS: number;
  /** Costante di tempo della risalita (s). */
  rilascioTau: number;
}

export const DUCKING_PREDEFINITO: OpzioniDucking = {
  livello: dbALineare(DUCKING_DB),
  anticipoS: 0.25,
  attaccoTau: 0.1,
  tenutaS: 1.4,
  rilascioTau: 0.45,
};

/** Un comando per il guadagno «sotto voce»: setTargetAtTime(valore, a, tau). */
export interface ComandoDucking {
  verso: 'giu' | 'su';
  valore: number;
  /** Istante sull'orologio del contesto audio (s). */
  a: number;
  tau: number;
}

export interface EsitoDucking {
  comandi: ComandoDucking[];
  /** Quando richiamare `controlla` (orologio del contesto, s), o null se non serve. */
  controlloAlle: number | null;
}

export class PianoDucking {
  private abbassato = false;
  /** Fine dell'ultima voce programmata (orologio del contesto). */
  private fineVoce = 0;
  /** Ultimo istante usato: i comandi vanno sempre avanti nel tempo (mai cancellazioni). */
  private ultimoA = 0;
  private conteggio = 0;

  constructor(readonly o: OpzioniDucking = DUCKING_PREDEFINITO) {}

  get sottoVoce(): boolean {
    return this.abbassato;
  }

  /** Quante volte musica e ambienti sono scesi sotto la voce. */
  get abbassamenti(): number {
    return this.conteggio;
  }

  /** Un pezzo di voce è in programma da `inizio` a `fine` (orologio del contesto). */
  voce(inizio: number, fine: number, ora: number): EsitoDucking {
    this.fineVoce = Math.max(this.fineVoce, fine);
    const comandi: ComandoDucking[] = [];
    if (!this.abbassato) {
      this.abbassato = true;
      this.conteggio += 1;
      comandi.push(this.comando('giu', this.o.livello, Math.max(ora, inizio - this.o.anticipoS), this.o.attaccoTau));
    }
    return { comandi, controlloAlle: this.fineVoce + this.o.tenutaS };
  }

  /** Controllo programmato: risale se la voce tace da almeno la tenuta. */
  controlla(ora: number): EsitoDucking {
    if (!this.abbassato) return { comandi: [], controlloAlle: null };
    const risalita = this.fineVoce + this.o.tenutaS;
    if (ora < risalita) return { comandi: [], controlloAlle: risalita };
    this.abbassato = false;
    return { comandi: [this.comando('su', 1, ora, this.o.rilascioTau)], controlloAlle: null };
  }

  /** La voce è stata interrotta (audio:interrompi): si risale subito. */
  interrompi(ora: number): EsitoDucking {
    this.fineVoce = ora;
    if (!this.abbassato) return { comandi: [], controlloAlle: null };
    this.abbassato = false;
    return { comandi: [this.comando('su', 1, ora, this.o.rilascioTau)], controlloAlle: null };
  }

  private comando(verso: 'giu' | 'su', valore: number, a: number, tau: number): ComandoDucking {
    const t = Math.max(a, this.ultimoA);
    this.ultimoA = t;
    return { verso, valore, a: t, tau };
  }
}

// ------------------------------------------------------------------ loop con giunta incrociata

/**
 * Giro `k` (da 0) di un loop a giunta incrociata: copie sovrapposte di `giunta` secondi. Ogni
 * copia entra in dissolvenza (tranne la prima), suona e si dissolve mentre entra la successiva.
 */
export function giroIncrociato(inizio: number, durata: number, giunta: number, k: number): { inizio: number; fine: number; prossimo: number } {
  const g = Math.min(Math.max(0, giunta), durata / 2);
  const passo = durata - g;
  const t = inizio + k * passo;
  return { inizio: t, fine: t + durata, prossimo: t + passo };
}
