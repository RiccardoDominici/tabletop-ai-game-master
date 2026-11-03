/**
 * Registro di fine sessione (sessione/registro.ts): estratto DETERMINISTICO dall'archivio.
 *
 * 1. Partita vera col server intero (modalità repertorio, selettore a copione, voce finta, due
 *    telefoni): indizio al turno 1; menzogna al 2, dove il Motore aggiunge da sé il segno dovuto
 *    dell'orologio (segno_almeno_ogni: 2), anche se il copione lo chiedeva al 3; confessione e fatto
 *    noto al 4 (con un'azione privata); segno dal master al 5. Il registro dice ciò che è successo
 *    davvero, con quei turni, non ciò che il copione voleva.
 * 2. Stessi eventi → stessi byte (anche dopo un giro dall'archivio).
 * 3. Eventi a mano: modalità A (sezioni null + avviso), cambio di scena, segno tolto dal master.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { io as connetti, type Socket } from 'socket.io-client';
import type { ComandoMaster, Esito, EsitoEntrataMaster, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoTavolo } from '@cantastorie/shared';
import { costruisciServer, type ServerCantastorie } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { definizioniRegistro, estraiRegistro, type DefinizioniRegistro, type EventoDaRegistrare, type SessioneDaRegistrare } from '../src/sessione/registro';
import { scriviRegistro, yamlStabile } from '../src/sessione/scrivi-registro';
import type { FotografiaSessione } from '../src/sessione/tipi';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');
const TOKEN = 'token_di_prova_registro';

const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-registro-'));
const client: Client[] = [];
const server: ServerCantastorie[] = [];

afterAll(async () => {
  for (const c of client) c.disconnect();
  for (const s of server) await s.chiudi().catch(() => undefined);
  fs.rmSync(cartella, { recursive: true, force: true });
});

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
function attendi(c: Client, cond: (s: StatoTavolo) => boolean, ms = 8000): Promise<StatoTavolo> {
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

/** Il selettore a copione: una battuta del repertorio per turno. */
const COPIONE: Record<number, string> = {
  1: '[usa] nar_brocca > pg_anna\n[narratore] Anna, cosa fai?\n[invito] tutti',
  2: '[usa] oste_vino_menzogna > pg_anna\n[invito] tutti',
  // Il segno è già uscito al turno 2 (dovuto): questa riga il Motore la rifiuta (max_usi 1).
  3: '[usa] nar_tuono > pg_anna\n[narratore] Il vento cala.\n[invito] tutti',
  4: '[usa] oste_confessa > pg_anna\n[invito] tutti',
};

async function avvia(): Promise<{ s: ServerCantastorie; url: string }> {
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    CANTASTORIE_LOG: cartella,
    CANTASTORIE_CARTELLA_CAMPAGNA: MINI,
    CANTASTORIE_MODO: 'repertorio',
    CANTASTORIE_PROMPT_SELETTORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_CACHE_AUDIO: path.join(cartella, 'cache'),
    CANTASTORIE_TTS: 'mock',
    CANTASTORIE_MOCK_SCALA: '0.02',
    CANTASTORIE_MARGINE_AUDIO_MS: '50',
    CANTASTORIE_STALLO_MS: '0',
    CANTASTORIE_PRERISCALDA: '0',
    CANTASTORIE_MASTER_TOKEN: TOKEN,
  } as NodeJS.ProcessEnv);
  const narratore = new NarratoreFinto({
    idPng: [],
    idPg: [],
    primoTokenMs: 5,
    msPerPezzo: 1,
    copione: (turno) => COPIONE[turno] ?? `[narratore] Turno ${turno}: piove.\n[invito] tutti`,
  });
  const s = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null });
  await s.avvia();
  server.push(s);
  return { s, url: `http://127.0.0.1:${(s.app.http.server.address() as { port: number }).port}` };
}

function nuovo(url: string): Client {
  const c: Client = connetti(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  client.push(c);
  return c;
}

async function telefono(url: string, id_pg: string): Promise<Client> {
  const t = nuovo(url);
  await emetti<StatoTavolo>((cb) => t.emit('telefono:entra', cb));
  expect(await emetti<Esito>((cb) => t.emit('telefono:scegli_pg', { id_pg, dispositivo: `tel-${id_pg}-0123456789` }, cb))).toEqual({ ok: true });
  return t;
}

async function agisci(t: Client, id_pg: string, testo: string, versione: number, privata = false): Promise<void> {
  expect(await emetti<Esito>((cb) => t.emit('azione:invia', { id_pg, testo, versione_vista: versione, privata }, cb))).toEqual({ ok: true });
  expect(await emetti<Esito>((cb) => t.emit('azione:pronto', { id_pg, pronto: true }, cb))).toEqual({ ok: true });
}

/** Gioca un turno con le due azioni (Bruno facoltativo) e aspetta la finestra del turno dopo. */
async function turno(anna: Client, bruno: Client, s: StatoTavolo, testoAnna: string, testoBruno: string, privataBruno = false): Promise<StatoTavolo> {
  const dopo = attendi(anna, (x) => x.fase === 'finestra' && x.turno === s.turno + 1);
  await agisci(anna, 'pg_anna', testoAnna, s.versione_scena);
  await agisci(bruno, 'pg_bruno', testoBruno, s.versione_scena, privataBruno);
  return dopo;
}

describe('registro di fine sessione da una partita vera', () => {
  it('ogni fatto col suo turno; azioni pubbliche e private separate; deterministico', async () => {
    const a = await avvia();
    const master = nuovo(a.url);
    await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
    const comanda = (c: ComandoMaster) => emetti<Esito>((cb) => master.emit('master:comando', c, cb));
    const schermo = nuovo(a.url);
    await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
    schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
    const anna = await telefono(a.url, 'pg_anna');
    const bruno = await telefono(a.url, 'pg_bruno');

    const primo = attendi(anna, (x) => x.fase === 'finestra' && x.turno === 1);
    await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
    let s = await primo;
    s = await turno(anna, bruno, s, 'Guardo dietro il banco.', 'Ordino da bere.');
    s = await turno(anna, bruno, s, 'Chiedo del vino all’oste.', 'Annuso il boccale.');
    s = await turno(anna, bruno, s, 'Ascolto il temporale.', 'Sto zitto.');
    s = await turno(anna, bruno, s, 'Mostro la brocca all’oste.', 'Nascondo la brocca sotto il mantello.', true);
    expect(s.turno).toBe(5);
    expect(await comanda({ tipo: 'orologio', id: 'o_temporale', passo: 1 })).toEqual({ ok: true });

    const archivio = a.s.sessioni.archivio!;
    const id = a.s.regia.infoRegistro.sessione!;
    const info = archivio.sessione(id)!;
    const sessione: SessioneDaRegistrare = { ...info, pacchetto: null };
    const def = definizioniRegistro(a.s.campagna, caricaRepertorio(a.s.campagna));
    const { registro: r, trascrizione: t } = estraiRegistro(sessione, archivio.eventi(id), def);

    expect(r.archivio).toMatchObject({ id, modo: 'repertorio', stato: 'in_corso', ultimo_turno: 5 });
    expect(r.giocatori).toEqual(['pg_anna', 'pg_bruno']);
    expect(r.scene).toEqual([{ id: 'scena_locanda', titolo: 'La locanda della prova', dal_turno: 0, al_turno: 5, png_presenti: ['png_oste', 'png_guardia'] }]);
    expect(r.indizi).toEqual([{ id: 'i_brocca', turno: 1, battuta: 'nar_brocca' }]);
    expect(r.menzogne).toEqual([{ id: 'oste_vino', turno: 2, battuta: 'oste_vino_menzogna' }]);
    expect(r.fatti_noti).toEqual([{ id: 'f_oste_ladro', turno: 4, battuta: 'oste_confessa' }]);
    expect(r.battute).toEqual([
      { id: 'nar_brocca', chi: 'narratore', tipo: 'indizio', turno: 1 },
      { id: 'nar_tuono', chi: 'narratore', tipo: 'segno_orologio', turno: 2 },
      { id: 'oste_vino_menzogna', chi: 'png_oste', tipo: 'menzogna', turno: 2 },
      { id: 'oste_confessa', chi: 'png_oste', tipo: 'confessione', turno: 4 },
    ]);
    const temporale = r.orologi.find((o) => o.id === 'o_temporale')!;
    expect(temporale).toMatchObject({ segmenti: 2, pieni_all_inizio: 0, pieni_alla_fine: 2, completo: true, al_completo: 'Il fiume esonda.' });
    expect(temporale.segni).toEqual([
      { numero: 1, testo: 'Un tuono lontano.', turno: 2, causa: 'narrazione' },
      { numero: 2, testo: 'La porta sbatte.', turno: 5, causa: 'master' },
    ]);
    expect(r.orologi.find((o) => o.id === 'o_fuori')).toMatchObject({ pieni_all_inizio: 0, pieni_alla_fine: 0, segni: [] });

    // L'oste ha parlato ai turni 2 e 4; la guardia mai (è solo presente).
    expect(r.png_incontrati).toEqual([{ id: 'png_oste', nome: expect.any(String), primo_turno: 2, ultimo_turno: 4, battute: 2 }]);

    // Azioni: quelle di Anna tutte pubbliche; quella privata di Bruno separata (e fuori dalla trascrizione).
    const annaR = r.pg.find((p) => p.id === 'pg_anna')!;
    const brunoR = r.pg.find((p) => p.id === 'pg_bruno')!;
    expect(annaR.azioni_pubbliche.map((x) => [x.turno, x.testo, x.esito])).toEqual([
      [1, 'Guardo dietro il banco.', 'risolta'],
      [2, 'Chiedo del vino all’oste.', 'risolta'],
      [3, 'Ascolto il temporale.', 'risolta'],
      [4, 'Mostro la brocca all’oste.', 'risolta'],
    ]);
    expect(annaR.azioni_private).toEqual([]);
    expect(brunoR.azioni_private.map((x) => [x.turno, x.testo])).toEqual([[4, 'Nascondo la brocca sotto il mantello.']]);
    expect(brunoR.azioni_pubbliche.map((x) => x.turno)).toEqual([1, 2, 3]);
    expect(t.voci.some((v) => v.testo.includes('Nascondo la brocca'))).toBe(false);
    expect(t.voci.some((v) => v.testo.includes('Guardo dietro il banco'))).toBe(true);

    // Momenti: i turni dei cambiamenti, con le righe dette in quel turno.
    expect(r.momenti.map((m) => [m.turno, m.cosa])).toEqual([
      [1, ['indizio: i_brocca']],
      [2, ['orologio o_temporale: segno 1/2', 'menzogna: oste_vino']],
      [4, ['confessione: oste_confessa']],
      [5, ['orologio o_temporale: segno 2/2 (master)']],
    ]);
    expect(r.momenti[0]!.righe.map((x) => x.testo).join(' ')).toContain('brocca d');
    expect(r.momenti[1]!.righe.map((x) => x.testo).join(' ')).toContain('tuono');
    expect(r.momenti[2]!.azioni).toEqual([
      { id: expect.any(String), pg: 'pg_anna', privata: false },
      { id: expect.any(String), pg: 'pg_bruno', privata: true },
    ]);
    expect(r.avvisi).toEqual([]);

    // Trascrizione pubblica: apertura col riassunto al turno 0, poi i turni in ordine.
    expect(t.voci[0]).toMatchObject({ turno: 0, tipo: 'narrazione' });
    expect(t.voci.map((v) => v.turno)).toEqual([...t.voci.map((v) => v.turno)].sort((x, y) => x - y));
    expect(r.trascrizione).toEqual({ file: 'trascrizione.yaml', voci: t.voci.length, turni: 5 });

    // Determinismo: un secondo estratto dallo stesso archivio dà gli stessi byte.
    const di = (e: ReturnType<typeof estraiRegistro>): string => yamlStabile(e.registro, '#') + yamlStabile(e.trascrizione, '#');
    expect(di(estraiRegistro(sessione, archivio.eventi(id), def))).toBe(di({ registro: r, trascrizione: t }));

    // Su disco: due file YAML che si rileggono uguali all'estratto.
    const dove = path.join(cartella, 'registro-prova');
    const file = scriviRegistro(dove, { registro: r, trascrizione: t });
    expect(YAML.parse(fs.readFileSync(file.registro, 'utf8'))).toEqual(JSON.parse(JSON.stringify(r)));
    expect(YAML.parse(fs.readFileSync(file.trascrizione, 'utf8'))).toEqual(JSON.parse(JSON.stringify(t)));
    expect(fs.readFileSync(file.registro, 'utf8')).toMatch(/^# Registro della sessione/);
    expect(fs.readdirSync(dove).sort()).toEqual(['registro.yaml', 'trascrizione.yaml']); // niente file temporanei
  }, 30_000);
});

// ------------------------------------------------------------------ eventi a mano

const DEF: DefinizioniRegistro = {
  campagna: 'prova',
  titolo: 'Prova',
  pg: [{ id: 'pg_a', nome: 'A' }],
  png: [{ id: 'png_x', nome: 'Ics' }],
  scene: [
    { id: 's1', titolo: 'Uno', png_presenti: ['png_x'] },
    { id: 's2', titolo: 'Due', png_presenti: [] },
  ],
  orologi: [{ id: 'o', nome: 'O', segmenti: 3, segni: ['uno', 'due', 'tre'], al_completo: null, parte_dopo: [] }],
  battute: new Map(),
};

const SESSIONE: SessioneDaRegistrare = {
  id: '2026-11-03T10:00:00.000Z',
  campagna: 'prova',
  modo: 'improvvisa',
  creata: '2026-11-03T10:00:00.000Z',
  aggiornata: '2026-11-03T11:00:00.000Z',
  stato: 'chiusa',
  motivo_chiusura: 'fine sessione',
  turno: 4,
  pacchetto: 2,
};

function foto(turno: number, scena: string, pieni: number, ultimoTurno: number | null, causa: string): FotografiaSessione & { causa: string } {
  return {
    fase: 'finestra',
    turno,
    versioneScena: turno,
    scena,
    luogo: scena,
    situazione: null,
    situazioniMostrate: [],
    umore: null,
    orologi: { o: { pieni, ultimoTurno, partito: true } },
    repertorio: null,
    note: { elenco: [{ id: 'n1', testo: 'Ricordati del ponte.', turni_rimasti: 2, turni_totali: 3, creata_al_turno: 1 }], prossimoId: 2 },
    pausa: { richiesta: false, invitoSospeso: null },
    prossimoIdTrascrizione: 1,
    causa,
  };
}

describe('registro da eventi a mano', () => {
  const eventi: EventoDaRegistrare[] = [
    { seq: 1, ts: '2026-11-03T10:00:00.000Z', tipo: 'inizio', turno: 0, dati: { campagna: 'prova', modo: 'improvvisa', scena: 's1' } },
    { seq: 2, ts: '2026-11-03T10:00:01.000Z', tipo: 'fotografia', turno: 0, dati: foto(0, 's1', 1, null, 'inizio') },
    { seq: 3, ts: '2026-11-03T10:01:00.000Z', tipo: 'trascrizione_turno', turno: 1, dati: { turno: 1, voci: [{ id: 1, turno: 1, tipo: 'battuta', chi: 'png_x', nome: 'Ics', testo: 'Ciao.' }] } },
    { seq: 4, ts: '2026-11-03T10:01:00.000Z', tipo: 'fotografia', turno: 2, dati: foto(2, 's1', 2, 1, 'fine_turno') },
    { seq: 5, ts: '2026-11-03T10:02:00.000Z', tipo: 'fotografia', turno: 2, dati: foto(2, 's1', 1, 2, 'master:orologio') },
    { seq: 6, ts: '2026-11-03T10:03:00.000Z', tipo: 'fotografia', turno: 3, dati: foto(3, 's2', 1, 2, 'master:scena') },
    // Il turno 1 riscritto (narrazione rigiocata): vale l'ultima versione.
    { seq: 7, ts: '2026-11-03T10:03:30.000Z', tipo: 'trascrizione_turno', turno: 1, dati: { turno: 1, voci: [{ id: 2, turno: 1, tipo: 'battuta', chi: 'png_x', nome: 'Ics', testo: 'Ciao di nuovo.' }] } },
    { seq: 8, ts: '2026-11-03T10:04:00.000Z', tipo: 'fotografia', turno: 4, dati: foto(4, 's2', 1, 2, 'fine_turno') },
  ];

  it('modalità A: indizi e battute null con un avviso; scene, segni e segni tolti col loro turno', () => {
    const { registro: r, trascrizione: t } = estraiRegistro(SESSIONE, eventi, DEF);
    expect(r.sessione).toBe(2);
    expect(r.indizi).toBeNull();
    expect(r.battute).toBeNull();
    expect(r.menzogne).toBeNull();
    expect(r.fatti_noti).toBeNull();
    expect(r.avvisi.join(' ')).toMatch(/Modalità A/);
    expect(r.scene).toEqual([
      { id: 's1', titolo: 'Uno', dal_turno: 0, al_turno: 2, png_presenti: ['png_x'] },
      { id: 's2', titolo: 'Due', dal_turno: 3, al_turno: 4, png_presenti: [] },
    ]);
    expect(r.luoghi).toEqual([
      { id: 's1', dal_turno: 0, causa: 'inizio' },
      { id: 's2', dal_turno: 3, causa: 'master' },
    ]);
    expect(r.orologi[0]).toMatchObject({ pieni_all_inizio: 1, pieni_alla_fine: 1, segni: [{ numero: 2, testo: 'due', turno: 1, causa: 'narrazione' }], tolti: [{ numero: 2, turno: 2 }] });
    expect(r.png_incontrati).toEqual([{ id: 'png_x', nome: 'Ics', primo_turno: 1, ultimo_turno: 1, battute: 1 }]);
    expect(t.voci.map((v) => v.testo)).toEqual(['Ciao di nuovo.']);
    expect(r.note_del_master).toEqual([{ testo: 'Ricordati del ponte.', creata_al_turno: 1 }]);
    expect(r.archivio).toMatchObject({ eventi: 8, ultimo_evento: '2026-11-03T10:04:00.000Z', ultimo_turno: 4, motivo_chiusura: 'fine sessione' });
    expect(r.momenti.map((m) => [m.turno, m.cosa])).toEqual([
      [1, ['orologio o: segno 2/3']],
      [3, ['scena: s2']],
    ]);
  });

  it('una sessione mai partita: registro vuoto con un avviso, niente eccezioni', () => {
    const { registro: r } = estraiRegistro({ ...SESSIONE, pacchetto: null }, eventi.slice(0, 1), DEF);
    expect(r.scene).toEqual([]);
    expect(r.orologi).toEqual([]);
    expect(r.avvisi[0]).toMatch(/mai partita/);
  });
});
