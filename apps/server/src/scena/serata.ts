/**
 * La serata: «La volta scorsa…», il Diario, la durata e la chiusura guidata (docs/richieste-2026-11-09.md
 * §9, docs/strati.md «Riassunto e chiusura»). La regia le chiama in pochi punti; qui c'è lo stato.
 *
 * Quando si legge «La volta scorsa…» (sempre prima dell'apertura o della ripresa):
 * - pacchetto successivo SENZA `riassunto_iniziale` nel suo sessione.yaml (con il riassunto ci pensa già
 *   il caricatore): il riassunto dell'ultima serata del pacchetto prima (riassunto.yaml), o, se non c'è,
 *   quello che il modello scrive dalla sua trascrizione pubblica (trascrizione.yaml del registro);
 * - sessione ripresa dopo una serata chiusa con «Chiudi la sessione»: il riassunto di quella serata;
 * - sessione ripresa un'altra sera senza chiusura (oltre SERATA_NUOVA_MS dall'ultimo evento): il modello
 *   lo scrive dalla trascrizione pubblica ripresa.
 * Il modello lavora in sottofondo dall'avvio del server; se all'«Inizia» non ha ancora finito, si legge
 * la riserva (sessione/riassunto.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { DiarioPubblico, FineSerata, RiassuntoSerata, SerataMaster, VoceTrascrizione } from '@tabletop-ai-gm/shared';
import type { Campagna } from '../campagna/tipi';
import { FILE_SESSIONE } from '../campagna/pacchetti';
import type { Narratore } from '../llm/tipi';
import type { Logger } from '../logger';
import type { ParolaSegreta, StatoPubblico } from '../repertorio/segreti';
import { consiglioDiChiusura, DurataSerata, orePerSessioneDelBrief } from '../sessione/durata';
import { frasiLaVoltaScorsa, materialePubblico, riassuntiPrecedenti, riservaDa, scriviRiassunto, trascrizionePrecedente, type EsitoRiassunto } from '../sessione/riassunto';
import type { SerataSalvata } from '../sessione/tipi';

/** Una ripresa dopo tante ore senza chiusura è un'altra serata: si legge «La volta scorsa…». */
export const SERATA_NUOVA_MS = 3 * 3_600_000;

export interface OpzioniSerata {
  campagna: Campagna;
  narratore: Narratore | null;
  log: Logger;
  parole: () => ParolaSegreta[];
  pubblico: () => StatoPubblico | null;
}

export class SerataGuidata {
  readonly durata: DurataSerata;
  private riassunti: RiassuntoSerata[] = [];
  private chiusa = false;
  private oreMaster: number | null = null;
  /** Frasi di «La volta scorsa…» pronte per la prossima apertura o ripresa (null = niente). */
  private recap: { frasi: string[]; origine: string } | null = null;
  /** Il modello sta scrivendo il recap: la riserva da usare se all'«Inizia» non ha finito. */
  private recapInArrivo: { riserva: string } | null = null;
  /** Testo mostrato dal proiettore all'inizio della serata, fino alla prima finestra chiusa. */
  private mostrato: string | null = null;
  private fine: FineSerata | null = null;
  private chiusuraInCorso = false;
  /** Le serate chiuse dei pacchetti prima (lette una volta: lo stato del tavolo le chiede spesso). */
  private readonly precedenti: RiassuntoSerata[];

  constructor(private readonly o: OpzioniSerata) {
    this.durata = new DurataSerata(orePerSessioneDelBrief(o.campagna.cartella));
    this.precedenti = riassuntiPrecedenti(o.campagna);
  }

  // ------------------------------------------------------------------ «La volta scorsa…»

  /** All'avvio senza ripresa: un pacchetto dopo il primo, senza riassunto_iniziale, riprende la storia. */
  preparaPerPacchetto(): void {
    const p = this.o.campagna.pacchetto;
    if (!p || p.numero <= 1 || riassuntoIniziale(p.cartella)) return;
    const ultimo = this.precedenti.at(-1);
    if (ultimo) {
      this.recap = { frasi: frasiLaVoltaScorsa(ultimo.testo), origine: `riassunto della serata ${ultimo.etichetta}` };
      this.o.log.info({ pacchetto: p.etichetta, da: ultimo.etichetta }, 'serata: la volta scorsa dal riassunto del pacchetto prima');
      return;
    }
    this.daScrivere(trascrizionePrecedente(this.o.campagna), [], [], `pacchetto ${p.etichetta}`);
  }

  /**
   * Alla ripresa di una sessione: la serata chiusa riprende col suo riassunto; una sessione lasciata
   * aperta e ripresa dopo SERATA_NUOVA_MS fa scrivere il recap dalla trascrizione ripresa.
   */
  preparaPerRipresa(s: SerataSalvata | undefined, trascrizione: VoceTrascrizione[], ultimoEvento: string, adesso: number, scene: string[], segni: string[]): void {
    this.riassunti = [...(s?.riassunti ?? [])];
    this.chiusa = s?.chiusa === true;
    this.oreMaster = s?.oreMaster ?? null;
    if (this.oreMaster !== null) this.durata.imposta(this.oreMaster);
    const ultimo = this.riassunti.at(-1);
    if (this.chiusa && ultimo) {
      this.recap = { frasi: frasiLaVoltaScorsa(ultimo.testo), origine: 'serata chiusa' };
      this.o.log.info({ serata: ultimo.etichetta }, 'serata: la ripresa comincia col riassunto della serata chiusa');
      return;
    }
    const fermo = adesso - Date.parse(ultimoEvento);
    if (Number.isFinite(fermo) && fermo >= SERATA_NUOVA_MS) this.daScrivere(trascrizione, scene, segni, 'ripresa di un’altra sera');
  }

  /** Il modello scrive il recap in sottofondo; intanto la riserva è pronta. */
  private daScrivere(voci: VoceTrascrizione[], scene: string[], segni: string[], perché: string): void {
    const riserva = riservaDa({ scene, segni, parole: this.o.parole(), pubblico: this.o.pubblico() });
    this.recapInArrivo = { riserva };
    this.o.log.info({ perché, voci: voci.length }, 'serata: la volta scorsa, il modello la scrive in sottofondo');
    void scriviRiassunto({ narratore: this.o.narratore, log: this.o.log }, { materiale: materialePubblico(voci), parole: this.o.parole(), pubblico: this.o.pubblico(), riserva, turno: 0 }).then((r) => {
      if (!this.recapInArrivo) return; // già usata la riserva
      this.recapInArrivo = null;
      this.recap = { frasi: frasiLaVoltaScorsa(r.testo), origine: r.origine };
    });
  }

  /** Le frasi da leggere adesso (e consumate): il recap pronto, o la riserva se il modello non ha finito. */
  prendiLaVoltaScorsa(): string[] {
    let frasi: string[] = [];
    if (this.recap) {
      frasi = this.recap.frasi;
      this.o.log.info({ origine: this.recap.origine, frasi: frasi.length }, 'serata: si legge la volta scorsa');
    } else if (this.recapInArrivo) {
      frasi = frasiLaVoltaScorsa(this.recapInArrivo.riserva);
      this.o.log.warn({}, 'serata: il modello non ha finito il riassunto, si legge la riserva');
    }
    this.recap = null;
    this.recapInArrivo = null;
    this.mostrato = frasi.length ? frasi.join(' ') : null;
    return frasi;
  }

  /** La serata è stata chiusa: la ripresa passa dal riassunto (e la fine-serata sparisce). */
  get serataChiusa(): boolean {
    return this.chiusa;
  }

  /** Il gioco riparte (nuova serata): via la schermata di fine, la serata non è più chiusa. */
  riparte(adesso: number): void {
    this.chiusa = false;
    this.fine = null;
    this.durata.comincia(adesso);
  }

  /** La prima finestra della serata si è chiusa: il proiettore smette di mostrare «La volta scorsa…». */
  togliLaVoltaScorsa(): void {
    this.mostrato = null;
  }

  // ------------------------------------------------------------------ durata e preavviso

  /** Il consiglio per il messaggio del turno (null = niente: fine lontana, o climax). */
  consiglio(adesso: number, climax: boolean): string | null {
    return consiglioDiChiusura(this.durata.stato(adesso), climax);
  }

  impostaOre(ore: number): boolean {
    const ok = this.durata.imposta(ore);
    if (ok) this.oreMaster = this.durata.stato(0).ore;
    return ok;
  }

  // ------------------------------------------------------------------ chiusura guidata

  get inChiusura(): boolean {
    return this.chiusuraInCorso;
  }

  iniziaChiusura(): void {
    this.chiusuraInCorso = true;
  }

  /** Il riassunto della serata (modello + guardia, o riserva), dalla trascrizione pubblica. */
  async riassumi(voci: VoceTrascrizione[], scene: string[], segni: string[], turno: number): Promise<EsitoRiassunto> {
    const riserva = riservaDa({ scene, segni, parole: this.o.parole(), pubblico: this.o.pubblico() });
    return scriviRiassunto({ narratore: this.o.narratore, log: this.o.log }, { materiale: materialePubblico(voci), parole: this.o.parole(), pubblico: this.o.pubblico(), riserva, turno });
  }

  /** Fine della chiusura: la serata è chiusa, col suo riassunto (schermata del proiettore, Diario, ripresa). */
  chiudi(r: EsitoRiassunto, quando: string): RiassuntoSerata {
    const p = this.o.campagna.pacchetto;
    const s: RiassuntoSerata = {
      etichetta: p ? `Sessione ${p.etichetta}${this.riassunti.length ? `, serata ${this.riassunti.length + 1}` : ''}` : `Serata ${this.riassunti.length + 1}`,
      quando,
      testo: r.testo,
      fili: r.fili,
    };
    this.riassunti.push(s);
    this.fine = { riassunto: s, di_riserva: r.origine === 'riserva' };
    // La prossima serata di questa sessione (Riprendi, o ripresa dopo un riavvio) comincia da qui.
    this.recap = { frasi: frasiLaVoltaScorsa(s.testo), origine: 'serata chiusa' };
    this.chiusa = true;
    this.chiusuraInCorso = false;
    return s;
  }

  /** La chiusura non è andata (interrotta): si torna a giocare. */
  annullaChiusura(): void {
    this.chiusuraInCorso = false;
  }

  // ------------------------------------------------------------------ viste

  /** Per StatoTavolo: «la volta scorsa», la schermata di fine, il Diario (solo fatti pubblici). */
  pubblico(stasera: string[]): { la_volta_scorsa: string | null; fine_serata: FineSerata | null; diario: DiarioPubblico } {
    return {
      la_volta_scorsa: this.mostrato,
      fine_serata: this.fine,
      diario: { serate: [...this.precedenti, ...this.riassunti], stasera },
    };
  }

  /** Per il pannello del master. */
  master(adesso: number, climax: boolean, chiudibile: boolean): SerataMaster {
    const s = this.durata.stato(adesso);
    return {
      ore: s.ore,
      origine_ore: s.origine,
      minuti_passati: s.minutiPassati,
      minuti_rimasti: s.minutiRimasti,
      fine_vicina: s.fineVicina,
      climax,
      chiudibile: chiudibile && !this.chiusuraInCorso,
      chiusura_in_corso: this.chiusuraInCorso,
      chiusa: this.chiusa,
    };
  }

  esporta(): SerataSalvata {
    return { riassunti: [...this.riassunti], chiusa: this.chiusa, oreMaster: this.oreMaster };
  }
}

/** Il `riassunto_iniziale` del sessione.yaml di un pacchetto (vuoto = assente). */
function riassuntoIniziale(cartellaPacchetto: string): string {
  try {
    const d = YAML.parse(fs.readFileSync(path.join(cartellaPacchetto, FILE_SESSIONE), 'utf8')) as Record<string, unknown> | null;
    const r = d?.['riassunto_iniziale'];
    return typeof r === 'string' ? r.trim() : Array.isArray(r) ? r.join(' ').trim() : '';
  } catch {
    return '';
  }
}
