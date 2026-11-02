/**
 * Motore delle precondizioni del repertorio: stato della scena (indizi rivelati, battute usate e
 * quante volte, menzogne dette, fatti noti ai PG, orologi) e, per ogni turno, l'elenco delle
 * battute disponibili. Applica gli effetti quando una battuta esce.
 *
 * Il selettore (Haiku) vede solo `id · chi · tipo · quando` delle battute disponibili: mai il
 * testo di quelle non ancora uscite. Un `[usa]` fuori elenco viene rifiutato (e registrato).
 */
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { StatoOrologi } from '../scena/orologi';
import { pngNominati, temaPresente } from './pertinenza';
import { segretiNelTesto, type ParolaSegreta } from './segreti';
import type { Battuta, Repertorio, RigaBattuta } from './tipi';

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

  constructor(
    readonly repertorio: Repertorio,
    campagna: Campagna,
    private readonly orologi: StatoOrologi,
  ) {
    for (const f of (campagna.campagnaNarratore['canone'] as DatiYaml[] | undefined) ?? []) {
      if (f?.['noto_ai_pg'] === true && typeof f['id'] === 'string') this.fattiNoti.add(f['id']);
    }
  }

  usata(id: string): boolean {
    return (this.usi.get(id) ?? 0) > 0;
  }

  /** Perché una battuta non è disponibile adesso (null = disponibile). `turno` attiva l'anti-ripetizione. */
  motivoIndisponibile(b: Battuta, turno?: number): string | null {
    const usi = this.usi.get(b.id) ?? 0;
    if (usi >= b.max_usi) return `già usata ${usi} volte (max_usi ${b.max_usi})`;
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
      const o = this.orologi.elenco.find((x) => x.id === r.orologio!.id);
      const pieni = o?.pieni ?? 0;
      if (!o) return `orologio ${r.orologio.id} non attivo`;
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
    testoAzioni: string;
    stallo: boolean;
    segnoDovuto: boolean;
    nomiPng: Map<string, string[]>;
    parole: ParolaSegreta[];
  }): { battute: Battuta[]; trattenute: string[]; perche: Record<string, string> } {
    const nominati = pngNominati(o.testoAzioni, o.nomiPng);
    const completi = new Map(this.orologi.elenco.map((x) => [x.id, x.pieni >= x.segmenti ? x.segmenti : null]));
    const perche: Record<string, string> = {};
    const candidate = this.disponibili(o.turno).filter((b) => {
      if (b.solo_esempio) return false;
      const oro = b.richiede.orologio;
      const segmentiCompleti = oro ? completi.get(oro.id) : null;
      const perStato = segmentiCompleti != null && oro!.min >= segmentiCompleti;
      const temi = temaPresente(o.testoAzioni, b.temi);
      let motivo: string | null = null;
      if (perStato) motivo = 'stato';
      else if (b.tipo === 'segno_orologio') motivo = o.segnoDovuto ? 'segno' : temi ? 'temi' : null;
      else if (b.riempitivo) motivo = o.stallo ? 'stallo' : null;
      else if (temi) motivo = 'temi';
      else if (b.chi !== 'narratore' && nominati.has(b.chi)) motivo = 'png';
      if (motivo) perche[b.id] = motivo;
      return motivo !== null;
    });
    const filtrate = this.filtraSegreti(candidate, o.testoAzioni, o.parole);
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
    return this.filtraSegreti(this.disponibili(), testoAzioni, parole);
  }

  private filtraSegreti(candidate: Battuta[], testoAzioni: string, parole: ParolaSegreta[]): { battute: Battuta[]; trattenute: string[] } {
    const azioni = testoAzioni.toLowerCase();
    const pubblico = { indiziRivelati: this.indiziRivelati, battuteUsate: (id: string) => this.usata(id) };
    const battute: Battuta[] = [];
    const trattenute: string[] = [];
    for (const b of candidate) {
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
