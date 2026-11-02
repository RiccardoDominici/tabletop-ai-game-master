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
import type { Campagna } from './campagna/tipi';
import type { ConfigServer } from './config';
import type { Logger } from './logger';
import { NarratoreFinto } from './llm/finto';
import { NarratoreHaiku } from './llm/haiku';
import type { Narratore } from './llm/tipi';
import { RegistroJsonl } from './metriche/jsonl';
import { CARTELLA_WEB_DIST } from './percorsi';
import { creaInfoServer } from './rete';
import { Regia } from './scena/regia';
import { collegaSocket, creaUscite } from './trasporto/socket';
import { orologioDiSistema, type Orologio } from './turni/finestra';
import { MotoreVoceHttp } from './voce/http';
import { MotoreVoceMock } from './voce/mock';
import { SelettoreVoce } from './voce/selettore';

export interface ServerCantastorie {
  app: App;
  regia: Regia;
  campagna: Campagna;
  voce: SelettoreVoce;
  info: InfoServer;
  avvia(): Promise<string>;
  chiudi(): Promise<void>;
}

export interface Sostituzioni {
  narratore?: Narratore;
  orologio?: Orologio;
  cartellaWeb?: string;
}

export async function costruisciServer(config: ConfigServer, log: Logger, sost: Sostituzioni = {}): Promise<ServerCantastorie> {
  const campagna = caricaCampagna(config.cartellaCampagna, log.child({ modulo: 'campagna' }));
  const prompt = fs.readFileSync(config.filePromptNarratore, 'utf8');
  const contesto = compilaContestoCampagna(campagna);
  // Blocchi STABILI, in quest'ordine: si mettono in cache (vedi llm/haiku.ts).
  const sistema = [prompt, contesto];
  log.info(
    { prompt: path.relative(process.cwd(), config.filePromptNarratore), caratteriPrompt: prompt.length, caratteriContesto: contesto.length },
    'narratore: contesto compilato',
  );

  const narratore: Narratore =
    sost.narratore ??
    (config.llm.modo === 'finto'
      ? new NarratoreFinto({ idPng: campagna.png.map((p) => p.id), idPg: campagna.pg.map((p) => p.id) })
      : new NarratoreHaiku({ modello: config.llm.modello, maxTokens: config.llm.maxTokens, fileChiave: config.llm.fileChiave, log: log.child({ modulo: 'llm' }) }));
  log.info({ narratore: narratore.nome, modello: narratore.modello }, `NARRATORE IN USO: ${narratore.nome}`);

  const voce = new SelettoreVoce(
    config.voce.modo,
    new MotoreVoceHttp(config.voce.url, log.child({ modulo: 'voce-http' })),
    new MotoreVoceMock({ scalaTempo: config.voce.scalaTempoMock }),
    log.child({ modulo: 'voce' }),
    config.voce.intervalloSaluteMs,
  );

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
    registroCosti: new RegistroJsonl(path.join(config.cartellaLog, 'costi.jsonl')),
    registroNarrazioni: new RegistroJsonl(path.join(config.cartellaLog, 'narrazioni.jsonl')),
    chiusuraDopoPrimaAzioneMs: config.turni.chiusuraDopoPrimaAzioneMs,
    margineFineAudioMs: config.turni.margineFineAudioMs,
    trascrizioneMax: config.turni.trascrizioneMax,
    preriscalda: config.llm.preriscalda,
  });
  regia.collega(uscite.regia);

  let info = await creaInfoServer(config.porta, config.ipLan);
  collegaSocket(app.io, regia, () => info, log.child({ modulo: 'socket' }));
  registraRotte(app, regia, () => info, () => ({ narratore: narratore.nome, modello: narratore.modello, campagna: campagna.id }));

  return {
    app,
    regia,
    campagna,
    voce,
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
