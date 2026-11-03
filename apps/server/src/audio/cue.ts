/**
 * Segnali audio automatici del Motore («cue»): un umore della musica o un effetto, chiesti dal
 * narratore (righe `[umore] <tag>` ed `[effetto] <tag>`) o scritti in una battuta del repertorio
 * (`audio: {umore, effetto}`). Qui le regole pure: vocabolario chiuso, catalogo della campagna,
 * limite di un cambio d'umore automatico al minuto, blocco di contesto per il narratore.
 *
 * Il vocabolario è lo stesso della pipeline (strumenti/audio/vocabolario.py, UMORI ed EFFETTI):
 * cue.test.ts controlla che le due copie non divergano.
 */
import type { CatalogoAudio } from './catalogo';

/** Umori della musica (vocabolario chiuso, docs/audio.md). */
export const UMORI = ['esplorazione_tesa', 'taverna_calda', 'rito_sacro', 'inseguimento', 'combattimento_epico', 'lutto'] as const;
/** Effetti (colpi singoli) del vocabolario; nel catalogo sono `sfx_<tag>`. */
export const EFFETTI = ['campana', 'porta', 'catena', 'tuono', 'monete', 'chiave'] as const;
/** `[umore] auto`: torna alla musica del luogo. */
export const UMORE_AUTO = 'auto';
/** Al massimo un cambio d'umore automatico ogni tanto (il cambio di scena azzera il conto). */
export const INTERVALLO_UMORI_AUTO_MS = 60_000;

/** Un segnale risolto, pronto da attaccare a una frase. */
export interface CueAudio {
  /** Tag d'umore da applicare (null = auto, la musica del luogo); assente = nessun cambio. */
  umore?: string | null;
  /** Id dell'effetto nel catalogo (sfx_<tag>); assente = nessuno. */
  effetto?: string;
  /** Da dove viene (log e pannello del master): «narratore», «battuta oste_saluto»… */
  origine: string;
}

export type Risolto<T> = { ok: true; valore: T } | { ok: false; motivo: string };

function pulisci(grezzo: string): string {
  return grezzo.trim().toLowerCase().replace(/[`"'«».!?]+/g, '');
}

/** `[umore] <tag>`: tag del vocabolario chiuso con un brano nel catalogo, oppure `auto` (→ null). */
export function risolviUmore(grezzo: string, cat?: CatalogoAudio): Risolto<string | null> {
  const t = pulisci(grezzo).replace(/^umore_/, '');
  if (t === UMORE_AUTO) return { ok: true, valore: null };
  if (!(UMORI as readonly string[]).includes(t)) return { ok: false, motivo: `umore «${t}» fuori dal vocabolario (${UMORI.join(', ')}, auto)` };
  if (cat && !cat.umore(t)) return { ok: false, motivo: `nessun brano per l'umore «${t}» nel catalogo della campagna` };
  return { ok: true, valore: t };
}

/** `[effetto] <tag>`: solo un effetto presente nel catalogo della campagna (→ id sfx_<tag>). */
export function risolviEffetto(grezzo: string, cat?: CatalogoAudio): Risolto<string> {
  const t = pulisci(grezzo).replace(/^sfx_/, '');
  if (!t) return { ok: false, motivo: 'effetto vuoto' };
  const id = `sfx_${t}`;
  if (!cat?.effetti().includes(id)) {
    const noto = (EFFETTI as readonly string[]).includes(t);
    return { ok: false, motivo: noto ? `effetto «${t}» non presente nel catalogo della campagna` : `effetto «${t}» sconosciuto` };
  }
  return { ok: true, valore: id };
}

/**
 * Limite ai cambi d'umore AUTOMATICI: al massimo uno ogni `intervalloMs` nella stessa scena.
 * Anche un cambio del master fa partire l'intervallo (il suo umore non viene scavalcato subito);
 * una scena nuova riparte da zero.
 */
export class LimiteUmori {
  private ultimo: { ora: number; scena: string } | null = null;

  constructor(readonly intervalloMs: number = INTERVALLO_UMORI_AUTO_MS) {}

  /** Millisecondi da aspettare prima del prossimo cambio automatico (0 = si può). */
  attesa(ora: number, scena: string): number {
    if (!this.ultimo || this.ultimo.scena !== scena) return 0;
    return Math.max(0, this.intervalloMs - (ora - this.ultimo.ora));
  }

  segna(ora: number, scena: string): void {
    this.ultimo = { ora, scena };
  }

  azzera(): void {
    this.ultimo = null;
  }
}

/** Umore iniziale di una scena (`audio.umore_iniziale`, o `musica.umore_iniziale`), se valido. */
export function umoreIniziale(dati: Record<string, unknown>): string | null {
  const da = (k: string): unknown => {
    const o = dati[k];
    return o && typeof o === 'object' ? (o as Record<string, unknown>)['umore_iniziale'] : undefined;
  };
  const t = da('audio') ?? da('musica');
  return typeof t === 'string' && (UMORI as readonly string[]).includes(t) ? t : null;
}

/**
 * Blocco di contesto per narratore e selettore: quali umori ed effetti esistono in questa
 * campagna (le regole d'uso stanno nei prompt). Vuoto se il catalogo non ne ha.
 */
export function bloccoAudioContesto(cat: CatalogoAudio): string {
  const umori = UMORI.filter((u) => cat.umore(u));
  const effetti = cat.effetti().map((id) => id.replace(/^sfx_/, ''));
  if (!umori.length && !effetti.length) return '';
  return [
    '## Audio: righe [umore] ed [effetto]',
    `- Umori: ${umori.length ? `${umori.join(', ')}, auto (torna alla musica del luogo)` : 'nessuno (non scrivere [umore])'}.`,
    `- Effetti: ${effetti.length ? effetti.join(', ') : 'nessuno (non scrivere [effetto])'}.`,
  ].join('\n');
}
