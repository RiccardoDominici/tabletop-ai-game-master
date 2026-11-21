/**
 * E2E of the experience points on the panel and of each phone's own gear (docs/prove.md §10, §12; rules-engine
 * package R3), on the invented cripta fixture with the scripted narrator:
 *
 *   cp -r apps/server/test/fixtures/campagne/cripta <tmp>/cripta
 *   TAGM_PORTA=4993 TAGM_MASTER_TOKEN=prova_px_4993 TAGM_CARTELLA_CAMPAGNA=<tmp>/cripta \
 *     TAGM_TIRI_GIOCATORI=automatico scripts/avvio.sh --finto --mock
 *   E2E_PORTA=4993 E2E_MASTER_TOKEN=prova_px_4993 npx playwright test -c playwright.config.ts e2e/esperienza.spec.ts
 *   TAGM_PORTA=4993 scripts/arresto.sh
 *
 * The panel shows each PC's XP, level and next threshold; coins found wait as treasure until «Tesoro al sicuro»; the
 * Game Master's award shares XP; each phone sees only its own character's purse and pack.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { RADICE } from './percorsi';

const CARTELLA = path.join(RADICE, 'esperimenti', 'risultati', 'regole-r3', 'playwright');
const TOKEN = process.env['E2E_MASTER_TOKEN'] ?? 'prova_px_4993';

async function salute(p: Page): Promise<{ fase: string; turno: number }> {
  return (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number };
}

async function telefono(browser: import('@playwright/test').Browser, pg: string, errori: string[]): Promise<Page> {
  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  tel.on('pageerror', (e) => errori.push(e.message));
  await tel.goto('/telefono');
  await tel.getByTestId(`scelta-pg-${pg}`).click();
  await expect(tel.getByTestId('nome-pg')).toBeVisible();
  await tel.getByTestId('apri-scheda').click();
  await expect(tel.getByTestId('scorta-pg')).toBeVisible();
  return tel;
}

test('panel: XP by level, treasure back to safety, an award; each phone sees only its own purse', async ({ browser }) => {
  test.setTimeout(180_000);
  fs.mkdirSync(CARTELLA, { recursive: true });
  const errori: string[] = [];
  const schermo = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');

  // A phone for each PC: Tessa (nothing yet), Gaia (a potion), Oreste.
  const tessa = await telefono(browser, 'pg_tessa', errori);
  const gaia = await telefono(browser, 'pg_gaia', errori);
  await telefono(browser, 'pg_oreste', errori);
  await expect(gaia.getByTestId('scorta-pg')).toContainText('Pozione di eroismo');
  await expect(tessa.getByTestId('scorta-pg')).not.toContainText('Pozione');

  const master = await (await browser.newContext({ viewport: { width: 1400, height: 1200 } })).newPage();
  master.on('pageerror', (e) => errori.push(e.message));
  await master.goto(`/master?token=${TOKEN}`);
  const px = master.getByTestId('master-esperienza');
  await expect(px).toBeVisible({ timeout: 20_000 });
  await px.scrollIntoViewIfNeeded();
  await expect(master.getByTestId('master-esperienza-pg_oreste')).toContainText('Oreste: 100 PX, livello 1');
  await expect(master.getByTestId('master-esperienza-pg_oreste')).toContainText('(il 2° a 150)');
  await master.screenshot({ path: path.join(CARTELLA, '01-pannello-px-prima.png'), fullPage: true });

  // Coins found by Tessa (the panel's coins control): treasure waiting to be brought back to safety.
  await master.getByTestId('master-scorta-pg_tessa-importo').fill('150');
  await master.getByTestId('master-scorta-pg_tessa-moneta').selectOption('mo');
  await master.getByTestId('master-scorta-pg_tessa-monete-applica').click();
  await expect(master.getByTestId('master-esperienza-tesoro')).toContainText('Tesoro da portare al sicuro: 150 mo');
  await expect(tessa.getByTestId('scorta-pg-monete')).toContainText('150');
  // Gaia's phone never gets Tessa's purse.
  await expect(gaia.getByTestId('scorta-pg')).not.toContainText('150');
  await master.getByTestId('master-esperienza-al-sicuro').click();
  // 150 XP shared by three: 50 each, the humans 55; Oreste 155 reaches the 2nd level (taken between sessions).
  await expect(master.getByTestId('master-esperienza-pg_oreste')).toContainText('Oreste: 155 PX, livello 1');
  await expect(master.getByTestId('master-esperienza-pg_oreste')).toContainText('sale di livello alla prossima sessione');
  await expect(master.getByTestId('master-esperienza-pg_tessa')).toContainText('Tessa: 50 PX');

  // The Game Master's award to one PC, with a reason.
  await master.getByTestId('master-esperienza-px').fill('30');
  await master.getByTestId('master-esperienza-pg').selectOption('pg_gaia');
  await master.getByTestId('master-esperienza-motivo').fill('il patto col mugnaio');
  await master.getByTestId('master-esperienza-assegna').click();
  await expect(master.getByTestId('master-esperienza-guadagni')).toContainText('PX per il patto col mugnaio: 30 in tutto (Gaia 33).');
  await expect(master.getByTestId('master-esperienza-guadagni')).toContainText('PX per tesoro portato al sicuro: 150 in tutto (Tessa 50, Oreste 55, Gaia 55).');
  await expect(master.getByTestId('master-esperienza-pg_gaia')).toContainText('Gaia: 88 PX');
  await px.scrollIntoViewIfNeeded();
  await master.screenshot({ path: path.join(CARTELLA, '02-pannello-px-dopo.png'), fullPage: true });
  await tessa.screenshot({ path: path.join(CARTELLA, '03-telefono-tessa.png') });
  await gaia.screenshot({ path: path.join(CARTELLA, '04-telefono-gaia.png') });
  expect(errori).toEqual([]);
});
