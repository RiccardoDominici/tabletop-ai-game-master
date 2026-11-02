/**
 * E2E delle immagini sul proiettore: server avviato con le immagini di prova
 *   CANTASTORIE_LLM=finto CANTASTORIE_IMMAGINI=apps/server/test/fixtures/immagini scripts/avvio.sh --mock
 * Immagine del luogo a tutto schermo, ritratto del PNG accanto al sottotitolo, dissolvenza al
 * cambio di luogo, ritorno allo sfondo d'atmosfera se l'immagine manca. Screenshot 1920x1080 in
 * logs/screenshots/immagini-*.png; nessun errore in console.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
const SCREENSHOT = path.join(RADICE, 'logs', 'screenshots');

type Debug = { immagine: string | null; transizioni: number };
const debug = (p: Page) => p.evaluate(() => (window as unknown as { __schermoDebug: Debug }).__schermoDebug);
const salute = async (p: Page) => (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number };
const luogo = (p: Page, id: string) => p.request.post('/api/scena/luogo', { data: { luogo: id } });

test('proiettore: immagine del luogo, ritratto di chi parla, dissolvenza, ripiego', async ({ browser }) => {
  test.setTimeout(150_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: string[] = [];
  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
  schermo.on('pageerror', (e) => errori.push(e.message));
  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await luogo(schermo, 'scena_forno_vecchio');
  await schermo.goto('/schermo');
  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
  await tel.goto('/telefono');
  await tel.getByTestId('scelta-pg-pg_ginestra').click();
  await schermo.getByTestId('inizia-sessione').click();

  // Immagine del luogo a tutto schermo.
  await expect(schermo.getByTestId('sfondo-immagine')).toHaveAttribute('data-src', '/api/immagini/luogo_scena_forno_vecchio.jpg', { timeout: 15_000 });
  await expect(schermo.getByTestId('sottotitolo')).not.toHaveText('', { timeout: 30_000 });
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'immagini-luogo-narratore.png') });
  await expect(schermo.getByTestId('ritratto')).toHaveCount(0); // il narratore non ha ritratto

  // Turno 1: il narratore a copione fa parlare Ottavia → ritratto accanto al sottotitolo.
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 90_000 }).toBe('finestra');
  await tel.getByTestId('testo-azione').fill('saluto l’ostessa');
  await tel.getByTestId('invia-azione').click();
  await tel.getByTestId('pronto').click();
  await expect(schermo.getByTestId('ritratto')).toBeVisible({ timeout: 30_000 });
  await expect(schermo.getByTestId('ritratto')).toHaveAttribute('src', /ritratto_png_ottavia\.jpg/);
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'immagini-ritratto-png.png') });

  // Cambio di luogo → dissolvenza.
  const prima = (await debug(schermo)).transizioni;
  await luogo(schermo, 'n_piazza');
  await schermo.waitForTimeout(600);
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'immagini-dissolvenza.png') });
  await expect.poll(async () => (await debug(schermo)).transizioni, { timeout: 10_000 }).toBeGreaterThan(prima);
  await expect(schermo.getByTestId('sfondo-immagine')).toHaveAttribute('data-src', '/api/immagini/luogo_n_piazza.jpg');

  // Luogo senza immagine → sfondo d'atmosfera, nessuna immagine rotta.
  await luogo(schermo, 'n_mulino_valsecca');
  await expect.poll(async () => (await debug(schermo)).immagine, { timeout: 10_000 }).toBeNull();
  await schermo.waitForTimeout(2000);
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'immagini-ripiego.png') });

  await luogo(schermo, 'scena_forno_vecchio');
  expect(errori, errori.join('\n')).toEqual([]);
});
