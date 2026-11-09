/**
 * Prova e2e della voce drama-3 su un'istanza di prova (MAI la 4610 né la 4611): qualche turno vero di
 * una campagna, con Haiku vero e drama-3 vero, registrato da un telefono con «Ascolta qui» acceso.
 *
 *   CANTASTORIE_PORTA=4730 npx tsx esperimenti/voce-drama3/gioca.ts [--turni 3] [--campagna nozze-neve] [--modo B]
 *
 * 1. Riavvia il server di prova (scripts/avvio.sh --fish: nessuna riserva Qwen).
 * 2. Proiettore virtuale, master headless, un telefono per PG del copione nozze-neve/indagine; uno dei
 *    telefoni accende «Ascolta qui» (telefono:ascolta) e registra la voce che riceve.
 * 3. Gioca i primi N turni del copione (azioni dei PG, poi «Risolvi ora»).
 * 4. Scrive in esperimenti/voce-drama3/partita/: le frasi (testo mostrato, voce, durata), un mp3 di
 *    40–60 s di gioco vero, la trascrizione Whisper dell'mp3 e il controllo che nessuna direzione sia
 *    stata letta; latenze e costi dai log del server.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { io as connetti, type Socket } from 'socket.io-client';
import { parse } from 'yaml';
import type { AudioFrase, Esito, EventiClientVersoServer, EventiServerVersoClient, InfoServer, StatoTavolo } from '@cantastorie/shared';
import { MasterHeadless } from '../../apps/server/src/esperimenti/master';
import { ProiettoreVirtuale } from '../../apps/server/src/esperimenti/proiettore';
import { nuovoToken } from '../../apps/server/src/master/token';

type Client = Socket<EventiServerVersoClient, EventiClientVersoServer>;
const RADICE = path.resolve(import.meta.dirname, '../..');
const QUI = import.meta.dirname;
const USCITA = path.join(QUI, 'partita');

function opzione(nome: string, predefinito: string): string {
  const i = process.argv.indexOf(nome);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : predefinito;
}
const PORTA = Number(process.env['CANTASTORIE_PORTA'] ?? '4730');
if ([4610, 4611, 4612].includes(PORTA)) throw new Error(`porta ${PORTA} vietata: è della partita vera`);
const TURNI = Number(opzione('--turni', '3'));
const CAMPAGNA = opzione('--campagna', 'nozze-neve');
const MODO = opzione('--modo', 'B') === 'A' ? 'improvvisa' : 'repertorio';
const URL = `http://127.0.0.1:${PORTA}`;
const LOG = path.join(RADICE, 'logs', `porta-${PORTA}`);

const emetti = <T>(fn: (cb: (x: T) => void) => void): Promise<T> => new Promise((r) => fn(r));
const apri = (): Client => connetti(URL, { transports: ['websocket'], forceNew: true });

function attendiStato(c: Client, cond: (s: StatoTavolo) => boolean, ms: number, cosa: string): Promise<StatoTavolo> {
  return new Promise((risolvi, rifiuta) => {
    const t = setTimeout(() => {
      c.off('stato', f);
      rifiuta(new Error(`timeout: ${cosa}`));
    }, ms);
    const f = (s: StatoTavolo): void => {
      if (!cond(s)) return;
      clearTimeout(t);
      c.off('stato', f);
      risolvi(s);
    };
    c.on('stato', f);
    c.emit('stato:richiedi', (s) => f(s));
  });
}

function leggiJsonl(file: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((r) => {
    try {
      return [JSON.parse(r) as Record<string, unknown>];
    } catch {
      return [];
    }
  });
}

/** Il telefono in ascolto: registra ogni frase (annuncio + PCM) nell'ordine in cui arriva. */
interface FraseRegistrata {
  meta: AudioFrase;
  pezzi: Buffer[];
  secondi: number;
}

async function principale(): Promise<void> {
  fs.mkdirSync(USCITA, { recursive: true });
  const copione = parse(fs.readFileSync(path.join(RADICE, 'esperimenti', 'copioni', CAMPAGNA, 'indagine.yaml'), 'utf8')) as {
    scena?: string;
    pg: string[];
    turni: Array<Array<{ pg?: string; azione?: string; scena?: string }>>;
  };
  const inizio = new Date().toISOString();

  // 1. Server di prova da zero, voce drama-3 senza riserva.
  const token = nuovoToken();
  console.log(`porta ${PORTA}: avvio del server di prova (${CAMPAGNA}, ${MODO}, voce fish)…`);
  const avvio = spawnSync(path.join(RADICE, 'scripts', 'avvio.sh'), ['--fish'], {
    env: { ...process.env, CANTASTORIE_PORTA: String(PORTA), CANTASTORIE_CAMPAGNA: CAMPAGNA, CANTASTORIE_MODO: MODO, CANTASTORIE_MASTER_TOKEN: token, CANTASTORIE_VOCE: 'fish' },
    encoding: 'utf8',
  });
  if (avvio.status !== 0) throw new Error(`avvio fallito:\n${avvio.stdout.replaceAll(token, '***')}\n${avvio.stderr.replaceAll(token, '***')}`);
  const salute = (await (await fetch(`${URL}/api/salute`)).json()) as Record<string, unknown>;
  console.log('server:', JSON.stringify(salute));
  if (salute['voce'] !== 'fish') throw new Error(`voce attesa fish, il server dice ${String(salute['voce'])}`);

  // 2. Client.
  const schermo = apri();
  const proiettore = new ProiettoreVirtuale(schermo);
  const frasiProiettore: string[] = [];
  schermo.on('audio:frase', (f) => frasiProiettore.push(f.id_frase));
  await emetti<{ stato: StatoTavolo; info: InfoServer }>((cb) => schermo.emit('schermo:osserva', cb));
  const master = await MasterHeadless.entra(apri(), token);
  const telefoni = new Map<string, Client>();
  for (const pg of copione.pg) {
    const t = apri();
    await emetti<StatoTavolo>((cb) => t.emit('telefono:entra', cb));
    const e = await emetti<Esito>((cb) => t.emit('telefono:scegli_pg', { id_pg: pg }, cb));
    if (!e.ok) throw new Error(`scelta di ${pg} rifiutata: ${e.errore}`);
    telefoni.set(pg, t);
  }
  // Il primo telefono accende «Ascolta qui» e registra.
  const ascolta = telefoni.get(copione.pg[0]!)!;
  const registrate = new Map<string, FraseRegistrata>();
  ascolta.on('audio:frase', (m) => registrate.set(m.id_frase, { meta: m, pezzi: [], secondi: 0 }));
  ascolta.on('audio:pezzo', (p) => {
    const f = registrate.get(p.id_frase);
    if (!f) return;
    const b = Buffer.from(p.pcm as ArrayBuffer);
    f.pezzi.push(b);
    f.secondi += b.length / 2 / f.meta.sample_rate;
  });
  const e = await emetti<Esito>((cb) => ascolta.emit('telefono:ascolta', { attivo: true }, cb));
  if (!e.ok) throw new Error('telefono:ascolta rifiutato');

  if (copione.scena && copione.scena !== master.scenaCorrente) await master.scena(copione.scena);
  const primo = attendiStato(schermo, (s) => s.fase === 'finestra' && s.turno === 1, 240_000, 'prima finestra');
  await emetti<Esito>((cb) => schermo.emit('schermo:inizia', cb));
  await primo;
  console.log('apertura letta, prima finestra aperta');

  // 3. Turni del copione.
  for (let n = 0; n < TURNI; n++) {
    const s = await attendiStato(schermo, (x) => x.fase === 'finestra' && x.finestra.aperta, 300_000, `finestra del turno ${n + 1}`);
    for (const a of copione.turni[n] ?? []) {
      if (!a.pg || !a.azione) continue;
      const t = telefoni.get(a.pg);
      if (!t) continue;
      const esito = await emetti<Esito>((cb) => t.emit('azione:invia', { id_pg: a.pg!, testo: a.azione!, versione_vista: s.versione_scena }, cb));
      console.log(`  ${a.pg}: ${esito.ok ? 'inviata' : `rifiutata (${esito.errore})`} «${a.azione.slice(0, 60)}»`);
    }
    const corrente = s.turno;
    const dopo = attendiStato(schermo, (x) => (x.turno > corrente && x.fase === 'finestra') || x.fase === 'pausa', 300_000, `fine del turno ${n + 1}`);
    await new Promise((r) => setTimeout(r, 500));
    const chiusa = await master.comando({ tipo: 'chiudi_finestra' });
    if (!chiusa.ok) console.log(`  (Risolvi ora: ${chiusa.errore})`);
    const fine = await dopo;
    console.log(`turno ${n + 1} narrato (server: turno ${fine.turno}, fase ${fine.fase})`);
    if (fine.fase === 'pausa') break;
  }
  // L'audio dell'ultimo turno finisce di arrivare.
  await new Promise((r) => setTimeout(r, 4000));
  schermo.disconnect();
  master.chiudi();
  for (const t of telefoni.values()) t.disconnect();

  // 4. Risultati.
  const frasi = [...registrate.values()];
  const server = leggiJsonl(path.join(LOG, 'server.jsonl')).filter((r) => String(r['time'] ?? '') >= inizio || Number(r['time']) >= Date.parse(inizio));
  const segmenti = server.filter((r) => r['msg'] === 'voce fish: segmento');
  const perId = new Map(segmenti.map((r) => [String(r['id']), r]));
  const elenco = frasi.map((f) => ({
    id: f.meta.id_frase,
    turno: f.meta.turno,
    parlante: f.meta.parlante,
    testo: f.meta.testo,
    secondi: Math.round(f.secondi * 100) / 100,
    direzioni: (perId.get(f.meta.id_frase)?.['direzioni'] as string[] | undefined) ?? [],
    primo_byte_ms: perId.get(f.meta.id_frase)?.['primo_byte_ms'] ?? null,
  }));
  fs.writeFileSync(path.join(USCITA, 'frasi.json'), JSON.stringify(elenco, null, 1) + '\n');

  // mp3 di 40–60 s: dal primo turno in poi (dialoghi), allargando all'indietro sull'apertura se serve.
  const conAudio = frasi.filter((f) => f.secondi > 0.3);
  const dalPrimo = conAudio.findIndex((f) => f.meta.turno >= 1);
  let scelte: FraseRegistrata[] = [];
  let tot = 0;
  for (const f of conAudio.slice(Math.max(dalPrimo, 0))) {
    if (tot + f.secondi > 60) break;
    scelte.push(f);
    tot += f.secondi + 0.35;
  }
  for (let i = Math.max(dalPrimo, 0) - 1; i >= 0 && tot < 40; i--) {
    scelte = [conAudio[i]!, ...scelte];
    tot += conAudio[i]!.secondi + 0.35;
  }
  const tmp = path.join(USCITA, 'pezzi');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const lista: string[] = [];
  scelte.forEach((f, i) => {
    const pcm = path.join(tmp, `${String(i).padStart(3, '0')}.pcm`);
    fs.writeFileSync(pcm, Buffer.concat(f.pezzi));
    const wav = pcm.replace('.pcm', '.wav');
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 's16le', '-ar', String(f.meta.sample_rate), '-ac', '1', '-i', pcm, '-af', 'apad=pad_dur=0.35', '-ar', '44100', wav]);
    lista.push(`file '${wav}'`);
  });
  fs.writeFileSync(path.join(tmp, 'lista.txt'), lista.join('\n') + '\n');
  const mp3 = path.join(USCITA, 'partita-drama3.mp3');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'lista.txt'), '-c:a', 'libmp3lame', '-b:a', '128k', mp3]);
  const durata = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3], { encoding: 'utf8' }).stdout.trim());
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(
    path.join(USCITA, 'mp3-frasi.json'),
    JSON.stringify(scelte.map((f) => ({ id: f.meta.id_frase, parlante: f.meta.parlante, testo: f.meta.testo, direzioni: (perId.get(f.meta.id_frase)?.['direzioni'] as string[] | undefined) ?? [] })), null, 1) + '\n',
  );

  // Costi e latenze della sessione (dai log dell'istanza di prova).
  const costi = leggiJsonl(path.join(LOG, 'costi.jsonl')).filter((r) => String(r['ts']) >= inizio);
  const somma = (f: (r: Record<string, unknown>) => boolean): number => costi.filter(f).reduce((a, r) => a + Number(r['costo_usd'] ?? 0), 0);
  const primiByte = segmenti.map((r) => Number(r['primo_byte_ms'])).sort((a, b) => a - b);
  const q = (p: number): number | null => (primiByte.length ? primiByte[Math.min(primiByte.length - 1, Math.floor(p * primiByte.length))]! : null);
  const turniNarrati = costi.filter((r) => r['tipo'] === 'turno').length;
  const riepilogo = {
    porta: PORTA,
    campagna: CAMPAGNA,
    modo: MODO,
    turni_narrati: turniNarrati,
    frasi_proiettore: frasiProiettore.length,
    frasi_telefono_in_ascolto: frasi.length,
    stesse_frasi: frasiProiettore.join() === frasi.map((f) => f.meta.id_frase).join(),
    segmenti_fish: segmenti.length,
    primo_byte_ms: { minimo: primiByte[0] ?? null, mediana: q(0.5), p90: q(0.9), massimo: primiByte.at(-1) ?? null },
    voce_usd: Math.round(somma((r) => r['tipo'] === 'voce') * 1e6) / 1e6,
    llm_usd: Math.round(somma((r) => r['tipo'] !== 'voce') * 1e6) / 1e6,
    voce_byte: costi.filter((r) => r['tipo'] === 'voce').reduce((a, r) => a + Number(r['byte_testo'] ?? 0), 0),
    secondi_voce: Math.round(frasi.reduce((a, f) => a + f.secondi, 0) * 10) / 10,
    errori_voce: server.filter((r) => Number(r['level']) >= 50 && String(r['msg']).startsWith('voce')).map((r) => r['msg']),
    markup_corretto: server.filter((r) => String(r['msg']).includes('markup espressivo corretto')).map((r) => r['dettaglio']),
    mp3: { file: path.relative(RADICE, mp3), secondi: Math.round(durata * 10) / 10, frasi: scelte.length },
    buchi_proiettore: proiettore.finiti.reduce((a, t) => a + t.buchi, 0),
  };
  fs.writeFileSync(path.join(USCITA, 'riepilogo.json'), JSON.stringify(riepilogo, null, 1) + '\n');
  console.log(JSON.stringify(riepilogo, null, 1));
  spawnSync(path.join(RADICE, 'scripts', 'arresto.sh'), ['--lascia-voce'], { env: { ...process.env, CANTASTORIE_PORTA: String(PORTA) }, encoding: 'utf8' });
  process.exit(0);
}

principale().catch((err: unknown) => {
  console.error(err);
  spawnSync(path.join(RADICE, 'scripts', 'arresto.sh'), ['--lascia-voce'], { env: { ...process.env, CANTASTORIE_PORTA: String(PORTA) }, encoding: 'utf8' });
  process.exit(1);
});
