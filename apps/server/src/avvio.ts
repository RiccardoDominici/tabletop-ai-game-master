/**
 * Composizione del server: config → campagna → narratore → voce → regia → HTTP/Socket.IO.
 * Separata da index.ts così i test d'integrazione costruiscono lo stesso server con le parti
 * finte (narratore a copione, voce finta veloce, porta casuale).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { InfoServer } from '@cantastorie/shared';
import { creaApp, registraRotte, type App } from './app';
import { caricaCampagna } from './campagna/caricatore';
import { compilaContestoCampagna } from './campagna/contesto';
import { conScena, type Campagna } from './campagna/tipi';
import type { ConfigServer } from './config';
import type { Logger } from './logger';
import { NarratoreFinto } from './llm/finto';
import { NarratoreHaiku } from './llm/haiku';
import type { Narratore } from './llm/tipi';
import { RegistroJsonl } from './metriche/jsonl';
import { CARTELLA_WEB_DIST } from './percorsi';
import { creaInfoServer } from './rete';
import { Regia } from './scena/regia';
import { caricaRepertorio } from './repertorio/caricatore';
import { compilaContestoRepertorio } from './repertorio/contesto';
import { caricaParoleSegrete, segretiNelTesto } from './repertorio/segreti';
import type { Repertorio } from './repertorio/tipi';
import { CacheAudio } from './voce/cache-audio';
import { CatalogoImmagini } from './campagna/immagini';
import { CatalogoAudio } from './audio/catalogo';
import { ArbitroHaiku } from './azioni/arbitro-haiku';
import { riassuntoPubblico } from './azioni/contesto';
import type { Arbitro } from './azioni/tipi';
import { creaClientAnthropic } from './llm/haiku';
import { collegaSocket, creaUscite } from './trasporto/socket';
import { collegaMaster } from './trasporto/master';
import { ControlliMaster } from './master/comandi';
import { nuovoToken } from './master/token';
import { orologioDiSistema, type Orologio } from './turni/orologio';
import { MotoreVoceHttp } from './voce/http';
import { MotoreVoceMock } from './voce/mock';
import { SelettoreVoce } from './voce/selettore';

export interface ServerCantastorie {
  app: App;
  regia: Regia;
  campagna: Campagna;
  voce: SelettoreVoce;
  info: InfoServer;
  /** Token del pannello del master (stampato nel log all'avvio). */
  tokenMaster: string;
  avvia(): Promise<string>;
  chiudi(): Promise<void>;
}

export interface Sostituzioni {
  narratore?: Narratore;
  /** Arbitro delle azioni (test: uno finto; null = solo regole). */
  arbitro?: Arbitro | null;
  orologio?: Orologio;
  cartellaWeb?: string;
}

export async function costruisciServer(config: ConfigServer, log: Logger, sost: Sostituzioni = {}): Promise<ServerCantastorie> {
  const campagna = caricaCampagna(config.cartellaCampagna, log.child({ modulo: 'campagna' }));
  // Modalità A (improvvisa): prompt del narratore + contesto completo della campagna.
  // Modalità B (repertorio): prompt del selettore + contesto per allowlist (niente segreti) e
  // repertorio di battute pre-scritte con il loro audio pre-generato.
  let repertorio: Repertorio | undefined;
  const cartellaRepertorio = path.join(campagna.cartella, 'repertorio');
  const paroleSegrete = caricaParoleSegrete(cartellaRepertorio);
  let filePrompt = config.filePromptNarratore;
  if (config.modo === 'repertorio') {
    repertorio = caricaRepertorio(campagna, log.child({ modulo: 'repertorio' }));
    filePrompt = config.filePromptSelettore;
  }
  const rep = repertorio;
  /** Contesto della campagna vista da una scena (cambia col passaggio di scena). */
  const contestoPer = (c: Campagna): string => (rep ? compilaContestoRepertorio(c, paroleSegrete, rep) : compilaContestoCampagna(c));
  // Rete di sicurezza in modalità B: nessuna scena deve portare parole segrete nel contesto del selettore.
  if (rep) {
    for (const sc of campagna.scene) {
      const fughe = segretiNelTesto(contestoPer(conScena(campagna, sc.id)), paroleSegrete);
      if (fughe.length) throw new Error(`contesto del selettore (scena ${sc.id}) con parole segrete: ${fughe.map((p) => p.parola).join(', ')}`);
    }
  }
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
      ? new NarratoreFinto({ idPng: campagna.png.map((p) => p.id), idPg: campagna.pg.map((p) => p.id) })
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

  const voce = new SelettoreVoce(
    config.voce.modo,
    new MotoreVoceHttp(config.voce.url, log.child({ modulo: 'voce-http' })),
    new MotoreVoceMock({ scalaTempo: config.voce.scalaTempoMock }),
    log.child({ modulo: 'voce' }),
    config.voce.intervalloSaluteMs,
  );

  const immagini = new CatalogoImmagini(config.cartellaImmagini, log.child({ modulo: 'immagini' }));
  const audio = new CatalogoAudio(config.cartellaAudio, log.child({ modulo: 'audio' }));
  const app = await creaApp({ log, cartellaWeb: sost.cartellaWeb ?? CARTELLA_WEB_DIST });
  const uscite = creaUscite(app.io);
  const regia = new Regia({
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
    chiusuraDopoPrimaAzioneMs: config.turni.chiusuraDopoPrimaAzioneMs,
    margineFineAudioMs: config.turni.margineFineAudioMs,
    trascrizioneMax: config.turni.trascrizioneMax,
    preriscalda: config.llm.preriscalda,
    modo: config.modo,
    ...(repertorio ? { repertorio } : {}),
    paroleSegrete,
    cacheAudio: new CacheAudio(config.cacheAudio),
    finestraATutti: config.turni.finestraATutti,
    arbitro,
    scenaPubblica: riassuntoPubblico(campagna, paroleSegrete),
    sistemaPer,
    scenaPubblicaPer: (c) => riassuntoPubblico(c, paroleSegrete),
    immagini,
    audio,
    stalloMs: config.turni.stalloMs,
  });
  regia.collega(uscite.regia);

  let info = await creaInfoServer(config.porta, config.ipLan);
  collegaSocket(app.io, regia, () => info, log.child({ modulo: 'socket' }));
  // Pannello del master: stanza "master" col token (da configurazione, o nuovo a ogni avvio).
  const tokenMaster = config.tokenMaster ?? nuovoToken();
  const controlliMaster = new ControlliMaster({
    regia,
    campagna,
    immagini,
    registro: new RegistroJsonl(path.join(config.cartellaLog, 'master.jsonl')),
    log: log.child({ modulo: 'master' }),
  });
  collegaMaster(app.io, regia, controlliMaster, tokenMaster, log.child({ modulo: 'master' }));
  registraRotte(app, regia, () => info, () => ({ narratore: narratore.nome, modello: narratore.modello, campagna: campagna.id, immagini: immagini.numero, audio: audio.numero, ...regia.infoSessione }), immagini, audio);

  return {
    app,
    regia,
    campagna,
    voce,
    tokenMaster,
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
      regia.ferma('arresto');
      app.io.close();
      await app.http.close();
    },
  };
}
