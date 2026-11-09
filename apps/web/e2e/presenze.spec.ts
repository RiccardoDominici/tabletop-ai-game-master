/**
 * E2E dei personaggi in scena (richiesta 2 del 9 novembre) su un’istanza di prova:
 *   CANTASTORIE_PORTA=4750 scripts/avvio.sh --finto --mock     (E2E_PORTA=4750 per la prova)
 * Proiettore: la fila dei ritratti dei PNG presenti, da 120 px in su, con il nome sotto; chi parla si
 * illumina. Telefono: «Qui con voi» (toccare mette «Nome, » nella casella vuota) e «Altrove» per chi
 * è già stato incontrato. Il master mette Ottavia altrove: sparisce dal proiettore e compare, attenuata,
 * nella lista «Altrove» del telefono. Screenshot in logs/screenshots/presenze-*.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { CARTELLA_LOG, SCREENSHOT } from './percorsi';

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

const salute = async (request: import('@playwright/test').APIRequestContext) =>
  (await (await request.get('/api/salute')).json()) as { fase: string; turno: number };

/** Link del pannello master dall'ultimo avvio in logs (il token cambia a ogni avvio). */
function linkMaster(): string {
  const out = fs.readFileSync(path.join(CARTELLA_LOG, 'server.out'), 'utf8');
  const ultimo = out.slice(out.lastIndexOf('=== avvio'));
  const riga = ultimo.split('\n').filter((r) => r.includes('"PANNELLO MASTER"')).at(-1);
  if (!riga) throw new Error('riga PANNELLO MASTER non trovata nel log');
  return (JSON.parse(riga) as { master: string }).master;
}

test('personaggi in scena: fila sul proiettore, «Qui con voi» e «Altrove» sul telefono, comando del master', async ({ browser }) => {
  test.setTimeout(240_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: string[] = [];
  const contestoSchermo = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const schermo = await contestoSchermo.newPage();
  schermo.on('pageerror', (e) => errori.push(e.message));

  const contestoTel = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const tel = await contestoTel.newPage();
  tel.on('pageerror', (e) => errori.push(e.message));

  if ((await salute(schermo.request)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.request.post('/api/scena/luogo', { data: { luogo: 'scena_forno_vecchio' } });
  await tel.goto('/telefono');
  await tel.getByTestId('scelta-pg-pg_ginestra').click();
  await schermo.goto('/schermo');
  await schermo.getByTestId('inizia-sessione').click();

  // Proiettore: la fila dei presenti (la scena ha Ottavia, Baldrin e Sebastiano), ritratti da 120 px in su.
  for (const id of ['png_ottavia', 'png_baldrin', 'png_sebastiano']) {
    const ritratto = schermo.getByTestId(`personaggio-${id}`).locator('img');
    await expect(ritratto).toHaveAttribute('src', new RegExp(`ritratto_${id}\\.jpg`), { timeout: 15_000 });
    const misura = await schermo.getByTestId(`personaggio-${id}`).locator('div').first().boundingBox();
    expect(misura?.width ?? 0).toBeGreaterThanOrEqual(120);
  }
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'presenze-schermo-prima.png') });

  // Telefono: «Qui con voi» coi presenti; un tocco mette «Ottavia, » nella casella vuota.
  await expect(tel.getByTestId('qui-con-voi-png_ottavia')).toBeVisible({ timeout: 15_000 });
  await tel.screenshot({ path: path.join(SCREENSHOT, 'presenze-telefono-prima.png') });
  await tel.getByTestId('qui-con-voi-png_ottavia').click();
  await expect(tel.getByTestId('testo-azione')).toHaveValue('Ottavia, ');

  // Turno 1: il narratore a copione fa parlare Ottavia → sul proiettore chi parla si illumina.
  await expect.poll(async () => (await salute(schermo.request)).fase, { timeout: 90_000 }).toBe('finestra');
  await tel.getByTestId('testo-azione').fill('Ottavia, saluto l’ostessa.');
  await tel.getByTestId('invia-azione').click();
  await expect(schermo.getByTestId('personaggio-png_ottavia')).toHaveAttribute('data-parla', 'true', { timeout: 60_000 });
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'presenze-schermo-parla.png') });

  // Il master mette Ottavia altrove: sparisce dal proiettore, sul telefono compare tra gli «Altrove».
  const master = await contestoSchermo.newPage();
  await master.goto(linkMaster());
  await master.getByTestId('master-presenza-altrove-png_ottavia').click({ timeout: 20_000 });
  await expect(schermo.getByTestId('personaggio-png_ottavia')).toHaveCount(0, { timeout: 15_000 });
  await expect(tel.getByTestId('altrove-png_ottavia')).toBeVisible({ timeout: 15_000 });
  await expect(tel.getByTestId('qui-con-voi-png_ottavia')).toHaveCount(0);
  await tel.screenshot({ path: path.join(SCREENSHOT, 'presenze-telefono-altrove.png') });
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'presenze-schermo-altrove.png') });

  expect(errori).toEqual([]);
});
