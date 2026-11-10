/**
 * Ripetizioni (misura del 10 novembre: «sulla tavolata dei Morlacchi qualcuno batte i boccali» quattro
 * volte in undici battute, Ettore che apre sempre con il bastone). Lo sceneggiatore riceve gli attacchi e
 * le immagini degli ultimi turni, con la regola di non ripeterli, e lo stato dei tic: un tic al massimo
 * una volta ogni tre righe di quel PNG, come vuole la regola del narratore. Il tic troppo vicino lo
 * controlla anche il Motore (sceneggiatore/valida.ts). Funzioni pure sulla trascrizione pubblica.
 */
import type { VoceTrascrizione } from '@cantastorie/shared';
import type { PngCaricato } from '../campagna/tipi';

/** Turni da guardare per attacchi e immagini. */
export const TURNI_RECENTI = 4;
/** Righe di un PNG entro cui il suo tic non torna (una volta ogni tre righe). */
export const RIGHE_TRA_I_TIC = 2;
const MAX_VOCI = 20;

/** Minuscolo, senza virgolette né punteggiatura ai bordi: per confrontare tic e righe. */
export function normalizzaFrase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[«»"“”]/g, '')
    .replace(/[.,;:!?…]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** I tic della scheda di un PNG (`voce.tic`), normalizzati. */
export function ticDi(p: PngCaricato): string[] {
  const t = (p.dati['voce'] as { tic?: unknown } | undefined)?.tic;
  return (Array.isArray(t) ? t : typeof t === 'string' ? [t] : []).filter((x): x is string => typeof x === 'string').map(normalizzaFrase).filter((x) => x.length > 3);
}

/** I PNG il cui tic è uscito nelle loro ultime RIGHE_TRA_I_TIC righe: id → tic da non ripetere. */
export function ticBloccati(voci: readonly VoceTrascrizione[], png: readonly PngCaricato[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const p of png) {
    const tic = ticDi(p);
    if (!tic.length) continue;
    const recenti = voci.filter((v) => v.tipo === 'battuta' && v.chi === p.id).slice(-RIGHE_TRA_I_TIC).map((v) => normalizzaFrase(v.testo));
    const usati = tic.filter((t) => recenti.some((r) => r.includes(t)));
    if (usati.length) out.set(p.id, usati);
  }
  return out;
}

/**
 * Attacchi (le prime parole di ogni frase) e immagini (la prima proposizione di ogni frase, fino alla
 * virgola) delle righe che il tavolo ha sentito negli ultimi TURNI_RECENTI turni.
 */
export function giaUsati(voci: readonly VoceTrascrizione[], turnoCorrente: number): { attacchi: string[]; immagini: string[] } {
  const attacchi = new Set<string>();
  const immagini = new Set<string>();
  for (const v of voci) {
    if ((v.tipo !== 'narrazione' && v.tipo !== 'battuta') || v.turno < turnoCorrente - TURNI_RECENTI + 1) continue;
    for (const frase of v.testo.split(/(?<=[.!?…])\s+/)) {
      const parole = frase.replace(/[«»"]/g, '').trim().split(/\s+/).filter(Boolean);
      if (parole.length < 3) continue;
      attacchi.add(parole.slice(0, 4).join(' ').replace(/[,.;:!?]+$/, ''));
      const prima = frase.split(/[,;:]/)[0]!.trim().split(/\s+/).slice(0, 8).join(' ').replace(/[.!?…]+$/, '');
      if (prima.split(/\s+/).length >= 3) immagini.add(prima);
    }
  }
  return { attacchi: [...attacchi].slice(-MAX_VOCI), immagini: [...immagini].slice(-MAX_VOCI) };
}
