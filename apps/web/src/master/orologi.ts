/**
 * Orologi delle minacce come li vede il master: caselle (piene, la prossima, vuote) con il testo
 * del segno di ciascuna, e i permessi dei pulsanti −1 / +1. Logica pura, testata in orologi.test.ts.
 *
 * Il server è la fonte di verità, ma i numeri si difendono comunque: `pieni` fuori da 0…segmenti
 * non deve rompere la riga di caselle, e `segni` può avere meno testi dei segmenti.
 */
import type { OrologioMaster } from '@cantastorie/shared';
import { t } from '../lingua';

export type StatoCasella = 'pieno' | 'prossimo' | 'vuoto';

export interface CasellaOrologio {
  /** 0 = primo segmento. */
  indice: number;
  stato: StatoCasella;
  /** Testo del segno di questa casella, se scritto. */
  segno: string | null;
}

/** `pieni` riportato dentro 0…segmenti (e segmenti mai negativo). */
export function pieniSicuri(orologio: Pick<OrologioMaster, 'pieni' | 'segmenti'>): number {
  const segmenti = Math.max(0, Math.floor(orologio.segmenti));
  return Math.min(segmenti, Math.max(0, Math.floor(orologio.pieni)));
}

/** Orologio completo: tutti i segni mostrati. */
export function orologioCompleto(orologio: Pick<OrologioMaster, 'pieni' | 'segmenti'>): boolean {
  return orologio.segmenti > 0 && pieniSicuri(orologio) >= orologio.segmenti;
}

/**
 * Una casella per segmento. La prima vuota è il «prossimo» segno (evidenziato), finché l'orologio
 * non è completo. Il testo del prossimo viene da `segni`, o da `prossimo` se `segni` è corto.
 */
export function caselleOrologio(orologio: OrologioMaster): CasellaOrologio[] {
  const segmenti = Math.max(0, Math.floor(orologio.segmenti));
  const pieni = pieniSicuri(orologio);
  const caselle: CasellaOrologio[] = [];
  for (let i = 0; i < segmenti; i += 1) {
    const stato: StatoCasella = i < pieni ? 'pieno' : i === pieni ? 'prossimo' : 'vuoto';
    const segno = orologio.segni[i] ?? (stato === 'prossimo' ? orologio.prossimo : null);
    caselle.push({ indice: i, stato, segno: segno ?? null });
  }
  return caselle;
}

/** «3/6». */
export function frazioneOrologio(orologio: Pick<OrologioMaster, 'pieni' | 'segmenti'>): string {
  return `${pieniSicuri(orologio)}/${Math.max(0, Math.floor(orologio.segmenti))}`;
}

/** +1 ha senso finché l'orologio non è completo. */
export function puoAvanzare(orologio: Pick<OrologioMaster, 'pieni' | 'segmenti'>): boolean {
  return pieniSicuri(orologio) < orologio.segmenti;
}

/** −1 ha senso se almeno un segno è stato mostrato. */
export function puoArretrare(orologio: Pick<OrologioMaster, 'pieni' | 'segmenti'>): boolean {
  return pieniSicuri(orologio) > 0;
}

/** «ultimo segno al turno 4» / «nessun segno ancora». */
export function testoUltimoSegno(orologio: Pick<OrologioMaster, 'ultimo_turno'>): string {
  return orologio.ultimo_turno === null ? t('master.orologi.nessun_segno') : t('master.orologi.ultimo_segno', { turno: orologio.ultimo_turno });
}
