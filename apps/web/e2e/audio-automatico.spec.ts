/**
 * E2E dell'audio AUTOMATICO (docs/audio.md, «Segnali automatici»): umore iniziale della scena,
 * battuta del repertorio con `audio: {effetto, umore}`, righe [effetto]/[umore] del narratore,
 * limite di un umore automatico al minuto, registro del master col chip «auto».
 * Server di prova suo (mai la partita sulla 4610), campagna mini-audio in modalità repertorio:
 *
 *   PORT=4620 CANTASTORIE_CARTELLA_CAMPAGNA=apps/server/test/fixtures/campagne/mini-audio \
 *     CANTASTORIE_MODO=repertorio CANTASTORIE_LLM=finto CANTASTORIE_TTS=mock \
 *     CANTASTORIE_COPIONE_FINTO=apps/server/test/fixtures/copione-audio.txt \
 *     CANTASTORIE_AUDIO=apps/server/test/fixtures/audio CANTASTORIE_MASTER_TOKEN=<token> \
 *     CANTASTORIE_LOG=<cartella di prova> CANTASTORIE_CACHE_AUDIO=<cartella di prova> npm run start -w @cantastorie/server
 *   (pagine come in audio.spec.ts: vite build in una cartella a parte + vite preview --port 4622)
 *   E2E_URL=http://localhost:4622 E2E_MASTER_TOKEN=<token> npx playwright test e2e/audio-automatico.spec.ts
 *
 * Senza quel server (campagna diversa da mini-audio) la prova si salta. Screenshot in
 * logs/screenshots/audio-automatico-*.png; nessun errore in console.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
const SCREENSHOT = path.join(RADICE, 'logs', 'screenshots');

interface StatoAudio {
  musica: string | null;
  effetti: string[];
  ritardiEffetti: Array<{ id: string; ritardoS: number }>;
}
type FinestraDebug = { __schermoDebug: { audio: { stato(): StatoAudio | null } } };
const statoAudio = (p: Page) => p.evaluate(() => (window as unknown as FinestraDebug).__schermoDebug.audio.stato());
const salute = async (p: Page) => (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number; campagna: string };

test('audio automatico: umore iniziale, battuta con audio, [effetto] in tempo, limite al minuto, registro', async ({ browser }) => {
  test.setTimeout(150_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const token = process.env['E2E_MASTER_TOKEN'];
  const errori: string[] = [];
  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('console', (m) => m.type() === 'error' && errori.push(`schermo: ${m.text()}`));
  schermo.on('pageerror', (e) => errori.push(`schermo: ${e.message}`));
  test.skip((await salute(schermo)).campagna !== 'mini-audio' || !token, 'serve il server mini-audio di prova (vedi in testa) e E2E_MASTER_TOKEN');
  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');

  await schermo.goto('/schermo');
  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
  await tel.goto('/telefono');
  await tel.getByTestId('scelta-pg-pg_anna').click();
  await schermo.getByTestId('inizia-sessione').click();

  // 1. La scena comincia col suo umore iniziale (audio.umore_iniziale), senza nessuno al pannello.
  await expect.poll(async () => (await statoAudio(schermo))?.musica, { timeout: 10_000 }).toBe('umore_esplorazione_tesa');

  const turno = async (n: number, testo: string) => {
    await expect.poll(async () => (await salute(schermo)).fase, { timeout: 60_000 }).toBe('finestra');
    await tel.getByTestId('testo-azione').fill(testo);
    await tel.getByTestId('invia-azione').click();
    await tel.getByTestId('pronto').click();
    await expect.poll(async () => (await salute(schermo)).turno, { timeout: 30_000 }).toBe(n);
  };

  // 2. Battuta con audio: la campana parte nello stesso istante della sua prima riga; l'umore cambia.
  await turno(1, 'Saluto l’oste.');
  await expect.poll(async () => (await statoAudio(schermo))?.effetti, { timeout: 30_000 }).toEqual(['sfx_campana']);
  await expect.poll(async () => (await statoAudio(schermo))?.musica, { timeout: 10_000 }).toBe('umore_inseguimento');
  const campana = (await statoAudio(schermo))!.ritardiEffetti[0]!;
  expect(campana.id).toBe('sfx_campana');
  expect(campana.ritardoS).toBeLessThan(0.05);
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'audio-automatico-battuta.png') });

  // 3. Righe del narratore: [effetto] porta sulla frase che la racconta, in tempo; [umore] auto
  //    arriva entro il minuto dal cambio di prima e si ignora (la musica resta).
  await turno(2, 'Mi volto verso la porta.');
  await expect.poll(async () => (await statoAudio(schermo))?.effetti, { timeout: 30_000 }).toEqual(['sfx_campana', 'sfx_porta']);
  const porta = (await statoAudio(schermo))!.ritardiEffetti[1]!;
  expect(porta).toMatchObject({ id: 'sfx_porta' });
  expect(porta.ritardoS).toBeLessThan(0.05);
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 60_000 }).toBe('finestra');
  expect((await statoAudio(schermo))?.musica).toBe('umore_inseguimento');

  // 4. Registro del master: i segnali automatici col chip «auto», anche quello scartato dal limite.
  const master = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  master.on('console', (m) => m.type() === 'error' && errori.push(`master: ${m.text()}`));
  master.on('pageerror', (e) => errori.push(`master: ${e.message}`));
  await master.goto(`/master?token=${token}`);
  const automatici = master.getByTestId('master-evento').filter({ has: master.getByTestId('master-evento-automatico') });
  await expect(automatici).toHaveCount(4, { timeout: 15_000 });
  await expect(automatici.filter({ hasText: 'battuta oste_saluto' })).toHaveCount(2);
  await expect(automatici.filter({ hasText: 'effetto sfx_porta con la frase' })).toHaveCount(1);
  await expect(automatici.filter({ hasText: 'un cambio al minuto' })).toHaveAttribute('data-ok', 'false');
  await expect(master.getByTestId('master-audio-musica')).toContainText('umore: inseguimento');
  await master.screenshot({ path: path.join(SCREENSHOT, 'audio-automatico-registro.png') });

  // 5. Il pannello resta sopra: «auto» manuale passa subito.
  await master.getByTestId('master-umore-auto').click();
  await expect.poll(async () => (await statoAudio(schermo))?.musica ?? null, { timeout: 5_000 }).toBeNull();
  expect(errori, errori.join('\n')).toEqual([]);
});
