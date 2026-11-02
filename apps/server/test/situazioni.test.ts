/**
 * Immagini di situazione (skill del Preparatore, «immagini», regola 4): mai come ritratto né come
 * luogo; collegate alla rivelazione giusta; sul proiettore dopo quella rivelazione (Motore) o a
 * comando del master; tolte quando parte la narrazione successiva.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { io as connetti, type Socket } from 'socket.io-client';
import type { ComandoMaster, Esito, EsitoEntrataMaster, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoMaster, StatoTavolo } from '@cantastorie/shared';
import { costruisciServer, type ServerCantastorie } from '../src/avvio';
import { caricaCampagna } from '../src/campagna/caricatore';
import { CatalogoImmagini } from '../src/campagna/immagini';
import { collegaSituazioni } from '../src/campagna/situazioni';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import { RADICE_REPO } from '../src/percorsi';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const FIXTURE_IMG = path.join(import.meta.dirname, 'fixtures', 'immagini');
const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');
const TOKEN = 'token_di_prova_situazioni';

/** Cartella d'immagini: luogo, ritratto, una situazione dell'oste e un «ritratto» che in realtà è una situazione. */
function cartellaImmagini(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-sit-img-'));
  const jpg = fs.readFileSync(path.join(FIXTURE_IMG, 'luogo_n_piazza.jpg'));
  for (const f of ['luogo_scena_locanda.jpg', 'ritratto_png_oste.jpg', 'situazione_png_oste_brindisi.jpg', 'ritratto_png_guardia.jpg']) fs.writeFileSync(path.join(dir, f), jpg);
  fs.writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify({
      immagini: [
        { id: 'luogo_scena_locanda', file: 'luogo_scena_locanda.jpg', tipo: 'luogo' },
        { id: 'ritratto_png_oste', file: 'ritratto_png_oste.jpg', tipo: 'ritratto' },
        { id: 'situazione_png_oste_brindisi', file: 'situazione_png_oste_brindisi.jpg', tipo: 'situazione' },
        // Id da ritratto ma tipo situazione: non deve MAI fare da ritratto di default.
        { id: 'ritratto_png_guardia', file: 'ritratto_png_guardia.jpg', tipo: 'situazione' },
      ],
    }),
  );
  return dir;
}

describe('catalogo e collegamenti', () => {
  it('una situazione non è mai un ritratto né un luogo', () => {
    const dir = cartellaImmagini();
    try {
      const c = new CatalogoImmagini(dir);
      expect(c.ritratto('png_oste')).toBe('/api/immagini/ritratto_png_oste.jpg');
      expect(c.ritratto('png_guardia')).toBeNull();
      expect(c.luogo('scena_locanda')).toBe('/api/immagini/luogo_scena_locanda.jpg');
      expect(c.situazioni(['png_oste', 'png_guardia']).map((s) => [s.id, s.png, s.situazione])).toEqual([
        ['ritratto_png_guardia', null, 'ritratto_png_guardia'],
        ['situazione_png_oste_brindisi', 'png_oste', 'brindisi'],
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('il manifest può portare png e dopo (strumenti/immagini li copia dalla scheda)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-sit-man-'));
    try {
      fs.writeFileSync(path.join(dir, 'a.jpg'), fs.readFileSync(path.join(FIXTURE_IMG, 'luogo_n_piazza.jpg')));
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ immagini: [{ id: 'situazione_png_oste_x', file: 'a.jpg', tipo: 'situazione', png: 'png_oste', dopo: ['i_brocca'] }] }));
      const voci = new CatalogoImmagini(dir).situazioni(['png_oste']);
      expect(voci).toEqual([{ id: 'situazione_png_oste_x', png: 'png_oste', situazione: 'x', url: '/api/immagini/a.jpg', dopo: ['i_brocca'] }]);
      const c = caricaCampagna(MINI);
      expect(collegaSituazioni(c, voci)[0]!.dopo).toEqual(['i_brocca']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it.skipIf(!fs.existsSync(path.join(RADICE_REPO, 'campagne', 'prova-f0')))('prova-f0: Sebastiano senza cappuccio compare dopo i_cicatrice', () => {
    const c = caricaCampagna(path.join(RADICE_REPO, 'campagne', 'prova-f0'));
    const [s] = collegaSituazioni(c, [{ id: 'situazione_png_sebastiano_senza_cappuccio', png: 'png_sebastiano', situazione: 'senza_cappuccio', url: 'u' }]);
    expect(s).toMatchObject({ nome: 'Sebastiano: senza cappuccio', dopo: ['i_cicatrice'] });
    const [inLuogo] = collegaSituazioni(c, [{ id: 'situazione_png_sebastiano_in_n_piazza', png: 'png_sebastiano', situazione: 'in_n_piazza', url: 'u' }]);
    expect(inLuogo).toMatchObject({ nome: 'Sebastiano in n piazza', dopo: [] });
  });
});

describe('sul proiettore dopo la rivelazione, e dal master', () => {
  let cartella: string;
  let immagini: string;
  let server: ServerCantastorie;
  let url: string;
  const client: Client[] = [];
  const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
  const nuovo = (): Client => {
    const c: Client = connetti(url, { transports: ['websocket'], forceNew: true });
    client.push(c);
    return c;
  };
  const attendi = <T>(c: Client, ev: 'stato' | 'master:stato', cond: (s: T) => boolean, ms = 8000): Promise<T> =>
    new Promise((ok, ko) => {
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
  const comanda = (m: Client, c: ComandoMaster): Promise<Esito> => emetti<Esito>((cb) => m.emit('master:comando', c, cb));

  beforeAll(async () => {
    cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-sit-'));
    immagini = cartellaImmagini();
    // Copia della campagna mini: la situazione «brindisi» dell'oste compare dopo la battuta oste_saluto.
    const campagna = path.join(cartella, 'mini');
    fs.cpSync(MINI, campagna, { recursive: true });
    const filePng = path.join(campagna, 'png', 'png_oste.yaml');
    const png = YAML.parse(fs.readFileSync(filePng, 'utf8')) as Record<string, Record<string, unknown>>;
    png['aspetto']!['situazioni'] = [{ id: 'brindisi', prompt: 'raising a mug, english', dopo: 'oste_saluto' }];
    fs.writeFileSync(filePng, YAML.stringify(png));
    const config = caricaConfig({
      PORT: '0',
      HOST: '127.0.0.1',
      CANTASTORIE_LOG: cartella,
      CANTASTORIE_CARTELLA_CAMPAGNA: campagna,
      CANTASTORIE_MODO: 'repertorio',
      CANTASTORIE_PROMPT_SELETTORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
      CANTASTORIE_CACHE_AUDIO: path.join(cartella, 'cache'),
      CANTASTORIE_IMMAGINI: immagini,
      CANTASTORIE_TTS: 'mock',
      CANTASTORIE_MOCK_SCALA: '0.02',
      CANTASTORIE_MARGINE_AUDIO_MS: '50',
      CANTASTORIE_STALLO_MS: '0',
      CANTASTORIE_MASTER_TOKEN: TOKEN,
    } as NodeJS.ProcessEnv);
    const narratore = new NarratoreFinto({
      idPng: [],
      idPg: [],
      primoTokenMs: 5,
      msPerPezzo: 1,
      copione: (turno) => (turno === 1 ? '[usa] oste_saluto > pg_anna\n[narratore] Anna, cosa fai?\n[invito] tutti' : '[narratore] Piove. Anna?\n[invito] tutti'),
    });
    server = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null });
    await server.avvia();
    url = `http://127.0.0.1:${(server.app.http.server.address() as { port: number }).port}`;
  });

  afterAll(async () => {
    for (const c of client) c.disconnect();
    await server?.chiudi();
    fs.rmSync(cartella, { recursive: true, force: true });
    fs.rmSync(immagini, { recursive: true, force: true });
  });

  it('la battuta esce, poi la situazione va sul proiettore; alla narrazione dopo si torna al luogo', async () => {
    const master = nuovo();
    const entrata = await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
    expect(entrata.ok && entrata.stato.situazioni).toEqual([
      { id: 'ritratto_png_guardia', png: null, nome: 'situazione: ritratto png guardia', url: '/api/immagini/ritratto_png_guardia.jpg', in_onda: false, dopo: null },
      { id: 'situazione_png_oste_brindisi', png: 'png_oste', nome: 'Oste: brindisi', url: '/api/immagini/situazione_png_oste_brindisi.jpg', in_onda: false, dopo: 'oste_saluto' },
    ]);
    const schermo = nuovo();
    const { stato: s0 } = await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
    expect(s0.scena.ritratti).toEqual({ png_oste: '/api/immagini/ritratto_png_oste.jpg' }); // la guardia non ha ritratto
    expect(s0.scena.situazione).toBeNull();
    expect(s0.scena.prossime).toContain('/api/immagini/situazione_png_oste_brindisi.jpg');
    schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
    const tel = nuovo();
    await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
    await emetti<Esito>((cb) => tel.emit('telefono:scegli_pg', { id_pg: 'pg_anna' }, cb));

    const f1 = attendi<StatoTavolo>(tel, 'stato', (s) => s.fase === 'finestra' && s.turno === 1);
    await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
    await f1;
    // Durante la narrazione la situazione non c'è ancora: arriva a rivelazione ascoltata.
    const narrando = attendi<StatoTavolo>(tel, 'stato', (s) => s.fase === 'narrazione');
    const f2 = attendi<StatoTavolo>(tel, 'stato', (s) => s.fase === 'finestra' && s.turno === 2);
    await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Saluto l’oste con un cenno.', versione_vista: 1 }, cb));
    await emetti<Esito>((cb) => tel.emit('azione:pronto', { id_pg: 'pg_anna', pronto: true }, cb));
    expect((await narrando).scena.situazione).toBeNull();
    const dopo = await f2;
    expect(dopo.scena.situazione).toBe('/api/immagini/situazione_png_oste_brindisi.jpg');
    expect(dopo.scena.immagine).toBe('/api/immagini/luogo_scena_locanda.jpg'); // il luogo resta sotto

    // La narrazione successiva riporta il luogo; una volta mostrata, non torna da sola.
    const narrando2 = attendi<StatoTavolo>(tel, 'stato', (s) => s.fase === 'narrazione' && s.turno === 2);
    const f3 = attendi<StatoTavolo>(tel, 'stato', (s) => s.fase === 'finestra' && s.turno === 3);
    await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Bevo.', versione_vista: 2 }, cb));
    await emetti<Esito>((cb) => tel.emit('azione:pronto', { id_pg: 'pg_anna', pronto: true }, cb));
    expect((await narrando2).scena.situazione).toBeNull();
    expect((await f3).scena.situazione).toBeNull();

    // Il master la rimette e la toglie; un id sconosciuto si rifiuta.
    const su = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.scena.situazione !== null);
    expect(await comanda(master, { tipo: 'situazione', id: 'situazione_png_oste_brindisi' })).toEqual({ ok: true });
    expect((await su).situazioni.find((x) => x.in_onda)?.id).toBe('situazione_png_oste_brindisi');
    expect(await comanda(master, { tipo: 'situazione', id: 'situazione_inventata' })).toMatchObject({ ok: false });
    const giu = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.scena.situazione === null);
    expect(await comanda(master, { tipo: 'situazione', id: null })).toEqual({ ok: true });
    await giu;
  });
});
