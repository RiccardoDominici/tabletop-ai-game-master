/**
 * E2E di «Ascolta qui» (telefono/ascolto.ts): un telefono accende la voce del gioco e riceve le
 * stesse frasi del proiettore; spento, non riceve più niente. Server di prova con narratore a
 * copione e voce finta (nessuna spesa):
 *   TAGM_PORTA=4730 TAGM_CAMPAGNA=prova-f0 TAGM_MOCK_SCALA=0.3 scripts/avvio.sh --finto --mock
 *   E2E_PORTA=4730 npx playwright test -c apps/web/playwright.config.ts ascolta
 * Screenshot in logs/screenshots/ascolta-*.png; nessun errore in console.
 */
import { expect, test, type Page } from '@playwright/test';
import { SCREENSHOT } from './percorsi';

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

type Debug = { frasi: number; pezzi: number; private: number; byte: number };
const contatori = (p: Page): Promise<Debug> => p.evaluate(() => (window as unknown as { __ascoltoDebug: Debug }).__ascoltoDebug);

test('Ascolta qui: la voce arriva anche al telefono, e si spegne', async ({ browser }) => {
  const errori: string[] = [];
  const schermo = await (await browser.newContext()).newPage();
  schermo.on('pageerror', (e) => errori.push(`[schermo] ${e.message}`));
  await schermo.goto('/schermo');

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const tel = await ctx.newPage();
  tel.on('console', (m) => m.type() === 'error' && errori.push(`[telefono] ${m.text()}`));
  tel.on('pageerror', (e) => errori.push(`[telefono] ${e.message}`));
  await tel.goto('/telefono');
  await tel.getByTestId('scelta-pg-pg_ginestra').click();

  const interruttore = tel.getByTestId('ascolta-qui');
  await expect(interruttore).toHaveAttribute('aria-checked', 'false');
  await expect(interruttore).toHaveAttribute('aria-label', /Ascolta qui/);
  await interruttore.click();
  await expect(interruttore).toHaveAttribute('aria-checked', 'true');
  await tel.screenshot({ path: `${SCREENSHOT}/ascolta-acceso.png` });

  // L'apertura della scena: le frasi arrivano al telefono in ascolto, con l'audio.
  await schermo.getByTestId('inizia-sessione').click();
  await expect.poll(async () => (await contatori(tel)).frasi, { timeout: 30_000 }).toBeGreaterThan(0);
  await expect.poll(async () => (await contatori(tel)).byte, { timeout: 30_000 }).toBeGreaterThan(10_000);
  await expect(interruttore).toHaveAttribute('aria-label', /^Ascolti qui/);
  await tel.screenshot({ path: `${SCREENSHOT}/ascolta-in-onda.png` });

  // Spento: il server lo toglie dalla stanza d'ascolto (le frasi successive non arrivano).
  await interruttore.click();
  await expect(interruttore).toHaveAttribute('aria-checked', 'false');
  await tel.waitForTimeout(1000); // ciò che era già in viaggio prima dello spegnimento
  const prima = (await contatori(tel)).frasi;
  // Un'azione e «Invia»: il narratore a copione risponde, ma il telefono spento non riceve la voce.
  await tel.getByTestId('testo-azione').fill('Guardo il forno vecchio da vicino.');
  await tel.getByTestId('invia-azione').click();
  await tel.waitForTimeout(8000);
  expect((await contatori(tel)).frasi).toBe(prima);
  expect(errori).toEqual([]);
});
