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
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { Logger } from '../logger';
import type { Orologio } from '../turni/orologio';
import type { SchedaNumerica } from '../campagna/schede';
import { proveDellaScena, type ProvaScena } from '../campagna/prove-scena';
import { nomeAbilita, nomeCaratteristica } from '../campagna/regole-srd';
import { testo } from '../lingua';
import { nomeOppure } from './lingua';
import { DadiCrittografici, type FonteDadi } from './dadi';
import { risolviTurno, type Atteggiamento, type AzioneRisolvibile } from './risolutore';
import { StatoProve, type StatoProveSalvato } from './stato';
import type { ArbitroProve, AzioneDaClassificare, DecisioneProva, DecisioneRegole, EsitoTurnoProve, IngressoArbitroProve } from './tipi';
import type { RegoleCampagna, SchedaGenerica } from '../regole/tipi';
import { proveScenaRegole, risolviTurnoRegole } from './risolutore-regole';
import { regolePerNarratore } from '../regole/narratore';
import { regolaEsiti } from './testi';
import { GestoreCombattimento } from './combattimento';
import { attaccoDiRegole, classificaARegole, provaSocialeSrd, type IngressoClassificatore } from './classificatore-regole';
import { combattimentoSrd, type Combattimento, type Fase } from '../regole/combattimento';
import { strumentiRegole } from './risolutore-regole';
import { attaccoPngSrd } from './risolutore';
import { valoreCaratteristica } from '../regole/schede';
import { comeCaratteristica } from '../campagna/regole-srd';
import { modCaratteristica } from '../campagna/schede';
import type { CombattimentoMaster, CombattimentoPubblico } from '@tabletop-ai-gm/shared';

/** Decisione dell'arbitro: SRD 5.2, o col vocabolario del set del manuale. */
type Decisione = DecisioneProva | DecisioneRegole;

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
   */
  async risolvi(turno: number, azioni: AzionePerProve[]): Promise<EsitoTurnoProve> {
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
        this.o.log.info({ turno, azioni: senza.map((a) => ({ id: a.id, tipo: decisioni.get(a.id)?.tipo, abilita: decisioni.get(a.id)?.abilita })) }, 'prove: decisioni a regole (riserva senza modello)');
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
        this.o.log.warn({ turno, azione: a.id, arbitro: d?.tipo ?? null, bersaglio: att.bersaglio, arma: att.arma }, "prove: attacco chiaro, deciso a regole al posto dell'arbitro");
      }
    }
    const attesa_ms = Math.round(this.o.orologio.ora() - t0);
    if (!this.attivo) return { turno, perAzione: new Map(), tiri: [], fatti: [], fattiPrivati: [], attesa_ms, tardive, combattimento: null };

    // Nello scontro a turni i PNG agiscono nel loro turno: niente reazioni in più dall'arbitro
    // (la e2e del 10 novembre: Ruggero colpiva due volte per round, di reazione e di turno).
    if (this.combattimento.aTurni) for (const [id, d] of decisioni) if (d?.reazione) decisioni.set(id, { ...d, reazione: null } as Decisione);
    const g = this.generico;
    const r = g ? risolviTurnoRegole({ ...this.opzioniRegole(turno, c, g), azioni, decisioni: decisioni as Map<string, DecisioneRegole | null> }) : risolviTurno({ ...this.opzioniSrd(turno, c), azioni, decisioni: decisioni as Map<string, DecisioneProva | null> });
    // Combattimento: si entra con un attacco; poi i turni dei PNG e i tiri contro la morte fino al prossimo PG.
    const attacchi = r.tiri.filter((t) => t.tipo === 'attacco' && t.bersaglio).map((t) => ({ chi: t.chi, bersaglio: t.bersaglio!.id }));
    const comb = this.combattimento.dopoAzioni({ turno, attacchi, autori: azioni.map((a) => a.autore), candidati: () => this.candidati(c, attacchi) });
    r.fatti.push(...comb.fatti);
    r.tiri.push(...comb.tiri);
    this.intestazione = comb.intestazione;
    this.stato.registraTiri(r.tiri);
    this.ultimi = new Map([...r.perAzione].map(([id, e]) => [id, e.tiri]));
    this.ultimoTurno = { turno, tiri: r.tiri };
    for (const a of azioni) this.cache.delete(a.id);
    this.o.log.info({ turno, attesa_ms, tardive, tiri: r.tiri.length, seme: this.dadi.seme, contatore: this.dadi.contatore }, 'prove: turno risolto');
    return { ...r, attesa_ms, tardive, combattimento: comb };
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

  /** Atteggiamento del PNG verso il PG dalla scheda (atteggiamento_pg.<pg>.stato). */
  atteggiamento(c: Campagna, png: string, pg: string): Atteggiamento | null {
    const p = c.png.find((x) => x.id === png);
    const a = (p?.dati['atteggiamento_pg'] as DatiYaml | undefined)?.[pg] as DatiYaml | undefined;
    const s = typeof a?.['stato'] === 'string' ? a['stato'].toLowerCase() : null;
    return s === 'ostile' || s === 'indifferente' || s === 'amichevole' ? s : null;
  }

  // ------------------------------------------------------------------ per il trasporto

  /** Carte pubbliche dell'ultimo turno con tiri (proiettore e telefoni). */
  tiriPubblici(): TiroMostrato[] {
    return (this.ultimoTurno?.tiri ?? []).filter((t) => !t.privata);
  }

  /** Carte di un'azione (anche privata): solo per il telefono del suo autore. */
  tiriDellAzione(idAzione: string): TiroMostrato[] {
    return this.ultimi.get(idAzione) ?? [];
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
