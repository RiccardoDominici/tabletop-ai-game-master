/**
 * E2E delle prove e dei dadi (docs/prove.md) sul server vero, con Haiku vero, sulla campagna di
 * prova con le schede (apps/server/test/fixtures/campagne/prove):
 *
 *   CANTASTORIE_PORTA=4720 CANTASTORIE_CARTELLA_CAMPAGNA=<copia della campagna> scripts/avvio.sh
 *   E2E_PORTA=4720 npx playwright test -c playwright.config.ts e2e/prove.spec.ts
 *
 * Proiettore + tre telefoni. Un turno con una Persuasione (Ida verso Bertoldo), un attacco di
 * balestra (Corrado a Ruggero) e un'azione PRIVATA (Teo apre il lucchetto): le carte pubbliche sul
 * proiettore e sui telefoni, quella privata solo sul telefono di Teo, i PF di ogni PG sotto il
 * nome. Screenshot in logs/screenshots/prove/ (proiettore 1920×1080, telefono 390×844).
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { SCREENSHOT } from './percorsi';

const CARTELLA = path.join(SCREENSHOT, 'prove');

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

interface Salute {
  fase: string;
  turno: number;
}

async function salute(page: Page): Promise<Salute> {
  return (await (await page.request.get('/api/salute')).json()) as Salute;
}

async function attendiFase(page: Page, cond: (s: Salute) => boolean, ms: number, cosa: string): Promise<void> {
  const fine = Date.now() + ms;
  for (;;) {
    const s = await salute(page);
    if (cond(s)) return;
    if (Date.now() > fine) throw new Error(`timeout: ${cosa} (${JSON.stringify(s)})`);
    await page.waitForTimeout(200);
  }
}

async function telefono(browser: Browser, pg: string, errori: string[]): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errori.push(`[${pg}] ${e.message}`));
  await p.goto('/telefono');
  await p.getByTestId(`scelta-pg-${pg}`).click();
  await expect(p.getByTestId('nome-pg')).toBeVisible();
  return p;
}

async function invia(p: Page, testo: string, privata = false): Promise<void> {
  await p.getByTestId('testo-azione').fill(testo);
  if (privata) await p.getByTestId('azione-privata').click();
  await p.getByTestId('invia-azione').click();
}

test('prove: Persuasione, attacco e azione privata con Haiku vero; carte sul proiettore e sui telefoni', async ({ browser }) => {
  test.setTimeout(240_000);
  fs.mkdirSync(CARTELLA, { recursive: true });
  const errori: string[] = [];
  const ctxSchermo = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const schermo = await ctxSchermo.newPage();
  schermo.on('pageerror', (e) => errori.push(`[schermo] ${e.message}`));
  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');

  const ida = await telefono(browser, 'pg_ida', errori);
  const corrado = await telefono(browser, 'pg_corrado', errori);
  const teo = await telefono(browser, 'pg_teo', errori);
  // I PF sotto il nome, prima di tutto.
  await expect(corrado.getByTestId('pf-pg')).toContainText('12');

  await schermo.getByTestId('inizia-sessione').click();
  await attendiFase(schermo, (s) => s.fase === 'finestra' && s.turno === 1, 120_000, 'prima finestra');

  await invia(teo, 'Mentre Bertoldo guarda Ida, apro di nascosto il lucchetto della cassetta del pedaggio', true);
  await invia(ida, 'Convinco Bertoldo a lasciarci passare senza pagare: gli prometto una canzone su di lui');
  await invia(corrado, 'Tiro un dardo di balestra a Ruggero lo sgherro');

  // Le carte arrivano con la chiusura del turno, prima della voce del narratore.
  const carte = schermo.getByTestId('tiri-schermo').getByTestId('carta-tiro');
  await expect(carte.first()).toBeVisible({ timeout: 30_000 });
  await schermo.waitForTimeout(600);
  await schermo.screenshot({ path: path.join(CARTELLA, 'e2e-proiettore-animazione.png') });
  await schermo.waitForTimeout(3000);
  await schermo.screenshot({ path: path.join(CARTELLA, 'e2e-proiettore-carte.png') });
  const testoCarte = (await schermo.getByTestId('tiri-schermo').textContent()) ?? '';
  console.log('CARTE PROIETTORE ' + testoCarte.replace(/\s+/g, ' '));
  // Sul proiettore la Persuasione di Ida e l'attacco di Corrado; mai la prova privata di Teo.
  expect(testoCarte).toMatch(/Ida/);
  expect(testoCarte).toMatch(/Corrado/);
  expect(testoCarte).not.toMatch(/Teo/);

  // Telefono di Teo: la sua carta privata nella sua azione; quello di Ida non la vede.
  await expect(teo.getByTestId('tiri-mia-azione')).toBeVisible({ timeout: 10_000 });
  await teo.screenshot({ path: path.join(CARTELLA, 'e2e-telefono-teo-privata.png') });
  await expect(ida.getByTestId('tiri-mia-azione')).toBeVisible();
  await ida.screenshot({ path: path.join(CARTELLA, 'e2e-telefono-ida.png') });
  expect((await ida.locator('body').textContent()) ?? '').not.toMatch(/Rapidità di mano/);
  await corrado.screenshot({ path: path.join(CARTELLA, 'e2e-telefono-corrado.png') });

  // Fine della narrazione: la finestra del turno 2.
  await attendiFase(schermo, (s) => s.fase === 'finestra' && s.turno === 2, 150_000, 'finestra del turno 2');
  await schermo.screenshot({ path: path.join(CARTELLA, 'e2e-proiettore-dopo.png') });
  await corrado.screenshot({ path: path.join(CARTELLA, 'e2e-telefono-corrado-dopo.png') });
  expect(errori, errori.join('\n')).toEqual([]);
});
