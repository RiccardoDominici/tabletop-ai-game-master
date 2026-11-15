/**
 * The world that moves during a session (docs/mondo.md): one object the director holds and calls at a few
 * fixed points (closed window, end of a narration, Game Master command, scene change, fight started).
 *
 * - Gates of `avanza_quando` (mondo/porte.ts) owe marks to clocks; marks owed to clocks the PCs cannot
 *   perceive are paid off-screen at once.
 * - Consequences (campagna/mondo.ts) apply BY STATE: the marks already applied are kept per clock, and
 *   `riconcilia` applies every mark between that and the clock's `pieni`. A Game Master −1 does not undo a
 *   consequence, and a resume does not apply it twice.
 * - What the table hears is chosen: with the clock active in the scene, `detto` (or the line) is said by the
 *   Engine and `regia` goes into the next message; otherwise the event is off-screen and its `tracce` wait
 *   for a scene where the clock is active or where an NPC of the consequence (or the danger's cast) is.
 * - Every consequence enters the world's log (`cronaca`), the session's narrazioni.jsonl and the snapshot.
 */
import { VIA, type Conseguenza, type MondoCampagna, type OrigineConseguenza } from '../campagna/mondo';
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { Logger } from '../logger';
import type { StatoOrologi } from '../scena/orologi';
import { AtteggiamentiInGioco, type CambioAtteggiamento } from './atteggiamenti';
import { PorteDelMondo, porteDegliOrologi, type Debito, type FattoDelGioco } from './porte';
import { ContatoreStallo } from './stallo';

/** One entry of the world's log. */
export interface VoceCronaca {
  turno: number;
  /** The consequence's id («o_x@3», «p_x#0», «t_x», «p_x@pieno»). */
  id: string;
  tipo: OrigineConseguenza;
  orologio: string;
  segno: number;
  cosa: string;
  /** The PCs could perceive it (the clock was active in their scene). */
  visto: boolean;
  scena: string;
  /** Turn when its traces reached the table (off-screen events only). */
  emerso_al_turno?: number;
}

/** Something the Engine says at the next chance: a sentence, or (mode B) a line of the repertoire. */
export interface DaSentire {
  id: string;
  testo: string | null;
  battuta: string | null;
}

/** An off-screen event waiting to surface. */
export interface InAttesa {
  id: string;
  tracce: string;
  orologio: string;
  /** NPCs that can bring the news: those of the consequence, and the danger's cast. */
  png: string[];
}

/** What the snapshot keeps of the world (sessione/tipi.ts, FotografiaSessione.mondo). */
export interface StatoMondoSalvato {
  /** How many times each gate has opened («o_id#index» → n). */
  porte: Array<[string, number]>;
  /** Highest mark whose consequences are applied, per clock (absent in older snapshots). */
  applicati?: Array<[string, number]>;
  cronaca?: VoceCronaca[];
  daSentire?: DaSentire[];
  regia?: string[];
  inAttesa?: InAttesa[];
  /** Clues offered by the world (first choice of the stall's S2). */
  offerti?: string[];
  /** NPCs moved by a consequence: scene id or «via». */
  posizioni?: Array<[string, string]>;
  atteggiamenti?: CambioAtteggiamento[];
  /** Consecutive stalls, and the clues already given by a stall's S2 (docs/mondo.md §5). */
  stallo?: { n: number; indizi: string[] };
}

export interface OpzioniMondo {
  campagna: Campagna;
  /** The director replaces its clocks on «Ricomincia»: always the current ones. */
  orologi: () => StatoOrologi;
  /** The current scene. */
  scena: () => string;
  log: Logger;
  /** Each new entry of the world's log (the director writes it in narrazioni.jsonl). */
  registra?: (v: VoceCronaca) => void;
  /** A hidden NPC appears (`compare`): the director reveals it like the Game Master's button. */
  rivela?: (png: string) => void;
}

/** What one call of `fatti` did: the debts of the gates, the marks paid off-screen, the consequences applied. */
export interface EsitoFatti {
  debiti: Debito[];
  fuoriScena: Array<{ id: string; pieni: number }>;
  nuove: VoceCronaca[];
}

function orologiDefiniti(c: Campagna): DatiYaml[] {
  const narratore = Array.isArray(c.campagnaNarratore['orologi']) ? (c.campagnaNarratore['orologi'] as DatiYaml[]) : [];
  return [...narratore, ...(c.mondo?.orologiExtra ?? [])];
}

export class MondoInGioco {
  readonly porte: PorteDelMondo;
  readonly atteggiamenti: AtteggiamentiInGioco;
  private readonly mondo: MondoCampagna;
  private readonly applicati = new Map<string, number>();
  readonly cronaca: VoceCronaca[] = [];
  private daSentire: DaSentire[] = [];
  private regia: string[] = [];
  private inAttesa: InAttesa[] = [];
  private readonly offerti: string[] = [];
  private readonly posizioni = new Map<string, string>();
  /** Consecutive stalls (docs/mondo.md §5). */
  readonly stallo = new ContatoreStallo();
  /** Clues already brought by a stall's S2: the next S2 brings another. */
  readonly indiziDatiDaStallo = new Set<string>();

  constructor(private readonly o: OpzioniMondo) {
    const definiti = orologiDefiniti(o.campagna);
    this.mondo = o.campagna.mondo ?? { conseguenze: [], pericoli: [], orologiExtra: [] };
    this.porte = new PorteDelMondo(porteDegliOrologi(definiti, (msg) => o.log.warn({ campagna: o.campagna.id }, `world: ${msg}`)));
    this.atteggiamenti = new AtteggiamentiInGioco(o.campagna);
    // The marks up to pieni_all_inizio happened before the session: their consequences are not applied again.
    for (const d of definiti) if (typeof d['id'] === 'string') this.applicati.set(d['id'], typeof d['pieni_all_inizio'] === 'number' ? (d['pieni_all_inizio'] as number) : 0);
    if (this.porte.porte.length || this.mondo.conseguenze.length) {
      o.log.info({ porte: this.porte.porte.map((p) => `${p.chiave} ${p.quando}`), conseguenze: this.mondo.conseguenze.map((c) => c.id) }, 'world: gates and consequences loaded');
    }
  }

  /** The dangers of the fronts (stall's S1). */
  get pericoli(): MondoCampagna['pericoli'] {
    return this.mondo.pericoli;
  }

  /**
   * Facts of the game at turn `turno`: the gates that open owe marks to their clocks; the owed marks of
   * clocks not active in this scene are paid off-screen at once; then the consequences are reconciled.
   */
  fatti(fatti: readonly FattoDelGioco[], turno: number): EsitoFatti {
    const orologi = this.o.orologi();
    const debiti = fatti.length ? this.porte.fatti(fatti) : [];
    for (const d of debiti) {
      const ora = orologi.aggiungiDebito(d.orologio, d.segni);
      this.o.log.info({ turno, porta: d.porta, quando: d.quando, orologio: d.orologio, segni: d.segni, debito: ora }, ora === null ? 'world: gate opened, clock not running (ignored)' : 'world: gate opened, marks owed');
    }
    const fuoriScena = orologi.pagaFuoriScena(turno);
    for (const f of fuoriScena) this.o.log.info({ turno, orologio: f.id, pieni: f.pieni }, 'world: owed mark paid off-screen');
    return { debiti, fuoriScena, nuove: this.riconcilia(turno) };
  }

  /**
   * Applies the consequences of every mark reached and not yet applied, clock by clock, in mark order. Call it
   * at the fixed points (after a narration, a Game Master command, a scene change). Returns the new log entries.
   */
  riconcilia(turno: number): VoceCronaca[] {
    const orologi = this.o.orologi();
    const nuove: VoceCronaca[] = [];
    for (const [id, fino] of this.applicati) {
      const o = orologi.trova(id);
      if (!o || o.pieni <= fino) continue;
      for (let n = fino + 1; n <= o.pieni; n++) {
        for (const c of this.mondo.conseguenze.filter((x) => x.orologio === id && x.alSegno === n)) nuove.push(this.applica(c, turno, orologi.attivo(id)));
      }
      this.applicati.set(id, o.pieni);
    }
    return nuove;
  }

  private applica(c: Conseguenza, turno: number, visto: boolean): VoceCronaca {
    const voce: VoceCronaca = { turno, id: c.id, tipo: c.origine, orologio: c.orologio, segno: c.alSegno, cosa: c.cosa, visto, scena: this.o.scena() };
    this.cronaca.push(voce);
    // State changes apply at once, seen or not: the world has changed.
    for (const p of c.png) {
      for (const a of p.atteggiamento) {
        for (const x of this.atteggiamenti.imposta(p.id, a.pg, a.stato, turno, 'conseguenza', c.id)) {
          this.o.log.info({ turno, png: x.png, pg: x.pg, da: x.da, a: x.a, conseguenza: c.id }, 'world: attitude changed by a consequence');
        }
      }
      if (p.scena) {
        this.posizioni.set(p.id, p.scena);
        this.o.log.info({ turno, png: p.id, scena: p.scena, conseguenza: c.id }, p.scena === VIA ? 'world: NPC leaves the story' : 'world: NPC moves');
      }
    }
    for (const id of c.compare) this.o.rivela?.(id);
    for (const i of c.indizi) if (!this.offerti.includes(i)) this.offerti.push(i);
    if (visto) {
      if (c.detto || c.battuta) this.daSentire.push({ id: c.id, testo: c.detto, battuta: c.battuta });
      if (c.regia) this.regia.push(c.regia);
    } else if (c.tracce) {
      this.inAttesa.push({ id: c.id, tracce: c.tracce, orologio: c.orologio, png: [...new Set([...c.png.map((p) => p.id), ...c.cast])] });
    }
    this.o.log.info({ turno, conseguenza: c.id, tipo: c.origine, orologio: c.orologio, segno: c.alSegno, visto, cosa: c.cosa }, visto ? 'world: consequence (seen)' : 'world: consequence (off-screen)');
    this.o.registra?.(voce);
    return voce;
  }

  /**
   * What the Engine must say at the next chance (consequences seen by the PCs), taken out of the queue.
   * `soloTesti`: only those with a sentence (a scene opening cannot say a repertoire line); the others wait.
   */
  prendiDaSentire(soloTesti = false): DaSentire[] {
    const out = soloTesti ? this.daSentire.filter((x) => x.testo) : this.daSentire;
    this.daSentire = soloTesti ? this.daSentire.filter((x) => !x.testo) : [];
    return out;
  }

  /** Directives for the narrator's next message (mode A). Emptied by the call. */
  prendiRegia(): string[] {
    const out = this.regia;
    this.regia = [];
    return out;
  }

  /**
   * Off-screen events that surface now (docs/mondo.md §3): the PCs are in a scene where the clock is active,
   * or with an NPC of the consequence or of the danger's cast. Their log entries get `emerso_al_turno`.
   */
  emergono(turno: number, presenti: ReadonlySet<string>): InAttesa[] {
    const orologi = this.o.orologi();
    const ora = this.inAttesa.filter((x) => orologi.attivo(x.orologio) || x.png.some((p) => presenti.has(p)));
    if (!ora.length) return [];
    this.inAttesa = this.inAttesa.filter((x) => !ora.includes(x));
    for (const x of ora) {
      const voce = this.cronaca.find((v) => v.id === x.id && v.emerso_al_turno === undefined && !v.visto);
      if (voce) voce.emerso_al_turno = turno;
      this.o.log.info({ turno, conseguenza: x.id, scena: this.o.scena() }, 'world: off-screen event surfaces');
    }
    return ora;
  }

  /** Clues offered by consequences, in order (the stall's S2 tries them first). */
  get indiziOfferti(): readonly string[] {
    return this.offerti;
  }

  /**
   * The NPCs present in a scene once the world's moves are applied: those of the scene card, minus the ones a
   * consequence moved elsewhere or out of the story, plus the ones it moved here.
   */
  presentiIn(scena: string, pngPresenti: readonly string[]): string[] {
    const out = pngPresenti.filter((id) => {
      const dove = this.posizioni.get(id);
      return dove === undefined || dove === scena;
    });
    for (const [id, dove] of this.posizioni) if (dove === scena && !out.includes(id)) out.push(id);
    return out;
  }

  /** NPCs moved by the world: id → scene or «via». */
  get spostati(): ReadonlyMap<string, string> {
    return this.posizioni;
  }

  esporta(): StatoMondoSalvato {
    return {
      porte: this.porte.esporta(),
      applicati: [...this.applicati],
      cronaca: this.cronaca.map((v) => ({ ...v })),
      daSentire: this.daSentire.map((x) => ({ ...x })),
      regia: [...this.regia],
      inAttesa: this.inAttesa.map((x) => ({ ...x, png: [...x.png] })),
      offerti: [...this.offerti],
      posizioni: [...this.posizioni],
      atteggiamenti: this.atteggiamenti.esporta(),
      stallo: { n: this.stallo.n, indizi: [...this.indiziDatiDaStallo] },
    };
  }

  /**
   * Resume. Call it after the clocks are imported: a snapshot without world state (older archives) counts every
   * mark up to the clock's `pieni` as applied, so nothing happens twice.
   */
  importa(s: StatoMondoSalvato | undefined): void {
    this.porte.importa(s?.porte);
    const orologi = this.o.orologi();
    if (s?.applicati) {
      for (const [id, n] of s.applicati) if (this.applicati.has(id) && typeof n === 'number') this.applicati.set(id, n);
    } else {
      for (const id of this.applicati.keys()) this.applicati.set(id, orologi.trova(id)?.pieni ?? 0);
    }
    this.cronaca.length = 0;
    this.cronaca.push(...(s?.cronaca ?? []).map((v) => ({ ...v })));
    this.daSentire = (s?.daSentire ?? []).map((x) => ({ ...x }));
    this.regia = [...(s?.regia ?? [])];
    this.inAttesa = (s?.inAttesa ?? []).map((x) => ({ ...x, png: [...x.png] }));
    this.offerti.length = 0;
    this.offerti.push(...(s?.offerti ?? []));
    this.posizioni.clear();
    for (const [id, dove] of s?.posizioni ?? []) this.posizioni.set(id, dove);
    this.atteggiamenti.importa(s?.atteggiamenti);
    this.stallo.n = typeof s?.stallo?.n === 'number' && s.stallo.n > 0 ? Math.floor(s.stallo.n) : 0;
    this.indiziDatiDaStallo.clear();
    for (const i of s?.stallo?.indizi ?? []) this.indiziDatiDaStallo.add(i);
  }
}
