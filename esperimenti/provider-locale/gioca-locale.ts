/**
 * Prova e2e TUTTO IN LOCALE (docs/provider.md) su un'istanza di prova (mai 4610/4611): lettore locale
 * (mlx-lm su 4613), voce Qwen locale su un servizio a parte (CANTASTORIE_VOCE_URL, mai il 4611), nessuna
 * chiave nell'ambiente né nei file. Qualche turno del copione di prova-f0, registrato da un telefono in ascolto.
 *
 *   CANTASTORIE_PORTA=4730 CANTASTORIE_VOCE_URL=http://127.0.0.1:4741 npx tsx esperimenti/provider-locale/gioca-locale.ts [--turni 3]
 * Risultati in esperimenti/provider-locale/partita/.
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
const VUOTA = path.join(QUI, 'partita', 'config-solo-predefinita');

function opzione(nome: string, predefinito: string): string {
  const i = process.argv.indexOf(nome);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : predefinito;
}
const PORTA = Number(process.env['CANTASTORIE_PORTA'] ?? '4730');
if ([4610, 4611, 4612].includes(PORTA)) throw new Error(`porta ${PORTA} vietata: è della partita vera`);
const TURNI = Number(opzione('--turni', '3'));
const CAMPAGNA = opzione('--campagna', 'prova-f0');
const MODO = opzione('--modo', 'B') === 'A' ? 'improvvisa' : 'repertorio';
/** --voce fish: drama-3 via OpenRouter (l'unica chiave ammessa, per separare il peso della voce sulla GPU). */
const VOCE_FISH = opzione('--voce', '') === 'fish';
const ETICHETTA = opzione('--etichetta', '');
/** --modello <id mlx>: un altro modello locale per il lettore (scritto in un locale.yaml di prova). */
const MODELLO = opzione('--modello', '');
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
  const copione = parse(fs.readFileSync(path.join(RADICE, 'esperimenti', 'copioni', CAMPAGNA === 'prova-f0' ? 'indagine.yaml' : `${CAMPAGNA}/indagine.yaml`), 'utf8')) as {
    scena?: string;
    pg: string[];
    turni: Array<Array<{ pg?: string; azione?: string; scena?: string }>>;
  };
  const inizio = new Date().toISOString();

  // 1. Server di prova da zero, voce drama-3 senza riserva.
  const token = nuovoToken();
  // Nessuna chiave: niente variabili, file di ripiego inesistenti, solo config/predefinita.yaml (niente locale.yaml).
  fs.mkdirSync(VUOTA, { recursive: true });
  fs.copyFileSync(path.join(RADICE, 'config', 'predefinita.yaml'), path.join(VUOTA, 'predefinita.yaml'));
  fs.rmSync(path.join(VUOTA, 'locale.yaml'), { force: true });
  if (MODELLO) fs.writeFileSync(path.join(VUOTA, 'locale.yaml'), `backend:\n  locale:\n    modello: ${MODELLO}\n`);
  const env: NodeJS.ProcessEnv = { ...process.env, CANTASTORIE_PORTA: String(PORTA), CANTASTORIE_CAMPAGNA: CAMPAGNA, CANTASTORIE_MODO: MODO, CANTASTORIE_MASTER_TOKEN: token, CANTASTORIE_CONFIG: VUOTA, ANTHROPIC_KEY_FILE: '/nessun/file', CANTASTORIE_CHIAVE_OPENROUTER: '/nessun/file' };
  for (const k of ['ANTHROPIC_API_KEY', 'OPENROUTER_API_KEY', 'CANTASTORIE_VOCE', 'CANTASTORIE_TTS', 'CANTASTORIE_LLM']) delete env[k];
  if (VOCE_FISH) {
    // Solo la voce in rete: la chiave OpenRouter dal suo file; il resto resta locale e senza chiavi.
    env['CANTASTORIE_VOCE'] = 'fish';
    delete env['CANTASTORIE_CHIAVE_OPENROUTER'];
    delete env['CANTASTORIE_VOCE_URL'];
  }
  console.log(`porta ${PORTA}: avvio del server di prova (${CAMPAGNA}, ${MODO}, tutto in locale, voce ${env['CANTASTORIE_VOCE_URL'] ?? 'finta'})…`);
  const avvio = spawnSync(path.join(RADICE, 'scripts', 'avvio.sh'), [], { env, encoding: 'utf8' });
  if (avvio.status !== 0) throw new Error(`avvio fallito:\n${avvio.stdout.replaceAll(token, '***')}\n${avvio.stderr.replaceAll(token, '***')}`);
  const salute = (await (await fetch(`${URL}/api/salute`)).json()) as Record<string, unknown>;
  console.log('server:', JSON.stringify(salute));
  console.log(avvio.stdout.split('\n').filter((r) => /voce:|lettore locale/.test(r)).join('\n'));

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
  // Tempi visti dal telefono in ascolto, dalla chiusura della finestra: ogni frase quando arriva il suo audio.
  let chiusaAlle = 0;
  const arrivi: Array<{ turno: number; ms: number; annuncio: boolean; testo: string }> = [];
  ascolta.on('audio:frase', (m) => {
    registrate.set(m.id_frase, { meta: m, pezzi: [], secondi: 0 });
    if (chiusaAlle && m.turno >= 1) arrivi.push({ turno: m.turno, ms: Date.now() - chiusaAlle, annuncio: /^[^:«]{1,40}: «/.test(m.testo), testo: m.testo.slice(0, 60) });
  });
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
    chiusaAlle = Date.now();
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
  const segmenti: Array<Record<string, unknown>> = [];
  const perId = new Map<string, Record<string, unknown>>();
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
    provider: server.filter((r) => String(r['msg']).startsWith('PROVIDER:')).map((r) => String(r['provider'])),
    lettore_minimo: server.filter((r) => r['msg'] === 'lettore minimo: scelte del turno').map((r) => ({ turno: r['turno'], scelte: r['scelte'], chiamate: r['chiamate'] })),
    strutturato_non_valido: server.filter((r) => /^llm: (risposta strutturata non valida|si usa il ripiego)/.test(String(r['msg']))).length,
    chiamate_api: server.filter((r) => /client Anthropic pronto/.test(String(r['msg']))).length,
    llm_ms: leggiJsonl(path.join(LOG, 'turni.jsonl')).filter((r) => String(r['ts']) >= inizio).map((r) => r['llm_fine'] ?? null),
    // Dal telefono in ascolto, per turno: primo audio sentito (di solito l'annuncio) e prima battuta scelta.
    sentito: [...new Set(arrivi.map((x) => x.turno))].map((turno) => {
      const mie = arrivi.filter((x) => x.turno === turno);
      return { turno, primo_audio_ms: mie[0]?.ms ?? null, prima_battuta_ms: mie.find((x) => !x.annuncio)?.ms ?? null, annunci_prima: mie.findIndex((x) => !x.annuncio) };
    }),
    // Per turno, in ms dalla chiusura della finestra: lettore (fine), voce (primo audio), proiettore (inizio, fine).
    turni: leggiJsonl(path.join(LOG, 'turni.jsonl'))
      .filter((r) => String(r['ts']) >= inizio)
      .map((r) => ({ turno: r['turno'], voce: r['voce_motore'], llm_fine: r['llm_fine'], voce_richiesta: r['voce_richiesta'], voce_primo_audio: r['voce_primo_audio'], schermo_inizio_audio: r['schermo_inizio_audio'], audio_fine: r['audio_fine'], buchi: r['buchi'] })),
    buchi_proiettore: proiettore.finiti.reduce((a, t) => a + t.buchi, 0),
  };
  fs.writeFileSync(path.join(USCITA, `riepilogo${ETICHETTA ? `-${ETICHETTA}` : ''}.json`), JSON.stringify(riepilogo, null, 1) + '\n');
  console.log(JSON.stringify(riepilogo, null, 1));
  spawnSync(path.join(RADICE, 'scripts', 'arresto.sh'), ['--lascia-voce'], { env: { ...process.env, CANTASTORIE_PORTA: String(PORTA) }, encoding: 'utf8' });
  process.exit(0);
}

principale().catch((err: unknown) => {
  console.error(err);
  spawnSync(path.join(RADICE, 'scripts', 'arresto.sh'), ['--lascia-voce'], { env: { ...process.env, CANTASTORIE_PORTA: String(PORTA) }, encoding: 'utf8' });
  process.exit(1);
});
