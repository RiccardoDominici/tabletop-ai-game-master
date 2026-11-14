/**
 * The pure part of the phone dictation (docs/ascolto.md, «The phone»): no browser API here, so it can be tested in node.
 *
 * - `scegliFormato`: the recording format the browser can make, best first. Chrome/Android and Firefox make
 *   webm/opus; Safari on iOS before 18.4 only mp4/AAC. The server converts any of them with ffmpeg.
 * - `modoPressione`: one button, two gestures. Held for `SOGLIA_TIENI_MS` or more = push-to-talk (release stops);
 *   a short tap = toggle (it keeps recording until the next tap).
 * - `inserisci`: the transcript goes into the action box after what is already there, never over it.
 * - error names → interface sentences.
 */
import type { Chiave } from '../lingua';

export const FORMATI = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'] as const;

/** The first format the browser supports; '' = let the browser choose. */
export function scegliFormato(supporta: (tipo: string) => boolean): string {
  for (const f of FORMATI) {
    try {
      if (supporta(f)) return f;
    } catch {
      // isTypeSupported can throw on odd browsers: try the next one.
    }
  }
  return '';
}

/** A press shorter than this is a tap (toggle); longer, push-to-talk. */
export const SOGLIA_TIENI_MS = 400;
export const modoPressione = (ms: number): 'tieni' | 'tocco' => (ms >= SOGLIA_TIENI_MS ? 'tieni' : 'tocco');

/** Recordings shorter than this are a slip of the finger: not sent. */
export const MINIMO_MS = 500;

/** The box text with the transcript added at the end (one space between), cut to `massimo`. */
export function inserisci(bozza: string, trascrizione: string, massimo: number): string {
  const t = trascrizione.trim();
  if (!t) return bozza;
  const prima = bozza.replace(/\s+$/u, '');
  return (prima ? `${prima} ${t}` : t).slice(0, massimo);
}

/** Interface sentence for a getUserMedia / MediaRecorder error. */
export function erroreMicrofono(nome: string): Chiave {
  switch (nome) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'telefono.dettato.errore_permesso';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'telefono.dettato.errore_nessun_microfono';
    case 'NotReadableError':
    case 'AbortError':
      return 'telefono.dettato.errore_occupato';
    default:
      return 'telefono.dettato.errore_registrazione';
  }
}

/** Interface sentence for an error code of POST /api/dettato. */
export function erroreServer(codice: unknown): Chiave {
  switch (codice) {
    case 'scegli_pg':
      return 'telefono.errore.scegli_pg';
    case 'troppo_lungo':
      return 'telefono.dettato.errore_lungo';
    case 'occupato':
    case 'troppe':
      return 'telefono.dettato.errore_troppe';
    case 'formato':
      return 'telefono.dettato.errore_formato';
    case 'spento':
    case 'non_disponibile':
      return 'telefono.dettato.errore_non_disponibile';
    default:
      return 'telefono.dettato.errore_rete';
  }
}

/** m:ss of a recording time. */
export function durata(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
