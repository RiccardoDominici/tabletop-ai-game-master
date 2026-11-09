/**
 * E2E di un set di regole non D&D (docs/regole.md) sul server vero, con Haiku vero: la campagna a
 * 2d6 (apps/server/test/fixtures/campagne/pbta) su un'istanza di prova.
 *
 *   CANTASTORIE_PORTA=4720 CANTASTORIE_CARTELLA_CAMPAGNA=<copia di pbta> scripts/avvio.sh
 *   E2E_PORTA=4720 npx playwright test -c playwright.config.ts e2e/regole.spec.ts
 *
 * Un turno: Ida convince Bertoldo (mossa Convincere), Corrado guada con la corda (prova della scena).
 * Carte con fasce e regola applicata; scheda «Regole» col riassunto e una domanda a «Chiedi una regola».
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { SCREENSHOT } from './percorsi';

const CARTELLA = path.join(SCREENSHOT, 'regole');

async function fase(page: Page): Promise<{ fase: string; turno: number }> {
  return (await (await page.request.get('/api/salute')).json()) as { fase: string; turno: number };
}
async function attendi(page: Page, cond: (s: { fase: string; turno: number }) => boolean, ms: number): Promise<void> {
  const fine = Date.now() + ms;
  while (!cond(await fase(page))) {
    if (Date.now() > fine) throw new Error('timeout');
    await page.waitForTimeout(200);
  }
}
async function telefono(browser: Browser, pg: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('/telefono');
  await p.getByTestId(`scelta-pg-${pg}`).click();
  await expect(p.getByTestId('nome-pg')).toBeVisible();
  return p;
}

test('set a 2d6: carte con le fasce, scheda «Regole» e una domanda', async ({ browser }) => {
  test.setTimeout(180_000);
  fs.mkdirSync(CARTELLA, { recursive: true });
  const errori: string[] = [];
  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('pageerror', (e) => errori.push(e.message));
  if ((await fase(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');
  const ida = await telefono(browser, 'pg_ida');
  const corrado = await telefono(browser, 'pg_corrado');
  await schermo.getByTestId('inizia-sessione').click();
  await attendi(schermo, (s) => s.fase === 'finestra' && s.turno === 1, 120_000);

  await ida.getByTestId('testo-azione').fill('Convinco Bertoldo a lasciarci passare senza pagare: gli prometto una canzone');
  await ida.getByTestId('invia-azione').click();
  await corrado.getByTestId('testo-azione').fill('Attraverso il fiume a guado, aggrappato alla corda');
  await corrado.getByTestId('invia-azione').click();

  const carte = schermo.getByTestId('tiri-schermo');
  await expect(carte.getByTestId('carta-tiro').first()).toBeVisible({ timeout: 30_000 });
  await schermo.waitForTimeout(3500);
  await schermo.screenshot({ path: path.join(CARTELLA, 'e2e-proiettore-2d6.png') });
  const testo = (await carte.textContent()) ?? '';
  console.log('CARTE ' + testo.replace(/\s+/g, ' '));
  expect(testo).toMatch(/2d6/);

  // Scheda «Regole» e una domanda, solo su questo telefono.
  await ida.getByTestId('apri-regole').click();
  await expect(ida.getByText('Mondo a 2d6').first()).toBeVisible({ timeout: 10_000 });
  await ida.getByTestId('domanda-regola').fill('Cosa succede se faccio 8 quando convinco qualcuno?');
  await ida.getByTestId('invia-domanda').click();
  await expect(ida.getByTestId('risposta-regola')).toBeVisible({ timeout: 30_000 });
  console.log('RISPOSTA ' + ((await ida.getByTestId('risposta-regola').textContent()) ?? '').replace(/\s+/g, ' '));
  await ida.screenshot({ path: path.join(CARTELLA, 'e2e-telefono-regole.png') });

  await attendi(schermo, (s) => s.fase === 'finestra' && s.turno === 2, 150_000);
  expect(errori, errori.join('\n')).toEqual([]);
});
