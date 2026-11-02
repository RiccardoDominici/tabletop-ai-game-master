/**
 * Stato degli orologi della scena (docs/f0-contratti.md, riga [orologio]; manuale E9).
 *
 * Il Motore tiene lo stato: quanti segni sono stati mostrati per ogni orologio attivo, e mette
 * nel contesto di ogni turno «segni mostrati N di M, prossimo segno: …», così il narratore non
 * deve ricostruirlo dalla trascrizione. Il narratore può solo PROPORRE l'avanzamento con la
 * riga [orologio] <id>; qui si controlla che l'orologio esista, sia attivo e non sia completo.
 * Al massimo un segno per risposta.
 *
 * Ritmo minimo (`segno_almeno_ogni: N` dell'orologio): se (turno corrente − turno dell'ultimo
 * segno, 0 se nessuno) ≥ N, la riga dell'orologio finisce con «Mostralo in questa risposta.»,
 * che il prompt tratta come un ordine. Così il conteggio dei turni resta fuori dal modello.
 */

/** Frase che il prompt del narratore tratta come ordine di mostrare il segno. */
export const ORDINE_SEGNO = 'Mostralo in questa risposta.';
import type { Campagna, DatiYaml } from '../campagna/tipi';

export interface Orologio {
  id: string;
  nome: string;
  segmenti: number;
  segni: string[];
  pieni: number;
  alCompleto: string | null;
  avanzaQuando: string[];
  /** Turno in cui è stato mostrato l'ultimo segno (null = mai in questa scena). */
  ultimoTurno: number | null;
  /** Ritmo minimo: almeno un segno ogni N risposte (null = nessun obbligo). */
  almenoOgni: number | null;
}

export type EsitoAvanzamento = { ok: true; orologio: Orologio } | { ok: false; motivo: string };

function testo(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export class StatoOrologi {
  private readonly orologi = new Map<string, Orologio>();

  constructor(campagna: Campagna) {
    const attivi = Array.isArray(campagna.scena.dati['orologi_attivi'])
      ? (campagna.scena.dati['orologi_attivi'] as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    const elenco = Array.isArray(campagna.campagnaNarratore['orologi']) ? (campagna.campagnaNarratore['orologi'] as DatiYaml[]) : [];
    for (const d of elenco) {
      const id = testo(d['id']);
      if (!id || !attivi.includes(id)) continue;
      const segni = Array.isArray(d['segni']) ? (d['segni'] as unknown[]).map((s) => String(s)) : [];
      const segmenti = typeof d['segmenti'] === 'number' ? (d['segmenti'] as number) : segni.length;
      this.orologi.set(id, {
        id,
        nome: testo(d['nome']) ?? id,
        segmenti,
        segni,
        pieni: typeof d['pieni_all_inizio'] === 'number' ? (d['pieni_all_inizio'] as number) : 0,
        alCompleto: testo(d['al_completo']),
        avanzaQuando: Array.isArray(d['avanza_quando']) ? (d['avanza_quando'] as unknown[]).map(String) : [],
        ultimoTurno: null,
        almenoOgni: typeof d['segno_almeno_ogni'] === 'number' && d['segno_almeno_ogni'] > 0 ? (d['segno_almeno_ogni'] as number) : null,
      });
    }
  }

  get elenco(): Orologio[] {
    return [...this.orologi.values()];
  }

  /** Il narratore propone l'avanzamento: lo si accetta solo se è lecito. */
  avanza(id: string, turno: number, giàAvanzatoInQuestoTurno: boolean): EsitoAvanzamento {
    if (giàAvanzatoInQuestoTurno) return { ok: false, motivo: 'più di un segno nella stessa risposta' };
    const o = this.orologi.get(id);
    if (!o) return { ok: false, motivo: `orologio inesistente o non attivo in scena: ${id}` };
    if (o.pieni >= o.segmenti) return { ok: false, motivo: `orologio già completo: ${id}` };
    o.pieni += 1;
    o.ultimoTurno = turno;
    return { ok: true, orologio: o };
  }

  /**
   * Il master riporta indietro un orologio di un segno (correzione dal pannello): il segno
   * tornerà «prossimo». Il turno dell'ultimo segno non cambia (il ritmo minimo resta quello).
   */
  indietro(id: string): EsitoAvanzamento {
    const o = this.orologi.get(id);
    if (!o) return { ok: false, motivo: `orologio inesistente o non attivo in scena: ${id}` };
    if (o.pieni <= 0) return { ok: false, motivo: `orologio già a zero: ${id}` };
    o.pieni -= 1;
    return { ok: true, orologio: o };
  }

  /** Il ritmo minimo impone di mostrare il segno nella risposta del turno `turnoCorrente`? */
  dovuto(o: Orologio, turnoCorrente: number): boolean {
    if (o.almenoOgni === null || o.pieni >= o.segmenti) return false;
    return turnoCorrente - (o.ultimoTurno ?? 0) >= o.almenoOgni;
  }

  /** Righe per il messaggio del turno (parte variabile del prompt). */
  descrivi(turnoCorrente: number): string {
    if (this.orologi.size === 0) return '';
    return this.elenco
      .map((o) => {
        const testa = `- [${o.id}] «${o.nome}»: segni mostrati ${o.pieni} di ${o.segmenti}`;
        const ultimo =
          o.ultimoTurno === null
            ? 'nessun segno mostrato finora in questa scena'
            : o.ultimoTurno === turnoCorrente - 1
              ? 'la tua risposta precedente ha mostrato un segno'
              : `ultimo segno mostrato al turno ${o.ultimoTurno}`;
        if (o.pieni >= o.segmenti) return `${testa}; COMPLETO (${ultimo}). Segui al_completo: ${o.alCompleto ?? '—'}`;
        const prossimo = o.segni[o.pieni] ?? '(segno non scritto)';
        const ordine = this.dovuto(o, turnoCorrente) ? ` ${ORDINE_SEGNO}` : '';
        return `${testa}; ${ultimo}. Prossimo segno: «${prossimo}»${ordine}`;
      })
      .join('\n');
  }

  /**
   * Righe per la modalità repertorio: lo stato dell'orologio senza il testo del segno (i segni
   * sono battute `segno_orologio`, il narratore non deve parafrasarli). Se il ritmo minimo lo
   * impone, l'ordine di far uscire la battuta del segno.
   */
  descriviRepertorio(turnoCorrente: number): string {
    if (this.orologi.size === 0) return '';
    return this.elenco
      .map((o) => {
        const testa = `- [${o.id}] «${o.nome}»: segni mostrati ${o.pieni} di ${o.segmenti}`;
        if (o.pieni >= o.segmenti) return `${testa}; COMPLETO: usa una battuta di tipo finale quando la scena lo chiede.`;
        const ultimo =
          o.ultimoTurno === null ? 'nessun segno finora' : o.ultimoTurno === turnoCorrente - 1 ? 'la tua risposta precedente ha mostrato un segno' : `ultimo segno al turno ${o.ultimoTurno}`;
        const ordine = this.dovuto(o, turnoCorrente) ? ` ${ORDINE_SEGNO} Usa la battuta di tipo segno_orologio disponibile.` : '';
        return `${testa}; ${ultimo}.${ordine}`;
      })
      .join('\n');
  }

  /** Istantanea per il log. */
  riepilogo(): Record<string, string> {
    return Object.fromEntries(this.elenco.map((o) => [o.id, `${o.pieni}/${o.segmenti}`]));
  }
}
