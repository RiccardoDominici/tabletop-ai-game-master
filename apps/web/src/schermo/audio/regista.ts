/**
 * Regista dell'audio del proiettore: dallo stato della scena (AudioScena) e dalla linea del tempo
 * della voce a cosa suona sui bus del mixer.
 *
 * - Musica: brano voluto = umore esplicito ?? musica del luogo. IsteresiMusica decide se cambiare
 *   subito (dissolvenza incrociata di 3,5 s), rimandare (timer) o restare. Sono cambi espliciti,
 *   che non aspettano: umore del master o del Motore, cambio di scena, umore della scena diverso.
 * - Ambienti: gli strati del luogo; quelli nuovi entrano e i vecchi escono in dissolvenza (3 s),
 *   senza isteresi (seguono il posto fisico).
 * - Temi: alla PRIMA battuta di un PNG nella scena (MemoriaTemi), il suo motivo parte poco prima
 *   della battuta, appena la voce è programmata sull'orologio audio; mai a ogni battuta.
 * - Ducking: ogni pezzo di voce programmato abbassa musica e ambienti (PianoDucking); la
 *   risalita si controlla con un timer dopo la tenuta.
 * - Memoria: precarica i byte di luoghi probabili (`prossimi`), decodifica solo ciò che suona,
 *   rilascia i buffer quando una traccia esce (BancaAudio).
 *
 * Niente rAF né canvas: solo automazioni sull'orologio audio e qualche timer.
 */
import type { AudioScena, CatalogoAudioPubblico, TracciaAudio } from '@cantastorie/shared';
import { creaLog } from '../../lib/log';
import type { BancaAudio, StatisticheBanca } from './banca';
import type { ContestoAudio } from './contesto';
import type { Mixer } from './mixer';
import { IsteresiMusica, INTERVALLO_MUSICA_MS, MemoriaTemi, PianoDucking, type DecisioneMusica, type EsitoDucking } from './regole';
import { TracciaInRiproduzione, type Timer } from './traccia';

const log = creaLog('audio-regista');

export const DISSOLVENZA_MUSICA_S = 3.5;
export const DISSOLVENZA_AMBIENTE_S = 3;
/** Il tema parte così tanto prima della battuta, se la voce è programmata in anticipo (s). */
export const ANTICIPO_TEMA_S = 0.6;
/** Oltre questo ritardo sulla battuta il tema non parte più (arriverebbe a sproposito). */
export const RITARDO_MAX_TEMA_S = 1.5;

export interface OpzioniRegista {
  ctx: ContestoAudio;
  mixer: Mixer;
  banca: BancaAudio;
  timer: Timer;
  /** Orologio in ms per l'isteresi (performance.now nel browser). */
  ora: () => number;
  isteresiMs?: number;
}

/** Fotografia per window.__schermoDebug.audio e per l'HUD. */
export interface StatoRegista {
  /** Brano che sta suonando (o entrando), null = silenzio. */
  musica: string | null;
  /** Brano voluto dall'isteresi (può essere ancora in decodifica). */
  musicaVoluta: string | null;
  /** Brano in attesa che passi l'intervallo dell'isteresi (null = silenzio in attesa). */
  musicaPendente: string | null | undefined;
  /** Dissolvenze incrociate della musica cominciate. */
  cambiMusica: number;
  /** Strati d'ambiente che suonano (o entrano). */
  ambienti: string[];
  /** Temi già suonati nella scena (`scena:id_png`). */
  temiSuonati: string[];
  /** Temi partiti in tutta la sessione. */
  temi: number;
  sottoVoce: boolean;
  abbassamenti: number;
  isteresiMs: number;
  memoria: StatisticheBanca;
}

interface ScenaVoluta {
  audio: AudioScena;
  umoreScena: string;
  turno: number;
}

export class RegistaAudio {
  private catalogo: CatalogoAudioPubblico | null = null;
  private voluta: ScenaVoluta | null = null;
  /** Ultima scena applicata (per riconoscere i cambi espliciti). */
  private applicata: ScenaVoluta | null = null;
  private chiaveApplicata = '';
  private musica: TracciaInRiproduzione | null = null;
  /** Cresce a ogni cambio di musica: un caricamento superato si butta. */
  private generazioneMusica = 0;
  /** Strati d'ambiente: la traccia, o un gettone mentre il buffer arriva. */
  private readonly ambienti = new Map<string, TracciaInRiproduzione | symbol>();
  private tema: TracciaInRiproduzione | null = null;
  private readonly isteresi: IsteresiMusica;
  private readonly memoriaTemi = new MemoriaTemi();
  private readonly piano = new PianoDucking();
  private timerIsteresi: number | null = null;
  private timerDucking: number | null = null;
  private cambiMusica = 0;
  private temiPartiti = 0;

  constructor(private readonly o: OpzioniRegista) {
    this.isteresi = new IsteresiMusica(o.isteresiMs ?? INTERVALLO_MUSICA_MS);
  }

  /** Catalogo del server (GET /api/audio): senza, nulla suona; arrivato, si applica la scena. */
  impostaCatalogo(c: CatalogoAudioPubblico): void {
    this.catalogo = c;
    log.info('Catalogo audio', { tracce: Object.keys(c.tracce).length, crediti: c.crediti.length });
    this.chiaveApplicata = '';
    this.applica();
  }

  /** Nuovo stato della scena (a ogni `stato` del server: i doppioni non costano nulla). */
  scena(audio: AudioScena, umoreScena: string, turno: number): void {
    // Scena ricominciata dall'apertura: i temi torneranno a suonare.
    if (this.voluta && turno < this.voluta.turno) {
      log.info('Turno tornato indietro (scena ricominciata): temi azzerati', { da: this.voluta.turno, a: turno });
      this.memoriaTemi.azzera();
    }
    this.voluta = { audio, umoreScena, turno };
    this.applica();
  }

  /** Un pezzo di voce è in programma da `inizio` a `fine` (orologio del contesto). */
  voceProgrammata(inizio: number, fine: number): void {
    this.applicaDucking(this.piano.voce(inizio, fine, this.o.ctx.currentTime));
  }

  /** Una frase comincerà a `t` (orologio del contesto): se è la prima di un PNG, il suo tema. */
  fraseProgrammata(parlante: string, t: number): void {
    const v = this.voluta;
    if (!v || !this.catalogo || parlante === 'narratore') return;
    const id = v.audio.temi[parlante];
    const traccia = id ? this.catalogo.tracce[id] : undefined;
    if (!traccia) return;
    if (!this.memoriaTemi.deveSuonare(v.audio.scena, parlante)) return;
    void this.suonaTema(traccia, t, parlante);
  }

  /** `audio:interrompi`: la voce tace di colpo, si risale subito; il tema in corso si spegne. */
  interrompi(): void {
    this.applicaDucking(this.piano.interrompi(this.o.ctx.currentTime));
    this.tema?.ferma(0.25);
    this.tema = null;
  }

  /** Un effetto singolo (sfx_<tag>) sul bus effetti. */
  async effetto(id: string): Promise<boolean> {
    const traccia = this.catalogo?.tracce[id];
    if (!traccia) return false;
    const buffer = await this.o.banca.prendi(traccia.url);
    if (!buffer) return false;
    const t = new TracciaInRiproduzione(this.o.ctx, { ...traccia, loop: false }, buffer, this.o.mixer.bus.effetti, this.o.timer);
    t.avvia(this.o.ctx.currentTime + 0.02, 0);
    this.o.timer.imposta(() => t.ferma(0.1, () => this.o.banca.rilascia(traccia.url)), (buffer.duration + 0.1) * 1000);
    return true;
  }

  stato(): StatoRegista {
    return {
      musica: this.musica?.id ?? null,
      musicaVoluta: this.isteresi.branoCorrente,
      musicaPendente: this.isteresi.branoPendente,
      cambiMusica: this.cambiMusica,
      ambienti: [...this.ambienti.entries()].filter(([, v]) => typeof v !== 'symbol').map(([id]) => id).sort(),
      temiSuonati: this.memoriaTemi.elenco,
      temi: this.temiPartiti,
      sottoVoce: this.piano.sottoVoce,
      abbassamenti: this.piano.abbassamenti,
      isteresiMs: this.isteresi.intervalloMs,
      memoria: this.o.banca.statistiche(),
    };
  }

  /** Guadagni correnti di bus e tracce (debug e2e). */
  guadagni(): Record<string, number> {
    const out = this.o.mixer.guadagni();
    if (this.musica) out[`musica:${this.musica.id}`] = this.musica.valore;
    for (const [id, v] of this.ambienti) if (typeof v !== 'symbol') out[`ambiente:${id}`] = v.valore;
    if (this.tema) out[`tema:${this.tema.id}`] = this.tema.valore;
    return out;
  }

  // ------------------------------------------------------------------ interno

  private url(id: string): string | null {
    return this.catalogo?.tracce[id]?.url ?? null;
  }

  private applica(): void {
    const v = this.voluta;
    if (!v || !this.catalogo) return;
    // Solo i campi che contano: lo stato arriva a ogni battuta della trascrizione.
    const chiave = JSON.stringify([v.audio, v.umoreScena]);
    if (chiave === this.chiaveApplicata) return;
    this.chiaveApplicata = chiave;
    const prima = this.applicata;
    this.applicata = v;

    // Memoria: i byte dei luoghi probabili; i buffer di ciò che serve adesso o a breve.
    const correnti = [v.audio.umore, v.audio.musica, ...v.audio.ambienti].filter((x): x is string => !!x);
    const urlCorrenti = correnti.map((id) => this.url(id)).filter((u): u is string => !!u);
    const urlProssimi = v.audio.prossimi.map((id) => this.url(id)).filter((u): u is string => !!u);
    this.o.banca.precarica([...urlCorrenti, ...urlProssimi]);
    this.o.banca.tieni([...urlCorrenti, ...urlProssimi, ...[...this.ambienti.keys(), this.musica?.id ?? ''].map((id) => this.url(id) ?? '')]);

    // Musica: l'umore esplicito vince sul luogo; i cambi espliciti saltano l'isteresi.
    const id = v.audio.umore ?? v.audio.musica;
    const forza = !!prima && (v.audio.umore !== prima.audio.umore || v.audio.scena !== prima.audio.scena || v.umoreScena !== prima.umoreScena);
    this.decidiMusica(this.isteresi.chiedi({ id, forza }, this.o.ora()), forza);

    this.aggiornaAmbienti(v.audio.ambienti);
  }

  private decidiMusica(d: DecisioneMusica, forza = false): void {
    if (d.tipo !== 'resta' || this.isteresi.branoPendente === undefined) this.cancellaTimerIsteresi();
    if (d.tipo === 'cambia') {
      log.info('Musica: cambio', { da: this.musica?.id ?? null, a: d.id, esplicito: forza });
      void this.cambiaMusica(d.id);
    } else if (d.tipo === 'rimanda') {
      log.info('Musica: cambio rimandato dall’isteresi', { a: d.id, fraS: Math.round(d.traMs / 1000) });
      this.timerIsteresi = this.o.timer.imposta(() => {
        this.timerIsteresi = null;
        this.decidiMusica(this.isteresi.scadenza(this.o.ora()));
      }, d.traMs + 20);
    }
  }

  private cancellaTimerIsteresi(): void {
    if (this.timerIsteresi === null) return;
    this.o.timer.cancella(this.timerIsteresi);
    this.timerIsteresi = null;
  }

  private async cambiaMusica(id: string | null): Promise<void> {
    const generazione = ++this.generazioneMusica;
    this.cambiMusica += 1;
    // Il brano vecchio esce subito: quello nuovo entra appena decodificato (pochi decimi di secondo).
    const vecchia = this.musica;
    this.musica = null;
    if (vecchia) vecchia.ferma(DISSOLVENZA_MUSICA_S, () => this.o.banca.rilascia(vecchia.traccia.url));
    const traccia = id ? this.catalogo?.tracce[id] : undefined;
    if (!traccia) return;
    const buffer = await this.o.banca.prendi(traccia.url);
    if (generazione !== this.generazioneMusica) {
      // Nel frattempo è stato chiesto un altro brano.
      if (buffer) this.o.banca.rilascia(traccia.url);
      return;
    }
    if (!buffer) return;
    const nuova = new TracciaInRiproduzione(this.o.ctx, traccia, buffer, this.o.mixer.bus.musica, this.o.timer);
    nuova.avvia(this.o.ctx.currentTime + 0.05, DISSOLVENZA_MUSICA_S);
    this.musica = nuova;
  }

  private aggiornaAmbienti(ids: readonly string[]): void {
    const voluti = new Set(ids);
    for (const [id, v] of [...this.ambienti]) {
      if (voluti.has(id)) continue;
      this.ambienti.delete(id);
      if (typeof v !== 'symbol') v.ferma(DISSOLVENZA_AMBIENTE_S, () => this.o.banca.rilascia(v.traccia.url));
      log.debug('Ambiente: strato esce', { id });
    }
    for (const id of voluti) {
      if (this.ambienti.has(id)) continue;
      const traccia = this.catalogo?.tracce[id];
      if (!traccia) continue;
      const gettone = Symbol(id);
      this.ambienti.set(id, gettone);
      void this.o.banca.prendi(traccia.url).then((buffer) => {
        if (this.ambienti.get(id) !== gettone) {
          // Lo strato non serve più (il gruppo si è già spostato).
          if (buffer) this.o.banca.rilascia(traccia.url);
          return;
        }
        if (!buffer) {
          this.ambienti.delete(id);
          return;
        }
        const t = new TracciaInRiproduzione(this.o.ctx, traccia, buffer, this.o.mixer.bus.ambiente, this.o.timer);
        t.avvia(this.o.ctx.currentTime + 0.05, DISSOLVENZA_AMBIENTE_S);
        this.ambienti.set(id, t);
        log.debug('Ambiente: strato entra', { id });
      });
    }
  }

  private async suonaTema(traccia: TracciaAudio, t: number, png: string): Promise<void> {
    const buffer = await this.o.banca.prendi(traccia.url);
    if (!buffer) return;
    const ora = this.o.ctx.currentTime;
    const inizio = Math.max(ora + 0.03, t - ANTICIPO_TEMA_S);
    if (inizio > t + RITARDO_MAX_TEMA_S) {
      log.info('Tema arrivato tardi rispetto alla battuta: non suona', { png, ritardoS: Number((inizio - t).toFixed(2)) });
      this.o.banca.rilascia(traccia.url);
      return;
    }
    this.tema?.ferma(0.4);
    const tema = new TracciaInRiproduzione(this.o.ctx, { ...traccia, loop: false }, buffer, this.o.mixer.bus.temi, this.o.timer);
    tema.avvia(inizio, 0.12);
    this.tema = tema;
    this.temiPartiti += 1;
    log.info('Tema del PNG', { png, id: traccia.id, anticipoS: Number((t - inizio).toFixed(2)) });
    // A brano finito si pulisce (il tema non è in loop: la sorgente si ferma da sola).
    this.o.timer.imposta(() => {
      if (this.tema === tema) this.tema = null;
      tema.ferma(0.2, () => this.o.banca.rilascia(traccia.url));
    }, (inizio - ora + buffer.duration) * 1000 + 100);
  }

  private applicaDucking(e: EsitoDucking): void {
    if (e.comandi.length) this.o.mixer.ducking(e.comandi);
    if (this.timerDucking !== null) this.o.timer.cancella(this.timerDucking);
    this.timerDucking = null;
    if (e.controlloAlle === null) return;
    const attesaMs = Math.max(0, (e.controlloAlle - this.o.ctx.currentTime) * 1000) + 20;
    this.timerDucking = this.o.timer.imposta(() => {
      this.timerDucking = null;
      this.applicaDucking(this.piano.controlla(this.o.ctx.currentTime));
    }, attesaMs);
  }
}
