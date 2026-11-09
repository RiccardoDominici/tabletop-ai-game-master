/**
 * Turno senza scadenza, ritmo concitato e sorvegliante, col server intero (richieste di Riccardo del
 * 9 novembre, punti 1, 3, 5 e 7). Sostituisce le prove dello stallo, che non c'è più:
 * - ritmo calmo: nessuna chiusura senza azioni, nemmeno aspettando a lungo; inviare = pronto;
 * - `[ritmo] concitato` del narratore: la finestra dopo ha il conto alla rovescia e si chiude da
 *   sola con quello che c'è (senza azioni: mossa del mondo, con la guardia della finzione);
 *   `[ritmo] calmo` lo toglie;
 * - pausa solo del master: le azioni scritte in pausa aspettano Riprendi;
 * - sorvegliante: un narratore «appeso» (nessun token) non blocca il tavolo: dopo il silenzio
 *   massimo il gioco riparte, l'azione torna al giocatore, la causa finisce nel registro;
 * - errore del modello: riserva del narratore e si riparte (già prima, qui resta verificato).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { io as connetti, type Socket } from 'socket.io-client';
import type { AzionePrivata, Esito, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoTavolo } from '@cantastorie/shared';
import { costruisciServer } from '../src/avvio';
import { caricaConfig } from '../src/config';
import { loggerMuto } from '../src/logger';
import { COPIONE_BLOCCA, COPIONE_ERRORE, NarratoreFinto } from '../src/llm/finto';
import { fuoriDallaFinzione } from '../src/narrazione/finzione';
import { TITOLO_RITMO } from '../src/narrazione/ritmo';
import { MOTIVO_BLOCCO, TESTO_BLOCCO, TESTO_RISERVA_BLOCCO } from '../src/scena/regia';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');
const TOKEN = 'token_ritmo_turno_master_7';
const daChiudere: Array<() => Promise<void>> = [];
afterAll(async () => {
  for (const f of daChiudere) await f();
});
const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
function attendiStato(c: Client, cond: (s: StatoTavolo) => boolean, ms = 8000): Promise<StatoTavolo> {
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

/** Lo stallo della notte del 2 novembre: frasi sul tavolo invece che sul mondo. */
const FUORI_FINZIONE = '[narratore] Il silenzio sul ponte pesa, e nessuno dei PG ha ancora scelto.\n[png_oste] Nessuno parla? Allora il ponte decide per voi.\n[invito] tutti';
const NORMALE = '[narratore] La pioggia batte sui vetri. Anna, cosa fai?\n[invito] tutti';

async function avvia(copione: (turno: number) => string, env: Record<string, string> = {}, modo: 'improvvisa' | 'repertorio' = 'improvvisa') {
  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-ritmo-'));
  const config = caricaConfig({
    PORT: '0',
    HOST: '127.0.0.1',
    CANTASTORIE_LOG: cartella,
    CANTASTORIE_CARTELLA_CAMPAGNA: MINI,
    CANTASTORIE_PROMPT_NARRATORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_PROMPT_SELETTORE: path.join(import.meta.dirname, 'fixtures', 'prompt-prova.md'),
    CANTASTORIE_CACHE_AUDIO: path.join(cartella, 'cache'),
    CANTASTORIE_MODO: modo,
    CANTASTORIE_TTS: 'mock',
    CANTASTORIE_MOCK_SCALA: '0.02',
    CANTASTORIE_ASSESTAMENTO_MS: '30',
    CANTASTORIE_CONCITATO_MS: '400',
    CANTASTORIE_SESSIONI: 'off',
    CANTASTORIE_MASTER_TOKEN: TOKEN,
    ...env,
  } as NodeJS.ProcessEnv);
  const messaggi: string[] = [];
  const narratore = new NarratoreFinto({ idPng: ['png_oste'], idPg: ['pg_anna'], primoTokenMs: 5, msPerPezzo: 1, copione });
  const narra = narratore.narra.bind(narratore);
  narratore.narra = (r, cb) => {
    messaggi.push(r.messaggio);
    return narra(r, cb);
  };
  const server = await costruisciServer(config, loggerMuto(), { narratore, arbitro: null });
  await server.avvia();
  const url = `http://127.0.0.1:${(server.app.http.server.address() as { port: number }).port}`;
  const client: Client[] = [];
  daChiudere.push(async () => {
    for (const c of client) c.disconnect();
    await server.chiudi();
    fs.rmSync(cartella, { recursive: true, force: true });
  });
  const nuovo = (): Client => {
    const c: Client = connetti(url, { transports: ['websocket'], forceNew: true });
    client.push(c);
    return c;
  };
  // Proiettore che avvisa la fine dell'audio, come quello vero; un telefono per Anna.
  const schermo = nuovo();
  await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
  schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
  const tel = nuovo();
  await emetti<StatoTavolo>((cb) => tel.emit('telefono:entra', cb));
  expect(await emetti<Esito>((cb) => tel.emit('telefono:scegli_pg', { id_pg: 'pg_anna' }, cb))).toEqual({ ok: true });
  const mie: AzionePrivata[] = [];
  tel.on('azione:mia', (a) => a && mie.push(a));
  const avvisi: string[] = [];
  tel.on('avviso', (a) => avvisi.push(a.testo));
  const master = nuovo();
  expect(await emetti<{ ok: boolean }>((cb) => master.emit('master:entra', { token: TOKEN }, cb))).toMatchObject({ ok: true });
  const primo = attendiStato(tel, (s) => s.fase === 'finestra' && s.turno === 1);
  await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
  const s1 = await primo;
  const leggiNarrazioni = () =>
    fs
      .readFileSync(path.join(cartella, 'narrazioni.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((r) => JSON.parse(r) as Record<string, unknown>);
  const invia = (testo: string, versione: number) => emetti<Esito>((cb) => tel.emit('azione:invia', { id_pg: 'pg_anna', testo, versione_vista: versione }, cb));
  return { tel, master, s1, messaggi, mie, avvisi, leggiNarrazioni, invia };
}

describe('guardia della finzione', () => {
  it('le frasi sul tavolo sono fuori dalla finzione, quelle di gioco no', () => {
    expect(fuoriDallaFinzione('La Lenta lambisce il parapetto, e nessuno dei PG ha ancora parlato.')).toBe('PG');
    expect(fuoriDallaFinzione('Nessuno parla? Allora il ponte decide per voi.')).not.toBeNull();
    expect(fuoriDallaFinzione('I giocatori aspettano.')).toBe('giocatori');
    for (const buona of ['Tullio stringe la chiave della manovella.', 'Ottavia vi guarda: chi di voi ha fame?']) expect(fuoriDallaFinzione(buona)).toBeNull();
  });
});

describe('turno senza scadenza', () => {
  it('ritmo calmo: senza azioni il gioco aspetta (niente stallo); inviare basta a far partire il turno', async () => {
    const { tel, s1, messaggi, invia } = await avvia(() => NORMALE);
    expect(s1).toMatchObject({ ritmo: 'calmo', finestra: { chiusura_prevista_ms: null, aspettiamo: ['pg_anna'] } });
    await pausa(1200); // molto più dei vecchi 45 s «in scala»: nessuna mossa del mondo
    expect(messaggi).toHaveLength(0);
    const s = await emetti<StatoTavolo>((cb) => tel.emit('stato:richiedi', cb));
    expect(s).toMatchObject({ fase: 'finestra', turno: 1 });
    const dopo = attendiStato(tel, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(await invia('Bussiamo alla porta.', s1.versione_scena)).toEqual({ ok: true });
    await dopo;
    expect(messaggi).toHaveLength(1);
    expect(messaggi[0]).toContain('Bussiamo alla porta.');
    expect(messaggi[0]).not.toContain('Mossa del mondo');
  }, 20_000);

  it('[ritmo] concitato: conto alla rovescia nella finestra dopo, chiusura con quello che c’è; [ritmo] calmo lo toglie', async () => {
    const copione = (t: number) => (t === 1 ? '[narratore] Il ponte crolla! Correte!\n[ritmo] concitato\n[invito] tutti' : t === 2 ? FUORI_FINZIONE.replace('[invito]', '[ritmo] calmo\n[invito]') : NORMALE);
    const { tel, s1, messaggi, leggiNarrazioni, invia } = await avvia(copione);
    const concitata = attendiStato(tel, (x) => x.fase === 'finestra' && x.turno === 2);
    await invia('Attraverso il ponte.', s1.versione_scena);
    const s2 = await concitata;
    expect(s2.ritmo).toBe('concitato');
    expect(s2.finestra.chiusura_prevista_ms).toBeGreaterThan(Date.now() - 50);
    expect(s2.finestra.chiusura_prevista_ms).toBeLessThanOrEqual(Date.now() + 450);
    // Nessuno scrive: alla scadenza si risolve con quello che c'è (niente), il mondo fa una mossa.
    const s3 = await attendiStato(tel, (x) => x.fase === 'finestra' && x.turno === 3, 8000);
    expect(s3.ritmo).toBe('calmo');
    expect(s3.finestra.chiusura_prevista_ms).toBeNull();
    expect(messaggi[1]).toContain('## Mossa del mondo');
    // Finché vale il concitato il messaggio lo ricorda al narratore (e come tornare al calmo).
    expect(messaggi[0]).not.toContain(TITOLO_RITMO);
    expect(messaggi[1]).toContain(TITOLO_RITMO);
    expect(messaggi[1]).toContain('[ritmo] calmo');
    const turni = leggiNarrazioni().filter((x) => x['tipo'] === 'turno');
    expect(turni.map((x) => x['chiusura'])).toEqual(['tutti_inviato', 'scadenza']);
    // La guardia della finzione vale anche qui: le frasi sul tavolo non arrivano a nessuno.
    expect(s3.trascrizione.map((v) => v.testo).join('\n')).not.toMatch(/\bPG\b|decide per voi/);
  }, 20_000);

  it('pausa solo del master: in pausa si scrive e si aspetta; Riprendi fa partire il turno', async () => {
    const { tel, master, s1, messaggi, invia } = await avvia(() => NORMALE);
    expect(await emetti<Esito>((cb) => master.emit('master:comando', { tipo: 'pausa' }, cb))).toEqual({ ok: true });
    expect(await invia('Accendo la lanterna.', s1.versione_scena)).toEqual({ ok: true });
    await pausa(400);
    expect(messaggi).toHaveLength(0); // l'azione aspetta: la pausa la toglie solo il master
    const dopo = attendiStato(tel, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(await emetti<Esito>((cb) => master.emit('master:comando', { tipo: 'riprendi' }, cb))).toEqual({ ok: true });
    await dopo;
    expect(messaggi[0]).toContain('Accendo la lanterna.');
  }, 20_000);

  it('il master cambia il ritmo a finestra aperta («concitato» parte da adesso) e «Risolvi ora» chiude subito', async () => {
    const { tel, master, s1 } = await avvia(() => NORMALE);
    expect(await emetti<Esito>((cb) => master.emit('master:comando', { tipo: 'ritmo', ritmo: 'concitato' }, cb))).toEqual({ ok: true });
    const s = await emetti<StatoTavolo>((cb) => tel.emit('stato:richiedi', cb));
    expect(s.ritmo).toBe('concitato');
    expect(s.finestra.chiusura_prevista_ms).not.toBeNull();
    expect(await emetti<Esito>((cb) => master.emit('master:comando', { tipo: 'ritmo', ritmo: 'calmo' }, cb))).toEqual({ ok: true });
    const calmo = await emetti<StatoTavolo>((cb) => tel.emit('stato:richiedi', cb));
    expect(calmo.finestra.chiusura_prevista_ms).toBeNull();
    const dopo = attendiStato(tel, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(await emetti<Esito>((cb) => master.emit('master:comando', { tipo: 'chiudi_finestra' }, cb))).toEqual({ ok: true });
    await dopo;
    expect(s1.turno).toBe(1);
  }, 20_000);
});

describe('sorvegliante', () => {
  it('narratore appeso: dopo il silenzio massimo il gioco riparte, l’azione torna ad Anna, la causa nel registro', async () => {
    const { tel, s1, mie, avvisi, leggiNarrazioni, invia } = await avvia((t) => (t === 1 ? COPIONE_BLOCCA : NORMALE), { CANTASTORIE_SORVEGLIANTE_MS: '500' });
    const narrando = attendiStato(tel, (x) => x.fase === 'narrazione' && x.turno === 1);
    const ripresa = attendiStato(tel, (x) => x.fase === 'finestra' && x.turno === 2, 8000);
    await invia('Apro la botola.', s1.versione_scena);
    await narrando;
    const t0 = Date.now();
    const s2 = await ripresa;
    expect(Date.now() - t0).toBeGreaterThanOrEqual(400);
    const ultime = s2.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo);
    expect(ultime).toContain(TESTO_RISERVA_BLOCCO);
    expect(ultime).toContain(TESTO_BLOCCO);
    expect(avvisi).toContain(TESTO_BLOCCO);
    expect(mie.at(-1)).toMatchObject({ stato: 'superata', testo: 'Apro la botola.', motivo: MOTIVO_BLOCCO });
    const blocco = leggiNarrazioni().find((x) => x['tipo'] === 'sorvegliante');
    expect(blocco).toMatchObject({ turno: 1, fase: 'narrazione', causa: 'il modello non risponde' });
    // Il turno dopo funziona normalmente.
    const s3 = attendiStato(tel, (x) => x.fase === 'finestra' && x.turno === 3);
    await invia('Apro la botola, piano.', s2.versione_scena);
    await s3;
  }, 20_000);

  it('errore del modello: la riserva del narratore e si riparte da soli', async () => {
    const { tel, s1, avvisi, invia } = await avvia((t) => (t === 1 ? COPIONE_ERRORE : NORMALE));
    const dopo = attendiStato(tel, (x) => x.fase === 'finestra' && x.turno === 2);
    await invia('Grido aiuto.', s1.versione_scena);
    const s2 = await dopo;
    expect(avvisi.some((a) => a.includes('Il narratore non risponde'))).toBe(true);
    expect(s2.trascrizione.some((v) => v.turno === 1 && v.tipo === 'narrazione')).toBe(true);
  }, 20_000);
});
