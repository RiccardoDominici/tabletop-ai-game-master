/**
 * E2E of the Game Master's attitude command (docs/mondo.md §4, A25): on the panel's «Mondo» box the Game Master picks
 * an NPC, every PC and a state, presses «Imposta», and the attitude changed shows in the same box with cause `master`.
 *
 *   TAGM_PORTA=4961 TAGM_MASTER_TOKEN=<token> TAGM_LLM=finto TAGM_TIRI_GIOCATORI=automatico scripts/avvio.sh --mock
 *   E2E_PORTA=4961 E2E_MASTER_TOKEN=<token> npx playwright test -c apps/web/playwright.config.ts mondo-atteggiamento
 *   TAGM_PORTA=4961 scripts/arresto.sh
 * Without E2E_MASTER_TOKEN the test is skipped. Screenshot: logs/screenshots/mondo-atteggiamento.png.
 */
import { expect, test } from '@playwright/test';
import { SCREENSHOT } from './percorsi';

const TOKEN = process.env['E2E_MASTER_TOKEN'] ?? '';

test('the Game Master sets an NPC hostile to every PC from the «Mondo» box', async ({ browser }) => {
  test.skip(!TOKEN, 'E2E_MASTER_TOKEN not set');
  const errori: string[] = [];
  const master = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  master.on('pageerror', (e) => errori.push(e.message));
  master.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
  await master.goto(`/master?token=${TOKEN}`);
  const box = master.getByTestId('master-mondo-imposta');
  await expect(box).toBeVisible({ timeout: 20_000 });
  const png = await master.getByTestId('master-mondo-imposta-png').locator('option').first().getAttribute('value');
  await master.getByTestId('master-mondo-imposta-pg').selectOption('tutti');
  await master.getByTestId('master-mondo-imposta-stato').selectOption('ostile');
  await master.getByTestId('master-mondo-imposta-invia').click();
  const righe = master.locator(`[data-testid^="master-mondo-atteggiamento-${png}-"]`);
  await expect(righe.first()).toBeVisible({ timeout: 10_000 });
  await expect(righe.first()).toHaveAttribute('data-stato', 'ostile');
  await expect(righe.first()).toContainText('master');
  await master.getByTestId('master-mondo').screenshot({ path: `${SCREENSHOT}/mondo-atteggiamento.png` });
  expect(errori).toEqual([]);
});
