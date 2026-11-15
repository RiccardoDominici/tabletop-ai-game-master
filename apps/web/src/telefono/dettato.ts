/**
 * Dictation on the phone (docs/ascolto.md, «The phone»): the microphone button next to the action box.
 *
 * - Availability: the server says whether dictation is on (GET /api/dettato, `attivo` false with `ascolto: nessuno`);
 *   the browser gives the microphone only in a secure context (https, or localhost) and only with MediaRecorder.
 *   Without a secure context the button stays and explains where the https address and the certificate are.
 * - Recording: getUserMedia (mono, echo cancellation and noise suppression on) + MediaRecorder in the best format the
 *   browser has (dettatoPuro.ts), a level meter from an AnalyserNode, a hard stop at the server's limit (30 s).
 * - Sending: the Blob as it is to POST /api/dettato with the socket id and the PC (the server checks they match).
 *   The transcript goes into the box after what is already there; the corrected names are listed under it, so the
 *   player checks them before sending (the default). With «Invia subito» on, a dictation into an empty box is sent.
 * - Learning: the box text right after the last dictation goes with the action (`trascrizione`), so the server can
 *   learn the names the player retyped (sessione.ts, inviaAzione).
 */
import { create } from 'zustand';
import { t, type Chiave } from '../lingua';
import { creaLog } from '../lib/log';
import { leggiMemoria, scriviMemoria } from '../lib/memoria';
import { alRientro, prendiSocket } from '../lib/socket';
import { useBozza } from '../store/bozza';
import { useTelefono } from '../store/telefono';
import { erroreMicrofono, erroreServer, inserisci, MINIMO_MS, scegliFormato } from './dettatoPuro';

const log = creaLog('dettato');
const CHIAVE_INVIA_SUBITO = 'tabletop-ai-gm:dettato-invia-subito';

export type FaseDettato = 'pronto' | 'apro' | 'registro' | 'trascrivo';

export interface CorrezioneMostrata {
  sentito: string;
  scritto: string;
}

interface StoreDettato {
  /** Dictation on at this table (server). null = not known yet. */
  attivo: boolean | null;
  maxSecondi: number;
  /** https address of the phones and the certificate page (from /api/info), for the explanation over plain http. */
  urlSicuro: string | null;
  urlCertificato: string | null;
  fase: FaseDettato;
  /** Level 0–1 while recording. */
  livello: number;
  /** When the recording started (ms, performance.now) — for the timer. */
  inizio: number | null;
  /** 'tieni': release to stop; 'tocco': tap again to stop. */
  modo: 'tieni' | 'tocco';
  errore: string | null;
  /** Names the server corrected in the last dictation (listed under the box until the text changes a lot). */
  correzioni: CorrezioneMostrata[];
  /** Box text right after the last dictation (sent with the action for the learning), or null. */
  trascrizione: string | null;
  inviaSubito: boolean;
  impostaInviaSubito(v: boolean): void;
}

export const useDettato = create<StoreDettato>()((set) => ({
  attivo: null,
  maxSecondi: 30,
  urlSicuro: null,
  urlCertificato: null,
  fase: 'pronto',
  livello: 0,
  inizio: null,
  modo: 'tieni',
  errore: null,
  correzioni: [],
  trascrizione: null,
  inviaSubito: leggiMemoria(CHIAVE_INVIA_SUBITO) === '1',
  impostaInviaSubito: (v) => {
    scriviMemoria(CHIAVE_INVIA_SUBITO, v ? '1' : '0');
    set({ inviaSubito: v });
  },
}));

/** The browser can record here (secure context + APIs). */
export function microfonoPossibile(): 'si' | 'non_sicuro' | 'non_supportato' {
  if (typeof window === 'undefined') return 'non_supportato';
  if (!window.isSecureContext) return 'non_sicuro';
  if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') return 'non_supportato';
  return 'si';
}

/** Asks the server whether dictation is on, and the https addresses (at start and after every reconnection). */
async function leggiStatoServer(): Promise<void> {
  try {
    const [d, i] = await Promise.all([fetch('/api/dettato').then((r) => r.json()), fetch('/api/info').then((r) => r.json())]);
    useDettato.setState({
      attivo: d?.attivo === true,
      maxSecondi: typeof d?.max_secondi === 'number' ? d.max_secondi : 30,
      urlSicuro: i?.https ? String(i.url_telefono) : null,
      urlCertificato: typeof i?.url_certificato === 'string' ? i.url_certificato : null,
    });
    log.info('Dictation on the server', { attivo: d?.attivo, provider: d?.provider, possibile: microfonoPossibile() });
  } catch (errore) {
    log.warn('Dictation state not read', errore);
  }
}

let avvii = 0;
let togliRientro: (() => void) | null = null;
/** Started by the phone page (counted, like avviaTelefono). */
export function avviaDettato(): () => void {
  avvii += 1;
  if (avvii === 1) togliRientro = alRientro(() => void leggiStatoServer());
  void leggiStatoServer();
  return () => {
    avvii -= 1;
    if (avvii > 0) return;
    togliRientro?.();
    togliRientro = null;
    annulla();
  };
}

// ------------------------------------------------------------------ the recording

interface Registrazione {
  flusso: MediaStream;
  registratore: MediaRecorder;
  pezzi: Blob[];
  contesto: AudioContext | null;
  animazione: number | null;
  limite: ReturnType<typeof setTimeout>;
  formato: string;
  annullata: boolean;
}
let corrente: Registrazione | null = null;
let premutoA = 0;
/** Released while the permission was being asked (the first time): the recording runs in «tap to stop». */
let rilasciatoPresto = false;

const errore = (chiave: Chiave, valori?: Record<string, string | number>): void => useDettato.setState({ errore: t(chiave, valori) });

function libera(r: Registrazione): void {
  clearTimeout(r.limite);
  if (r.animazione !== null) cancelAnimationFrame(r.animazione);
  for (const traccia of r.flusso.getTracks()) traccia.stop();
  void r.contesto?.close().catch(() => undefined);
}

/** Level meter: RMS of the microphone, smoothed, into the store (about 15 times a second). */
function misuraLivello(r: Registrazione): void {
  const Contesto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Contesto) return;
  try {
    const contesto = new Contesto();
    const analisi = contesto.createAnalyser();
    analisi.fftSize = 512;
    contesto.createMediaStreamSource(r.flusso).connect(analisi);
    r.contesto = contesto;
    const dati = new Float32Array(analisi.fftSize);
    let ultimo = 0;
    let livello = 0;
    const passo = (ora: number): void => {
      analisi.getFloatTimeDomainData(dati);
      let somma = 0;
      for (const v of dati) somma += v * v;
      livello = Math.max(Math.min(1, Math.sqrt(somma / dati.length) * 4), livello * 0.85);
      if (ora - ultimo > 66) {
        ultimo = ora;
        useDettato.setState({ livello });
      }
      r.animazione = requestAnimationFrame(passo);
    };
    r.animazione = requestAnimationFrame(passo);
  } catch (e) {
    log.debug('Level meter not available', e);
  }
}

/** The microphone button is pressed: start recording (asks for the permission the first time). */
export async function premi(): Promise<void> {
  premutoA = performance.now();
  const stato = useDettato.getState();
  if (stato.fase === 'registro') return; // the release (or the next tap) decides
  if (stato.fase !== 'pronto') return;
  const possibile = microfonoPossibile();
  if (possibile === 'non_sicuro') return errore('telefono.dettato.errore_non_sicuro');
  if (possibile === 'non_supportato') return errore('telefono.dettato.errore_non_supportato');
  useDettato.setState({ fase: 'apro', errore: null, modo: 'tieni' });
  rilasciatoPresto = false;
  let flusso: MediaStream;
  try {
    flusso = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (e) {
    log.warn('Microphone refused or missing', e);
    useDettato.setState({ fase: 'pronto' });
    return errore(erroreMicrofono((e as DOMException)?.name ?? ''));
  }
  const formato = scegliFormato((tipo) => MediaRecorder.isTypeSupported(tipo));
  let registratore: MediaRecorder;
  try {
    registratore = new MediaRecorder(flusso, { ...(formato ? { mimeType: formato } : {}), audioBitsPerSecond: 32_000 });
  } catch (e) {
    for (const traccia of flusso.getTracks()) traccia.stop();
    log.warn('MediaRecorder not created', { formato, e });
    useDettato.setState({ fase: 'pronto' });
    return errore('telefono.dettato.errore_registrazione');
  }
  const r: Registrazione = { flusso, registratore, pezzi: [], contesto: null, animazione: null, formato, annullata: false, limite: setTimeout(() => void rilascia(true), useDettato.getState().maxSecondi * 1000 - 300) };
  corrente = r;
  registratore.ondataavailable = (ev) => {
    if (ev.data.size > 0) r.pezzi.push(ev.data);
  };
  registratore.start(250);
  misuraLivello(r);
  // Released during the permission prompt: there is no release to come, so «tap to stop».
  useDettato.setState({ fase: 'registro', inizio: performance.now(), livello: 0, modo: rilasciatoPresto ? 'tocco' : 'tieni' });
  log.info('Recording', { formato: formato || '(browser default)' });
}

/**
 * The button is released (or tapped again, or the limit is reached). A short first press switches to «tap to stop»;
 * otherwise the recording stops and goes to the server.
 */
export async function rilascia(forza = false): Promise<void> {
  const r = corrente;
  const stato = useDettato.getState();
  if (stato.fase === 'apro') rilasciatoPresto = true;
  if (!r || stato.fase !== 'registro') return;
  const tenuto = performance.now() - premutoA;
  if (!forza && stato.modo === 'tieni' && tenuto < 400) {
    useDettato.setState({ modo: 'tocco' });
    return;
  }
  const durataMs = performance.now() - (stato.inizio ?? performance.now());
  corrente = null;
  const blob = await new Promise<Blob>((ok) => {
    r.registratore.onstop = () => ok(new Blob(r.pezzi, { type: r.registratore.mimeType || r.formato || 'application/octet-stream' }));
    try {
      r.registratore.stop();
    } catch {
      ok(new Blob(r.pezzi, { type: r.formato || 'application/octet-stream' }));
    }
  });
  libera(r);
  if (r.annullata) return;
  if (durataMs < MINIMO_MS || blob.size === 0) {
    useDettato.setState({ fase: 'pronto', livello: 0, inizio: null });
    return errore('telefono.dettato.troppo_breve');
  }
  await invia(blob, Math.round(durataMs));
}

/** Stops without sending (page closed, PC changed). */
export function annulla(): void {
  const r = corrente;
  corrente = null;
  if (!r) return;
  r.annullata = true;
  try {
    r.registratore.stop();
  } catch {
    // already stopped
  }
  libera(r);
  useDettato.setState({ fase: 'pronto', livello: 0, inizio: null });
}

/** POST /api/dettato, then the transcript into the box. */
async function invia(blob: Blob, durataMs: number): Promise<void> {
  const idPg = useTelefono.getState().idPg;
  const socket = prendiSocket();
  if (!idPg || !socket.id) {
    useDettato.setState({ fase: 'pronto', livello: 0, inizio: null });
    return errore(idPg ? 'telefono.dettato.errore_rete' : 'telefono.errore.scegli_pg');
  }
  useDettato.setState({ fase: 'trascrivo', livello: 0, inizio: null });
  const t0 = performance.now();
  try {
    const risposta = await fetch('/api/dettato', {
      method: 'POST',
      headers: { 'content-type': blob.type || 'application/octet-stream', 'x-tagm-socket': socket.id, 'x-tagm-pg': idPg },
      body: blob,
      signal: AbortSignal.timeout(60_000),
    });
    const dati = (await risposta.json().catch(() => ({}))) as { testo?: unknown; correzioni?: unknown; codice?: unknown; silenzio?: unknown; secondi?: unknown };
    log.info('Dictation answer', { stato: risposta.status, byte: blob.size, ms_registrazione: durataMs, ms_risposta: Math.round(performance.now() - t0), codice: dati.codice });
    if (!risposta.ok) return errore(erroreServer(dati.codice), { secondi: useDettato.getState().maxSecondi });
    const testo = typeof dati.testo === 'string' ? dati.testo : '';
    if (!testo.trim()) return errore(dati.silenzio ? 'telefono.dettato.silenzio' : 'telefono.dettato.niente');
    // A roll is open on screen (manual rolls): the dictation answers the roll («ho fatto 14»), not the action box.
    if (perTiro) {
      perTiro(testo);
      return;
    }
    metti(testo, Array.isArray(dati.correzioni) ? (dati.correzioni as CorrezioneMostrata[]) : []);
  } catch (e) {
    log.warn('Dictation not sent', e);
    errore('telefono.dettato.errore_rete');
  } finally {
    useDettato.setState({ fase: 'pronto' });
  }
}

/** Callback set by the open roll (TiroDaFare.tsx): the dictated text goes there instead of the action box. */
let perTiro: ((testo: string) => void) | null = null;
export function suDettatoTiro(f: ((testo: string) => void) | null): void {
  perTiro = f;
}

/** Callback set by the action box: what to do with the new text (cambiaBozza, and the optional auto-send). */
let alTesto: ((testo: string, primaVuota: boolean) => void) | null = null;
export function suTestoDettato(f: ((testo: string, primaVuota: boolean) => void) | null): void {
  alTesto = f;
}

function metti(trascrizione: string, correzioni: CorrezioneMostrata[]): void {
  const bozza = useBozza.getState().testo;
  const nuovo = inserisci(bozza, trascrizione, 500);
  // One chip per name, even when the same name was fixed twice.
  const uniche = correzioni.filter((c, i) => typeof c?.scritto === 'string' && correzioni.findIndex((x) => x.scritto === c.scritto) === i);
  useDettato.setState({ correzioni: uniche, trascrizione: nuovo, errore: null });
  alTesto?.(nuovo, bozza.trim() === '');
}

/** The transcript to send with the action (and forget it once sent). */
export function trascrizionePerInvio(): string | undefined {
  return useDettato.getState().trascrizione ?? undefined;
}
export function dimenticaTrascrizione(): void {
  useDettato.setState({ trascrizione: null, correzioni: [] });
}
