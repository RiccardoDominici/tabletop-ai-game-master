/**
 * Stato degli orologi della scena (docs/f0-contratti.md, riga [orologio]; manuale E9).
 *
 * Il Motore tiene lo stato: quanti segni sono stati mostrati per ogni orologio attivo, e mette
 * nel contesto di ogni turno «segni mostrati N di M, prossimo segno: …», così il narratore non
 * deve ricostruirlo dalla trascrizione. Il narratore può solo PROPORRE l'avanzamento con la
 * riga [orologio] <id> (in modalità B: una battuta di segno); qui si controlla che l'orologio
 * esista, sia attivo, non sia completo e rispetti il ritmo.
 *
 * Il ritmo è del Motore, orologio per orologio (playtest di nozze-neve: il tramonto correva al
 * triplo e affamava gli altri orologi, perché il «dovuto» e il tetto di un segno per risposta
 * valevano per tutti gli orologi insieme):
 * - minimo (`segno_almeno_ogni: N`): il segno è DOVUTO quando l'orologio ha passato N turni ATTIVO
 *   dall'ultimo segno (o dalla partenza, `parte_dopo`). I turni passati in una scena dove l'orologio
 *   non è attivo non contano, quelli delle visite precedenti sì: entrare in una scena non rende subito
 *   dovuto un orologio rimasto fermo altrove. La riga dell'orologio finisce allora con «Mostralo in
 *   questa risposta.» e in modalità B il Motore fa dire un segno DI QUELL'OROLOGIO se il selettore
 *   non l'ha fatto;
 * - massimo (`segno_al_massimo_ogni: N`, predefinito 2): un orologio non avanza di nuovo prima di N
 *   turni dal suo ultimo segno. Vale per il segno dovuto, per il narratore (modalità A) e per i segni
 *   che il selettore usa senza «> pg»; un segno legato all'azione di un PG (i temi di quell'azione) e
 *   il master lo scavalcano;
 * - per risposta: un segno per orologio, al massimo MAX_OROLOGI_PER_RISPOSTA orologi diversi;
 * - per scena (`orologi_in_scena` della scheda scena): entrando in quella scena l'orologio sale ad
 *   almeno `pieni_almeno` segni, e lì il ritmo minimo può essere un altro (`segno_almeno_ogni`).
 *   È la regola «al Sasso sale a sei» di nozze-neve, che prima applicava il master dal pannello.
 * Lo stato (ultimo segno, partenza, turni attivi accumulati) sopravvive ai cambi di scena e alla ripresa.
 */

import type { Campagna, DatiYaml, ScenaCaricata } from '../campagna/tipi';
// `testo` qui è già il lettore dei campi YAML: la frase fissa della lingua si chiama testoFisso.
import { testo as testoFisso } from '../lingua';

/**
 * Frase che il prompt del narratore tratta come ordine di mostrare il segno («Mostralo in questa
 * risposta.»), nella lingua dei contenuti: il prompt di ogni lingua cita la sua.
 */
export const ordineSegno = (): string => testoFisso('orologi.ordine_segno');

/** Orologi diversi che possono avanzare nella stessa risposta (un segno ciascuno). */
export const MAX_OROLOGI_PER_RISPOSTA = 2;
/** Ritmo massimo predefinito: un segno ogni 2 turni per orologio (`segno_al_massimo_ogni`). */
export const AL_MASSIMO_OGNI_PREDEFINITO = 2;

/** Come avanza un orologio: chi lo propone e cosa è già successo in questa risposta. */
export interface OpzioniAvanza {
  /** Orologi già avanzati in questa risposta (un segno per orologio, al massimo MAX_OROLOGI_PER_RISPOSTA). */
  inRisposta?: ReadonlySet<string>;
  /** Vecchia forma: true = un segno è già uscito in questa risposta. */
  giàAvanzato?: boolean;
  /** Rispetta il ritmo massimo (narratore, segno dovuto, selettore senza «> pg»: sì; master e azione di un PG: no). */
  ritmo?: boolean;
}

export interface Orologio {
  id: string;
  nome: string;
  segmenti: number;
  segni: string[];
  pieni: number;
  alCompleto: string | null;
  avanzaQuando: string[];
  /** Turno in cui è stato mostrato l'ultimo segno (null = mai). */
  ultimoTurno: number | null;
  /** Ritmo minimo della campagna: almeno un segno ogni N risposte (null = nessun obbligo). */
  almenoOgni: number | null;
  /** Ritmo minimo della scena in corso (`orologi_in_scena`), che vince su almenoOgni; null = quello della campagna. */
  almenoOgniScena: number | null;
  /** Ritmo massimo: non più di un segno ogni N turni (predefinito AL_MASSIMO_OGNI_PREDEFINITO). */
  alMassimoOgni: number;
  /** Turno da cui l'orologio è attivo nella visita corrente della sua scena (null = non attivo). */
  attivoDal: number | null;
  /** Turni passati attivo nelle visite precedenti, dall'ultimo segno (per il ritmo minimo). */
  turniAccumulati: number;
  /** Turno in cui è partito per `parte_dopo` (null = corre da subito, o non ancora partito). */
  partitoAl: number | null;
  /**
   * `parte_dopo`: id di battute o indizi; l'orologio comincia a correre quando ne esce uno (un
   * orologio che parte da una scelta dei PG). Vuoto = corre da subito.
   */
  parteDopo: string[];
  /** Sta correndo: avanza, conta per il ritmo minimo, i suoi segni vanno in catalogo. */
  partito: boolean;
}

export type EsitoAvanzamento = { ok: true; orologio: Orologio } | { ok: false; motivo: string };

/** Un orologio che entrando in una scena è salito (`orologi_in_scena.pieni_almeno`), per il log. */
export interface SaltoOrologio {
  id: string;
  da: number;
  a: number;
}

/** Lo stato di un orologio nel registro della sessione (sessione/tipi.ts, StatoOrologioSalvato). */
export interface StatoOrologioEsportato {
  pieni: number;
  ultimoTurno: number | null;
  partito: boolean;
  partitoAl?: number;
  attivoDal?: number;
  turniAccumulati?: number;
}

function testo(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Intero ≥ minimo, o null. */
function intero(v: unknown, minimo: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= minimo ? v : null;
}

/** `orologi_in_scena` della scheda scena: { <id>: { pieni_almeno?, segno_almeno_ogni? } }. */
function regoleDiScena(scena: ScenaCaricata): Map<string, { pieniAlmeno: number | null; almenoOgni: number | null }> {
  const grezzo = scena.dati['orologi_in_scena'];
  const out = new Map<string, { pieniAlmeno: number | null; almenoOgni: number | null }>();
  if (!grezzo || typeof grezzo !== 'object' || Array.isArray(grezzo)) return out;
  for (const [id, v] of Object.entries(grezzo as Record<string, unknown>)) {
    const d = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
    out.set(id, { pieniAlmeno: intero(d['pieni_almeno'], 0), almenoOgni: intero(d['segno_almeno_ogni'], 1) });
  }
  return out;
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
        almenoOgniScena: null,
        alMassimoOgni: intero(d['segno_al_massimo_ogni'], 1) ?? AL_MASSIMO_OGNI_PREDEFINITO,
        attivoDal: null,
        turniAccumulati: 0,
        partitoAl: null,
        parteDopo: Array.isArray(d['parte_dopo']) ? (d['parte_dopo'] as unknown[]).filter((x): x is string => typeof x === 'string') : [],
        partito: !(Array.isArray(d['parte_dopo']) && (d['parte_dopo'] as unknown[]).length > 0),
      });
    }
    this.impostaScena(campagna.scena, 0);
  }

  /** Il turno da cui si contano i turni attivi della visita corrente (ultimo segno, partenza, accensione). */
  private inizioConteggio(o: Orologio): number {
    return Math.max(o.ultimoTurno ?? 0, o.partitoAl ?? 0, o.attivoDal ?? 0);
  }

  /**
   * Cambio di scena al turno `turno` (quello dell'apertura della scena nuova): attivi diventano gli
   * orologi della nuova scena; gli stati restano. Un orologio che si spegne mette da parte i turni
   * passati attivo (le risposte fino a `turno − 1`); uno che si accende ricomincia a contare da `turno`.
   * Poi le regole della scena (`orologi_in_scena`): il ritmo minimo di scena e il salto a
   * `pieni_almeno` (un salto conta come segno: il ritmo riparte da qui). Restituisce i salti.
   */
  impostaScena(scena: ScenaCaricata, turno = 0): SaltoOrologio[] {
    const attivi = Array.isArray(scena.dati['orologi_attivi']) ? (scena.dati['orologi_attivi'] as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    const nuovi = new Set(attivi.filter((id) => this.orologi.has(id)));
    const regole = regoleDiScena(scena);
    const salti: SaltoOrologio[] = [];
    for (const o of this.orologi.values()) {
      if (!nuovi.has(o.id)) {
        if (o.attivoDal !== null) o.turniAccumulati += Math.max(0, turno - 1 - this.inizioConteggio(o));
        o.attivoDal = null;
        o.almenoOgniScena = null;
        continue;
      }
      if (!this.attivi.has(o.id) || o.attivoDal === null) o.attivoDal = turno;
      const r = regole.get(o.id);
      o.almenoOgniScena = r?.almenoOgni ?? null;
      if (r?.pieniAlmeno != null && o.partito && o.pieni < r.pieniAlmeno) {
        const a = Math.min(o.segmenti, r.pieniAlmeno);
        salti.push({ id: o.id, da: o.pieni, a });
        o.pieni = a;
        o.ultimoTurno = turno;
        o.turniAccumulati = 0;
      }
    }
    this.attivi = nuovi;
    return salti;
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
      o.partitoAl = turno;
      o.turniAccumulati = 0;
      partiti.push(o);
    }
    return partiti;
  }

  /** Il master fa partire a mano un orologio che aspettava (anche in modalità A, dove le battute non hanno id). */
  avvia(id: string, turno: number): boolean {
    const o = this.orologi.get(id);
    if (!o || o.partito) return false;
    o.partito = true;
    o.partitoAl = turno;
    o.turniAccumulati = 0;
    return true;
  }

  /** Ritmo minimo che vale adesso: quello della scena in corso, se c'è, o quello della campagna. */
  almenoOgni(o: Orologio): number | null {
    return o.almenoOgniScena ?? o.almenoOgni;
  }

  /** Perché il ritmo massimo non lascia avanzare l'orologio al turno `turno` (null = può). */
  motivoRitmo(o: Orologio, turno: number): string | null {
    if (o.ultimoTurno !== null && turno - o.ultimoTurno < o.alMassimoOgni) {
      return testoFisso('orologi.rifiuti.ritmo', { id: o.id, ogni: o.alMassimoOgni, turno: o.ultimoTurno });
    }
    return null;
  }

  /**
   * Avanzamento proposto (narratore, battuta del selettore o del Motore, master): lo si accetta solo
   * se è lecito. `opzioni`: vedi OpzioniAvanza (la forma booleana resta per chi la usava).
   */
  avanza(id: string, turno: number, opzioni: boolean | OpzioniAvanza = {}): EsitoAvanzamento {
    const op: OpzioniAvanza = typeof opzioni === 'boolean' ? { giàAvanzato: opzioni } : opzioni;
    if (op.giàAvanzato) return { ok: false, motivo: testoFisso('orologi.rifiuti.due_segni') };
    if (op.inRisposta?.has(id)) return { ok: false, motivo: testoFisso('orologi.rifiuti.gia_uscito', { id }) };
    if (op.inRisposta && op.inRisposta.size >= MAX_OROLOGI_PER_RISPOSTA) return { ok: false, motivo: testoFisso('orologi.rifiuti.troppi', { max: MAX_OROLOGI_PER_RISPOSTA }) };
    const o = this.attivi.has(id) ? this.orologi.get(id) : undefined;
    if (!o) return { ok: false, motivo: testoFisso('orologi.rifiuti.inesistente', { id }) };
    if (!o.partito) return { ok: false, motivo: testoFisso('orologi.rifiuti.non_partito', { dopo: o.parteDopo.join(', '), id }) };
    if (o.pieni >= o.segmenti) return { ok: false, motivo: testoFisso('orologi.rifiuti.completo', { id }) };
    const ritmo = op.ritmo ? this.motivoRitmo(o, turno) : null;
    if (ritmo) return { ok: false, motivo: ritmo };
    o.pieni += 1;
    o.ultimoTurno = turno;
    o.turniAccumulati = 0;
    return { ok: true, orologio: o };
  }

  /**
   * Il master riporta indietro un orologio di un segno (correzione dal pannello): il segno
   * tornerà «prossimo». Il turno dell'ultimo segno non cambia (il ritmo minimo resta quello).
   */
  indietro(id: string): EsitoAvanzamento {
    const o = this.attivi.has(id) ? this.orologi.get(id) : undefined;
    if (!o) return { ok: false, motivo: testoFisso('orologi.rifiuti.inesistente', { id }) };
    if (o.pieni <= 0) return { ok: false, motivo: testoFisso('orologi.rifiuti.a_zero', { id }) };
    o.pieni -= 1;
    return { ok: true, orologio: o };
  }

  /** Turni passati attivo dall'ultimo segno (o dalla partenza), visite precedenti comprese, al turno `turno`. */
  turniAttivi(o: Orologio, turno: number): number {
    const visita = o.attivoDal === null ? 0 : Math.max(0, turno - this.inizioConteggio(o));
    return o.turniAccumulati + visita;
  }

  /**
   * Il ritmo minimo impone di mostrare il segno nella risposta del turno `turnoCorrente`? Contano i
   * turni passati attivo (turniAttivi); mai se il ritmo massimo lo vieta.
   */
  dovuto(o: Orologio, turnoCorrente: number): boolean {
    const almeno = this.almenoOgni(o);
    if (!o.partito || almeno === null || o.pieni >= o.segmenti || !this.attivi.has(o.id)) return false;
    return this.turniAttivi(o, turnoCorrente) >= almeno && this.motivoRitmo(o, turnoCorrente) === null;
  }

  /** Gli orologi attivi il cui segno è dovuto al turno `turno`, nell'ordine di campagna.yaml (al massimo MAX_OROLOGI_PER_RISPOSTA). */
  dovuti(turno: number): Orologio[] {
    return this.elenco.filter((o) => this.dovuto(o, turno)).slice(0, MAX_OROLOGI_PER_RISPOSTA);
  }

  /** Frase sull'ultimo segno, per le righe del contesto. */
  private ultimoSegno(o: Orologio, turnoCorrente: number): string {
    if (o.ultimoTurno === null) return testoFisso('orologi.nessun_segno');
    if (o.ultimoTurno === turnoCorrente - 1) return testoFisso('orologi.segno_precedente');
    return testoFisso('orologi.ultimo_segno', { turno: o.ultimoTurno });
  }

  /** Inizio della riga di un orologio nel messaggio del turno («- [id] «nome»: segni mostrati N di M»). */
  private testa(o: Orologio): string {
    return testoFisso('orologi.testa', { id: o.id, nome: o.nome, pieni: o.pieni, segmenti: o.segmenti });
  }

  /** Righe per il messaggio del turno (parte variabile del prompt), nella lingua dei contenuti. */
  descrivi(turnoCorrente: number): string {
    if (this.orologi.size === 0) return '';
    return this.elenco
      .map((o) => {
        const testa = this.testa(o);
        if (!o.partito) return testoFisso('orologi.non_partito', { testa });
        const ultimo = this.ultimoSegno(o, turnoCorrente);
        if (o.pieni >= o.segmenti) return testoFisso('orologi.completo', { testa, ultimo, al_completo: o.alCompleto ?? '—' });
        const prossimo = o.segni[o.pieni] ?? testoFisso('orologi.segno_non_scritto');
        // Coda della riga: il divieto del ritmo massimo e l'ordine del ritmo minimo, ognuno dopo uno spazio.
        const fermo = this.motivoRitmo(o, turnoCorrente) ? ` ${testoFisso('orologi.fermo', { turno: o.ultimoTurno! + o.alMassimoOgni })}` : '';
        const ordine = this.dovuto(o, turnoCorrente) ? ` ${ordineSegno()}` : '';
        return `${testoFisso('orologi.prossimo', { testa, ultimo, prossimo })}${fermo}${ordine}`;
      })
      .join('\n');
  }

  /**
   * Righe per la modalità repertorio: lo stato dell'orologio senza il testo del segno (i segni
   * sono battute `segno_orologio`, il narratore non deve parafrasarli). Se il ritmo minimo lo
   * impone, l'ordine di far uscire la battuta del segno DI QUELL'OROLOGIO.
   */
  descriviRepertorio(turnoCorrente: number): string {
    if (this.orologi.size === 0) return '';
    return this.elenco
      .map((o) => {
        const testa = this.testa(o);
        if (!o.partito) return testoFisso('orologi.non_partito', { testa });
        if (o.pieni >= o.segmenti) return testoFisso('orologi.repertorio.completo', { testa });
        const ordine = this.dovuto(o, turnoCorrente) ? ` ${ordineSegno()} ${testoFisso('orologi.repertorio.usa_segno')}` : '';
        return `${testoFisso('orologi.repertorio.riga', { testa, ultimo: this.ultimoSegno(o, turnoCorrente) })}${ordine}`;
      })
      .join('\n');
  }

  /** Stato di tutti gli orologi della campagna, per il registro della sessione (i campi facoltativi solo se ci sono). */
  esporta(): Record<string, StatoOrologioEsportato> {
    return Object.fromEntries(
      [...this.orologi.values()].map((o) => [
        o.id,
        {
          pieni: o.pieni,
          ultimoTurno: o.ultimoTurno,
          partito: o.partito,
          ...(o.partitoAl !== null ? { partitoAl: o.partitoAl } : {}),
          ...(o.attivoDal ? { attivoDal: o.attivoDal } : {}),
          ...(o.turniAccumulati ? { turniAccumulati: o.turniAccumulati } : {}),
        },
      ]),
    );
  }

  /**
   * Ripresa di una sessione: gli orologi tornano dove erano (quelli che la campagna non ha più si
   * ignorano). Va chiamata DOPO impostaScena della scena salvata: un salto di `pieni_almeno` fatto
   * rientrando viene così sovrascritto dallo stato vero.
   */
  importa(stati: Record<string, StatoOrologioEsportato>): void {
    for (const [id, s] of Object.entries(stati ?? {})) {
      const o = this.orologi.get(id);
      if (!o) continue;
      o.pieni = Math.max(0, Math.min(o.segmenti, Math.floor(Number(s.pieni) || 0)));
      o.ultimoTurno = typeof s.ultimoTurno === 'number' ? s.ultimoTurno : null;
      o.partito = s.partito !== false;
      o.partitoAl = typeof s.partitoAl === 'number' ? s.partitoAl : null;
      o.turniAccumulati = typeof s.turniAccumulati === 'number' && s.turniAccumulati > 0 ? Math.floor(s.turniAccumulati) : 0;
      // Archivi di prima: senza attivoDal, un orologio attivo conta dall'ultimo segno come prima.
      if (this.attivi.has(id)) o.attivoDal = typeof s.attivoDal === 'number' ? s.attivoDal : 0;
    }
  }

  /** Istantanea per il log. */
  riepilogo(): Record<string, string> {
    return Object.fromEntries(this.elenco.map((o) => [o.id, `${o.pieni}/${o.segmenti}`]));
  }
}
