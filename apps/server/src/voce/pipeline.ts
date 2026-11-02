/**
 * Pipeline della voce: le frasi vanno al motore vocale in ordine, UNA alla volta (il servizio
 * MLX genera comunque una richiesta per volta), e ogni pezzo di PCM viene inoltrato subito allo
 * schermo. La generazione corre davanti alla riproduzione: lo schermo accumula e suona senza buchi.
 *
 * Per ogni turno la pipeline sa quante frasi ha ricevuto e quante ha finito; quando il turno è
 * dichiarato chiuso (`chiudiTurno`) e l'ultima frase è finita, manda `fine_turno`.
 * `interrompi()` ferma la frase in corso (AbortController → il servizio smette di generare),
 * svuota la coda e dice allo schermo di tacere.
 */
import type { AudioFineFrase, AudioFineTurno, AudioFrase, AudioPezzo } from '@cantastorie/shared';
import type { Logger } from '../logger';
import { ErroreVoce, type MotoreVoce, type NomeMotoreVoce } from './tipi';

export interface FraseDaDire {
  id_frase: string;
  turno: number;
  indice: number;
  parlante: string;
  nome: string;
  voce_id: string;
  testo: string;
}

/** Dove va l'audio (in produzione: la stanza "schermo" di Socket.IO). */
export interface UscitaAudio {
  frase(meta: AudioFrase): void;
  pezzo(pezzo: AudioPezzo): void;
  fineFrase(fine: AudioFineFrase): void;
  fineTurno(fine: AudioFineTurno): void;
  interrompi(): void;
}

export interface EsitoFrase {
  secondi: number;
  interrotta: boolean;
  errore?: string;
  motore: NomeMotoreVoce;
}

/** Ganci per le misure di latenza (tutti facoltativi). */
export interface OsservatorePipeline {
  richiesta?(frase: FraseDaDire, motore: NomeMotoreVoce): void;
  primoAudio?(frase: FraseDaDire): void;
  fineFrase?(frase: FraseDaDire, esito: EsitoFrase): void;
}

export interface EsitoTurnoVoce {
  turno: number;
  frasi: number;
  secondi: number;
  interrotto: boolean;
}

interface StatoTurno {
  frasi: number;
  finite: number;
  secondi: number;
  chiuso: boolean;
  attese: Array<(e: EsitoTurnoVoce) => void>;
}

const VOCE_RISERVA = 'narratore';

export class PipelineVoce {
  private coda: FraseDaDire[] = [];
  private inCorso: { frase: FraseDaDire; controllo: AbortController } | null = null;
  private lavora = false;
  private turni = new Map<number, StatoTurno>();
  /** Cambia a ogni interruzione: i risultati di un'epoca vecchia vengono ignorati. */
  private epoca = 0;

  constructor(
    private readonly opzioni: {
      motore: () => MotoreVoce;
      uscita: UscitaAudio;
      log: Logger;
      osservatore?: OsservatorePipeline;
    },
  ) {}

  /** Frasi in coda (esclusa quella in corso). */
  get inCoda(): number {
    return this.coda.length;
  }

  accoda(frase: FraseDaDire): void {
    const t = this.turno(frase.turno);
    if (t.chiuso) {
      this.opzioni.log.error({ turno: frase.turno, id_frase: frase.id_frase }, 'voce: frase accodata a un turno già chiuso, ignorata');
      return;
    }
    t.frasi += 1;
    this.coda.push(frase);
    void this.ciclo();
  }

  /**
   * Il turno non avrà altre frasi. La promessa si risolve quando tutte le sue frasi sono
   * state generate e inoltrate (o il turno è stato interrotto).
   */
  chiudiTurno(turno: number): Promise<EsitoTurnoVoce> {
    const t = this.turno(turno);
    t.chiuso = true;
    const p = new Promise<EsitoTurnoVoce>((risolvi) => t.attese.push(risolvi));
    this.verificaFineTurno(turno);
    return p;
  }

  /** Ferma tutto subito: frase in corso, coda, e audio sullo schermo. */
  interrompi(motivo: string): void {
    this.epoca += 1;
    const scartate = this.coda.length;
    this.coda = [];
    if (this.inCorso) {
      this.opzioni.log.info({ id_frase: this.inCorso.frase.id_frase, scartate, motivo }, 'voce: interruzione');
      this.inCorso.controllo.abort(new Error(`interrotta: ${motivo}`));
    }
    for (const [turno, t] of this.turni) {
      const esito: EsitoTurnoVoce = { turno, frasi: t.frasi, secondi: t.secondi, interrotto: true };
      for (const risolvi of t.attese) risolvi(esito);
    }
    this.turni.clear();
    this.opzioni.uscita.interrompi();
  }

  private turno(n: number): StatoTurno {
    let t = this.turni.get(n);
    if (!t) {
      t = { frasi: 0, finite: 0, secondi: 0, chiuso: false, attese: [] };
      this.turni.set(n, t);
    }
    return t;
  }

  private verificaFineTurno(turno: number): void {
    const t = this.turni.get(turno);
    if (!t || !t.chiuso || t.finite < t.frasi) return;
    this.turni.delete(turno);
    this.opzioni.uscita.fineTurno({ turno, frasi: t.frasi });
    const esito: EsitoTurnoVoce = { turno, frasi: t.frasi, secondi: t.secondi, interrotto: false };
    for (const risolvi of t.attese) risolvi(esito);
  }

  private async ciclo(): Promise<void> {
    if (this.lavora) return;
    this.lavora = true;
    try {
      while (this.coda.length > 0) {
        const frase = this.coda.shift()!;
        const epoca = this.epoca;
        const esito = await this.dici(frase, epoca);
        if (epoca !== this.epoca) continue; // interrotta: il turno è già stato chiuso
        const t = this.turni.get(frase.turno);
        if (t) {
          t.finite += 1;
          t.secondi += esito.secondi;
        }
        this.opzioni.osservatore?.fineFrase?.(frase, esito);
        this.verificaFineTurno(frase.turno);
      }
    } finally {
      this.lavora = false;
    }
  }

  /** Genera una frase e ne inoltra i pezzi. Non lancia mai: gli errori diventano esiti. */
  private async dici(frase: FraseDaDire, epoca: number): Promise<EsitoFrase> {
    const motore = this.opzioni.motore();
    const controllo = new AbortController();
    this.inCorso = { frase, controllo };
    const { uscita, log } = this.opzioni;
    let voce = frase.voce_id;
    let secondi = 0;
    let annunciata = false;
    try {
      this.opzioni.osservatore?.richiesta?.(frase, motore.nome);
      let flusso;
      try {
        flusso = await motore.sintetizza({ id: frase.id_frase, voce, testo: frase.testo }, controllo.signal);
      } catch (err) {
        // Voce inesistente nel registro: meglio la voce del narratore che il silenzio.
        if (err instanceof ErroreVoce && err.stato === 404 && voce !== VOCE_RISERVA) {
          log.error({ id_frase: frase.id_frase, voce, parlante: frase.parlante }, 'voce: voce_id sconosciuta al servizio, uso quella del narratore');
          voce = VOCE_RISERVA;
          flusso = await motore.sintetizza({ id: frase.id_frase, voce, testo: frase.testo }, controllo.signal);
        } else {
          throw err;
        }
      }
      if (epoca !== this.epoca) return { secondi: 0, interrotta: true, motore: motore.nome };
      uscita.frase({
        id_frase: frase.id_frase,
        turno: frase.turno,
        indice: frase.indice,
        parlante: frase.parlante,
        nome: frase.nome,
        testo: frase.testo,
        sample_rate: flusso.sampleRate,
      });
      annunciata = true;
      let seq = 0;
      let resto: Uint8Array | null = null; // byte dispari rimasto dal pezzo precedente
      for await (const grezzo of flusso.pezzi) {
        if (epoca !== this.epoca) break;
        let pezzo = grezzo;
        if (resto) {
          const unito = new Uint8Array(resto.length + pezzo.length);
          unito.set(resto);
          unito.set(pezzo, resto.length);
          pezzo = unito;
          resto = null;
        }
        const pari = pezzo.length & ~1;
        if (pari < pezzo.length) resto = pezzo.slice(pari);
        if (pari === 0) continue;
        const pcm = Buffer.from(pezzo.buffer, pezzo.byteOffset, pari);
        if (seq === 0) this.opzioni.osservatore?.primoAudio?.(frase);
        uscita.pezzo({ id_frase: frase.id_frase, seq, pcm });
        seq += 1;
        secondi += pari / 2 / flusso.sampleRate;
      }
      const interrotta = epoca !== this.epoca;
      uscita.fineFrase({ id_frase: frase.id_frase, turno: frase.turno, secondi, interrotta });
      log.debug({ id_frase: frase.id_frase, voce, secondi: arrotonda(secondi), pezzi: seq, motore: motore.nome }, 'voce: frase inoltrata');
      return { secondi, interrotta, motore: motore.nome };
    } catch (err) {
      const interrotta = controllo.signal.aborted || epoca !== this.epoca;
      if (!interrotta) {
        log.error({ id_frase: frase.id_frase, voce, motore: motore.nome, err: (err as Error).message }, 'voce: frase fallita');
      }
      if (annunciata) uscita.fineFrase({ id_frase: frase.id_frase, turno: frase.turno, secondi, interrotta: true });
      return { secondi, interrotta: true, errore: (err as Error).message, motore: motore.nome };
    } finally {
      if (this.inCorso?.controllo === controllo) this.inCorso = null;
    }
  }
}

function arrotonda(x: number): number {
  return Math.round(x * 1000) / 1000;
}
