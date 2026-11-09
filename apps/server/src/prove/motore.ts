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
import type { TiroMostrato } from '@cantastorie/shared';
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { Logger } from '../logger';
import type { Orologio } from '../turni/orologio';
import type { SchedaNumerica } from '../campagna/schede';
import { proveDellaScena, type ProvaScena } from '../campagna/prove-scena';
import { NOME_ABILITA, NOME_CARATTERISTICA } from '../campagna/regole-srd';
import { DadiCrittografici, type FonteDadi } from './dadi';
import { risolviTurno, type Atteggiamento, type AzioneRisolvibile } from './risolutore';
import { StatoProve, type StatoProveSalvato } from './stato';
import type { ArbitroProve, AzioneDaClassificare, DecisioneProva, DecisioneRegole, EsitoTurnoProve, IngressoArbitroProve } from './tipi';
import type { RegoleCampagna, SchedaGenerica } from '../regole/tipi';
import { proveScenaRegole, risolviTurnoRegole } from './risolutore-regole';

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
  /** Seme fissato (CANTASTORIE_SEME_DADI): riproduce una partita. */
  seme?: string;
  /** Quanto aspettare alla chiusura le decisioni in volo o tardive (default 4 s). */
  attesaMaxMs?: number;
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
  private readonly cache = new Map<string, VoceCache>();
  /** Esiti dell'ultimo turno con tiri, per azione (le carte dell'azione privata vanno al suo telefono). */
  private ultimi = new Map<string, TiroMostrato[]>();
  private ultimoTurno: { turno: number; tiri: TiroMostrato[] } | null = null;

  constructor(private readonly o: OpzioniMotoreProve) {
    this.stato = new StatoProve(this.generico ? this.generico.schede : o.schede);
    this.dadi = o.dadi ?? this.nuoviDadi(o.seme);
  }

  /** Il set non SRD in uso (null = SRD 5.2). */
  private get generico(): { regole: RegoleCampagna; schede: ReadonlyMap<string, SchedaGenerica> } | null {
    return this.o.regole && !this.o.regole.regole.sistema.srd ? this.o.regole : null;
  }

  /** Armi di un personaggio per l'arbitro (id, e se a distanza nell'SRD). */
  private armi(id: string): string[] | null {
    const g = this.generico;
    if (g) return g.schede.get(id)?.attacchi.map((a) => a.id) ?? null;
    return this.o.schede.get(id)?.attacchi.map((a) => `${a.id}${a.distanza ? ' (a distanza)' : ''}`) ?? null;
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

  /** Righe dei personaggi per l'arbitro: id, nome, armi, atteggiamenti, chi è a terra. */
  righePersonaggi(c: ContestoProve): string {
    const righe: string[] = ['PG al tavolo:'];
    for (const id of c.pgAlTavolo) {
      const a = this.armi(id);
      const armi = a?.join(', ');
      righe.push(`- ${id} = ${c.nome(id)}${a ? ` · armi: ${armi || 'nessuna (mani nude)'}` : ' · senza scheda'}${this.stato.aTerra(id) ? ' · A TERRA' : ''}`);
    }
    const presenti = new Set(c.campagna.scena.png_presenti);
    const inScena = c.campagna.png.filter((p) => presenti.has(p.id));
    righe.push('PNG in scena:');
    for (const p of inScena) {
      const s = this.o.schede.get(p.id);
      const att = c.pgAlTavolo
        .map((pg) => [pg, this.atteggiamento(c.campagna, p.id, pg)] as const)
        .filter(([, a]) => a)
        .map(([pg, a]) => `${pg} ${a}`)
        .join(', ');
      const armi = s?.attacchi.map((a) => a.id).join(', ');
      righe.push(`- ${p.id} = ${p.nome}${att ? ` · verso i PG: ${att}` : ''}${s ? ` · armi: ${armi || 'nessuna'}` : ''}${this.stato.aTerra(p.id) ? ' · A TERRA' : ''}`);
    }
    if (!inScena.length) righe.push('(nessuno)');
    const altrove = c.campagna.png.filter((p) => !presenti.has(p.id));
    if (altrove.length) righe.push(`Altri PNG (non in scena): ${altrove.map((p) => `${p.id} = ${p.nome}`).join('; ')}`);
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
        : prove.map((p) => `- ${p.id} · ${p.quando} · ${p.salvezza ? `tiro salvezza su ${NOME_CARATTERISTICA[p.caratteristica!]}` : p.abilita ? NOME_ABILITA[p.abilita] : NOME_CARATTERISTICA[p.caratteristica!]}`).join('\n'),
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
    }
    const attesa_ms = Math.round(this.o.orologio.ora() - t0);
    if (!this.attivo) return { turno, perAzione: new Map(), tiri: [], fatti: [], attesa_ms, tardive };

    const g = this.generico;
    const esiste = (id: string): boolean => c.campagna.pg.some((p) => p.id === id) || c.campagna.png.some((p) => p.id === id);
    const r = g
      ? risolviTurnoRegole({
          turno,
          azioni,
          decisioni: decisioni as Map<string, DecisioneRegole | null>,
          sistema: g.regole.sistema,
          schede: g.schede,
          stato: this.stato,
          dadi: this.dadi,
          proveScena: proveScenaRegole(g.regole.sistema, c.campagna),
          nome: c.nome,
          esiste,
          log: this.o.log.child({ turno }),
        })
      : risolviTurno({
      turno,
      azioni,
      decisioni: decisioni as Map<string, DecisioneProva | null>,
      schede: this.o.schede,
      stato: this.stato,
      dadi: this.dadi,
      proveScena: this.proveScena(c.campagna),
      nome: c.nome,
      esiste: (id) => c.campagna.pg.some((p) => p.id === id) || c.campagna.png.some((p) => p.id === id),
      atteggiamento: (png, pg) => this.atteggiamento(c.campagna, png, pg),
      conIndizi: this.o.conIndizi,
      log: this.o.log.child({ turno }),
    });
    this.stato.registraTiri(r.tiri);
    this.ultimi = new Map([...r.perAzione].map(([id, e]) => [id, e.tiri]));
    this.ultimoTurno = { turno, tiri: r.tiri };
    for (const a of azioni) this.cache.delete(a.id);
    this.o.log.info({ turno, attesa_ms, tardive, tiri: r.tiri.length, seme: this.dadi.seme, contatore: this.dadi.contatore }, 'prove: turno risolto');
    return { ...r, attesa_ms, tardive };
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
    return this.stato.esporta(this.dadi.seme, this.dadi.contatore);
  }

  importa(s: StatoProveSalvato): void {
    this.stato.importa(s);
    if (!this.o.dadi && s.seme && /^[0-9a-f]{8,128}$/i.test(s.seme)) this.dadi = this.nuoviDadi(s.seme, s.contatore ?? 0);
    const ultimo = s.recenti?.at(-1)?.turno;
    this.ultimoTurno = ultimo !== undefined ? { turno: ultimo, tiri: (s.recenti ?? []).filter((t) => t.turno === ultimo) } : null;
    this.o.log.info({ seme: this.dadi.seme, contatore: this.dadi.contatore, pf: s.pf }, 'prove: stato ripreso dalla sessione salvata');
  }

  /** Ricomincia: PF pieni, dadi con un seme nuovo, niente carte. */
  azzera(): void {
    this.stato.azzeraPf();
    this.cache.clear();
    this.ultimi.clear();
    this.ultimoTurno = null;
    if (!this.o.dadi) this.dadi = this.nuoviDadi(this.o.seme);
  }
}
