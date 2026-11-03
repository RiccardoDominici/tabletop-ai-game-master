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
import type { CacheAudio } from './cache-audio';
import type { CueAudio } from '../audio/cue';
import { ErroreVoce, type MotoreVoce, type NomeMotoreVoce } from './tipi';

/** Pezzi da 0,24 s per l'audio pre-generato (come il servizio voce): lo schermo li programma uguali. */
const CAMPIONI_PER_PEZZO_CACHE = 5760;

export interface FraseDaDire {
  id_frase: string;
  turno: number;
  indice: number;
  parlante: string;
  nome: string;
  voce_id: string;
  /** Testo mostrato (sottotitolo, trascrizione). */
  testo: string;
  /** Testo mandato alla voce, se diverso (nomi con gli accenti di `pronuncia`). */
  testo_voce?: string;
  /**
   * Riga di una battuta del repertorio: chiave dell'audio pre-generato (cache/audio). Se il file
   * c'è, parte subito senza sintesi; se manca, si sintetizza dal vivo (e lo si registra).
   */
  chiave_cache?: string;
  /**
   * Segnale audio legato all'inizio di questa frase (riga [umore]/[effetto] del narratore, audio di
   * una battuta): l'effetto viaggia con l'annuncio e lo schermo lo fa partire con la frase;
   * l'umore lo applica la regia quando la frase parte (osservatore `richiesta`).
   */
  cue?: CueAudio;
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
  /** 'cache' = audio pre-generato del repertorio. */
  motore: NomeMotoreVoce | 'cache';
}

/** Ganci per le misure di latenza (tutti facoltativi). */
export interface OsservatorePipeline {
  richiesta?(frase: FraseDaDire, motore: NomeMotoreVoce | 'cache'): void;
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
  /** Effetti da suonare a voce del turno finita (un [effetto] dopo l'ultima frase). */
  effetti: string[];
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
      /** Audio pre-generato del repertorio (facoltativo). */
      cache?: CacheAudio;
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
   * Inserisce delle frasi PRIMA di una frase ancora in coda (se non è già partita); altrimenti le
   * accoda in fondo. Restituisce true se l'inserimento è avvenuto prima del riferimento.
   * Serve al Motore per mettere il segno d'orologio dovuto prima dell'invito finale.
   */
  accodaPrima(frasi: FraseDaDire[], primaDi: string): boolean {
    if (!frasi.length) return true;
    const t = this.turno(frasi[0]!.turno);
    if (t.chiuso) {
      this.opzioni.log.error({ turno: frasi[0]!.turno }, 'voce: inserimento in un turno già chiuso, ignorato');
      return false;
    }
    t.frasi += frasi.length;
    const i = this.coda.findIndex((f) => f.id_frase === primaDi);
    if (i >= 0) this.coda.splice(i, 0, ...frasi);
    else this.coda.push(...frasi);
    void this.ciclo();
    return i >= 0;
  }

  /**
   * Toglie dalla coda frasi non ancora partite, tutte o nessuna (se una è già partita non toglie
   * niente). Serve al Motore quando chiude la scena col finale: l'invito del narratore che
   * chiedeva «cosa fate?» non ha più senso. Restituisce true se le ha tolte.
   */
  ritira(idFrasi: readonly string[]): boolean {
    if (!idFrasi.length || idFrasi.some((id) => !this.coda.some((f) => f.id_frase === id))) return false;
    for (const id of idFrasi) {
      const i = this.coda.findIndex((f) => f.id_frase === id);
      const [f] = this.coda.splice(i, 1);
      this.turno(f!.turno).frasi -= 1;
    }
    return true;
  }

  /**
   * Il turno non avrà altre frasi. La promessa si risolve quando tutte le sue frasi sono
   * state generate e inoltrate (o il turno è stato interrotto).
   */
  /** Un effetto da suonare quando la voce del turno è finita (arriva con `fine_turno`). */
  effettoFineTurno(turno: number, id: string): void {
    this.turno(turno).effetti.push(id);
  }

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
      t = { effetti: [], frasi: 0, finite: 0, secondi: 0, chiuso: false, attese: [] };
      this.turni.set(n, t);
    }
    return t;
  }

  private verificaFineTurno(turno: number): void {
    const t = this.turni.get(turno);
    if (!t || !t.chiuso || t.finite < t.frasi) return;
    this.turni.delete(turno);
    this.opzioni.uscita.fineTurno({ turno, frasi: t.frasi, ...(t.effetti.length ? { effetti: t.effetti } : {}) });
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
    if (frase.chiave_cache) {
      const pronto = this.opzioni.cache?.leggi(frase.chiave_cache);
      if (pronto) return this.diciDaCache(frase, pronto.pcm, pronto.sampleRate);
      this.opzioni.log.warn(
        { id_frase: frase.id_frase, chiave: frase.chiave_cache.slice(0, 16), testo: frase.testo },
        'voce: audio pre-generato mancante, sintesi dal vivo',
      );
    }
    return this.diciDalVivo(frase, epoca);
  }

  /**
   * Audio pre-generato: annuncio e pezzi partono subito, tutti insieme (lo schermo li mette in
   * fila sulla linea del tempo). Nessuna attesa del servizio voce.
   */
  private diciDaCache(frase: FraseDaDire, pcm: Buffer, sampleRate: number): EsitoFrase {
    const { uscita } = this.opzioni;
    this.opzioni.osservatore?.richiesta?.(frase, 'cache');
    uscita.frase({
      id_frase: frase.id_frase,
      turno: frase.turno,
      indice: frase.indice,
      parlante: frase.parlante,
      nome: frase.nome,
      testo: frase.testo,
      sample_rate: sampleRate,
      ...(frase.cue?.effetto ? { effetto: frase.cue.effetto } : {}),
    });
    const passo = CAMPIONI_PER_PEZZO_CACHE * 2;
    let seq = 0;
    for (let i = 0; i + 1 < pcm.length; i += passo) {
      const fine = Math.min(pcm.length - (pcm.length % 2), i + passo);
      if (seq === 0) this.opzioni.osservatore?.primoAudio?.(frase);
      uscita.pezzo({ id_frase: frase.id_frase, seq, pcm: pcm.subarray(i, fine) });
      seq += 1;
    }
    const secondi = Math.floor(pcm.length / 2) / sampleRate;
    uscita.fineFrase({ id_frase: frase.id_frase, turno: frase.turno, secondi, interrotta: false });
    this.opzioni.log.debug({ id_frase: frase.id_frase, secondi: arrotonda(secondi), pezzi: seq, motore: 'cache' }, 'voce: frase dalla cache');
    return { secondi, interrotta: false, motore: 'cache' };
  }

  private async diciDalVivo(frase: FraseDaDire, epoca: number): Promise<EsitoFrase> {
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
        flusso = await motore.sintetizza({ id: frase.id_frase, voce, testo: frase.testo_voce ?? frase.testo }, controllo.signal);
      } catch (err) {
        // Voce inesistente nel registro: meglio la voce del narratore che il silenzio.
        if (err instanceof ErroreVoce && err.stato === 404 && voce !== VOCE_RISERVA) {
          log.error({ id_frase: frase.id_frase, voce, parlante: frase.parlante }, 'voce: voce_id sconosciuta al servizio, uso quella del narratore');
          voce = VOCE_RISERVA;
          flusso = await motore.sintetizza({ id: frase.id_frase, voce, testo: frase.testo_voce ?? frase.testo }, controllo.signal);
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
        ...(frase.cue?.effetto ? { effetto: frase.cue.effetto } : {}),
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
