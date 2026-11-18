/**
 * E2E of the projector's mark for a downed or dead NPC (docs/coerenza.md, A9): a real Chromium on the projector of a
 * game in progress (a harness run, or players at the table) waits until an NPC of the scene is out of play, then checks
 * that it is still in the row of characters, greyed and with its badge («A TERRA», «MORTO»), not gone. It joins as a
 * second projector (it presses only «Inizia sessione», which on a game already started just adds this screen), so it
 * can watch a blind run without changing what is said.
 *
 *   E2E_PORTA=<port of the game> E2E_ATTESA_FUORI_S=1500 npx playwright test -c apps/web/playwright.config.ts fila-fuori
 * Screenshot: logs/screenshots/fila-fuori.png. Without E2E_ATTESA_FUORI_S the test is skipped.
 */
import { expect, test } from '@playwright/test';
import { chromiumDisponibile, SCREENSHOT } from './percorsi';

const ATTESA_S = Number(process.env['E2E_ATTESA_FUORI_S'] ?? 0);

// A watch of half an hour: no trace nor video (a run's trace was 600 MB).
test.use({ trace: 'off', video: 'off', launchOptions: { executablePath: chromiumDisponibile(), args: ['--autoplay-policy=no-user-gesture-required'] } });

test('a downed or dead NPC stays in the projector row, marked', async ({ browser }) => {
  test.skip(!ATTESA_S, 'E2E_ATTESA_FUORI_S not set');
  test.setTimeout((ATTESA_S + 60) * 1000);
  const errori: string[] = [];
  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('pageerror', (e) => errori.push(e.message));
  schermo.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
  await schermo.goto('/schermo');
  // The scene shows only on a screen that unlocked its audio: join the game already in progress.
  await schermo.getByTestId('inizia-sessione').click({ timeout: 30_000 });
  const marcato = schermo.locator('[data-testid="fila-personaggi"] [data-testid^="personaggio-"][data-fuori]').first();
  await expect(marcato).toBeVisible({ timeout: ATTESA_S * 1000 });
  const id = (await marcato.getAttribute('data-testid'))!.replace(/^personaggio-/, '');
  const stato = await marcato.getAttribute('data-fuori');
  console.log(`marked: ${id} ${stato}`);
  expect(['a_terra', 'morto']).toContain(stato);
  await expect(schermo.getByTestId(`fuori-${id}`)).toBeVisible();
  await schermo.getByTestId('fila-personaggi').screenshot({ path: `${SCREENSHOT}/fila-fuori.png` });
  expect(errori).toEqual([]);
});
