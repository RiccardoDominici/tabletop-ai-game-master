/**
 * Composizione del server: config → campagna → narratore → voce → regia → HTTP/Socket.IO.
 * Separata da index.ts così i test d'integrazione costruiscono lo stesso server con le parti
 * finte (narratore a copione, voce finta veloce, porta casuale).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { InfoServer } from '@cantastorie/shared';
import { creaApp, registraRotte, type App } from './app';
import { caricaCampagna, idCampagna } from './campagna/caricatore';
import { elencoPacchetti } from './campagna/pacchetti';
import { compilaContestoCampagna } from './campagna/contesto';
import { conScena, type Campagna } from './campagna/tipi';
import type { ConfigServer } from './config';
import type { Logger } from './logger';
import { copioneDaFile, NarratoreFinto } from './llm/finto';
import { NarratoreHaiku } from './llm/haiku';
import type { Narratore } from './llm/tipi';
import { RegistroJsonl } from './metriche/jsonl';
import { creaInfoServer } from './rete';
import { Regia } from './scena/regia';
import { caricaRepertorio } from './repertorio/caricatore';
import { compilaContestoRepertorio } from './repertorio/contesto';
import { caricaParoleSegreteCampagna, segretiNelTesto } from './repertorio/segreti';
import type { Repertorio } from './repertorio/tipi';
import { CacheAudio } from './voce/cache-audio';
import { CatalogoImmagini } from './campagna/immagini';
import { CatalogoAudio } from './audio/catalogo';
import { bloccoAudioContesto } from './audio/cue';
import { ArbitroHaiku } from './azioni/arbitro-haiku';
import { riassuntoPubblico } from './azioni/contesto';
import type { Arbitro } from './azioni/tipi';
import { creaClientAnthropic } from './llm/haiku';
import { collegaSocket, creaUscite, STANZA_SCHERMO } from './trasporto/socket';
import { collegaMaster } from './trasporto/master';
import { ArchivioSessioni } from './sessione/archivio';
import { SessioneSuArchivio, type MemoriaSessione } from './sessione/memoria';
import { ricostruisci, type StatoRicostruito } from './sessione/tipi';
import { CicloSessioni } from './sessione/ciclo';
import { scegliPacchetto, type SceltaPacchetto } from './sessione/scelta-pacchetto';
import { loggerMuto } from './logger';
import { ControlliMaster } from './master/comandi';
import { nuovoToken } from './master/token';
import { orologioDiSistema, type Orologio } from './turni/orologio';
import { MotoreVoceHttp } from './voce/http';
import { MotoreVoceMock } from './voce/mock';
import { SelettoreVoce } from './voce/selettore';
import { MotoreVoceFish } from './voce/fish';
import { caricaRegistroVoci } from './voce/registro-voci';

export interface ServerCantastorie {
  app: App;
  regia: Regia;
  campagna: Campagna;
  voce: SelettoreVoce;
  info: InfoServer;
  /** Token del pannello del master (stampato nel log all'avvio). */
  tokenMaster: string;
  /** Registro delle sessioni (null se spento): i test simulano un processo che muore con memoria.sospendi(). */
  sessioni: { archivio: ArchivioSessioni | null; memoria: MemoriaSessione | null };
  /** Fine sessione / prossima sessione (pannello del master). */
  ciclo: CicloSessioni;
  /** Come è stato scelto il pacchetto all'avvio (one-shot: numero null). */
  scelta: SceltaPacchetto;
  avvia(): Promise<string>;
  chiudi(): Promise<void>;
}

export interface Sostituzioni {
  narratore?: Narratore;
  /** Arbitro delle azioni (test: uno finto; null = solo regole). */
  arbitro?: Arbitro | null;
  orologio?: Orologio;
  cartellaWeb?: string;
  /**
   * Chi sa ricostruire il server su un altro pacchetto («Prossima sessione»): ServerConCiclo.
   * Assente = il pannello non può cambiare pacchetto (lo dice).
   */
  passaA?: (numero: number) => void;
}

/** Campagna pronta da giocare: pacchetto caricato, repertorio, parole segrete, cataloghi, contesto. */
interface CampagnaPronta {
  campagna: Campagna;
  repertorio: Repertorio | undefined;
  paroleSegrete: ReturnType<typeof caricaParoleSegreteCampagna>;
  audio: CatalogoAudio;
  immagini: CatalogoImmagini;
  contestoPer: (c: Campagna) => string;
  filePrompt: string;
}

/**
 * Carica la campagna (col pacchetto `numero`, se è a più sessioni) come la gioca il server, con tutti i
 * controlli che fermano l'avvio: repertorio valido in modalità B e nessuna parola segreta nel
 * contesto del selettore. La usa anche «Prossima sessione» per sapere se il pacchetto dopo si carica.
 */
function preparaCampagna(config: ConfigServer, numero: number | null, log: Logger): CampagnaPronta {
  const campagna = caricaCampagna(config.cartellaCampagna, log.child({ modulo: 'campagna' }), { pacchetto: numero });
  // Modalità A (improvvisa): prompt del narratore + contesto completo della campagna.
  // Modalità B (repertorio): prompt del selettore + contesto per allowlist (niente segreti) e
  // repertorio di battute pre-scritte con il loro audio pre-generato.
  let repertorio: Repertorio | undefined;
  const paroleSegrete = caricaParoleSegreteCampagna(campagna);
  let filePrompt = config.filePromptNarratore;
  if (config.modo === 'repertorio') {
    repertorio = caricaRepertorio(campagna, log.child({ modulo: 'repertorio' }));
    filePrompt = config.filePromptSelettore;
  }
  const rep = repertorio;
  // Risorse: quelle della campagna, più quelle nuove del pacchetto (che sostituiscono a parità di id).
  const cartellePacchetto = (sotto: string): string[] => (campagna.pacchetto ? [path.join(campagna.pacchetto.cartella, sotto)] : []);
  // Audio: serve già qui, perché narratore e selettore sanno quali umori ed effetti esistono
  // (righe [umore] ed [effetto], docs/audio.md).
  const audio = new CatalogoAudio([config.cartellaAudio, ...cartellePacchetto('audio')], log.child({ modulo: 'audio' }));
  const immagini = new CatalogoImmagini([config.cartellaImmagini, ...cartellePacchetto('immagini')], log.child({ modulo: 'immagini' }));
  const bloccoAudio = bloccoAudioContesto(audio);
  /** Contesto della campagna vista da una scena (cambia col passaggio di scena). */
  const contestoPer = (c: Campagna): string => {
    const base = rep ? compilaContestoRepertorio(c, paroleSegrete, rep) : compilaContestoCampagna(c);
    return bloccoAudio ? `${base}\n\n${bloccoAudio}` : base;
  };
  // Rete di sicurezza in modalità B: nessuna scena deve portare parole segrete nel contesto del selettore.
  if (rep) {
    for (const sc of campagna.scene) {
      const fughe = segretiNelTesto(contestoPer(conScena(campagna, sc.id)), paroleSegrete);
      if (fughe.length) throw new Error(`contesto del selettore (scena ${sc.id}) con parole segrete: ${fughe.map((p) => p.parola).join(', ')}`);
    }
  }
  return { campagna, repertorio, paroleSegrete, audio, immagini, contestoPer, filePrompt };
}

/** «Prossima sessione»: il pacchetto si carica come all'avvio? (motivo null = sì). */
function verificaPacchetto(config: ConfigServer, numero: number): { motivo: string | null; titolo: string | null } {
  try {
    const p = preparaCampagna(config, numero, loggerMuto());
    return { motivo: null, titolo: p.campagna.pacchetto?.titolo ?? null };
  } catch (err) {
    return { motivo: (err as Error).message.split('\n').slice(0, 3).join(' '), titolo: null };
  }
}

export async function costruisciServer(config: ConfigServer, log: Logger, sost: Sostituzioni = {}): Promise<ServerCantastorie> {
  // Archivio prima della campagna: in una campagna a più sessioni è lui a dire quale pacchetto si gioca.
  const archivio = config.fileSessioni ? new ArchivioSessioni(config.fileSessioni, log.child({ modulo: 'sessioni' })) : null;
  const id = idCampagna(config.cartellaCampagna);
  if (archivio && config.nuovaSessione) {
    const chiuse = archivio.chiudiInCorso(id, 'avvio con --nuova');
    log.info({ campagna: id, chiuse }, 'sessioni: nuova sessione richiesta, nessuna ripresa');
  }
  let scelta = scegliPacchetto(elencoPacchetti(config.cartellaCampagna), archivio?.elenco(id) ?? [], config.modo, config.sessione);
  let pronta: CampagnaPronta;
  try {
    pronta = preparaCampagna(config, scelta.numero, log);
  } catch (err) {
    // Il pacchetto dopo una «Fine sessione» è preparato a metà: si resta su quello appena finito.
    if (scelta.riserva === undefined) throw err;
    const motivo = (err as Error).message.split('\n')[0];
    log.error({ campagna: id, pacchetto: scelta.numero, riserva: scelta.riserva, err: motivo }, 'sessioni: il pacchetto dopo non si carica, si resta su quello finito');
    scelta = { numero: scelta.riserva, motivo: 'ultima giocata', avviso: `La sessione ${scelta.numero} non si carica (${motivo}): si resta sulla ${scelta.riserva}.` };
    pronta = preparaCampagna(config, scelta.numero, log);
  }
  if (scelta.numero !== null) log.info({ campagna: id, pacchetto: scelta.numero, motivo: scelta.motivo, avviso: scelta.avviso }, `CAMPAGNA A PIÙ SESSIONI: si gioca la sessione ${scelta.numero}`);
  if (scelta.avviso) log.warn({ campagna: id }, scelta.avviso);
  const { campagna, repertorio, paroleSegrete, audio, immagini, contestoPer, filePrompt } = pronta;
  const contesto = contestoPer(campagna);
  const prompt = fs.readFileSync(filePrompt, 'utf8');
  // Blocchi STABILI, in quest'ordine: si mettono in cache (vedi llm/haiku.ts).
  const sistema = [prompt, contesto];
  const sistemaPer = (c: Campagna): string[] => [prompt, contestoPer(c)];
  log.info(
    { modo: config.modo, prompt: path.relative(process.cwd(), filePrompt), caratteriPrompt: prompt.length, caratteriContesto: contesto.length, paroleSegrete: paroleSegrete.length },
    `NARRATORE IN MODALITÀ: ${config.modo}`,
  );

  const narratore: Narratore =
    sost.narratore ??
    (config.llm.modo === 'finto'
      ? new NarratoreFinto({
          idPng: campagna.png.map((p) => p.id),
          idPg: campagna.pg.map((p) => p.id),
          ...(config.llm.copioneFinto ? { copione: copioneDaFile(config.llm.copioneFinto) } : {}),
        })
      : new NarratoreHaiku({ modello: config.llm.modello, maxTokens: config.llm.maxTokens, fileChiave: config.llm.fileChiave, log: log.child({ modulo: 'llm' }) }));
  log.info({ narratore: narratore.nome, modello: narratore.modello }, `NARRATORE IN USO: ${narratore.nome}`);

  // Arbitro delle azioni simultanee: regole subito, Haiku (uscita strutturata) per il resto.
  const registroCosti = new RegistroJsonl(path.join(config.cartellaLog, 'costi.jsonl'));
  let clientArbitro: ReturnType<typeof creaClientAnthropic> | null = null;
  const arbitro: Arbitro | null =
    sost.arbitro !== undefined
      ? sost.arbitro
      : config.arbitro === 'haiku'
        ? new ArbitroHaiku(() => (clientArbitro ??= creaClientAnthropic(config.llm.fileChiave, log.child({ modulo: 'arbitro' }))), {
            modello: config.llm.modello,
            log: log.child({ modulo: 'arbitro' }),
            onMisura: (m) => registroCosti.scrivi({ ts: new Date().toISOString(), tipo: `arbitro_${m.tipo}`, modello: config.llm.modello, ms: m.ms, ...m.costo }),
          })
        : null;
  log.info({ arbitro: arbitro ? 'regole + haiku' : 'solo regole' }, 'ARBITRO DELLE AZIONI');

  // drama-3 via OpenRouter (CANTASTORIE_VOCE=fish): voci dal registro, chiave letta al primo uso.
  const fish =
    config.voce.modo === 'fish'
      ? {
          motore: new MotoreVoceFish({
            fileChiave: config.voce.fish.fileChiave,
            voci: caricaRegistroVoci(config.voce.fish.registro),
            primoByteMs: config.voce.fish.primoByteMs,
            log: log.child({ modulo: 'voce-fish' }),
          }),
          riservaQwen: config.voce.fish.riservaQwen,
        }
      : undefined;
  const voce = new SelettoreVoce(
    config.voce.modo,
    new MotoreVoceHttp(config.voce.url, log.child({ modulo: 'voce-http' })),
    new MotoreVoceMock({ scalaTempo: config.voce.scalaTempoMock }),
    log.child({ modulo: 'voce' }),
    config.voce.intervalloSaluteMs,
    fish,
  );

  const app = await creaApp({ log, cartellaWeb: sost.cartellaWeb ?? config.cartellaWeb });
  const uscite = creaUscite(app.io);
  // Registro delle sessioni: se c'è una sessione in corso di questa campagna (e modalità), si riprende.
  const { memoria, ripresa, dispositiviEreditati } = apriSessioni(archivio, config, campagna, log.child({ modulo: 'sessioni' }));
  const regia = new Regia({
    memoria,
    ripresa,
    dispositiviEreditati,
    campagna,
    sistema,
    narratore,
    voce,
    uscitaAudio: uscite.audio,
    orologio: sost.orologio ?? orologioDiSistema,
    log: log.child({ modulo: 'regia' }),
    registroTurni: new RegistroJsonl(path.join(config.cartellaLog, 'turni.jsonl')),
    registroCosti,
    registroNarrazioni: new RegistroJsonl(path.join(config.cartellaLog, 'narrazioni.jsonl')),
    assestamentoMs: config.turni.assestamentoMs,
    concitatoMs: config.turni.concitatoMs,
    sorveglianteMs: config.turni.sorveglianteMs,
    margineFineAudioMs: config.turni.margineFineAudioMs,
    trascrizioneMax: config.turni.trascrizioneMax,
    preriscalda: config.llm.preriscalda,
    modo: config.modo,
    ...(repertorio ? { repertorio } : {}),
    paroleSegrete,
    cacheAudio: new CacheAudio(config.cacheAudio, config.voce.fish.cacheAudio),
    finestraATutti: config.turni.finestraATutti,
    arbitro,
    scenaPubblica: riassuntoPubblico(campagna, paroleSegrete),
    sistemaPer,
    scenaPubblicaPer: (c) => riassuntoPubblico(c, paroleSegrete),
    immagini,
    audio,
  });
  regia.collega(uscite.regia);

  let info = await creaInfoServer(config.porta, config.ipLan);
  collegaSocket(app.io, regia, () => info, log.child({ modulo: 'socket' }));
  // Pannello del master: stanza "master" col token (da configurazione, o nuovo a ogni avvio).
  const tokenMaster = config.tokenMaster ?? nuovoToken();
  const ciclo = new CicloSessioni({
    cartellaCampagna: config.cartellaCampagna,
    cartellaLog: config.cartellaLog,
    campagna,
    archivio,
    regia,
    avvisoScelta: scelta.avviso,
    verifica: (n) => verificaPacchetto(config, n),
    passaA: sost.passaA ?? null,
    log: log.child({ modulo: 'sessioni' }),
  });
  const controlliMaster = new ControlliMaster({
    regia,
    ciclo,
    campagna,
    immagini,
    audio,
    suonaEffetto: (id) => app.io.to(STANZA_SCHERMO).emit('audio:effetto', { id }),
    registro: new RegistroJsonl(path.join(config.cartellaLog, 'master.jsonl')),
    log: log.child({ modulo: 'master' }),
  });
  collegaMaster(app.io, regia, controlliMaster, tokenMaster, log.child({ modulo: 'master' }));
  // Segnali audio automatici (narratore, battute) nel registro del pannello.
  regia.suCueAudio((e) => controlliMaster.registraAutomatico(e));
  registraRotte(app, regia, () => info, () => ({ narratore: narratore.nome, modello: narratore.modello, campagna: campagna.id, immagini: immagini.numero, audio: audio.numero, ...regia.infoSessione, ripresa: regia.infoRegistro.inAttesaDiRipresa, pacchetto: campagna.pacchetto?.etichetta ?? null }), immagini, audio);

  return {
    app,
    regia,
    campagna,
    voce,
    tokenMaster,
    sessioni: { archivio, memoria },
    ciclo,
    scelta,
    get info() {
      return info;
    },
    async avvia() {
      await voce.avvia();
      // Controllo incrociato: i voce_id dei PNG devono esistere nel registro del servizio vero.
      const note = voce.voci;
      if (note) {
        for (const p of campagna.png) if (!note.includes(p.voce_id)) log.error({ png: p.id, voce_id: p.voce_id, note }, 'campagna: voce_id non presente nel servizio voce');
      }
      const indirizzo = await app.http.listen({ port: config.porta, host: config.host });
      // Con porta 0 (test) l'indirizzo vero si conosce solo ora.
      const porta = (app.http.server.address() as { port: number }).port;
      if (porta !== config.porta) info = await creaInfoServer(porta, config.ipLan);
      return indirizzo;
    },
    async chiudi() {
      voce.ferma();
      // Lo spegnimento non è un evento di gioco: il registro resta all'ultimo stato giocato.
      memoria?.sospendi();
      regia.spegni();
      archivio?.chiudi();
      app.io.close();
      await app.http.close();
    },
  };
}

/**
 * Cerca la sessione da riprendere: l'ultima in corso della stessa campagna e modalità (e, in una
 * campagna a pacchetti, dello stesso pacchetto), con almeno una fotografia. --nuova ha già chiuso
 * quelle in corso (costruisciServer). Senza registro (CANTASTORIE_SESSIONI=off) non si salva niente.
 *
 * Campagna a pacchetti senza ripresa: i telefoni della sessione prima ritrovano il loro PG
 * (i PG durano tra le sessioni).
 */
function apriSessioni(
  archivio: ArchivioSessioni | null,
  config: ConfigServer,
  campagna: Campagna,
  log: Logger,
): { memoria: MemoriaSessione | null; ripresa: StatoRicostruito | null; dispositiviEreditati: Map<string, string> | null } {
  if (!archivio) {
    log.info('sessioni: registro spento (CANTASTORIE_SESSIONI=off)');
    return { memoria: null, ripresa: null, dispositiviEreditati: null };
  }
  const pacchetto = campagna.pacchetto?.numero ?? null;
  const candidata = archivio.inCorso(campagna.id, config.modo);
  // Una sessione in corso di un altro pacchetto (es. avvio con --sessione N) non si riprende qui.
  const inCorso = candidata && candidata.pacchetto === pacchetto ? candidata : null;
  if (candidata && !inCorso) log.info({ sessione: candidata.id, suo: candidata.pacchetto, giocato: pacchetto }, 'sessioni: la sessione in corso è di un altro pacchetto, non si riprende');
  const ripresa = inCorso ? ricostruisci(inCorso.id, archivio.eventi(inCorso.id)) : null;
  if (inCorso && !ripresa) log.info({ sessione: inCorso.id }, 'sessioni: sessione in corso senza stato salvato, si parte da capo');
  if (ripresa) log.info({ sessione: inCorso!.id, turno: ripresa.fotografia.turno, eventi: inCorso!.eventi, pacchetto }, 'SESSIONE DA RIPRENDERE');
  let dispositiviEreditati: Map<string, string> | null = null;
  if (!ripresa && pacchetto !== null) {
    const prima = archivio.elenco(campagna.id).find((x) => x.pacchetto !== null);
    if (prima) dispositiviEreditati = archivio.dispositivi(prima.id);
  }
  const memoria = new SessioneSuArchivio(archivio, campagna.id, config.modo, log, ripresa ? inCorso!.id : null, pacchetto);
  return { memoria, ripresa, dispositiviEreditati };
}
