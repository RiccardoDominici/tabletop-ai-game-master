/**
 * Regia della scena (F0): l'unico «scrittore» dello stato del tavolo e del ciclo dei turni.
 *
 *   attesa ──(schermo: Inizia sessione)──▶ apertura ──(audio finito)──▶ finestra
 *   finestra ──(tutti pronti | 10 s dopo la prima azione | master)──▶ narrazione
 *   narrazione ──(LLM finito + voce finita + audio suonato)──▶ finestra (turno+1)
 *   qualsiasi ──(ferma)──▶ fermata ──(ricomincia)──▶ apertura
 *
 * Pannello del master (master/comandi.ts):
 *   finestra ──(pausa)──▶ pausa (finestra sospesa) ──(riprendi)──▶ finestra
 *   apertura | narrazione ──(pausa)──▶ …la narrazione finisce… ──▶ pausa ──(riprendi)──▶ finestra
 *   apertura | narrazione ──(ferma la narrazione: LLM + voce interrotti)──▶ pausa
 *
 * Le misure di latenza di ogni turno partono da t0 = chiusura della finestra e finiscono in
 * logs/turni.jsonl; il costo di ogni chiamata in logs/costi.jsonl.
 *
 * Ogni flusso asincrono controlla `epoca`: ferma/ricomincia la incrementano e i flussi vecchi,
 * al risveglio da un await, si accorgono di essere superati ed escono senza toccare lo stato.
 */
import type {
  AzionePrivata,
  Esito,
  FaseScena,
  MisureTurno,
  SchermoAudioFinito,
  SchedaPg,
  SchermoAudioIniziato,
  StatoTavolo,
  VoceTrascrizione,
} from '@cantastorie/shared';
import { schedaPg } from '../campagna/scheda';
import type { Campagna } from '../campagna/tipi';
import { ID_NARRATORE, NOME_NARRATORE, conScena } from '../campagna/tipi';
import { nomeBreve } from '../campagna/nomi';
import { collegaSituazioni, type SituazioneCollegata } from '../campagna/situazioni';
import type { Logger } from '../logger';
import type { Narratore } from '../llm/tipi';
import { MisuratoreTurno } from '../metriche/misure';
import type { RegistroJsonl } from '../metriche/jsonl';
import { compilaMessaggioTurno } from '../narrazione/messaggio';
import type { Orologio } from '../turni/orologio';
import { azioniPerNarratore } from '../azioni/narratore';
import type { CatalogoImmagini } from '../campagna/immagini';
import { TavoloAzioni, type RiepilogoChiusura } from '../azioni/tavolo';
import type { Arbitro, Azione } from '../azioni/tipi';
import { narraTurno, type EsitoUsaTurno, type VoceUscita } from '../turni/narrazione';
import { messaggioRiparazione } from '../narrazione/messaggio';
import { normalizza } from '../azioni/regole';
import { nomiDeiPng } from '../repertorio/pertinenza';
import { sommaCosti } from '../llm/costi';
import type { Repertorio } from '../repertorio/tipi';
import { StatoRepertorio, haCancelloAzione, rispondeA } from '../repertorio/stato';
import { righeMenzogneDette } from '../repertorio/menzogne';
import { segretiNelTesto, type ParolaSegreta, type StatoPubblico } from '../repertorio/segreti';
import { CacheAudio, chiaveAudio, testoPerVoce } from '../voce/cache-audio';
import { voceDi } from '../turni/narrazione';
import { PipelineVoce, type UscitaAudio } from '../voce/pipeline';
import { creaPronunciatore, type Pronunciatore } from '../voce/pronuncia';
import type { SelettoreVoce } from '../voce/selettore';
import { StatoOrologi, type EsitoAvanzamento, type Orologio as OrologioMinaccia } from './orologi';
import { NoteRegia } from '../master/note';
import { sezioneNoteRegia } from '../narrazione/messaggio';

export interface OpzioniRegia {
  campagna: Campagna;
  /** Blocchi di sistema stabili: [prompt del narratore, contesto della campagna]. */
  sistema: string[];
  narratore: Narratore;
  voce: SelettoreVoce;
  uscitaAudio: UscitaAudio;
  orologio: Orologio;
  log: Logger;
  registroTurni: RegistroJsonl;
  registroCosti: RegistroJsonl;
  /** Una riga per turno: azioni, testo grezzo del narratore, invito, orologi, anomalie. */
  registroNarrazioni: RegistroJsonl;
  chiusuraDopoPrimaAzioneMs: number;
  margineFineAudioMs: number;
  trascrizioneMax: number;
  preriscalda: boolean;
  /** A = 'improvvisa' (F0), B = 'repertorio' (battute pre-scritte scelte da Haiku). */
  modo: 'improvvisa' | 'repertorio';
  /** Modalità repertorio: battute, parole segrete (controllo dei contesti), audio pre-generato. */
  repertorio?: Repertorio;
  paroleSegrete?: ParolaSegreta[];
  cacheAudio?: CacheAudio;
  /** Esperimenti: la finestra si apre sempre per tutti i PG al tavolo (l'invito resta nel log). */
  finestraATutti?: boolean;
  /** Arbitro delle azioni simultanee (null = solo regole). */
  arbitro?: Arbitro | null;
  /** Riassunto pubblico della scena per l'arbitro. */
  scenaPubblica?: string;
  /**
   * Campagne con più scene: blocchi di sistema e riassunto pubblico per una scena (la campagna
   * passata ha quella scena come corrente). Senza, il cambio di scena tiene quelli iniziali.
   */
  sistemaPer?: (campagna: Campagna) => string[];
  scenaPubblicaPer?: (campagna: Campagna) => string;
  /** Immagini dei luoghi e ritratti dei PNG per il proiettore. */
  immagini?: CatalogoImmagini;
  /** Silenzio che fa scattare la mossa contro lo stallo (default 45 s; 0 = mai). */
  stalloMs?: number;
}

/** Motivi mostrati al giocatore quando il master tocca la sua azione. */
export const MOTIVO_SALTATA = 'Il master ha saltato questa azione: puoi riscriverla.';
export const MOTIVO_NARRAZIONE_INTERROTTA = 'Il master ha interrotto la narrazione: la tua azione non è stata risolta, puoi rimandarla.';
export const MOTIVO_CAMBIO_SCENA = 'Si cambia scena: la tua azione era per il luogo di prima, riscrivila se vale ancora.';

/** Ascoltatori del trasporto (Socket.IO). */
export interface UscitaRegia {
  stato(stato: StatoTavolo): void;
  azioneMia(id_pg: string, azione: AzionePrivata | null): void;
  metriche(misure: MisureTurno): void;
  avviso(livello: 'info' | 'errore', testo: string): void;
}

interface AttesaAudio {
  turno: number;
  risolvi: (fine: number | null) => void;
  timer: (() => void) | null;
}

export { nomeBreve };

export class Regia {
  private readonly o: OpzioniRegia;
  private readonly pipeline: PipelineVoce;
  private readonly pronuncia: Pronunciatore;
  private orologi: StatoOrologi;
  /** Stato del repertorio (solo in modalità repertorio). */
  private statoRepertorio: StatoRepertorio | null = null;
  /** Battute mostrate al selettore in questo turno: un [usa] fuori elenco si rifiuta. */
  private elencoTurno = new Set<string>();
  /** B2: azioni del turno per autore (chi può ricevere una battuta, e se privata), stallo, segno dovuto. */
  private turnoB: { azioni: Map<string, { id: string; privata: boolean }>; stallo: boolean; segnoDovuto: boolean } | null = null;
  /** Nomi dei PNG e soprannomi, per la pertinenza del catalogo. */
  private readonly nomiPng: Map<string, string[]>;
  /** Luogo corrente (id della scena o del nodo): sceglie l'immagine del proiettore. */
  private luogo: string;
  /** La campagna vista dalla scena in corso (conScena): contesto, orologi attivi, immagini. */
  private campagna: Campagna;
  /** Blocchi di sistema della scena in corso (prompt + contesto), in cache. */
  private sistema: string[];
  /** Riassunto pubblico della scena in corso, per l'arbitro. */
  private scenaPubblica: string;
  /** Immagini di situazione della campagna, con la rivelazione che le fa comparire. */
  private readonly situazioni: SituazioneCollegata[];
  /**
   * Situazione sul proiettore al posto del luogo. `auto`: messa dal Motore dopo una rivelazione,
   * resta finché i giocatori reagiscono (si toglie quando parte la narrazione successiva); quelle
   * del master restano finché lui non le toglie o cambia luogo.
   */
  private situazione: { id: string; url: string; auto: boolean; turno: number } | null = null;
  /** Situazioni già mostrate in automatico (una volta sola ciascuna). */
  private readonly situazioniMostrate = new Set<string>();
  /** Indizi e battute usciti nella narrazione in corso (per le situazioni). */
  private rivelateNelTurno: string[] = [];
  /** Stalli di fila (S1, S2, S3…): si azzera appena qualcuno agisce. */
  private stalliDiFila = 0;
  private uscita: UscitaRegia | null = null;

  private fase: FaseScena = 'attesa';
  private turno = 0;
  private versioneScena = 0;
  private versioneStato = 0;
  private epoca = 0;
  private trascrizione: VoceTrascrizione[] = [];
  private prossimoIdTrascrizione = 1;
  /** Voce di trascrizione aperta per segmento del turno corrente (per unire le frasi). */
  private segmentiAperti = new Map<string, VoceTrascrizione>();

  /** Azioni dei giocatori e finestra (docs/azioni-concorrenti.md). */
  private readonly tavolo: TavoloAzioni;
  private controlloLlm: AbortController | null = null;
  private misuratore: MisuratoreTurno | null = null;
  /** Primo pezzo d'audio inviato nel turno corrente (stima della fine se lo schermo tace). */
  private primoAudioInviato = new Map<number, number>();
  private attesaAudio: AttesaAudio | null = null;
  /** Id della scena in corso (ISO dell'avvio): raggruppa le righe di narrazioni.jsonl. */
  private sessione = '';

  /** socket.id → id_pg scelto. */
  private telefoni = new Map<string, string>();
  /** socket.id degli schermi che hanno sbloccato l'audio. */
  private schermi = new Set<string>();

  /** Il master ha chiesto la pausa: a fine narrazione non si apre la finestra. */
  private pausaRichiesta = false;
  /** In pausa dopo una narrazione: l'invito da usare quando il master riprende. */
  private invitoSospeso: string[] | 'tutti' | null = null;
  /** Note di regia del master: entrano nel messaggio dei prossimi turni. */
  readonly note = new NoteRegia();
  /** Chi vuole sapere di ogni cambiamento (il pannello del master). */
  private readonly ascoltatori = new Set<() => void>();

  constructor(opzioni: OpzioniRegia) {
    this.o = opzioni;
    this.campagna = opzioni.campagna;
    this.sistema = opzioni.sistema;
    this.scenaPubblica = opzioni.scenaPubblica ?? '';
    this.situazioni = opzioni.immagini ? collegaSituazioni(opzioni.campagna, opzioni.immagini.situazioni(opzioni.campagna.png.map((p) => p.id))) : [];
    if (this.situazioni.length) opzioni.log.info({ situazioni: this.situazioni.map((x) => ({ id: x.id, dopo: x.dopo })) }, 'immagini: situazioni e rivelazioni');
    this.pronuncia = creaPronunciatore(opzioni.campagna);
    this.orologi = new StatoOrologi(opzioni.campagna);
    this.nomiPng = nomiDeiPng(opzioni.campagna);
    this.luogo = opzioni.campagna.scena.id;
    this.statoRepertorio = this.nuovoStatoRepertorio();
    this.pipeline = new PipelineVoce({
      motore: () => this.o.voce.attivo,
      uscita: opzioni.uscitaAudio,
      log: opzioni.log.child({ modulo: 'voce' }),
      ...(opzioni.cacheAudio ? { cache: opzioni.cacheAudio } : {}),
      osservatore: {
        richiesta: (f) => {
          if (f.turno === this.misuratore?.turno) this.misuratore.segna('voce_richiesta', this.o.orologio.ora());
        },
        primoAudio: (f) => {
          const ora = this.o.orologio.ora();
          if (!this.primoAudioInviato.has(f.turno)) this.primoAudioInviato.set(f.turno, ora);
          if (f.turno === this.misuratore?.turno) this.misuratore.segna('voce_primo_audio', ora);
        },
      },
    });
    this.o.voce.onCambio(() => this.notifica());
    const nomi = new Map<string, string>();
    for (const [alias, id] of Object.entries(opzioni.campagna.alias)) if (opzioni.campagna.pg.some((p) => p.id === id)) nomi.set(alias, id);
    this.tavolo = new TavoloAzioni({
      giocatori: () => this.pgAlTavolo(),
      nomePg: (id) => this.nomePg(id),
      nomeBreve: (id) => nomeBreve(this.nomePg(id)),
      nomi,
      orologio: opzioni.orologio,
      arbitro: opzioni.arbitro ?? null,
      contesto: () => ({ narrazione: this.ultimaNarrazione(), scena: this.scenaPubblica }),
      log: opzioni.log.child({ modulo: 'azioni' }),
      chiusuraDopoPrimaAzioneMs: opzioni.chiusuraDopoPrimaAzioneMs,
      ...(opzioni.stalloMs !== undefined ? { stalloMs: opzioni.stalloMs } : {}),
      onCambio: () => this.notifica(),
      onAzione: (id_pg, a) => this.uscita?.azioneMia(id_pg, a),
      onChiusura: (r) => this.finestraChiusa(r),
    });
  }

  /** Immagine del luogo, ritratti e immagini da precaricare (luoghi collegati, ritratti dei presenti). */
  private immaginiPubbliche(): { luogo: string; immagine: string | null; ritratti: Record<string, string>; situazione: string | null; prossime: string[] } {
    const img = this.o.immagini;
    const ritratti: Record<string, string> = {};
    for (const p of this.campagna.png) {
      const u = img?.ritratto(p.id);
      if (u) ritratti[p.id] = u;
    }
    const immagine = img?.luogo(this.luogo) ?? null;
    // Prossime: i ritratti dei PNG presenti, poi i luoghi collegati al nodo della scena.
    const nodo = typeof this.campagna.scena.dati['nodo'] === 'string' ? (this.campagna.scena.dati['nodo'] as string) : null;
    const nodi = (this.campagna.campagnaNarratore['nodi'] as Array<Record<string, unknown>> | undefined) ?? [];
    const collegati = (nodi.find((n) => n['id'] === nodo)?.['collegamenti'] as string[] | undefined) ?? [];
    // Scene vicine (campagne con più scene): quelle il cui nodo è un'uscita o un collegamento di questa.
    const uscite = ((this.campagna.scena.dati['uscite'] as Array<Record<string, unknown>> | undefined) ?? []).map((u) => u?.['verso']);
    const vicine = this.o.campagna.scene.filter((s) => s.id !== this.campagna.scena.id && [...collegati, ...uscite].includes(s.dati['nodo'])).map((s) => s.id);
    const prossime = [
      ...this.campagna.scena.png_presenti.map((id) => ritratti[id]),
      ...[this.campagna.scena.id, ...vicine, ...collegati].filter((l) => l !== this.luogo).map((l) => img?.luogo(l)),
    ].filter((u): u is string => !!u);
    // In coda, le situazioni che una rivelazione può far comparire (dissolvenza senza attese).
    const situazioni = this.situazioni.filter((x) => x.dopo.length && !this.situazioniMostrate.has(x.id)).map((x) => x.url);
    return { luogo: this.luogo, immagine, ritratti, situazione: this.situazione?.url ?? null, prossime: [...new Set([...prossime, ...situazioni])] };
  }

  /** Il gruppo si sposta: cambia l'immagine del proiettore (con dissolvenza sullo schermo). */
  cambiaLuogo(luogo: string): Esito {
    if (luogo === this.luogo) return { ok: true };
    this.o.log.info({ da: this.luogo, a: luogo, immagine: this.o.immagini?.luogo(luogo) ?? null }, 'scena: cambio di luogo');
    this.luogo = luogo;
    this.togliSituazione('cambio di luogo');
    this.notifica();
    return { ok: true };
  }

  // ------------------------------------------------------------------ immagini di situazione

  /** Situazioni della campagna con la loro rivelazione (pannello). */
  get situazioniCollegate(): readonly SituazioneCollegata[] {
    return this.situazioni;
  }

  /** Id della situazione sul proiettore, o null. */
  get situazioneInOnda(): string | null {
    return this.situazione?.id ?? null;
  }

  /** Il master mette (o toglie, con null) un'immagine di situazione sul proiettore. */
  mostraSituazione(id: string | null): Esito {
    if (id === null) {
      if (!this.situazione) return { ok: false, errore: 'Nessuna situazione sul proiettore.' };
      this.togliSituazione('master');
      this.notifica();
      return { ok: true };
    }
    const s = this.situazioni.find((x) => x.id === id);
    if (!s) return { ok: false, errore: 'Immagine di situazione sconosciuta.' };
    this.situazione = { id: s.id, url: s.url, auto: false, turno: this.turno };
    this.o.log.info({ situazione: s.id, da: 'master' }, 'immagini: situazione sul proiettore');
    this.notifica();
    return { ok: true };
  }

  private togliSituazione(motivo: string): void {
    if (!this.situazione) return;
    this.o.log.info({ situazione: this.situazione.id, motivo }, 'immagini: situazione tolta');
    this.situazione = null;
  }

  /**
   * Fine della narrazione: se è uscita la rivelazione di una situazione (indizio o battuta nel suo
   * `dopo`), la situazione va sul proiettore ora che la rivelazione è stata ascoltata.
   */
  private situazioniDopoLeRivelazioni(): void {
    const rivelate = new Set(this.rivelateNelTurno);
    this.rivelateNelTurno = [];
    if (rivelate.size === 0) return;
    const s = this.situazioni.find((x) => !this.situazioniMostrate.has(x.id) && x.dopo.some((d) => rivelate.has(d)));
    if (!s) return;
    this.situazioniMostrate.add(s.id);
    this.situazione = { id: s.id, url: s.url, auto: true, turno: this.turno };
    this.o.log.info({ situazione: s.id, dopo: s.dopo.filter((d) => rivelate.has(d)), turno: this.turno }, 'immagini: situazione dopo la rivelazione');
  }

  private nomePg(id: string): string {
    return this.campagna.pg.find((p) => p.id === id)?.nome ?? id;
  }

  /** Testo dell'ultima narrazione pubblica (per l'arbitro). */
  private ultimaNarrazione(): string {
    const voci = this.trascrizione.filter((v) => v.tipo === 'narrazione' || v.tipo === 'battuta');
    const ultimo = voci.at(-1)?.turno;
    return voci
      .filter((v) => v.turno === ultimo)
      .map((v) => (v.tipo === 'battuta' ? `${v.nome}: ${v.testo}` : v.testo))
      .join('\n');
  }

  collega(uscita: UscitaRegia): void {
    this.uscita = uscita;
  }

  /** Id della scena in corso (ISO dell'avvio, '' prima dell'avvio) e modalità del narratore. */
  get infoSessione(): { sessione: string; modo: 'improvvisa' | 'repertorio' } {
    return { sessione: this.sessione, modo: this.o.modo };
  }

  private nuovoStatoRepertorio(): StatoRepertorio | null {
    if (this.o.modo !== 'repertorio') return null;
    if (!this.o.repertorio) throw new Error('modalità repertorio senza repertorio caricato');
    return new StatoRepertorio(this.o.repertorio, this.campagna, this.orologi);
  }

  /** Stato pubblico per le parole segrete: indizi rivelati e battute uscite. */
  private statoPubblico(): StatoPubblico | null {
    const s = this.statoRepertorio;
    return s ? { indiziRivelati: s.indiziRivelati, battuteUsate: (id) => s.usata(id) } : null;
  }

  /**
   * `[usa] <id>` dal selettore: la battuta esce se è disponibile; le sue righe vanno alla voce con
   * l'audio pre-generato (stessa normalizzazione dello script di pre-generazione).
   */
  private usaBattuta(id: string, per: string | null, turno: number, segno: { mostrato: boolean }): EsitoUsaTurno {
    const s = this.statoRepertorio;
    if (!s) return { ok: false, motivo: 'modalità improvvisa: nessun repertorio' };
    if (!this.elencoTurno.has(id)) {
      const b = s.repertorio.perId.get(id);
      return { ok: false, motivo: b ? `non era nel catalogo del turno (${s.motivoIndisponibile(b, turno) ?? 'non pertinente alle azioni o trattenuta per un segreto'})` : `battuta inesistente: ${id}` };
    }
    // B2: ogni battuta risponde a un'azione (`> pg`), salvo il segno dovuto e le mosse di stallo.
    // Cancelli sull'azione: `richiede.privata` solo verso un'azione privata, `da_pg` solo verso quei PG;
    // le altre battute solo verso azioni pubbliche (un'azione privata non riceve battute qualsiasi).
    const b = s.repertorio.perId.get(id)!;
    const t = this.turnoB;
    if (per) {
      const azione = t?.azioni.get(per);
      if (!azione) return { ok: false, motivo: `${per} non ha un'azione in questo turno` };
      if (!rispondeA(b, { autore: per, privata: azione.privata })) {
        const serve = b.richiede.privata ? 'un’azione privata' : 'un’azione pubblica';
        const chi = b.richiede.da_pg.length ? ` di ${b.richiede.da_pg.join(', ')}` : '';
        return { ok: false, motivo: `${id} risponde solo a ${serve}${chi}: ${per} non va bene` };
      }
    } else {
      if (haCancelloAzione(b)) return { ok: false, motivo: `${id} ha un cancello sull'azione (privata o da_pg): serve «> pg»` };
      const libera = (b.tipo === 'segno_orologio' && !!t?.segnoDovuto) || (b.riempitivo && !!t?.stallo);
      if (!libera) return { ok: false, motivo: 'battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo' };
    }
    const esito = s.usa(id, turno, segno.mostrato);
    if (!esito.ok) return esito;
    if (esito.battuta.effetti.avanza_orologio) segno.mostrato = true;
    this.rivelateNelTurno.push(esito.battuta.id, ...esito.battuta.effetti.rivela_indizi);
    return {
      ok: true,
      versione: esito.versione,
      righe: esito.righe.map((r) => {
        const { mostrato, voce } = testoPerVoce(r.etichetta, r.testo, this.pronuncia);
        return { etichetta: r.etichetta, testo: mostrato, testo_voce: voce, chiave_cache: chiaveAudio(voceDi(this.campagna, r.etichetta).voce_id, voce) };
      }),
    };
  }

  // ------------------------------------------------------------------ stato

  stato(): StatoTavolo {
    const c = this.campagna;
    const conteggio = new Map<string, number>();
    for (const id of this.telefoni.values()) conteggio.set(id, (conteggio.get(id) ?? 0) + 1);
    return {
      versione_stato: this.versioneStato,
      versione_scena: this.versioneScena,
      fase: this.fase,
      turno: this.turno,
      scena: { id_campagna: c.id, titolo: c.scena.titolo, umore: c.scena.umore, intensita: c.scena.intensita, ...this.immaginiPubbliche() },
      pg: c.pg.map((p) => ({ id: p.id, nome: p.nome, descrizione: p.descrizione, telefoni: conteggio.get(p.id) ?? 0 })),
      finestra: this.tavolo.finestraPubblica(),
      al_tavolo: this.tavolo.alTavolo(),
      trascrizione: this.trascrizione.slice(-this.o.trascrizioneMax),
      voce_motore: this.o.voce.nome,
      schermo_connesso: this.schermi.size > 0,
      ora_server_ms: this.o.orologio.adesso(),
    };
  }

  azioneDi(id_pg: string): AzionePrivata | null {
    return this.tavolo.azioneDi(id_pg);
  }

  /** Scheda privata del PG (solo per il telefono che l'ha scelto). */
  schedaPg(id_pg: string): SchedaPg | null {
    return schedaPg(this.campagna, id_pg);
  }

  private notifica(): void {
    this.versioneStato += 1;
    this.uscita?.stato(this.stato());
    for (const f of this.ascoltatori) f();
  }

  /** Un modulo esterno (note di regia) ha cambiato qualcosa che il pannello deve vedere. */
  notificaEsterna(): void {
    this.notifica();
  }

  /** Registra un ascoltatore di ogni cambiamento dello stato; restituisce la funzione che lo toglie. */
  alCambio(f: () => void): () => void {
    this.ascoltatori.add(f);
    return () => this.ascoltatori.delete(f);
  }


  private aggiungiTrascrizione(v: Omit<VoceTrascrizione, 'id'>): VoceTrascrizione {
    const voce = { id: this.prossimoIdTrascrizione++, ...v };
    this.trascrizione.push(voce);
    return voce;
  }

  // ------------------------------------------------------------------ telefoni e schermi

  /** PG scelti da almeno un telefono (se nessuno, tutti: così chi arriva dopo può giocare). */
  private pgAlTavolo(): string[] {
    const scelti = new Set(this.telefoni.values());
    const elenco = this.campagna.pg.map((p) => p.id).filter((id) => scelti.has(id));
    return elenco.length ? elenco : this.campagna.pg.map((p) => p.id);
  }

  telefonoSceglie(socketId: string, id_pg: string): Esito {
    if (!this.campagna.pg.some((p) => p.id === id_pg)) return { ok: false, errore: 'Personaggio sconosciuto.' };
    const prima = this.telefoni.get(socketId);
    this.telefoni.set(socketId, id_pg);
    if (prima && prima !== id_pg) this.lasciaPg(prima);
    this.tavolo.aggiungiInvitato(id_pg);
    this.o.log.info({ socket: socketId, id_pg, prima: prima ?? null }, 'telefono: PG scelto');
    this.notifica();
    return { ok: true };
  }

  telefonoEsce(socketId: string): void {
    const id_pg = this.telefoni.get(socketId);
    this.telefoni.delete(socketId);
    if (id_pg) {
      this.lasciaPg(id_pg);
      this.notifica();
    }
  }

  private lasciaPg(id_pg: string): void {
    if ([...this.telefoni.values()].includes(id_pg)) return; // un altro telefono lo tiene
    this.tavolo.rimuoviInvitato(id_pg);
  }

  /** Lo schermo ha sbloccato l'audio: entra, e la scena parte se era in attesa. */
  schermoInizia(socketId: string): Esito {
    this.schermi.add(socketId);
    this.o.log.info({ socket: socketId, fase: this.fase, schermi: this.schermi.size }, 'schermo: audio sbloccato');
    if (this.fase === 'attesa') this.avviaScena();
    else this.notifica();
    return { ok: true };
  }

  schermoEsce(socketId: string): void {
    if (this.schermi.delete(socketId)) {
      this.o.log.info({ socket: socketId, schermi: this.schermi.size }, 'schermo: uscito');
      // Senza schermi nessuno avviserà la fine dell'audio: chi aspetta va avanti con la stima.
      if (this.schermi.size === 0 && this.attesaAudio) this.programmaStimaFine(this.attesaAudio, 0);
      this.notifica();
    }
  }

  schermoAudioIniziato(d: SchermoAudioIniziato, ricevutoA: number): void {
    const istante = ricevutoA - Math.max(0, d.ritardo_ms);
    if (this.misuratore && d.turno === this.misuratore.turno) {
      this.misuratore.segna('schermo_inizio_audio', istante);
    }
    this.o.log.debug({ turno: d.turno, id_frase: d.id_frase, ritardo_ms: d.ritardo_ms }, 'schermo: audio iniziato');
  }

  schermoAudioFinito(d: SchermoAudioFinito, ricevutoA: number): void {
    const istante = ricevutoA - Math.max(0, d.ritardo_ms);
    this.o.log.info(
      { turno: d.turno, buchi: d.buchi, buchi_in_frase: d.buchi_in_frase, buchi_tra_frasi: d.buchi_tra_frasi, silenzio_ms: d.silenzio_ms, ritardo_ms: d.ritardo_ms },
      'schermo: audio finito',
    );
    if (this.misuratore && d.turno === this.misuratore.turno && typeof d.buchi === 'number') {
      this.misuratore.impostaBuchi({
        buchi: d.buchi,
        buchi_in_frase: typeof d.buchi_in_frase === 'number' ? d.buchi_in_frase : 0,
        buchi_tra_frasi: typeof d.buchi_tra_frasi === 'number' ? d.buchi_tra_frasi : 0,
        silenzio_ms: typeof d.silenzio_ms === 'number' ? d.silenzio_ms : 0,
      });
    }
    const a = this.attesaAudio;
    if (a && a.turno === d.turno) {
      a.timer?.();
      this.attesaAudio = null;
      a.risolvi(istante);
    }
  }

  // ------------------------------------------------------------------ comandi della scena

  ferma(motivo = 'comando'): Esito {
    if (this.fase === 'attesa' || this.fase === 'fermata') return { ok: false, errore: 'La scena non è in corso.' };
    this.interrompiTutto(motivo);
    this.fase = 'fermata';
    this.aggiungiTrascrizione({ turno: this.turno, tipo: 'sistema', chi: 'sistema', nome: 'Sistema', testo: 'Scena fermata.' });
    this.o.log.info({ turno: this.turno, motivo }, 'scena: fermata');
    this.notifica();
    return { ok: true };
  }

  ricomincia(): Esito {
    this.interrompiTutto('ricomincia');
    this.trascrizione = [];
    this.turno = 0;
    this.versioneScena = 0;
    // Si riparte dalla prima scena, con gli orologi della campagna da capo.
    this.orologi = new StatoOrologi(this.o.campagna);
    this.impostaScena(this.o.campagna.scene[0]!.id);
    this.statoRepertorio = this.nuovoStatoRepertorio();
    this.tavolo.azzera();
    // Le note di regia contano i turni di questa scena: si riparte senza.
    this.note.azzera();
    this.situazioniMostrate.clear();
    this.rivelateNelTurno = [];
    this.o.log.info({ schermi: this.schermi.size }, 'scena: ricomincia');
    if (this.schermi.size > 0) this.avviaScena();
    else {
      this.fase = 'attesa';
      this.notifica();
    }
    return { ok: true };
  }

  // ------------------------------------------------------------------ comandi del master
  // Validazione e registro degli eventi stanno in master/comandi.ts: qui solo l'effetto sullo stato.

  /** La narrazione (apertura compresa) è in corso: LLM o voce stanno lavorando. */
  get narrazioneInCorso(): boolean {
    return this.fase === 'apertura' || this.fase === 'narrazione';
  }

  get statoPausa(): { richiesta: boolean; attiva: boolean } {
    return { richiesta: this.pausaRichiesta, attiva: this.fase === 'pausa' };
  }

  /**
   * Pausa: nessuna nuova finestra. A finestra aperta la finestra resta aperta ma non si chiude da
   * sola (e niente stallo); durante una narrazione la si lascia finire e poi il tavolo si ferma.
   */
  pausa(): Esito {
    if (this.fase === 'attesa' || this.fase === 'fermata') return { ok: false, errore: 'La scena non è in corso.' };
    if (this.fase === 'pausa') return { ok: false, errore: 'Il tavolo è già in pausa.' };
    if (this.pausaRichiesta) return { ok: false, errore: 'La pausa è già chiesta: scatta alla fine della narrazione.' };
    // A finestra chiusa ma col lucchetto preso la narrazione sta per partire: si comporta come una narrazione.
    if (this.fase === 'finestra' && !this.tavolo.chiudendo) {
      this.tavolo.sospendi();
      this.fase = 'pausa';
      this.invitoSospeso = null;
      this.o.log.info({ turno: this.turno }, 'scena: in pausa (finestra sospesa)');
    } else {
      this.pausaRichiesta = true;
      this.o.log.info({ turno: this.turno, fase: this.fase }, 'scena: pausa chiesta, scatta a fine narrazione');
    }
    this.notifica();
    return { ok: true };
  }

  /** Riprende dalla pausa (o annulla una pausa chiesta e non ancora scattata). */
  riprendi(): Esito {
    if (this.pausaRichiesta && this.fase !== 'pausa') {
      this.pausaRichiesta = false;
      this.o.log.info({ turno: this.turno }, 'scena: pausa chiesta annullata');
      this.notifica();
      return { ok: true };
    }
    if (this.fase !== 'pausa') return { ok: false, errore: 'Il tavolo non è in pausa.' };
    if (this.tavolo.aperta) {
      this.fase = 'finestra';
      this.tavolo.riprendi();
      this.o.log.info({ turno: this.turno }, 'scena: ripresa (finestra di nuovo attiva)');
    } else {
      const invito = this.invitoSospeso ?? 'tutti';
      this.invitoSospeso = null;
      this.o.log.info({ turno: this.turno, invito }, 'scena: ripresa (nuova finestra)');
      this.apriFinestra(invito);
    }
    this.notifica();
    return { ok: true };
  }

  /**
   * Freno d'emergenza: interrompe subito LLM e voce (lo schermo tace) e mette il tavolo in pausa.
   * Le azioni del turno interrotto non sono state risolte: tornano ai giocatori da rimandare.
   */
  fermaNarrazione(): Esito {
    if (!this.narrazioneInCorso) return { ok: false, errore: 'Nessuna narrazione in corso.' };
    const turno = this.turno;
    const faseInterrotta = this.fase;
    this.interrompiFlussi('master');
    this.primoAudioInviato.delete(turno);
    const annullate = this.tavolo.annullaChiuse(turno, MOTIVO_NARRAZIONE_INTERROTTA);
    this.aggiungiTrascrizione({ turno, tipo: 'sistema', chi: 'sistema', nome: 'Sistema', testo: 'Il master ha interrotto la narrazione.' });
    this.o.registroNarrazioni.scrivi({ sessione: this.sessione, turno, tipo: 'interrotta', fase: faseInterrotta, azioni_annullate: annullate });
    // La parte già detta è pubblica: le azioni scritte nel frattempo si ricontrollano contro di essa.
    this.versioneScena += 1;
    void this.tavolo.dopoNarrazione(turno, this.versioneScena);
    this.pausaRichiesta = false;
    this.invitoSospeso = 'tutti';
    this.fase = 'pausa';
    this.o.log.warn({ turno, fase: faseInterrotta, azioni_annullate: annullate }, 'scena: narrazione interrotta dal master, tavolo in pausa');
    this.notifica();
    return { ok: true };
  }

  /** Id della scena in corso. */
  get scenaCorrente(): string {
    return this.campagna.scena.id;
  }

  /**
   * Passaggio a un'altra scena (pannello del master). Prima dell'avvio o a scena fermata cambia solo
   * la scena da cui si parte. A tavolo in gioco: le azioni in sospeso (scritte per la scena di
   * prima) tornano ai giocatori, il proiettore passa al luogo della scena nuova con la dissolvenza,
   * il narratore ne legge l'apertura e si apre la finestra per tutti.
   */
  cambiaScena(id: string): Esito {
    const nuova = this.o.campagna.scene.find((s) => s.id === id);
    if (!nuova) return { ok: false, errore: 'Scena sconosciuta.' };
    if (nuova.id === this.campagna.scena.id) return { ok: false, errore: 'È già la scena in corso.' };
    if (this.narrazioneInCorso || this.tavolo.chiudendo) return { ok: false, errore: 'Aspetta che finisca la narrazione, o fermala prima.' };
    const da = this.campagna.scena.id;
    this.impostaScena(nuova.id);
    this.o.log.info({ da, a: nuova.id, fase: this.fase, immagine: this.o.immagini?.luogo(nuova.id) ?? null }, 'scena: cambio di scena');
    if (this.fase === 'attesa' || this.fase === 'fermata') {
      this.notifica();
      return { ok: true };
    }
    const annullate = this.tavolo.annullaVive(MOTIVO_CAMBIO_SCENA);
    // A finestra aperta il suo turno non è stato narrato: l'apertura lo prende; altrimenti il successivo.
    const turno = this.tavolo.aperta ? this.turno : this.turno + 1;
    this.tavolo.chiudiForzata();
    this.pausaRichiesta = false;
    this.invitoSospeso = null;
    this.turno = turno;
    this.aggiungiTrascrizione({ turno, tipo: 'sistema', chi: 'sistema', nome: 'Sistema', testo: `Nuova scena: ${nuova.titolo}.` });
    this.o.registroNarrazioni.scrivi({ sessione: this.sessione, turno, tipo: 'cambio_scena', da, a: nuova.id, azioni_annullate: annullate, testo: nuova.apertura.map((f) => `[narratore] ${f}`).join('\n') });
    if (this.o.preriscalda && this.o.narratore.preriscalda) void this.preriscalda();
    this.leggiApertura(turno, nuova.apertura);
    return { ok: true };
  }

  /** Il master chiude la finestra adesso (il narratore risponde alle azioni inviate). */
  chiudiFinestraOra(): Esito {
    if (this.fase === 'pausa') return { ok: false, errore: 'Il tavolo è in pausa: riprendi prima di chiudere la finestra.' };
    if (this.fase !== 'finestra') return { ok: false, errore: 'La finestra delle azioni non è aperta.' };
    return this.tavolo.chiudiOra();
  }

  /** Il master salta l'azione di un giocatore (non entra nel turno). */
  saltaAzione(idAzione: string): Esito {
    const a = this.tavolo.salta(idAzione, MOTIVO_SALTATA);
    if (!a) return { ok: false, errore: 'Azione inesistente o già fuori dal turno.' };
    return { ok: true };
  }

  /** Il master avanza (+1) o riporta indietro (−1) un orologio di un segno. */
  spostaOrologio(id: string, passo: 1 | -1): EsitoAvanzamento {
    const esito = passo === 1 ? this.orologi.avanza(id, this.turno, false) : this.orologi.indietro(id);
    if (esito.ok) {
      this.o.log.info({ orologio: id, passo, pieni: esito.orologio.pieni, segmenti: esito.orologio.segmenti }, 'orologio: spostato dal master');
      this.notifica();
    }
    return esito;
  }

  /** Orologi attivi con lo stato tenuto dal Motore (per il pannello). */
  get orologiAttivi(): ReadonlyArray<Readonly<OrologioMinaccia> & { dovuto: boolean }> {
    const turnoProssimo = this.fase === 'finestra' || this.fase === 'pausa' ? this.turno : this.turno + 1;
    return this.orologi.elenco.map((o) => ({ ...o, dovuto: this.orologi.dovuto(o, turnoProssimo) }));
  }

  /** Tutte le azioni (per il pannello, private comprese). */
  get azioniTutte(): ReadonlyArray<Readonly<Azione>> {
    return this.tavolo.tutte();
  }

  /** Stato del repertorio (modalità B), null in modalità improvvisa. */
  get repertorioAttivo(): StatoRepertorio | null {
    return this.statoRepertorio;
  }

  get turnoCorrente(): number {
    return this.turno;
  }

  /** Luogo corrente sul proiettore. */
  get luogoCorrente(): string {
    return this.luogo;
  }

  /**
   * Comandi dei telefoni. Si può scrivere sempre: a finestra chiusa (il narratore parla) l'azione
   * entra nella finestra successiva.
   */
  inviaAzione(id_pg: string, testo: string, versioneVista: number, privata = false): Esito {
    if (this.fase === 'attesa' || this.fase === 'fermata') return { ok: false, errore: 'La scena non è in corso.' };
    return this.tavolo.invia(id_pg, testo, versioneVista, privata);
  }

  ritiraAzione(id_pg: string): Esito {
    return this.tavolo.ritira(id_pg);
  }

  confermaAzione(id_pg: string): Esito {
    return this.tavolo.conferma(id_pg);
  }

  segnaPronto(id_pg: string, pronto: boolean): Esito {
    return this.tavolo.pronto(id_pg, pronto);
  }

  scrivo(id_pg: string): void {
    this.tavolo.scrivo(id_pg);
  }

  // ------------------------------------------------------------------ flusso della scena

  private interrompiTutto(motivo: string): void {
    this.interrompiFlussi(motivo);
    this.tavolo.chiudiForzata();
    this.pausaRichiesta = false;
    this.invitoSospeso = null;
  }

  /** Ferma LLM, voce, attese dell'audio e misure in corso (i flussi vecchi escono per `epoca`). */
  private interrompiFlussi(motivo: string): void {
    this.epoca += 1;
    this.controlloLlm?.abort(new Error(motivo));
    this.controlloLlm = null;
    this.pipeline.interrompi(motivo);
    if (this.attesaAudio) {
      this.attesaAudio.timer?.();
      this.attesaAudio.risolvi(null);
      this.attesaAudio = null;
    }
    if (this.misuratore) {
      const record = { ...this.misuratore.record(), interrotto: true, motivo_interruzione: motivo };
      this.o.registroTurni.scrivi(record);
      this.misuratore = null;
    }
  }

  private avviaScena(): void {
    const c = this.campagna;
    this.sessione = new Date(this.o.orologio.adesso()).toISOString();
    this.o.registroNarrazioni.scrivi({ sessione: this.sessione, turno: 0, tipo: 'apertura', scena: c.scena.id, voce: this.o.voce.nome, testo: c.scena.apertura.map((f) => `[narratore] ${f}`).join('\n') });
    this.turno = 0;
    this.o.log.info({ scena: c.scena.id, frasi: c.scena.apertura.length, voce: this.o.voce.nome }, 'scena: apertura');
    if (this.o.preriscalda && this.o.narratore.preriscalda) void this.preriscalda();
    this.leggiApertura(0, c.scena.apertura);
  }

  /**
   * Il narratore legge l'apertura di una scena (fase «apertura», turno `turno`), poi la finestra si
   * apre per tutti (o il tavolo va in pausa, se il master l'ha chiesta).
   */
  private leggiApertura(turno: number, frasi: string[]): void {
    const epoca = ++this.epoca;
    this.fase = 'apertura';
    this.segmentiAperti.clear();
    if (frasi.length === 0) {
      this.versioneScena += 1;
      this.fineNarrazione('tutti');
      return;
    }
    this.aggiungiTrascrizione({ turno, tipo: 'narrazione', chi: ID_NARRATORE, nome: NOME_NARRATORE, testo: frasi.join(' ') });
    frasi.forEach((testo, indice) =>
      this.pipeline.accoda({
        id_frase: `t${turno}-f${indice}`,
        turno,
        indice,
        parlante: ID_NARRATORE,
        nome: NOME_NARRATORE,
        voce_id: ID_NARRATORE,
        testo,
        testo_voce: this.pronuncia(testo),
      }),
    );
    this.notifica();
    void (async () => {
      const esito = await this.pipeline.chiudiTurno(turno);
      if (epoca !== this.epoca || esito.interrotto) return;
      await this.attendiFineAudio(turno, esito.secondi);
      if (epoca !== this.epoca) return;
      this.versioneScena += 1;
      this.fineNarrazione('tutti');
    })();
  }

  /** La scena corrente diventa `id`: contesto del narratore, orologi attivi, repertorio, luogo. */
  private impostaScena(id: string): void {
    this.campagna = conScena(this.o.campagna, id);
    this.sistema = this.o.sistemaPer?.(this.campagna) ?? this.sistema;
    this.scenaPubblica = this.o.scenaPubblicaPer?.(this.campagna) ?? this.scenaPubblica;
    this.orologi.impostaScena(this.campagna.scena);
    if (this.statoRepertorio) this.statoRepertorio.scena = id;
    this.luogo = id;
    this.togliSituazione('cambio di scena');
  }

  private async preriscalda(): Promise<void> {
    try {
      const inizio = this.o.orologio.ora();
      const esito = await this.o.narratore.preriscalda!(this.sistema);
      if (!esito) return;
      this.o.registroCosti.scrivi({ ts: new Date().toISOString(), tipo: 'preriscaldamento', modello: esito.modello, ...esito.costo, ms: Math.round(this.o.orologio.ora() - inizio) });
      this.o.log.info({ ...esito.costo, ms: Math.round(this.o.orologio.ora() - inizio) }, 'llm: cache preriscaldata');
    } catch (err) {
      this.o.log.warn({ err: (err as Error).message }, 'llm: preriscaldamento fallito (si continua)');
    }
  }

  /**
   * Fine di una narrazione (o dell'apertura): le azioni del turno si risolvono e quelle scritte nel
   * frattempo si ricontrollano contro la narrazione appena finita (in sottofondo). Poi si apre la
   * finestra, oppure, se il master ha chiesto la pausa, il tavolo si ferma con l'invito in serbo.
   */
  private fineNarrazione(invito: string[] | 'tutti'): void {
    void this.tavolo.dopoNarrazione(this.turno, this.versioneScena);
    this.situazioniDopoLeRivelazioni();
    if (this.pausaRichiesta) {
      this.pausaRichiesta = false;
      this.fase = 'pausa';
      this.invitoSospeso = invito;
      this.o.log.info({ turno: this.turno, invito }, 'scena: in pausa (dopo la narrazione)');
      this.notifica();
      return;
    }
    this.apriFinestra(invito);
  }

  private apriFinestra(invito: string[] | 'tutti'): void {
    const presenti = this.pgAlTavolo();
    let invitati = invito === 'tutti' ? presenti : invito.filter((id) => presenti.includes(id));
    // Esperimenti: copione fisso di azioni, quindi tutti possono agire (l'invito resta nel registro).
    if (this.o.finestraATutti) invitati = presenti;
    if (invitati.length === 0) {
      if (invito !== 'tutti') this.o.log.warn({ invito, presenti }, 'regia: nessun invitato è al tavolo, si invitano tutti');
      invitati = presenti;
    }
    this.turno += 1;
    this.segmentiAperti.clear();
    this.fase = 'finestra';
    this.tavolo.apri(this.turno, invitati, this.versioneScena, invito === 'tutti');
  }

  private finestraChiusa(r: RiepilogoChiusura): void {
    if (r.motivo === 'forzata') return; // ferma/ricomincia: niente narrazione
    // La situazione messa dopo una rivelazione ha accompagnato la reazione dei giocatori: si torna al luogo.
    if (this.situazione?.auto && this.situazione.turno < r.turno) this.togliSituazione('narrazione successiva');
    this.rivelateNelTurno = [];
    this.misuratore = new MisuratoreTurno(r.turno, r.chiusa_a, r.durata_ms, this.o.voce.nome, this.o.orologio.adesso());
    // Contratto voce: /sveglia alla chiusura della finestra, in parallelo alla chiamata dell'LLM
    // (fire-and-forget: la prima frase arriva dopo ~0,9 s, la sveglia ci sta dentro).
    const motoreVoce = this.o.voce.attivo;
    if (motoreVoce.sveglia) {
      this.misuratore.segna('voce_sveglia', this.o.orologio.ora());
      void motoreVoce.sveglia();
    }
    const epoca = this.epoca;
    const c = this.campagna;
    this.fase = 'narrazione';
    this.o.log.info(
      { turno: r.turno, motivo: r.motivo, finestra_ms: r.durata_ms, azioni: r.azioni.length, senzaAzione: r.senzaAzione },
      'finestra: chiusa',
    );
    const nomePg = (id: string) => c.pg.find((p) => p.id === id)?.nome ?? id;
    // Le azioni pubbliche entrano nella trascrizione (in ordine di risoluzione).
    for (const a of r.azioni) {
      if (!a.privata) this.aggiungiTrascrizione({ turno: r.turno, tipo: 'azione', chi: a.autore, nome: nomePg(a.autore), testo: a.testo });
    }
    const perNarratore = azioniPerNarratore(r, nomePg, (id) => this.tavolo.azione(id));
    this.stalliDiFila = r.motivo === 'stallo' ? this.stalliDiFila + 1 : 0;
    const messaggio = compilaMessaggioTurno({
      turno: r.turno,
      trascrizione: this.trascrizione,
      azioni: perNarratore.azioni,
      collegamenti: perNarratore.collegamenti,
      ...(this.stalliDiFila ? { stallo: this.stalliDiFila } : {}),
      pgAlTavolo: this.pgAlTavolo().map((id) => ({ id, nome: nomePg(id) })),
      orologi: this.statoRepertorio ? this.orologi.descriviRepertorio(r.turno) : this.orologi.descrivi(r.turno),
      ...(this.statoRepertorio ? { repertorio: this.elencoRepertorio(r) } : {}),
      noteRegia: this.note.testi,
    });
    // Note di regia: entrano in questa chiamata (e nella sua eventuale riparazione) e consumano un turno.
    const noteNelMessaggio = this.note.elenco;
    if (noteNelMessaggio.length) {
      const sezione = sezioneNoteRegia(noteNelMessaggio.map((n) => n.testo));
      this.o.log.info(
        { turno: r.turno, note: noteNelMessaggio.map((n) => ({ id: n.id, testo: n.testo, turni_rimasti: n.turni_rimasti })), nel_messaggio: !!sezione && messaggio.includes(sezione) },
        'narratore: note di regia nel messaggio',
      );
      const scadute = this.note.consumaTurno();
      if (scadute.length) this.o.log.info({ turno: r.turno, scadute: scadute.map((n) => n.id) }, 'note di regia: scadute');
    }
    // Rete di sicurezza: nel messaggio del selettore non deve esserci nessuna parola ancora segreta.
    if (this.statoRepertorio && this.o.paroleSegrete?.length) {
      const trovate = segretiNelTesto(messaggio, this.o.paroleSegrete, this.statoPubblico());
      if (trovate.length) this.o.log.error({ turno: r.turno, parole: trovate.map((p) => p.parola) }, 'repertorio: parola segreta nel messaggio del selettore');
    }
    this.notifica();
    const azioni = [
      ...r.azioni.map((a) => ({ id_pg: a.autore, testo: a.testo as string | null, privata: a.privata, dipende_da: a.dipende_da, conflitti: a.conflitti })),
      ...r.sospese.map((a) => ({ id_pg: a.autore, testo: a.testo as string | null, sospesa: true })),
      ...r.senzaAzione.map((id) => ({ id_pg: id, testo: null as string | null })),
    ];
    void this.eseguiNarrazione(r.turno, messaggio, epoca, azioni, r.motivo, noteNelMessaggio.map((n) => n.testo));
  }

  private async eseguiNarrazione(
    turno: number,
    messaggio: string,
    epoca: number,
    azioni: Array<{ id_pg: string; testo: string | null; [k: string]: unknown }>,
    chiusura: RiepilogoChiusura['motivo'],
    noteRegia: string[] = [],
  ): Promise<void> {
    const misuratore = this.misuratore!;
    const controllo = new AbortController();
    this.controlloLlm = controllo;
    /** Un segno di orologio è già uscito in questa risposta (mai due). */
    const segnoInRisposta = { mostrato: false };
    const log = this.o.log.child({ turno });
    log.debug({ caratteri: messaggio.length }, 'narratore: messaggio del turno');

    const esito = await narraTurno(
      { campagna: this.campagna, narratore: this.o.narratore, pipeline: this.pipeline, log },
      {
        turno,
        sistema: this.sistema,
        messaggio,
        signal: controllo.signal,
        misuratore,
        ora: () => this.o.orologio.ora(),
        pronuncia: this.pronuncia,
        usa: this.statoRepertorio ? (id, per) => this.usaBattuta(id, per, turno, segnoInRisposta) : null,
        onFrase: (f) => {
          if (epoca !== this.epoca) return;
          this.trascriviFrase(turno, f.etichetta, f.nome, f.testo, f.segmento);
        },
      },
    );
    if (epoca !== this.epoca) return;

    // Ogni azione dichiarata deve ricevere una risposta (B2). In modalità repertorio, se qualcuna
    // resta senza, una seconda chiamata breve risponde solo a quelle (una volta per turno).
    const pubbliche = new Map(azioni.filter((a) => a.testo && !a['privata'] && !a['sospesa']).map((a) => [a.id_pg, a.testo as string]));
    let senzaRisposta = this.azioniSenzaRisposta(esito.uscita, pubbliche);
    let riparazioni = 0;
    if (this.statoRepertorio && senzaRisposta.length && esito.esito && !controllo.signal.aborted) {
      riparazioni = 1;
      const primoCosto = esito.esito.costo;
      const riparazione = await narraTurno(
        { campagna: this.campagna, narratore: this.o.narratore, pipeline: this.pipeline, log },
        {
          turno,
          sistema: this.sistema,
          messaggio: messaggioRiparazione(messaggio, esito.esito.testo, senzaRisposta.map((id) => ({ id, nome: this.nomePg(id), testo: pubbliche.get(id)! }))),
          signal: controllo.signal,
          misuratore,
          ora: () => this.o.orologio.ora(),
          pronuncia: this.pronuncia,
          usa: (id, per) => this.usaBattuta(id, per, turno, segnoInRisposta),
          prefissoFrasi: 'r',
          ignora: new Set(['invito_mancante']),
          onFrase: (f) => {
            if (epoca !== this.epoca) return;
            this.trascriviFrase(turno, f.etichetta, f.nome, f.testo, 50_000 + f.segmento);
          },
        },
      );
      if (epoca !== this.epoca) return;
      esito.uscita.push(...riparazione.uscita);
      esito.righe_prescritte += riparazione.righe_prescritte;
      esito.righe_improvvisate += riparazione.righe_improvvisate;
      esito.usa_rifiutati += riparazione.usa_rifiutati;
      esito.anomalie.push(...riparazione.anomalie);
      if (riparazione.esito) {
        esito.esito.testo += `\n${riparazione.esito.testo}`;
        esito.esito.costo = sommaCosti(primoCosto, riparazione.esito.costo);
        misuratore.impostaCosto(esito.esito.costo);
        this.o.registroCosti.scrivi({ ts: new Date().toISOString(), tipo: 'riparazione', turno, modello: riparazione.esito.modello, ...riparazione.esito.costo });
      }
      const prima = senzaRisposta;
      senzaRisposta = this.azioniSenzaRisposta(esito.uscita, pubbliche);
      log.warn({ senza_risposta: prima, dopo_riparazione: senzaRisposta }, 'repertorio: azioni senza risposta, riparazione');
    }

    // B2: il segno d'orologio era dovuto ma il selettore non l'ha usato → lo mette il Motore,
    // dopo le risposte e prima della frase d'invito (deterministico, nessun token in più).
    let segnoAggiunto: string | null = null;
    if (this.statoRepertorio && this.turnoB?.segnoDovuto && !segnoInRisposta.mostrato && esito.esito && !controllo.signal.aborted) {
      const aggiunto = this.aggiungiSegnoDovuto(turno, esito, segnoInRisposta, log);
      if (aggiunto) {
        segnoAggiunto = aggiunto.id;
        esito.righe_prescritte += aggiunto.righe;
      }
    }
    this.controlloLlm = null;

    // Orologi: il narratore propone, il Motore controlla (al massimo un segno per risposta).
    // In modalità repertorio i segni sono battute: la riga [orologio] non vale.
    let avanzato = segnoInRisposta.mostrato;
    const esitiOrologi: Array<{ id: string; ok: boolean; motivo?: string; stato?: string }> = [];
    for (const id of this.statoRepertorio ? [] : esito.orologi) {
      const a = this.orologi.avanza(id, turno, avanzato);
      esitiOrologi.push(a.ok ? { id, ok: true, stato: `${a.orologio.pieni}/${a.orologio.segmenti}` } : { id, ok: false, motivo: a.motivo });
      if (a.ok) {
        avanzato = true;
        log.info({ orologio: id, pieni: a.orologio.pieni, segmenti: a.orologio.segmenti }, 'orologio: avanzato');
      } else {
        log.error({ orologio: id, motivo: a.motivo }, 'orologio: avanzamento rifiutato');
      }
    }

    if (esito.esito) {
      // Testo grezzo del narratore: serve a rivedere qualità e protocollo dopo la sessione.
      log.info({ testo: esito.esito.testo, stop_reason: esito.esito.stopReason }, 'narratore: testo del turno');
      this.o.registroCosti.scrivi({ ts: new Date().toISOString(), tipo: 'turno', turno, modello: esito.esito.modello, stop_reason: esito.esito.stopReason, ...esito.esito.costo });
      log.info({ ...esito.esito.costo, frasi: esito.frasi, anomalie: esito.anomalie }, 'narratore: turno narrato');
    }
    // Il narratore è caduto senza dire niente: la mossa morbida pronta tiene viva la scena (E3).
    if (esito.errore && esito.frasi === 0) {
      this.uscita?.avviso('errore', 'Il narratore non risponde: riprovo al prossimo turno.');
      this.parlaRiserva(turno);
    }

    const voce = await this.pipeline.chiudiTurno(turno);
    if (epoca !== this.epoca || voce.interrotto) return;
    const fine = await this.attendiFineAudio(turno, voce.secondi);
    if (epoca !== this.epoca) return;
    if (fine !== null) misuratore.imposta('audio_fine', fine);

    if (this.statoRepertorio && esito.orologi.length) log.warn({ orologi: esito.orologi }, 'repertorio: riga [orologio] ignorata (i segni sono battute)');
    const record = misuratore.record();
    const conteggi = {
      modo: this.o.modo,
      righe_prescritte: esito.righe_prescritte,
      righe_improvvisate: esito.righe_improvvisate,
      usa_rifiutati: esito.usa_rifiutati,
      azioni_pubbliche: pubbliche.size,
      azioni_senza_risposta: senzaRisposta.length,
      riparazioni,
      segno_aggiunto: segnoAggiunto,
    };
    this.o.registroTurni.scrivi({ ...record, ...conteggi, sessione: this.sessione });
    this.o.registroNarrazioni.scrivi({
      sessione: this.sessione,
      turno,
      tipo: 'turno',
      chiusura,
      ...conteggi,
      uscita: esito.uscita,
      ...(this.statoRepertorio ? { stato_repertorio: this.statoRepertorio.riepilogo() } : {}),
      voce: record.voce_motore,
      azioni,
      pg_presenti: this.pgAlTavolo(),
      ...(noteRegia.length ? { note_regia: noteRegia } : {}),
      testo: esito.esito?.testo ?? null,
      errore: esito.errore,
      invito: esito.invito,
      orologi: esitiOrologi,
      stato_orologi: this.orologi.riepilogo(),
      anomalie: esito.anomalie,
      misure: record,
    });
    this.uscita?.metriche(record);
    log.info(record, 'turno: misure');
    this.misuratore = null;
    this.primoAudioInviato.delete(turno);
    this.versioneScena += 1;
    this.fineNarrazione(esito.invito ?? 'tutti');
  }

  /**
   * Fatti scoperti e catalogo B2 del turno: solo battute pertinenti alle azioni a cui possono
   * rispondere (le pubbliche; le private solo per le battute con `richiede.privata`, e `da_pg` solo
   * per quei PG), il segno se è dovuto, le battute per stato dell'orologio, i riempitivi allo stallo.
   */
  private elencoRepertorio(r: RiepilogoChiusura): { fattiScoperti: string[]; battuteDisponibili: string; stallo: boolean; menzogne: string[] } {
    const s = this.statoRepertorio!;
    // Stallo: 45 s senza input, o una finestra chiusa senza nessuna azione (tutti hanno passato).
    const stallo = r.motivo === 'stallo' || r.azioni.length === 0;
    const segnoDovuto = this.orologi.elenco.some((o) => this.orologi.dovuto(o, r.turno));
    const azioni = r.azioni.map((a) => ({ autore: a.autore, testo: a.testo, privata: a.privata }));
    const { battute, trattenute, perche } = s.catalogo({ turno: r.turno, azioni, stallo, segnoDovuto, nomiPng: this.nomiPng, parole: this.o.paroleSegrete ?? [] });
    this.elencoTurno = new Set(battute.map((b) => b.id));
    this.turnoB = { azioni: new Map(r.azioni.map((a) => [a.autore, { id: a.id, privata: a.privata }])), stallo, segnoDovuto };
    this.o.log.info({ turno: r.turno, catalogo: battute.length, perche, trattenute, stallo, segnoDovuto }, 'repertorio: catalogo del turno');
    return {
      fattiScoperti: s.fattiScoperti.map((id) => `${id} — ${this.testoFatto(id)}`),
      battuteDisponibili: s.elencoDisponibili(battute),
      stallo,
      menzogne: righeMenzogneDette(s.menzogneDette, this.campagna, this.o.paroleSegrete ?? [], this.statoPubblico()),
    };
  }

  /**
   * Fa uscire la battuta del segno dovuto e la mette PRIMA dell'invito finale, se l'ultima riga
   * improvvisata è un invito (una domanda) e la sua voce non è ancora partita; altrimenti in fondo.
   * Restituisce la battuta usata e quante righe ha, o null se non c'è un segno disponibile.
   */
  private aggiungiSegnoDovuto(turno: number, esito: { uscita: VoceUscita[] }, segno: { mostrato: boolean }, log: Logger): { id: string; righe: number } | null {
    const s = this.statoRepertorio!;
    const b = s.disponibili(turno).find((x) => x.tipo === 'segno_orologio' && this.elencoTurno.has(x.id));
    if (!b) {
      log.warn({ turno }, 'orologio: segno dovuto ma nessuna battuta di segno disponibile');
      return null;
    }
    const uso = this.usaBattuta(b.id, null, turno, segno);
    if (!uso.ok) {
      log.error({ turno, battuta: b.id, motivo: uso.motivo }, 'orologio: segno dovuto non applicabile');
      return null;
    }
    const ultima = esito.uscita.at(-1);
    const invito = ultima?.tipo === 'improvvisata' && ultima.etichetta === ID_NARRATORE && ultima.testo.includes('?') ? ultima : null;
    // Voce: prima della prima frase dell'invito, se è ancora in coda.
    const frasi = uso.righe.map((r, k) => {
      const { voce_id, nome } = voceDi(this.campagna, r.etichetta);
      return { id_frase: `t${turno}-m${k}`, turno, indice: 900 + k, parlante: r.etichetta, nome, voce_id, testo: r.testo, testo_voce: r.testo_voce, chiave_cache: r.chiave_cache };
    });
    const primaDellInvito = this.pipeline.accodaPrima(frasi, invito?.frasi?.[0] ?? '');
    // Trascrizione: le righe del segno prima della voce dell'invito.
    const nuove = uso.righe.map((r) =>
      this.aggiungiTrascrizione({ turno, tipo: r.etichetta === ID_NARRATORE ? 'narrazione' : 'battuta', chi: r.etichetta, nome: voceDi(this.campagna, r.etichetta).nome, testo: r.testo }),
    );
    const vocInvito = invito?.segmento !== undefined ? this.segmentiAperti.get(`${turno}:${invito.segmento}`) : undefined;
    if (vocInvito) {
      this.trascrizione.splice(this.trascrizione.length - nuove.length, nuove.length);
      this.trascrizione.splice(this.trascrizione.indexOf(vocInvito), 0, ...nuove);
    }
    // Uscita del turno: la battuta, marcata come aggiunta dal Motore, prima dell'invito.
    const voce: VoceUscita = { tipo: 'usa', id: b.id, per: null, versione: uso.versione, righe: uso.righe.map((r) => ({ etichetta: r.etichetta, testo: r.testo })), motore: true };
    if (invito) esito.uscita.splice(esito.uscita.length - 1, 0, voce);
    else esito.uscita.push(voce);
    log.info({ turno, battuta: b.id, prima_dell_invito: !!invito && primaDellInvito }, 'orologio: segno dovuto aggiunto dal Motore');
    this.notifica();
    return { id: b.id, righe: uso.righe.length };
  }

  /**
   * Azioni pubbliche rimaste senza risposta: nessuna battuta `> pg` e nessuna riga improvvisata
   * che nomina quel PG (per nome, nome breve o soprannome).
   */
  private azioniSenzaRisposta(uscita: VoceUscita[], pubbliche: Map<string, string>): string[] {
    const risposte = new Set<string>();
    const testoImprovvisato = normalizza(uscita.filter((u) => u.tipo === 'improvvisata').map((u) => (u.tipo === 'improvvisata' ? u.testo : '')).join('\n'));
    for (const u of uscita) if (u.tipo === 'usa' && u.per) risposte.add(u.per);
    for (const id of pubbliche.keys()) {
      if (risposte.has(id)) continue;
      const nome = this.nomePg(id);
      const varianti = [nome, nomeBreve(nome), ...Object.entries(this.campagna.alias).filter(([, v]) => v === id).map(([k]) => k)];
      if (varianti.some((v) => v.length > 2 && new RegExp(`(?<![\\p{L}])${normalizza(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u').test(testoImprovvisato))) risposte.add(id);
    }
    return [...pubbliche.keys()].filter((id) => !risposte.has(id));
  }

  /** Testo di un fatto del canone (per i fatti scoperti). */
  private testoFatto(id: string): string {
    const canone = (this.campagna.campagnaNarratore['canone'] as Array<Record<string, unknown>> | undefined) ?? [];
    const f = canone.find((x) => x?.['id'] === id);
    return typeof f?.['testo'] === 'string' ? f['testo'] : id;
  }

  /** Unisce le frasi dello stesso segmento in una voce di trascrizione. */
  private trascriviFrase(turno: number, etichetta: string, nome: string, testo: string, segmento: number): void {
    const chiave = `${turno}:${segmento}`;
    const aperta = this.segmentiAperti.get(chiave);
    if (aperta) aperta.testo = `${aperta.testo} ${testo}`;
    else {
      const voce = this.aggiungiTrascrizione({
        turno,
        tipo: etichetta === ID_NARRATORE ? 'narrazione' : 'battuta',
        chi: etichetta,
        nome,
        testo,
      });
      this.segmentiAperti.set(chiave, voce);
    }
    this.notifica();
  }

  private parlaRiserva(turno: number): void {
    const mossa = this.campagna.scena.dati['mossa_morbida_pronta'];
    const testo = typeof mossa === 'string' && mossa.trim() ? mossa.trim() : 'Il fuoco crepita. Per un momento, nessuno parla.';
    this.trascriviFrase(turno, ID_NARRATORE, NOME_NARRATORE, testo, 999);
    this.pipeline.accoda({
      id_frase: `t${turno}-riserva`,
      turno,
      indice: 0,
      parlante: ID_NARRATORE,
      nome: NOME_NARRATORE,
      voce_id: ID_NARRATORE,
      testo,
      testo_voce: this.pronuncia(testo),
    });
  }

  /**
   * Aspetta che l'audio del turno abbia finito di suonare sullo schermo. Risolve con l'istante
   * (monotono) della fine riferita dallo schermo, oppure null se si è andati avanti con la stima
   * (nessuno schermo, o schermo muto).
   */
  private attendiFineAudio(turno: number, secondi: number): Promise<number | null> {
    if (this.schermi.size === 0 || secondi === 0) return Promise.resolve(null);
    return new Promise((risolvi) => {
      const attesa: AttesaAudio = { turno, risolvi, timer: null };
      this.attesaAudio = attesa;
      this.programmaStimaFine(attesa, secondi);
    });
  }

  /** Riserva: se lo schermo non avvisa, si va avanti alla fine stimata dell'audio più un margine. */
  private programmaStimaFine(attesa: AttesaAudio, secondi: number): void {
    attesa.timer?.();
    const ora = this.o.orologio.ora();
    const inizio = this.primoAudioInviato.get(attesa.turno) ?? ora;
    const fineStimata = inizio + secondi * 1000;
    const ms = Math.max(0, fineStimata - ora) + (this.schermi.size > 0 ? this.o.margineFineAudioMs : 0);
    attesa.timer = this.o.orologio.dopo(ms, () => {
      if (this.attesaAudio !== attesa) return;
      this.attesaAudio = null;
      this.o.log.warn({ turno: attesa.turno, attesa_ms: Math.round(ms) }, 'schermo: fine audio non ricevuta, si prosegue con la stima');
      attesa.risolvi(null);
    });
  }
}
