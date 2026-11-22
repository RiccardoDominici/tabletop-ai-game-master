/**
 * Creation at the table with the whole server (docs/creazione.md; creazione/servizio.ts, trasporto/creazione.ts,
 * ciclo-server.ts `ricarica`): a phone builds a PC with manual dice over the socket, an illegal choice is refused by
 * the server, the Game Master's panel sees the draft and approves; the PC is written to the instance's store (a test
 * instance's log folder, never the campaign), the server rebuilds on the same package and the PC is at the table; a
 * new start (the next evening) loads it again. A player who joins mid-session: approved in an open window nobody has sent
 * in, the session resumes from its snapshot (the hit points the Game Master changed stay), the new PC is at the table
 * and is called from the next window. Then a campaign that builds all its PCs: it loads with none, and the story does
 * not start until one is approved. Invented fucina fixture, copied to a temporary folder.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { io as connetti, type Socket } from 'socket.io-client';
import type { AzioneCreazione, ComandoMaster, Esito, EsitoCreazione, EsitoEntrataMaster, EventiClientVersoServer, EventiServerVersoClient, StatoMaster, StatoTavolo, VistaCreazione } from '@tabletop-ai-gm/shared';
import { ServerConCiclo } from '../src/ciclo-server';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import type { ServerTagm } from '../src/avvio';
import { perchéAspettare } from '../src/creazione/collega';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'campagne', 'fucina');
const TOKEN = 'token_di_prova_creazione';
const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-creazione-'));
const client: Client[] = [];
const cicli: ServerConCiclo[] = [];

afterAll(async () => {
  for (const c of client) c.disconnect();
  for (const s of cicli) await s.chiudi().catch(() => undefined);
  fs.rmSync(radice, { recursive: true, force: true });
});

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
async function finché(cond: () => boolean, ms = 10000): Promise<void> {
  const fine = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > fine) throw new Error('condizione non arrivata');
    await new Promise((r) => setTimeout(r, 20));
  }
}

function copia(nome: string, ritocca?: (c: string) => void): string {
  const dest = path.join(radice, nome);
  fs.cpSync(FIXTURE, dest, { recursive: true });
  ritocca?.(dest);
  return dest;
}

async function avvia(campagna: string, log: string): Promise<ServerConCiclo> {
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    TAGM_LOG: log,
    TAGM_CARTELLA_CAMPAGNA: campagna,
    TAGM_MODO: 'improvvisa',
    TAGM_CACHE_AUDIO: path.join(log, 'cache'),
    TAGM_TTS: 'mock',
    TAGM_ASSESTAMENTO_MS: '20',
    TAGM_MOCK_SCALA: '0.02',
    TAGM_MARGINE_AUDIO_MS: '50',
    TAGM_PRERISCALDA: '0',
    TAGM_MASTER_TOKEN: TOKEN,
    TAGM_TIRI_GIOCATORI: 'manuale',
    TAGM_SEME_DADI: '0123456789abcdef',
  } as NodeJS.ProcessEnv);
  const narratore = new NarratoreFinto({ idPng: [], idPg: [], primoTokenMs: 5, msPerPezzo: 1, copione: () => '[narratore] Il martello batte.\n[invito] tutti' });
  const c = await ServerConCiclo.avvia(config, loggerMuto(), { narratore, arbitro: null, arbitroProve: null });
  cicli.push(c);
  return c;
}

const url = (s: ServerTagm): string => `http://127.0.0.1:${(s.app.http.server.address() as { port: number }).port}`;
function nuovo(u: string): Client {
  const c: Client = connetti(u, { transports: ['websocket'], forceNew: true, reconnection: false });
  client.push(c);
  return c;
}

async function master(u: string): Promise<{ comanda: (c: ComandoMaster) => Promise<Esito>; stato: () => Promise<StatoMaster> }> {
  const c = nuovo(u);
  const entra = () => emetti<EsitoEntrataMaster>((cb) => c.emit('master:entra', { token: TOKEN }, cb));
  if (!(await entra()).ok) throw new Error('master non entrato');
  return {
    comanda: (x) => emetti<Esito>((cb) => c.emit('master:comando', x, cb)),
    stato: async () => {
      const r = await entra();
      if (!r.ok) throw new Error('master');
      return r.stato;
    },
  };
}

/** A phone's creation actions, by its device token. */
function creatore(t: Client, dispositivo: string): (a: AzioneCreazione) => Promise<EsitoCreazione> {
  return (azione) => emetti<EsitoCreazione>((cb) => t.emit('creazione:azione', { dispositivo, azione }, cb));
}
async function ok(p: Promise<EsitoCreazione>): Promise<VistaCreazione> {
  const e = await p;
  if (!e.ok) throw new Error(e.errore);
  return e.bozza;
}

/** A human fighter, built die by die: scores, race, class, hit points, money, a sword and a shield, the name. */
async function costruisciLama(fai: ReturnType<typeof creatore>, nome: string): Promise<VistaCreazione> {
  await ok(fai({ tipo: 'inizia' }));
  for (const d of [[6, 5, 5], [4, 4, 2], [5, 5, 1], [6, 4, 3]]) await ok(fai({ tipo: 'tira', valori: d }));
  await ok(fai({ tipo: 'conferma', passo: 'caratteristiche' }));
  // The illegal choice, sent anyway: the server refuses it (Forza 16 is over the small race's 15).
  const rifiuto = await fai({ tipo: 'scegli', passo: 'razza', id: 'piccolo' });
  expect(rifiuto).toMatchObject({ ok: false, errore: 'Non puoi essere Piccolo: Forza 16, serve ≤ 15.' });
  await ok(fai({ tipo: 'scegli', passo: 'razza', id: 'umano' }));
  await ok(fai({ tipo: 'scegli', passo: 'classe', id: 'lama' }));
  await ok(fai({ tipo: 'tira', valori: [7] }));
  await ok(fai({ tipo: 'tira', valori: [5, 5, 5] }));
  await ok(fai({ tipo: 'compra', id: 'spada', quante: 1 }));
  const v = await ok(fai({ tipo: 'compra', id: 'scudo', quante: 1 }));
  expect(v.acquisti).toMatchObject({ difesa: 11, monete: [{ id: 'mo', quante: 135 }] });
  await ok(fai({ tipo: 'conferma', passo: 'acquisti' }));
  await ok(fai({ tipo: 'lingue', lingue: ['comune'] }));
  return ok(fai({ tipo: 'descrizione', nome, aspetto: 'Le spalle larghe.' }));
}

describe('when the Game Master may approve a PC (the server rebuilds)', () => {
  it('before the start and in an open window nobody has sent in; never mid-turn or with the story held', () => {
    expect(perchéAspettare({ fase: 'attesa', azioniInFinestra: 0 })).toBeNull();
    expect(perchéAspettare({ fase: 'finestra', azioniInFinestra: 0 })).toBeNull();
    expect(perchéAspettare({ fase: 'finestra', azioniInFinestra: 1 })).toMatch(/inviate|sent/);
    for (const fase of ['apertura', 'narrazione'] as const) expect(perchéAspettare({ fase, azioniInFinestra: 0 })).toMatch(/fine del turno|end of the turn/);
    for (const fase of ['pausa', 'fermata'] as const) expect(perchéAspettare({ fase, azioniInFinestra: 0 })).toMatch(/ferma|stopped/);
  });
});

describe('a PC built on a phone joins the campaign', () => {
  it('manual dice, a refused choice, the panel approves, the server rebuilds, the next start loads it', async () => {
    const campagna = copia('fucina');
    const log = path.join(radice, 'log-1');
    const ciclo = await avvia(campagna, log);
    const s1 = ciclo.corrente;
    const tavolo = nuovo(url(s1));
    const st = await emetti<StatoTavolo>((cb) => tavolo.emit('telefono:entra', cb));
    expect(st.creazione).toEqual({ modo: 'entrambi' });
    expect(st.pg.map((p) => p.id)).toEqual(['pg_brina']);

    const fai = creatore(tavolo, 'telefono-di-gaspare-01');
    const finita = await costruisciLama(fai, 'Gaspare');
    expect(finita).toMatchObject({ stato: 'pronta', problemi: [] });

    // The panel sees the draft with the rolls entered on the phone, and approves.
    const m = await master(url(s1));
    const vista = (await m.stato()).creazione!;
    expect(vista).toHaveLength(1);
    expect(vista[0]).toMatchObject({ telefono: 'telefo', stato: 'pronta', descrizione: { nome: 'Gaspare' } });
    expect(vista[0]!.tiri_inseriti.map((t) => t.dadi)).toEqual([[6, 5, 5], [4, 4, 2], [5, 5, 1], [6, 4, 3], [7], [5, 5, 5]]);
    const notizia = emetti<VistaCreazione>((cb) => tavolo.once('creazione:bozza', cb));
    expect(await m.comanda({ tipo: 'creazione', azione: 'approva', id: vista[0]!.id })).toEqual({ ok: true });
    expect(await notizia).toMatchObject({ stato: 'approvata', id_pg: 'pg_gaspare' });

    // Written to the test instance's store (its log folder), never into the campaign.
    const file = path.join(log, 'pg-creati', 'pg_gaspare.yaml');
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.existsSync(path.join(campagna, 'pg-creati'))).toBe(false);
    const voce = YAML.parse(fs.readFileSync(file, 'utf8')) as { scheda: Record<string, unknown> };
    expect(voce.scheda).toMatchObject({ classe: 'lama', razza: 'umano', pf: 8, equipaggiamento: ['spada', 'scudo'], monete: { mo: 135 } });

    // The server rebuilds on the same package: the PC is at the table, with its sheet's hit points.
    await finché(() => ciclo.corrente !== s1);
    await ciclo.attendiCambio();
    const s2 = ciclo.corrente;
    expect(s2.campagna.pg.map((p) => p.id)).toEqual(['pg_brina', 'pg_gaspare']);
    const t2 = nuovo(url(s2));
    const st2 = await emetti<StatoTavolo>((cb) => t2.emit('telefono:entra', cb));
    expect(st2.pg.find((p) => p.id === 'pg_gaspare')).toMatchObject({ nome: 'Gaspare', pf: { attuali: 8, massimi: 8 } });
    // The phone that built him is remembered with him: it takes him when it reconnects, even if it missed the notice.
    expect(await emetti<{ id_pg: string | null }>((cb) => t2.emit('telefono:dispositivo', { dispositivo: 'telefono-di-gaspare-01' }, cb))).toEqual({ id_pg: 'pg_gaspare' });
    expect(await emetti<Esito>((cb) => t2.emit('telefono:scegli_pg', { id_pg: 'pg_gaspare', dispositivo: 'telefono-di-gaspare-01' }, cb))).toEqual({ ok: true });
    // The draft's job is done: the panel no longer lists it.
    const m2 = await master(url(s2));
    expect((await m2.stato()).creazione).toEqual([]);
    // The new PC leads a reaction roll from the panel (the set's table, R5): the card is the Game Master's.
    expect(await m2.comanda({ tipo: 'reazione', tabella: 'reazione', id_pg: 'pg_gaspare', id_png: 'png_orsola', aggiustamento: 0 })).toEqual({ ok: true });
    expect(await m2.comanda({ tipo: 'reazione', tabella: 'nessuna', id_pg: 'pg_gaspare' })).toMatchObject({ ok: false });
    const tiri = (await m2.stato()).tiri!;
    expect(tiri.reazioni?.tabelle).toEqual([{ id: 'reazione', nome: "Reazione all'incontro" }]);
    expect(tiri.carte.at(-1)).toMatchObject({ etichetta: "Reazione all'incontro", del_master: true, nascosta: true });

    // The next evening (a new start of the server): the PC is loaded again.
    await ciclo.chiudi();
    const domani = await avvia(campagna, log);
    expect(domani.corrente.campagna.pg.map((p) => p.id)).toEqual(['pg_brina', 'pg_gaspare']);
  });

  it('a player who joins mid-session: approved in an empty window, the session resumes with the new PC at the table', async () => {
    const campagna = copia('fucina-in-gioco');
    const ciclo = await avvia(campagna, path.join(radice, 'log-3'));
    const s1 = ciclo.corrente;
    const u1 = url(s1);
    const schermo = nuovo(u1);
    await emetti((cb) => schermo.emit('schermo:osserva', cb));
    schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
    const brina = nuovo(u1);
    await emetti<StatoTavolo>((cb) => brina.emit('telefono:entra', cb));
    expect(await emetti<Esito>((cb) => brina.emit('telefono:scegli_pg', { id_pg: 'pg_brina', dispositivo: 'telefono-di-brina-01' }, cb))).toEqual({ ok: true });
    // The session starts and its first window opens; the Game Master hurts Brina (the snapshot differs from her sheet).
    const aperta = new Promise<StatoTavolo>((ok) => brina.on('stato', (st) => st.fase === 'finestra' && ok(st)));
    expect(await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb))).toEqual({ ok: true });
    await aperta;
    const m = await master(u1);
    expect(await m.comanda({ tipo: 'pf', id: 'pg_brina', valore: 3 })).toEqual({ ok: true });
    // A late player builds a PC on the phone and the Game Master approves it while the window is open and empty.
    const tardi = nuovo(u1);
    await emetti<StatoTavolo>((cb) => tardi.emit('telefono:entra', cb));
    const pronta = await costruisciLama(creatore(tardi, 'telefono-di-gaspare-02'), 'Gaspare');
    expect((await m.stato()).tavolo.fase).toBe('finestra');
    expect(await m.comanda({ tipo: 'creazione', azione: 'approva', id: pronta.id })).toEqual({ ok: true });
    await finché(() => ciclo.corrente !== s1);
    await ciclo.attendiCambio();
    const s2 = ciclo.corrente;
    // The same session resumes from its snapshot: Brina keeps her 3 hit points, Gaspare comes with his sheet's 8.
    expect(s2.sessioni.archivio!.elenco(s2.campagna.id).filter((x) => x.stato === 'in_corso')).toHaveLength(1);
    const t2 = nuovo(url(s2));
    const st = await emetti<StatoTavolo>((cb) => t2.emit('telefono:entra', cb));
    expect(st.pg.find((p) => p.id === 'pg_brina')!.pf).toMatchObject({ attuali: 3 });
    expect(st.pg.find((p) => p.id === 'pg_gaspare')!.pf).toMatchObject({ attuali: 8, massimi: 8 });
    expect(await emetti<{ id_pg: string | null }>((cb) => t2.emit('telefono:dispositivo', { dispositivo: 'telefono-di-gaspare-02' }, cb))).toEqual({ id_pg: 'pg_gaspare' });
    expect(await emetti<Esito>((cb) => t2.emit('telefono:scegli_pg', { id_pg: 'pg_gaspare', dispositivo: 'telefono-di-gaspare-02' }, cb))).toEqual({ ok: true });
    // The projector's page sends «inizia» again when it reconnects (schermo/sessione.ts): the session resumes there.
    const b2 = nuovo(url(s2));
    await emetti<StatoTavolo>((cb) => b2.emit('telefono:entra', cb));
    expect(await emetti<Esito>((cb) => b2.emit('telefono:scegli_pg', { id_pg: 'pg_brina', dispositivo: 'telefono-di-brina-01' }, cb))).toEqual({ ok: true });
    const proiettore = nuovo(url(s2));
    await emetti((cb) => proiettore.emit('schermo:osserva', cb));
    proiettore.on('audio:fine_turno', (f) => proiettore.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
    const riaperta = new Promise<StatoTavolo>((ok) => t2.on('stato', (x) => x.fase === 'finestra' && ok(x)));
    expect(await emetti<Esito>((cb) => proiettore.emit('schermo:inizia', cb))).toEqual({ ok: true });
    const finestra = await riaperta;
    // The window open at the approval comes back as it was: the narrator had called Brina by name, so Gaspare is not
    // in it (azioni/tavolo.ts aggiungiInvitato: only an invitation to everyone takes a PC who arrives later)...
    expect(finestra.finestra).toMatchObject({ turno: 1, invitati: ['pg_brina'] });
    // ...but his phone can write at once, like any PC's outside the invitation, and the next window calls him too.
    expect(await emetti<Esito>((cb) => t2.emit('azione:invia', { id_pg: 'pg_gaspare', testo: 'Prendo la spada dalla rastrelliera.', versione_vista: finestra.versione_scena }, cb))).toEqual({ ok: true });
    const dopo = new Promise<StatoTavolo>((ok) => t2.on('stato', (x) => x.fase === 'finestra' && x.finestra.turno > 1 && ok(x)));
    expect(await emetti<Esito>((cb) => b2.emit('azione:invia', { id_pg: 'pg_brina', testo: 'Guardo la porta.', versione_vista: finestra.versione_scena }, cb))).toEqual({ ok: true });
    expect((await dopo).finestra.invitati).toEqual(['pg_brina', 'pg_gaspare']);
  }, 20_000);

  it('a campaign that builds all its PCs loads with none, and the story waits for the first one', async () => {
    const campagna = copia('fucina-vuota', (c) => {
      fs.writeFileSync(path.join(c, 'pg.yaml'), 'situazione_comune: Siete alla fucina.\npersonaggi: []\n');
      const f = path.join(c, 'campagna.yaml');
      fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('modo: entrambi', 'modo: al_tavolo'));
    });
    const ciclo = await avvia(campagna, path.join(radice, 'log-2'));
    const s = ciclo.corrente;
    expect(s.campagna.pg).toEqual([]);
    const schermo = nuovo(url(s));
    await emetti((cb) => schermo.emit('schermo:osserva', cb));
    expect(await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb))).toMatchObject({ ok: false, errore: expect.stringMatching(/Nessun personaggio ancora/) });
    const tel = nuovo(url(s));
    const st = await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
    expect(st).toMatchObject({ fase: 'attesa', creazione: { modo: 'al_tavolo' }, pg: [] });
  });
});
