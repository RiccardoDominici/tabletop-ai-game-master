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
import type { Campagna, DatiYaml, ScenaCaricata } from '../campagna/tipi';

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
  /**
   * `parte_dopo`: id di battute o indizi; l'orologio comincia a correre quando ne esce uno (un
   * orologio che parte da una scelta dei PG). Vuoto = corre da subito.
   */
  parteDopo: string[];
  /** Sta correndo: avanza, conta per il ritmo minimo, i suoi segni vanno in catalogo. */
  partito: boolean;
}

export type EsitoAvanzamento = { ok: true; orologio: Orologio } | { ok: false; motivo: string };

function testo(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * Gli orologi sono della CAMPAGNA e tengono il loro stato tra le scene (la piena sale anche mentre
 * il gruppo è altrove); ogni scena dice quali sono attivi (`orologi_attivi`): solo quelli il
 * narratore li vede e li può avanzare.
 */
export class StatoOrologi {
  private readonly orologi = new Map<string, Orologio>();
  private attivi = new Set<string>();

  constructor(campagna: Campagna) {
    const elenco = Array.isArray(campagna.campagnaNarratore['orologi']) ? (campagna.campagnaNarratore['orologi'] as DatiYaml[]) : [];
    for (const d of elenco) {
      const id = testo(d['id']);
      if (!id) continue;
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
        parteDopo: Array.isArray(d['parte_dopo']) ? (d['parte_dopo'] as unknown[]).filter((x): x is string => typeof x === 'string') : [],
        partito: !(Array.isArray(d['parte_dopo']) && (d['parte_dopo'] as unknown[]).length > 0),
      });
    }
    this.impostaScena(campagna.scena);
  }

  /** Cambio di scena: attivi diventano gli orologi della nuova scena; gli stati restano. */
  impostaScena(scena: ScenaCaricata): void {
    const attivi = Array.isArray(scena.dati['orologi_attivi']) ? (scena.dati['orologi_attivi'] as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    this.attivi = new Set(attivi.filter((id) => this.orologi.has(id)));
  }

  /** Orologi attivi nella scena corrente, nell'ordine di campagna.yaml. */
  get elenco(): Orologio[] {
    return [...this.orologi.values()].filter((o) => this.attivi.has(o.id));
  }

  /** Un orologio della campagna, attivo o no (le condizioni del repertorio guardano lo stato vero). */
  trova(id: string): Orologio | undefined {
    return this.orologi.get(id);
  }

  /**
   * Sono usciti questi id (una battuta e gli indizi che rivela): parte ogni orologio che li aspettava.
   * Il ritmo minimo conta dal turno della partenza. Restituisce gli orologi partiti adesso.
   */
  segnala(ids: readonly string[], turno: number): Orologio[] {
    const partiti: Orologio[] = [];
    for (const o of this.orologi.values()) {
      if (o.partito || !o.parteDopo.some((x) => ids.includes(x))) continue;
      o.partito = true;
      o.ultimoTurno = turno;
      partiti.push(o);
    }
    return partiti;
  }

  /** Il master fa partire a mano un orologio che aspettava (anche in modalità A, dove le battute non hanno id). */
  avvia(id: string, turno: number): boolean {
    const o = this.orologi.get(id);
    if (!o || o.partito) return false;
    o.partito = true;
    o.ultimoTurno = turno;
    return true;
  }

  /** Il narratore propone l'avanzamento: lo si accetta solo se è lecito. */
  avanza(id: string, turno: number, giàAvanzatoInQuestoTurno: boolean): EsitoAvanzamento {
    if (giàAvanzatoInQuestoTurno) return { ok: false, motivo: 'più di un segno nella stessa risposta' };
    const o = this.attivi.has(id) ? this.orologi.get(id) : undefined;
    if (!o) return { ok: false, motivo: `orologio inesistente o non attivo in scena: ${id}` };
    if (!o.partito) return { ok: false, motivo: `orologio non ancora partito (parte dopo ${o.parteDopo.join(', ')}): ${id}` };
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
    const o = this.attivi.has(id) ? this.orologi.get(id) : undefined;
    if (!o) return { ok: false, motivo: `orologio inesistente o non attivo in scena: ${id}` };
    if (o.pieni <= 0) return { ok: false, motivo: `orologio già a zero: ${id}` };
    o.pieni -= 1;
    return { ok: true, orologio: o };
  }

  /** Il ritmo minimo impone di mostrare il segno nella risposta del turno `turnoCorrente`? */
  dovuto(o: Orologio, turnoCorrente: number): boolean {
    if (!o.partito || o.almenoOgni === null || o.pieni >= o.segmenti) return false;
    return turnoCorrente - (o.ultimoTurno ?? 0) >= o.almenoOgni;
  }

  /** Righe per il messaggio del turno (parte variabile del prompt). */
  descrivi(turnoCorrente: number): string {
    if (this.orologi.size === 0) return '';
    return this.elenco
      .map((o) => {
        const testa = `- [${o.id}] «${o.nome}»: segni mostrati ${o.pieni} di ${o.segmenti}`;
        if (!o.partito) return `${testa}; non ancora partito: nessun segno da mostrare.`;
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
        if (!o.partito) return `${testa}; non ancora partito: nessun segno da mostrare.`;
        if (o.pieni >= o.segmenti) return `${testa}; COMPLETO: usa una battuta di tipo finale quando la scena lo chiede.`;
        const ultimo =
          o.ultimoTurno === null ? 'nessun segno finora' : o.ultimoTurno === turnoCorrente - 1 ? 'la tua risposta precedente ha mostrato un segno' : `ultimo segno al turno ${o.ultimoTurno}`;
        const ordine = this.dovuto(o, turnoCorrente) ? ` ${ORDINE_SEGNO} Usa la battuta di tipo segno_orologio disponibile.` : '';
        return `${testa}; ${ultimo}.${ordine}`;
      })
      .join('\n');
  }

  /** Stato di tutti gli orologi della campagna, per il registro della sessione. */
  esporta(): Record<string, { pieni: number; ultimoTurno: number | null; partito: boolean }> {
    return Object.fromEntries([...this.orologi.values()].map((o) => [o.id, { pieni: o.pieni, ultimoTurno: o.ultimoTurno, partito: o.partito }]));
  }

  /** Ripresa di una sessione: gli orologi tornano dove erano (quelli che la campagna non ha più si ignorano). */
  importa(stati: Record<string, { pieni: number; ultimoTurno: number | null; partito: boolean }>): void {
    for (const [id, s] of Object.entries(stati ?? {})) {
      const o = this.orologi.get(id);
      if (!o) continue;
      o.pieni = Math.max(0, Math.min(o.segmenti, Math.floor(Number(s.pieni) || 0)));
      o.ultimoTurno = typeof s.ultimoTurno === 'number' ? s.ultimoTurno : null;
      o.partito = s.partito !== false;
    }
  }

  /** Istantanea per il log. */
  riepilogo(): Record<string, string> {
    return Object.fromEntries(this.elenco.map((o) => [o.id, `${o.pieni}/${o.segmenti}`]));
  }
}
