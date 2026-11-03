/**
 * E2E della mossa contro lo stallo (timeout accorciato): server avviato con
 *   CANTASTORIE_PORTA=4710 CANTASTORIE_LLM=finto CANTASTORIE_STALLO_MS=3000 scripts/avvio.sh --mock
 * Proiettore + un telefono: si apre la finestra, nessuno fa niente; dopo 3 s il narratore muove
 * da solo, poi la finestra si riapre. Nessun errore in console.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { CARTELLA_LOG } from './percorsi';

// Ogni prova chiude i contesti che ha aperto col browser condiviso, anche se fallisce: un proiettore
// rimasto collegato farebbe ripartire la scena (e suonerebbe l'audio) nella prova successiva.
test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');

async function salute(p: Page): Promise<{ fase: string; turno: number; sessione: string }> {
  return (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number; sessione: string };
}

test('stallo: senza input la scena va avanti da sola e la finestra si riapre', async ({ browser }) => {
  test.setTimeout(120_000);
  const errori: string[] = [];
  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('console', (m) => m.type() === 'error' && errori.push(`[schermo] ${m.text()}`));
  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');
  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  tel.on('console', (m) => m.type() === 'error' && errori.push(`[telefono] ${m.text()}`));
  await tel.goto('/telefono');
  await tel.getByTestId('scelta-pg-pg_ginestra').click();
  await schermo.getByTestId('inizia-sessione').click();

  await expect.poll(async () => (await salute(schermo)).turno, { timeout: 60_000 }).toBe(1);
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 10_000 }).toBe('finestra');
  const apertaA = Date.now();
  // Nessun input: la finestra deve chiudersi da sola dopo ~3 s (stallo) e il narratore muovere.
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 15_000 }).toBe('narrazione');
  expect(Date.now() - apertaA).toBeGreaterThanOrEqual(2500);
  await expect(tel.getByTestId('banner-stato')).toContainText('Il narratore sta parlando');
  await expect.poll(async () => (await salute(schermo)).turno, { timeout: 60_000 }).toBe(2);

  const { sessione } = await salute(schermo);
  const righe = fs.readFileSync(path.join(CARTELLA_LOG, 'narrazioni.jsonl'), 'utf8').trim().split('\n').map((r) => JSON.parse(r) as Record<string, unknown>);
  const turno1 = righe.find((r) => r['sessione'] === sessione && r['tipo'] === 'turno' && r['turno'] === 1);
  expect(turno1?.['chiusura']).toBe('stallo');
  expect(errori, errori.join('\n')).toEqual([]);
});
