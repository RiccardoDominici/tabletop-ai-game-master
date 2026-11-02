/**
 * Motore delle precondizioni del repertorio: stato della scena (indizi rivelati, battute usate e
 * quante volte, menzogne dette, fatti noti ai PG, orologi) e, per ogni turno, l'elenco delle
 * battute disponibili. Applica gli effetti quando una battuta esce.
 *
 * Il selettore (Haiku) vede solo `id · chi · tipo · quando` delle battute disponibili: mai il
 * testo di quelle non ancora uscite. Un `[usa]` fuori elenco viene rifiutato (e registrato).
 */
import type { Campagna, DatiYaml } from '../campagna/tipi';
import { indiziCampagna, type IndizioCampagna } from '../campagna/indizi';
import type { StatoOrologi } from '../scena/orologi';
import { pngNominati, temaPresente } from './pertinenza';
import { segretiNelTesto, type ParolaSegreta } from './segreti';
import type { Battuta, Repertorio, RigaBattuta } from './tipi';

/** Un'azione del turno come la vede il catalogo: chi, cosa, se è privata. */
export interface AzioneCatalogo {
  autore: string;
  testo: string;
  privata: boolean;
}

/**
 * La battuta può rispondere a quest'azione? `richiede.privata` vuole un'azione privata (le altre
 * battute rispondono solo alle pubbliche); `richiede.da_pg` vuole un'azione di quei PG.
 */
export function rispondeA(b: Battuta, a: { autore: string; privata: boolean }): boolean {
  if (b.richiede.privata !== a.privata) return false;
  return b.richiede.da_pg.length === 0 || b.richiede.da_pg.includes(a.autore);
}

/** La battuta ha un cancello sull'azione (privata o da_pg): esce solo con `> pg` verso un'azione adatta. */
export function haCancelloAzione(b: Battuta): boolean {
  return b.richiede.privata || b.richiede.da_pg.length > 0;
}

export type EsitoUso =
  | { ok: true; battuta: Battuta; righe: RigaBattuta[]; /** 0 = testo principale, n = variante n */ versione: number; uso: number }
  | { ok: false; motivo: string };

export class StatoRepertorio {
  readonly indiziRivelati = new Set<string>();
  readonly usi = new Map<string, number>();
  readonly menzogneDette = new Set<string>();
  /** Fatti del canone che i PG conoscono: pubblici dall'inizio + quelli scoperti in scena. */
  readonly fattiNoti = new Set<string>();
  /** Fatti scoperti durante la scena (non pubblici all'inizio), nell'ordine. */
  readonly fattiScoperti: string[] = [];
  /** Turno dell'ultimo uso di ogni battuta (anti-ripetizione). */
  readonly ultimoUso = new Map<string, number>();
  /** B2: una battuta e le sue varianti non tornano entro questo numero di turni. */
  static readonly PAUSA_RIPETIZIONE = 3;
  /** Scena in corso (campagne con più scene): le battute con `scena` valgono solo lì. null = tutte. */
  scena: string | null = null;
  /** Indizi della campagna con i loro `modi`. */
  private readonly indizi: Map<string, IndizioCampagna>;

  constructor(
    readonly repertorio: Repertorio,
    campagna: Campagna,
    private readonly orologi: StatoOrologi,
  ) {
    for (const f of (campagna.campagnaNarratore['canone'] as DatiYaml[] | undefined) ?? []) {
      if (f?.['noto_ai_pg'] === true && typeof f['id'] === 'string') this.fattiNoti.add(f['id']);
    }
    this.indizi = indiziCampagna(campagna);
    this.scena = campagna.scena.id;
  }

  /**
   * Strada alternativa per un indizio già trovato: una battuta di tipo indizio che rivela solo
   * indizi con `modi` ≥ 2 già rivelati (e fatti già noti), senza altri effetti. I modi sono strade
   * diverse per trovare la stessa cosa: trovata per una, le altre non servono più.
   */
  private stradaGiàPercorsa(b: Battuta): boolean {
    const e = b.effetti;
    if (b.tipo !== 'indizio' || e.rivela_indizi.length === 0 || e.menzogna_detta || e.avanza_orologio) return false;
    const tutti = e.rivela_indizi.every((i) => this.indiziRivelati.has(i) && (this.indizi.get(i)?.modi ?? 1) >= 2);
    return tutti && e.fatti_noti.every((f) => this.fattiNoti.has(f));
  }

  usata(id: string): boolean {
    return (this.usi.get(id) ?? 0) > 0;
  }

  /** Perché una battuta non è disponibile adesso (null = disponibile). `turno` attiva l'anti-ripetizione. */
  motivoIndisponibile(b: Battuta, turno?: number): string | null {
    const usi = this.usi.get(b.id) ?? 0;
    if (usi >= b.max_usi) return `già usata ${usi} volte (max_usi ${b.max_usi})`;
    if (b.scena && this.scena && b.scena !== this.scena) return `battuta della scena ${b.scena}`;
    if (this.stradaGiàPercorsa(b)) return `indizio già trovato in un altro modo (${b.effetti.rivela_indizi.join(', ')})`;
    const ultimo = this.ultimoUso.get(b.id);
    if (turno !== undefined && ultimo !== undefined && turno - ultimo <= StatoRepertorio.PAUSA_RIPETIZIONE) {
      return `uscita al turno ${ultimo}: non torna prima del turno ${ultimo + StatoRepertorio.PAUSA_RIPETIZIONE + 1}`;
    }
    const r = b.richiede;
    for (const i of r.indizi_rivelati) if (!this.indiziRivelati.has(i)) return `richiede l'indizio rivelato ${i}`;
    for (const i of r.indizi_non_rivelati) if (this.indiziRivelati.has(i)) return `richiede l'indizio NON rivelato ${i}`;
    for (const id of r.battute_usate) if (!this.usata(id)) return `richiede la battuta già usata ${id}`;
    for (const id of r.battute_non_usate) if (this.usata(id)) return `richiede la battuta non usata ${id}`;
    if (r.orologio) {
      // Lo stato vero dell'orologio, anche se in questa scena non è attivo (non avanza, ma conta).
      const o = this.orologi.trova(r.orologio.id);
      const pieni = o?.pieni ?? 0;
      if (!o) return `orologio ${r.orologio.id} inesistente`;
      if (pieni < r.orologio.min || pieni > r.orologio.max) return `orologio ${r.orologio.id} a ${pieni}, serve ${r.orologio.min}–${r.orologio.max}`;
    }
    return null;
  }

  disponibili(turno?: number): Battuta[] {
    return this.repertorio.battute.filter((b) => this.motivoIndisponibile(b, turno) === null);
  }

  /**
   * Catalogo B2 del turno: solo le battute pertinenti, mai quelle `solo_esempio`.
   * - pertinenti: i `temi` compaiono nelle azioni, oppure le azioni nominano il PNG che parla;
   * - il segno d'orologio solo quando è dovuto (o se le azioni ne toccano i temi);
   * - per stato: a orologio completo, le battute che lo richiedono completo (finali, folla, chiusura),
   *   anche senza parole dei giocatori;
   * - i `riempitivo` solo allo stallo (nessuno ha agito);
   * - sopra a tutto, il filtro dei segreti di `disponibiliPerTurno`.
   */
  catalogo(o: {
    turno: number;
    /** Azioni del turno (private comprese): ogni battuta guarda solo quelle a cui può rispondere. */
    azioni?: AzioneCatalogo[];
    /** Compatibilità: testo delle azioni pubbliche, se `azioni` manca. */
    testoAzioni?: string;
    stallo: boolean;
    segnoDovuto: boolean;
    nomiPng: Map<string, string[]>;
    parole: ParolaSegreta[];
  }): { battute: Battuta[]; trattenute: string[]; perche: Record<string, string> } {
    const azioni = o.azioni ?? (o.testoAzioni ? [{ autore: '', testo: o.testoAzioni, privata: false }] : []);
    // Testo delle azioni a cui ogni battuta può rispondere (cache per combinazione di cancelli).
    const testi = new Map<string, string | null>();
    const testoPer = (b: Battuta): string | null => {
      const chiave = `${b.richiede.privata}|${b.richiede.da_pg.join(',')}`;
      if (!testi.has(chiave)) {
        const adatte = azioni.filter((a) => rispondeA(b, a));
        testi.set(chiave, adatte.length ? adatte.map((a) => a.testo).join('\n') : null);
      }
      return testi.get(chiave)!;
    };
    const completi = new Map(this.orologi.elenco.map((x) => [x.id, x.pieni >= x.segmenti ? x.segmenti : null]));
    const perche: Record<string, string> = {};
    const candidate = this.disponibili(o.turno).filter((b) => {
      if (b.solo_esempio) return false;
      const testo = testoPer(b);
      // Cancello sull'azione: senza un'azione adatta (privata, del PG giusto) la battuta non entra.
      if (haCancelloAzione(b) && testo === null) return false;
      const t = testo ?? '';
      const oro = b.richiede.orologio;
      const segmentiCompleti = oro ? completi.get(oro.id) : null;
      const perStato = segmentiCompleti != null && oro!.min >= segmentiCompleti;
      const temi = temaPresente(t, b.temi);
      let motivo: string | null = null;
      if (perStato) motivo = 'stato';
      else if (b.tipo === 'segno_orologio') motivo = o.segnoDovuto ? 'segno' : temi ? 'temi' : null;
      else if (b.riempitivo) motivo = o.stallo ? 'stallo' : null;
      else if (temi) motivo = 'temi';
      else if (b.chi !== 'narratore' && pngNominati(t, o.nomiPng).has(b.chi)) motivo = 'png';
      if (motivo) perche[b.id] = motivo;
      return motivo !== null;
    });
    const filtrate = this.filtraSegreti(candidate, (b) => testoPer(b) ?? '', o.parole);
    return { ...filtrate, perche };
  }

  /** Riga dell'elenco: `id · chi · tipo · quando`. */
  static riga(b: Battuta): string {
    return `- ${b.id} · ${b.chi} · ${b.tipo} · ${b.quando}`;
  }

  /**
   * Battute da mostrare al selettore in questo turno. Una battuta la cui riga d'elenco porterebbe
   * una parola ancora segreta (es. una confessione che lega un PNG a un segreto) entra nell'elenco
   * solo se le azioni del turno nominano uno dei suoi `temi`: allora l'argomento l'hanno portato i
   * giocatori, e per la regola di parole_segrete.yaml quello che dice un giocatore è pubblico.
   */
  disponibiliPerTurno(testoAzioni: string, parole: ParolaSegreta[]): { battute: Battuta[]; trattenute: string[] } {
    return this.filtraSegreti(this.disponibili(), () => testoAzioni, parole);
  }

  /** `testoAzioni(b)`: il testo delle azioni a cui la battuta può rispondere (solo quello «rende pubblica» una parola). */
  private filtraSegreti(candidate: Battuta[], testoAzioni: (b: Battuta) => string, parole: ParolaSegreta[]): { battute: Battuta[]; trattenute: string[] } {
    const pubblico = { indiziRivelati: this.indiziRivelati, battuteUsate: (id: string) => this.usata(id) };
    const battute: Battuta[] = [];
    const trattenute: string[] = [];
    for (const b of candidate) {
      const azioni = testoAzioni(b).toLowerCase();
      const segreti = segretiNelTesto(StatoRepertorio.riga(b), parole, pubblico);
      const nominata = b.temi.some((t) => t.length > 2 && azioni.includes(t.toLowerCase())) || segreti.some((p) => p.regex.test(azioni));
      if (segreti.length === 0 || nominata) battute.push(b);
      else trattenute.push(b.id);
    }
    return { battute, trattenute };
  }

  /** Righe per il messaggio del turno: `id · chi · tipo · quando` (tutte le disponibili). */
  elencoDisponibili(battute: Battuta[] = this.disponibili()): string {
    return battute.map((b) => StatoRepertorio.riga(b)).join('\n');
  }

  /**
   * Fa uscire una battuta: controlla che sia disponibile, sceglie il testo (principale al primo
   * uso, poi le varianti in ordine) e applica gli effetti. `segnoGiàMostrato`: in questa risposta
   * un orologio è già avanzato (mai due segni in una risposta).
   */
  usa(id: string, turno: number, segnoGiàMostrato: boolean): EsitoUso {
    const b = this.repertorio.perId.get(id);
    if (!b) return { ok: false, motivo: `battuta inesistente: ${id}` };
    const motivo = this.motivoIndisponibile(b);
    if (motivo) return { ok: false, motivo };
    if (b.effetti.avanza_orologio && segnoGiàMostrato) return { ok: false, motivo: 'un segno di orologio è già uscito in questa risposta' };
    if (b.effetti.avanza_orologio) {
      const a = this.orologi.avanza(b.effetti.avanza_orologio, turno, false);
      if (!a.ok) return { ok: false, motivo: a.motivo };
    }
    const uso = (this.usi.get(id) ?? 0) + 1;
    this.usi.set(id, uso);
    this.ultimoUso.set(id, turno);
    const versione = uso === 1 || b.varianti.length === 0 ? 0 : ((uso - 2) % b.varianti.length) + 1;
    const righe = versione === 0 ? b.testo : b.varianti[versione - 1]!;
    for (const i of b.effetti.rivela_indizi) this.indiziRivelati.add(i);
    if (b.effetti.menzogna_detta) this.menzogneDette.add(b.effetti.menzogna_detta);
    for (const f of b.effetti.fatti_noti) {
      if (!this.fattiNoti.has(f)) {
        this.fattiNoti.add(f);
        this.fattiScoperti.push(f);
      }
    }
    return { ok: true, battuta: b, righe, versione, uso };
  }

  /** Battute mai uscite (per il riepilogo dell'esperimento; le `solo_esempio` non contano). */
  maiUsate(): string[] {
    return this.repertorio.battute.filter((b) => !b.solo_esempio && !this.usata(b.id)).map((b) => b.id);
  }

  riepilogo(): Record<string, unknown> {
    return {
      indizi: [...this.indiziRivelati],
      menzogne: [...this.menzogneDette],
      fatti_scoperti: [...this.fattiScoperti],
      usi: Object.fromEntries(this.usi),
      orologi: this.orologi.riepilogo(),
    };
  }
}
