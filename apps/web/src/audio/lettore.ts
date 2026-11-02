/**
 * Lettore PCM in streaming senza fessure: il guscio Web Audio attorno al `Programmatore` (puro).
 *
 * - AudioContext alla frequenza predefinita del dispositivo; gli AudioBuffer si creano alla
 *   frequenza della sorgente (24 kHz) e il browser ricampiona da solo.
 * - Ogni pezzo diventa un AudioBufferSourceNode avviato con `start(inizio)` sull'orologio del
 *   contesto: la continuità dipende dall'orologio audio, mai da timer JavaScript.
 * - I «segni» (inizio/fine di frasi e turni) scattano quando `ctx.currentTime` raggiunge
 *   `t + latenza d'uscita`: è l'istante in cui il suono esce davvero dalle casse. Il controllo gira
 *   con un intervallo breve solo finché ci sono segni in attesa (serve solo a sottotitoli e avvisi,
 *   non a programmare l'audio). Il ritardo misurato al momento dello scatto viene passato a chi
 *   ascolta, che lo manda al server (`ritardo_ms`).
 */
import type { AudioFineFrase, AudioFineTurno, AudioFrase, AudioPezzo } from '@cantastorie/shared';
import { creaLog } from '../lib/log';
import { comeByte } from './pcm';
import { JITTER_S } from './pianificatore';
import { Programmatore, type ContatoriAudio, type PezzoDaSuonare, type Segno, type StatisticheBuchi } from './programmatore';

const log = creaLog('audio');

/** Ogni quanto si controllano i segni in attesa (ms). */
const INTERVALLO_CONTROLLO_MS = 15;
/** Dissolvenza su `audio:interrompi`, per non sentire un «clic» (s). */
const DISSOLVENZA_STOP_S = 0.03;

export interface AscoltatoriLettore {
  /** Il primo pezzo del turno ha cominciato a suonare `ritardoMs` fa. */
  inizioTurno(turno: number, idFrase: string, ritardoMs: number): void;
  /** L'ultimo pezzo del turno ha finito di suonare `ritardoMs` fa. */
  fineTurno(turno: number, ritardoMs: number, buchi: StatisticheBuchi): void;
  /** Una frase ha cominciato a suonare (sottotitolo). */
  inizioFrase(frase: AudioFrase, ritardoMs: number): void;
  /** Una frase ha finito di suonare. */
  fineFrase(idFrase: string, turno: number): void;
  /** Stato dell'AudioContext cambiato ('running', 'suspended', ...). */
  statoContesto(stato: string): void;
  /** Contatori aggiornati (dopo ogni pezzo). */
  contatori(contatori: Readonly<ContatoriAudio>): void;
  /**
   * Un pezzo è in programma da `inizio` a `fine` sull'orologio del contesto (prima che suoni):
   * `frase` è l'annuncio se il pezzo apre una frase. Serve al mixer (ducking, temi dei PNG).
   */
  programmato?(inizio: number, fine: number, frase: AudioFrase | null): void;
}

/** Fotografia per l'HUD. */
export interface StatisticheLettore extends ContatoriAudio {
  stato: string;
  sampleRate: number | null;
  latenzaUscitaMs: number | null;
  latenzaBaseMs: number | null;
  anticipoMs: number;
  sorgentiAttive: number;
  segniInAttesa: number;
  jitterMs: number;
}

type CostruttoreContesto = typeof AudioContext;

export class LettorePcm {
  private ctx: AudioContext | null = null;
  private uscita: GainNode | null = null;
  private readonly programmatore = new Programmatore(JITTER_S);
  private readonly attive = new Set<AudioBufferSourceNode>();
  private segni: Segno[] = [];
  private controllo: number | null = null;

  constructor(private readonly ascoltatori: AscoltatoriLettore) {}

  /**
   * Crea (o riprende) l'AudioContext. VA CHIAMATA DENTRO il gestore del click: i browser
   * bloccano l'audio partito senza un gesto dell'utente. La parte sincrona (costruttore + resume)
   * avviene subito; la Promise si risolve quando il contesto gira.
   */
  sblocca(): Promise<void> {
    if (!this.ctx) {
      const Costruttore: CostruttoreContesto | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: CostruttoreContesto }).webkitAudioContext;
      if (!Costruttore) return Promise.reject(new Error('Web Audio non disponibile in questo browser'));

      const ctx = new Costruttore({ latencyHint: 'interactive' });
      const uscita = ctx.createGain();
      uscita.connect(ctx.destination);
      ctx.addEventListener('statechange', () => {
        log.info('Stato AudioContext', { stato: ctx.state });
        this.ascoltatori.statoContesto(ctx.state);
      });
      this.ctx = ctx;
      this.uscita = uscita;
      this.suonaSilenzio(ctx);
      log.info('AudioContext creato', { sampleRate: ctx.sampleRate, latenzaBase: ctx.baseLatency });
    }
    const ctx = this.ctx;
    this.ascoltatori.statoContesto(ctx.state);
    if (ctx.state === 'running') return Promise.resolve();
    return ctx.resume();
  }

  get statoContesto(): string {
    return this.ctx?.state ?? 'assente';
  }

  /** L'AudioContext (dopo `sblocca`): il mixer del proiettore lo riusa, non ne crea un altro. */
  get contesto(): AudioContext | null {
    return this.ctx;
  }

  /** Manda la voce in `nodo` (il bus voce del mixer) invece che dritta alle casse. */
  instradaVerso(nodo: AudioNode): void {
    if (!this.uscita) return;
    this.uscita.disconnect();
    this.uscita.connect(nodo);
    log.info('Voce instradata nel mixer');
  }

  frase(meta: AudioFrase): void {
    this.programmatore.frase(meta);
  }

  pezzo(pezzo: AudioPezzo): void {
    const ctx = this.ctx;
    if (!ctx) {
      log.warn('Pezzo audio arrivato prima dello sblocco: scartato', { id_frase: pezzo.id_frase });
      return;
    }
    // Difesa: il contratto promette ArrayBuffer (browser) o Uint8Array; altro (es. Blob) si scarta.
    const grezzo: unknown = pezzo.pcm;
    if (!(grezzo instanceof ArrayBuffer) && !ArrayBuffer.isView(grezzo)) {
      log.warn('Pezzo audio con payload non binario: scartato', { id_frase: pezzo.id_frase, tipo: typeof grezzo });
      return;
    }
    const esito = this.programmatore.pezzo(pezzo.id_frase, pezzo.seq, comeByte(grezzo), ctx.currentTime);
    if (esito.scartato === 'frase_sconosciuta') {
      log.warn('Pezzo di una frase mai annunciata: scartato', { id_frase: pezzo.id_frase, seq: pezzo.seq });
    }
    // info, non warn: con una voce lenta i buchi sono tanti e il conto è già nell'HUD e nel report.
    if (esito.buco) log.info('Buco nell’audio (la generazione è rimasta indietro)', { id_frase: pezzo.id_frase });
    if (esito.pezzo) {
      this.suona(ctx, esito.pezzo);
      const apre = esito.segni.find((x) => x.tipo === 'inizio_frase');
      try {
        this.ascoltatori.programmato?.(esito.pezzo.inizio, esito.pezzo.inizio + esito.pezzo.durata, apre?.tipo === 'inizio_frase' ? apre.frase : null);
      } catch (errore) {
        log.error('Ascoltatore «programmato» fallito', errore);
      }
    }
    this.aggiungiSegni(esito.segni);
    this.ascoltatori.contatori(this.programmatore.contatori);
  }

  fineFrase(fine: AudioFineFrase): void {
    this.aggiungiSegni(this.programmatore.fineFrase(fine));
  }

  fineTurno(fine: AudioFineTurno): void {
    const ora = this.ctx?.currentTime ?? 0;
    this.aggiungiSegni(this.programmatore.fineTurno(fine, ora));
  }

  /** `audio:interrompi`: zittisce tutto subito (con 30 ms di dissolvenza) e azzera la linea del tempo. */
  interrompi(): void {
    const ctx = this.ctx;
    if (ctx && this.uscita) {
      const ora = ctx.currentTime;
      const guadagno = this.uscita.gain;
      guadagno.cancelScheduledValues(ora);
      guadagno.setValueAtTime(guadagno.value, ora);
      guadagno.linearRampToValueAtTime(0, ora + DISSOLVENZA_STOP_S);
      // Il prossimo pezzo partirà almeno dopo il jitter (150 ms): il volume torna su prima.
      guadagno.setValueAtTime(1, ora + DISSOLVENZA_STOP_S + 0.005);
      for (const sorgente of this.attive) {
        try {
          sorgente.stop(ora + DISSOLVENZA_STOP_S);
        } catch {
          // Già fermata o mai partita: niente da fare.
        }
      }
    }
    this.attive.clear();
    this.programmatore.interrompi();
    this.segni = [];
    this.fermaControllo();
    log.info('Audio interrotto');
  }

  statistiche(): StatisticheLettore {
    const ctx = this.ctx;
    return {
      ...this.programmatore.contatori,
      stato: this.statoContesto,
      sampleRate: ctx?.sampleRate ?? null,
      latenzaUscitaMs: ctx ? (ctx.outputLatency ?? 0) * 1000 : null,
      latenzaBaseMs: ctx ? (ctx.baseLatency ?? 0) * 1000 : null,
      anticipoMs: ctx ? this.programmatore.anticipo(ctx.currentTime) * 1000 : 0,
      sorgentiAttive: this.attive.size,
      segniInAttesa: this.segni.length,
      jitterMs: JITTER_S * 1000,
    };
  }

  /** Latenza tra «programmato a t» e «esce dalle casse» (s). */
  private latenzaUscita(ctx: AudioContext): number {
    return ctx.outputLatency || ctx.baseLatency || 0;
  }

  private suona(ctx: AudioContext, pezzo: PezzoDaSuonare): void {
    const buffer = ctx.createBuffer(1, pezzo.campioni.length, pezzo.sampleRate);
    buffer.copyToChannel(pezzo.campioni, 0);
    const sorgente = ctx.createBufferSource();
    sorgente.buffer = buffer;
    sorgente.connect(this.uscita ?? ctx.destination);
    sorgente.addEventListener(
      'ended',
      () => {
        sorgente.disconnect();
        this.attive.delete(sorgente);
      },
      { once: true },
    );
    this.attive.add(sorgente);
    sorgente.start(pezzo.inizio);
  }

  /**
   * iOS/Safari: un buffer muto suonato dentro il gesto «sblocca» davvero l'uscita audio.
   * Su Chrome è innocuo.
   */
  private suonaSilenzio(ctx: AudioContext): void {
    try {
      const muto = ctx.createBuffer(1, 1, ctx.sampleRate);
      const sorgente = ctx.createBufferSource();
      sorgente.buffer = muto;
      sorgente.connect(ctx.destination);
      sorgente.addEventListener('ended', () => sorgente.disconnect(), { once: true });
      sorgente.start();
    } catch (errore) {
      log.debug('Sblocco col buffer muto non riuscito (innocuo)', errore);
    }
  }

  private aggiungiSegni(nuovi: Segno[]): void {
    if (nuovi.length === 0) return;
    this.segni.push(...nuovi);
    this.avviaControllo();
    // Un segno già scaduto (es. fine di un turno senza audio) scatta senza aspettare il prossimo giro.
    this.controlla();
  }

  private avviaControllo(): void {
    if (this.controllo !== null) return;
    this.controllo = window.setInterval(() => this.controlla(), INTERVALLO_CONTROLLO_MS);
  }

  private fermaControllo(): void {
    if (this.controllo === null) return;
    window.clearInterval(this.controllo);
    this.controllo = null;
  }

  /** Fa scattare, in ordine di tempo, i segni il cui suono è già uscito dalle casse. */
  private controlla(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const ora = ctx.currentTime;
    const latenza = this.latenzaUscita(ctx);
    const scaduti: Segno[] = [];
    const restanti: Segno[] = [];
    for (const segno of this.segni) (segno.t + latenza <= ora ? scaduti : restanti).push(segno);
    this.segni = restanti;
    if (restanti.length === 0) this.fermaControllo();

    // sort è stabile: a parità di t resta l'ordine d'arrivo (inizio_turno prima di inizio_frase).
    scaduti.sort((a, b) => a.t - b.t);
    for (const segno of scaduti) {
      const ritardoMs = Math.max(0, (ora - (segno.t + latenza)) * 1000);
      try {
        this.scatta(segno, ritardoMs);
      } catch (errore) {
        log.error('Ascoltatore di un segno audio fallito', errore);
      }
    }
  }

  private scatta(segno: Segno, ritardoMs: number): void {
    switch (segno.tipo) {
      case 'inizio_turno':
        this.ascoltatori.inizioTurno(segno.turno, segno.id_frase, ritardoMs);
        break;
      case 'inizio_frase':
        this.ascoltatori.inizioFrase(segno.frase, ritardoMs);
        break;
      case 'fine_frase':
        this.ascoltatori.fineFrase(segno.id_frase, segno.turno);
        break;
      case 'fine_turno':
        this.ascoltatori.fineTurno(segno.turno, ritardoMs, segno.buchi);
        break;
    }
  }
}
