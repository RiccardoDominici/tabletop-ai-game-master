/**
 * Parser incrementale dell'uscita del narratore (protocollo in docs/f0-contratti.md):
 *
 *   [narratore] Testo narrato.
 *   [<id_png>] Battuta del PNG.
 *   [orologio] o_id         ← facoltativa, prima di [invito], non letta a voce
 *   [invito] pg_a,pg_b      ← ultima riga, obbligatoria, non letta a voce
 *
 * Riceve i delta del testo in streaming e produce eventi appena possibile:
 * - `frase`: una frase completa con la sua etichetta (subito, senza aspettare la fine riga);
 * - `invito`: gli id dei PG invitati (oppure 'tutti');
 * - `orologio`: l'id dell'orologio di cui è stato mostrato il segno (lo valida il Motore);
 * - `anomalia`: deviazioni dal protocollo, tollerate ma da registrare nel log.
 *
 * Tolleranze (dal contratto): etichetta sconosciuta → voce del narratore; riga senza etichetta →
 * si accoda al segmento precedente; invito mancante → lo segnala `chiudi()`.
 * In più: un'etichetta nota scritta a metà riga («… porta. [png_baldrin] Fermi.») apre un nuovo
 * segmento; alias (nome del PNG o del PG) vengono ricondotti all'id.
 */
import { DivisoreFrasi, type OpzioniDivisore } from './frasi';

export type CodiceAnomalia =
  | 'riga_senza_etichetta'
  | 'etichetta_sconosciuta'
  | 'etichetta_in_linea'
  | 'etichetta_alias'
  | 'invito_mancante'
  | 'invito_vuoto'
  | 'invito_id_sconosciuto'
  | 'invito_ripetuto'
  | 'testo_dopo_invito'
  | 'orologio_vuoto'
  | 'usa_vuoto';

export type EventoNarratore =
  | {
      tipo: 'frase';
      /** Etichetta risolta: 'narratore' oppure un id_png noto. */
      etichetta: string;
      testo: string;
      /** Progressivo del segmento (riga etichettata) a cui la frase appartiene. */
      segmento: number;
    }
  | { tipo: 'invito'; invitati: string[] | 'tutti'; grezzo: string }
  /** Riga [orologio] <id>: il narratore ha mostrato il prossimo segno di quell'orologio. */
  | { tipo: 'orologio'; id: string; grezzo: string }
  /**
   * Riga [usa] <id_battuta> [> <id_pg>] (modalità repertorio): la battuta pre-scritta esce qui;
   * `per` è il PG alla cui azione risponde (B2), null se non dichiarato.
   */
  | { tipo: 'usa'; id: string; per: string | null; grezzo: string }
  | { tipo: 'anomalia'; codice: CodiceAnomalia; dettaglio: string };

export interface OpzioniParser {
  /** Id dei PNG (etichette parlanti oltre a 'narratore'). */
  idPng: string[];
  /** Id dei PG ammessi nell'invito. */
  idPg: string[];
  /** Alias minuscoli → id (nomi e nomi propri di PNG e PG). */
  alias?: Record<string, string>;
  divisore?: OpzioniDivisore;
}

const NARRATORE = 'narratore';
const INVITO = 'invito';
const OROLOGIO = 'orologio';
const USA = 'usa';
/** Oltre questa lunghezza un «[» a inizio riga senza «]» non è un'etichetta. */
const MAX_ETICHETTA = 48;

type Modo = 'inizio_riga' | 'testo' | 'invito' | 'orologio' | 'usa';

export class ParserNarratore {
  private readonly png: Set<string>;
  private readonly pg: Set<string>;
  private readonly alias: Map<string, string>;
  private readonly opzioniDivisore: OpzioniDivisore | undefined;

  private modo: Modo = 'inizio_riga';
  /** Inizio riga ancora da interpretare (spazi, «[etich…»). */
  private prefisso = '';
  /** Testo dopo un «[» a metà riga, in attesa di capire se è un'etichetta. */
  private sospeso = '';
  private bufferInvito = '';
  private divisore: DivisoreFrasi;
  private etichetta: string | null = null;
  private segmento = -1;
  private invitoVisto = false;
  private eventi: EventoNarratore[] = [];

  constructor(opzioni: OpzioniParser) {
    this.png = new Set(opzioni.idPng.map((s) => s.toLowerCase()));
    this.pg = new Set(opzioni.idPg.map((s) => s.toLowerCase()));
    this.alias = new Map(Object.entries(opzioni.alias ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    this.opzioniDivisore = opzioni.divisore;
    this.divisore = new DivisoreFrasi(this.opzioniDivisore);
  }

  /** Aggiunge un delta di testo; restituisce gli eventi diventati certi. */
  aggiungi(delta: string): EventoNarratore[] {
    let corsa = '';
    const svuotaCorsa = (): void => {
      if (corsa) this.testoSegmento(corsa);
      corsa = '';
    };
    for (const c of delta) {
      if (c === '\n' || c === '\r') {
        svuotaCorsa();
        this.fineRiga();
        continue;
      }
      if (this.modo === 'testo' && this.sospeso === '' && c !== '[') {
        corsa += c; // percorso veloce: testo normale del segmento, passato a blocchi
        continue;
      }
      svuotaCorsa();
      this.carattere(c);
    }
    svuotaCorsa();
    return this.prendi();
  }

  /** Fine dello stream: chiude l'ultima riga e controlla l'invito. */
  chiudi(): EventoNarratore[] {
    this.fineRiga();
    if (!this.invitoVisto) this.anomalia('invito_mancante', "manca la riga [invito] finale: si invitano tutti");
    return this.prendi();
  }

  private prendi(): EventoNarratore[] {
    const e = this.eventi;
    this.eventi = [];
    return e;
  }

  private carattere(c: string): void {
    switch (this.modo) {
      case 'inizio_riga':
        this.prefisso += c;
        this.interpretaPrefisso();
        return;
      case 'invito':
      case 'orologio':
      case 'usa':
        this.bufferInvito += c;
        return;
      case 'testo':
        if (this.sospeso === '') {
          // c === '[' qui: potrebbe essere un'etichetta a metà riga.
          this.sospeso = c;
          return;
        }
        this.sospeso += c;
        this.interpretaSospeso();
        return;
    }
  }

  /** Decide cosa c'è a inizio riga appena possibile. */
  private interpretaPrefisso(): void {
    const p = this.prefisso.trimStart();
    if (p === '') return; // solo spazi finora
    if (p[0] !== '[') {
      // Riga senza etichetta: si accoda al segmento precedente (o al narratore).
      this.prefisso = '';
      this.rigaSenzaEtichetta(p);
      return;
    }
    const chiusa = p.indexOf(']');
    if (chiusa < 0) {
      if (p.length > MAX_ETICHETTA) {
        this.prefisso = '';
        this.rigaSenzaEtichetta(p);
      }
      return; // aspettiamo la «]»
    }
    const grezza = p.slice(1, chiusa);
    const resto = p.slice(chiusa + 1);
    this.prefisso = '';
    this.apriEtichetta(grezza, resto, false);
  }

  private rigaSenzaEtichetta(testo: string): void {
    const verso = this.etichetta ?? NARRATORE;
    this.anomalia('riga_senza_etichetta', `riga senza etichetta accodata a [${verso}]: «${tronca(testo)}»`);
    if (this.etichetta === null) this.nuovoSegmento(NARRATORE);
    this.modo = 'testo';
    this.testoSegmento(testo);
  }

  /** Testo dopo «[» a metà riga: etichetta nota → nuovo segmento, altrimenti testo normale. */
  private interpretaSospeso(): void {
    const s = this.sospeso;
    const chiusa = s.indexOf(']');
    if (chiusa < 0) {
      // Un'etichetta contiene solo lettere, cifre, _ e -: altro carattere → era testo.
      if (!/^\[[\p{L}\p{N}_ -]*$/u.test(s) || s.length > MAX_ETICHETTA) {
        this.sospeso = '';
        this.testoSegmento(s);
      }
      return;
    }
    const grezza = s.slice(1, chiusa);
    const resto = s.slice(chiusa + 1);
    this.sospeso = '';
    const risolta = this.risolvi(grezza);
    if (risolta.tipo === 'sconosciuta') {
      // Parentesi quadre qualsiasi a metà frase: le teniamo come testo.
      this.testoSegmento(s.slice(0, chiusa + 1));
      if (resto) this.testoSegmento(resto);
      return;
    }
    this.anomalia('etichetta_in_linea', `etichetta [${grezza}] a metà riga: nuovo segmento`);
    this.chiudiSegmento();
    this.apriEtichetta(grezza, resto, true);
  }

  private apriEtichetta(grezza: string, resto: string, giàSegnalata: boolean): void {
    const risolta = this.risolvi(grezza);
    if (risolta.tipo === 'invito') {
      if (this.invitoVisto) this.anomalia('invito_ripetuto', 'più di una riga [invito]: vale l’ultima');
      this.modo = 'invito';
      this.bufferInvito = resto;
      return;
    }
    if (risolta.tipo === 'orologio' || risolta.tipo === 'usa') {
      this.modo = risolta.tipo;
      this.bufferInvito = resto;
      return;
    }
    if (this.invitoVisto) this.anomalia('testo_dopo_invito', `segmento [${grezza}] dopo [invito]`);
    let etichetta: string;
    if (risolta.tipo === 'sconosciuta') {
      if (!giàSegnalata) this.anomalia('etichetta_sconosciuta', `etichetta sconosciuta [${grezza}]: letta dal narratore`);
      etichetta = NARRATORE;
    } else {
      if (risolta.alias) this.anomalia('etichetta_alias', `etichetta [${grezza}] ricondotta a [${risolta.id}]`);
      etichetta = risolta.id;
    }
    this.nuovoSegmento(etichetta);
    this.modo = 'testo';
    const testo = resto.replace(/^\s+/, '');
    if (testo) this.testoSegmento(testo);
  }

  private risolvi(
    grezza: string,
  ): { tipo: 'invito' } | { tipo: 'orologio' } | { tipo: 'usa' } | { tipo: 'parlante'; id: string; alias: boolean } | { tipo: 'sconosciuta' } {
    const t = grezza.trim().toLowerCase();
    if (t === INVITO) return { tipo: 'invito' };
    if (t === OROLOGIO) return { tipo: 'orologio' };
    if (t === USA) return { tipo: 'usa' };
    if (t === NARRATORE) return { tipo: 'parlante', id: NARRATORE, alias: false };
    if (this.png.has(t)) return { tipo: 'parlante', id: t, alias: false };
    const daAlias = this.alias.get(t) ?? this.alias.get(t.replace(/^png_/, ''));
    if (daAlias && (this.png.has(daAlias) || daAlias === NARRATORE)) return { tipo: 'parlante', id: daAlias, alias: true };
    return { tipo: 'sconosciuta' };
  }

  private nuovoSegmento(etichetta: string): void {
    this.etichetta = etichetta;
    this.segmento += 1;
    this.divisore = new DivisoreFrasi(this.opzioniDivisore);
  }

  private testoSegmento(testo: string): void {
    for (const frase of this.divisore.aggiungi(testo)) this.emettiFrase(frase);
  }

  private chiudiSegmento(): void {
    if (this.sospeso) {
      const s = this.sospeso;
      this.sospeso = '';
      this.testoSegmento(s);
    }
    for (const frase of this.divisore.chiudi()) this.emettiFrase(frase);
  }

  private emettiFrase(testo: string): void {
    const etichetta = this.etichetta ?? NARRATORE;
    const pulita = pulisciFrase(testo, etichetta !== NARRATORE);
    if (!pulita) return;
    this.eventi.push({ tipo: 'frase', etichetta, testo: pulita, segmento: Math.max(this.segmento, 0) });
  }

  private fineRiga(): void {
    switch (this.modo) {
      case 'testo':
        this.chiudiSegmento();
        break;
      case 'invito':
        this.chiudiInvito();
        break;
      case 'orologio':
        this.chiudiOrologio();
        break;
      case 'usa':
        this.chiudiUsa();
        break;
      case 'inizio_riga': {
        const p = this.prefisso.trim();
        this.prefisso = '';
        if (p) {
          // Riga finita prima della «]»: testo senza etichetta.
          this.rigaSenzaEtichetta(p);
          this.chiudiSegmento();
        }
        break;
      }
    }
    this.modo = 'inizio_riga';
  }

  private chiudiUsa(): void {
    const grezzo = this.bufferInvito.trim();
    this.bufferInvito = '';
    // L'id è la prima parola; tollera `backtick`, virgolette e punteggiatura finale.
    const [prima, dopo] = grezzo.replace(/[`"'«»]/g, '').split(/>|→/, 2);
    const id = (prima ?? '').split(/[\s,;]+/).filter(Boolean)[0]?.toLowerCase().replace(/[.!?:]+$/, '') ?? '';
    if (!id) {
      this.anomalia('usa_vuoto', 'riga [usa] senza id');
      return;
    }
    // «> pg_ginestra» (o il nome): il PG alla cui azione la battuta risponde.
    const bersaglio = (dopo ?? '').trim().split(/[\s,;]+/)[0]?.toLowerCase().replace(/[.!?:]+$/, '') ?? '';
    const per = bersaglio ? (this.pg.has(bersaglio) ? bersaglio : (this.alias.get(bersaglio) ?? bersaglio)) : null;
    if (this.invitoVisto) this.anomalia('testo_dopo_invito', `[usa] ${id} dopo [invito]`);
    this.eventi.push({ tipo: 'usa', id, per, grezzo });
  }

  private chiudiOrologio(): void {
    const grezzo = this.bufferInvito.trim();
    this.bufferInvito = '';
    const id = grezzo.split(/[\s,;]+/)[0]?.toLowerCase().replace(/[.!?]+$/, '') ?? '';
    if (!id) {
      this.anomalia('orologio_vuoto', 'riga [orologio] senza id');
      return;
    }
    this.eventi.push({ tipo: 'orologio', id, grezzo });
  }

  private chiudiInvito(): void {
    const grezzo = this.bufferInvito.trim();
    this.bufferInvito = '';
    this.invitoVisto = true;
    const parti = grezzo
      .split(/[,;]+|\s+e\s+|\s+/)
      .map((s) => s.trim().toLowerCase().replace(/[.!?]+$/, ''))
      .filter(Boolean);
    if (parti.length === 0) {
      this.anomalia('invito_vuoto', 'riga [invito] vuota: si invitano tutti');
      this.eventi.push({ tipo: 'invito', invitati: 'tutti', grezzo });
      return;
    }
    if (parti.includes('tutti')) {
      this.eventi.push({ tipo: 'invito', invitati: 'tutti', grezzo });
      return;
    }
    const invitati: string[] = [];
    for (const p of parti) {
      const id = this.pg.has(p) ? p : this.alias.get(p);
      if (id && this.pg.has(id)) {
        if (!invitati.includes(id)) invitati.push(id);
      } else {
        this.anomalia('invito_id_sconosciuto', `id sconosciuto nell'invito: «${p}»`);
      }
    }
    if (invitati.length === 0) {
      this.anomalia('invito_vuoto', 'nessun id valido nell’invito: si invitano tutti');
      this.eventi.push({ tipo: 'invito', invitati: 'tutti', grezzo });
      return;
    }
    this.eventi.push({ tipo: 'invito', invitati, grezzo });
  }

  private anomalia(codice: CodiceAnomalia, dettaglio: string): void {
    this.eventi.push({ tipo: 'anomalia', codice, dettaglio });
  }
}

/**
 * Pulizia minima per la voce: niente markdown, e per le battute dei PNG niente virgolette
 * (il protocollo le vieta, ma se arrivano la sintesi non deve leggerle né lo schermo raddoppiarle).
 */
export function pulisciFrase(testo: string, battuta: boolean): string {
  let t = testo.replace(/[*_#`]+/g, '').replace(/^\s*[-–—]\s+/, '');
  if (battuta) t = t.replace(/[«»“”"]/g, '');
  return t.replace(/\s+/g, ' ').trim();
}

function tronca(s: string, n = 60): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
