/**
 * Pannello del master col server intero e client Socket.IO veri (narratore a copione, voce finta):
 * token (i telefoni non entrano), note di regia nel messaggio del narratore, pausa a fine
 * narrazione e ripresa, freno d'emergenza a metà narrazione, chiusura della finestra, azione
 * saltata, orologio avanti e indietro, cambio di luogo, registro logs/master.jsonl.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type {
  AzionePrivata,
  ComandoMaster,
  Esito,
  EsitoEntrataMaster,
  EventiClientVersoServer,
  EventiServerVersoClient,
  InfoServer,
  StatoMaster,
  StatoTavolo,
} from '@tabletop-ai-gm/shared';
import { costruisciServer, type ServerTagm } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { creaLogger, loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import { testo } from '../src/lingua';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const TOKEN = 'token_di_prova_master_123';
const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');

let cartella: string;
let server: ServerTagm;
let url: string;
const messaggi: string[] = [];
const client: Client[] = [];
let lento = false;

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
function nuovoClient(): Client {
  const c: Client = connetti(url, { transports: ['websocket'], forceNew: true });
  client.push(c);
  return c;
}
function attendi<T>(c: Client, evento: 'stato' | 'master:stato', cond: (s: T) => boolean, ms = 8000): Promise<T> {
  return new Promise((risolvi, rifiuta) => {
    const t = setTimeout(() => {
      c.off(evento, f as never);
      rifiuta(new Error(`${evento} atteso non arrivato`));
    }, ms);
    const f = (s: T): void => {
      if (cond(s)) {
        clearTimeout(t);
        c.off(evento, f as never);
        risolvi(s);
      }
    };
    c.on(evento, f as never);
  });
}
const comanda = (m: Client, c: ComandoMaster): Promise<Esito> => emetti<Esito>((cb) => m.emit('master:comando', c, cb));

beforeAll(async () => {
  // Copia della campagna mini con due nodi-luogo in più (per il cambio di luogo).
  cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-master-'));
  const campagna = path.join(cartella, 'mini');
  fs.cpSync(MINI, campagna, { recursive: true });
  fs.appendFileSync(
    path.join(campagna, 'campagna.yaml'),
    'nodi:\n  - {id: n_locanda, tipo: luogo, nome: "La locanda", collegamenti: [n_ponte]}\n  - {id: n_ponte, tipo: luogo, nome: "Il ponte", collegamenti: [n_locanda]}\n',
  );
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    TAGM_LOG: cartella,
    TAGM_CARTELLA_CAMPAGNA: campagna,
    TAGM_PROMPT_NARRATORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    TAGM_TTS: 'mock',
    // Assestamento lungo: qui il master chiude e mette in pausa a mano subito dopo un invio.
    TAGM_ASSESTAMENTO_MS: '1500',
    TAGM_MOCK_SCALA: '0.02',
    TAGM_MARGINE_AUDIO_MS: '50',
    TAGM_MASTER_TOKEN: TOKEN,
  } as NodeJS.ProcessEnv);
  const narratore = new NarratoreFinto({
    idPng: ['png_oste'],
    idPg: ['pg_anna', 'pg_bruno'],
    primoTokenMs: 10,
    msPerPezzo: 2,
    copione: () =>
      lento
        ? `[narratore] ${'La pioggia batte sulle imposte e il fumo sale piano. '.repeat(8)}\n[invito] tutti`
        : '[narratore] L’oste asciuga un boccale.\n[png_oste] Pagate prima, foresti.\n[invito] tutti',
  });
  const narra = narratore.narra.bind(narratore);
  narratore.narra = async (r, cb) => {
    messaggi.push(r.messaggio);
    if (lento) await new Promise((x) => setTimeout(x, 400)); // il tempo di premere «Ferma»
    return narra(r, cb);
  };
  const log = process.env['MASTER_TEST_LOG'] ? creaLogger({ livello: 'silent', cartellaLog: cartella }) : loggerMuto();
  server = await costruisciServer(config, log, { narratore, arbitro: null });
  await server.avvia();
  url = `http://127.0.0.1:${(server.app.http.server.address() as { port: number }).port}`;
});

afterAll(async () => {
  for (const c of client) c.disconnect();
  await server.chiudi();
  if (process.env['MASTER_TEST_LOG']) console.log('log del test:', cartella);
  else fs.rmSync(cartella, { recursive: true, force: true });
});

describe('pannello del master', () => {
  it('token: i telefoni non entrano né comandano; il master sì, e ogni comando è un evento', async () => {
    expect(server.tokenMaster).toBe(TOKEN);
    const tel = nuovoClient();
    const statiMasterAlTelefono: StatoMaster[] = [];
    tel.on('master:stato', (s) => statiMasterAlTelefono.push(s));
    await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
    expect(await comanda(tel, { tipo: 'pausa' })).toMatchObject({ ok: false });
    expect(await emetti<EsitoEntrataMaster>((cb) => tel.emit('master:entra', { token: 'sbagliato' }, cb))).toMatchObject({ ok: false });
    expect(await emetti<EsitoEntrataMaster>((cb) => tel.emit('master:entra', { token: TOKEN.slice(0, -1) + 'x' }, cb))).toMatchObject({ ok: false });

    const master = nuovoClient();
    const entrata = await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
    expect(entrata.ok).toBe(true);
    if (!entrata.ok) return;
    expect(entrata.stato.tavolo.fase).toBe('attesa');
    expect(entrata.stato.orologi.map((o) => o.id)).toEqual(['o_temporale']);
    expect(entrata.stato.orologi[0]).toMatchObject({ pieni: 0, segmenti: 2, prossimo: 'Un tuono lontano.' });
    expect(entrata.stato.luoghi.map((l) => l.id)).toEqual(['scena_locanda', 'n_locanda', 'n_ponte']);
    expect(entrata.stato.limiti_note).toEqual({ max: 3, turni_max: 15 });

    // Un comando a scena non iniziata si rifiuta, ma resta nel registro.
    expect(await comanda(master, { tipo: 'pausa' })).toEqual({ ok: false, errore: 'La scena non è in corso.' });
    expect(await comanda(master, { tipo: 'boh' } as unknown as ComandoMaster)).toMatchObject({ ok: false });
    await new Promise((r) => setTimeout(r, 50));
    expect(statiMasterAlTelefono).toEqual([]);
  });

  it('nota di regia nel messaggio, pausa a fine narrazione, ripresa, finestra chiusa dal master', async () => {
    const master = nuovoClient();
    await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
    const schermo = nuovoClient();
    await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
    schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
    const tel = nuovoClient();
    await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
    expect(await emetti<Esito>((cb) => tel.emit('telefono:scegli_pg', { id_pg: 'pg_anna' }, cb))).toEqual({ ok: true });
    const mie: Array<AzionePrivata | null> = [];
    tel.on('azione:mia', (a) => mie.push(a));

    const finestra1 = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'finestra' && s.tavolo.finestra.aperta);
    await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
    await finestra1;

    // Nota: limiti e validazione, poi una nota valida per 2 turni.
    expect(await comanda(master, { tipo: 'nota', testo: '   ', turni: 3 })).toMatchObject({ ok: false });
    expect(await comanda(master, { tipo: 'nota', testo: 'Frasi corte.', turni: 16 })).toMatchObject({ ok: false });
    expect(await comanda(master, { tipo: 'nota', testo: 'Ottavia parla solo a monosillabi.', turni: 2 })).toEqual({ ok: true });

    // Il master chiude la finestra subito dopo l'azione; poi chiede la pausa mentre si narra.
    expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Ordino da bere.', versione_vista: 1 }, cb))).toEqual({ ok: true });
    const narrazione = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'narrazione');
    expect(await comanda(master, { tipo: 'chiudi_finestra' })).toEqual({ ok: true });
    await narrazione;
    const pausa = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'pausa');
    expect(await comanda(master, { tipo: 'pausa' })).toEqual({ ok: true });
    const inPausa = await pausa;
    expect(inPausa.pausa).toEqual({ richiesta: false, attiva: true });
    expect(inPausa.tavolo.finestra.aperta).toBe(false);
    // La nota è entrata nel messaggio del narratore, e ha consumato un turno.
    const ultimo = messaggi.at(-1)!;
    expect(ultimo).toContain(testo('messaggio.titolo_note_regia'));
    expect(ultimo).toContain('- Ottavia parla solo a monosillabi.');
    expect(inPausa.note).toMatchObject([{ testo: 'Ottavia parla solo a monosillabi.', turni_rimasti: 1, turni_totali: 2 }]);
    // L'azione chiusa è stata risolta.
    expect(inPausa.azioni.find((a) => a.id_pg === 'pg_anna')).toMatchObject({ stato: 'risolta', privata: false });

    // In pausa i telefoni scrivono ancora; la finestra si apre solo alla ripresa.
    expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Guardo la botte, in segreto.', versione_vista: 2, privata: true }, cb))).toEqual({ ok: true });
    const riaperta = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'finestra' && s.tavolo.finestra.aperta);
    expect(await comanda(master, { tipo: 'riprendi' })).toEqual({ ok: true });
    const s2 = await riaperta;
    const privata = s2.azioni.find((a) => a.stato === 'in_coda');
    expect(privata).toMatchObject({ id_pg: 'pg_anna', privata: true, saltabile: true, testo: 'Guardo la botte, in segreto.' });

    // Salta: l'azione privata diventa «superata» e il giocatore ne sa il motivo.
    expect(await comanda(master, { tipo: 'salta_azione', id_azione: privata!.id })).toEqual({ ok: true });
    expect(mie.at(-1)).toMatchObject({ stato: 'superata', motivo: testo('regia.motivi.saltata'), testo: 'Guardo la botte, in segreto.' });
    expect(await comanda(master, { tipo: 'salta_azione', id_azione: privata!.id })).toMatchObject({ ok: false });

    // Pausa a finestra aperta: la finestra resta aperta, senza conto alla rovescia.
    expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo: 'Busso al bancone.', versione_vista: 2 }, cb))).toEqual({ ok: true });
    const attesaSospesa = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'pausa');
    expect(await comanda(master, { tipo: 'pausa' })).toEqual({ ok: true });
    const sospesa = await attesaSospesa;
    expect(sospesa.tavolo.finestra).toMatchObject({ aperta: true, chiusura_prevista_ms: null });
    expect(await comanda(master, { tipo: 'chiudi_finestra' })).toMatchObject({ ok: false });
    const attesaRipresa = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'finestra');
    expect(await comanda(master, { tipo: 'riprendi' })).toEqual({ ok: true });
    const ripresa = await attesaRipresa;
    // Ritmo calmo: nessun conto alla rovescia nemmeno dopo la ripresa; Anna ha già inviato.
    expect(ripresa.tavolo.finestra).toMatchObject({ chiusura_prevista_ms: null, aspettiamo: [] });

    // Seconda narrazione: la nota c'è ancora (ultimo turno), poi scade.
    const dopo = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'finestra' && s.tavolo.turno === 3);
    expect(await comanda(master, { tipo: 'chiudi_finestra' })).toEqual({ ok: true });
    const s3 = await dopo;
    expect(messaggi.at(-1)).toContain('- Ottavia parla solo a monosillabi.');
    expect(s3.note).toEqual([]);
  });

  it('freno d’emergenza a metà narrazione: LLM e voce interrotti, tavolo in pausa, azione da rimandare', async () => {
    const master = nuovoClient();
    await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
    const schermo = nuovoClient();
    await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
    await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
    let interrotto = 0;
    schermo.on('audio:interrompi', () => (interrotto += 1));
    const tel = nuovoClient();
    await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
    await emetti<Esito>((cb) => tel.emit('telefono:scegli_pg', { id_pg: 'pg_bruno' }, cb));
    const mie: Array<AzionePrivata | null> = [];
    tel.on('azione:mia', (a) => mie.push(a));

    lento = true;
    expect(await emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_bruno', testo: 'Prego ad alta voce.', versione_vista: 3 }, cb))).toEqual({ ok: true });
    const narrazione = attendi<StatoMaster>(master, 'master:stato', (s) => s.narrazione_in_corso && s.tavolo.turno === s.tavolo.finestra.turno);
    expect(await comanda(master, { tipo: 'chiudi_finestra' })).toEqual({ ok: true });
    await narrazione;
    const attesaFerma = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'pausa');
    expect(await comanda(master, { tipo: 'ferma_narrazione' })).toEqual({ ok: true });
    lento = false;
    const ferma = await attesaFerma;
    expect(ferma.narrazione_in_corso).toBe(false);
    expect(interrotto).toBeGreaterThan(0);
    expect(ferma.tavolo.trascrizione.at(-1)).toMatchObject({ tipo: 'sistema', testo: 'Il master ha interrotto la narrazione.' });
    expect(mie.at(-1)).toMatchObject({ stato: 'superata', motivo: testo('regia.motivi.narrazione_interrotta'), testo: 'Prego ad alta voce.' });
    expect(await comanda(master, { tipo: 'ferma_narrazione' })).toMatchObject({ ok: false });
    // Nessuna narrazione «fantasma» riapre la finestra da sola.
    await new Promise((r) => setTimeout(r, 300));
    expect(server.regia.stato().fase).toBe('pausa');

    // Orologio avanti e indietro, con i limiti.
    expect(await comanda(master, { tipo: 'orologio', id: 'o_temporale', passo: -1 })).toMatchObject({ ok: false });
    const attesaAvanti = attendi<StatoMaster>(master, 'master:stato', (s) => s.orologi[0]!.pieni === 1);
    expect(await comanda(master, { tipo: 'orologio', id: 'o_temporale', passo: 1 })).toEqual({ ok: true });
    const avanti = await attesaAvanti;
    expect(avanti.orologi[0]).toMatchObject({ prossimo: 'La porta sbatte.' });
    expect(await comanda(master, { tipo: 'orologio', id: 'o_inesistente', passo: 1 })).toMatchObject({ ok: false });
    expect(await comanda(master, { tipo: 'orologio', id: 'o_temporale', passo: -1 })).toEqual({ ok: true });

    // Luogo: solo quelli della campagna.
    const attesaLuogo = attendi<StatoTavolo>(tel, 'stato', (s) => s.scena.luogo === 'n_ponte');
    expect(await comanda(master, { tipo: 'luogo', luogo: 'n_ponte' })).toEqual({ ok: true });
    await attesaLuogo;
    expect(await comanda(master, { tipo: 'luogo', luogo: 'n_inventato' })).toMatchObject({ ok: false });

    const riaperta = attendi<StatoMaster>(master, 'master:stato', (s) => s.tavolo.fase === 'finestra');
    expect(await comanda(master, { tipo: 'riprendi' })).toEqual({ ok: true });
    await riaperta;

    // Registro: ogni comando, riuscito o rifiutato, è una riga di logs/master.jsonl.
    const righe = fs.readFileSync(path.join(cartella, 'master.jsonl'), 'utf8').trim().split('\n').map((r) => JSON.parse(r) as { comando: string; ok: boolean });
    const comandi = righe.map((r) => `${r.comando}:${r.ok ? 'ok' : 'no'}`);
    expect(comandi).toContain('ferma_narrazione:ok');
    expect(comandi).toContain('ferma_narrazione:no');
    expect(comandi).toContain('nota:ok');
    expect(comandi).toContain('salta_azione:ok');
    expect(comandi).toContain('luogo:no');
    const ultimo = await emetti<EsitoEntrataMaster>((cb) => master.emit('master:entra', { token: TOKEN }, cb));
    expect(ultimo.ok && ultimo.stato.eventi.at(-1)).toMatchObject({ comando: 'riprendi', ok: true });
  });
});
