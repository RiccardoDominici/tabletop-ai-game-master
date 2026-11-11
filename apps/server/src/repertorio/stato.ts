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
import type { Battuta, CondizioniStato, Repertorio, RigaBattuta, TipoBattuta } from './tipi';
import { accetta, blocchi, bloccoConCancello, type AzioneAlCancello, type Blocco } from './condizioni';
import type { StatoRepertorioSalvato } from '../sessione/tipi';

/**
 * Tipi che, scritti nel catalogo, svelerebbero un segreto al selettore: che quella battuta è una
 * bugia, una verità o una confessione (il revisore di ponte-lanterne l'ha trovato). Nel catalogo
 * diventano tutti «risposta»; gli altri tipi (indizio, segno_orologio, momento, finale, reazione…)
 * dicono solo a cosa serve la battuta e restano com'erano.
 */
const TIPI_NEUTRI: Partial<Record<TipoBattuta, string>> = { menzogna: 'risposta', verita: 'risposta', confessione: 'risposta' };

/** Tipi che la preselezione per temi non indica mai (li governano orologio, scena e Motore). */
const TIPI_NON_INDICATI: ReadonlySet<TipoBattuta> = new Set<TipoBattuta>(['segno_orologio', 'transizione', 'finale', 'chiusura']);

/** Il tipo come lo vede il selettore nel catalogo (mai «menzogna», «verita», «confessione»). */
export function tipoNelCatalogo(tipo: TipoBattuta): string {
  return TIPI_NEUTRI[tipo] ?? tipo;
}

/** Un'azione del turno come la vede il catalogo: chi, cosa, se è privata, le prove superate. */
export interface AzioneCatalogo {
  autore: string;
  testo: string;
  privata: boolean;
  /** Prove riuscite di questa azione nel turno (cancello `richiede.prova`, docs/prove.md). */
  prove?: readonly string[];
}

/**
 * La battuta può rispondere a quest'azione, in almeno uno dei suoi blocchi (base, o base più
 * un'alternativa di `oppure`), senza guardare lo stato? `privata` vuole un'azione privata (le altre
 * battute rispondono solo alle pubbliche); `da_pg` vuole un'azione di quei PG. Per lo stato vero
 * c'è StatoRepertorio.rispondeA, che guarda solo i blocchi aperti.
 */
export function rispondeA(b: Battuta, a: AzioneAlCancello): boolean {
  return blocchi(b).some((bl) => accetta(bl, a));
}

/** PNG che parlano in una battuta: `chi` e le etichette delle righe (testo e varianti), senza il narratore. */
export function parlantiDi(b: Battuta): string[] {
  const out = new Set<string>();
  if (b.chi !== 'narratore') out.add(b.chi);
  for (const r of [...b.testo, ...b.varianti.flat()]) if (r.etichetta !== 'narratore') out.add(r.etichetta);
  return [...out];
}

/** In ogni blocco la battuta ha un cancello sull'azione: esce solo con `> pg` verso un'azione adatta. */
export function haCancelloAzione(b: Battuta): boolean {
  return blocchi(b).every(bloccoConCancello);
}

export type EsitoUso =
  | {
      ok: true;
      battuta: Battuta;
      righe: RigaBattuta[];
      /** 0 = testo principale, n = variante n */
      versione: number;
      uso: number;
      /** Orologi partiti perché è uscita questa battuta o un indizio che rivela (parte_dopo). */
      orologiPartiti: string[];
    }
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
  /** PNG presenti nella scena in corso: solo loro (e il narratore) hanno battute in catalogo. null = tutti. */
  presenti: ReadonlySet<string> | null = null;
  /**
   * Chi può parlare adesso, se lo decide qualcun altro (la regia: presenze a mano, PNG a terra, morti o
   * fuggiti per il Motore delle prove). Vale al posto di `presenti`.
   */
  presenza: (() => ReadonlySet<string>) | null = null;
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
    this.impostaScena(campagna.scena);
  }

  /** La scena in corso cambia: battute legate alle scene e PNG presenti. */
  impostaScena(scena: { id: string; png_presenti: readonly string[] }): void {
    this.scena = scena.id;
    this.presenti = new Set(scena.png_presenti);
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
    if (b.scene.length && this.scena && !b.scene.includes(this.scena)) return `battuta della scena ${b.scene.join(', ')}`;
    const presenti = this.presenza?.() ?? this.presenti;
    if (presenti) {
      // Chi parla nella battuta (chi, e ogni [png] delle righe e delle varianti) dev'essere in scena e poter parlare.
      const assente = parlantiDi(b).find((p) => !presenti.has(p));
      if (assente) return `${assente} non è in questa scena`;
    }
    if (this.stradaGiàPercorsa(b)) return `indizio già trovato in un altro modo (${b.effetti.rivela_indizi.join(', ')})`;
    // I segni di un orologio che non è ancora partito (parte_dopo) restano fuori dal catalogo.
    const segno = b.effetti.avanza_orologio ? this.orologi.trova(b.effetti.avanza_orologio) : undefined;
    if (segno && !segno.partito) return `orologio ${segno.id} non ancora partito`;
    const ultimo = this.ultimoUso.get(b.id);
    if (turno !== undefined && ultimo !== undefined && turno - ultimo <= StatoRepertorio.PAUSA_RIPETIZIONE) {
      return `uscita al turno ${ultimo}: non torna prima del turno ${ultimo + StatoRepertorio.PAUSA_RIPETIZIONE + 1}`;
    }
    // Condizioni di stato: basta un blocco aperto (la base, o la base con un'alternativa di `oppure`).
    const tutti = blocchi(b);
    const motivi = tutti.map((bl) => this.motivoBlocco(bl));
    if (motivi.some((m) => m === null)) return null;
    return tutti.length > 1 ? `nessuna alternativa vale (${motivi.join('; ')})` : motivi[0]!;
  }

  /** Il primo motivo per cui un blocco non vale adesso (null = vale). */
  private motivoBlocco(bl: Blocco): string | null {
    for (const c of bl.stato) {
      const m = this.motivoCondizioni(c);
      if (m) return m;
    }
    return null;
  }

  /** I blocchi della battuta con le condizioni di stato vere adesso. */
  blocchiAperti(b: Battuta): Blocco[] {
    return blocchi(b).filter((bl) => this.motivoBlocco(bl) === null);
  }

  /** La battuta può rispondere a quest'azione ADESSO (un blocco aperto ne accetta i cancelli)? */
  rispondeA(b: Battuta, a: AzioneAlCancello): boolean {
    return this.blocchiAperti(b).some((bl) => accetta(bl, a));
  }

  /** Adesso la battuta esce solo con `> pg` (ogni blocco aperto ha un cancello sull'azione). */
  serveAzione(b: Battuta): boolean {
    const aperti = this.blocchiAperti(b);
    return aperti.length > 0 && aperti.every(bloccoConCancello);
  }

  private motivoCondizioni(r: CondizioniStato): string | null {
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
   * - il segno d'orologio solo quando è dovuto IL SUO orologio (`dovuti`; il tramonto di nozze-neve
   *   usciva a ogni turno perché bastava un orologio dovuto qualsiasi), o se le azioni ne toccano i temi
   *   (allora lo porta un PG, e il ritmo massimo non lo ferma);
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
    /** Orologi il cui segno è dovuto in questo turno (StatoOrologi.dovuti). */
    dovuti?: ReadonlySet<string>;
    /** Vecchia forma: true = entrano i segni di tutti gli orologi (se `dovuti` manca). */
    segnoDovuto?: boolean;
    nomiPng: Map<string, string[]>;
    parole: ParolaSegreta[];
  }): { battute: Battuta[]; trattenute: string[]; perche: Record<string, string> } {
    const azioni = o.azioni ?? (o.testoAzioni ? [{ autore: '', testo: o.testoAzioni, privata: false }] : []);
    // Testo delle azioni a cui ogni battuta può rispondere adesso (blocchi aperti), una volta per battuta.
    const testi = new Map<string, string | null>();
    const testoPer = (b: Battuta): string | null => {
      if (!testi.has(b.id)) {
        const adatte = azioni.filter((a) => this.rispondeA(b, a));
        testi.set(b.id, adatte.length ? adatte.map((a) => a.testo).join('\n') : null);
      }
      return testi.get(b.id)!;
    };
    const completi = new Map(this.orologi.elenco.map((x) => [x.id, x.pieni >= x.segmenti ? x.segmenti : null]));
    const perche: Record<string, string> = {};
    const candidate = this.disponibili(o.turno).filter((b) => {
      // Le chiusure della serata le dice solo il Motore, a «Chiudi la sessione» (scena/regia.ts).
      if (b.solo_esempio || b.tipo === 'chiusura') return false;
      const testo = testoPer(b);
      // Cancello sull'azione: senza un'azione adatta (privata, del PG giusto) la battuta non entra.
      if (this.serveAzione(b) && testo === null) return false;
      const t = testo ?? '';
      const oro = b.richiede.orologio;
      const segmentiCompleti = oro ? completi.get(oro.id) : null;
      const perStato = segmentiCompleti != null && oro!.min >= segmentiCompleti;
      const temi = temaPresente(t, b.temi);
      let motivo: string | null = null;
      if (perStato) motivo = 'stato';
      else if (b.tipo === 'segno_orologio') motivo = this.segnoDovuto(b, o) ? 'segno' : temi ? 'temi' : null;
      else if (b.riempitivo) motivo = o.stallo ? 'stallo' : null;
      else if (temi) motivo = 'temi';
      else if (b.chi !== 'narratore' && pngNominati(t, o.nomiPng).has(b.chi)) motivo = 'png';
      if (motivo) perche[b.id] = motivo;
      return motivo !== null;
    });
    const filtrate = this.filtraSegreti(candidate, (b) => testoPer(b) ?? '', o.parole);
    return { ...filtrate, perche };
  }

  /**
   * Preselezione deterministica (playtest di nozze-neve: 115 battute su 139 mai uscite, indizi chiesti
   * dai giocatori e non arrivati): per ogni azione pubblica, le battute del catalogo i cui `temi`
   * compaiono in QUELL'azione, che possono rispondere a quel PG e che parlano con la voce giusta (il
   * narratore, o un PNG che l'azione nomina: una domanda a Zelia non riceve la bugia di Gaspare).
   * Niente segni, transizioni, finali né riempitivi; una battuta va a una sola azione (la prima). Un'azione
   * con più di MAX_INDICATE candidate non ne riceve: lì sceglie il selettore dal catalogo.
   */
  indicatePerAzioni(battute: readonly Battuta[], azioni: readonly AzioneCatalogo[], nomiPng: Map<string, string[]>): Array<{ autore: string; ids: string[] }> {
    const prese = new Set<string>();
    const out: Array<{ autore: string; ids: string[] }> = [];
    for (const a of azioni) {
      if (a.privata) continue;
      const nominati = pngNominati(a.testo, nomiPng);
      const candidate = battute.filter(
        (b) =>
          !prese.has(b.id) &&
          !TIPI_NON_INDICATI.has(b.tipo) &&
          !b.riempitivo &&
          (b.chi === 'narratore' || nominati.has(b.chi)) &&
          temaPresente(a.testo, b.temi) &&
          this.rispondeA(b, a),
      );
      if (candidate.length === 0 || candidate.length > StatoRepertorio.MAX_INDICATE) continue;
      // Prima gli indizi (sono quelli che i giocatori cercano), poi l'ordine del catalogo.
      const ids = [...candidate].sort((x, y) => Number(y.tipo === 'indizio') - Number(x.tipo === 'indizio')).map((b) => b.id);
      for (const id of ids) prese.add(id);
      out.push({ autore: a.autore, ids });
    }
    return out;
  }

  /** Al massimo tante battute indicate per un'azione (oltre, la preselezione non distingue più). */
  static readonly MAX_INDICATE = 2;

  /** Il segno è dovuto: il suo orologio è fra i dovuti (o, vecchia forma, un segno qualsiasi è dovuto). */
  private segnoDovuto(b: Battuta, o: { dovuti?: ReadonlySet<string>; segnoDovuto?: boolean }): boolean {
    const id = b.effetti.avanza_orologio;
    if (o.dovuti) return id ? o.dovuti.has(id) : o.dovuti.size > 0;
    return !!o.segnoDovuto;
  }

  /**
   * Riga dell'elenco per il selettore: `id · chi · tipo · quando`, col tipo NEUTRO (tipoNelCatalogo):
   * «menzogna» direbbe al modello chi mente. Il tipo vero resta nella battuta, nei log e nel pannello.
   */
  static riga(b: Battuta): string {
    return `- ${b.id} · ${b.chi} · ${tipoNelCatalogo(b.tipo)} · ${b.quando}`;
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
   * uso, poi le varianti in ordine) e applica gli effetti. `segni`: gli orologi già avanzati in questa
   * risposta (un segno per orologio, al massimo due orologi; StatoOrologi.avanza), più `ritmo` se vale
   * il ritmo massimo dell'orologio (segno dovuto o senza «> pg»). La forma booleana di prima
   * (`true` = un segno è già uscito) resta per chi la usava.
   */
  usa(id: string, turno: number, segni: boolean | { inRisposta: Set<string>; ritmo?: boolean } = { inRisposta: new Set() }): EsitoUso {
    const b = this.repertorio.perId.get(id);
    if (!b) return { ok: false, motivo: `battuta inesistente: ${id}` };
    const motivo = this.motivoIndisponibile(b);
    if (motivo) return { ok: false, motivo };
    if (b.effetti.avanza_orologio) {
      if (segni === true) return { ok: false, motivo: 'un segno di orologio è già uscito in questa risposta' };
      const op = typeof segni === 'boolean' ? {} : { inRisposta: segni.inRisposta, ritmo: !!segni.ritmo };
      const a = this.orologi.avanza(b.effetti.avanza_orologio, turno, op);
      if (!a.ok) return { ok: false, motivo: a.motivo };
      if (typeof segni !== 'boolean') segni.inRisposta.add(b.effetti.avanza_orologio);
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
    const orologiPartiti = this.orologi.segnala([b.id, ...b.effetti.rivela_indizi], turno).map((o) => o.id);
    return { ok: true, battuta: b, righe, versione, uso, orologiPartiti };
  }

  /**
   * Il finale che il Motore fa dire quando un orologio della scena è completo (docs/repertorio.md,
   * «Il finale»): fra le battute `tipo: finale` disponibili adesso e senza cancello sull'azione
   * (nessuno le chiede: le dice il Motore), la PRIMA nell'ordine del repertorio. Restituisce anche
   * perché le altre non valgono, per il log.
   */
  finaleDelMotore(turno: number): { scelto: Battuta | null; candidati: string[]; scartati: Record<string, string> } {
    const scartati: Record<string, string> = {};
    const candidati: Battuta[] = [];
    for (const b of this.repertorio.battute) {
      if (b.tipo !== 'finale') continue;
      const motivo = this.motivoIndisponibile(b, turno) ?? (this.serveAzione(b) ? 'ha un cancello sull\'azione (privata o da_pg)' : null);
      if (motivo) scartati[b.id] = motivo;
      else candidati.push(b);
    }
    return { scelto: candidati[0] ?? null, candidati: candidati.map((b) => b.id), scartati };
  }

  /**
   * La chiusura dopo il finale: una battuta `momento` disponibile, senza cancello sull'azione, che
   * richiede uno di questi orologi COMPLETO (`richiede.orologio.min` ≥ segmenti). La prima nell'ordine.
   */
  chiusuraDelMotore(turno: number, orologiCompleti: ReadonlyArray<{ id: string; segmenti: number }>): Battuta | null {
    return (
      this.repertorio.battute.find((b) => {
        const o = b.richiede.orologio;
        const completo = o ? orologiCompleti.find((x) => x.id === o.id) : undefined;
        return b.tipo === 'momento' && !!completo && o!.min >= completo.segmenti && this.motivoIndisponibile(b, turno) === null && !this.serveAzione(b);
      }) ?? null
    );
  }

  /** Battute mai uscite (per il riepilogo dell'esperimento; le `solo_esempio` non contano). */
  maiUsate(): string[] {
    return this.repertorio.battute.filter((b) => !b.solo_esempio && !this.usata(b.id)).map((b) => b.id);
  }

  /** Stato della scena per il registro della sessione (usi, indizi, menzogne, fatti). */
  esporta(): StatoRepertorioSalvato {
    return {
      usi: [...this.usi],
      ultimoUso: [...this.ultimoUso],
      indizi: [...this.indiziRivelati],
      menzogne: [...this.menzogneDette],
      fattiNoti: [...this.fattiNoti],
      fattiScoperti: [...this.fattiScoperti],
    };
  }

  /** Ripresa di una sessione. Le battute che il repertorio non ha più si ignorano. */
  importa(s: StatoRepertorioSalvato): void {
    const esiste = (id: string): boolean => this.repertorio.perId.has(id);
    this.usi.clear();
    for (const [id, n] of s.usi ?? []) if (esiste(id)) this.usi.set(id, n);
    this.ultimoUso.clear();
    for (const [id, t] of s.ultimoUso ?? []) if (esiste(id)) this.ultimoUso.set(id, t);
    this.indiziRivelati.clear();
    for (const i of s.indizi ?? []) this.indiziRivelati.add(i);
    this.menzogneDette.clear();
    for (const m of s.menzogne ?? []) this.menzogneDette.add(m);
    for (const f of s.fattiNoti ?? []) this.fattiNoti.add(f);
    this.fattiScoperti.splice(0, this.fattiScoperti.length, ...(s.fattiScoperti ?? []));
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
