/**
 * Round trip of the phone dictation (docs/ascolto.md, «Measured»): the game's own local voice (Qwen3-TTS,
 * services/voce) says player-like sentences full of campaign names, each one is compressed like a phone does
 * (webm/opus, or mp4/aac), posted to /api/dettato of a TEST game server, and the answer is scored: names right before
 * and after the correction, corrections that were not wanted, latency. Ordinary sentences check the false positives.
 * A sentence marked `inventato` tests learning: the tool sends the action with the name written right (as a player who
 * fixes the box), then dictates the next sentence with the same name.
 *
 *   npx tsx strumenti/ascolto/giro.ts <frasi.yaml> --server http://127.0.0.1:4860 --voce http://127.0.0.1:4862
 *        [--token <master token of the test server>] [--formato webm|mp4|wav] [--out <file.json>]
 *
 * The test server must be a test instance (never 4610), started with the campaign of the sentences file, its master
 * token fixed (TAGM_MASTER_TOKEN) so the tool can switch scene, and a scripted narrator (TAGM_LLM=finto: no spending).
 * The voice service runs on a test port (VOCE_PORTA, never 4611). Sentences file:
 *
 *   campagna: <id>                       # campagne/<id>: the voice reads the names with its pronunciation lexicon
 *   pg: pg_x                             # the phone's PC
 *   scena: scena_y                       # optional: the master switches to it first (its NPCs become visible)
 *   voci: [narratore, ...]               # voices of the voice service, used in turn (different «players»)
 *   preambolo: ["..."]                   # typed actions sent first: the names in them are then said at the table
 *   frasi:
 *     - {testo: "...", nomi: [Name1, Name2]}
 *     - {testo: "...", nomi: [Newname], inventato: true}
 *   ordinarie: ["...", "..."]            # sentences without names: any correction there is a false one
 */
import '../../apps/server/src/variabili-legacy'; // old CANTASTORIE_* names → TAGM_*: must come before any env read
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { io as connetti, type Socket } from 'socket.io-client';
import type { EventiClientVersoServer, EventiServerVersoClient, StatoTavolo } from '@tabletop-ai-gm/shared';
import { caricaCampagna } from '../../apps/server/src/campagna/caricatore';
import { loggerMuto } from '../../apps/server/src/logger';
import { RADICE_REPO } from '../../apps/server/src/percorsi';
import { MotoreVoceHttp } from '../../apps/server/src/voce/http';
import { creaPronunciatore } from '../../apps/server/src/voce/pronuncia';
import { somiglianzaFonetica } from '../../apps/server/src/dettato/fonetica';
import { sintetizza, wav } from '../pronuncia/audio';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
interface Frase {
  testo: string;
  nomi?: string[];
  inventato?: boolean;
}
interface FileFrasi {
  campagna: string;
  pg: string;
  scena?: string;
  voci?: string[];
  /** Typed actions sent first (as players would), so the names in them are said at the table. */
  preambolo?: string[];
  frasi: Frase[];
  ordinarie?: string[];
}
interface Risposta {
  testo: string;
  correzioni: Array<{ sentito: string; scritto: string; motivo: string }>;
  secondi: number;
  provider: string;
  ms: { conversione: number; trascrizione: number; correzione: number; totale: number };
  silenzio?: boolean;
}

function argomento(nome: string, predefinito?: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i > 0 ? process.argv[i + 1] : predefinito;
}

const fileFrasi = process.argv[2];
if (!fileFrasi || fileFrasi.startsWith('--')) {
  console.error('use: npx tsx strumenti/ascolto/giro.ts <frasi.yaml> --server URL --voce URL [--token T] [--formato webm|mp4|wav] [--out FILE]');
  process.exit(2);
}
const server = argomento('server', 'http://127.0.0.1:4860')!;
const urlVoce = argomento('voce', 'http://127.0.0.1:4862')!;
const formato = argomento('formato', 'webm')!;
const token = argomento('token', process.env['TAGM_MASTER_TOKEN']);
for (const [nome, u] of [['server', server], ['voce', urlVoce]] as const) {
  const porta = new URL(u).port;
  if (porta === '4610' || porta === '4611') {
    console.error(`--${nome} on ${porta}: that port belongs to the real game`);
    process.exit(2);
  }
}
const dati = parse(fs.readFileSync(fileFrasi, 'utf8')) as FileFrasi;
const campagna = caricaCampagna(path.join(RADICE_REPO, 'campagne', dati.campagna), loggerMuto());
// The voice says the names as in the game: with the campaign's respellings for the local engine.
const pronuncia = creaPronunciatore(campagna, 'qwen');
const voce = new MotoreVoceHttp(urlVoce, loggerMuto());
const voci = dati.voci?.length ? dati.voci : ['narratore'];

const emetti = <T>(c: Client, fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((ok) => fn(ok));

/** Whole-word, case- and accent-sensitive: the name as the campaign writes it. */
const contiene = (testo: string, nome: string): boolean => new RegExp(`(?<![\\p{L}\\p{N}])${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(testo);

/** The transcript before the correction: the corrections undone. */
function grezzo(r: Risposta): string {
  let t = r.testo;
  for (const c of [...r.correzioni].reverse()) {
    const i = t.lastIndexOf(c.scritto);
    if (i >= 0) t = t.slice(0, i) + c.sentito + t.slice(i + c.scritto.length);
  }
  return t;
}

/** PCM WAV → what a phone would send (webm/opus at 32 kbit/s, mp4/aac, or the WAV itself). */
function comeTelefono(w: Buffer): { corpo: Buffer; tipo: string } {
  if (formato === 'wav') return { corpo: w, tipo: 'audio/wav' };
  const dir = fs.mkdtempSync(path.join(RADICE_REPO, 'logs', 'giro-'));
  try {
    const ingresso = path.join(dir, 'in.wav');
    const uscita = path.join(dir, formato === 'mp4' ? 'out.mp4' : 'out.webm');
    fs.writeFileSync(ingresso, w);
    const codec = formato === 'mp4' ? ['-c:a', 'aac', '-b:a', '48k'] : ['-c:a', 'libopus', '-b:a', '32k'];
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', ingresso, '-ac', '1', '-ar', '48000', ...codec, uscita]);
    if (r.status !== 0) throw new Error(`ffmpeg: ${String(r.stderr).slice(0, 200)}`);
    return { corpo: fs.readFileSync(uscita), tipo: formato === 'mp4' ? 'audio/mp4' : 'audio/webm;codecs=opus' };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

let contatore = 0;
async function detta(tel: Client, testo: string, nomeVoce: string): Promise<{ r: Risposta; msClient: number; msVoce: number; byte: number }> {
  const t0 = performance.now();
  const audio = await sintetizza(voce, nomeVoce, pronuncia(testo), `giro-${process.pid}-${(contatore += 1)}`, 120_000);
  const msVoce = Math.round(performance.now() - t0);
  const { corpo, tipo } = comeTelefono(wav(audio.pcm, audio.sampleRate));
  const t1 = performance.now();
  const risposta = await fetch(`${server}/api/dettato`, { method: 'POST', headers: { 'content-type': tipo, 'x-tagm-socket': tel.id!, 'x-tagm-pg': dati.pg }, body: new Uint8Array(corpo) });
  const r = (await risposta.json()) as Risposta & { errore?: string };
  if (!risposta.ok) throw new Error(`/api/dettato ${risposta.status}: ${r.errore}`);
  return { r, msClient: Math.round(performance.now() - t1), msVoce, byte: corpo.length };
}

async function principale(): Promise<void> {
  const tel: Client = connetti(server, { transports: ['websocket'], forceNew: true, reconnection: false });
  await new Promise<void>((ok, ko) => (tel.on('connect', () => ok()), tel.on('connect_error', ko)));
  const stato0 = await emetti<StatoTavolo>(tel, (cb) => tel.emit('telefono:entra', cb));
  const scelto = await emetti<{ ok: boolean }>(tel, (cb) => tel.emit('telefono:scegli_pg', { id_pg: dati.pg, dispositivo: `giro-ascolto-${process.pid}` }, cb));
  if (!scelto.ok) throw new Error(`PC ${dati.pg} not chosen`);
  // The game must be running for an action to be sent: the projector starts it, the master moves the scene.
  const finestra = (): Promise<StatoTavolo> => new Promise((ok) => {
    const f = (s: StatoTavolo): void => {
      if (s.fase === 'finestra') (tel.off('stato', f), ok(s));
    };
    tel.on('stato', f);
  });
  let stato = stato0;
  if (stato0.fase === 'attesa') {
    const schermo: Client = connetti(server, { transports: ['websocket'], forceNew: true, reconnection: false });
    await new Promise<void>((ok) => schermo.on('connect', () => ok()));
    schermo.on('audio:fine_turno', (f) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
    const aperta = finestra();
    await emetti(schermo, (cb) => schermo.emit('schermo:inizia', cb));
    stato = await aperta;
  }
  if (dati.scena && token) {
    const master: Client = connetti(server, { transports: ['websocket'], forceNew: true, reconnection: false });
    await new Promise<void>((ok) => master.on('connect', () => ok()));
    await emetti(master, (cb) => master.emit('master:entra', { token }, cb));
    const aperta = finestra();
    const e = await emetti<{ ok: boolean; errore?: string }>(master, (cb) => master.emit('master:comando', { tipo: 'scena', scena: dati.scena! }, cb));
    if (e.ok) stato = await aperta;
    else console.error(`scene not switched: ${e.errore}`);
    master.disconnect();
  }
  for (const testo of dati.preambolo ?? []) {
    const aperta = finestra();
    const e = await emetti<{ ok: boolean; errore?: string }>(tel, (cb) => tel.emit('azione:invia', { id_pg: dati.pg, testo, versione_vista: stato.versione_scena }, cb));
    if (!e.ok) throw new Error(`preamble not sent: ${e.errore}`);
    stato = await aperta;
    console.log(`typed first: «${testo}» (turn ${stato.turno})`);
  }
  const prompt = await (await fetch(`${server}/api/dettato`)).json();
  console.log(`server ${server} · dictation ${JSON.stringify(prompt)} · format ${formato} · voices ${voci.join(', ')}`);

  const righe: unknown[] = [];
  let giusti0 = 0;
  let giusti1 = 0;
  let totali = 0;
  let falsi = 0;
  const latenze: number[] = [];
  let i = 0;
  const appreso: string[] = [];
  for (const f of dati.frasi) {
    const nomeVoce = voci[i++ % voci.length]!;
    const { r, msClient, msVoce, byte } = await detta(tel, f.testo, nomeVoce);
    const prima = grezzo(r);
    const attesi = f.nomi ?? [];
    const g0 = attesi.filter((n) => contiene(prima, n)).length;
    const g1 = attesi.filter((n) => contiene(r.testo, n)).length;
    const indesiderate = r.correzioni.filter((c) => !attesi.some((n) => c.scritto === n || n.includes(c.scritto)));
    giusti0 += g0;
    giusti1 += g1;
    totali += attesi.length;
    falsi += indesiderate.length;
    latenze.push(msClient);
    righe.push({ voce: nomeVoce, detto: f.testo, grezzo: prima, corretto: r.testo, correzioni: r.correzioni, attesi, giusti_prima: g0, giusti_dopo: g1, indesiderate, secondi: r.secondi, byte, ms_client: msClient, ms_server: r.ms, ms_voce: msVoce });
    console.log(`\n[${nomeVoce}] said:   ${f.testo}\n  whisper: ${prima}\n  final:   ${r.testo}\n  names ${g0}/${attesi.length} → ${g1}/${attesi.length}${r.correzioni.length ? ` · fixes ${r.correzioni.map((c) => `${c.sentito}→${c.scritto}`).join(', ')}` : ''}${indesiderate.length ? ` · UNWANTED ${indesiderate.map((c) => `${c.sentito}→${c.scritto}`).join(', ')}` : ''} · ${r.secondi}s audio, ${msClient} ms (convert ${r.ms.conversione}, whisper ${r.ms.trascrizione}, fix ${r.ms.correzione})`);
    // A name nobody knew: the player writes it right in the box and sends; the server learns it.
    if (f.inventato) {
      // The player retypes the word that sounds most like the name (what a person fixing the box would do).
      let inviato = r.testo;
      for (const n of attesi) if (!contiene(inviato, n)) {
        const parole = [...inviato.matchAll(/[\p{L}\p{N}]+/gu)];
        const migliore = parole.map((m) => ({ m, s: somiglianzaFonetica(m[0], n, campagna.lingua ?? 'it') })).sort((x, y) => y.s - x.s)[0];
        if (migliore) inviato = inviato.slice(0, migliore.m.index) + n + inviato.slice(migliore.m.index + migliore.m[0].length);
      }
      const e = await emetti<{ ok: boolean; errore?: string }>(tel, (cb) => tel.emit('azione:invia', { id_pg: dati.pg, testo: inviato, versione_vista: stato.versione_scena, trascrizione: r.testo }, cb));
      appreso.push(...attesi);
      console.log(`  → the player fixes the box and sends «${inviato}» (${e.ok ? 'ok' : e.errore})`);
    }
  }
  const ordinarie: unknown[] = [];
  for (const t of dati.ordinarie ?? []) {
    const nomeVoce = voci[i++ % voci.length]!;
    const { r, msClient } = await detta(tel, t, nomeVoce);
    falsi += r.correzioni.length;
    latenze.push(msClient);
    ordinarie.push({ voce: nomeVoce, detto: t, grezzo: grezzo(r), corretto: r.testo, correzioni: r.correzioni, ms_client: msClient, secondi: r.secondi });
    console.log(`\n[${nomeVoce}] ordinary: ${t}\n  final:   ${r.testo}${r.correzioni.length ? `\n  UNWANTED ${r.correzioni.map((c) => `${c.sentito}→${c.scritto}`).join(', ')}` : ''} · ${msClient} ms`);
  }
  const ordinate = [...latenze].sort((a, b) => a - b);
  const sintesi = {
    quando: new Date().toISOString(),
    campagna: dati.campagna,
    formato,
    frasi: dati.frasi.length,
    ordinarie: dati.ordinarie?.length ?? 0,
    nomi_giusti_prima: `${giusti0}/${totali}`,
    nomi_giusti_dopo: `${giusti1}/${totali}`,
    correzioni_indesiderate: falsi,
    appresi: appreso,
    latenza_ms: { mediana: ordinate[Math.floor(ordinate.length / 2)], massima: ordinate.at(-1), media: Math.round(latenze.reduce((a, b) => a + b, 0) / Math.max(1, latenze.length)) },
  };
  console.log(`\n${JSON.stringify(sintesi, null, 2)}`);
  const out = argomento('out');
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ sintesi, frasi: righe, ordinarie }, null, 2));
    console.log(`written ${out}`);
  }
  tel.disconnect();
}

principale().then(
  () => process.exit(0),
  (err: unknown) => {
    console.error(err);
    process.exit(1);
  },
);
