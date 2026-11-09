/**
 * Aiuti per le prove col server intero: un server col selettore a copione e la voce finta veloce,
 * una copia della campagna da ritoccare, proiettore, telefoni e pannello del master, un turno giocato.
 * Le prove del Motore (finale, orologi, PNG assenti, selettore, rientro) li condividono.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect } from 'vitest';
import YAML from 'yaml';
import { io as connetti, type Socket } from 'socket.io-client';
import type { ComandoMaster, Esito, EsitoEntrataMaster, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoMaster, StatoTavolo } from '@cantastorie/shared';
import { costruisciServer, type ServerCantastorie } from '../../src/avvio';
import { caricaConfig } from '../../src/config';
import { loggerMuto } from '../../src/logger';
import { NarratoreFinto } from '../../src/llm/finto';

export type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
export const FIXTURE = path.join(import.meta.dirname, '..', 'fixtures', 'campagne');
const TOKEN = 'token_di_prova_motore';

/** Una partita di prova: tutto ciò che va chiuso alla fine sta qui. */
export class Prova {
  readonly cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-motore-'));
  private readonly client: Client[] = [];
  private readonly server: ServerCantastorie[] = [];
  /** Righe JSON di logs/narrazioni.jsonl e turni.jsonl del server (per le misure del Motore). */
  narrazioni(): Array<Record<string, unknown>> {
    return leggiJsonl(path.join(this.cartella, 'log', 'narrazioni.jsonl'));
  }
  turni(): Array<Record<string, unknown>> {
    return leggiJsonl(path.join(this.cartella, 'log', 'turni.jsonl'));
  }

  /** Copia di una campagna di fixture, con battute in più in repertorio/<file>.yaml e ritocchi ai file. */
  campagna(base: string, o: { battute?: Record<string, unknown[]>; ritocchi?: Record<string, (d: Record<string, unknown>) => void> } = {}): string {
    const dest = path.join(this.cartella, base);
    fs.cpSync(path.join(FIXTURE, base), dest, { recursive: true });
    for (const [file, battute] of Object.entries(o.battute ?? {})) {
      const f = path.join(dest, 'repertorio', file);
      const dati = (fs.existsSync(f) ? (YAML.parse(fs.readFileSync(f, 'utf8')) as Record<string, unknown>) : null) ?? {};
      dati['battute'] = [...((dati['battute'] as unknown[] | undefined) ?? []), ...battute];
      fs.writeFileSync(f, YAML.stringify(dati));
    }
    for (const [file, ritocca] of Object.entries(o.ritocchi ?? {})) {
      const f = path.join(dest, file);
      const dati = YAML.parse(fs.readFileSync(f, 'utf8')) as Record<string, unknown>;
      ritocca(dati);
      fs.writeFileSync(f, YAML.stringify(dati));
    }
    return dest;
  }

  async avvia(cartellaCampagna: string, copione: (turno: number, messaggio: string) => string, env: Record<string, string> = {}): Promise<{ s: ServerCantastorie; url: string; messaggi: string[] }> {
    const config = caricaConfig({
      PORT: '0',
      HOST: '127.0.0.1',
      CANTASTORIE_LOG: path.join(this.cartella, 'log'),
      CANTASTORIE_CARTELLA_CAMPAGNA: cartellaCampagna,
      CANTASTORIE_MODO: 'repertorio',
      CANTASTORIE_PROMPT_SELETTORE: path.join(import.meta.dirname, '..', 'fixtures', 'prompt-prova.md'),
      CANTASTORIE_CACHE_AUDIO: path.join(this.cartella, 'cache'),
      CANTASTORIE_TTS: 'mock',
      CANTASTORIE_ASSESTAMENTO_MS: '20',
      CANTASTORIE_MOCK_SCALA: '0.02',
      CANTASTORIE_MARGINE_AUDIO_MS: '50',
      CANTASTORIE_PRERISCALDA: '0',
      CANTASTORIE_MASTER_TOKEN: TOKEN,
      ...env,
    } as NodeJS.ProcessEnv);
    const messaggi: string[] = [];
    const narratore = new NarratoreFinto({ idPng: [], idPg: [], primoTokenMs: 5, msPerPezzo: 1, copione: (turno) => copione(turno, messaggi.at(-1) ?? '') });
    const narra = narratore.narra.bind(narratore);
    narratore.narra = async (r, cb) => {
      messaggi.push(r.messaggio);
      return narra(r, cb);
    };
    const s = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null });
    await s.avvia();
    this.server.push(s);
    return { s, url: `http://127.0.0.1:${(s.app.http.server.address() as { port: number }).port}`, messaggi };
  }

  nuovo(url: string): Client {
    const c: Client = connetti(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    this.client.push(c);
    return c;
  }

  /** Pannello del master (entrato) e la funzione per comandare. */
  async master(url: string): Promise<{ c: Client; comanda: (c: ComandoMaster) => Promise<Esito>; stato: () => Promise<StatoMaster> }> {
    const c = this.nuovo(url);
    const e = await emetti<EsitoEntrataMaster>((cb) => c.emit('master:entra', { token: TOKEN }, cb));
    if (!e.ok) throw new Error('master non entrato');
    return {
      c,
      comanda: (x) => emetti<Esito>((cb) => c.emit('master:comando', x, cb)),
      stato: async () => {
        const r = await emetti<EsitoEntrataMaster>((cb) => c.emit('master:entra', { token: TOKEN }, cb));
        if (!r.ok) throw new Error('master');
        return r.stato;
      },
    };
  }

  /** Proiettore che avvisa la fine dell'audio, come quello vero. */
  async proiettore(url: string): Promise<Client> {
    const p = this.nuovo(url);
    await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => p.emit('schermo:osserva', cb));
    p.on('audio:fine_turno', (f) => p.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
    return p;
  }

  async telefono(url: string, id_pg: string): Promise<Client> {
    const t = this.nuovo(url);
    await emetti<StatoTavolo>((cb) => t.emit('telefono:entra', cb));
    expect(await emetti<Esito>((cb) => t.emit('telefono:scegli_pg', { id_pg, dispositivo: `tel-${id_pg}-0123456789` }, cb))).toEqual({ ok: true });
    return t;
  }

  async chiudi(): Promise<void> {
    for (const c of this.client) c.disconnect();
    for (const s of this.server) await s.chiudi().catch(() => undefined);
    fs.rmSync(this.cartella, { recursive: true, force: true });
  }
}

export const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));

export function attendi(c: Client, cond: (s: StatoTavolo) => boolean, ms = 8000): Promise<StatoTavolo> {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('stato atteso non arrivato')), ms);
    const f = (s: StatoTavolo): void => {
      if (cond(s)) {
        clearTimeout(t);
        c.off('stato', f);
        ok(s);
      }
    };
    c.on('stato', f);
  });
}

/** Un'azione inviata (inviare = pronto: con l'ultimo invitato il turno parte dopo l'assestamento). */
export async function agisci(t: Client, id_pg: string, testo: string, versione: number, privata = false): Promise<void> {
  expect(await emetti<Esito>((cb) => t.emit('azione:invia', { id_pg, testo, versione_vista: versione, privata }, cb))).toEqual({ ok: true });
}

/** Il proiettore comincia; si aspetta la prima finestra. */
export async function inizia(schermo: Client, tel: Client): Promise<StatoTavolo> {
  const primo = attendi(tel, (x) => x.fase === 'finestra' && x.turno === 1);
  await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
  return primo;
}

/** Un turno con l'azione di un PG; si aspetta lo stato dopo (finestra del turno dopo, o la pausa). */
export async function turno(tel: Client, id_pg: string, s: StatoTavolo, testo: string, privata = false): Promise<StatoTavolo> {
  const dopo = attendi(tel, (x) => (x.fase === 'finestra' && x.turno === s.turno + 1) || (x.fase === 'pausa' && x.turno === s.turno));
  await agisci(tel, id_pg, testo, s.versione_scena, privata);
  return dopo;
}

function leggiJsonl(f: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(f)) return [];
  return fs
    .readFileSync(f, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((r) => JSON.parse(r) as Record<string, unknown>);
}
