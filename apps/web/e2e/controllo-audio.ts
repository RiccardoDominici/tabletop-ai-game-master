/**
 * Controllo dei file audio di una campagna DENTRO il browser (il decoder vero: Chrome o WebKit),
 * condiviso da audio-campagna.spec.ts (Chromium) e controllo-audio-webkit.ts (Safari/WebKit).
 *
 * Per ogni traccia del catalogo (GET /api/audio): scarica, decodifica con un OfflineAudioContext a
 * 48 kHz (nessun ricampionamento per file a 48 kHz), e per i loop misura la giunta: il salto tra
 * l'ultimo campione del loop e il primo, rispetto al 99° percentile dei salti tra campioni vicini
 * nei 100 ms che precedono la fine. Un loop senza clic ha rapporto ≲ 1,5; un clic vero sta a 5–50.
 * I punti di loop sono quelli che userebbe il proiettore: del manifest, oppure misurati sul priming
 * AAC con la sua stessa regola (`__schermoDebug.audio.puntiDiLoop`), oppure il buffer intero.
 */
import type { Page } from '@playwright/test';

export interface EsitoFileAudio {
  id: string;
  tipo: string;
  url: string;
  ok: boolean;
  errore: string | null;
  durata: number | null;
  canali: number | null;
  sampleRate: number | null;
  durataDichiarata: number | null;
  loop: boolean;
  loopInizio: number | null;
  loopFine: number | null;
  /** Da dove vengono i punti di loop usati nella misura. */
  puntiDa: 'manifest' | 'priming' | 'buffer' | null;
  /** Salto alla giunta / 99° percentile dei salti vicini (canale peggiore). */
  rapportoGiunta: number | null;
  /** Picco assoluto del file (clipping se ≥ 1). */
  picco: number | null;
}

/** Decodifica e misura tutte le tracce (o solo `ids`). Gira nella pagina: nessuna dipendenza esterna. */
export async function controllaCatalogo(pagina: Page, ids?: string[]): Promise<EsitoFileAudio[]> {
  return pagina.evaluate(async (soloIds) => {
    type Traccia = { id: string; tipo: string; url: string; loop: boolean; durata_s: number | null; loop_inizio_s: number | null; loop_fine_s: number | null };
    const catalogo = (await (await fetch('/api/audio')).json()) as { tracce: Record<string, Traccia> };
    const W = window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext };
    const Offline = W.OfflineAudioContext ?? W.webkitOfflineAudioContext!;
    type Punti = (d: number, sr: number, dich: number | null, c?: Float32Array) => { inizio: number; fine: number } | null;
    const puntiDiLoop = (window as unknown as { __schermoDebug?: { audio?: { puntiDiLoop?: Punti } } }).__schermoDebug?.audio?.puntiDiLoop;
    const esiti = [];
    for (const t of Object.values(catalogo.tracce)) {
      if (soloIds && !soloIds.includes(t.id)) continue;
      const base = { id: t.id, tipo: t.tipo, url: t.url, durataDichiarata: t.durata_s, loop: t.loop, loopInizio: t.loop_inizio_s, loopFine: t.loop_fine_s };
      try {
        const byte = await (await fetch(t.url)).arrayBuffer();
        const ctx = new Offline(2, 48000, 48000);
        const b = await ctx.decodeAudioData(byte);
        let picco = 0;
        let rapporto: number | null = null;
        // Gli stessi punti del proiettore (TracciaInRiproduzione.puntiLoop).
        const manifest = t.loop_inizio_s !== null && t.loop_fine_s !== null && t.loop_fine_s <= b.duration;
        const misurati = !manifest && puntiDiLoop ? puntiDiLoop(b.duration, b.sampleRate, t.durata_s, b.getChannelData(0)) : null;
        const inizioLoop = manifest ? t.loop_inizio_s! : (misurati?.inizio ?? 0);
        const fineLoop = manifest ? t.loop_fine_s! : (misurati?.fine ?? b.duration);
        const puntiDa = !t.loop ? null : manifest ? 'manifest' : misurati ? 'priming' : 'buffer';
        for (let c = 0; c < b.numberOfChannels; c += 1) {
          const d = b.getChannelData(c);
          for (let i = 0; i < d.length; i += 1) picco = Math.max(picco, Math.abs(d[i]!));
          if (!t.loop) continue;
          const iS = Math.round(inizioLoop * b.sampleRate);
          const iE = Math.min(d.length, Math.round(fineLoop * b.sampleRate));
          const salto = Math.abs(d[iS]! - d[iE - 1]!);
          const vicini: number[] = [];
          for (let i = Math.max(1, iE - Math.round(b.sampleRate / 10)); i < iE; i += 1) vicini.push(Math.abs(d[i]! - d[i - 1]!));
          vicini.sort((x, y) => x - y);
          const p99 = vicini[Math.floor(vicini.length * 0.99)] ?? 0;
          const r = salto / Math.max(p99, 1e-6);
          rapporto = Math.max(rapporto ?? 0, r);
        }
        esiti.push({ ...base, loopInizio: t.loop ? inizioLoop : null, loopFine: t.loop ? fineLoop : null, puntiDa, ok: true, errore: null, durata: b.duration, canali: b.numberOfChannels, sampleRate: b.sampleRate, rapportoGiunta: rapporto === null ? null : Number(rapporto.toFixed(2)), picco: Number(picco.toFixed(3)) });
      } catch (e) {
        esiti.push({ ...base, puntiDa: null, ok: false, errore: String(e), durata: null, canali: null, sampleRate: null, rapportoGiunta: null, picco: null });
      }
    }
    return esiti;
  }, ids ?? null);
}

/** Riassunto leggibile, una riga per traccia. */
export function riassunto(esiti: readonly EsitoFileAudio[]): string {
  return esiti
    .map((e) =>
      e.ok
        ? `${e.id.padEnd(44)} ${e.tipo.padEnd(8)} ${e.durata!.toFixed(3).padStart(8)} s (dich. ${e.durataDichiarata ?? '—'}) ${e.canali}ch ${e.sampleRate} Hz` +
          `${e.loop ? ` loop [${e.loopInizio?.toFixed(4)}, ${e.loopFine?.toFixed(4)}] (${e.puntiDa}) giunta ×${e.rapportoGiunta}` : ''} picco ${e.picco}`
        : `${e.id.padEnd(44)} ERRORE ${e.errore}`,
    )
    .join('\n');
}
