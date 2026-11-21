/**
 * Motore delle prove (docs/prove.md): la faccia del modulo verso la regia.
 *
 * - All'INVIO di un'azione (e quando una narrazione rende vecchie quelle in coda) chiede all'arbitro
 *   cosa si tira, in sottofondo: la decisione è in cache per (azione, revisione, versione della scena).
 * - Alla CHIUSURA della finestra prende le decisioni pronte, aspetta per poco quelle in volo, chiede
 *   in una chiamata sola quelle mancanti, poi tira (risolutore.ts) e restituisce carte e fatti.
 * - Tiene i punti ferita e i dadi (seme + contatore), salvati nella fotografia della sessione.
 *
 * Senza schede (campagna vecchia) o con `regole.dadi: false` è spento: nessuna chiamata, nessun
 * tiro; il narratore risolve come prima («sì, ma»). Con le schede ma senza arbitro (narratore a
 * copione, test) le azioni restano senza decisione e lo dice il log.
 */
import { nomiDeiPng } from '../repertorio/pertinenza';
import { pngInterpellati, senzaParlato, soloParlato } from './parole-testo';
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { Orologio } from '../turni/orologio';
import type { SchedaNumerica } from '../campagna/schede';
import { proveDellaScena, type ProvaScena } from '../campagna/prove-scena';
import { ABILITA, CARATTERISTICA_DI, CARATTERISTICHE, DIFFICOLTA, nomeAbilita, nomeCaratteristica, nomeDifficolta, type Abilita, type Caratteristica, type Difficolta as DifficoltaSrd } from '../campagna/regole-srd';
import { testo } from '../lingua';
import { nomeOppure } from './lingua';
import { DadiCrittografici, type FonteDadi } from './dadi';
import { DadiAlTavolo, type DadiDeiPg } from './dadi-tavolo';
import { frasiDi } from './difficolta';
import type { Gregario } from '../campagna/gregari';
import { normalizza } from '../azioni/regole';
import { cartaPerIlTavolo, richiestaDaCarta, richiestaDaGruppo, type TiroInserito } from './richieste';
import { mostraCdAlTavolo } from './modalita';
import { loggerMuto, type Logger } from '../logger';
import { risolviTurno, type Atteggiamento, type AzioneRisolvibile } from './risolutore';
import { StatoProve, type StatoProveSalvato } from './stato';
import type { ArbitroProve, AzioneDaClassificare, DecisioneProva, DecisioneRegole, EsitoTurnoProve, IngressoArbitroProve } from './tipi';
import type { RegoleCampagna, SchedaGenerica } from '../regole/tipi';
import { proveScenaRegole, risolviTurnoRegole } from './risolutore-regole';
import { regolePerNarratore } from '../regole/narratore';
import { etichettaProva, etichettaSalvezza, regolaEsiti } from './testi';
import { GestoreCombattimento } from './combattimento';
import { attaccoDiRegole, classificaARegole, potereDiRegole, provaSocialeSrd, type IngressoClassificatore } from './classificatore-regole';
import { vagliaImpossibile, vincoliPubblici } from './impossibile';
import { combattimentoSrd, type Combattimento, type Fase } from '../regole/combattimento';
import { strumentiRegole } from './risolutore-regole';
import { attaccoPngSrd } from './risolutore';
import { trattiDi, valoreCaratteristica } from '../regole/schede';
import { bonusTratti, type Tratto } from '../regole/tratti';
import { bersaglioSalvezza, colonnaDi } from '../regole/salvezze';
import { comeCaratteristica } from '../campagna/regole-srd';
import { modCaratteristica } from '../campagna/schede';
import type { ComandoMaster, CombattimentoMaster, CombattimentoPubblico, RichiestaTiroMaster, ScortaScheda } from '@tabletop-ai-gm/shared';
import { difesaDa } from '../regole/equipaggiamento';
import { leggiCosto, scriviCosto } from '../regole/catalogo';
import { applicaEffetti, type ContestoEffetti } from './effetti';
import { riposa } from './riposo';
import { Risorse } from './risorse';
import { Inventario } from './inventario';
import { TempoDiGioco } from './tempo';
import { accendi as accendiLuce, luceDellAzione, spegni as spegniLuce, type ContestoLuci } from './luci';
import { secondiDi } from '../regole/tempo';
import { voce } from '../regole/catalogo';
import { Attivi } from './attivi';
import { Esperienza, type VistaPxPg, type VoceEsperienza } from './esperienza';
import { Morenti } from './morte';
import type { EsitoMorte } from './fatti-dovuti';
import { danno as tiraDanno } from './regole';
import { sistemaSrd } from '../regole/srd';
import { leggiEffetto } from '../regole/effetti';
import type { SistemaRegole } from '../regole/tipi';

/** Decisione dell'arbitro: SRD 5.2, o col vocabolario del set del manuale. */
type Decisione = DecisioneProva | DecisioneRegole;

/**
 * A check the Game Master asked from the panel (docs/prove.md §8): a pseudo-action of that PC («m_<n>») with its
 * decision already taken. It joins the next closed window and goes through the same requests, dice and facts.
 */
export interface ProvaDelMaster {
  azione: AzionePerProve;
  decisione: Decisione;
}

/** The decisions of a closed window (`MotoreProve.decidi`), before any die is rolled. */
export interface DecisioniTurno {
  turno: number;
  azioni: AzionePerProve[];
  decisioni: Map<string, Decisione | null>;
  tardive: string[];
  /** ms spent waiting for the arbiter at closing. */
  attesa_ms: number;
}

/** Azione come la passa la regia (dal tavolo). */
export interface AzionePerProve extends AzioneRisolvibile {
  revisione: number;
}

export interface ContestoProve {
  /** La campagna vista dalla scena in corso. */
  campagna: Campagna;
  scenaPubblica: string;
  narrazione: string;
  /** Versione della scena (cresce a ogni narrazione): una decisione presa prima è vecchia. */
  versione: number;
  pgAlTavolo: string[];
  /** PNG che sono nella scena (presenze a mano, senza i fuggiti); assente = `png_presenti` della scena. */
  presenti?: ReadonlySet<string>;
  nome: (id: string) => string;
}

export interface OpzioniMotoreProve {
  schede: ReadonlyMap<string, SchedaNumerica>;
  arbitro: ArbitroProve<DecisioneProva> | ArbitroProve<DecisioneRegole> | null;
  /**
   * Set di regole non SRD (docs/regole.md): le prove le risolve prove/risolutore-regole.ts con le
   * schede del set. Assente, o col set SRD: tutto come prima.
   */
  regole?: { regole: RegoleCampagna; schede: ReadonlyMap<string, SchedaGenerica> } | null;
  log: Logger;
  orologio: Orologio;
  /** Dadi o no (campagna con schede e senza `regole.dadi: false`). */
  attivo: boolean;
  /** Modalità A: il narratore conosce gli indizi (i fatti possono citarli). */
  conIndizi: boolean;
  contesto: () => ContestoProve;
  /** Dadi iniettati (test): altrimenti crittografici con un seme nuovo. */
  dadi?: FonteDadi;
  /** Seme fissato (TAGM_SEME_DADI): riproduce una partita. */
  seme?: string;
  /** Quanto aspettare alla chiusura le decisioni in volo o tardive (default 4 s; di più con un modello locale). */
  attesaMaxMs?: number;
  /** Riserva a regole per le azioni senza decisione del modello (default sì). */
  riserva?: boolean;
  /** The NPC's attitude in play (the world: mondo/atteggiamenti.ts); absent = the card's. */
  atteggiamento?: (png: string, pg: string) => Atteggiamento | null;
  /**
   * The scenes' minions (campagna/gregari.ts): nameless foes with the stat line of their type, whose sheets are in
   * `schede` (or the set's) under their ids. They are enemies of their scene: targets, combatants, never NPC cards.
   */
  gregari?: readonly Gregario[];
  /**
   * Where the PCs and the game clock start this session (a package's `pg_all_inizio` and `tempo_all_inizio`,
   * sessione/stato-pg.ts): hit points, gear, coins, counters, prepared spells; the clock's absolute start. Applied on
   * top of the sheets at the start and at «Ricomincia»; a resumed session takes its snapshot instead.
   */
  allInizio?: Campagna['statoAllInizio'];
}

interface VoceCache {
  revisione: number;
  versione: number;
  promessa: Promise<Decisione | null>;
  pronta: boolean;
}

/** Se una campagna gioca coi dadi: schede presenti e nessun `regole.dadi: false` in campagna.yaml. */
export function dadiAttivi(c: Campagna, schede: ReadonlyMap<string, SchedaNumerica>): { attivo: boolean; motivo: string } {
  const regole = c.campagnaNarratore['regole'] as DatiYaml | undefined;
  if (regole && regole['dadi'] === false) return { attivo: false, motivo: 'campagna senza dadi (regole.dadi: false)' };
  const pgConScheda = c.pg.filter((p) => schede.has(p.id)).length;
  if (!pgConScheda) return { attivo: false, motivo: 'nessun PG ha una scheda numerica: niente dadi, il narratore risolve con «sì, ma»' };
  return { attivo: true, motivo: `${pgConScheda}/${c.pg.length} PG e ${[...schede.values()].filter((s) => s.di_png).length} PNG con la scheda` };
}

/** Come dadiAttivi, per un set non SRD: schede del set sui PG. */
export function dadiAttiviRegole(c: Campagna, schede: ReadonlyMap<string, SchedaGenerica>, nomeSet: string): { attivo: boolean; motivo: string } {
  const regole = c.campagnaNarratore['regole'] as DatiYaml | undefined;
  if (regole && regole['dadi'] === false) return { attivo: false, motivo: 'campagna senza dadi (regole.dadi: false)' };
  const pg = c.pg.filter((p) => schede.has(p.id)).length;
  if (!pg) return { attivo: false, motivo: `nessun PG ha una scheda del set «${nomeSet}»: niente dadi, il narratore risolve con «sì, ma»` };
  return { attivo: true, motivo: `set «${nomeSet}»: ${pg}/${c.pg.length} PG e ${[...schede.values()].filter((s) => s.di_png).length} PNG con la scheda` };
}

export class MotoreProve {
  readonly stato: StatoProve;
  private dadi: FonteDadi;
  /** Each PC's last target in the fight (an attack with no target named goes there). */
  private readonly ultimoBersaglio = new Map<string, string>();
  /** Lo scontro in corso, se c'è (prove/combattimento.ts). */
  readonly combattimento: GestoreCombattimento;
  /** Situazione dello scontro per il narratore, dall'ultimo turno risolto. */
  private intestazione: string | null = null;
  /** A fight the Game Master opened from the panel with manual rolls, waiting for the next closed window. */
  private scontroChiesto = false;
  private readonly cache = new Map<string, VoceCache>();
  /** Esiti dell'ultimo turno con tiri, per azione (le carte dell'azione privata vanno al suo telefono). */
  private ultimi = new Map<string, TiroMostrato[]>();
  private ultimoTurno: { turno: number; tiri: TiroMostrato[] } | null = null;
  /**
   * The PCs' dice of the pass being resolved (manual rolls, prove/dadi-tavolo.ts): the fight reads it for initiative and
   * death saves. Null outside a pass (a fight opened from the panel rolls with the Engine's dice).
   */
  private tavolo: DadiDeiPg | null = null;
  /** The scenes' minions by id (C5). */
  private readonly gregari: ReadonlyMap<string, Gregario>;
  /**
   * Facts of what the Game Master applied from the panel between two turns (a rest, a trap, a fall: docs/prove.md §10):
   * the narrator hears them in the next resolved turn, first. Kept in the snapshot.
   */
  private fattiInSospeso: string[] = [];
  /** The characters' resources of a manual's set (prove/risorse.ts): spell slots, prepared spells, items, ammunition. */
  private readonly risorse: Risorse | null;
  /** Timed effects of powers and hazards (prove/attivi.ts): conditions, bonuses, immunities that outlive a fight. */
  readonly attivi: Attivi;
  /** The PCs in a dying window of the death rule (prove/morte.ts, Basic Fantasy p. 188). */
  readonly morenti = new Morenti();
  /**
   * The death rule's outcomes outside the fight's own steps since the last resolved turn (a fall to 0 and its save, a
   * window that ran out): owed facts the table must hear (prove/fatti-dovuti.ts), handed with the next turn's result.
   */
  private morteFuori: Array<{ id: string; nome: string; esito: EsitoMorte }> = [];
  /**
   * The Engine's own copies of the set's sheets: their AC and attack lines follow the gear the character has now
   * (prove/inventario.ts), so every reader of a sheet sees the same numbers; the campaign's sheets stay as loaded, and
   * a dry run (`ombra`) gets copies of its own.
   */
  private readonly schedeVive: ReadonlyMap<string, SchedaGenerica> | null;
  /** What each character carries and wears, and its coins (prove/inventario.ts). Null without a catalog or coins. */
  readonly inventario: Inventario | null;
  /** The game clock (prove/tempo.ts): the set's `tempo`, or one round per window without it. */
  readonly tempo: TempoDiGioco;
  /** Lights that went out since the last resolved turn: owed facts the table must hear (prove/fatti-dovuti.ts). */
  private luciSpente: Array<{ id: string; nome: string }> = [];
  /** The XP the party earns (prove/esperienza.ts). Null with the SRD path (its XP are not data yet). */
  readonly esperienza: Esperienza | null;
  /** The turn being resolved, or the last one: what a panel command between two turns is dated with. */
  private turnoCorrente = 0;
  /** The enemies seen in the fight in progress: at its end those out of it count as defeated (prove/esperienza.ts). */
  private readonly nemiciDelloScontro = new Set<string>();

  constructor(private readonly o: OpzioniMotoreProve) {
    this.gregari = new Map((o.gregari ?? []).map((g) => [g.id, g]));
    this.schedeVive = o.regole && !o.regole.regole.sistema.srd ? new Map([...o.regole.schede].map(([id, sch]) => [id, structuredClone(sch)])) : null;
    this.stato = new StatoProve(this.generico ? this.generico.schede : o.schede);
    this.risorse = this.generico ? new Risorse(this.generico.regole.sistema, this.generico.schede) : null;
    const sist = this.generico?.regole.sistema;
    this.inventario = this.generico && this.risorse && (sist?.catalogo || sist?.monete) ? new Inventario({ sistema: sist, schede: this.generico.schede, risorse: this.risorse, nome: (id) => this.nomeDi(this.o.contesto(), id), log: o.log.child({ modulo: 'inventario' }), trovate: (chi, valore) => void this.esperienza?.tesoroTrovato(chi, valore, this.turnoCorrente) }) : null;
    this.esperienza = this.generico && sist
      ? new Esperienza({
          sistema: sist,
          schede: this.generico.schede,
          // The party's shares: the PCs at the table with a sheet, not dead (p. 49: «divided by the number of adventurers»).
          compagni: () => this.o.contesto().pgAlTavolo.filter((id) => this.generico!.schede.has(id) && this.stato.fuoriGioco(id) !== 'morto'),
          nome: (id) => this.nomeDi(this.o.contesto(), id),
          log: o.log.child({ modulo: 'esperienza' }),
        })
      : null;
    this.tempo = new TempoDiGioco(this.sistema.tempo ?? null, { nome: (id) => this.nomeDi(this.o.contesto(), id), nomeOggetto: (id) => voce(this.sistema.catalogo, id)?.nome ?? id, log: o.log.child({ modulo: 'tempo' }) }, o.allInizio?.tempo ?? null);
    this.attivi = new Attivi({
      nome: (id) => this.nomeDi(this.o.contesto(), id),
      nomeCondizione: (id) => this.regoleCombattimento().condizioni.find((c) => c.id === id)?.nome ?? id,
      immuneDiScheda: (id, cosa) => this.immuneDiScheda(id, cosa),
      // A duration in turns or hours: how many rounds of the set's clock it is (none without `tempo`: the scene).
      roundPerUnita: (u) => {
        const t = this.sistema.tempo;
        const sec = t?.unita.find((x) => x.id === u)?.secondi;
        return t && sec ? sec / this.tempo.secondiRound : null;
      },
    });
    this.dadi = o.dadi ?? this.nuoviDadi(o.seme);
    this.combattimento = new GestoreCombattimento({
      regole: this.regoleCombattimento(),
      stato: this.stato,
      dadi: () => this.dadi,
      nome: (id) => this.nomeDi(this.o.contesto(), id),
      attacca: (png, pg, fase, turno) => this.attaccaPng(png, pg, fase, turno),
      morale: (png) => {
        const g = this.gregari.get(png);
        if (g) return g.morale;
        const sch = this.o.contesto().campagna.png.find((p) => p.id === png)?.dati['scheda'] as DatiYaml | undefined;
        return typeof sch?.['morale'] === 'number' ? sch['morale'] : null;
      },
      nuovoIdTiro: () => this.stato.nuovoIdTiro(),
      // A PC's own rolls in the fight (initiative, death saves) go through the pass's table: asked at the table with
      // manual rolls, the Engine's otherwise.
      dadiDelPg: (pg, gruppo) => this.tavolo?.fonte({ pg, azione: null, privata: false, ...gruppo }) ?? null,
      // The timed effects' conditions count in the fight; they tick at each new round (prove/attivi.ts).
      condizioniEsterne: (id) => this.attivi.condizioni(id),
      sorpresaMod: (id) => this.trattiDi(id).reduce((n, t) => (t.tipo === 'sorpresa' ? n + t.modificatore : n), 0),
      // A new round of the fight is one round on the game clock: timed effects, the dying and the lights tick.
      nuovoRound: (fatti) => fatti.push(...this.passaTempo(this.tempo.secondiRound, 'round')),
      salvezzaMorte: (id, abilita) => this.salvezzaMorte(id, abilita),
      morente: (id, fatti) => this.iniziaMorente(id, fatti),
      senzaSoccorso: (fatti) => {
        const ids = this.morenti.tutti();
        if (!ids.length) return;
        fatti.push(testo('prove.morte.senza_soccorso'));
        for (const id of ids) {
          this.morenti.ferma(id);
          this.combattimento.segnaMorto(id);
          fatti.push(testo('prove.morte.morto', { nome: this.nomeDi(this.o.contesto(), id) }));
        }
        this.o.log.info({ morti: ids }, 'death: nobody standing to bind the dying, they die');
      },
      log: o.log.child({ modulo: 'combattimento' }),
    });
    this.applicaInizio();
  }

  /**
   * The session's starting state from the package (`allInizio`): each PC's hit points, gear, coins, counters and
   * prepared spells replace the sheet's (sessione/stato-pg.ts); then AC and attack lines follow the gear again.
   */
  private applicaInizio(): void {
    const a = this.o.allInizio;
    if (!a) return;
    for (const [id, s] of Object.entries(a.pg)) {
      if (s.pf !== undefined) {
        const p = this.stato.puntiFerita(id);
        if (p) {
          if (s.pf < p.attuali) this.stato.danneggia(id, p.attuali - s.pf);
          else if (s.pf > p.attuali) this.stato.cura(id, s.pf - p.attuali);
        }
      }
      if (s.px !== undefined) this.esperienza?.imposta(id, s.px);
      const ignoti = this.risorse?.inizia(id, s) ?? [];
      if (ignoti.length) this.o.log.warn({ id, ignoti }, 'session: pg_all_inizio names counters the set does not track, ignored');
    }
    this.inventario?.rideriva();
    this.o.log.info({ pg: Object.keys(a.pg), tempo: a.tempo }, 'session: the PCs and the clock start where the package says');
  }

  /** Il set non SRD in uso (null = SRD 5.2). */
  private get generico(): { regole: RegoleCampagna; schede: ReadonlyMap<string, SchedaGenerica> } | null {
    return this.o.regole && this.schedeVive ? { regole: this.o.regole.regole, schede: this.schedeVive } : null;
  }

  /** A name for the cards and the facts: a minion's own («goblin 2»), otherwise the director's. */
  private nomeDi(c: ContestoProve, id: string): string {
    return this.gregari.get(id)?.nome ?? c.nome(id);
  }

  /** The minions of the current scene, standing or not, with the words that name them (coerenza/registro.ts). */
  gregariDellaScena(): Array<{ id: string; nome: string; nomi: string[] }> {
    const c = this.o.contesto();
    return [...this.gregari.values()].filter((g) => g.scena === c.campagna.scena.id).map((g) => ({ id: g.id, nome: g.nome, nomi: [g.nome, ...g.parole] }));
  }

  /** Every card of turn `turno` (private ones too: the ledger keeps who may know them), or none. */
  carteDelTurno(turno: number): TiroMostrato[] {
    if (this.ultimoTurno?.turno === turno) return [...this.ultimoTurno.tiri];
    // An earlier turn: from the recent cards (final round, attempt 6, CA T10: a `subito` line written for T7, said at
    // T10, was checked against no cards at all, «no card of this turn says so», and its true miss was refused).
    return this.stato.recenti.filter((t) => t.turno === turno);
  }

  /** The minions of the current scene still standing (C5): the enemies there that have no NPC card. */
  private gregariInScena(c: ContestoProve): Gregario[] {
    return [...this.gregari.values()].filter((g) => g.scena === c.campagna.scena.id && !this.stato.fuoriGioco(g.id));
  }

  /** The first standing minion of the scene that the action names by its words, or null. */
  private gregarioNominato(c: ContestoProve, fatti: string): string | null {
    const t = normalizza(fatti);
    return this.gregariInScena(c).find((g) => g.parole.some((p) => new RegExp(`\\b${normalizza(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t)))?.id ?? null;
  }

  /** Armi di un personaggio per l'arbitro (id, e se a distanza nell'SRD). */
  private armi(id: string): string[] | null {
    const g = this.generico;
    if (g) return g.schede.get(id)?.attacchi.map((a) => a.id) ?? null;
    return this.o.schede.get(id)?.attacchi.map((a) => `${a.id}${a.distanza ? testo('prove.arbitro.a_distanza') : ''}`) ?? null;
  }

  /**
   * La regola della sezione «Esiti dei tiri» per narratore e selettore: con un set non SRD anche come
   * si tira e che cosa vuol dire ogni esito (regole/narratore.ts), così un 7–9 non diventa un successo.
   */
  regolaEsiti(): string {
    const g = this.generico;
    const blocco = g ? regolePerNarratore(g.regole) : null;
    return [regolaEsiti(), blocco, this.inCombattimento ? this.intestazione : null].filter(Boolean).join('\n');
  }

  get attivo(): boolean {
    return this.o.attivo;
  }

  get seme(): string {
    return this.dadi.seme;
  }

  private nuoviDadi(seme?: string, contatore = 0): FonteDadi {
    const log = this.o.log;
    return new DadiCrittografici(seme, contatore, (t) => log.debug({ dado: `d${t.facce}`, indice: t.indice, valore: t.valore }, 'dadi: tiro'));
  }

  // ------------------------------------------------------------------ arbitro

  private versoArbitro(a: AzioneRisolvibile, c: ContestoProve): AzioneDaClassificare {
    return { id: a.id, autore: a.autore, nome: c.nome(a.autore), testo: a.testo, privata: a.privata };
  }

  /**
   * Righe dei personaggi per l'arbitro: id, nome, armi, atteggiamenti, chi è a terra. La forma
   * «- id = nome · …» è fissa in ogni lingua (la legge anche prove/arbitro-minimo.ts, pngInScena).
   */
  righePersonaggi(c: ContestoProve): string {
    const aTerra = (id: string): string => {
      const f = this.stato.fuoriGioco(id);
      return f === 'morto' ? testo('prove.arbitro.morto') : f ? testo('prove.arbitro.a_terra') : '';
    };
    const righe: string[] = [testo('prove.arbitro.pg_al_tavolo')];
    for (const id of c.pgAlTavolo) {
      const a = this.armi(id);
      const armi = a?.join(', ');
      righe.push(`- ${id} = ${c.nome(id)}${a ? testo('prove.arbitro.armi', { armi: armi || testo('prove.arbitro.mani_nude') }) : testo('prove.arbitro.senza_scheda')}${aTerra(id)}`);
    }
    const presenti = c.presenti ?? new Set(c.campagna.scena.png_presenti);
    const inScena = c.campagna.png.filter((p) => presenti.has(p.id));
    righe.push(testo('prove.arbitro.png_in_scena'));
    for (const p of inScena) {
      const s = this.o.schede.get(p.id);
      const att = c.pgAlTavolo
        .map((pg) => [pg, this.atteggiamento(c.campagna, p.id, pg)] as const)
        .filter(([, a]) => a)
        .map(([pg, a]) => `${pg} ${nomeOppure('atteggiamenti', a!)}`)
        .join(', ');
      const armi = s?.attacchi.map((a) => a.id).join(', ');
      righe.push(`- ${p.id} = ${p.nome}${att ? testo('prove.arbitro.verso_i_pg', { atteggiamenti: att }) : ''}${s ? testo('prove.arbitro.armi', { armi: armi || testo('prove.arbitro.nessuna_arma') }) : ''}${aTerra(p.id)}`);
    }
    // The scene's minions (C5): enemies with their type's stat line, valid targets like the NPCs above.
    for (const g of this.gregariInScena(c)) {
      const armi = (this.generico ? this.generico.schede.get(g.id)?.attacchi : this.o.schede.get(g.id)?.attacchi)?.map((a) => a.id).join(', ');
      righe.push(`- ${g.id} = ${g.nome}${testo('prove.arbitro.gregario')}${testo('prove.arbitro.armi', { armi: armi || testo('prove.arbitro.nessuna_arma') })}`);
    }
    if (!inScena.length && !this.gregariInScena(c).length) righe.push(testo('prove.arbitro.nessuno'));
    const altrove = c.campagna.png.filter((p) => !presenti.has(p.id));
    if (altrove.length) righe.push(testo('prove.arbitro.altri_png', { png: altrove.map((p) => `${p.id} = ${p.nome}`).join('; ') }));
    return righe.join('\n');
  }

  private proveScena(c: Campagna): ProvaScena[] {
    return proveDellaScena(c, c.scena);
  }

  private ingresso(azioni: AzioneRisolvibile[], altre: AzioneRisolvibile[], c: ContestoProve): IngressoArbitroProve {
    const prove = this.proveScena(c.campagna);
    return {
      scena: c.scenaPubblica,
      narrazione: c.narrazione,
      personaggi: this.righePersonaggi(c),
      proveScena: this.generico
        ? proveScenaRegole(this.generico.regole.sistema, c.campagna).map((p) => `- ${p.id} · ${p.quando} · ${p.mossa ?? p.abilita ?? p.caratteristica ?? ''}`).join('\n')
        : prove.map((p) => `- ${p.id} · ${p.quando} · ${p.salvezza ? testo('prove.arbitro.salvezza_su', { caratteristica: nomeCaratteristica(p.caratteristica!) }) : p.abilita ? nomeAbilita(p.abilita) : nomeCaratteristica(p.caratteristica!)}`).join('\n'),
      azioni: azioni.map((a) => this.versoArbitro(a, c)),
      // Le azioni private degli altri non entrano: l'arbitro le vede solo come azioni da giudicare.
      altre: altre.filter((x) => !x.privata && !azioni.some((a) => a.id === x.id)).map((a) => this.versoArbitro(a, c)),
    };
  }

  /** Una chiamata per un gruppo di azioni; ogni azione riceve la sua promessa (null se fallisce). */
  private chiedi(azioni: AzionePerProve[], altre: AzioneRisolvibile[], c: ContestoProve, motivo: string): Map<string, Promise<Decisione | null>> {
    const out = new Map<string, Promise<Decisione | null>>();
    if (!this.o.arbitro || !azioni.length) return out;
    const t0 = this.o.orologio.ora();
    const tutte = (this.o.arbitro.classifica(this.ingresso(azioni, altre, c)) as Promise<Record<string, Decisione>>)
      .then((r) => {
        this.o.log.info({ motivo, ms: Math.round(this.o.orologio.ora() - t0), decisioni: Object.values(r).map((d) => ({ id: d.id, tipo: d.tipo, abilita: d.abilita, caratteristica: d.caratteristica, bersaglio: d.bersaglio, arma: d.arma, prova_scena: d.prova_scena, difficolta: d.difficolta, vantaggio: d.vantaggio, motivo: d.motivo, aiuta: d.aiuta, reazione: d.reazione })) }, 'prove: decisioni');
        return r;
      })
      .catch((err: unknown) => {
        this.o.log.error({ motivo, azioni: azioni.map((a) => a.id), err: (err as Error).message }, 'prove: arbitro fallito (nessun tiro per queste azioni)');
        return {} as Record<string, Decisione>;
      });
    for (const a of azioni) {
      const p = tutte.then((r) => r[a.id] ?? null);
      out.set(a.id, p);
      const voce: VoceCache = { revisione: a.revisione, versione: c.versione, promessa: p, pronta: false };
      this.cache.set(a.id, voce);
      void p.then(() => (voce.pronta = true));
    }
    return out;
  }

  /**
   * In sottofondo: decide i tiri delle azioni appena inviate o cambiate (o rese vecchie da una
   * narrazione). `altre` sono le azioni pubbliche in coda, per gli aiuti e il contesto.
   */
  preclassifica(azioni: AzionePerProve[], altre: AzioneRisolvibile[] = []): void {
    if (!this.attivo || !this.o.arbitro) return;
    const c = this.o.contesto();
    const daFare = azioni.filter((a) => {
      const v = this.cache.get(a.id);
      return !v || v.revisione !== a.revisione || v.versione !== c.versione;
    });
    if (daFare.length) this.chiedi(daFare, altre, c, 'invio');
  }

  /** Dimentica le decisioni (ricomincia, cambio scena). */
  dimentica(): void {
    this.cache.clear();
  }

  // ------------------------------------------------------------------ chiusura

  /**
   * Tiri del turno: decisioni pronte o in volo (aspettate al massimo `attesaMaxMs`), quelle mancanti
   * in una chiamata sola, poi i dadi. Mai un'eccezione: un arbitro fallito vuol dire «nessun tiro».
   * With manual rolls the director splits it: `decidi`, then `richiesteGiocatori` (what each player must roll), the
   * wait for the dice at the table, then `completa` with the values entered (docs/prove.md §8).
   */
  async risolvi(turno: number, azioni: AzionePerProve[], delMaster: readonly ProvaDelMaster[] = []): Promise<EsitoTurnoProve> {
    return this.completa(await this.decidi(turno, azioni, delMaster));
  }

  /**
   * What each action of the closed window rolls: the arbiter's decisions, then the deterministic rule passes. The checks
   * the Game Master asked from the panel (`delMaster`) join the turn after the actions, already decided: no arbiter.
   */
  async decidi(turno: number, azioni: AzionePerProve[], delMaster: readonly ProvaDelMaster[] = []): Promise<DecisioniTurno> {
    const t0 = this.o.orologio.ora();
    const c = this.o.contesto();
    const decisioni = new Map<string, Decisione | null>();
    const tardive: string[] = [];
    if (this.attivo && azioni.length) {
      const attese = new Map<string, Promise<Decisione | null>>();
      const mancanti: AzionePerProve[] = [];
      for (const a of azioni) {
        const v = this.cache.get(a.id);
        if (v && v.revisione === a.revisione && v.versione === c.versione) attese.set(a.id, v.promessa);
        else mancanti.push(a);
      }
      if (mancanti.length) {
        tardive.push(...mancanti.map((a) => a.id));
        for (const [id, p] of this.chiedi(mancanti, azioni, c, 'chiusura')) attese.set(id, p);
      }
      const limite = this.o.attesaMaxMs ?? 4000;
      let scaduto = false;
      let annulla: (() => void) | null = null;
      const timeout = new Promise<void>((r) => (annulla = this.o.orologio.dopo(limite, () => ((scaduto = true), r()))));
      await Promise.race([Promise.all([...attese.values()]), timeout]);
      (annulla as (() => void) | null)?.();
      for (const a of azioni) {
        const v = this.cache.get(a.id);
        // Una promessa ancora in volo allo scadere conta come «nessuna decisione».
        const pronta = v?.pronta ? await v.promessa : null;
        decisioni.set(a.id, pronta);
      }
      if (scaduto) this.o.log.warn({ turno, senza: azioni.filter((a) => !decisioni.get(a.id)).map((a) => a.id), limite_ms: limite }, 'prove: arbitro troppo lento alla chiusura');
      // Riserva a regole (senza modello): le azioni rimaste senza decisione (modello assente, lento o
      // fallito) si classificano col testo, così il dado si tira lo stesso (prove/classificatore-regole.ts).
      const senza = azioni.filter((a) => !decisioni.get(a.id));
      if (senza.length && this.o.riserva !== false) {
        const ing = this.ingressoClassificatore(c, azioni);
        for (const a of senza) decisioni.set(a.id, classificaARegole(a, ing));
        this.o.log.info({ turno, azioni: senza.map((a) => ({ id: a.id, tipo: decisioni.get(a.id)?.tipo, abilita: decisioni.get(a.id)?.abilita, difficolta: decisioni.get(a.id)?.difficolta ?? null })) }, 'prove: decisioni a regole (riserva senza modello)');
      }
    }
    // Un attacco chiaro (un'arma della scheda usata, o un gesto d'attacco, contro un PNG con la scheda) è un attacco,
    // qualunque cosa abbia detto l'arbitro: passo deterministico prima di tutti gli arbitri.
    if (this.attivo) {
      const ing = this.ingressoClassificatore(c, azioni);
      // A power of the PC named in what it does is a power, whatever the arbiter said (a spell rolled as a weapon would
      // be unlimited: audit row C-SP-01). Before the attack override below.
      if (ing.poteriDi) {
        for (const a of azioni) {
          const d = decisioni.get(a.id);
          const pot = potereDiRegole(a, ing);
          if (!pot || (d?.tipo === 'potere' && (d as DecisioneRegole).potere === pot.potere)) continue;
          decisioni.set(a.id, d?.tipo === 'potere' ? { ...pot, bersaglio: d.bersaglio ?? pot.bersaglio } : pot);
          this.o.log.warn({ turno, azione: a.id, arbitro: d?.tipo ?? null, potere: pot.potere, bersaglio: pot.bersaglio }, 'powers: a power named in the action, decided by the rules instead of the arbiter');
        }
      }
      for (const a of azioni) {
        const d = decisioni.get(a.id);
        if (d?.tipo === 'potere') continue;
        // An arbiter's attack on a target with a sheet stands; one on nobody known (an invented «sentinella») gets the
        // rules' target, a minion of the scene included (C5).
        if (d?.tipo === 'attacco' && d.bersaglio && ing.haScheda(d.bersaglio)) continue;
        const att = attaccoDiRegole(a, ing);
        if (!att) continue;
        decisioni.set(a.id, { ...att, ...(this.generico ? { mossa: null } : {}) } as Decisione);
        this.o.log.warn({ turno, azione: a.id, arbitro: d?.tipo ?? null, bersaglio: att.bersaglio, arma: att.arma }, 'prove: clear attack, decided by the rules instead of the arbiter');
      }
      // «Impossibile» needs a reason the scene records (A1 of docs/da-fare.md, prove/impossibile.ts): without one, the
      // rules' check is rolled if they find one (Haiku called lifting a cart impossible, with a reason saying the opposite).
      const vincoli = vincoliPubblici(c.campagna);
      for (const a of azioni) {
        const d = decisioni.get(a.id);
        if (d?.tipo !== 'impossibile') continue;
        const v = vagliaImpossibile(d, a, ing, vincoli);
        if (v.perche === 'regole') {
          decisioni.set(a.id, v.decisione);
          this.o.log.warn({ turno, azione: a.id, motivo: d.motivo, ora: { tipo: v.decisione.tipo, abilita: v.decisione.abilita, caratteristica: v.decisione.caratteristica, prova_scena: v.decisione.prova_scena, difficolta: v.decisione.difficolta } }, 'prove: «impossible» with no reason the scene records, the rules\' check instead');
        } else this.o.log.info({ turno, azione: a.id, perche: v.perche, vincolo: v.vincolo ?? null }, 'prove: «impossible» kept');
      }
      // Speech is not a perception check (second pass of the final run: «chiedo sottovoce a Berta…» rolled Ascoltare).
      // A check on an action that is speech only stays if it is social (or reading the person, SRD Insight); otherwise
      // the rules arbiter's social check if it finds one, or no roll.
      const nomiPng = nomiDeiPng(c.campagna);
      for (const a of azioni) {
        const d = decisioni.get(a.id);
        if (!d || !['prova', 'contrapposta', 'salvezza'].includes(d.tipo) || this.sociale(d, c) || d.abilita === 'intuizione') continue;
        if (!soloParlato(a.testo, nomiPng)) continue;
        const r = classificaARegole(a, ing);
        const nuova = r.tipo !== 'nessuna' && this.sociale(r as Decisione, c) ? (r as Decisione) : ({ ...r, tipo: 'nessuna' } as Decisione);
        decisioni.set(a.id, nuova);
        this.o.log.warn({ turno, azione: a.id, arbitro: { tipo: d.tipo, abilita: d.abilita, caratteristica: d.caratteristica }, ora: nuova.tipo }, 'prove: speech is not a check, social check or no roll');
      }
    }
    const attesa_ms = Math.round(this.o.orologio.ora() - t0);
    // Nello scontro a turni i PNG agiscono nel loro turno: niente reazioni in più dall'arbitro
    // (la e2e del 10 novembre: Ruggero colpiva due volte per round, di reazione e di turno).
    if (this.attivo && this.combattimento.aTurni) for (const [id, d] of decisioni) if (d?.reazione) decisioni.set(id, { ...d, reazione: null } as Decisione);
    if (!this.attivo || !delMaster.length) return { turno, azioni, decisioni, tardive, attesa_ms };
    for (const m of delMaster) decisioni.set(m.azione.id, m.decisione);
    this.o.log.info({ turno, prove: delMaster.map((m) => ({ id: m.azione.id, pg: m.azione.autore, decisione: m.decisione })) }, 'prove: checks asked by the Game Master join the turn');
    return { turno, azioni: [...azioni, ...delMaster.map((m) => m.azione)], decisioni, tardive, attesa_ms };
  }

  // ------------------------------------------------------------------ checks asked by the Game Master

  /**
   * What the Game Master can ask from the panel (docs/prove.md §8): every skill, ability and save of the set, and the
   * set's difficulties (null value: a 2d6 or roll-under difficulty, not a number).
   */
  catalogoDelMaster(): { prove: Array<{ id: string; nome: string }>; difficolta: Array<{ id: string; nome: string; valore: number | null }> } {
    const g = this.generico;
    if (g) {
      const s = g.regole.sistema;
      return {
        prove: [...s.abilita.map((a) => ({ id: `abilita:${a.id}`, nome: a.nome })), ...s.caratteristiche.map((c) => ({ id: `caratteristica:${c.id}`, nome: c.nome }))],
        difficolta: s.difficolta.map((d) => ({ id: d.id, nome: d.nome, valore: d.valore ?? null })),
      };
    }
    return {
      prove: [
        ...ABILITA.map((a) => ({ id: `abilita:${a}`, nome: etichettaProva(a, CARATTERISTICA_DI[a]) })),
        ...CARATTERISTICHE.map((c) => ({ id: `caratteristica:${c}`, nome: etichettaProva(null, c) })),
        ...CARATTERISTICHE.map((c) => ({ id: `salvezza:${c}`, nome: etichettaSalvezza(c) })),
      ],
      difficolta: (Object.keys(DIFFICOLTA) as DifficoltaSrd[]).map((d) => ({ id: d, nome: nomeDifficolta(d), valore: DIFFICOLTA[d] })),
    };
  }

  /**
   * The decision for a check the Game Master asks (`cosa` from `catalogoDelMaster`, difficulty id or null for the set's
   * default). Null = unknown check or difficulty.
   */
  decisioneDelMaster(id: string, cosa: string, difficolta: string | null): Decisione | null {
    const [tipo, chiaveCosa] = cosa.split(':');
    if (!chiaveCosa) return null;
    const base = { id, bersaglio: null, arma: null, prova_scena: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null };
    const g = this.generico;
    if (g) {
      const s = g.regole.sistema;
      if (difficolta !== null && !s.difficolta.some((d) => d.id === difficolta)) return null;
      if (tipo === 'abilita' && s.abilita.some((a) => a.id === chiaveCosa)) return { ...base, tipo: 'prova', abilita: chiaveCosa, caratteristica: null, mossa: null, difficolta } as Decisione;
      if (tipo === 'caratteristica' && s.caratteristiche.some((c) => c.id === chiaveCosa)) return { ...base, tipo: 'prova', abilita: null, caratteristica: chiaveCosa, mossa: null, difficolta } as Decisione;
      return null;
    }
    if (difficolta !== null && !(difficolta in DIFFICOLTA)) return null;
    const diff = difficolta as DifficoltaSrd | null;
    if (tipo === 'abilita' && (ABILITA as readonly string[]).includes(chiaveCosa)) {
      const a = chiaveCosa as Abilita;
      return { ...base, tipo: 'prova', abilita: a, caratteristica: CARATTERISTICA_DI[a], difficolta: diff };
    }
    if ((tipo === 'caratteristica' || tipo === 'salvezza') && (CARATTERISTICHE as readonly string[]).includes(chiaveCosa)) {
      return { ...base, tipo: tipo === 'salvezza' ? 'salvezza' : 'prova', abilita: null, caratteristica: chiaveCosa as Caratteristica, difficolta: diff };
    }
    return null;
  }

  /**
   * An NPC's own check outside a fight (a world question of the scene, mondo/domande.ts; docs/prove.md §9): `cosa` and
   * `difficolta` as the panel's «Chiedi una prova» names them, rolled by the set's resolver with the NPC's sheet and
   * the Engine's dice. No card joins the turn: the Game Master's roll path decides whether the table sees a die. Null
   * when it cannot be rolled: no dice, no sheet for that NPC, the NPC down or gone, an unknown check.
   */
  provaDelPng(png: string, cosa: string, difficolta: string | null, turno: number): { riuscita: boolean; dado: number; facce: number; almeno: number; p: number; etichetta: string } | null {
    if (!this.attivo) return null;
    const g = this.generico;
    if (!(g ? g.schede.has(png) : this.o.schede.has(png)) || this.stato.aTerra(png) || this.stato.fuoriGioco(png)) return null;
    const azione: AzionePerProve = { id: `w_${turno}_${png}`, autore: png, testo: '', privata: false, revisione: 0 };
    const decisione = this.decisioneDelMaster(azione.id, cosa, difficolta);
    if (!decisione) return null;
    const r = this.passaRisolutore(turno, this.o.contesto(), [azione], new Map([[azione.id, decisione]]), { log: loggerMuto() });
    const t = r.perAzione.get(azione.id)?.tiri.find((x) => x.chi === png && x.dadi.length > 0);
    if (!t) return null;
    const facce = t.facce ?? 20;
    const p = this.probabilita(t);
    const almeno = (t.risoluzione ?? 'd20_cd') === 'd20_cd' ? Math.max(1, Math.min(facce, t.contro.valore - t.modificatore)) : 0;
    this.o.log.info({ turno, png, cosa, difficolta, dadi: t.dadi, totale: t.totale, contro: t.contro.valore, riuscita: t.riuscita, p: Math.round(p * 100) / 100 }, 'prove: an NPC\'s own check (world question)');
    return { riuscita: t.riuscita, dado: t.dado, facce, almeno, p, etichetta: t.etichetta };
  }

  /**
   * The odds of success of a card's roll, before the dice (for the Game Master's «a_volte» rule): d20 against a DC,
   * a roll under a threshold, or 2d6 against the set's lowest band that is not a failure. Advantage and disadvantage
   * of two dice are counted.
   */
  private probabilita(t: TiroMostrato): number {
    const facce = t.facce ?? 20;
    const due = t.dadi.length > 1 && t.vantaggio ? t.vantaggio : null;
    const conDue = (p: number): number => (due === 'vantaggio' ? 1 - (1 - p) ** 2 : due === 'svantaggio' ? p * p : p);
    const tipo = t.risoluzione ?? 'd20_cd';
    if (tipo === 'sotto_soglia') return conDue(Math.max(0, Math.min(1, t.contro.valore / facce)));
    if (tipo === '2d6_fasce') {
      const fasce = this.generico?.regole.sistema.risoluzione.fasce ?? [];
      const minimo = Math.min(...fasce.filter((f) => f.esito !== 'fallimento' && f.min !== null).map((f) => f.min!));
      if (!Number.isFinite(minimo)) return 0.5;
      let si = 0;
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b + t.modificatore >= minimo) si += 1;
      return si / 36;
    }
    return conDue(Math.max(0, Math.min(1, (facce + 1 - (t.contro.valore - t.modificatore)) / facce)));
  }

  /** One pass of the set's resolver over the turn's decisions (the real one, or a dry run on a copy of the state). */
  private passaRisolutore(
    turno: number,
    c: ContestoProve,
    azioni: AzionePerProve[],
    decisioni: ReadonlyMap<string, Decisione | null>,
    extra: { stato?: StatoProve; dadi?: FonteDadi; log?: Logger; dadiDeiPg?: DadiDeiPg | null } = {},
  ): Omit<EsitoTurnoProve, 'attesa_ms' | 'tardive' | 'combattimento' | 'negati'> {
    const g = this.generico;
    return g
      ? risolviTurnoRegole({ ...this.opzioniRegole(turno, c, g), ...extra, azioni, decisioni: decisioni as Map<string, DecisioneRegole | null> })
      : risolviTurno({ ...this.opzioniSrd(turno, c), ...extra, azioni, decisioni: decisioni as Map<string, DecisioneProva | null> });
  }

  /**
   * A throwaway copy of this Engine: same options and state, the Engine's dice copied from here (seed and counter, or a
   * scripted sequence), the log silent. A dry run on it never moves the real state or the real dice.
   */
  private ombra(): MotoreProve {
    const copia = this.dadi.clona?.();
    if (!copia) this.o.log.debug({ seme: this.dadi.seme }, 'manual rolls: these dice cannot be copied, the dry run rolls 1s for the Engine');
    const m = new MotoreProve({ ...this.o, log: loggerMuto(), dadi: copia ?? { seme: 'anteprima', contatore: 0, tira: () => 1 } });
    m.importa(this.esporta());
    return m;
  }

  /**
   * Manual rolls (docs/prove.md §8): the rolls the players must make now with real dice, from a dry run of the whole
   * turn (actions, then the fight) on a copy of the Engine with the values entered so far (`inseriti`, by request id).
   * Only the rolls that can be asked now come back: an action's test and the other PC's die in a contest at once; the
   * damage once the attack roll that hit is in; initiative and death saves once everything before them is in. The
   * director asks them, waits, and calls again until nothing is left. Automatic attacks ask only their damage; actions
   * with no roll ask nothing.
   */
  richiesteGiocatori(d: DecisioniTurno, inseriti: ReadonlyMap<string, TiroInserito> = new Map()): RichiestaTiroMaster[] {
    if (!this.attivo || (!d.azioni.length && !this.inCombattimento && !this.scontroChiesto)) return [];
    const ombra = this.ombra();
    const tavolo = new DadiAlTavolo({ base: ombra.dadi, turno: d.turno, inseriti, anteprima: true, log: loggerMuto() });
    const { r } = ombra.esegui(d, tavolo);
    const nome = (id: string): string => this.o.contesto().nome(id);
    const out: RichiestaTiroMaster[] = [];
    for (const g of tavolo.gruppi) {
      if (!g.mancante || !g.chiedibile) continue;
      const dalMaster = g.gruppo.azione?.startsWith('m_') ? { dal_master: true } : {};
      if (g.gruppo.per !== 'prova') {
        out.push({ ...richiestaDaGruppo(g, d.turno, nome(g.gruppo.pg)), ...dalMaster });
        continue;
      }
      const a = d.azioni.find((x) => x.id === g.gruppo.azione);
      const t = a ? r.perAzione.get(a.id)?.tiri.find((x) => x.chi === a.autore && !x.di_png && !x.automatico && x.dadi.length > 0) : undefined;
      if (a && t) out.push({ ...richiestaDaCarta(t, a.id, d.turno), id: g.chiave, ...dalMaster });
    }
    return out;
  }

  /**
   * Rolls the turn: the decisions of `decidi`, with the dice the players entered (`inseriti`, by request id; manual
   * rolls) for their own rolls and the Engine's dice for everything else (NPCs, side rolls, morale). Then combat,
   * cards and facts.
   */
  completa(d: DecisioniTurno, inseriti: ReadonlyMap<string, TiroInserito> = new Map(), manuali = false): EsitoTurnoProve {
    const { turno, azioni, decisioni, tardive, attesa_ms } = d;
    const c = this.o.contesto();
    if (!this.attivo) return { turno, perAzione: new Map(), tiri: [], fatti: [], fattiPrivati: [], negati: [], attesa_ms, tardive, combattimento: null };
    const tavolo = new DadiAlTavolo({ base: this.dadi, turno, inseriti, anteprima: false, log: this.o.log });
    const { r, comb } = this.esegui(d, tavolo);
    this.segnaTiriAlTavolo(d, tavolo, r, comb, manuali);
    this.o.log.info({ turno, attesa_ms, tardive, tiri: r.tiri.length, seme: this.dadi.seme, contatore: this.dadi.contatore }, 'prove: turno risolto');
    // A failed social check toward an NPC: that NPC refuses for the rest of the turn (second pass of the final run, D2).
    const nomiPng = nomiDeiPng(c.campagna);
    const negati = azioni.flatMap((a) => {
      const d = decisioni.get(a.id);
      if (!d || r.perAzione.get(a.id)?.riuscita !== false || !['prova', 'contrapposta'].includes(d.tipo) || !this.sociale(d, c)) return [];
      const png = d.bersaglio?.startsWith('png_') ? [d.bersaglio] : [...pngInterpellati(a.testo, nomiPng)];
      return png.map((id) => ({ png: id, autore: a.autore, privata: a.privata }));
    });
    if (negati.length) this.o.log.info({ turno, negati }, 'prove: failed social checks, those NPCs refuse this turn');
    // Every social check aimed at an NPC, with its outcome: the world moves the NPC's attitude (docs/mondo.md §4).
    const sociali = azioni.flatMap((a) => {
      const d = decisioni.get(a.id);
      const esito = r.perAzione.get(a.id)?.riuscita;
      if (!d || typeof esito !== 'boolean' || !['prova', 'contrapposta'].includes(d.tipo) || !this.sociale(d, c)) return [];
      const png = d.bersaglio?.startsWith('png_') ? [d.bersaglio] : [...pngInterpellati(a.testo, nomiPng)];
      return png.map((id) => ({ png: id, autore: a.autore, riuscita: esito, privata: a.privata }));
    });
    return { ...r, attesa_ms, tardive, combattimento: comb, negati, sociali };
  }

  /**
   * One pass of the turn with the given PCs' dice: the actions through the set's resolver, then the fight (the NPCs'
   * steps, initiative, death saves), the cards kept. The real `completa` and the dry run of `richiesteGiocatori` (on a
   * copy) both come here, so the requests are read off the same code that rolls.
   */
  private esegui(d: DecisioniTurno, tavolo: DadiDeiPg): { r: Omit<EsitoTurnoProve, 'attesa_ms' | 'tardive' | 'combattimento' | 'negati'>; comb: ReturnType<GestoreCombattimento['dopoAzioni']> } {
    const { turno, azioni, decisioni } = d;
    const c = this.o.contesto();
    this.tavolo = tavolo;
    this.turnoCorrente = turno;
    try {
      // Outside a fight a closed window costs game time (prove/tempo.ts): the set's `per_finestra`, longer actions by
      // their words, one round while someone is dying. It passes before the actions, so binding a dying friend in this
      // window still comes in time; the timed effects, the dying and the lights tick on it.
      const finiti = this.combattimento.attivo ? [] : this.passaTempo(this.costoFinestra(azioni, c), 'finestra');
      // A light lit or put out by the action's words («accendo la torcia»): before the resolver, so it burns from now.
      const luci = this.luciDalleAzioni(azioni);
      const r = this.passaRisolutore(turno, c, azioni, decisioni, { dadiDeiPg: tavolo });
      if (luci.length) r.fatti.unshift(...luci);
      if (finiti.length) r.fatti.unshift(...finiti);
      // What the Game Master applied from the panel since the last turn (a rest, a hazard) comes first for the narrator.
      if (this.fattiInSospeso.length) {
        r.fatti.unshift(...this.fattiInSospeso);
        this.fattiInSospeso = [];
      }
      // Combattimento: si entra con un attacco; poi i turni dei PNG e i tiri contro la morte fino al prossimo PG.
      // A hostile power on an NPC counts as an attack: it opens the fight and the NPC goes for its author.
      const attacchi = [...r.tiri.filter((t) => t.tipo === 'attacco' && t.bersaglio).map((t) => ({ chi: t.chi, bersaglio: t.bersaglio!.id })), ...(r.ostili ?? [])];
      // Each PC's last target: an attack with no target named goes there (bersaglioImplicito).
      for (const a of attacchi) if (c.campagna.pg.some((p) => p.id === a.chi)) this.ultimoBersaglio.set(a.chi, a.bersaglio);
      // A check the Game Master asked (pseudo-action «m_…») is not the PC's action in the fight: it does not move whose turn it is.
      const comb = this.combattimento.dopoAzioni({ turno, attacchi, autori: azioni.filter((a) => !a.id.startsWith('m_')).map((a) => a.autore), candidati: () => this.candidati(c, attacchi), apri: this.scontroChiesto });
      // The panel's fight started in this pass (the real one, or the dry run on its copy): the request is used up.
      if (this.combattimento.attivo) this.scontroChiesto = false;
      // The defeated enemies are worth XP (prove/esperienza.ts), counted once; then the fight's end.
      this.contaSconfitti(!!comb.finito, !!comb.sconfitta, turno);
      // The fight ended: the once-per-target uses and the per-fight resources come back.
      if (comb.finito) this.risorse?.ricarica('scontro');
      r.fatti.push(...comb.fatti);
      r.tiri.push(...comb.tiri);
      // The death rule's outcomes outside the fight's steps (a fall to 0, a window that ran out): owed facts too.
      if (this.morteFuori.length) {
        r.morte = this.morteFuori;
        this.morteFuori = [];
      }
      // A light that went out (a torch burned down): owed, so the table hears it is dark.
      if (this.luciSpente.length) {
        r.luci = this.luciSpente;
        this.luciSpente = [];
      }
      this.intestazione = comb.intestazione;
      this.stato.registraTiri(r.tiri);
      this.ultimi = new Map([...r.perAzione].map(([id, e]) => [id, e.tiri]));
      this.ultimoTurno = { turno, tiri: r.tiri };
      for (const a of azioni) this.cache.delete(a.id);
      return { r, comb };
    } finally {
      this.tavolo = null;
    }
  }

  /**
   * Manual rolls: mark the cards rolled at the table (who entered the dice), check that the dice on a test's card are
   * the ones entered, and say which of a player's rolls the Engine made because nobody asked for them.
   */
  private segnaTiriAlTavolo(d: DecisioniTurno, tavolo: DadiAlTavolo, r: { perAzione: EsitoTurnoProve['perAzione'] }, comb: { tiri: TiroMostrato[] }, manuali: boolean): void {
    const { turno, azioni } = d;
    // The PCs' cards of the fight's steps are their death saves, in order.
    const morte = new Map<string, TiroMostrato[]>();
    for (const t of comb.tiri) if (!t.di_png && !t.del_master) morte.set(t.chi, [...(morte.get(t.chi) ?? []), t]);
    for (const g of tavolo.gruppi) {
      const { pg, per, azione } = g.gruppo;
      const a = azione ? azioni.find((y) => y.id === azione) : undefined;
      // The card a group belongs to: the action's own (test, damage, contest), or the PC's next death save.
      const carta = per === 'morte' ? morte.get(pg)?.shift() : per === 'iniziativa' ? undefined : a ? r.perAzione.get(a.id)?.tiri.find((y) => y.chi === a.autore && !y.di_png) : undefined;
      if (g.inserito) {
        if (carta && (per === 'prova' || per === 'morte' || !carta.manuale)) carta.manuale = g.inserito.da;
        const v = g.inserito.valori;
        if (per === 'prova' && carta && v && g.inserito.richiesta.facce !== 100 && carta.dadi.join(',') !== v.join(',')) {
          this.o.log.warn({ turno, azione, inseriti: v, carta: carta.dadi }, 'manual rolls: the card dice differ from the values the player entered');
        }
        continue;
      }
      if (!manuali) continue;
      // Manual rolls: a player's roll nobody asked for (the dry run had no card for it: its target fell there; a fight
      // opened from the panel) is the Engine's dice, said so; a test's number to beat stays hidden like the others.
      if (per === 'prova' && carta && carta.dadi.length > 0 && !carta.automatico) carta.manuale = 'motore';
      this.o.log.warn({ turno, richiesta: g.chiave, autore: pg, per }, 'manual rolls: a player roll was not asked, the Engine rolled it');
    }
    for (const id of tavolo.nonUsati()) this.o.log.info({ turno, richiesta: id }, 'manual rolls: an entered roll was not needed (the turn went another way)');
  }

  // ------------------------------------------------------------------ combattimento (docs/combattimento.md)

  private opzioniSrd(turno: number, c: ContestoProve): Omit<Parameters<typeof risolviTurno>[0], 'azioni' | 'decisioni'> {
    return {
      turno,
      schede: this.o.schede,
      stato: this.stato,
      dadi: this.dadi,
      proveScena: this.proveScena(c.campagna),
      nome: (id) => this.nomeDi(c, id),
      esiste: (id) => c.campagna.pg.some((p) => p.id === id) || c.campagna.png.some((p) => p.id === id) || this.gregari.has(id),
      atteggiamento: (png, pg) => this.atteggiamento(c.campagna, png, pg),
      conIndizi: this.o.conIndizi,
      condizioni: (id) => this.combattimento.condizioniDi(id),
      turni: { regole: this.regoleCombattimento().iniziativa.tipo !== 'nessuna', inCorso: this.combattimento.aTurni },
      effetti: this.contestoEffetti(turno, c),
      log: this.o.log.child({ turno }),
    };
  }

  private opzioniRegole(turno: number, c: ContestoProve, g: { regole: RegoleCampagna; schede: ReadonlyMap<string, SchedaGenerica> }): Omit<Parameters<typeof risolviTurnoRegole>[0], 'azioni' | 'decisioni'> {
    return {
      turno,
      sistema: g.regole.sistema,
      schede: g.schede,
      stato: this.stato,
      dadi: this.dadi,
      proveScena: proveScenaRegole(g.regole.sistema, c.campagna),
      nome: (id) => this.nomeDi(c, id),
      esiste: (id) => c.campagna.pg.some((p) => p.id === id) || c.campagna.png.some((p) => p.id === id) || this.gregari.has(id),
      condizioni: (id) => this.combattimento.condizioniDi(id),
      turni: { regole: this.regoleCombattimento().iniziativa.tipo !== 'nessuna', inCorso: this.combattimento.aTurni },
      effetti: this.contestoEffetti(turno, c),
      ...(this.risorse ? { poteri: { risorse: this.risorse, nemici: (autore: string) => this.nemiciDi(c, autore), alleati: () => c.pgAlTavolo.filter((id) => g.schede.has(id)), immuneAttivo: (id: string, cosa: string) => this.attivi.immune(id, cosa) || this.immuneDiScheda(id, cosa) } } : {}),
      extraSalvezza: (id: string, abilita: string) => this.attivi.bonus(id, 'salvezze') + bonusTratti(this.trattiDi(id), { tipo: 'salvezza', colonna: colonnaDi(g.regole.sistema, abilita) }),
      extraAbilita: (id: string, abilita: string) => bonusTratti(this.trattiDi(id), { tipo: 'abilita', abilita }),
      bonusAttivi: (id: string, a: 'difesa' | 'attacchi' | 'danni', contro: 'mischia' | 'distanza') => this.attivi.bonus(id, a, contro),
      ...(this.inventario ? { indossate: (id: string) => this.inventario!.penalita(id) } : {}),
      round: this.combattimento.round,
      log: this.o.log.child({ turno }),
    };
  }

  /**
   * The enemies a PC's power can reach now (prove/poteri.ts): in a fight, the NPCs standing in it; outside one, the NPCs
   * with a sheet in the scene who are hostile to that PC, and the scene's minions.
   */
  private nemiciDi(c: ContestoProve, autore: string): string[] {
    const ha = (id: string): boolean => (this.generico ? this.generico.schede.has(id) : this.o.schede.has(id));
    if (this.combattimento.attivo) return this.combattimento.inPiedi('png');
    const presenti = c.presenti ?? new Set(c.campagna.scena.png_presenti);
    const ostili = [...presenti].filter((id) => ha(id) && !this.stato.fuoriGioco(id) && this.atteggiamento(c.campagna, id, autore) === 'ostile');
    return [...ostili, ...this.gregariInScena(c).map((x) => x.id).filter((id) => ha(id) && !this.stato.fuoriGioco(id))];
  }

  // ------------------------------------------------------------------ death and dying (prove/morte.ts)

  /** A PC's own save for the death rule: the set's save ability with its table number, traits and active bonuses. */
  private salvezzaMorte(id: string, abilita: string): { contro: number; modificatore: number; naturali: boolean } | null {
    const g = this.generico;
    const sch = g?.schede.get(id);
    if (!g || !sch) return null;
    const s = g.regole.sistema;
    const b = bersaglioSalvezza(s, sch, abilita, this.attivi.bonus(id, 'salvezze') + bonusTratti(this.trattiDi(id), { tipo: 'salvezza', colonna: colonnaDi(s, abilita) }));
    return b ? { contro: b.contro, modificatore: b.modificatore, naturali: s.risoluzione.critici !== 'attacchi' } : null;
  }

  /** The death save made, with a dying window: it starts now (rounds rolled with the Engine's dice), and its fact. */
  private iniziaMorente(id: string, fatti: string[]): void {
    const tm = this.regoleCombattimento().danni.tiriMorte;
    const f = tm?.finestra;
    if (!f) return;
    const n = Math.max(1, tiraDanno(this.dadi, f, 0, false).totale);
    this.morenti.inizia(id, n);
    fatti.push(testo('prove.morte.inizia', { nome: this.nomeDi(this.o.contesto(), id), n }));
    if (tm.perdeIncantesimi && this.risorse?.dimenticaIncantesimi(id)) fatti.push(testo('prove.morte.incantesimi_persi', { nome: this.nomeDi(this.o.contesto(), id) }));
    this.o.log.info({ id, round: n }, 'death: save made, dying for a few rounds unless bound or healed');
  }

  /** A round of the dying windows: who dies (in the fight too), who is still dying. Facts for the narrator. */
  /**
   * Game time passes (prove/tempo.ts): the clock moves, the timed effects and the dying tick by the whole rounds that
   * went by, and the lights whose time is up go out. Returns the facts for the narrator.
   */
  private passaTempo(secondi: number, causa: string): string[] {
    const { round, spente } = this.tempo.avanza(secondi, causa);
    const c = this.o.contesto();
    const fatti: string[] = [];
    const f = Attivi.fatto(this.attivi.passaRound(round), (id) => this.nomeDi(c, id));
    if (f) fatti.push(f);
    fatti.push(...this.passaRoundMorenti(round));
    if (spente.length) {
      fatti.push(...this.tempo.fattiSpente(spente));
      this.luciSpente.push(...spente.map((l) => ({ id: l.chi, nome: this.nomeDi(c, l.chi) })));
    }
    return fatti;
  }

  /**
   * The enemies of the fight that are defeated now (prove/esperienza.ts): dead, fled, at zero, and — when the fight ends
   * with the PCs standing — those out of it by a condition (asleep, charmed, paralysed, turned: Basic Fantasy counts
   * them as down, p. 57). Each is worth its XP once.
   */
  private contaSconfitti(finito: boolean, sconfitta: boolean, turno: number): void {
    const e = this.esperienza;
    if (!e?.attiva) return;
    for (const id of this.combattimento.partecipanti('png')) this.nemiciDelloScontro.add(id);
    // The fight's own conditions and the timed effects' (prove/attivi.ts), which outlast its end.
    const fuori = (id: string): boolean => this.combattimento.condizioniDi(id).some((x) => x.effetti.includes('fuori_combattimento'));
    for (const id of this.nemiciDelloScontro) {
      const f = this.stato.fuoriGioco(id);
      if (f === 'morto' || f === 'fuggito' || f === 'a_terra' || (finito && !sconfitta && fuori(id))) e.sconfitto(id, turno);
    }
    if (finito) this.nemiciDelloScontro.clear();
  }

  /**
   * The Game Master's XP from the panel (docs/prove.md §12): an award to one PC or to the party (`px`, with a reason), or
   * the treasure found so far marked back to safety. The panel hears the outcome; the narrator does not (XP are out of
   * the story). Null without XP rules.
   */
  esperienzaDelMaster(c: { cosa: 'assegna' | 'tesoro'; px?: number; pg?: string | null; motivo?: string }, turno: number): { ok: boolean; fatto: string } | null {
    const e = this.esperienza;
    if (!this.attivo || !e?.attiva) return null;
    const v =
      c.cosa === 'tesoro'
        ? e.tesoroAlSicuro(turno)
        : c.px && (!c.pg || this.generico?.schede.has(c.pg))
          ? e.premia('master', c.motivo?.trim() || testo('prove.esperienza.premio_master'), c.px, c.pg ? [c.pg] : null, turno)
          : null;
    if (!v) return { ok: false, fatto: c.cosa === 'tesoro' ? testo('prove.esperienza.nessun_tesoro') : '' };
    return { ok: true, fatto: this.fattoEsperienza(v) };
  }

  /** One line for the panel's log: who got how many XP, for what. */
  private fattoEsperienza(v: VoceEsperienza): string {
    const c = this.o.contesto();
    const quote = Object.entries(v.quote).map(([id, n]) => testo('prove.esperienza.quota', { nome: this.nomeDi(c, id), px: n })).join(', ');
    return testo('prove.esperienza.premio', { motivo: v.motivo, px: v.totale, quote });
  }

  /** The XP for the panel: each PC's total, level and next threshold, the treasure waiting, this session's awards. */
  vistaEsperienza(): { pg: VistaPxPg[]; tesoro: string | null; guadagni: Array<VoceEsperienza & { testo: string }> } | null {
    const e = this.esperienza;
    if (!e?.attiva) return null;
    const m = this.sistema.monete;
    const tesoro = e.tesoro && m ? scriviCosto(m, e.tesoro) : null;
    return { pg: e.vista(), tesoro, guadagni: e.registro().map((v) => ({ ...v, testo: this.fattoEsperienza(v) })) };
  }

  /**
   * What a closed window outside a fight costs on the clock: one round while a PC is dying (the table acts in the
   * moment); otherwise the scene's `tempo_per_finestra` or the set's `per_finestra`, or longer when an action has the
   * words of one of the set's `tempo.azioni` (searching a room takes a turn).
   */
  private costoFinestra(azioni: readonly AzionePerProve[], c: ContestoProve): number {
    const t = this.tempo.regola;
    if (this.morenti.tutti().length) return this.tempo.secondiRound;
    const errori: string[] = [];
    const daScena = c.campagna.scena.dati['tempo_per_finestra'];
    const base = daScena !== undefined ? (secondiDi(t.unita, daScena, 'scena.tempo_per_finestra', errori) ?? t.perFinestra) : t.perFinestra;
    if (errori.length) this.o.log.warn({ errori }, 'time: the scene\'s tempo_per_finestra is malformed, the set\'s applies');
    const testi = azioni.map((a) => normalizza(senzaParlato(a.testo)));
    const lunghe = t.azioni.filter((x) => testi.some((w) => x.parole.some((p) => w.includes(normalizza(p))))).map((x) => x.secondi);
    return Math.max(base, ...lunghe);
  }

  /** The lights the window's actions light or put out by their words (prove/luci.ts). Their facts. */
  private luciDalleAzioni(azioni: readonly AzionePerProve[]): string[] {
    const ctx = this.contestoLuci();
    if (!ctx) return [];
    return azioni.flatMap((a) => {
      const l = luceDellAzione(ctx, a.autore, a.testo);
      if (!l) return [];
      const e = l.cosa === 'accendi' ? accendiLuce(ctx, a.autore, l.oggetto) : spegniLuce(ctx, a.autore, l.oggetto);
      return e.fatto ? [e.fatto] : [];
    });
  }

  private contestoLuci(): ContestoLuci | null {
    const g = this.generico;
    if (!g || !this.risorse || !this.inventario) return null;
    return { sistema: g.regole.sistema, risorse: this.risorse, inventario: this.inventario, tempo: this.tempo, dadi: this.dadi, nome: (id) => this.nomeDi(this.o.contesto(), id), log: this.o.log.child({ modulo: 'luci' }) };
  }

  /**
   * The game clock for the Game Master's panel (docs/prove.md §11): the day and time, and every light burning with the
   * time it has left (a Game Master roll: the phones see only that it is lit). Null when the set has no clock.
   */
  vistaTempo(): { ora: string; trascorso: string | null; luci: Array<{ chi: string; oggetto: string; nome: string; restante: string }> } | null {
    if (!this.tempo.mostrato) return null;
    return {
      ora: this.tempo.testoOra(),
      trascorso: this.tempo.trascorsi > 0 ? this.tempo.durata(this.tempo.trascorsi) : null,
      luci: this.tempo.tutteLeLuci().map((l) => ({ chi: l.chi, oggetto: l.oggetto, nome: voce(this.sistema.catalogo, l.oggetto)?.nome ?? l.oggetto, restante: this.tempo.durata(l.restanti) })),
    };
  }

  /**
   * The Game Master lights or puts out a light (docs/prove.md §11), or lets time pass (`avanza`: {unit: amount} of the
   * set's clock; never during a fight, whose rounds are the clock). Facts to the transcript and the narrator next turn.
   */
  tempoDelMaster(c: { cosa: 'accendi' | 'spegni'; id: string; oggetto: string } | { cosa: 'avanza'; durata: Record<string, number> } | { cosa: 'viaggio'; distanza: number; terreno: string }): { ok: boolean; fatto: string } | null {
    if (!this.attivo) return null;
    let e: { ok: boolean; fatto: string };
    if (c.cosa === 'viaggio') {
      if (this.combattimento.attivo) return { ok: false, fatto: testo('prove.tempo.in_combattimento') };
      const v = this.viaggio(c.distanza, c.terreno);
      if (!v.ok) return v;
      e = { ok: true, fatto: [v.fatto, ...this.passaTempo(v.secondi, 'viaggio')].join(' ') };
    } else if (c.cosa === 'avanza') {
      if (this.combattimento.attivo) return { ok: false, fatto: testo('prove.tempo.in_combattimento') };
      const errori: string[] = [];
      const secondi = secondiDi(this.tempo.regola.unita, c.durata, 'durata', errori);
      if (secondi === null || !this.tempo.mostrato) return { ok: false, fatto: errori.join('; ') || testo('prove.tempo.senza_tempo') };
      const fatti = this.passaTempo(secondi, 'master');
      e = { ok: true, fatto: [testo('prove.tempo.passa', { quanto: this.tempo.durata(secondi), ora: this.tempo.testoOra() }), ...fatti].join(' ') };
    } else {
      const ctx = this.contestoLuci();
      if (!ctx) return null;
      e = c.cosa === 'accendi' ? accendiLuce(ctx, c.id, c.oggetto) : spegniLuce(ctx, c.id, c.oggetto);
    }
    if (e.ok) this.fattiInSospeso.push(e.fatto);
    this.o.log.info({ ...c, ok: e.ok }, 'time: the Game Master moves the clock or a light');
    return e;
  }

  /**
   * A journey (Basic Fantasy p. 45): the group's slowest movement now (the PCs at the table, by their load and armor),
   * times the set's `per_movimento` and the terrain's factor, gives the distance of a travel day; the clock moves by the
   * whole days and the hours of the last one. Refused without the set's `viaggio`, or when someone cannot move.
   */
  private viaggio(distanza: number, terreno: string): { ok: true; fatto: string; secondi: number } | { ok: false; fatto: string } {
    const s = this.sistema;
    const t = s.viaggio?.terreni.find((x) => x.id === terreno);
    const c = this.o.contesto();
    if (!s.viaggio || !this.inventario || !t || !(distanza > 0)) return { ok: false, fatto: testo('prove.viaggio.non_valido') };
    const chi = c.pgAlTavolo.filter((id) => this.inventario!.carico(id) && this.stato.fuoriGioco(id) !== 'morto');
    const lento = chi.map((id) => ({ id, mv: this.inventario!.carico(id)!.movimento ?? 0 })).sort((a, b) => a.mv - b.mv)[0];
    if (!lento) return { ok: false, fatto: testo('prove.viaggio.non_valido') };
    if (lento.mv <= 0) return { ok: false, fatto: testo('prove.viaggio.fermo', { nome: this.nomeDi(c, lento.id) }) };
    const alGiorno = lento.mv * s.viaggio.perMovimento * t.per;
    const giorni = distanza / alGiorno;
    const interi = Math.floor(giorni);
    const secondi = Math.round(interi * 86400 + (giorni - interi) * s.viaggio.oreAlGiorno * 3600);
    this.o.log.info({ distanza, terreno, lento: lento.id, movimento: lento.mv, al_giorno: alGiorno, giorni }, 'travel: the journey by the slowest member');
    const quanto = this.tempo.durata(secondi);
    return { ok: true, secondi, fatto: testo('prove.viaggio.fatto', { distanza, unita: s.viaggio.unita, terreno: t.nome.toLowerCase(), quanto, al_giorno: Math.round(alGiorno * 10) / 10, nome: this.nomeDi(c, lento.id), movimento: lento.mv, unita_movimento: s.movimento?.unita ?? '' }) };
  }

  private passaRoundMorenti(k = 1): string[] {
    const t = this.morenti.passaRound(k);
    for (const id of t.morti) {
      this.combattimento.segnaMorto(id);
      this.morteFuori.push({ id, nome: this.nomeDi(this.o.contesto(), id), esito: 'morto' });
      this.o.log.info({ id }, 'death: the dying window ran out, dead');
    }
    return Morenti.fatti(t, (id) => this.nomeDi(this.o.contesto(), id));
  }

  /**
   * A character went to 0 outside a fight's own steps (a trap, a fall, a spell before any fight: prove/effetti.ts). In a
   * fight the fight handles it (prove/combattimento.ts); outside one the set's rule at zero applies now: dead, or a
   * single death save rolled at once (the PC's own dice with manual rolls), then stable or dying. A rule of several
   * saves (the SRD's three) leaves the PC down for the Game Master, as before.
   */
  private aZeroFuoriScontro(id: string, turno: number, fatti: string[], tiri: TiroMostrato[]): void {
    if (this.combattimento.attivo) return;
    const r = this.regoleCombattimento().danni;
    const nome = this.nomeDi(this.o.contesto(), id);
    const pg = !id.startsWith('png_');
    if ((pg ? r.pgAZero : r.pngAZero) === 'morte') {
      this.stato.segnaUscito(id, 'morto');
      fatti.push(testo('prove.effetti.morte', { nome, fonte: this.sistema.danni.aZero }));
      return;
    }
    const tm = r.tiriMorte;
    if (!pg || r.pgAZero !== 'tiri_morte' || !tm || tm.successi !== 1 || tm.fallimenti !== 1) return;
    const sv = tm.abilita ? this.salvezzaMorte(id, tm.abilita) : null;
    const contro = sv?.contro ?? tm.cd;
    const mod = sv?.modificatore ?? 0;
    const dado = (this.tavolo?.fonte({ pg: id, per: 'morte', azione: null, privata: false, etichetta: testo('prove.combattimento.etichetta_morte'), contro, ...(mod ? { modificatore: mod } : {}) }) ?? this.dadi).tira(20);
    const riuscita = sv?.naturali && dado === 20 ? true : sv?.naturali && dado === 1 ? false : dado + mod >= contro;
    tiri.push({ id: this.stato.nuovoIdTiro(), turno, chi: id, nome, di_png: false, tipo: 'salvezza', etichetta: testo('prove.combattimento.etichetta_morte'), dadi: [dado], dado, vantaggio: null, motivo_vantaggio: null, modificatore: mod, totale: dado + mod, contro: { tipo: 'CD', valore: contro, descrizione: null }, bersaglio: null, riuscita, critico: false, fallimento_critico: false, danno: null, a_terra: true, privata: false, avversario: null });
    if (!riuscita) {
      this.stato.segnaUscito(id, 'morto');
      this.morteFuori.push({ id, nome, esito: 'morto' });
      fatti.push(testo('prove.morte.subito', { nome, dado: dado + mod, cd: contro, esito: testo('prove.combattimento.morte_morto', { n: 1 }) }));
      this.o.log.info({ id, dado, contro }, 'death: down outside a fight, the save failed: dead');
      return;
    }
    fatti.push(testo('prove.morte.subito', { nome, dado: dado + mod, cd: contro, esito: testo(tm.finestra ? 'prove.combattimento.morte_finestra' : 'prove.combattimento.morte_stabile', { n: 1 }) }));
    this.morteFuori.push({ id, nome, esito: tm.finestra ? 'morente' : 'stabile' });
    if (tm.finestra) this.iniziaMorente(id, fatti);
    else if (tm.perdeIncantesimi && this.risorse?.dimenticaIncantesimi(id)) fatti.push(testo('prove.morte.incantesimi_persi', { nome }));
  }

  /** A sheet's traits: its race's, its class's, its own (regole/tratti.ts); none on the SRD path. */
  private trattiDi(id: string): Tratto[] {
    const g = this.generico;
    const sch = g?.schede.get(id);
    return g && sch ? trattiDi(g.regole.sistema, sch) : [];
  }

  /** Immune by its sheet (`immune`) or a trait (`{immune: [...]}`) to a power or a condition. */
  private immuneDiScheda(id: string, cosa: string): boolean {
    const sch = this.generico?.schede.get(id);
    return !!sch?.immune?.includes(cosa) || this.trattiDi(id).some((t) => t.tipo === 'immune' && t.a.includes(cosa));
  }

  /** The rule set in use: the campaign's, or the SRD 5.2 of the code (its falls, its rest). */
  private get sistema(): SistemaRegole {
    return this.o.regole?.regole.sistema ?? sistemaSrd();
  }

  /**
   * What the typed effects need (prove/effetti.ts): the state, the Engine's dice, the set's falling table and words for
   * hit points, the sheets' Armor Class, and the fight's hook when someone gets back above zero.
   */
  private contestoEffetti(turno: number, c: ContestoProve): ContestoEffetti {
    const s = this.sistema;
    const g = this.generico;
    return {
      turno,
      stato: this.stato,
      dadi: this.dadi,
      nome: (id) => this.nomeDi(c, id),
      cadute: s.cadute ?? null,
      danni: s.danni,
      difesa: (id) => (g ? (g.schede.get(id)?.difesa ?? null) : (this.o.schede.get(id)?.ca ?? null)),
      dopoCura: (id) => {
        this.combattimento.dopoCura(id);
        if (this.morenti.ferma(id)) this.o.log.info({ id }, 'death: healed above 0, no longer dying');
      },
      aZero: (id, fatti, tiri) => this.aZeroFuoriScontro(id, turno, fatti, tiri),
      ...(this.inventario ? { inventario: this.inventario } : {}),
      attivi: {
        aggiungi: (id, e, fonte, livello, dadi) => this.attivi.aggiungi(id, e, fonte, livello, dadi),
        ferito: (id) => this.attivi.ferito(id),
        stabilizza: (id) => {
          const era = this.morenti.ferma(id);
          const inScontro = this.combattimento.stabilizza(id);
          if (era || inScontro) this.o.log.info({ id }, 'death: bound, stable at 0');
          // Bound in time: an owed fact (prove/fatti-dovuti.ts), so the table hears the dying one is saved.
          if (era || inScontro) this.morteFuori.push({ id, nome: this.nomeDi(c, id), esito: 'stabile' });
          return era || inScontro;
        },
      },
      log: this.o.log.child({ turno, modulo: 'effetti' }),
    };
  }

  // ------------------------------------------------------------------ the Game Master's rest and hazards (docs/prove.md §10)

  /** The kinds of rest of the set, for the panel (`riposo` of regole.yaml; the SRD's long rest). */
  tipiDiRiposo(): Array<{ id: string; nome: string }> {
    return (this.sistema.riposo ?? []).map((r) => ({ id: r.id, nome: r.nome }));
  }

  /**
   * The Game Master gives the party a rest (a night's sleep, the SRD's long rest): the set's healing for every character
   * with a sheet who is not dead. Refused during a fight or for an unknown kind. The fact goes to the transcript (the
   * return) and to the narrator in the next turn.
   */
  riposo(id: string): { ok: true; fatto: string } | { ok: false; motivo: 'senza_dadi' | 'combattimento' | 'sconosciuto' } {
    if (!this.attivo) return { ok: false, motivo: 'senza_dadi' };
    if (this.combattimento.attivo) return { ok: false, motivo: 'combattimento' };
    const r = (this.sistema.riposo ?? []).find((x) => x.id === id);
    if (!r) return { ok: false, motivo: 'sconosciuto' };
    const c = this.o.contesto();
    const ids = [...(this.generico ? this.generico.schede.keys() : this.o.schede.keys())];
    // Back above 0 by the rest: on its feet, and no longer dying (prove/morte.ts).
    const rialzato = (x: string): void => {
      this.combattimento.dopoCura(x);
      this.morenti.ferma(x);
    };
    const e = riposa(r, ids, { stato: this.stato, dadi: this.dadi, nome: (x) => this.nomeDi(c, x), danni: this.sistema.danni.nome, dopoCura: rialzato, log: this.o.log.child({ modulo: 'riposo' }) });
    // A rest that refreshes: spell slots, prepared spells and the resources that come back with rest (prove/risorse.ts).
    const ricaricati = r.ricarica && this.risorse ? this.risorse.ricarica('riposo') : [];
    const finiti = Attivi.fatto(this.attivi.riposo(), (x) => this.nomeDi(c, x));
    // The rest takes its time on the clock (a night: eight hours): lights left burning burn down meanwhile.
    const tempo = r.durata ? [...this.passaTempo(r.durata, 'riposo'), ...(this.tempo.mostrato ? [testo('prove.tempo.passa', { quanto: this.tempo.durata(r.durata), ora: this.tempo.testoOra() })] : [])] : [];
    const fatto = [e.fatto, ricaricati.length ? testo('prove.riposo.ricarica') : '', finiti ?? '', ...tempo].filter(Boolean).join(' ');
    if (ricaricati.length) this.o.log.info({ riposo: r.id }, 'rest: resources and spells refreshed');
    this.fattiInSospeso.push(fatto);
    return { ok: true, fatto };
  }

  /**
   * The Game Master applies a hazard to a character from the panel (docs/prove.md §10): damage («2d6»), healing, or a
   * fall of a height by the set's table. The cards join the last turn's (projector and phones); the facts go to the
   * transcript (the return) and to the narrator in the next turn. Null = no dice, no sheet, or a malformed effect.
   */
  effettoDelMaster(id: string, cosa: 'danno' | 'cura' | 'caduta', valore: string | number, fonte: string, turno: number): { fatti: string[] } | null {
    if (!this.attivo || !this.stato.puntiFerita(id)) return null;
    const errori: string[] = [];
    const e = leggiEffetto(cosa === 'caduta' ? { tipo: 'caduta', altezza: valore } : { tipo: cosa, dadi: valore }, 'master', errori);
    if (!e || errori.length) return null;
    const c = this.o.contesto();
    const x = applicaEffetti({ effetti: [e], bersaglio: id, autore: null, fonte, livello: 1 }, this.contestoEffetti(turno, c));
    for (const t of x.tiri) this.aggiungiCartaDelMaster(t);
    this.fattiInSospeso.push(...x.fatti);
    this.o.log.info({ id, cosa, valore, fonte, fatti: x.fatti }, 'effects: applied by the Game Master');
    return { fatti: x.fatti };
  }

  /**
   * What a character of a manual's set has now (docs/prove.md §10): AC and attack lines from its gear, what it carries
   * and wears, its coins and the counters of its spells and resources. For the Game Master's panel and its own phone.
   * Null = the SRD, or no sheet.
   */
  vistaInventario(id: string): ScortaScheda | null {
    const g = this.generico;
    const sch = g?.schede.get(id);
    if (!g || !sch || !this.risorse) return null;
    const s = g.regole.sistema;
    const inv = this.inventario;
    const dif = inv && sch.equipaggiamento ? difesaDa(s, sch, inv.dotazione(id)) : null;
    const potere = (k: string): string => (s.poteri ?? []).find((p) => p.id === k)?.nome ?? k;
    const contatori = this.risorse.vista(id).flatMap(({ chiave, restanti }) => {
      if (chiave.startsWith('moneta:')) return [];
      if (chiave.startsWith('oggetto:')) {
        const k = chiave.slice('oggetto:'.length);
        return s.catalogo?.voci.some((v) => v.id === k) ? [] : [{ id: chiave, nome: potere(k), restanti }];
      }
      const slot = /^slot_(\d+)$/.exec(chiave);
      if (slot) return [{ id: chiave, nome: testo('prove.scorta.slot', { livello: slot[1]! }), restanti }];
      return [{ id: chiave, nome: (s.risorse ?? []).find((r) => r.id === chiave)?.nome ?? chiave, restanti }];
    });
    const carico = inv?.carico(id) ?? null;
    return {
      difesa: sch.difesa,
      difesa_da: dif?.da ?? null,
      attacchi: sch.attacchi.map((a) => a.nome),
      oggetti: inv?.oggetti(id) ?? [],
      monete: inv?.monete(id) ?? [],
      contatori,
      ...(carico ? { carico: { peso: carico.peso, unita: s.carico!.unita, fascia: carico.nome, limite: carico.limite, movimento: carico.movimento, unita_movimento: s.movimento?.unita ?? null } } : {}),
    };
  }

  /**
   * A character's gear view with its lights lit: with the time left for the Game Master's panel (`conTempo`), or only
   * that they are lit for the phones (a hidden roll). Null when there is nothing to show (the SRD, a sheet with no gear
   * and no counters).
   */
  scortaConLuci(id: string, conTempo: boolean): ScortaScheda | null {
    const v = this.vistaInventario(id);
    if (!v || (!v.oggetti.length && !v.monete.length && !v.contatori.length && !this.generico?.schede.get(id)?.equipaggiamento)) return null;
    const luci = this.tempo.luciDi(id).map((l) => ({ oggetto: l.oggetto, nome: voce(this.sistema.catalogo, l.oggetto)?.nome ?? l.oggetto, restante: conTempo ? this.tempo.durata(l.restanti) : '' }));
    return { ...v, ...(luci.length ? { luci } : {}) };
  }

  /**
   * The Game Master changes a character's gear or coins from the panel (docs/prove.md §10): an item found or lost, coins
   * gained or paid, a purchase or a sale, armor put on or taken off (prove/inventario.ts). A change that happens goes to
   * the narrator in the next turn; a refusal (not enough coins, a forbidden armor) only to the panel. Null = no catalog.
   */
  inventarioDelMaster(c: Extract<ComandoMaster, { tipo: 'inventario' }>): { ok: boolean; fatto: string } | null {
    const inv = this.inventario;
    if (!this.attivo || !inv) return null;
    const errori: string[] = [];
    const prezzo = c.prezzo !== undefined && c.prezzo !== '' ? leggiCosto(c.prezzo, this.sistema.monete ?? null, 'prezzo', errori) : null;
    if (errori.length) return { ok: false, fatto: errori.join('; ') };
    const n = c.quante ?? 1;
    const e =
      c.cosa === 'monete'
        ? inv.aggiungiMonete(c.id, c.monete ?? {})
        : !c.oggetto
          ? { ok: false as const, fatto: '' }
          : c.cosa === 'oggetto'
            ? inv.oggetto(c.id, c.oggetto, n)
            : c.cosa === 'compra'
              ? inv.compra(c.id, c.oggetto, n, prezzo)
              : c.cosa === 'vendi'
                ? inv.vendi(c.id, c.oggetto, n, prezzo)
                : inv.indossa(c.id, c.oggetto, c.cosa === 'indossa');
    if (e.ok && e.fatto) this.fattiInSospeso.push(e.fatto);
    this.o.log.info({ id: c.id, cosa: c.cosa, oggetto: c.oggetto ?? null, quante: n, ok: e.ok }, 'inventory: the Game Master changes the gear');
    return { ok: e.ok, fatto: e.fatto };
  }

  /**
   * The scene changes (scena/regia.ts): the scene-long and round-long timed effects end; their line goes to the narrator
   * with the next turn. Returns that line, or null.
   */
  fineScena(): string | null {
    const f = Attivi.fatto(this.attivi.cambioScena(), (id) => this.nomeDi(this.o.contesto(), id));
    if (f) this.fattiInSospeso.push(f);
    return f;
  }

  /** Le regole di combattimento del set (SRD 5.2 se la campagna non ne ha un altro). */
  private regoleCombattimento(): Combattimento {
    return this.o.regole?.regole.sistema.combattimento ?? combattimentoSrd();
  }

  /** Chi entra nello scontro: i PG al tavolo con la scheda, i PNG coinvolti e quelli ostili in scena con la scheda. */
  private candidati(c: ContestoProve, attacchi: Array<{ chi: string; bersaglio: string }>): Array<{ id: string; lato: 'pg' | 'png'; mod: number }> {
    const g = this.generico;
    const ha = (id: string): boolean => (g ? g.schede.has(id) : this.o.schede.has(id));
    const car = this.regoleCombattimento().iniziativa.caratteristica;
    const mod = (id: string): number => {
      if (!car) return 0;
      if (g) {
        const sch = g.schede.get(id);
        // Initiative: the characteristic and the race or class trait (Basic Fantasy's halflings +1, regole/tratti.ts).
        return sch ? valoreCaratteristica(g.regole.sistema, sch, car) + bonusTratti(this.trattiDi(id), { tipo: 'iniziativa' }) : 0;
      }
      const sch = this.o.schede.get(id);
      const k = comeCaratteristica(car);
      return sch && k ? modCaratteristica(sch, k) : 0;
    };
    const coinvolti = new Set(attacchi.flatMap((a) => [a.chi, a.bersaglio]));
    const presenti = c.presenti ?? new Set(c.campagna.scena.png_presenti);
    const pg = c.pgAlTavolo.filter(ha).map((id) => ({ id, lato: 'pg' as const, mod: mod(id) }));
    const png = c.campagna.png
      .filter((p) => ha(p.id) && !this.stato.aTerra(p.id) && (coinvolti.has(p.id) || (presenti.has(p.id) && c.pgAlTavolo.some((x) => this.atteggiamento(c.campagna, p.id, x) === 'ostile'))))
      .map((p) => ({ id: p.id, lato: 'png' as const, mod: mod(p.id) }));
    // Un PNG coinvolto ma già a terra (colpito dall'attacco che apre lo scontro) entra lo stesso.
    for (const id of coinvolti) if (id.startsWith('png_') && ha(id) && !png.some((p) => p.id === id)) png.push({ id, lato: 'png', mod: mod(id) });
    // The scene's minions are its enemies (C5): standing, they join the fight.
    for (const g of this.gregariInScena(c)) if (ha(g.id) && !png.some((p) => p.id === g.id)) png.push({ id: g.id, lato: 'png', mod: mod(g.id) });
    return [...pg, ...png];
  }

  /** Un PNG attacca un PG nel suo turno, con l'arma adatta alla fase (B/X: proiettili o mischia). */
  private attaccaPng(png: string, pg: string, fase: Fase, turno: number): { t: TiroMostrato; testo: string } | null {
    const c = this.o.contesto();
    const g = this.generico;
    const armi = (g ? g.schede.get(png)?.attacchi : this.o.schede.get(png)?.attacchi) ?? null;
    if (!armi) return null;
    // B/X: nella fase dei proiettili solo chi ha un'arma a distanza, in mischia solo le armi da mischia.
    // A weapon out of ammunition (`consuma`, prove/risorse.ts) is not used: the NPC takes the next one that fits.
    const conMunizioni = (a: (typeof armi)[number]): boolean => !('consuma' in a) || !a.consuma || !this.risorse || (this.risorse.restanti(png, a.consuma) ?? 1) > 0;
    const adatte = armi.filter((a) => (fase.png === 'attacco_distanza' ? a.distanza : fase.png === 'attacco_mischia' ? !a.distanza : true) && conMunizioni(a));
    if (fase.png !== 'attacco' && !adatte.length) return null;
    if (g) return strumentiRegole(this.opzioniRegole(turno, c, g)).attacca(png, pg, adatte[0]?.id ?? null, [], false);
    return attaccoPngSrd(this.opzioniSrd(turno, c), png, pg, false, adatte[0]?.id ?? null);
  }

  /**
   * A decision is a social check: an SRD social skill or Charisma alone, the set's social characteristic or skill
   * (also through a move), or a social scene check.
   */
  sociale(d: { abilita: string | null; caratteristica: string | null; prova_scena: string | null; mossa?: string | null }, c: ContestoProve): boolean {
    const g = this.generico;
    if (g) {
      const s = g.regole.sistema;
      if (d.prova_scena) {
        const p = proveScenaRegole(s, c.campagna).find((x) => x.id === d.prova_scena);
        if (p) return (!!p.caratteristica && p.caratteristica === s.sociale.caratteristica) || (!!p.abilita && p.abilita === s.sociale.abilita);
      }
      const mossa = d.mossa ? s.mosse.find((m) => m.id === d.mossa) : undefined;
      const car = mossa?.caratteristica ?? d.caratteristica;
      return (!!car && car === s.sociale.caratteristica) || (!!d.abilita && d.abilita === s.sociale.abilita);
    }
    if (d.prova_scena) {
      const p = this.proveScena(c.campagna).find((x) => x.id === d.prova_scena);
      if (p) return provaSocialeSrd(p);
    }
    return provaSocialeSrd({ abilita: d.abilita, caratteristica: d.caratteristica });
  }

  /** Per il pannello del master: PF di chi ha una scheda, condizioni del set. */
  combattimentoMaster(): CombattimentoMaster {
    const c = this.o.contesto();
    const g = this.generico;
    const ids = g ? [...g.schede.keys()] : [...this.o.schede.keys()];
    return {
      attivo: this.combattimento.attivo,
      ...(this.combattimentoChiesto ? { chiesto: true } : {}),
      schede: ids.flatMap((id) => {
        const pf = this.stato.puntiFerita(id);
        const scorta = this.scortaConLuci(id, true);
        return pf ? [{ id, nome: c.nome(id), di_png: id.startsWith('png_'), pf, ...(scorta ? { scorta } : {}) }] : [];
      }),
      condizioni: this.regoleCombattimento().condizioni.map((x) => ({ id: x.id, nome: x.nome, icona: x.icona, testo: x.testo })),
      ...(this.tipiDiRiposo().length ? { riposi: this.tipiDiRiposo() } : {}),
      ...(this.inventario && this.sistema.catalogo
        ? { catalogo: { voci: this.sistema.catalogo.voci.map((v) => ({ id: v.id, nome: v.nome, tipo: v.tipo, luce: v.tipo === 'attrezzo' && !!v.luce })), monete: (this.sistema.monete?.tagli ?? []).map((t) => ({ id: t.id, nome: t.nome })) } }
        : {}),
      ...(() => {
        const t = this.vistaTempo();
        return t ? { tempo: { ...t, unita: this.tempo.regola.unita.map((u) => ({ id: u.id, nome: u.nome })), terreni: (this.sistema.viaggio?.terreni ?? []).map((x) => ({ id: x.id, nome: x.nome })), unita_viaggio: this.sistema.viaggio?.unita ?? null } } : {};
      })(),
      ...(() => {
        const e = this.vistaEsperienza();
        return e ? { esperienza: e } : {};
      })(),
    };
  }

  /** Ciò che serve al classificatore a regole (prove/classificatore-regole.ts). */
  private ingressoClassificatore(c: ContestoProve, altre: AzioneRisolvibile[] = []): IngressoClassificatore {
    const g = this.generico;
    // Set del manuale: le abilità con cui si attacca (mischia, distanza…), dalle armi delle schede. Non le
    // caratteristiche: «Forza» serve anche a spingere un masso.
    const attacchiPer = new Set(g ? [...g.schede.values()].flatMap((sch) => sch.attacchi.flatMap((a) => (a.abilita ? [a.abilita] : []))) : []);
    const sociale = g?.regole.sistema.sociale;
    const poteri = g?.regole.sistema.poteri ?? [];
    return {
      ...(g ? { attacchiPer } : {}),
      ...(poteri.length ? { poteriDi: (pg: string) => this.poteriDi(pg) } : {}),
      campagna: c.campagna,
      regole: g ? g.regole : null,
      armi: (id) => (g ? g.schede.get(id)?.attacchi : this.o.schede.get(id)?.attacchi)?.map((a) => a.id) ?? [],
      haScheda: (id) => (g ? g.schede.has(id) : this.o.schede.has(id)),
      // Sociale: la prova chiede di rivolgersi a un PNG (Carisma del set, persuadere e simili nell'SRD).
      proveScena: g
        ? proveScenaRegole(g.regole.sistema, c.campagna).map((p) => ({
            id: p.id,
            quando: p.quando,
            parole: p.parole,
            sociale: (!!p.caratteristica && p.caratteristica === sociale?.caratteristica) || (!!p.abilita && p.abilita === sociale?.abilita),
          }))
        : this.proveScena(c.campagna).map((p) => ({ id: p.id, quando: p.quando, parole: p.parole, sociale: provaSocialeSrd(p) })),
      altre: altre.map((a) => ({ id: a.id, autore: a.autore })),
      ...(this.gregari.size ? { gregario: (fatti: string) => this.gregarioNominato(c, fatti) } : {}),
      // In a fight, a PC's own attack with no target named goes to its last target (round 5: five attacks unrolled).
      ...(this.inCombattimento ? { bersaglioImplicito: (pg: string) => this.combattimento.bersaglioImplicito(pg, this.ultimoBersaglio.get(pg) ?? null) } : {}),
      // Nobody with stats standing in the scene (C5): an attack there is at nobody, and the narrator must not invent one.
      nessunNemico: ![...(c.presenti ?? new Set(c.campagna.scena.png_presenti))].some((id) => (g ? g.schede.has(id) : this.o.schede.has(id)) && !this.stato.fuoriGioco(id)) && !this.gregariInScena(c).length,
      // What the scene says about the conditions (prove/difficolta.ts): the last narration and the scene's description.
      scena: [...frasiDi(c.narrazione), ...frasiDi(typeof c.campagna.scena.dati['descrizione'] === 'string' ? c.campagna.scena.dati['descrizione'] : '')],
    };
  }

  /**
   * The powers a PC can call by name (prove/classificatore-regole.ts, potereDiRegole): the spells on its sheet, its items,
   * and the set's class actions; each with its own words (the power's `parole` and its name). Not the words of the
   * manual's passages: «lancio» or «magia» there would turn a thrown dagger into a spell.
   */
  private poteriDi(pg: string): Array<{ id: string; parole: string[] }> {
    const g = this.generico;
    const sch = g?.schede.get(pg);
    if (!g || !sch) return [];
    const suoi = (g.regole.sistema.poteri ?? []).filter((p) => (p.tipo === 'incantesimo' && (sch.incantesimi ?? []).includes(p.id)) || (p.tipo === 'oggetto' && (sch.oggetti?.[p.id] ?? 0) > 0) || p.tipo === 'azione');
    return suoi.map((p) => ({ id: p.id, parole: [...p.parole, p.nome] }));
  }

  get inCombattimento(): boolean {
    return this.attivo && this.combattimento.attivo;
  }

  /** The condition that makes this character lose the round in progress (surprise…), or null (prove/combattimento.ts). */
  perdeIlTurno(id: string): string | null {
    return this.inCombattimento ? this.combattimento.perdeIlTurno(id) : null;
  }

  /** PG che devono agire adesso nello scontro a turni (null = niente turni: decide il narratore). */
  turnoCombattimento(): string[] | null {
    return this.inCombattimento ? this.combattimento.turnoDi() : null;
  }

  vistaCombattimento(): CombattimentoPubblico | null {
    return this.inCombattimento ? this.combattimento.vista((id) => this.stato.puntiFerita(id)) : null;
  }

  /**
   * Manual rolls (docs/prove.md §8): the fight the Game Master opens from the panel starts at the next closed window,
   * after its actions, so the players roll their own initiative there (the dry run asks it like their other rolls).
   * Kept in the snapshot. False if a fight is on or already asked.
   */
  chiediCombattimento(): boolean {
    if (!this.attivo || this.combattimento.attivo || this.scontroChiesto) return false;
    this.scontroChiesto = true;
    this.o.log.info('combat: asked from the panel, it starts at the next closed window');
    return true;
  }

  /** A fight asked from the panel that has not started yet. */
  get combattimentoChiesto(): boolean {
    return this.attivo && this.scontroChiesto && !this.combattimento.attivo;
  }

  /** Il master apre lo scontro (senza un attacco): tutti i PG al tavolo e i PNG ostili in scena. */
  iniziaCombattimento(): string | null {
    if (!this.attivo || this.combattimento.attivo) return null;
    const c = this.o.contesto();
    const dopo: string[] = [];
    const fatto = this.combattimento.inizia(this.candidati(c, []), dopo);
    this.intestazione = null;
    return [fatto, ...dopo].join(' ');
  }

  terminaCombattimento(motivo = testo('prove.combattimento.motivo_master')): boolean {
    // A fight asked from the panel and not started yet: ending it cancels the request.
    if (!this.combattimento.attivo && this.scontroChiesto) {
      this.scontroChiesto = false;
      this.o.log.info('combat: the request from the panel cancelled before it started');
      return true;
    }
    if (!this.combattimento.attivo) return false;
    this.combattimento.termina(motivo);
    this.risorse?.ricarica('scontro');
    this.intestazione = null;
    return true;
  }

  /** Il master corregge i PF (cura o danno): chi torna sopra 0 si rialza. */
  impostaPf(id: string, valore: number): boolean {
    const p = this.stato.puntiFerita(id);
    if (!p || !Number.isInteger(valore)) return false;
    const v = Math.max(0, Math.min(p.massimi, valore));
    if (v > p.attuali) this.stato.cura(id, v - p.attuali);
    else if (v < p.attuali) this.stato.danneggia(id, p.attuali - v);
    if (v > 0) {
      this.combattimento.dopoCura(id);
      // The Game Master's healing above 0 ends a dying window too.
      this.morenti.ferma(id);
    }
    return true;
  }

  /** Il master mette o toglie una condizione (solo durante lo scontro). */
  condizione(id: string, condizione: string, attiva: boolean): boolean {
    if (!this.combattimento.attivo) return false;
    return attiva ? this.combattimento.aggiungiCondizione(id, condizione) : this.combattimento.togliCondizione(id, condizione);
  }

  /**
   * Atteggiamento del PNG verso il PG: the one in play if the director gives it (docs/mondo.md §4), otherwise the
   * card's (atteggiamento_pg.<pg>.stato).
   */
  atteggiamento(c: Campagna, png: string, pg: string): Atteggiamento | null {
    if (this.o.atteggiamento) return this.o.atteggiamento(png, pg);
    const p = c.png.find((x) => x.id === png);
    const a = (p?.dati['atteggiamento_pg'] as DatiYaml | undefined)?.[pg] as DatiYaml | undefined;
    const s = typeof a?.['stato'] === 'string' ? a['stato'].toLowerCase() : null;
    return s === 'ostile' || s === 'indifferente' || s === 'amichevole' ? s : null;
  }

  // ------------------------------------------------------------------ per il trasporto

  /**
   * Carte pubbliche dell'ultimo turno con tiri (proiettore e telefoni). No card has the number to beat here, in either
   * roll mode, unless the campaign opts in (`regole.mostra_cd`, docs/prove.md §8): the panel has it (`tiriDelMaster`).
   */
  tiriPubblici(): TiroMostrato[] {
    const mostra = this.mostraCd();
    // A Game Master's side roll (an NPC's save against a PC's power, `nascosta`) stays on the panel only.
    return (this.ultimoTurno?.tiri ?? []).filter((t) => !t.privata && !t.nascosta).map((t) => cartaPerIlTavolo(t, mostra));
  }

  /** Carte di un'azione (anche privata): solo per il telefono del suo autore (without the number to beat either). */
  tiriDellAzione(idAzione: string): TiroMostrato[] {
    const mostra = this.mostraCd();
    return (this.ultimi.get(idAzione) ?? []).filter((t) => !t.nascosta).map((t) => cartaPerIlTavolo(t, mostra));
  }

  /** The campaign's opt-in to show the number to beat on the table's cards (prove/modalita.ts). */
  private mostraCd(): boolean {
    return mostraCdAlTavolo(this.o.contesto().campagna);
  }

  /** The Engine's dice (saved with the session): the Game Master's own rolls use them too (prove/tiri-master.ts). */
  get dadiDelMotore(): FonteDadi {
    return this.dadi;
  }

  /**
   * A Game Master roll the table sees (docs/prove.md §9): its card joins the cards of the turn being resolved, so the
   * projector and the phones show it with the others.
   */
  aggiungiCartaDelMaster(t: TiroMostrato): void {
    if (this.ultimoTurno?.turno === t.turno) this.ultimoTurno.tiri.push(t);
    else this.ultimoTurno = { turno: t.turno, tiri: [t] };
    this.stato.registraTiri([t]);
  }

  /** Every card of the last turn with rolls, private ones and DCs included: only for the Game Master panel. */
  tiriDelMaster(): TiroMostrato[] {
    return [...(this.ultimoTurno?.tiri ?? [])];
  }

  // ------------------------------------------------------------------ sessione

  esporta(): StatoProveSalvato {
    return { ...this.stato.esporta(this.dadi.seme, this.dadi.contatore), combattimento: this.combattimento.esporta(), ...(this.scontroChiesto ? { combattimento_chiesto: true } : {}), ...(this.fattiInSospeso.length ? { fatti_in_sospeso: [...this.fattiInSospeso] } : {}), ...(this.risorse ? { risorse: this.risorse.esporta() } : {}), attivi: this.attivi.esporta(), morenti: this.morenti.esporta(), ...(this.tempo.mostrato ? { tempo: this.tempo.esporta() } : {}), ...(this.esperienza?.attiva ? { esperienza: this.esperienza.esporta() } : {}) };
  }

  importa(s: StatoProveSalvato): void {
    this.stato.importa(s);
    this.combattimento.importa(s.combattimento ?? null);
    this.scontroChiesto = s.combattimento_chiesto === true;
    this.fattiInSospeso = Array.isArray(s.fatti_in_sospeso) ? s.fatti_in_sospeso.filter((x): x is string => typeof x === 'string') : [];
    this.risorse?.importa(s.risorse);
    this.inventario?.rideriva();
    this.attivi.importa(s.attivi);
    this.morenti.importa(s.morenti);
    this.tempo.importa(s.tempo);
    this.esperienza?.importa(s.esperienza);
    if (!this.o.dadi && s.seme && /^[0-9a-f]{8,128}$/i.test(s.seme)) this.dadi = this.nuoviDadi(s.seme, s.contatore ?? 0);
    const ultimo = s.recenti?.at(-1)?.turno;
    this.ultimoTurno = ultimo !== undefined ? { turno: ultimo, tiri: (s.recenti ?? []).filter((t) => t.turno === ultimo) } : null;
    this.o.log.info({ seme: this.dadi.seme, contatore: this.dadi.contatore, pf: s.pf }, 'prove: stato ripreso dalla sessione salvata');
  }

  /** Ricomincia: PF pieni, dadi con un seme nuovo, niente carte. */
  azzera(): void {
    this.stato.azzeraPf();
    this.combattimento.importa(null);
    this.scontroChiesto = false;
    this.fattiInSospeso = [];
    this.risorse?.azzera();
    this.inventario?.rideriva();
    this.attivi.azzera();
    this.morenti.azzera();
    this.tempo.azzera();
    this.luciSpente = [];
    this.esperienza?.azzera();
    this.nemiciDelloScontro.clear();
    this.applicaInizio();
    this.intestazione = null;
    this.cache.clear();
    this.ultimi.clear();
    this.ultimoTurno = null;
    if (!this.o.dadi) this.dadi = this.nuoviDadi(this.o.seme);
  }
}
