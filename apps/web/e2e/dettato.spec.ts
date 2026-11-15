/**
 * E2E of the phone dictation (docs/ascolto.md): a real Chromium whose fake microphone plays a WAV with a spoken
 * sentence, MediaRecorder (webm/opus), POST /api/dettato, the test server's real Whisper, the transcript in the action
 * box with the corrected names listed, and the action sent. Over http://<LAN IP>, which is not a secure context, the
 * microphone explains where the https address is instead.
 *
 * `ignoreHTTPSErrors` stands in for a phone that trusts the table's certificate (or a player who clicked through the
 * warning): it is a browser flag, not a real tap on a real phone.
 *
 *   scripts/ascolto-avvio.sh                                                   (whisper-server on 4614)
 *   TAGM_PORTA=4861 TAGM_CAMPAGNA=<campagna> TAGM_TIRI_GIOCATORI=automatico scripts/avvio.sh --finto --mock
 *   E2E_PORTA=4861 E2E_AUDIO_DETTATO=/path/sentence.wav E2E_NOMI_DETTATO=Name1,Name2 \
 *     npx playwright test -c apps/web/playwright.config.ts dettato
 *   TAGM_PORTA=4861 scripts/arresto.sh
 * Optional: E2E_SECONDI_DETTATO (how long the button is held, default 6). Screenshots: logs/screenshots/dettato-*.png.
 * Without E2E_AUDIO_DETTATO, or with dictation off on the server, the test is skipped.
 */
import { expect, test } from '@playwright/test';
import { chromiumDisponibile, SCREENSHOT, URL_PROVE } from './percorsi';

const AUDIO = process.env['E2E_AUDIO_DETTATO'] ?? '';
const NOMI = (process.env['E2E_NOMI_DETTATO'] ?? '').split(',').map((n) => n.trim()).filter(Boolean);
const SECONDI = Number(process.env['E2E_SECONDI_DETTATO'] ?? 6);
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

test('dictation: hold the microphone, the transcript lands in the box with the names right', async ({ browser, request }) => {
  test.skip(!AUDIO, 'E2E_AUDIO_DETTATO not set');
  const stato = await (await request.get('/api/dettato')).json();
  test.skip(stato.attivo !== true, 'dictation off on the test server');
  const errori: string[] = [];

  const schermo = await (await browser.newContext()).newPage();
  await schermo.goto('/schermo');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, permissions: ['microphone'] });
  const tel = await ctx.newPage();
  tel.on('pageerror', (e) => errori.push(e.message));
  tel.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
  await tel.goto(`${URL_HTTPS}/telefono`);
  expect(await tel.evaluate(() => window.isSecureContext)).toBe(true);
  await tel.locator('[data-testid^="scelta-pg-"]').first().click();
  // A test server that already started its scene has no start button any more.
  const inizia = schermo.getByTestId('inizia-sessione');
  await inizia.waitFor({ timeout: 5000 }).then(() => inizia.click()).catch(() => undefined);
  const microfono = tel.getByTestId('microfono');
  await expect(microfono).toBeEnabled({ timeout: 30_000 });
  await expect(tel.getByTestId('testo-azione')).toBeEnabled();

  // Hold to talk: press, keep it for the length of the sentence, release.
  const box = (await microfono.boundingBox())!;
  await tel.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await tel.mouse.down();
  await expect(tel.getByTestId('microfono-registra')).toBeVisible();
  await tel.waitForTimeout(SECONDI * 1000);
  await tel.screenshot({ path: `${SCREENSHOT}/dettato-registra.png` });
  await tel.mouse.up();
  await expect(tel.getByTestId('microfono-trascrivo')).toBeVisible();
  await expect.poll(() => tel.getByTestId('testo-azione').inputValue(), { timeout: 60_000 }).not.toBe('');
  const testo = await tel.getByTestId('testo-azione').inputValue();
  console.log(`transcript: ${testo}`);
  for (const n of NOMI) expect(testo).toContain(n);
  await tel.screenshot({ path: `${SCREENSHOT}/dettato-trascritto.png` });

  await tel.getByTestId('invia-azione').click();
  await expect(tel.getByTestId('testo-azione')).toHaveValue('', { timeout: 15_000 }).catch(() => undefined);
  expect(errori).toEqual([]);
});

test('dictation over plain http on the LAN address: the microphone explains https', async ({ browser, request }) => {
  const stato = await (await request.get('/api/dettato')).json();
  test.skip(stato.attivo !== true, 'dictation off on the test server');
  const info = await (await request.get('/api/info')).json();
  test.skip(!info.ip_lan || info.ip_lan === '127.0.0.1', 'no LAN address');
  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await tel.goto(`http://${info.ip_lan}:${info.porta}/telefono`);
  expect(await tel.evaluate(() => window.isSecureContext)).toBe(false);
  await tel.locator('[data-testid^="scelta-pg-"]').first().click();
  // The box shows its controls only during a scene: the explanation is there either way, in the DOM.
  const spiega = tel.getByTestId('microfono-non-sicuro');
  await expect(spiega).toHaveCount(1, { timeout: 15_000 });
  if (info.https) await expect(spiega.locator(`a[href="${info.url_telefono}"]`)).toHaveCount(1);
  await tel.screenshot({ path: `${SCREENSHOT}/dettato-http.png` });
});
