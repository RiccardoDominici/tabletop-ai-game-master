/**
 * Pipeline della voce: le frasi vanno al motore vocale in ordine, UNA alla volta (il servizio
 * MLX genera comunque una richiesta per volta), e ogni pezzo di PCM viene inoltrato subito allo
 * schermo. La generazione corre davanti alla riproduzione: lo schermo accumula e suona senza buchi.
 *
 * Per ogni turno la pipeline sa quante frasi ha ricevuto e quante ha finito; quando il turno è
 * dichiarato chiuso (`chiudiTurno`) e l'ultima frase è finita, manda `fine_turno`.
 * `interrompi()` ferma la frase in corso (AbortController → il servizio smette di generare),
 * svuota la coda e dice allo schermo di tacere.
 *
 * Voce espressiva (drama-3, voce/espressione.ts): `testo_voce` può contenere direzioni, suoni e tag.
 * Ai motori espressivi va il testo passato dalla guardia, con la direzione predefinita di chi parla
 * se la riga non ne ha una; a Qwen e al finto vanno solo le parole. Se nessun motore riesce a dire la
 * frase, la frase si annuncia lo stesso con un silenzio lungo quanto la lettura: il sottotitolo resta
 * sullo schermo e il turno va avanti (mai un turno bloccato dalla voce).
 *
 * Costi: a fine turno una riga `tipo: 'voce'` (byte, frasi, dollari stimati) per `registraCosto`.
 */
import type { AudioFineFrase, AudioFineTurno, AudioFrase, AudioPezzo } from '@tabletop-ai-gm/shared';
import type { Logger } from '../logger';
import type { CacheAudio } from './cache-audio';
import type { CueAudio } from '../audio/cue';
import { ErroreVoce, type MotoreVoce, type NomeMotoreVoce } from './tipi';
import { soloParole, testoEspressivoDi } from './espressione';
import { chiaveAudioEspressiva } from './cache-audio';

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
  /**
   * Testo mandato alla voce, se diverso (nomi con gli accenti di `pronuncia`; direzioni, suoni e tag
   * di drama-3, che ai motori non espressivi non arrivano).
   */
  testo_voce?: string;
  /**
   * Riga di una battuta del repertorio: chiave dell'audio pre-generato (cache/audio). Se il file
   * c'è, parte subito senza sintesi; se manca, si sintetizza dal vivo (e lo si registra).
   */
  chiave_cache?: string;
  /**
   * Esito privato: la voce va solo ai telefoni di quel PG con «Ascolta qui» (mai al proiettore);
   * lo instrada il trasporto (trasporto/socket.ts, `creaUscitaAudio`).
   */
  solo_pg?: string;
  /**
   * Segnale audio legato all'inizio di questa frase (riga [umore]/[effetto] del narratore, audio di
   * una battuta): l'effetto viaggia con l'annuncio e lo schermo lo fa partire con la frase;
   * l'umore lo applica la regia quando la frase parte (osservatore `richiesta`).
   */
  cue?: CueAudio;
}

/** Dove va l'audio (in produzione: la stanza "schermo" di Socket.IO). */
export interface UscitaAudio {
  /**
   * Facoltativo: c'è almeno un telefono in ascolto per la voce privata di quel PG? Se manca o dice
   * sì, le frasi `solo_pg` si sintetizzano; se dice no si saltano (il testo arriva comunque al telefono).
   */
  inAscolto?(id_pg: string): boolean;
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
  /** 'cache' = audio pre-generato del repertorio; 'testo' = nessuna voce, solo il sottotitolo. */
  motore: NomeMotoreVoce | 'cache' | 'testo';
}

/** Ganci per le misure di latenza (tutti facoltativi). */
export interface OsservatorePipeline {
  richiesta?(frase: FraseDaDire, motore: NomeMotoreVoce | 'cache' | 'testo'): void;
  primoAudio?(frase: FraseDaDire): void;
  fineFrase?(frase: FraseDaDire, esito: EsitoFrase): void;
}

export interface EsitoTurnoVoce {
  turno: number;
  frasi: number;
  secondi: number;
  interrotto: boolean;
}

/** Riga di logs/costi.jsonl per la voce di un turno (solo se un motore a pagamento ha parlato). */
export interface CostoVoceTurno {
  ts: string;
  tipo: 'voce';
  turno: number;
  motore: NomeMotoreVoce;
  modello: string;
  frasi: number;
  byte_testo: number;
  secondi_audio: number;
  costo_usd: number;
  /** Frasi dette da un altro motore (riserva) o rimaste solo testo. */
  riserva: number;
  solo_testo: number;
  interrotto: boolean;
}

interface CostoTurno {
  frasi: number;
  byte: number;
  usd: number;
  secondi: number;
  riserva: number;
  soloTesto: number;
}

interface StatoTurno {
  /** Effetti da suonare a voce del turno finita (un [effetto] dopo l'ultima frase). */
  effetti: string[];
  costo: CostoTurno;
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
      /** Audio pre-generato del repertorio (facoltativo); `cache.fish` per drama-3. */
      cache?: CacheAudio;
      /** Direzione predefinita di chi parla (scheda del PNG, carta di stile), per i motori espressivi. */
      direzione?: (parlante: string) => string | null;
      /** Riga dei costi della voce a fine turno (logs/costi.jsonl). */
      registraCosto?: (riga: CostoVoceTurno) => void;
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
      this.scriviCosto(turno, t, true);
    }
    this.turni.clear();
    this.opzioni.uscita.interrompi();
  }

  private turno(n: number): StatoTurno {
    let t = this.turni.get(n);
    if (!t) {
      t = { effetti: [], costo: { frasi: 0, byte: 0, usd: 0, secondi: 0, riserva: 0, soloTesto: 0 }, frasi: 0, finite: 0, secondi: 0, chiuso: false, attese: [] };
      this.turni.set(n, t);
    }
    return t;
  }

  private verificaFineTurno(turno: number): void {
    const t = this.turni.get(turno);
    if (!t || !t.chiuso || t.finite < t.frasi) return;
    this.turni.delete(turno);
    this.scriviCosto(turno, t, false);
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

  /** Una riga dei costi per il turno, se un motore a pagamento ha parlato (o doveva parlare). */
  private scriviCosto(turno: number, t: StatoTurno, interrotto: boolean): void {
    const c = t.costo;
    if (!this.opzioni.registraCosto || (c.byte === 0 && c.soloTesto === 0 && c.riserva === 0)) return;
    this.opzioni.registraCosto({
      ts: new Date().toISOString(),
      tipo: 'voce',
      turno,
      motore: 'fish',
      modello: 'fish-audio/drama-3',
      frasi: c.frasi,
      byte_testo: c.byte,
      secondi_audio: Math.round(c.secondi * 100) / 100,
      costo_usd: Math.round(c.usd * 1e7) / 1e7,
      riserva: c.riserva,
      solo_testo: c.soloTesto,
      interrotto,
    });
  }

  /** Testo per un motore espressivo: guardia, poi la direzione predefinita di chi parla se manca. */
  private testoEspressivo(frase: FraseDaDire): string {
    const { espressivo, anomalie } = testoEspressivoDi(frase.testo_voce ?? frase.testo, this.opzioni.direzione?.(frase.parlante) ?? null);
    for (const x of anomalie) {
      this.opzioni.log.warn({ id_frase: frase.id_frase, parlante: frase.parlante, codice: x.codice, dettaglio: x.dettaglio }, 'voce: markup espressivo corretto');
    }
    return espressivo;
  }

  /** Cache dell'audio per il motore attivo: drama-3 ha la sua (voci diverse), con la chiave del testo espressivo. */
  private cachePer(motore: MotoreVoce, frase: FraseDaDire): { cache: CacheAudio; chiave: string } | null {
    if (!frase.chiave_cache || !this.opzioni.cache) return null;
    if (!motore.espressivo) return { cache: this.opzioni.cache, chiave: frase.chiave_cache };
    const fish = this.opzioni.cache.fish;
    return fish ? { cache: fish, chiave: chiaveAudioEspressiva(motore.nome, frase.voce_id, this.testoEspressivo(frase)) } : null;
  }

  /** Genera una frase e ne inoltra i pezzi. Non lancia mai: gli errori diventano esiti. */
  private async dici(frase: FraseDaDire, epoca: number): Promise<EsitoFrase> {
    // Voce privata senza nessuno in ascolto: niente sintesi (né spesa né attesa per il tavolo).
    if (frase.solo_pg && this.opzioni.uscita.inAscolto && !this.opzioni.uscita.inAscolto(frase.solo_pg)) {
      this.opzioni.log.debug({ id_frase: frase.id_frase, solo_pg: frase.solo_pg }, 'voce: frase privata senza ascolto, solo testo al telefono');
      return { secondi: 0, interrotta: false, motore: 'testo' };
    }
    if (frase.chiave_cache) {
      const dove = this.cachePer(this.opzioni.motore(), frase);
      const pronto = dove?.cache.leggi(dove.chiave);
      if (pronto) return this.diciDaCache(frase, pronto.pcm, pronto.sampleRate);
      this.opzioni.log.warn(
        { id_frase: frase.id_frase, chiave: (dove?.chiave ?? frase.chiave_cache).slice(0, 16), testo: frase.testo },
        'voce: audio pre-generato mancante, sintesi dal vivo',
      );
    }
    return this.diciDalVivo(frase, epoca);
  }

  /**
   * Nessun motore ha potuto dire la frase: la si annuncia lo stesso, con un silenzio lungo quanto la
   * lettura (sottotitolo sullo schermo, turno che va avanti, misure coerenti).
   */
  private diciSoloTesto(frase: FraseDaDire, motivo: string): EsitoFrase {
    const sampleRate = 24_000;
    const secondi = Math.min(12, Math.max(1.5, frase.testo.length / 14));
    const t = this.turni.get(frase.turno);
    if (t) t.costo.soloTesto += 1;
    this.opzioni.log.warn({ id_frase: frase.id_frase, parlante: frase.parlante, secondi: arrotonda(secondi), motivo }, 'voce: frase senza voce, resta il testo');
    this.diciDaCache(frase, Buffer.alloc(Math.round(secondi * sampleRate) * 2), sampleRate, false);
    return { secondi, interrotta: false, errore: motivo, motore: 'testo' };
  }

  /**
   * Audio pre-generato: annuncio e pezzi partono subito, tutti insieme (lo schermo li mette in
   * fila sulla linea del tempo). Nessuna attesa del servizio voce.
   */
  private diciDaCache(frase: FraseDaDire, pcm: Buffer, sampleRate: number, avvisa = true): EsitoFrase {
    const { uscita } = this.opzioni;
    if (avvisa) this.opzioni.osservatore?.richiesta?.(frase, 'cache');
    uscita.frase({
      id_frase: frase.id_frase,
      turno: frase.turno,
      indice: frase.indice,
      parlante: frase.parlante,
      nome: frase.nome,
      testo: frase.testo,
      sample_rate: sampleRate,
      ...(frase.cue?.effetto ? { effetto: frase.cue.effetto } : {}),
      ...(frase.solo_pg ? { solo_pg: frase.solo_pg } : {}),
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
    // Parole per Qwen e il finto; testo con direzioni e tag (passato dalla guardia) per drama-3.
    const testo = soloParole(frase.testo_voce ?? frase.testo);
    // Il testo che la voce legge davvero, quando non è quello mostrato (pronuncia dei nomi, docs/pronuncia.md).
    if (frase.testo_voce !== undefined && frase.testo_voce !== frase.testo) log.debug({ id_frase: frase.id_frase, parlante: frase.parlante, testo_voce: testo }, 'voce: testo per la sintesi');
    const espressivo = motore.espressivo ? this.testoEspressivo(frase) : undefined;
    const richiesta = (v: string) => ({ id: frase.id_frase, voce: v, testo, ...(espressivo ? { espressivo } : {}) });
    try {
      this.opzioni.osservatore?.richiesta?.(frase, motore.nome);
      let flusso;
      try {
        flusso = await motore.sintetizza(richiesta(voce), controllo.signal);
      } catch (err) {
        // Voce inesistente nel registro: meglio la voce del narratore che il silenzio.
        if (err instanceof ErroreVoce && err.stato === 404 && voce !== VOCE_RISERVA) {
          log.error({ id_frase: frase.id_frase, voce, parlante: frase.parlante }, 'voce: voce_id sconosciuta al servizio, uso quella del narratore');
          voce = VOCE_RISERVA;
          flusso = await motore.sintetizza(richiesta(voce), controllo.signal);
        } else {
          throw err;
        }
      }
      if (epoca !== this.epoca) return { secondi: 0, interrotta: true, motore: motore.nome };
      const parlato = flusso.motore ?? motore.nome;
      const costo = this.turni.get(frase.turno)?.costo;
      if (costo) {
        costo.frasi += 1;
        costo.byte += flusso.byte_testo ?? 0;
        costo.usd += flusso.costo_usd ?? 0;
        if (parlato !== motore.nome) costo.riserva += 1;
      }
      // Battuta del repertorio detta dal vivo da drama-3: la si conserva, la prossima volta è gratis.
      const daConservare = parlato === motore.nome ? this.cachePer(motore, frase) : null;
      const conservati: Buffer[] | null = daConservare && motore.espressivo ? [] : null;
      uscita.frase({
        id_frase: frase.id_frase,
        turno: frase.turno,
        indice: frase.indice,
        parlante: frase.parlante,
        nome: frase.nome,
        testo: frase.testo,
        sample_rate: flusso.sampleRate,
        ...(frase.cue?.effetto ? { effetto: frase.cue.effetto } : {}),
        ...(frase.solo_pg ? { solo_pg: frase.solo_pg } : {}),
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
        conservati?.push(Buffer.from(pcm));
        seq += 1;
        secondi += pari / 2 / flusso.sampleRate;
      }
      const interrotta = epoca !== this.epoca;
      uscita.fineFrase({ id_frase: frase.id_frase, turno: frase.turno, secondi, interrotta });
      if (costo) costo.secondi += secondi;
      if (daConservare && conservati && !interrotta && secondi > 0.3) {
        try {
          daConservare.cache.scrivi(daConservare.chiave, Buffer.concat(conservati), { voce, testo: espressivo ?? testo, sample_rate: flusso.sampleRate });
          log.info({ id_frase: frase.id_frase, chiave: daConservare.chiave.slice(0, 16), secondi: arrotonda(secondi) }, 'voce: battuta conservata nella cache di drama-3');
        } catch (err) {
          log.warn({ id_frase: frase.id_frase, err: (err as Error).message }, 'voce: cache di drama-3 non scritta');
        }
      }
      log.debug({ id_frase: frase.id_frase, voce, secondi: arrotonda(secondi), pezzi: seq, motore: parlato }, 'voce: frase inoltrata');
      return { secondi, interrotta, motore: parlato };
    } catch (err) {
      const interrotta = controllo.signal.aborted || epoca !== this.epoca;
      if (!interrotta) {
        log.error({ id_frase: frase.id_frase, voce, motore: motore.nome, err: (err as Error).message }, 'voce: frase fallita');
      }
      if (annunciata) uscita.fineFrase({ id_frase: frase.id_frase, turno: frase.turno, secondi, interrotta: true });
      // Nessun audio partito e nessuna interruzione: la frase resta testo, il turno non si ferma.
      if (!annunciata && !interrotta) return this.diciSoloTesto(frase, (err as Error).message);
      return { secondi, interrotta: true, errore: (err as Error).message, motore: motore.nome };
    } finally {
      if (this.inCorso?.controllo === controllo) this.inCorso = null;
    }
  }
}

function arrotonda(x: number): number {
  return Math.round(x * 1000) / 1000;
}
