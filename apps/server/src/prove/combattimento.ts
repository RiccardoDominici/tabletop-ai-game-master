/**
 * Combattimento del Motore (docs/combattimento.md), guidato dalla sezione `combattimento:` del set.
 *
 * - Entra in combattimento quando un PG attacca un PNG con la scheda (o un PNG reagisce attaccando),
 *   oppure col pannello del master: PG al tavolo, PNG coinvolti e PNG ostili in scena con la scheda.
 * - Ordine dall'iniziativa del set: individuale (d20 + Destrezza nell'SRD, fissa), per schieramento
 *   (1d6 per parte, B/X, si ritira a ogni round), nessuna (PbtA: niente turni, solo PF e condizioni).
 * - Round = FASI ordinate; in ogni fase gli attori nell'ordine. Il PASSO corrente dice chi tocca:
 *   un passo di PG apre la finestra solo per loro; i passi dei PNG li esegue il Motore da solo
 *   (attacco al PG che li ha colpiti, se no a quello che ha agito per ultimo, se no al primo in piedi).
 * - A 0: condizione «Privo di sensi» e tiri contro la morte (SRD), oppure fuori gioco; morale (B/X).
 * - Fine: nemici a terra o fuggiti, PG tutti a terra, morale fallito, o il master.
 *
 * Tutto deterministico data la FonteDadi; lo stato si salva nella fotografia della sessione.
 */
import type { EsitoMorte } from './fatti-dovuti';
import type { CombattimentoPubblico, TiroMostrato } from '@tabletop-ai-gm/shared';
import type { Logger } from '../logger';
import type { Combattimento, Condizione, Effetto, Fase } from '../regole/combattimento';
import type { FonteDadi } from './dadi';
import type { StatoProve } from './stato';
import { testo } from '../lingua';
import { fraseAttaccoPng } from './testi';

export type Lato = 'pg' | 'png';
export type EsitoCombattente = 'in_gioco' | 'stabile' | 'morto' | 'fuggito';

export interface Partecipante {
  id: string;
  nome: string;
  lato: Lato;
  iniziativa: number | null;
  mod: number;
  /** Condizioni attive; `fino`: il round all'inizio del quale scade (null = finché non si toglie). */
  condizioni: Array<{ id: string; fino: number | null }>;
  tiriMorte: { successi: number; fallimenti: number } | null;
  esito: EsitoCombattente;
  /** L'ultimo PG che lo ha attaccato (bersaglio preferito del PNG). */
  aggressore: string | null;
}

export interface Passo {
  fase: Fase;
  lato: Lato;
  attori: string[];
}

export interface StatoCombattimentoSalvato {
  round: number;
  indice: number;
  partecipanti: Partecipante[];
  primo: Lato;
  passi: Passo[];
  moraleControllato: string[];
  ultimoPg: string | null;
}

/** Ciò che il Motore delle prove dà allo scontro (dadi, PF, attacchi coi resolver del set). */
export interface DipendenzeCombattimento {
  regole: Combattimento;
  stato: StatoProve;
  dadi: () => FonteDadi;
  nome: (id: string) => string;
  /** Un PNG attacca un PG nella fase (`png` della fase): carta + testo, già con i danni; null = niente. */
  attacca: (png: string, pg: string, fase: Fase, turno: number) => { t: TiroMostrato; testo: string } | null;
  /** Morale del PNG (scheda `morale`), per il set con `fine.morale`. */
  morale: (png: string) => number | null;
  nuovoIdTiro: () => string;
  log: Logger;
}

export interface EsitoCombattimento {
  /** Righe di fatto in più per il narratore (turni dei PNG, tiri contro la morte, morale, fine). */
  fatti: string[];
  tiri: TiroMostrato[];
  /** Situazione per il narratore: round, fase, ordine, chi tocca ora. null fuori dal combattimento. */
  intestazione: string | null;
  /** PG da invitare adesso (null = decide il narratore: niente iniziativa o combattimento finito). */
  invitati: string[] | null;
  /** Il combattimento è finito in questo turno (motivo), o null. */
  finito: string | null;
  /** Gli esiti dei tiri contro la morte del turno: fatti che il tavolo deve sentire (prove/fatti-dovuti.ts). */
  morte: Array<{ id: string; nome: string; esito: EsitoMorte }>;
  /** Chi è fuggito in questo turno (morale): lascia la scena, e il tavolo lo deve sentire. */
  fuggiti: Array<{ id: string; nome: string }>;
}

const VUOTO: EsitoCombattimento = { fatti: [], tiri: [], intestazione: null, invitati: null, finito: null, morte: [], fuggiti: [] };

export class GestoreCombattimento {
  private s: StatoCombattimentoSalvato | null = null;
  /** Esiti dei tiri contro la morte di questa chiamata di dopoAzioni (vanno nell'esito). */
  private morte: EsitoCombattimento['morte'] = [];
  /** Fughe di questa chiamata di dopoAzioni (vanno nell'esito). */
  private fuggiti: EsitoCombattimento['fuggiti'] = [];

  constructor(private readonly d: DipendenzeCombattimento) {}

  get attivo(): boolean {
    return this.s !== null;
  }

  /** Con un ordine di turni (iniziativa individuale o per schieramento). */
  get aTurni(): boolean {
    return this.s !== null && this.d.regole.iniziativa.tipo !== 'nessuna';
  }

  /** PG che devono agire adesso (passo corrente, in piedi), o null. */
  turnoDi(): string[] | null {
    if (!this.s || !this.aTurni) return null;
    const p = this.s.passi[this.s.indice];
    return p && p.lato === 'pg' ? p.attori.filter((id) => this.puoAgire(id)) : null;
  }

  private part(id: string): Partecipante | undefined {
    return this.s?.partecipanti.find((p) => p.id === id);
  }

  private cond(id: string): Condizione | undefined {
    return this.d.regole.condizioni.find((c) => c.id === id);
  }

  /** Condizioni attive di un personaggio, per i resolver (prove/condizioni.ts). */
  condizioniDi(id: string): Array<{ nome: string; effetti: Effetto[] }> {
    const p = this.part(id);
    if (!p) return [];
    return p.condizioni.flatMap((c) => {
      const x = this.cond(c.id);
      return x ? [{ nome: x.nome, effetti: x.effetti }] : [];
    });
  }

  private haEffetto(id: string, e: Effetto): string | null {
    return this.condizioniDi(id).find((c) => c.effetti.includes(e))?.nome ?? null;
  }

  private puoAgire(id: string): boolean {
    const p = this.part(id);
    return !!p && p.esito === 'in_gioco' && !this.d.stato.aTerra(id) && !this.haEffetto(id, 'perde_turno');
  }

  aggiungiCondizione(id: string, condizione: string, round: number | null = null): boolean {
    const p = this.part(id);
    if (!p || !this.cond(condizione)) return false;
    p.condizioni = [...p.condizioni.filter((c) => c.id !== condizione), { id: condizione, fino: round === null ? null : this.s!.round + round }];
    return true;
  }

  togliCondizione(id: string, condizione: string): boolean {
    const p = this.part(id);
    if (!p) return false;
    const prima = p.condizioni.length;
    p.condizioni = p.condizioni.filter((c) => c.id !== condizione);
    return p.condizioni.length !== prima;
  }

  // ------------------------------------------------------------------ inizio, ordine, passi

  /**
   * Il combattente esce: morto o fuggito, anche per lo stato delle prove (presenza, catalogo,
   * narratore: prove/stato.ts, fuoriGioco), che resta dopo la fine dello scontro.
   */
  private esce(p: Partecipante, esito: 'morto' | 'fuggito'): void {
    p.esito = esito;
    this.d.stato.segnaUscito(p.id, esito);
    if (esito === 'fuggito') this.fuggiti.push({ id: p.id, nome: p.nome });
    this.d.log.info({ id: p.id, esito }, 'combattimento: esce dallo scontro');
  }

  /**
   * Comincia lo scontro: tira l'iniziativa del set. Restituisce il fatto per il narratore; `dopo`
   * riceve i fatti di chi è già a 0 (l'attacco che ha aperto lo scontro): il morale (B/X).
   */
  inizia(candidati: Array<{ id: string; lato: Lato; mod: number }>, dopo: string[] = []): string {
    const r = this.d.regole;
    const dadi = this.d.dadi();
    const partecipanti: Partecipante[] = candidati.map((c) => ({
      id: c.id,
      nome: this.d.nome(c.id),
      lato: c.lato,
      mod: c.mod,
      iniziativa: r.iniziativa.tipo === 'individuale' ? dadi.tira(r.iniziativa.dado) + c.mod : null,
      condizioni: [],
      tiriMorte: null,
      esito: 'in_gioco',
      aggressore: null,
    }));
    if (r.iniziativa.tipo === 'individuale') GestoreCombattimento.ordina(partecipanti);
    this.s = { round: 1, indice: 0, partecipanti, primo: 'pg', passi: [], moraleControllato: [], ultimoPg: null };
    const lati = this.tiraLati();
    this.s.passi = this.costruisciPassi();
    // Chi va a 0 prima di cominciare (l'attacco che ha aperto lo scontro) ha già le sue condizioni.
    // La e2e finale: qui il morale si tirava senza i fatti, «CEDONO» si perdeva e chi fuggiva restava.
    for (const p of partecipanti) this.controllaZero(p, dopo);
    const ordine =
      r.iniziativa.tipo === 'individuale'
        ? testo('prove.combattimento.iniziativa', { ordine: partecipanti.map((p) => `${p.nome} ${p.iniziativa}`).join(', ') })
        : r.iniziativa.tipo === 'per_schieramento'
          ? testo('prove.combattimento.iniziativa_schieramento', { pg: lati!.pg, png: lati!.png, primo: testo(this.s.primo === 'pg' ? 'prove.combattimento.agiscono_prima_pg' : 'prove.combattimento.agiscono_prima_png') })
          : testo('prove.combattimento.senza_iniziativa');
    this.d.log.info({ partecipanti: partecipanti.map((p) => ({ id: p.id, lato: p.lato, iniziativa: p.iniziativa })), primo: this.s.primo }, 'combattimento: inizia');
    return testo('prove.combattimento.inizia', { ordine });
  }

  /** Iniziativa individuale: dal più alto; pari: modificatore più alto, poi i PG, poi l'id (deterministico). */
  private static ordina(partecipanti: Partecipante[]): void {
    partecipanti.sort((a, b) => b.iniziativa! - a.iniziativa! || b.mod - a.mod || (a.lato === b.lato ? 0 : a.lato === 'pg' ? -1 : 1) || a.id.localeCompare(b.id));
  }

  /**
   * Iniziativa individuale ritirata a ogni round (`ogni_round`, Basic Fantasy: 1d6 + Destrezza a ogni round):
   * prima si tirava una volta sola, e `ogni_round` valeva solo per schieramento. Morti e fuggiti non tirano.
   */
  private ritiraIndividuale(): string {
    const s = this.s!;
    const dadi = this.d.dadi();
    for (const p of s.partecipanti) p.iniziativa = p.esito === 'morto' || p.esito === 'fuggito' ? p.iniziativa : dadi.tira(this.d.regole.iniziativa.dado) + p.mod;
    GestoreCombattimento.ordina(s.partecipanti);
    const vivi = s.partecipanti.filter((p) => p.esito !== 'morto' && p.esito !== 'fuggito');
    this.d.log.info({ round: s.round, ordine: vivi.map((p) => ({ id: p.id, iniziativa: p.iniziativa })) }, 'combattimento: iniziativa ritirata');
    return testo('prove.combattimento.round_individuale', { round: s.round, ordine: vivi.map((p) => `${p.nome} ${p.iniziativa}`).join(', ') });
  }

  /** Per schieramento: un dado per parte, pari si ritira (al quinto pari, prima i PG). */
  private tiraLati(): { pg: number; png: number } | null {
    const r = this.d.regole;
    if (r.iniziativa.tipo !== 'per_schieramento' || !this.s) return null;
    const dadi = this.d.dadi();
    let pg = 0;
    let png = 0;
    for (let i = 0; i < 5 && pg === png; i++) {
      pg = dadi.tira(r.iniziativa.dado);
      png = dadi.tira(r.iniziativa.dado);
    }
    this.s.primo = png > pg ? 'png' : 'pg';
    return { pg, png };
  }

  /** I passi del round: fasi × ordine (individuale) o fasi × schieramenti (per schieramento). */
  private costruisciPassi(): Passo[] {
    const s = this.s!;
    const r = this.d.regole;
    const vivi = s.partecipanti.filter((p) => p.esito !== 'morto' && p.esito !== 'fuggito');
    const out: Passo[] = [];
    if (r.iniziativa.tipo === 'nessuna') return out;
    for (const fase of r.fasi) {
      if (r.iniziativa.tipo === 'individuale') {
        for (const p of vivi) out.push({ fase, lato: p.lato, attori: [p.id] });
      } else {
        for (const lato of s.primo === 'pg' ? (['pg', 'png'] as const) : (['png', 'pg'] as const)) {
          const attori = vivi.filter((p) => p.lato === lato).map((p) => p.id);
          if (attori.length) out.push({ fase, lato, attori });
        }
      }
    }
    return out;
  }

  /** Passo dopo; a fine round un round nuovo (iniziativa ritirata se il set lo vuole, condizioni scadute). */
  private avanza(fatti: string[]): void {
    const s = this.s!;
    s.indice += 1;
    if (s.indice < s.passi.length) return;
    s.round += 1;
    s.indice = 0;
    for (const p of s.partecipanti) {
      const scadute = p.condizioni.filter((c) => c.fino !== null && c.fino <= s.round);
      if (scadute.length) fatti.push(testo('prove.combattimento.finisce', { nome: p.nome, condizioni: scadute.map((c) => this.cond(c.id)?.nome ?? c.id).join(', ') }));
      p.condizioni = p.condizioni.filter((c) => !scadute.includes(c));
    }
    if (this.d.regole.iniziativa.ogniRound && this.d.regole.iniziativa.tipo === 'individuale') fatti.push(this.ritiraIndividuale());
    else if (this.d.regole.iniziativa.ogniRound) {
      const lati = this.tiraLati();
      if (lati) fatti.push(testo('prove.combattimento.round', { round: s.round, pg: lati.pg, png: lati.png, primo: testo(s.primo === 'pg' ? 'prove.combattimento.prima_pg' : 'prove.combattimento.prima_png') }));
    }
    s.passi = this.costruisciPassi();
  }

  // ------------------------------------------------------------------ dopo le azioni dei PG

  /**
   * Dopo la risoluzione delle azioni del turno: entra in combattimento se c'è stato un attacco,
   * registra chi ha attaccato chi, poi esegue i passi dei PNG (e i tiri contro la morte) fino al
   * prossimo passo di PG in piedi, o alla fine dello scontro.
   */
  dopoAzioni(o: {
    turno: number;
    /** Gli attacchi del turno (PG → PNG e PNG → PG), per entrare in combattimento e per i bersagli. */
    attacchi: Array<{ chi: string; bersaglio: string }>;
    /** PG che hanno agito in questo turno. */
    autori: string[];
    candidati: () => Array<{ id: string; lato: Lato; mod: number }>;
  }): EsitoCombattimento {
    const fatti: string[] = [];
    const tiri: TiroMostrato[] = [];
    this.morte = [];
    this.fuggiti = [];
    let appenaIniziato = false;
    if (!this.s) {
      if (!o.attacchi.length) return { ...VUOTO, morte: [], fuggiti: [] };
      const dopo: string[] = [];
      fatti.push(this.inizia(o.candidati(), dopo), ...dopo);
      appenaIniziato = true;
    }
    const s = this.s!;
    for (const a of o.attacchi) {
      const b = this.part(a.bersaglio);
      if (b && this.part(a.chi)?.lato === 'pg') b.aggressore = a.chi;
    }
    if (o.autori.length) s.ultimoPg = o.autori.at(-1)!;
    for (const p of s.partecipanti) this.controllaZero(p, fatti);
    if (!this.aTurni) {
      // Senza iniziativa niente turni: solo la fine dello scontro.
      this.controllaFine(fatti);
      return this.chiudi(o.turno, fatti, tiri);
    }
    // Il passo di PG appena giocato è consumato; appena iniziato si parte dal primo passo.
    if (!appenaIniziato) this.avanza(fatti);
    for (let guardia = 0; guardia < 60 && this.s; guardia++) {
      if (this.controllaFine(fatti)) break;
      const p = this.s.passi[this.s.indice];
      if (!p) {
        this.avanza(fatti);
        continue;
      }
      if (p.lato === 'png') {
        for (const id of p.attori) this.turnoPng(id, p.fase, o.turno, fatti, tiri);
        this.avanza(fatti);
        continue;
      }
      for (const id of p.attori) this.inizioTurnoPg(id, o.turno, fatti, tiri);
      if (this.controllaFine(fatti)) break;
      if (p.attori.some((id) => this.puoAgire(id))) break;
      this.avanza(fatti);
    }
    return this.chiudi(o.turno, fatti, tiri);
  }

  private chiudi(turno: number, fatti: string[], tiri: TiroMostrato[]): EsitoCombattimento {
    void turno;
    const { morte, fuggiti } = this;
    if (!this.s) return { fatti, tiri, intestazione: null, invitati: null, finito: fatti.at(-1) ?? testo('prove.combattimento.fine'), morte, fuggiti };
    const invitati = this.turnoDi();
    return { fatti, tiri, intestazione: this.intestazione(), invitati: invitati && invitati.length ? invitati : null, finito: null, morte, fuggiti };
  }

  /** Il PNG agisce da solo nella sua fase: attacca (se la fase lo prevede) il bersaglio scelto. */
  private turnoPng(id: string, fase: Fase, turno: number, fatti: string[], tiri: TiroMostrato[]): void {
    const p = this.part(id);
    if (!p || p.esito !== 'in_gioco' || this.d.stato.aTerra(id)) return;
    const perde = this.haEffetto(id, 'perde_turno');
    if (perde) {
      fatti.push(testo('prove.combattimento.png_non_agisce', { nome: p.nome, condizione: perde.toLowerCase() }));
      return;
    }
    if (!fase.png) return;
    const bersaglio = this.bersaglioDi(p);
    if (!bersaglio) return;
    const r = this.d.attacca(id, bersaglio, fase, turno);
    if (!r) return;
    tiri.push(r.t);
    fatti.push(testo('prove.combattimento.turno_png', { nome: p.nome, frase: fraseAttaccoPng(r.t), dettagli: r.testo }));
    const b = this.part(bersaglio);
    if (b) this.controllaZero(b, fatti);
  }

  /** Bersaglio del PNG: chi lo ha attaccato, se no il PG che ha agito per ultimo, se no il primo in piedi. */
  private bersaglioDi(p: Partecipante): string | null {
    const ok = (id: string | null): id is string => !!id && this.part(id)?.lato === 'pg' && this.part(id)!.esito === 'in_gioco' && !this.d.stato.aTerra(id);
    if (ok(p.aggressore)) return p.aggressore;
    if (ok(this.s!.ultimoPg)) return this.s!.ultimoPg;
    return this.s!.partecipanti.find((x) => ok(x.id))?.id ?? null;
  }

  /** Inizio del turno di un PG: tiro contro la morte se è a 0 (SRD), o il turno perso per una condizione. */
  private inizioTurnoPg(id: string, turno: number, fatti: string[], tiri: TiroMostrato[]): void {
    const p = this.part(id);
    if (!p || p.esito !== 'in_gioco') return;
    const tm = this.d.regole.danni.tiriMorte;
    if (this.d.stato.aTerra(id) && p.tiriMorte && tm) {
      const dado = this.d.dadi().tira(20);
      const riuscita = dado >= tm.cd;
      // Il 20 e l'1 naturali solo se il set li ha (SRD sì; Basic Fantasy no).
      const venti = dado === 20 && tm.ventiRialza;
      if (venti) {
        this.d.stato.cura(id, 1);
        p.tiriMorte = null;
        if (this.d.regole.condizioneAZero) this.togliCondizione(id, this.d.regole.condizioneAZero);
      } else if (dado === 1 && tm.unoDoppio) p.tiriMorte.fallimenti += 2;
      else if (riuscita) p.tiriMorte.successi += 1;
      else p.tiriMorte.fallimenti += 1;
      tiri.push(this.cartaMorte(p, dado, riuscita, turno, tm));
      let esito: string;
      let comeVa: EsitoMorte = 'morente';
      if (venti) {
        esito = testo('prove.combattimento.morte_venti');
        comeVa = 'rialzato';
      } else if (p.tiriMorte && p.tiriMorte.fallimenti >= tm.fallimenti) {
        this.esce(p, 'morto');
        esito = testo('prove.combattimento.morte_morto');
        comeVa = 'morto';
      } else if (p.tiriMorte && p.tiriMorte.successi >= tm.successi) {
        p.esito = 'stabile';
        p.tiriMorte = null;
        esito = testo('prove.combattimento.morte_stabile');
        comeVa = 'stabile';
      } else esito = testo('prove.combattimento.morte_parziale', { esito: testo(riuscita ? 'prove.combattimento.morte_riuscito' : 'prove.combattimento.morte_fallito'), successi: p.tiriMorte!.successi, fallimenti: p.tiriMorte!.fallimenti });
      fatti.push(testo('prove.combattimento.tiro_morte', { nome: p.nome, dado, cd: tm.cd, esito }));
      this.morte.push({ id: p.id, nome: p.nome, esito: comeVa });
      return;
    }
    const perde = this.haEffetto(id, 'perde_turno');
    if (perde && !this.d.stato.aTerra(id)) fatti.push(testo('prove.combattimento.salta_turno', { nome: p.nome, condizione: perde.toLowerCase() }));
  }

  private cartaMorte(p: Partecipante, dado: number, riuscita: boolean, turno: number, tm: NonNullable<Combattimento['danni']['tiriMorte']>): TiroMostrato {
    const cd = tm.cd;
    return {
      id: this.d.nuovoIdTiro(),
      turno,
      chi: p.id,
      nome: p.nome,
      di_png: false,
      tipo: 'salvezza',
      etichetta: testo('prove.combattimento.etichetta_morte'),
      dadi: [dado],
      dado,
      vantaggio: null,
      motivo_vantaggio: null,
      modificatore: 0,
      totale: dado,
      contro: { tipo: 'CD', valore: cd, descrizione: null },
      bersaglio: null,
      riuscita,
      // Sulla carta il 20 e l'1 sono speciali solo se il set dà loro un effetto.
      critico: dado === 20 && tm.ventiRialza,
      fallimento_critico: dado === 1 && tm.unoDoppio,
      danno: null,
      a_terra: true,
      privata: false,
      avversario: null,
    };
  }

  /** Chi è appena andato a 0: condizione del set, tiri contro la morte, oppure fuori gioco o morto. */
  private controllaZero(p: Partecipante, fatti?: string[]): void {
    if (p.esito !== 'in_gioco' || !this.d.stato.aTerra(p.id)) return;
    const r = this.d.regole;
    const cz = r.condizioneAZero;
    if (cz && !p.condizioni.some((c) => c.id === cz)) p.condizioni.push({ id: cz, fino: null });
    if (p.lato === 'pg') {
      if (r.danni.pgAZero === 'tiri_morte' && !p.tiriMorte) p.tiriMorte = { successi: 0, fallimenti: 0 };
      if (r.danni.pgAZero === 'morte') this.esce(p, 'morto');
    } else {
      // Fuori gioco: resta nello scontro a 0 (si vede «a terra»), non agisce più.
      if (r.danni.pngAZero === 'morte') this.esce(p, 'morto');
      this.controllaMorale(fatti ?? []);
    }
  }

  /** B/X: dopo il primo PNG caduto e a metà caduti, 2d6 contro il morale più basso; sopra, fuggono. */
  private controllaMorale(fatti: string[]): void {
    const s = this.s;
    if (!s || !this.d.regole.fine.morale) return;
    const png = s.partecipanti.filter((p) => p.lato === 'png');
    const caduti = png.filter((p) => p.esito === 'morto' || p.esito === 'fuggito' || this.d.stato.aTerra(p.id)).length;
    const soglia = caduti >= 1 && !s.moraleControllato.includes('primo') ? 'primo' : caduti * 2 >= png.length && !s.moraleControllato.includes('meta') ? 'meta' : null;
    const vivi = png.filter((p) => p.esito === 'in_gioco' && !this.d.stato.aTerra(p.id));
    if (!soglia || !vivi.length) return;
    s.moraleControllato.push(soglia);
    const morale = Math.min(...vivi.map((p) => this.d.morale(p.id) ?? 7));
    const dadi = this.d.dadi();
    const tiro = dadi.tira(6) + dadi.tira(6);
    if (tiro > morale) {
      for (const p of vivi) this.esce(p, 'fuggito');
      fatti.push(testo('prove.combattimento.morale_cedono', { tiro, morale, nomi: vivi.map((p) => p.nome).join(', ') }));
    } else fatti.push(testo('prove.combattimento.morale_tengono', { tiro, morale }));
  }

  /** Fine dello scontro: nemici fuori combattimento, o PG tutti a terra. true se è finito. */
  private controllaFine(fatti: string[]): boolean {
    const s = this.s;
    if (!s) return true;
    const fuori = (p: Partecipante): boolean => p.esito !== 'in_gioco' || this.d.stato.aTerra(p.id);
    const png = s.partecipanti.filter((p) => p.lato === 'png');
    const pg = s.partecipanti.filter((p) => p.lato === 'pg');
    if (png.length && png.every(fuori)) return this.termina(testo(png.some((p) => p.esito === 'fuggito') ? 'prove.combattimento.fine_fuggiti' : 'prove.combattimento.fine_nemici'), fatti);
    if (pg.length && pg.every(fuori)) return this.termina(testo('prove.combattimento.fine_pg'), fatti);
    return false;
  }

  /** Fine dello scontro (anche dal master). Le condizioni a 0 restano; le altre finiscono. */
  termina(motivo: string, fatti: string[] = []): true {
    if (this.s) {
      for (const p of this.s.partecipanti) p.condizioni = p.condizioni.filter((c) => c.id === this.d.regole.condizioneAZero && this.d.stato.aTerra(p.id));
      this.d.log.info({ motivo, round: this.s.round }, 'combattimento: finito');
    }
    fatti.push(testo('prove.combattimento.finito', { motivo }));
    this.s = null;
    return true;
  }

  /** Il master cambia i PF: chi torna sopra 0 si rialza (niente più tiri contro la morte). */
  dopoCura(id: string): void {
    const p = this.part(id);
    if (!p || this.d.stato.aTerra(id)) return;
    p.tiriMorte = null;
    if (p.esito === 'stabile') p.esito = 'in_gioco';
    if (this.d.regole.condizioneAZero) this.togliCondizione(id, this.d.regole.condizioneAZero);
  }

  // ------------------------------------------------------------------ narratore e schermi

  private intestazione(): string {
    const s = this.s!;
    const r = this.d.regole;
    if (r.iniziativa.tipo === 'nessuna') return testo('prove.combattimento.intestazione_senza');
    const p = s.passi[s.indice];
    const fase = r.fasi.length > 1 && p ? testo('prove.combattimento.intestazione_fase', { fase: p.fase.nome }) : '';
    const ordine = r.iniziativa.tipo === 'individuale' ? testo('prove.combattimento.intestazione_ordine', { ordine: s.partecipanti.filter((x) => x.esito !== 'morto' && x.esito !== 'fuggito').map((x) => x.nome).join(', ') }) : '';
    const ora = this.turnoDi() ?? [];
    const tocca = ora.length ? testo('prove.combattimento.intestazione_tocca', { chi: ora.map((id) => `${this.d.nome(id)} (${id})`).join(', '), pronome: testo(ora.length > 1 ? 'prove.combattimento.loro' : 'prove.combattimento.lui_o_lei') }) : '';
    return testo('prove.combattimento.intestazione', { round: s.round, fase, ordine, tocca });
  }

  vista(pf: (id: string) => { attuali: number; massimi: number } | null): CombattimentoPubblico | null {
    const s = this.s;
    if (!s) return null;
    const r = this.d.regole;
    const ora = new Set(this.turnoDi() ?? []);
    const passo = s.passi[s.indice];
    return {
      round: s.round,
      fase: r.fasi.length > 1 && passo ? passo.fase.nome : null,
      iniziativa: r.iniziativa.tipo,
      combattenti: s.partecipanti.map((p) => ({
        id: p.id,
        nome: p.nome,
        di_png: p.lato === 'png',
        iniziativa: p.iniziativa,
        corrente: ora.has(p.id) || (passo?.lato === 'png' && passo.attori.includes(p.id)),
        pf: pf(p.id),
        condizioni: p.condizioni.flatMap((c) => {
          const x = this.cond(c.id);
          return x ? [{ id: x.id, nome: x.nome, icona: x.icona }] : [];
        }),
        stato: p.esito === 'in_gioco' && this.d.stato.aTerra(p.id) ? 'a_terra' : p.esito,
        tiri_morte: p.tiriMorte ? { ...p.tiriMorte } : null,
      })),
      turno_di: [...ora],
      azioni: r.azioni.map((a) => ({ nome: a.nome, quante: a.quante })),
    };
  }

  esporta(): StatoCombattimentoSalvato | null {
    return this.s ? structuredClone(this.s) : null;
  }

  importa(s: StatoCombattimentoSalvato | null | undefined): void {
    this.s = s ? structuredClone(s) : null;
  }
}
