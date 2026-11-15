/**
 * E2E of dictation into the roll card (docs/prove.md §8, «Screens»): with manual rolls the phone shows the card of a
 * roll to make; the player holds the card's microphone and says the number («ho fatto quattordici»); the real Whisper
 * of the test server transcribes it, telefono/numeriDettati.ts fills the box, the player presses «Fatto», and the turn
 * goes on with that die. A real Chromium whose fake microphone plays a WAV.
 *
 *   cp -R apps/server/test/fixtures/campagne/prove <copy>
 *   scripts/ascolto-avvio.sh                                                   (whisper-server on 4614, if not running)
 *   TAGM_PORTA=4921 TAGM_CARTELLA_CAMPAGNA=<copy> TAGM_TIRI_GIOCATORI=manuale scripts/avvio.sh --finto --mock
 *   say -v Alice -o n.aiff "ho fatto quattordici" && afconvert -f WAVE -d LEI16@16000 -c 1 n.aiff n.wav
 *   E2E_PORTA=4921 E2E_AUDIO_DETTATO=$PWD/n.wav E2E_NUMERO_DETTATO=14 \
 *     npx playwright test -c apps/web/playwright.config.ts tiro-dettato
 *   TAGM_PORTA=4921 scripts/arresto.sh
 * Optional: E2E_SECONDI_DETTATO (how long the button is held, default 4). Screenshots: logs/screenshots/tiro-dettato-*.png.
 * Without E2E_AUDIO_DETTATO, or with dictation off on the server, the test is skipped.
 */
import { expect, test } from '@playwright/test';
import { chromiumDisponibile, SCREENSHOT, URL_PROVE } from './percorsi';

const AUDIO = process.env['E2E_AUDIO_DETTATO'] ?? '';
const NUMERO = process.env['E2E_NUMERO_DETTATO'] ?? '';
const SECONDI = Number(process.env['E2E_SECONDI_DETTATO'] ?? 4);
const URL_HTTPS = URL_PROVE.replace(/^http:/, 'https:');

test.use({
  ignoreHTTPSErrors: true,
  launchOptions: {
    executablePath: chromiumDisponibile(),
    args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', ...(AUDIO ? [`--use-file-for-fake-audio-capture=${AUDIO}`] : [])],
  },
});

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

test('dictation into the roll card: say the number, the box fills, «Fatto» sends that die', async ({ browser, request }) => {
  test.skip(!AUDIO || !NUMERO, 'E2E_AUDIO_DETTATO or E2E_NUMERO_DETTATO not set');
  const stato = await (await request.get('/api/dettato')).json();
  test.skip(stato.attivo !== true, 'dictation off on the test server');
  const errori: string[] = [];

  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await schermo.goto('/schermo');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, permissions: ['microphone'] });
  const tel = await ctx.newPage();
  tel.on('pageerror', (e) => errori.push(e.message));
  tel.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
  await tel.goto(`${URL_HTTPS}/telefono`);
  expect(await tel.evaluate(() => window.isSecureContext)).toBe(true);
  await tel.getByTestId('scelta-pg-pg_teo').click();
  const inizia = schermo.getByTestId('inizia-sessione');
  await inizia.waitFor({ timeout: 5000 }).then(() => inizia.click()).catch(() => undefined);
  await expect(tel.getByTestId('testo-azione')).toBeEnabled({ timeout: 30_000 });

  // Teo opens the toll box's padlock: the scene's check (Sleight of Hand), one d20 to roll at the table.
  await tel.getByTestId('testo-azione').fill('Apro piano il lucchetto della cassetta del pedaggio');
  await tel.getByTestId('invia-azione').click();
  const carta = tel.getByTestId('tiro-da-fare');
  await expect(carta).toBeVisible({ timeout: 30_000 });
  await expect(carta.getByTestId('tiro-dado-0')).toHaveValue('');

  // Hold the card's microphone for the length of the sentence, then release.
  const microfono = carta.getByTestId('microfono');
  await expect(microfono).toBeEnabled();
  const box = (await microfono.boundingBox())!;
  await tel.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await tel.mouse.down();
  await expect(tel.getByTestId('microfono-registra').first()).toBeVisible();
  await tel.waitForTimeout(SECONDI * 1000);
  await tel.mouse.up();
  await expect.poll(() => carta.getByTestId('tiro-dado-0').inputValue(), { timeout: 60_000 }).toBe(NUMERO);
  await tel.screenshot({ path: `${SCREENSHOT}/tiro-dettato-carta.png` });

  await carta.getByTestId('tiro-invia').click();
  await expect(carta).toHaveCount(0, { timeout: 15_000 });
  // The projector's card: the dice entered by dictation, never the DC.
  await expect(schermo.locator('[data-testid="carta-tiro"]').first()).toBeVisible({ timeout: 30_000 });
  await schermo.screenshot({ path: `${SCREENSHOT}/tiro-dettato-proiettore.png` });
  expect(errori).toEqual([]);
});
