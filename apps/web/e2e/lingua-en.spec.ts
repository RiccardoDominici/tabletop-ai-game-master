/**
 * E2E of an English game (docs/lingue.md): campaign en-mini (`lingua: en`), English interface, fake
 * narrator with an English script, fake voice. Start the server with:
 *   TAGM_PORTA=4710 TAGM_LLM=finto TAGM_LINGUA=en \
 *     TAGM_CARTELLA_CAMPAGNA=$PWD/apps/server/test/fixtures/campagne/en-mini \
 *     TAGM_COPIONE_FINTO=$PWD/apps/server/test/fixtures/copione-en.txt scripts/avvio.sh --mock
 * Projector, two phones (Mara, Tobin) and the master panel; three turns. The interface is English on
 * every page (banner, buttons, «Waiting for: …», «Resolve now»), the narration is English and the
 * narrator is «Narrator». Screenshots in logs/screenshots/lingua-en-*.png; no console errors.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { CARTELLA_LOG, SCREENSHOT } from './percorsi';

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

type Salute = { fase: string; turno: number; campagna: string; lingua?: string; lingua_contenuti?: string };
const salute = async (p: Page): Promise<Salute> => (await (await p.request.get('/api/salute')).json()) as Salute;

/** Master link from the last start in server.out (the token changes at every start). */
function linkMaster(): string {
  const out = fs.readFileSync(path.join(CARTELLA_LOG, 'server.out'), 'utf8');
  const riga = out.slice(out.lastIndexOf('=== avvio')).split('\n').filter((r) => r.includes('"PANNELLO MASTER"')).at(-1);
  if (!riga) throw new Error('PANNELLO MASTER line not found in server.out');
  return (JSON.parse(riga) as { master: string }).master;
}

async function telefono(browser: Browser, idPg: string, errori: string[]): Promise<Page> {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  p.on('console', (m) => m.type() === 'error' && errori.push(`[${idPg}] ${m.text()}`));
  p.on('pageerror', (e) => errori.push(`[${idPg}] ${e.message}`));
  await p.goto('/telefono');
  await p.getByTestId(`scelta-pg-${idPg}`).click();
  return p;
}

async function invia(p: Page, testo: string): Promise<void> {
  await p.getByTestId('testo-azione').fill(testo);
  await p.getByTestId('invia-azione').click();
}

test('English game: interface, narration and three turns in English', async ({ browser }) => {
  test.setTimeout(240_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const foto = (p: Page, nome: string) => p.screenshot({ path: path.join(SCREENSHOT, `lingua-en-${nome}.png`) });
  const errori: string[] = [];

  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('console', (m) => m.type() === 'error' && errori.push(`[screen] ${m.text()}`));
  const s0 = await salute(schermo);
  test.skip(s0.campagna !== 'en-mini' || s0.lingua !== 'en', 'start the English test server first (see the top of this file)');
  expect(s0.lingua_contenuti).toBe('en');
  if (s0.fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');
  await expect(schermo.getByTestId('inizia-sessione')).toContainText('Start session');
  await expect(schermo.locator('html')).toHaveAttribute('lang', 'en');
  const mara = await telefono(browser, 'pg_mara', errori);
  const tobin = await telefono(browser, 'pg_tobin', errori);
  const master = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  master.on('console', (m) => m.type() === 'error' && errori.push(`[master] ${m.text()}`));
  await master.goto(linkMaster());
  await schermo.getByTestId('inizia-sessione').click();

  // Window 1: English interface everywhere.
  await expect.poll(async () => (await salute(schermo)).turno, { timeout: 60_000 }).toBe(1);
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 10_000 }).toBe('finestra');
  await expect(mara.getByTestId('banner-stato')).toContainText('Your turn: what do you do?');
  await expect(mara.getByTestId('invia-azione')).toHaveText('Send');
  await expect(mara.getByTestId('ritira-azione')).toHaveText('Withdraw');
  await expect(schermo.getByTestId('schermo-aspettiamo')).toHaveText('Waiting for: Mara and Tobin');
  await expect(master.getByTestId('master-chiudi-finestra')).toHaveText('Resolve now');
  await expect(mara.getByTestId('trascrizione')).toContainText('Narrator');
  await expect(mara.getByTestId('trascrizione')).toContainText('Mr. Hale, the innkeeper');
  await foto(mara, 'telefono');
  await foto(schermo, 'proiettore');
  await foto(master, 'master');

  // Three turns: both send, the turn starts by itself; the narration is the English script.
  const azioni = [
    ['I walk to the counter and ask for a room.', 'I sit by the fire and listen.'],
    ['I look out of the window.', 'I check the door.'],
    ['I ask Hale who waters down the wine.', 'I watch Hale’s hands.'],
  ] as const;
  for (let n = 1; n <= 3; n++) {
    await expect.poll(async () => (await salute(schermo)).fase, { timeout: 60_000 }).toBe('finestra');
    await invia(mara, azioni[n - 1]![0]);
    await expect(schermo.getByTestId('schermo-aspettiamo')).toHaveText('Waiting for: Tobin');
    await invia(tobin, azioni[n - 1]![1]);
    await expect.poll(async () => (await salute(schermo)).turno, { timeout: 60_000 }).toBe(n + 1);
  }
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 60_000 }).toBe('finestra');
  await expect(mara.getByTestId('trascrizione')).toContainText('Pay first, travellers.');
  await expect(mara.getByTestId('trascrizione')).toContainText('Ask your question, then.');
  await expect(tobin.getByTestId('banner-stato')).toContainText('Your turn: what do you do?');
  await foto(tobin, 'telefono-turno-4');
  await foto(schermo, 'proiettore-turno-4');
  expect(errori, errori.join('\n')).toEqual([]);
});
