/**
 * Il ciclo delle sessioni col server intero (ServerConCiclo, sessione/ciclo.ts), sulla fixture «arco»
 * copiata in una cartella temporanea:
 * 1. sessione 01 giocata → «Fine sessione»: gioco fermo, sessione chiusa, registro.yaml e
 *    trascrizione.yaml in sessioni/01/; il pannello vede la 02 pronta;
 * 2. «Prossima sessione»: il server si ricostruisce sulla 02 (stesso token), il telefono ritrova il
 *    suo PG senza sceglierlo, l'apertura comincia dal riassunto della 02, il fronte riparte da 1;
 * 3. dopo l'ultima non si va avanti; una 03 preparata a metà non si carica (pannello e avvio);
 * 4. una one-shot: «Fine sessione» scrive nei log, «Prossima sessione» si rifiuta.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { io as connetti, type Socket } from 'socket.io-client';
import type { ComandoMaster, Esito, EsitoEntrataMaster, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoMaster, StatoTavolo } from '@cantastorie/shared';
import type { ServerCantastorie } from '../src/avvio';
import { ServerConCiclo } from '../src/ciclo-server';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import { TESTO_FINE_SESSIONE } from '../src/scena/regia';
import type { RegistroSessione } from '../src/sessione/registro';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'campagne');
const TOKEN = 'token_di_prova_cicli';
const D_ANNA = 'tel-anna-0123456789';

const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-cicli-'));
const ARCO = path.join(radice, 'arco');
fs.cpSync(path.join(FIXTURE, 'arco'), ARCO, { recursive: true });
const client: Client[] = [];
const cicli: ServerConCiclo[] = [];

afterAll(async () => {
  for (const c of client) c.disconnect();
  for (const s of cicli) await s.chiudi().catch(() => undefined);
  fs.rmSync(radice, { recursive: true, force: true });
});

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
function attendi<T>(c: Client, ev: 'stato' | 'master:stato', cond: (s: T) => boolean, ms = 8000): Promise<T> {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error(`${ev} atteso non arrivato`)), ms);
    const f = (s: T): void => {
      if (cond(s)) {
        clearTimeout(t);
        c.off(ev, f as never);
        ok(s);
      }
    };
    c.on(ev, f as never);
  });
}
async function finché(cond: () => boolean, ms = 8000): Promise<void> {
  const fine = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > fine) throw new Error('condizione non arrivata');
    await new Promise((r) => setTimeout(r, 20));
  }
}

/** Il copione cambia con la sessione giocata (lo stesso narratore serve tutti i server del ciclo). */
let sessioneDelCopione = 1;
const narratore = new NarratoreFinto({
  idPng: [],
  idPg: [],
  primoTokenMs: 5,
  msPerPezzo: 1,
  copione: (turno) =>
    sessioneDelCopione === 1 && turno === 1
      ? '[usa] nar_brocca > pg_anna\n[narratore] Anna, cosa fai?\n[invito] tutti'
      : sessioneDelCopione === 2 && turno === 1
        ? '[usa] nar_corda > pg_anna\n[invito] tutti'
        : `[narratore] Turno ${turno}: piove.\n[invito] tutti`,
});

function configPer(cartellaCampagna: string, log: string) {
  return caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    CANTASTORIE_LOG: log,
    CANTASTORIE_CARTELLA_CAMPAGNA: cartellaCampagna,
    CANTASTORIE_MODO: 'repertorio',
    CANTASTORIE_PROMPT_SELETTORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_CACHE_AUDIO: path.join(log, 'cache'),
    CANTASTORIE_TTS: 'mock',
    CANTASTORIE_MOCK_SCALA: '0.02',
    CANTASTORIE_MARGINE_AUDIO_MS: '50',
    CANTASTORIE_STALLO_MS: '0',
    CANTASTORIE_PRERISCALDA: '0',
    CANTASTORIE_MASTER_TOKEN: TOKEN,
  } as NodeJS.ProcessEnv);
}

async function avvia(cartellaCampagna = ARCO, log = path.join(radice, 'log')): Promise<ServerConCiclo> {
  const c = await ServerConCiclo.avvia(configPer(cartellaCampagna, log), loggerMuto(), { narratore, arbitro: null });
  cicli.push(c);
  return c;
}

const url = (s: ServerCantastorie): string => `http://127.0.0.1:${(s.app.http.server.address() as { port: number }).port}`;
function nuovo(u: string): Client {
  const c: Client = connetti(u, { transports: ['websocket'], forceNew: true, reconnection: false });
  client.push(c);
  return c;
}

/** Pannello, proiettore e il telefono di Anna (col token del dispositivo) su un server. */
async function tavolo(s: ServerCantastorie, scegli: boolean) {
  const u = url(s);
  const master = nuovo(u);
  const entrata = await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
  if (!entrata.ok) throw new Error('master non entrato');
  const comanda = (c: ComandoMaster) => emetti<Esito>((cb) => master.emit('master:comando', c, cb));
  const schermo = nuovo(u);
  await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
  schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
  const frasi: string[] = [];
  schermo.on('audio:frase', (f) => frasi.push(f.testo));
  const anna = nuovo(u);
  await emetti<StatoTavolo>((cb) => anna.emit('telefono:entra', cb));
  const riconosciuta = await emetti<{ id_pg: string | null }>((cb) => anna.emit('telefono:dispositivo', { dispositivo: D_ANNA }, cb));
  // Il telefono vero, quando il server lo riconosce, rientra da solo col PG ricordato.
  if (scegli || riconosciuta.id_pg) expect(await emetti<Esito>((cb) => anna.emit('telefono:scegli_pg', { id_pg: riconosciuta.id_pg ?? 'pg_anna', dispositivo: D_ANNA }, cb))).toEqual({ ok: true });
  return { master, comanda, schermo, anna, frasi, riconosciuta, entrata: entrata.stato };
}

async function giocaUnTurno(t: Awaited<ReturnType<typeof tavolo>>, testo: string): Promise<StatoTavolo> {
  const primo = attendi<StatoTavolo>(t.anna, 'stato', (x) => x.fase === 'finestra' && x.turno === 1);
  await emetti<Esito>((cb) => t.schermo.emit('schermo:inizia', cb));
  const s = await primo;
  const dopo = attendi<StatoTavolo>(t.anna, 'stato', (x) => x.fase === 'finestra' && x.turno === 2);
  expect(await emetti<Esito>((cb) => t.anna.emit('azione:invia', { id_pg: 'pg_anna', testo, versione_vista: s.versione_scena }, cb))).toEqual({ ok: true });
  expect(await emetti<Esito>((cb) => t.anna.emit('azione:pronto', { id_pg: 'pg_anna', pronto: true }, cb))).toEqual({ ok: true });
  return dopo;
}

describe('campagna a due sessioni: fine sessione e prossima sessione', () => {
  it('01 → registro → 02 col riassunto, PG ritrovato, fronte che riparte; poi niente 03', async () => {
    const ciclo = await avvia();
    const s1 = ciclo.corrente;
    expect(s1.scelta).toMatchObject({ numero: 1, motivo: 'prima' });
    const t1 = await tavolo(s1, true);
    expect(t1.entrata.sessione?.pacchetti).toMatchObject({ corrente: { numero: 1, etichetta: '01', titolo: 'La locanda' }, prossima: { numero: 2, pronta: true, titolo: 'Il guado' } });
    expect(t1.entrata.sessione?.fine_possibile).toBe(false); // il proiettore non ha ancora cominciato

    // --- Sessione 01: un turno (indizio i_brocca), poi Fine sessione.
    await giocaUnTurno(t1, 'Guardo dietro il banco.');
    expect(t1.frasi[0]).toBe('Piove da tre giorni sulla valle.');
    const fermata = attendi<StatoTavolo>(t1.anna, 'stato', (x) => x.fase === 'fermata');
    expect(await t1.comanda({ tipo: 'fine_sessione' })).toEqual({ ok: true });
    expect((await fermata).trascrizione.at(-1)).toMatchObject({ tipo: 'sistema', testo: TESTO_FINE_SESSIONE });
    const fileRegistro = path.join(ARCO, 'sessioni', '01', 'registro.yaml');
    const r1 = YAML.parse(fs.readFileSync(fileRegistro, 'utf8')) as RegistroSessione;
    expect(r1).toMatchObject({ campagna: 'arco', sessione: 1, archivio: { stato: 'chiusa', motivo_chiusura: 'fine sessione', ultimo_turno: 2 } });
    expect(r1.indizi).toEqual([{ id: 'i_brocca', turno: 1, battuta: 'nar_brocca' }]);
    expect(r1.pg.find((p) => p.id === 'pg_anna')!.azioni_pubbliche.map((a) => a.testo)).toEqual(['Guardo dietro il banco.']);
    expect(fs.existsSync(path.join(ARCO, 'sessioni', '01', 'trascrizione.yaml'))).toBe(true);
    const vista = await emetti<EsitoEntrataMaster>((cb) => t1.master.emit('master:entra', { token: TOKEN }, cb));
    if (!vista.ok) throw new Error('master');
    expect(vista.stato.sessione).toMatchObject({ id: null, fine_possibile: false, registro: { file: fileRegistro, turni: 2 } });
    // Fine sessione due volte: non c'è più niente in corso.
    expect(await t1.comanda({ tipo: 'fine_sessione' })).toMatchObject({ ok: false, errore: expect.stringMatching(/Nessuna sessione in corso/) });
    const sessione1 = s1.sessioni.archivio!.elenco('arco')[0]!;
    expect(sessione1).toMatchObject({ pacchetto: 1, stato: 'chiusa', motivo_chiusura: 'fine sessione' });

    // --- Prossima sessione: il server si ricostruisce sulla 02.
    sessioneDelCopione = 2;
    expect(await t1.comanda({ tipo: 'prossima_sessione' })).toEqual({ ok: true });
    await finché(() => ciclo.corrente !== s1);
    await ciclo.attendiCambio();
    const s2 = ciclo.corrente;
    expect(s2.campagna.pacchetto).toMatchObject({ numero: 2, titolo: 'Il guado' });
    expect(s2.tokenMaster).toBe(TOKEN);
    expect(s1.app.http.server.listening).toBe(false); // il server di prima è chiuso

    // Il telefono di Anna ritrova il suo PG senza sceglierlo; l'apertura parte dal riassunto della 02.
    const t2 = await tavolo(s2, false);
    expect(t2.riconosciuta).toEqual({ id_pg: 'pg_anna' });
    expect(t2.entrata.sessione?.pacchetti).toMatchObject({ corrente: { numero: 2, etichetta: '02' }, prossima: null });
    expect(t2.entrata.orologi.find((o) => o.id === 'o_temporale')).toMatchObject({ pieni: 1 });
    // Il master vede i telefoni ricordati e ne può cambiare il PG (vale dal prossimo collegamento).
    const telefoni = (await emetti<EsitoEntrataMaster>((cb) => t2.master.emit('master:entra', { token: TOKEN }, cb)));
    if (!telefoni.ok) throw new Error('master');
    expect(telefoni.stato.sessione?.telefoni).toEqual([{ dispositivo: D_ANNA, id_pg: 'pg_anna', nome: 'Anna Rossi', collegato: true }]);
    expect(await t2.comanda({ tipo: 'dispositivo', dispositivo: D_ANNA, id_pg: 'pg_bruno' })).toEqual({ ok: true });
    expect(await t2.comanda({ tipo: 'dispositivo', dispositivo: D_ANNA, id_pg: 'pg_nessuno' })).toMatchObject({ ok: false });
    expect(await t2.comanda({ tipo: 'dispositivo', dispositivo: 'tel-sconosciuto-000', id_pg: null })).toMatchObject({ ok: false, errore: 'Telefono sconosciuto.' });
    expect(await t2.comanda({ tipo: 'dispositivo', dispositivo: D_ANNA, id_pg: 'pg_anna' })).toEqual({ ok: true });
    await giocaUnTurno(t2, 'Guardo il palo del traghetto.');
    expect(t2.frasi.slice(0, 3)).toEqual(["Nella sessione precedente l'oste ha confessato.", 'Ora il fiume sale.', 'Il guado è gonfio di pioggia.']);
    const sessione2 = s2.sessioni.archivio!.elenco('arco')[0]!;
    expect(sessione2).toMatchObject({ pacchetto: 2, stato: 'in_corso' });
    expect(sessione2.id).not.toBe(sessione1.id);

    // Dopo la 02 non c'è niente: Prossima sessione si rifiuta (e non chiude la sessione in corso).
    expect(await t2.comanda({ tipo: 'prossima_sessione' })).toMatchObject({ ok: false, errore: expect.stringMatching(/Dopo la sessione 02 non c'è/) });
    expect(s2.sessioni.archivio!.sessione(sessione2.id)!.stato).toBe('in_corso');

    // Una 03 preparata a metà: il pannello la vede ma non è pronta, e il comando si rifiuta.
    fs.mkdirSync(path.join(ARCO, 'sessioni', '03', 'scene'), { recursive: true });
    fs.writeFileSync(path.join(ARCO, 'sessioni', '03', 'sessione.yaml'), 'titolo: "A metà"\nscene: [scena_che_manca]\n');
    expect(await t2.comanda({ tipo: 'prossima_sessione' })).toMatchObject({ ok: false, errore: expect.stringMatching(/La sessione 03 non si carica/) });
    const conTre = await emetti<EsitoEntrataMaster>((cb) => t2.master.emit('master:entra', { token: TOKEN }, cb));
    if (!conTre.ok) throw new Error('master');
    expect(conTre.stato.sessione?.pacchetti!.prossima).toMatchObject({ numero: 3, pronta: false, motivo: expect.stringMatching(/nessuna scena|scena_che_manca/) });

    // Fine della 02; al riavvio la 03 (dopo la fine) non si carica: si resta sulla 02, con l'avviso.
    expect(await t2.comanda({ tipo: 'fine_sessione' })).toEqual({ ok: true });
    expect(YAML.parse(fs.readFileSync(path.join(ARCO, 'sessioni', '02', 'registro.yaml'), 'utf8'))).toMatchObject({ sessione: 2, indizi: [{ id: 'i_corda', turno: 1 }] });
    await ciclo.chiudi();
    const dopo = await avvia();
    expect(dopo.corrente.scelta).toMatchObject({ numero: 2, avviso: expect.stringMatching(/La sessione 3 non si carica.*si resta sulla 2/) });
    const t3 = await tavolo(dopo.corrente, false);
    expect(t3.entrata.sessione?.pacchetti!.avviso).toMatch(/si resta sulla 2/);
  }, 40_000);
});

describe('one-shot', () => {
  it('Fine sessione scrive il registro nei log; Prossima sessione si rifiuta', async () => {
    const log = path.join(radice, 'log-mini');
    const ciclo = await avvia(path.join(FIXTURE, 'mini'), log);
    const s = ciclo.corrente;
    expect(s.scelta).toEqual({ numero: null, motivo: 'one-shot', avviso: null });
    const t = await tavolo(s, true);
    expect(t.entrata.sessione?.pacchetti).toBeUndefined();
    sessioneDelCopione = 1;
    await giocaUnTurno(t, 'Guardo dietro il banco.');
    expect(await t.comanda({ tipo: 'prossima_sessione' })).toMatchObject({ ok: false, errore: expect.stringMatching(/one-shot/) });
    const id = s.regia.infoRegistro.sessione!;
    expect(await t.comanda({ tipo: 'fine_sessione' })).toEqual({ ok: true });
    const cartella = path.join(log, 'registri', 'mini', id.replace(/[^A-Za-z0-9._-]/g, '-'));
    expect(fs.readdirSync(cartella).sort()).toEqual(['registro.yaml', 'trascrizione.yaml']);
    expect(YAML.parse(fs.readFileSync(path.join(cartella, 'registro.yaml'), 'utf8'))).toMatchObject({ campagna: 'mini', sessione: null, indizi: [{ id: 'i_brocca', turno: 1 }] });
    // La cartella della campagna one-shot non cambia.
    expect(fs.readdirSync(path.join(FIXTURE, 'mini')).sort()).toEqual(['campagna.yaml', 'pg.yaml', 'png', 'repertorio', 'scena.yaml', 'stile.yaml']);
  }, 20_000);
});
