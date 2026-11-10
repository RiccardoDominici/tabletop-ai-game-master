/**
 * E2E del combattimento (docs/combattimento.md) sul server vero con Haiku vero, sulla campagna di prova
 * con le schede (apps/server/test/fixtures/campagne/prove), SRD 5.2:
 *
 *   CANTASTORIE_PORTA=4720 CANTASTORIE_MASTER_TOKEN=prova_combattimento_4720 \
 *     CANTASTORIE_CARTELLA_CAMPAGNA=<copia di prove> scripts/avvio.sh
 *   E2E_PORTA=4720 npx playwright test -c playwright.config.ts e2e/combattimento.spec.ts
 *
 * Corrado tira a Ruggero: si entra in combattimento. Barra dell'iniziativa sul proiettore, «È il tuo
 * turno» sul telefono di chi tocca, due turni giocati da chi è di turno, poi il pannello del master.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { SCREENSHOT } from './percorsi';

const CARTELLA = path.join(SCREENSHOT, 'combattimento');
const TOKEN = process.env['E2E_MASTER_TOKEN'] ?? 'prova_combattimento_4720';

async function salute(p: Page): Promise<{ fase: string; turno: number }> {
  return (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number };
}
async function attendi(p: Page, cond: (s: { fase: string; turno: number }) => boolean, ms: number): Promise<void> {
  const fine = Date.now() + ms;
  while (!cond(await salute(p))) {
    if (Date.now() > fine) throw new Error('timeout');
    await p.waitForTimeout(250);
  }
}
async function telefono(browser: Browser, pg: string): Promise<Page> {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  await p.goto('/telefono');
  await p.getByTestId(`scelta-pg-${pg}`).click();
  await expect(p.getByTestId('nome-pg')).toBeVisible();
  return p;
}

test('combattimento SRD con Haiku vero: iniziativa, turni, PNG, pannello', async ({ browser }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(CARTELLA, { recursive: true });
  const errori: string[] = [];
  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('pageerror', (e) => errori.push(e.message));
  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');
  const tel = { pg_ida: await telefono(browser, 'pg_ida'), pg_corrado: await telefono(browser, 'pg_corrado') };
  await schermo.getByTestId('inizia-sessione').click();
  await attendi(schermo, (s) => s.fase === 'finestra' && s.turno === 1, 120_000);

  await tel.pg_corrado.getByTestId('testo-azione').fill('Tiro un dardo di balestra a Ruggero lo sgherro');
  await tel.pg_corrado.getByTestId('invia-azione').click();
  await tel.pg_ida.getByTestId('testo-azione').fill('Sguaino lo stocco e mi preparo a combattere');
  await tel.pg_ida.getByTestId('invia-azione').click();

  // Si entra in combattimento: la barra dell'iniziativa sul proiettore.
  await expect(schermo.getByTestId('barra-iniziativa')).toBeVisible({ timeout: 60_000 });
  await schermo.waitForTimeout(3000);
  await schermo.screenshot({ path: path.join(CARTELLA, 'e2e-proiettore-inizio.png') });

  // Due turni: chi ha «È il tuo turno» attacca Ruggero.
  for (let n = 2; n <= 3; n++) {
    await attendi(schermo, (s) => s.fase === 'finestra' && s.turno === n, 150_000);
    const diTurno = (await tel.pg_ida.getByTestId('tuo-turno').isVisible()) ? 'pg_ida' : (await tel.pg_corrado.getByTestId('tuo-turno').isVisible()) ? 'pg_corrado' : null;
    console.log(`TURNO ${n}: di turno ${diTurno}`);
    if (!diTurno) break; // lo scontro è finito
    const p = tel[diTurno];
    if (n === 2) await p.screenshot({ path: path.join(CARTELLA, 'e2e-telefono-tuo-turno.png') });
    await p.getByTestId('testo-azione').fill(diTurno === 'pg_ida' ? 'Colpisco Ruggero con lo stocco' : 'Colpisco Ruggero con la spada lunga');
    await p.getByTestId('invia-azione').click();
    await expect(schermo.getByTestId('tiri-schermo')).toBeVisible({ timeout: 60_000 });
    await schermo.waitForTimeout(3500);
    await schermo.screenshot({ path: path.join(CARTELLA, `e2e-proiettore-turno-${n}.png`) });
  }
  console.log('BARRA ' + ((await schermo.getByTestId('barra-iniziativa').textContent().catch(() => '')) ?? '').replace(/\s+/g, ' '));

  // Pannello del master: la sezione del combattimento.
  const master = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
  await master.goto(`/master?token=${TOKEN}`);
  await expect(master.getByTestId('master-combattimento')).toBeVisible({ timeout: 20_000 });
  await master.getByTestId('master-combattimento').scrollIntoViewIfNeeded();
  await master.screenshot({ path: path.join(CARTELLA, 'e2e-master.png'), fullPage: true });
  expect(errori, errori.join('\n')).toEqual([]);
});
