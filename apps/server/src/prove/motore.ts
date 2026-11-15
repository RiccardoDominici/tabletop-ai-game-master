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
import { pngInterpellati, soloParlato } from './parole-testo';
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
import { cartaPerIlTavolo, richiestaDaCarta, richiestaDaGruppo, type TiroInserito } from './richieste';
import { loggerMuto, type Logger } from '../logger';
import { risolviTurno, type Atteggiamento, type AzioneRisolvibile } from './risolutore';
import { StatoProve, type StatoProveSalvato } from './stato';
import type { ArbitroProve, AzioneDaClassificare, DecisioneProva, DecisioneRegole, EsitoTurnoProve, IngressoArbitroProve } from './tipi';
import type { RegoleCampagna, SchedaGenerica } from '../regole/tipi';
import { proveScenaRegole, risolviTurnoRegole } from './risolutore-regole';
import { regolePerNarratore } from '../regole/narratore';
import { etichettaProva, etichettaSalvezza, regolaEsiti } from './testi';
import { GestoreCombattimento } from './combattimento';
import { attaccoDiRegole, classificaARegole, provaSocialeSrd, type IngressoClassificatore } from './classificatore-regole';
import { combattimentoSrd, type Combattimento, type Fase } from '../regole/combattimento';
import { strumentiRegole } from './risolutore-regole';
import { attaccoPngSrd } from './risolutore';
import { valoreCaratteristica } from '../regole/schede';
import { comeCaratteristica } from '../campagna/regole-srd';
import { modCaratteristica } from '../campagna/schede';
import type { CombattimentoMaster, CombattimentoPubblico, RichiestaTiroMaster } from '@tabletop-ai-gm/shared';

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
  /** Lo scontro in corso, se c'è (prove/combattimento.ts). */
  readonly combattimento: GestoreCombattimento;
  /** Situazione dello scontro per il narratore, dall'ultimo turno risolto. */
  private intestazione: string | null = null;
  private readonly cache = new Map<string, VoceCache>();
  /** Esiti dell'ultimo turno con tiri, per azione (le carte dell'azione privata vanno al suo telefono). */
  private ultimi = new Map<string, TiroMostrato[]>();
  private ultimoTurno: { turno: number; tiri: TiroMostrato[] } | null = null;
  /**
   * The PCs' dice of the pass being resolved (manual rolls, prove/dadi-tavolo.ts): the fight reads it for initiative and
   * death saves. Null outside a pass (a fight opened from the panel rolls with the Engine's dice).
   */
  private tavolo: DadiDeiPg | null = null;

  constructor(private readonly o: OpzioniMotoreProve) {
    this.stato = new StatoProve(this.generico ? this.generico.schede : o.schede);
    this.dadi = o.dadi ?? this.nuoviDadi(o.seme);
    this.combattimento = new GestoreCombattimento({
      regole: this.regoleCombattimento(),
      stato: this.stato,
      dadi: () => this.dadi,
      nome: (id) => this.o.contesto().nome(id),
      attacca: (png, pg, fase, turno) => this.attaccaPng(png, pg, fase, turno),
      morale: (png) => {
        const sch = this.o.contesto().campagna.png.find((p) => p.id === png)?.dati['scheda'] as DatiYaml | undefined;
        return typeof sch?.['morale'] === 'number' ? sch['morale'] : null;
      },
      nuovoIdTiro: () => this.stato.nuovoIdTiro(),
      // A PC's own rolls in the fight (initiative, death saves) go through the pass's table: asked at the table with
      // manual rolls, the Engine's otherwise.
      dadiDelPg: (pg, gruppo) => this.tavolo?.fonte({ pg, azione: null, privata: false, ...gruppo }) ?? null,
      log: o.log.child({ modulo: 'combattimento' }),
    });
  }

  /** Il set non SRD in uso (null = SRD 5.2). */
  private get generico(): { regole: RegoleCampagna; schede: ReadonlyMap<string, SchedaGenerica> } | null {
    return this.o.regole && !this.o.regole.regole.sistema.srd ? this.o.regole : null;
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
    if (!inScena.length) righe.push(testo('prove.arbitro.nessuno'));
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
      for (const a of azioni) {
        const d = decisioni.get(a.id);
        if (d?.tipo === 'attacco') continue;
        const att = attaccoDiRegole(a, ing);
        if (!att) continue;
        decisioni.set(a.id, { ...att, ...(this.generico ? { mossa: null } : {}) } as Decisione);
        this.o.log.warn({ turno, azione: a.id, arbitro: d?.tipo ?? null, bersaglio: att.bersaglio, arma: att.arma }, 'prove: clear attack, decided by the rules instead of the arbiter');
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
    if (!this.attivo || (!d.azioni.length && !this.inCombattimento)) return [];
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
    try {
      const r = this.passaRisolutore(turno, c, azioni, decisioni, { dadiDeiPg: tavolo });
      // Combattimento: si entra con un attacco; poi i turni dei PNG e i tiri contro la morte fino al prossimo PG.
      const attacchi = r.tiri.filter((t) => t.tipo === 'attacco' && t.bersaglio).map((t) => ({ chi: t.chi, bersaglio: t.bersaglio!.id }));
      // A check the Game Master asked (pseudo-action «m_…») is not the PC's action in the fight: it does not move whose turn it is.
      const comb = this.combattimento.dopoAzioni({ turno, attacchi, autori: azioni.filter((a) => !a.id.startsWith('m_')).map((a) => a.autore), candidati: () => this.candidati(c, attacchi) });
      r.fatti.push(...comb.fatti);
      r.tiri.push(...comb.tiri);
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
      nome: c.nome,
      esiste: (id) => c.campagna.pg.some((p) => p.id === id) || c.campagna.png.some((p) => p.id === id),
      atteggiamento: (png, pg) => this.atteggiamento(c.campagna, png, pg),
      conIndizi: this.o.conIndizi,
      condizioni: (id) => this.combattimento.condizioniDi(id),
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
      nome: c.nome,
      esiste: (id) => c.campagna.pg.some((p) => p.id === id) || c.campagna.png.some((p) => p.id === id),
      condizioni: (id) => this.combattimento.condizioniDi(id),
      log: this.o.log.child({ turno }),
    };
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
        return sch ? valoreCaratteristica(g.regole.sistema, sch, car) : 0;
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
    return [...pg, ...png];
  }

  /** Un PNG attacca un PG nel suo turno, con l'arma adatta alla fase (B/X: proiettili o mischia). */
  private attaccaPng(png: string, pg: string, fase: Fase, turno: number): { t: TiroMostrato; testo: string } | null {
    const c = this.o.contesto();
    const g = this.generico;
    const armi = (g ? g.schede.get(png)?.attacchi : this.o.schede.get(png)?.attacchi) ?? null;
    if (!armi) return null;
    // B/X: nella fase dei proiettili solo chi ha un'arma a distanza, in mischia solo le armi da mischia.
    const adatte = armi.filter((a) => (fase.png === 'attacco_distanza' ? a.distanza : fase.png === 'attacco_mischia' ? !a.distanza : true));
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
      schede: ids.flatMap((id) => {
        const pf = this.stato.puntiFerita(id);
        return pf ? [{ id, nome: c.nome(id), di_png: id.startsWith('png_'), pf }] : [];
      }),
      condizioni: this.regoleCombattimento().condizioni.map((x) => ({ id: x.id, nome: x.nome, icona: x.icona, testo: x.testo })),
    };
  }

  /** Ciò che serve al classificatore a regole (prove/classificatore-regole.ts). */
  private ingressoClassificatore(c: ContestoProve, altre: AzioneRisolvibile[] = []): IngressoClassificatore {
    const g = this.generico;
    // Set del manuale: le abilità con cui si attacca (mischia, distanza…), dalle armi delle schede. Non le
    // caratteristiche: «Forza» serve anche a spingere un masso.
    const attacchiPer = new Set(g ? [...g.schede.values()].flatMap((sch) => sch.attacchi.flatMap((a) => (a.abilita ? [a.abilita] : []))) : []);
    const sociale = g?.regole.sistema.sociale;
    return {
      ...(g ? { attacchiPer } : {}),
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
      // What the scene says about the conditions (prove/difficolta.ts): the last narration and the scene's description.
      scena: [...frasiDi(c.narrazione), ...frasiDi(typeof c.campagna.scena.dati['descrizione'] === 'string' ? c.campagna.scena.dati['descrizione'] : '')],
    };
  }

  get inCombattimento(): boolean {
    return this.attivo && this.combattimento.attivo;
  }

  /** PG che devono agire adesso nello scontro a turni (null = niente turni: decide il narratore). */
  turnoCombattimento(): string[] | null {
    return this.inCombattimento ? this.combattimento.turnoDi() : null;
  }

  vistaCombattimento(): CombattimentoPubblico | null {
    return this.inCombattimento ? this.combattimento.vista((id) => this.stato.puntiFerita(id)) : null;
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
    if (!this.combattimento.attivo) return false;
    this.combattimento.termina(motivo);
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
    if (v > 0) this.combattimento.dopoCura(id);
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
   * Carte pubbliche dell'ultimo turno con tiri (proiettore e telefoni). A card rolled at the table on request has no DC
   * here (manual rolls, docs/prove.md §8): the panel has it (`tiriDelMaster`).
   */
  tiriPubblici(): TiroMostrato[] {
    return (this.ultimoTurno?.tiri ?? []).filter((t) => !t.privata).map(cartaPerIlTavolo);
  }

  /** Carte di un'azione (anche privata): solo per il telefono del suo autore (without the DC of a manual roll). */
  tiriDellAzione(idAzione: string): TiroMostrato[] {
    return (this.ultimi.get(idAzione) ?? []).map(cartaPerIlTavolo);
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
    return { ...this.stato.esporta(this.dadi.seme, this.dadi.contatore), combattimento: this.combattimento.esporta() };
  }

  importa(s: StatoProveSalvato): void {
    this.stato.importa(s);
    this.combattimento.importa(s.combattimento ?? null);
    if (!this.o.dadi && s.seme && /^[0-9a-f]{8,128}$/i.test(s.seme)) this.dadi = this.nuoviDadi(s.seme, s.contatore ?? 0);
    const ultimo = s.recenti?.at(-1)?.turno;
    this.ultimoTurno = ultimo !== undefined ? { turno: ultimo, tiri: (s.recenti ?? []).filter((t) => t.turno === ultimo) } : null;
    this.o.log.info({ seme: this.dadi.seme, contatore: this.dadi.contatore, pf: s.pf }, 'prove: stato ripreso dalla sessione salvata');
  }

  /** Ricomincia: PF pieni, dadi con un seme nuovo, niente carte. */
  azzera(): void {
    this.stato.azzeraPf();
    this.combattimento.importa(null);
    this.intestazione = null;
    this.cache.clear();
    this.ultimi.clear();
    this.ultimoTurno = null;
    if (!this.o.dadi) this.dadi = this.nuoviDadi(this.o.seme);
  }
}
