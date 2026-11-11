/**
 * Programmatore dell'audio in streaming: macchina a stati PURA di frasi e turni.
 *
 * Riceve gli eventi del server (`audio:frase`, `audio:pezzo`, `audio:fine_frase`,
 * `audio:fine_turno`) insieme all'ora dell'orologio audio e risponde con:
 * - i pezzi da suonare (campioni Float32 + istante d'inizio sull'orologio del contesto);
 * - i «segni» della linea del tempo: inizio/fine di frasi e turni, collocati nell'istante in cui
 *   il suono comincia o finisce DAVVERO (non quando l'evento arriva: la generazione corre avanti
 *   rispetto alla riproduzione). Il guscio Web Audio (`lettore.ts`) li fa scattare quando
 *   `ctx.currentTime` li raggiunge, e da lì partono sottotitoli e avvisi al server.
 *
 * Niente Web Audio qui dentro: tutto è testabile in Node con un orologio finto.
 */
import type { AudioFineFrase, AudioFineTurno, AudioFrase } from '@tabletop-ai-gm/shared';
import { int16leAFloat32, RiportoByte } from './pcm';
import { JITTER_S, Pianificatore } from './pianificatore';

/** Frequenza usata se l'annuncio della frase ne porta una non valida (Qwen3-TTS: 24 kHz). */
export const SAMPLE_RATE_PREDEFINITO = 24000;

/** Un punto della linea del tempo audio (t in secondi sull'orologio del contesto). */
export type Segno =
  | { tipo: 'inizio_turno'; t: number; turno: number; id_frase: string }
  | { tipo: 'inizio_frase'; t: number; frase: AudioFrase }
  | { tipo: 'fine_frase'; t: number; id_frase: string; turno: number }
  | { tipo: 'fine_turno'; t: number; turno: number; buchi: StatisticheBuchi };

/**
 * Buchi di un turno. «In frase» = il suono si interrompe a metà di una frase (si sente come un
 * inciampo); «tra frasi» = la frase dopo arriva tardi (si sente come una pausa più lunga).
 */
export interface StatisticheBuchi {
  buchi: number;
  buchi_in_frase: number;
  buchi_tra_frasi: number;
  /** Silenzio totale inserito dai buchi (ms). */
  silenzio_ms: number;
}

/** Pezzo pronto per diventare un AudioBuffer. */
export interface PezzoDaSuonare {
  id_frase: string;
  turno: number;
  seq: number;
  campioni: Float32Array<ArrayBuffer>;
  sampleRate: number;
  /** Istante d'inizio sull'orologio del contesto. */
  inizio: number;
  /** Durata in secondi. */
  durata: number;
}

export interface EsitoPezzo {
  /** null se il pezzo non contiene campioni interi o la frase è sconosciuta. */
  pezzo: PezzoDaSuonare | null;
  /** Segni nuovi da far scattare (inizio turno/frase). */
  segni: Segno[];
  /** Il pezzo è arrivato in ritardo a metà turno (underrun). */
  buco: boolean;
  /** Perché il pezzo non si suona, se non si suona. */
  scartato: 'frase_sconosciuta' | 'vuoto' | null;
}

/** Contatori cumulativi (per HUD e debug e2e). */
export interface ContatoriAudio {
  /** Pezzi ricevuti (anche quelli scartati). */
  pezzi: number;
  /** Byte PCM ricevuti. */
  byte: number;
  /** Secondi di audio messi in programma. */
  secondiProgrammati: number;
  /** Buchi contati in tutta la sessione. */
  buchi: number;
  /** Byte dispari rimasti orfani a fine frase (frase troncata). */
  byteOrfani: number;
  /** Pezzi di frasi mai annunciate (scartati). */
  pezziSenzaFrase: number;
}

interface StatoFrase {
  meta: AudioFrase;
  riporto: RiportoByte;
  /** Il primo pezzo è già in programma (il suo segno d'inizio è emesso). */
  iniziata: boolean;
  /** Fine dell'ultimo pezzo programmato della frase. */
  fine: number | null;
}

interface StatoTurno {
  /** Almeno un pezzo del turno è in programma: da qui in poi un ritardo è un buco. */
  iniziato: boolean;
  buchi: number;
  buchiInFrase: number;
  silenzio: number;
  /** Fine dell'ultimo pezzo programmato del turno. */
  fine: number | null;
}

export class Programmatore {
  private readonly pianificatore: Pianificatore;
  private readonly frasi = new Map<string, StatoFrase>();
  private readonly turni = new Map<number, StatoTurno>();
  readonly contatori: ContatoriAudio = {
    pezzi: 0,
    byte: 0,
    secondiProgrammati: 0,
    buchi: 0,
    byteOrfani: 0,
    pezziSenzaFrase: 0,
  };

  constructor(jitterS: number = JITTER_S) {
    this.pianificatore = new Pianificatore(jitterS);
  }

  /** Annuncio di una frase: prepara il riporto dei byte e il turno. */
  frase(meta: AudioFrase): void {
    this.frasi.set(meta.id_frase, { meta, riporto: new RiportoByte(), iniziata: false, fine: null });
    this.turno(meta.turno);
  }

  /**
   * Un pezzo PCM della frase `id_frase` arrivato quando l'orologio audio segnava `ora`.
   */
  pezzo(id_frase: string, seq: number, byte: Uint8Array, ora: number): EsitoPezzo {
    this.contatori.pezzi += 1;
    this.contatori.byte += byte.byteLength;

    const frase = this.frasi.get(id_frase);
    if (!frase) {
      // Frase non annunciata (es. ci siamo connessi a metà): senza sample rate e turno non si suona.
      this.contatori.pezziSenzaFrase += 1;
      return { pezzo: null, segni: [], buco: false, scartato: 'frase_sconosciuta' };
    }

    const pari = frase.riporto.unisci(byte);
    if (pari.byteLength === 0) {
      return { pezzo: null, segni: [], buco: false, scartato: 'vuoto' };
    }

    const campioni = int16leAFloat32(pari);
    const sampleRate =
      Number.isFinite(frase.meta.sample_rate) && frase.meta.sample_rate > 0
        ? frase.meta.sample_rate
        : SAMPLE_RATE_PREDEFINITO;
    const durata = campioni.length / sampleRate;
    const turno = this.turno(frase.meta.turno);

    const { inizio, buco, silenzio } = this.pianificatore.programma(ora, durata, turno.iniziato);

    const segni: Segno[] = [];
    if (!turno.iniziato) {
      turno.iniziato = true;
      segni.push({ tipo: 'inizio_turno', t: inizio, turno: frase.meta.turno, id_frase });
    }
    if (!frase.iniziata) {
      frase.iniziata = true;
      segni.push({ tipo: 'inizio_frase', t: inizio, frase: frase.meta });
    }
    if (buco) {
      turno.buchi += 1;
      // Il primo pezzo di una frase che arriva tardi è una pausa tra frasi; gli altri, un inciampo.
      if (frase.fine !== null) turno.buchiInFrase += 1;
      turno.silenzio += silenzio;
      this.contatori.buchi += 1;
    }

    const fine = inizio + durata;
    frase.fine = fine;
    turno.fine = fine;
    this.contatori.secondiProgrammati += durata;

    return {
      pezzo: { id_frase, turno: frase.meta.turno, seq, campioni, sampleRate, inizio, durata },
      segni,
      buco,
      scartato: null,
    };
  }

  /**
   * Fine di una frase: il segno di fine cade dove finisce il suo ultimo pezzo.
   * Una frase mai suonata (TTS fallito) non produce segni: non è mai stata mostrata.
   */
  fineFrase(fine: AudioFineFrase): Segno[] {
    const frase = this.frasi.get(fine.id_frase);
    if (!frase) return [];
    if (frase.riporto.svuota()) this.contatori.byteOrfani += 1;
    this.frasi.delete(fine.id_frase);
    if (!frase.iniziata || frase.fine === null) return [];
    return [{ tipo: 'fine_frase', t: frase.fine, id_frase: fine.id_frase, turno: frase.meta.turno }];
  }

  /**
   * Fine del turno: il segno cade dove finisce l'ultimo pezzo programmato del turno.
   * Un turno senza audio si chiude subito (`ora`), così il server non resta ad aspettare.
   */
  fineTurno(fine: AudioFineTurno, ora: number): Segno[] {
    const turno = this.turni.get(fine.turno);
    this.turni.delete(fine.turno);
    // Frasi del turno rimaste senza `audio:fine_frase`: non arriveranno altri pezzi.
    for (const [id, frase] of this.frasi) {
      if (frase.meta.turno === fine.turno) this.frasi.delete(id);
    }
    const t = turno?.fine ?? ora;
    const buchi = turno?.buchi ?? 0;
    const inFrase = turno?.buchiInFrase ?? 0;
    return [
      {
        tipo: 'fine_turno',
        t,
        turno: fine.turno,
        buchi: { buchi, buchi_in_frase: inFrase, buchi_tra_frasi: buchi - inFrase, silenzio_ms: Math.round((turno?.silenzio ?? 0) * 1000) },
      },
    ];
  }

  /** `audio:interrompi`: dimentica frasi, turni e linea del tempo. */
  interrompi(): void {
    this.pianificatore.azzera();
    this.frasi.clear();
    this.turni.clear();
  }

  /** Secondi già programmati davanti a `ora`. */
  anticipo(ora: number): number {
    return this.pianificatore.anticipo(ora);
  }

  /** Il turno indicato ha già pezzi in programma? (per test e diagnostica) */
  turnoIniziato(turno: number): boolean {
    return this.turni.get(turno)?.iniziato ?? false;
  }

  private turno(numero: number): StatoTurno {
    let stato = this.turni.get(numero);
    if (!stato) {
      stato = { iniziato: false, buchi: 0, buchiInFrase: 0, silenzio: 0, fine: null };
      this.turni.set(numero, stato);
    }
    return stato;
  }
}
