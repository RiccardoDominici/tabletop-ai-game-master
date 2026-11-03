/**
 * E2E dell'immagine di situazione dopo la rivelazione, col selettore Haiku VERO (modalità B):
 *   CANTASTORIE_PORTA=4710 CANTASTORIE_MODO=repertorio CANTASTORIE_ARBITRO=regole CANTASTORIE_IMMAGINI=<cartella con
 *   situazione_png_sebastiano_senza_cappuccio> scripts/avvio.sh --mock
 *   npx playwright test -c apps/web/playwright.config.ts situazione
 *
 * Un PG accosta la candela alla grata: se il selettore fa uscire la rivelazione della cicatrice
 * (nar_volto_candela, indizio i_cicatrice), a fine narrazione il proiettore passa all'immagine di
 * Sebastiano senza cappuccio; alla narrazione successiva torna il luogo. Se il modello sceglie
 * un'altra strada, la prova lo dice e verifica il percorso del master (pulsante della situazione).
 * Costo: due turni di Haiku. Screenshot in logs/screenshots/situazione-*.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { CARTELLA_LOG } from './percorsi';

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
const SCREENSHOT = path.join(RADICE, 'logs', 'screenshots');
const SITUAZIONE = 'situazione_png_sebastiano_senza_cappuccio';
const salute = async (p: Page) => (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number; modo: string; narratore: string };

function linkMaster(): string {
  const out = fs.readFileSync(path.join(CARTELLA_LOG, 'server.out'), 'utf8');
  const riga = out.slice(out.lastIndexOf('=== avvio')).split('\n').filter((r) => r.includes('"PANNELLO MASTER"')).at(-1);
  if (!riga) throw new Error('riga PANNELLO MASTER non trovata in logs/server.out');
  return (JSON.parse(riga) as { master: string }).master.replace(/^http:\/\/localhost:\d+/, '');
}

/** Battute uscite nell'ultimo turno narrato (logs/narrazioni.jsonl). */
function battuteDelTurno(turno: number): string[] {
  const righe = fs.readFileSync(path.join(CARTELLA_LOG, 'narrazioni.jsonl'), 'utf8').trim().split('\n').map((r) => JSON.parse(r) as { tipo: string; turno: number; uscita?: Array<{ tipo: string; id?: string }> });
  const r = righe.filter((x) => x.tipo === 'turno' && x.turno === turno).at(-1);
  return (r?.uscita ?? []).filter((u) => u.tipo === 'usa').map((u) => u.id!);
}

test('situazione dopo la rivelazione: Sebastiano senza cappuccio', async ({ browser }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: string[] = [];
  const foto = (p: Page, nome: string) => p.screenshot({ path: path.join(SCREENSHOT, `situazione-${nome}.png`) });
  const osserva = (p: Page, nome: string) => {
    p.on('console', (m) => m.type() === 'error' && errori.push(`[${nome}] ${m.text()}`));
    p.on('pageerror', (e) => errori.push(`[${nome}] ${e.message}`));
  };

  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  osserva(schermo, 'schermo');
  const s0 = await salute(schermo);
  test.skip(s0.modo !== 'repertorio', 'serve la modalità repertorio');
  if (s0.fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.request.post('/api/scena/luogo', { data: { luogo: 'scena_forno_vecchio' } });
  await schermo.goto('/schermo');

  const master = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  osserva(master, 'master');
  await master.goto(linkMaster());
  await expect(master.getByTestId('pagina-master')).toHaveAttribute('data-entrata', 'dentro', { timeout: 10_000 });
  // Senza spoiler (default) la situazione è coperta: niente nome, miniatura né rivelazione.
  const riga = master.getByTestId(`master-situazione-${SITUAZIONE}`);
  await expect(riga).toHaveAttribute('data-coperta', 'true');
  await expect(riga).not.toContainText('Sebastiano');
  await expect(riga).not.toContainText('i_cicatrice');
  await expect(master.getByTestId('master-repertorio-conti')).toBeVisible(); // solo quante battute, per chi parla
  await expect(master.getByTestId('master-repertorio')).not.toContainText('nar_volto_candela');
  await foto(master, 'pannello-senza-spoiler');
  // Con l'interruttore si vede il collegamento trovato dal Motore.
  await master.getByTestId('master-spoiler').click();
  await expect(riga).toContainText('i_cicatrice');
  await expect(master.getByTestId('master-repertorio')).toContainText('nar_volto_candela');
  await master.getByTestId('master-spoiler').click();

  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  osserva(tel, 'telefono');
  await tel.goto('/telefono');
  await tel.getByTestId('scelta-pg-pg_corrado').click();
  await schermo.getByTestId('inizia-sessione').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 120_000 });
  await expect(schermo.getByTestId('sfondo-immagine')).toHaveAttribute('data-src', /luogo_scena_forno_vecchio/, { timeout: 15_000 });

  // Turno 1: la candela alla grata.
  await tel.getByTestId('testo-azione').fill('Accosto la candela alla grata per vedere in faccia il forestiero.');
  await tel.getByTestId('invia-azione').click();
  await tel.getByTestId('pronto').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'narrazione', { timeout: 15_000 });
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 150_000 });
  const uscite = battuteDelTurno(1);
  console.log(`battute uscite al turno 1: ${uscite.join(', ') || '(nessuna)'}`);
  const rivelata = uscite.includes('nar_volto_candela');
  if (rivelata) {
    // Il Motore mette la situazione sul proiettore a rivelazione ascoltata.
    await expect(schermo.getByTestId('sfondo-immagine')).toHaveAttribute('data-src', new RegExp(SITUAZIONE), { timeout: 10_000 });
    await expect(master.getByTestId(`master-situazione-${SITUAZIONE}`)).toHaveAttribute('data-in-onda', 'true');
    // In onda è pubblica: la riga si scopre anche senza spoiler.
    await expect(master.getByTestId(`master-situazione-${SITUAZIONE}`)).toHaveAttribute('data-coperta', 'false');
  } else {
    console.log('il selettore non ha usato nar_volto_candela: verifico il percorso del master');
    await master.getByTestId(`master-situazione-${SITUAZIONE}`).click();
    await expect(schermo.getByTestId('sfondo-immagine')).toHaveAttribute('data-src', new RegExp(SITUAZIONE), { timeout: 10_000 });
  }
  await schermo.waitForTimeout(1800); // fine della dissolvenza
  await foto(schermo, 'proiettore');
  await foto(master, 'pannello');

  // Turno 2: quando parte la narrazione successiva torna il luogo (se l'aveva messa il Motore).
  await tel.getByTestId('testo-azione').fill('Gli chiedo chi gli ha fatto quella ferita.');
  await tel.getByTestId('invia-azione').click();
  await tel.getByTestId('pronto').click();
  if (rivelata) {
    await expect(schermo.getByTestId('sfondo-immagine')).toHaveAttribute('data-src', /luogo_scena_forno_vecchio/, { timeout: 30_000 });
  } else {
    await master.getByTestId(`master-situazione-${SITUAZIONE}`).click();
    await expect(schermo.getByTestId('sfondo-immagine')).toHaveAttribute('data-src', /luogo_scena_forno_vecchio/, { timeout: 10_000 });
  }
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 150_000 });
  await foto(schermo, 'proiettore-dopo');
  expect(errori, errori.join('\n')).toEqual([]);
  for (const p of [schermo, master, tel]) await p.context().close();
});
