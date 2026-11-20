/**
 * E2E of the gear, the coins, the load and the game clock on the panel and the phone (docs/prove.md §10–11; rules-engine
 * package R2), on the invented bottega fixture with the scripted narrator, plus R1's rest and hazard buttons:
 *
 *   cp -r apps/server/test/fixtures/campagne/bottega <tmp>/bottega
 *   TAGM_PORTA=4980 TAGM_MASTER_TOKEN=prova_scorta_4980 TAGM_CARTELLA_CAMPAGNA=<tmp>/bottega \
 *     TAGM_TIRI_GIOCATORI=automatico scripts/avvio.sh --finto --mock
 *   E2E_PORTA=4980 npx playwright test -c playwright.config.ts e2e/scorta.spec.ts
 *   TAGM_PORTA=4980 scripts/arresto.sh
 *
 * The phone's sheet must change without reopening it (the gear rides the table's state, not the one-off `pg:scheda`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { RADICE } from './percorsi';

const CARTELLA = path.join(RADICE, 'esperimenti', 'risultati', 'regole-r2', 'playwright');
const TOKEN = process.env['E2E_MASTER_TOKEN'] ?? 'prova_scorta_4980';

async function salute(p: Page): Promise<{ fase: string; turno: number }> {
  return (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number };
}

test('panel: rest, hazard, a purchase that loads, an armor swap, a torch, time passing; the phone follows', async ({ browser }) => {
  test.setTimeout(180_000);
  fs.mkdirSync(CARTELLA, { recursive: true });
  const errori: string[] = [];
  const schermo = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');

  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  tel.on('pageerror', (e) => errori.push(e.message));
  await tel.goto('/telefono');
  await tel.getByTestId('scelta-pg-pg_aldo').click();
  await expect(tel.getByTestId('nome-pg')).toBeVisible();
  await tel.getByTestId('apri-scheda').click();
  await expect(tel.getByTestId('scorta-pg-difesa')).toContainText("Classe d'Armatura 16");
  await expect(tel.getByTestId('scorta-pg-carico')).toContainText('Carico leggero');
  await tel.screenshot({ path: path.join(CARTELLA, '01-telefono-scheda.png') });

  const master = await (await browser.newContext({ viewport: { width: 1400, height: 1100 } })).newPage();
  master.on('pageerror', (e) => errori.push(e.message));
  await master.goto(`/master?token=${TOKEN}`);
  const sezione = master.getByTestId('master-combattimento');
  await expect(sezione).toBeVisible({ timeout: 20_000 });
  await sezione.scrollIntoViewIfNeeded();
  await expect(master.getByTestId('master-tempo-ora')).toContainText('giorno 1, 18:00');
  await expect(master.getByTestId('master-scorta-pg_aldo-difesa')).toContainText('16');
  await master.screenshot({ path: path.join(CARTELLA, '02-pannello-prima.png'), fullPage: true });

  // R1's hazard button: 2 damage to Aldo (9 → 7), then R1's rest button: a night heals 1 and takes eight hours.
  await master.getByTestId('master-scheda-pg_aldo-pericolo-valore').fill('2');
  await master.getByTestId('master-scheda-pg_aldo-pericolo-applica').click();
  await expect(master.getByTestId('master-scheda-pg_aldo-pf')).toContainText('7/9');
  await master.getByTestId('master-riposo-notte').click();
  await expect(master.getByTestId('master-scheda-pg_aldo-pf')).toContainText('8/9');
  await expect(master.getByTestId('master-tempo-ora')).toContainText('giorno 2, 02:00');

  // A purchase that loads him past the light limit: two ropes. The phone's sheet changes without reopening it.
  await master.getByTestId('master-scorta-pg_aldo-oggetto').selectOption('corda');
  await master.getByTestId('master-scorta-pg_aldo-azione').selectOption('compra');
  await master.getByTestId('master-scorta-pg_aldo-quante').fill('2');
  await master.getByTestId('master-scorta-pg_aldo-applica').click();
  await expect(master.getByTestId('master-scorta-pg_aldo-carico')).toContainText('Carico pesante');
  await expect(master.getByTestId('master-scorta-pg_aldo-monete')).toContainText('18 mo');
  await expect(tel.getByTestId('scorta-pg-carico')).toContainText('Carico pesante');
  await expect(tel.getByTestId('scorta-pg-carico')).toContainText('3 metri');

  // An armor swap: the chain mail comes off, the AC drops on both screens.
  await master.getByTestId('master-scorta-pg_aldo-oggetto').selectOption('maglia');
  await master.getByTestId('master-scorta-pg_aldo-azione').selectOption('togli');
  await master.getByTestId('master-scorta-pg_aldo-applica').click();
  await expect(master.getByTestId('master-scorta-pg_aldo-difesa')).toContainText('12');
  await expect(tel.getByTestId('scorta-pg-difesa')).toContainText("Classe d'Armatura 12");

  // A torch lit from the panel: the panel shows the time left, the phone only that it is lit.
  await master.getByTestId('master-scorta-pg_aldo-oggetto').selectOption('torcia');
  await master.getByTestId('master-scorta-pg_aldo-azione').selectOption('accendi');
  await master.getByTestId('master-scorta-pg_aldo-quante').fill('1');
  await master.getByTestId('master-scorta-pg_aldo-applica').click();
  await expect(master.getByTestId('master-tempo-luci')).toContainText('Torcia accesa');
  await expect(tel.getByTestId('scorta-pg-luci')).toContainText('Torcia accesa');
  await master.screenshot({ path: path.join(CARTELLA, '03-pannello-dopo.png'), fullPage: true });
  await tel.screenshot({ path: path.join(CARTELLA, '04-telefono-dopo.png') });

  // Time passes by the hour: the torch (3 to 6 turns) burns down within an hour.
  await master.getByTestId('master-tempo-avanza-ora').click();
  await expect(master.getByTestId('master-tempo-ora')).toContainText('giorno 2, 03:00');
  await expect(master.getByTestId('master-tempo-luci')).toHaveCount(0);
  await expect(tel.getByTestId('scorta-pg-luci')).toHaveCount(0);
  await master.screenshot({ path: path.join(CARTELLA, '05-pannello-ora-dopo.png'), fullPage: true });

  expect(errori).toEqual([]);
});
