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
import type { AudioScena, CatalogoAudioPubblico, TracciaAudio } from '@tabletop-ai-gm/shared';
import { creaLog } from '../../lib/log';
import type { BancaAudio, StatisticheBanca } from './banca';
import type { ContestoAudio } from './contesto';
import type { Mixer } from './mixer';
import { IsteresiMusica, INTERVALLO_MUSICA_MS, MemoriaTemi, PianoDucking, type DecisioneMusica, type EsitoDucking } from './regole';
import { TracciaInRiproduzione, type DettagliTraccia, type Timer } from './traccia';

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
  /** Effetti suonati (ultimo id in coda). */
  effetti: string[];
  /** Effetti legati a una frase: ritardo rispetto all'inizio della frase (s). */
  ritardiEffetti: Array<{ id: string; ritardoS: number }>;
  /** Ultimi temi programmati: di quanto precedono la battuta (s; negativo = partiti dopo). */
  anticipiTemi: Array<{ png: string; id: string; anticipoS: number }>;
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
  /** Tracce in dissolvenza d'uscita (musica e ambienti), fino a sorgenti ferme: debug e memoria. */
  private readonly inUscita = new Set<TracciaInRiproduzione>();
  private readonly isteresi: IsteresiMusica;
  private readonly memoriaTemi = new MemoriaTemi();
  private readonly piano = new PianoDucking();
  private timerIsteresi: number | null = null;
  private timerDucking: number | null = null;
  private cambiMusica = 0;
  private temiPartiti = 0;
  private readonly effettiSuonati: string[] = [];
  /** Effetti legati a una frase: di quanto sono partiti dopo l'inizio voluto (s; 0 = in tempo). */
  private readonly ritardiEffetti: Array<{ id: string; ritardoS: number }> = [];
  private readonly anticipiTemi: Array<{ png: string; id: string; anticipoS: number }> = [];

  constructor(private readonly o: OpzioniRegista) {
    this.isteresi = new IsteresiMusica(o.isteresiMs ?? INTERVALLO_MUSICA_MS);
  }

  /** Catalogo del server (GET /api/audio): senza, nulla suona; arrivato, si applica la scena. */
  impostaCatalogo(c: CatalogoAudioPubblico): void {
    this.catalogo = c;
    // Gli effetti sono pochi e brevi: i loro byte si scaricano subito (decodifica all'annuncio).
    this.o.banca.precarica(Object.values(c.tracce).filter((t) => t.tipo === 'effetto').map((t) => t.url));
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

  /**
   * Il server annuncia una frase prima del suo audio: comincerà più o meno quando finisce la voce
   * già in coda (`tPrevisto`). Se è la prima battuta di un PNG nella scena, il tema parte adesso
   * con l'anticipo giusto, invece di aspettare che il primo pezzo sia programmato (con la voce in
   * streaming arriva solo ~150 ms prima di suonare).
   */
  fraseAnnunciata(parlante: string, tPrevisto: number): void {
    // Mai prima di adesso (+30 ms, il margine con cui parte qualunque sorgente).
    this.fraseProgrammata(parlante, Math.max(tPrevisto, this.o.ctx.currentTime + 0.03));
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

  /**
   * Un effetto singolo (sfx_<tag>) sul bus effetti: subito, oppure a `quando` sull'orologio del
   * contesto (l'inizio della frase a cui il Motore l'ha legato).
   */
  async effetto(id: string, quando?: number): Promise<boolean> {
    const traccia = this.catalogo?.tracce[id];
    if (!traccia) return false;
    const buffer = await this.o.banca.prendi(traccia.url);
    if (!buffer) return false;
    const ora = this.o.ctx.currentTime;
    const inizio = Math.max(ora + 0.02, quando ?? 0);
    const t = new TracciaInRiproduzione(this.o.ctx, { ...traccia, loop: false }, buffer, this.o.mixer.bus.effetti, this.o.timer);
    t.avvia(inizio, 0);
    this.effettiSuonati.push(id);
    if (this.effettiSuonati.length > 20) this.effettiSuonati.shift();
    if (quando !== undefined) this.ritardiEffetti.push({ id, ritardoS: Number((inizio - quando).toFixed(3)) });
    if (this.ritardiEffetti.length > 10) this.ritardiEffetti.shift();
    this.o.timer.imposta(() => t.ferma(0.1, () => this.o.banca.rilascia(traccia.url)), (inizio - ora + buffer.duration + 0.1) * 1000);
    log.info('Effetto', { id, ritardoS: quando === undefined ? null : Number((inizio - quando).toFixed(3)) });
    return true;
  }

  /** Decodifica in anticipo un effetto (all'annuncio della sua frase), così parte in tempo. */
  preparaEffetto(id: string): void {
    const url = this.url(id);
    if (!url) return;
    void this.o.banca.prendi(url).then((b) => {
      if (b) this.o.banca.rilascia(url);
    });
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
      effetti: [...this.effettiSuonati],
      ritardiEffetti: [...this.ritardiEffetti],
      anticipiTemi: [...this.anticipiTemi],
      sottoVoce: this.piano.sottoVoce,
      abbassamenti: this.piano.abbassamenti,
      isteresiMs: this.isteresi.intervalloMs,
      memoria: this.o.banca.statistiche(),
    };
  }

  /** Buffer e loop delle tracce che suonano (debug: file veri nel browser). */
  tracce(): DettagliTraccia[] {
    const tutte = [this.musica, ...this.ambienti.values(), this.tema].filter((t): t is TracciaInRiproduzione => t instanceof TracciaInRiproduzione);
    return tutte.map((t) => t.dettagli);
  }

  /** Guadagni correnti di bus e tracce (debug e2e). */
  guadagni(): Record<string, number> {
    const out = this.o.mixer.guadagni();
    if (this.musica) out[`musica:${this.musica.id}`] = this.musica.valore;
    for (const [id, v] of this.ambienti) if (typeof v !== 'symbol') out[`ambiente:${id}`] = v.valore;
    if (this.tema) out[`tema:${this.tema.id}`] = this.tema.valore;
    for (const t of this.inUscita) out[`uscita:${t.id}`] = t.valore;
    return out;
  }

  // ------------------------------------------------------------------ interno

  private url(id: string): string | null {
    return this.catalogo?.tracce[id]?.url ?? null;
  }

  /**
   * Un brano con lo stesso file di quello che suona (o che aspetta l'isteresi) è quello stesso:
   * scena e nodo con un alias, un umore che riusa la musica di un luogo. Così non si dissolve in sé.
   */
  private canonico(id: string | null): string | null {
    if (id === null) return null;
    const url = this.url(id);
    for (const altro of [this.isteresi.branoCorrente, this.isteresi.branoPendente]) {
      if (altro && url && this.url(altro) === url) return altro;
    }
    return id;
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
    // Decodificati restano solo i brani di adesso; dei vicini si tengono i byte compressi (pochi MB:
    // tornarci costa una decodifica di qualche decimo di secondo, coperta dalla dissolvenza).
    this.o.banca.precarica([...urlCorrenti, ...urlProssimi]);
    this.o.banca.tieni(urlCorrenti);

    // Musica: l'umore esplicito vince sul luogo; i cambi espliciti saltano l'isteresi.
    const id = this.canonico(v.audio.umore ?? v.audio.musica);
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
    if (vecchia) this.esce(vecchia, DISSOLVENZA_MUSICA_S);
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
    // Lo stesso file usato da due luoghi (la pioggia di tutto il borgo): lo strato continua a
    // suonare sotto il nome nuovo, al volume nuovo, invece di dissolversi in sé stesso.
    const nuoviPerUrl = new Map<string, string>();
    for (const id of voluti) {
      const url = this.url(id);
      if (url && !this.ambienti.has(id)) nuoviPerUrl.set(url, id);
    }
    for (const [id, v] of [...this.ambienti]) {
      if (voluti.has(id) || typeof v === 'symbol') continue;
      const erede = nuoviPerUrl.get(v.traccia.url);
      if (!erede) continue;
      nuoviPerUrl.delete(v.traccia.url);
      this.ambienti.delete(id);
      this.ambienti.set(erede, v);
      v.regola(this.catalogo?.tracce[erede]?.guadagno ?? v.traccia.guadagno, DISSOLVENZA_AMBIENTE_S);
      log.debug('Ambiente: stesso file, lo strato continua', { da: id, a: erede });
    }
    for (const [id, v] of [...this.ambienti]) {
      if (voluti.has(id)) continue;
      this.ambienti.delete(id);
      if (typeof v !== 'symbol') this.esce(v, DISSOLVENZA_AMBIENTE_S);
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

  /** Dissolvenza d'uscita; a sorgenti ferme il buffer torna alla banca. */
  private esce(t: TracciaInRiproduzione, durataS: number): void {
    this.inUscita.add(t);
    t.ferma(durataS, () => {
      this.inUscita.delete(t);
      this.o.banca.rilascia(t.traccia.url);
    });
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
    this.anticipiTemi.push({ png, id: traccia.id, anticipoS: Number((t - inizio).toFixed(3)) });
    if (this.anticipiTemi.length > 10) this.anticipiTemi.shift();
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
