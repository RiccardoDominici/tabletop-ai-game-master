/**
 * Stato degli orologi della scena (docs/f0-contratti.md, riga [orologio]; manuale E9).
 *
 * Il Motore tiene lo stato: quanti segni sono stati mostrati per ogni orologio attivo, e mette
 * nel contesto di ogni turno «segni mostrati N di M, prossimo segno: …», così il narratore non
 * deve ricostruirlo dalla trascrizione. Il narratore può solo PROPORRE l'avanzamento con la
 * riga [orologio] <id>; qui si controlla che l'orologio esista, sia attivo e non sia completo.
 * Al massimo un segno per risposta.
 */
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
        return `${testa}; ${ultimo}. Prossimo segno: «${prossimo}»`;
      })
      .join('\n');
  }

  /** Istantanea per il log. */
  riepilogo(): Record<string, string> {
    return Object.fromEntries(this.elenco.map((o) => [o.id, `${o.pieni}/${o.segmenti}`]));
  }
}
