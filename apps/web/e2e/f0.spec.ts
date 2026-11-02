/**
 * E2E di F0 sul server vero (avviato da scripts/avvio.sh): proiettore + due telefoni.
 *
 * Verifica: «Inizia sessione» sblocca l'audio; i telefoni scelgono il PG, scrivono, premono
 * «pronto»; la narrazione arriva come testo sui telefoni e come audio sul proiettore; lo
 * schermo segnala l'inizio reale della riproduzione; in logs/turni.jsonl c'è il record del turno
 * con tutti i campi del contratto. Nessun errore nella console dei browser. Screenshot in
 * logs/screenshots/ (telefono 390x844, proiettore 1920x1080).
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
const SCREENSHOT = path.join(RADICE, 'logs', 'screenshots');
const TURNI_JSONL = path.join(RADICE, 'logs', 'turni.jsonl');
const TURNI = Number(process.env.E2E_TURNI ?? 1);
const CAMPI = [
  'finestra_ms',
  'llm_primo_token',
  'llm_prima_frase',
  'voce_richiesta',
  'voce_primo_audio',
  'schermo_inizio_audio',
  'llm_fine',
  'audio_fine',
  'token_ingresso',
  'token_uscita',
  'token_cache_lettura',
  'token_cache_scrittura',
  'costo_usd',
] as const;

/** Azioni plausibili per la scena di prova, una per turno e per telefono. */
const AZIONI: Array<[string, string]> = [
  ['Mi avvicino al tavolo e scopro una cesta del pane per annusarlo.', 'Saluto il nano e gli chiedo chi c’è chiuso nel ripostiglio.'],
  ['Spezzo una pagnotta e guardo la mollica alla luce del forno.', 'Chiedo a Baldrin chi ha visto il forestiero al pozzo.'],
  ['Accarezzo il cane vicino al forno e guardo cosa c’è nella sua ciotola.', 'Mi metto alla grata e chiedo al forestiero da dove viene.'],
  ['Chiedo a Ottavia da chi ha comprato la segale quest’anno.', 'Chiedo a Baldrin di farmi vedere la borsa del forestiero.'],
  ['Annuso il sacchetto di polvere nera e lo tocco con un dito.', 'Guardo dalla finestra cosa succede in piazza.'],
  ['Dico a tutti che il pane potrebbe essere guasto.', 'Resto vicino alla porta del ripostiglio e ascolto.'],
];

interface Salute {
  fase: string;
  turno: number;
  voce: string;
  narratore: string;
}

type Errori = string[];

function registraErrori(page: Page, nome: string, errori: Errori): void {
  page.on('console', (m) => {
    if (m.type() === 'error') errori.push(`[${nome}] console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errori.push(`[${nome}] pageerror: ${e.message}`));
}

async function salute(page: Page): Promise<Salute> {
  const r = await page.request.get('/api/salute');
  return (await r.json()) as Salute;
}

async function attendiFase(page: Page, cond: (s: Salute) => boolean, ms: number, cosa: string): Promise<Salute> {
  const fine = Date.now() + ms;
  for (;;) {
    const s = await salute(page);
    if (cond(s)) return s;
    if (Date.now() > fine) throw new Error(`timeout in attesa di: ${cosa} (stato: ${JSON.stringify(s)})`);
    await page.waitForTimeout(250);
  }
}

async function nuovoTelefono(browser: Browser, nome: string, errori: Errori): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  registraErrori(page, nome, errori);
  await page.goto('/telefono');
  return page;
}

function leggiTurni(): Array<Record<string, unknown>> {
  if (!fs.existsSync(TURNI_JSONL)) return [];
  return fs.readFileSync(TURNI_JSONL, 'utf8').trim().split('\n').filter(Boolean).map((r) => JSON.parse(r) as Record<string, unknown>);
}

test('F0: proiettore + due telefoni, narrazione con voce e misure di latenza', async ({ browser }) => {
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: Errori = [];

  // --- Proiettore: prima di «Inizia sessione».
  const ctxSchermo = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const schermo = await ctxSchermo.newPage();
  registraErrori(schermo, 'schermo', errori);

  // Scena da capo: se un'altra prova l'ha lasciata a metà, si riparte dall'attesa.
  const prima = await salute(schermo);
  if (prima.fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');
  await expect(schermo.getByTestId('inizia-sessione')).toBeVisible();
  await expect(schermo.getByTestId('qr')).toBeVisible();
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'schermo-prima.png') });

  // --- Telefoni: scelgono il PG prima dell'avvio, così sono invitati all'apertura.
  const tel = [await nuovoTelefono(browser, 'telefono-1', errori), await nuovoTelefono(browser, 'telefono-2', errori)];
  await expect(tel[0]!.getByTestId('scelta-pg-pg_ginestra')).toBeVisible();
  await tel[0]!.screenshot({ path: path.join(SCREENSHOT, 'telefono-scelta.png') });
  await tel[0]!.getByTestId('scelta-pg-pg_ginestra').click();
  await tel[1]!.getByTestId('scelta-pg-pg_corrado').click();
  await expect(tel[0]!.getByTestId('nome-pg')).toHaveText(/Ginestra/);
  await expect(tel[1]!.getByTestId('nome-pg')).toHaveText(/Corrado/);

  // Scheda privata: solo sul telefono del suo PG.
  await tel[0]!.getByTestId('apri-scheda').click();
  await expect(tel[0]!.getByTestId('conoscenze-private')).toBeVisible();
  await tel[0]!.screenshot({ path: path.join(SCREENSHOT, 'telefono-scheda.png') });
  await tel[0]!.getByRole('button', { name: 'Chiudi' }).click();

  // --- «Inizia sessione»: apertura letta dal narratore, poi finestra per tutti.
  await schermo.getByTestId('inizia-sessione').click();
  const avvio = await attendiFase(schermo, (s) => s.fase === 'apertura' || s.fase === 'finestra', 10_000, 'apertura');
  console.log(`motori: voce=${avvio.voce} narratore=${avvio.narratore}`);
  await expect.poll(() => schermo.evaluate(() => (window as unknown as { __schermoDebug: { pezzi: number } }).__schermoDebug.pezzi), { timeout: 30_000 }).toBeGreaterThan(0);
  await expect(schermo.getByTestId('sottotitolo')).not.toHaveText('', { timeout: 30_000 });
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'schermo-apertura.png') });
  await attendiFase(schermo, (s) => s.fase === 'finestra' && s.turno === 1, 120_000, 'prima finestra');

  const righeIniziali = leggiTurni().length;

  for (let n = 1; n <= TURNI; n++) {
    await attendiFase(schermo, (s) => s.fase === 'finestra' && s.turno === n, 150_000, `finestra del turno ${n}`);
    // Chi è invitato scrive e preme «pronto»; chi non lo è aspetta. Il banner dice quale dei due.
    const scritti: string[] = [];
    for (let i = 0; i < tel.length; i++) {
      const p = tel[i]!;
      const banner = p.getByTestId('banner-stato');
      await expect(banner).toHaveText(/Tocca a te|non sei chiamato/, { timeout: 10_000 });
      if (!/Tocca a te/.test((await banner.textContent()) ?? '')) continue;
      const azione = AZIONI[(n - 1) % AZIONI.length]![i]!;
      await p.getByTestId('testo-azione').fill(azione);
      await p.getByTestId('invia-azione').click();
      await expect(p.getByTestId('stato-mia-azione')).toHaveText('in coda');
      scritti.push(azione);
    }
    expect(scritti.length, `turno ${n}: almeno un telefono invitato`).toBeGreaterThan(0);
    if (n === 1) await tel[0]!.screenshot({ path: path.join(SCREENSHOT, 'telefono-finestra.png') });
    for (const p of tel) {
      if (await p.getByTestId('pronto').isEnabled().catch(() => false)) await p.getByTestId('pronto').click();
    }

    // Narrazione: testo sui telefoni, audio sul proiettore, inizio della riproduzione segnalato.
    await attendiFase(schermo, (s) => s.fase === 'narrazione' || (s.fase === 'finestra' && s.turno > n), 20_000, `narrazione del turno ${n}`);
    await expect
      .poll(() => schermo.evaluate((t) => (window as unknown as { __schermoDebug: { turniIniziati: number[] } }).__schermoDebug.turniIniziati.includes(t), n), {
        timeout: 60_000,
        message: `lo schermo deve suonare il turno ${n}`,
      })
      .toBe(true);
    if (n === 1) {
      await expect(schermo.getByTestId('sottotitolo')).not.toHaveText('', { timeout: 20_000 });
      await schermo.screenshot({ path: path.join(SCREENSHOT, 'schermo-narrazione.png') });
      await tel[1]!.screenshot({ path: path.join(SCREENSHOT, 'telefono-narrazione.png') });
    }
    await expect
      .poll(() => schermo.evaluate((t) => (window as unknown as { __schermoDebug: { turniFiniti: number[] } }).__schermoDebug.turniFiniti.includes(t), n), {
        timeout: 150_000,
        message: `lo schermo deve finire di suonare il turno ${n}`,
      })
      .toBe(true);
    await attendiFase(schermo, (s) => s.fase === 'finestra' && s.turno === n + 1, 30_000, `finestra dopo il turno ${n}`);

    // La mia azione è risolta; la trascrizione contiene la narrazione del turno.
    for (const p of tel) {
      const chip = p.getByTestId('stato-mia-azione');
      if (await chip.isVisible().catch(() => false)) await expect(chip).toHaveText(/risolta|in coda/);
    }
    // Le azioni diventano pubbliche: le vedono tutti i telefoni.
    for (const p of tel) await expect(p.getByTestId('trascrizione')).toContainText(scritti[0]!.slice(0, 20));
  }

  // --- Misure: un record per turno con tutti i campi del contratto.
  const nuovi = leggiTurni().slice(righeIniziali);
  expect(nuovi.length).toBe(TURNI);
  for (const r of nuovi) {
    for (const c of CAMPI) {
      expect(typeof r[c], `turni.jsonl turno ${String(r['turno'])}: campo ${c}`).toBe('number');
    }
  }
  console.log('MISURE ' + JSON.stringify(nuovi));

  // HUD della latenza aperto sull'ultimo turno.
  await schermo.keyboard.press('l');
  await expect(schermo.getByTestId('hud')).toBeVisible();
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'schermo-hud.png') });
  await tel[0]!.screenshot({ path: path.join(SCREENSHOT, 'telefono-dopo.png') });

  expect(errori, errori.join('\n')).toEqual([]);
});
