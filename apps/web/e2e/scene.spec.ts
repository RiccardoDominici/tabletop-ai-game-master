/**
 * E2E delle campagne con più scene (campagne/ponte-lanterne) dal pannello del master: server con
 *   TAGM_PORTA=4710 TAGM_CAMPAGNA=ponte-lanterne TAGM_MODO=repertorio TAGM_LLM=finto scripts/avvio.sh --mock
 *   npx playwright test -c apps/web/playwright.config.ts scene
 *
 * Il master passa dal ponte al Borgo Basso e poi alla Casa del Sale: il proiettore cambia titolo e
 * luogo, il narratore legge l'apertura della scena nuova, l'azione scritta per la scena di prima
 * torna al giocatore, orologi e battute del pannello sono quelli della scena. Screenshot in
 * logs/screenshots/scene-*.png; nessun errore in console.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { CARTELLA_LOG } from './percorsi';

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
const SCREENSHOT = path.join(RADICE, 'logs', 'screenshots');
const salute = async (p: Page) => (await (await p.request.get('/api/salute')).json()) as { fase: string; campagna: string };

function linkMaster(): string {
  const out = fs.readFileSync(path.join(CARTELLA_LOG, 'server.out'), 'utf8');
  const riga = out.slice(out.lastIndexOf('=== avvio')).split('\n').filter((r) => r.includes('"PANNELLO MASTER"')).at(-1);
  if (!riga) throw new Error('riga PANNELLO MASTER non trovata in logs/server.out');
  return (JSON.parse(riga) as { master: string }).master.replace(/^http:\/\/localhost:\d+/, '');
}

test('più scene: il master passa di scena, proiettore e telefoni seguono', async ({ browser }) => {
  test.setTimeout(240_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: string[] = [];
  const foto = (p: Page, nome: string) => p.screenshot({ path: path.join(SCREENSHOT, `scene-${nome}.png`) });
  const osserva = (p: Page, nome: string) => {
    p.on('console', (m) => m.type() === 'error' && errori.push(`[${nome}] ${m.text()}`));
    p.on('pageerror', (e) => errori.push(`[${nome}] ${e.message}`));
  };

  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  osserva(schermo, 'schermo');
  const s0 = await salute(schermo);
  test.skip(s0.campagna !== 'ponte-lanterne', 'server avviato con un’altra campagna');
  if (s0.fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');

  const master = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  osserva(master, 'master');
  await master.goto(linkMaster());
  await expect(master.getByTestId('pagina-master')).toHaveAttribute('data-entrata', 'dentro', { timeout: 10_000 });

  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  osserva(tel, 'telefono');
  await tel.goto('/telefono');
  await tel.getByTestId('scelta-pg-pg_dalia').click();
  await schermo.getByTestId('inizia-sessione').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 90_000 });
  await expect(schermo.getByTestId('titolo-scena')).toHaveText('Il Ponte delle Lanterne, al primo tocco');
  await foto(master, 'pannello-ponte');

  // Un'azione per il ponte, poi il master passa al Borgo Basso.
  await tel.getByTestId('testo-azione').fill('Giro la manovella della catena.');
  await tel.getByTestId('invia-azione').click();
  await expect(master.getByTestId('master-azioni')).toContainText('Giro la manovella');
  await master.getByTestId('master-scena-scena_borgo_basso').click();
  await expect(master.getByTestId('master-luogo-corrente')).toHaveAttribute('data-luogo', 'scena_borgo_basso');
  await expect(schermo.getByTestId('titolo-scena')).toHaveText("Il Borgo Basso sott'acqua");
  await expect(schermo.getByTestId('riga-finestra')).toHaveText(/Il narratore apre la scena|Il narratore sta parlando/, { timeout: 10_000 });
  await expect(schermo.getByTestId('sottotitolo')).not.toHaveText('', { timeout: 15_000 }); // legge l'apertura
  await foto(schermo, 'proiettore-borgo');
  await expect(tel.getByTestId('stato-mia-azione')).toHaveAttribute('data-stato', 'superata');
  await expect(tel.getByTestId('motivo-azione')).toContainText('Si cambia scena');
  await foto(tel, 'telefono-cambio');
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 90_000 });
  await expect(master.getByTestId('master-trascrizione')).toContainText('Nuova scena: Il Borgo Basso');
  await expect(master.getByTestId('master-orologio-o_piena')).toBeVisible();
  await foto(master, 'pannello-borgo');

  // Casa del Sale: orologio delle firme, battute della scena.
  await master.getByTestId('master-scena-scena_casa_del_sale').click();
  await expect(master.getByTestId('master-orologio-o_firme')).toBeVisible({ timeout: 10_000 });
  await expect(master.getByTestId('master-orologio-o_piena')).toHaveCount(0);
  await expect(schermo.getByTestId('titolo-scena')).toHaveText('La Casa del Sale, durante il consiglio');
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 90_000 });
  await foto(master, 'pannello-casa');
  await foto(schermo, 'proiettore-casa');

  expect(errori, errori.join('\n')).toEqual([]);
  for (const p of [schermo, master, tel]) await p.context().close();
});
