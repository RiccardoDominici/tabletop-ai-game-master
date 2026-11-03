/**
 * Audio del proiettore (docs/audio.md): manifest (solo voci col file e nomi semplici), guadagni,
 * strati per luogo, risoluzione della musica coi ripieghi, rotte sicure e cambio d'umore.
 * Fixture: test/fixtures/audio (toni di prova generati da genera.sh) sulla campagna prova-f0.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CatalogoAudioPubblico } from '@cantastorie/shared';
import { CatalogoAudio, guadagnoTraccia } from '../src/audio/catalogo';
import { audioDellaScena, luoghiNoti, luoghiVicini, luogoEquivalente } from '../src/audio/scena';
import { costruisciServer, type ServerCantastorie } from '../src/avvio';
import { caricaCampagna } from '../src/campagna/caricatore';
import { conScena } from '../src/campagna/tipi';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import { RADICE_REPO } from '../src/percorsi';

const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'audio');
const PROVA_F0 = path.join(RADICE_REPO, 'campagne', 'prova-f0');

describe('CatalogoAudio', () => {
  const c = new CatalogoAudio(FIXTURE);

  it('tiene solo le voci col file e un nome semplice', () => {
    expect(c.numero).toBe(10); // luogo_n_mancante (senza file) e luogo_n_furbo (percorso) scartati
    expect(c.musicaLuogo('n_piazza')).toBe('luogo_n_piazza');
    expect(c.musicaLuogo('n_mancante')).toBeNull();
    expect(c.musicaLuogo('n_furbo')).toBeNull();
    expect(c.umore('tensione')).toBe('umore_tensione');
    expect(c.umore('luogo_n_piazza')).toBeNull();
    expect(c.tema('png_ottavia')).toBe('tema_png_ottavia');
    expect(c.tema('png_sebastiano')).toBeNull();
    expect(c.umori()).toEqual({ esplorazione_tesa: 'umore_esplorazione_tesa', tensione: 'umore_tensione' });
    expect(c.crediti).toHaveLength(2);
  });

  it('catalogo pubblico: url, loop per sezione, guadagno dal volume', () => {
    const p = c.pubblico();
    expect(p.tracce['luogo_n_piazza']).toMatchObject({ tipo: 'musica', url: '/api/audio/luogo_n_piazza.m4a', loop: true, guadagno: 1, durata_s: 8, giunta_s: 0 });
    expect(p.tracce['tema_png_ottavia']).toMatchObject({ tipo: 'tema', loop: false });
    expect(p.tracce['amb_n_piazza_vento']).toMatchObject({ tipo: 'ambiente', loop: true, guadagno: 0.4 });
    expect(p.tracce['sfx_campana']).toMatchObject({ tipo: 'effetto', loop: false });
    expect(p.tracce['luogo_n_mancante']).toBeUndefined();
  });

  it('strati d’ambiente per luogo: id amb_<luogo>_<tag> col luogo più lungo, o campo luogo', () => {
    expect(c.ambienti('scena_forno_vecchio', ['scena_forno_vecchio', 'n_piazza'])).toEqual(['amb_scena_forno_vecchio_folla', 'amb_scena_forno_vecchio_fuoco']);
    expect(c.ambienti('n_piazza', ['scena_forno_vecchio', 'n_piazza'])).toEqual(['amb_n_piazza_vento']);
    // Vince il luogo noto più lungo: amb_n_piazza_vento è di n_piazza, non di un luogo «n».
    expect(c.ambienti('n', ['n', 'n_piazza'])).toEqual([]);
    expect(c.ambienti('n', ['n'])).toEqual(['amb_n_piazza_vento']);
    expect(c.ambienti('n_mulino_valsecca', ['n_mulino_valsecca'])).toEqual([]);
  });

  it('percorsi: solo i file del manifest, mai fuori dalla cartella', () => {
    expect(c.percorso('luogo_n_piazza.m4a')).toBe(path.join(FIXTURE, 'luogo_n_piazza.m4a'));
    expect(c.percorso('manifest.json')).toBeNull();
    expect(c.percorso('../manifest.json')).toBeNull();
    expect(c.percorso('genera.sh')).toBeNull();
    expect(CatalogoAudio.mime('a.ogg')).toBe('audio/ogg');
    expect(CatalogoAudio.mime('a.mp3')).toBe('audio/mpeg');
  });

  it('guadagno: volume per la correzione LUFS verso −23, con limiti', () => {
    expect(guadagnoTraccia(undefined, undefined)).toBe(1);
    expect(guadagnoTraccia(0.5, -23)).toBe(0.5);
    expect(guadagnoTraccia(1, -17)).toBeCloseTo(0.5012, 3); // 6 dB più forte → −6 dB
    expect(guadagnoTraccia(1, -80)).toBeCloseTo(3.981, 2); // al massimo +12 dB
    expect(guadagnoTraccia(9, undefined)).toBe(2);
  });

  it('alias_di e stesso file: il nome canonico è uno solo (il proiettore non dissolve un brano in sé)', () => {
    const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-audio-'));
    fs.writeFileSync(path.join(cartella, 'borgo.m4a'), 'x');
    fs.writeFileSync(path.join(cartella, 'pioggia.m4a'), 'x');
    // Come nel manifest vero di ponte-lanterne: l'alias viene prima della voce che richiama.
    const brani = [
      { id: 'luogo_n_borgo', file: 'borgo.m4a', alias_di: 'luogo_scena_borgo' },
      { id: 'luogo_scena_borgo', file: 'borgo.m4a' },
      { id: 'luogo_n_vicolo', file: 'borgo.m4a' },
    ];
    const ambienti = [
      { id: 'amb_scena_borgo_pioggia', luogo: 'scena_borgo', file: 'pioggia.m4a', volume: 0.3, lufs: -30 },
      { id: 'amb_n_vicolo_pioggia', luogo: 'n_vicolo', file: 'pioggia.m4a', volume: 0.2, lufs: -30 },
    ];
    fs.writeFileSync(path.join(cartella, 'manifest.json'), JSON.stringify({ versione: 1, brani, ambienti, crediti: [] }));
    const c = new CatalogoAudio(cartella);
    expect(c.percorso('borgo.m4a')).toBe(path.join(cartella, 'borgo.m4a'));
    expect(CatalogoAudio.mime('borgo.m4a')).toBe('audio/mp4');
    expect(c.musicaLuogo('n_borgo')).toBe('luogo_scena_borgo');
    expect(c.musicaLuogo('scena_borgo')).toBe('luogo_scena_borgo');
    expect(c.musicaLuogo('n_vicolo')).toBe('luogo_scena_borgo');
    // Gli strati restano distinti (ognuno col suo volume): il proiettore li passa senza ripartire.
    expect(c.ambienti('n_vicolo', [])).toEqual(['amb_n_vicolo_pioggia']);
    expect(c.pubblico().tracce['amb_n_vicolo_pioggia']?.guadagno).toBeCloseTo(0.2 * 10 ** (7 / 20), 3);
    fs.rmSync(cartella, { recursive: true, force: true });
  });

  it('senza manifest, o con un manifest rotto: catalogo vuoto, nessun errore', () => {
    expect(new CatalogoAudio(os.tmpdir()).numero).toBe(0);
    const rotta = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-audio-'));
    fs.writeFileSync(path.join(rotta, 'manifest.json'), '{ non json');
    expect(new CatalogoAudio(rotta).pubblico()).toEqual({ tracce: {}, crediti: [] });
    fs.rmSync(rotta, { recursive: true, force: true });
  });
});

describe.skipIf(!fs.existsSync(path.join(PROVA_F0, 'scena.yaml')))('audio della scena (prova-f0)', () => {
  const campagna = caricaCampagna(PROVA_F0);
  const cat = new CatalogoAudio(FIXTURE);

  it('scena e nodo sono lo stesso luogo; i vicini sono luoghi, non PNG', () => {
    expect(luogoEquivalente(campagna, 'scena_forno_vecchio')).toBe('n_osteria');
    expect(luogoEquivalente(campagna, 'n_osteria')).toBe('scena_forno_vecchio');
    expect(luoghiNoti(campagna)).toEqual(expect.arrayContaining(['scena_forno_vecchio', 'n_piazza', 'png_ottavia']));
    expect(luoghiVicini(campagna, 'scena_forno_vecchio')).toEqual(['n_piazza', 'n_mulino_valsecca']);
    expect(luoghiVicini(campagna, 'n_piazza')).toEqual(['scena_forno_vecchio', 'n_mulino_valsecca']);
  });

  it('musica del luogo, poi del luogo equivalente, poi dell’umore della scena', () => {
    const scena = audioDellaScena(cat, campagna, 'scena_forno_vecchio', null);
    expect(scena).toMatchObject({
      scena: 'scena_forno_vecchio',
      musica: 'luogo_scena_forno_vecchio',
      umore: null,
      ambienti: ['amb_scena_forno_vecchio_folla', 'amb_scena_forno_vecchio_fuoco'],
      temi: { png_ottavia: 'tema_png_ottavia', png_baldrin: 'tema_png_baldrin' },
    });
    // Precarica: musica e ambienti dei vicini, poi i temi dei presenti; niente di ciò che suona già.
    expect(scena.prossimi).toEqual(['luogo_n_piazza', 'amb_n_piazza_vento', 'umore_esplorazione_tesa', 'tema_png_ottavia', 'tema_png_baldrin']);
    expect(audioDellaScena(cat, campagna, 'n_osteria', null)).toMatchObject({ musica: 'luogo_scena_forno_vecchio', ambienti: ['amb_scena_forno_vecchio_folla', 'amb_scena_forno_vecchio_fuoco'] });
    expect(audioDellaScena(cat, campagna, 'n_mulino_valsecca', null)).toMatchObject({ musica: 'umore_esplorazione_tesa', ambienti: [] });
  });

  it('l’umore scelto vale solo nella sua scena', () => {
    expect(audioDellaScena(cat, campagna, 'n_piazza', { tag: 'tensione', scena: 'scena_forno_vecchio' }).umore).toBe('umore_tensione');
    expect(audioDellaScena(cat, campagna, 'n_piazza', { tag: 'tensione', scena: 'altra' }).umore).toBeNull();
    expect(audioDellaScena(cat, conScena(campagna, campagna.scena.id), 'n_piazza', { tag: 'inesistente', scena: 'scena_forno_vecchio' }).umore).toBeNull();
  });
});

describe('rotte dell’audio e cambio d’umore', () => {
  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-audio-'));
  let server: ServerCantastorie;
  let url: string;
  beforeAll(async () => {
    const config = caricaConfig({
      PORT: '0',
      HOST: '127.0.0.1',
      CANTASTORIE_LOG: cartella,
      CANTASTORIE_CARTELLA_CAMPAGNA: path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini'),
      CANTASTORIE_PROMPT_NARRATORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
      CANTASTORIE_TTS: 'mock',
      CANTASTORIE_AUDIO: FIXTURE,
    } as NodeJS.ProcessEnv);
    server = await costruisciServer(config, loggerMuto(), { narratore: new NarratoreFinto({ idPng: [], idPg: [] }), arbitro: null });
    await server.avvia();
    url = `http://127.0.0.1:${(server.app.http.server.address() as { port: number }).port}`;
  });
  afterAll(async () => {
    await server.chiudi();
    fs.rmSync(cartella, { recursive: true, force: true });
  });

  it('catalogo pubblico e file del manifest, nient’altro', async () => {
    const catalogo = (await (await fetch(`${url}/api/audio`)).json()) as CatalogoAudioPubblico;
    expect(Object.keys(catalogo.tracce)).toHaveLength(10);
    expect(catalogo.crediti).toHaveLength(2);
    const r = await fetch(`${url}/api/audio/luogo_n_piazza.m4a`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('audio/mp4');
    expect(r.headers.get('cache-control')).toBe('public, max-age=3600');
    expect((await r.arrayBuffer()).byteLength).toBe(fs.statSync(path.join(FIXTURE, 'luogo_n_piazza.m4a')).size);
    for (const male of ['manifest.json', '..%2Fmanifest.json', 'genera.sh', 'luogo_n_mancante.ogg']) expect((await fetch(`${url}/api/audio/${male}`)).status).toBe(404);
    expect(await (await fetch(`${url}/api/salute`)).json()).toMatchObject({ audio: 10 });
  });

  it('lo stato porta l’audio della scena; l’umore si sceglie e si toglie', async () => {
    const post = (umore: unknown) => fetch(`${url}/api/scena/umore`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ umore }) });
    const audio = () => server.regia.stato().scena.audio;
    // La mini campagna (scena_locanda, taverna_calda) non ha brani suoi: niente musica, temi vuoti.
    expect(audio()).toMatchObject({ scena: 'scena_locanda', musica: null, umore: null, ambienti: [], temi: {} });
    expect(await (await post('tensione')).json()).toEqual({ ok: true });
    expect(audio()?.umore).toBe('umore_tensione');
    expect(await (await post('battaglia')).json()).toMatchObject({ ok: false });
    expect(audio()?.umore).toBe('umore_tensione');
    expect((await post('../x')).status).toBe(400);
    expect(await (await post(null)).json()).toEqual({ ok: true });
    expect(audio()?.umore).toBeNull();
  });
});
