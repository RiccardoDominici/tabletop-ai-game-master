/**
 * E2E dell'audio sul proiettore (musica, ambienti, temi dei PNG, ducking, pannello, crediti) con
 * l'audio di prova. Gira su un server SUO, mai su quello della partita (4610):
 *
 *   PORT=4620 CANTASTORIE_LLM=finto CANTASTORIE_TTS=mock CANTASTORIE_LOG=/tmp/cantastorie-e2e-audio \
 *     CANTASTORIE_AUDIO=apps/server/test/fixtures/audio CANTASTORIE_IMMAGINI=apps/server/test/fixtures/immagini \
 *     npm run start -w @cantastorie/server
 *   (pagine: vite build --outDir <cartella>; CANTASTORIE_SERVER=http://127.0.0.1:4620 vite preview --outDir <cartella> --port 4622)
 *   E2E_URL=http://localhost:4622 npx playwright test e2e/audio.spec.ts
 *
 * Senza il catalogo di prova (server normale) la prova si salta da sola. Lo schermo usa
 * `?isteresi_audio_s=12`: le regole sono quelle vere, con un intervallo corto.
 * Screenshot 1920x1080 in logs/screenshots/audio-*.png; nessun errore in console.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
const SCREENSHOT = path.join(RADICE, 'logs', 'screenshots');
const ISTERESI_S = 12;

interface StatoAudio {
  musica: string | null;
  musicaPendente: string | null | undefined;
  cambiMusica: number;
  ambienti: string[];
  temiSuonati: string[];
  temi: number;
  sottoVoce: boolean;
  abbassamenti: number;
  isteresiMs: number;
}
type FinestraDebug = { __schermoDebug: { audio: { stato(): StatoAudio | null; guadagni(): Record<string, number> } } };

const statoAudio = (p: Page) => p.evaluate(() => (window as unknown as FinestraDebug).__schermoDebug.audio.stato());
const guadagni = (p: Page) => p.evaluate(() => (window as unknown as FinestraDebug).__schermoDebug.audio.guadagni());
const salute = async (p: Page) => (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number; audio?: number };
const luogo = (p: Page, id: string) => p.request.post('/api/scena/luogo', { data: { luogo: id } });
const umore = (p: Page, tag: string | null) => p.request.post('/api/scena/umore', { data: { umore: tag } });

const FORNO = ['amb_scena_forno_vecchio_folla', 'amb_scena_forno_vecchio_fuoco'];

test('proiettore: musica con dissolvenza e isteresi, ambienti, tema del PNG una volta, ducking sotto la voce', async ({ browser }) => {
  test.setTimeout(240_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: string[] = [];
  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
  schermo.on('pageerror', (e) => errori.push(e.message));
  test.skip(((await salute(schermo)).audio ?? 0) < 10, 'serve il server con CANTASTORIE_AUDIO=apps/server/test/fixtures/audio');

  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await luogo(schermo, 'scena_forno_vecchio');
  await umore(schermo, null);
  await schermo.goto(`/schermo?isteresi_audio_s=${ISTERESI_S}`);
  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
  await tel.goto('/telefono');
  await tel.getByTestId('scelta-pg-pg_ginestra').click();
  // Prima del clic nessun mixer: l'audio parte solo con «Inizia sessione».
  expect(await statoAudio(schermo)).toBeNull();
  await schermo.getByTestId('inizia-sessione').click();

  // 1. Musica del luogo e due strati d'ambiente, in entrata.
  await expect.poll(async () => (await statoAudio(schermo))?.musica, { timeout: 10_000 }).toBe('luogo_scena_forno_vecchio');
  await expect.poll(async () => (await statoAudio(schermo))?.ambienti, { timeout: 10_000 }).toEqual(FORNO);
  await expect.poll(async () => (await guadagni(schermo))['ambiente:amb_scena_forno_vecchio_fuoco'] ?? 0, { timeout: 10_000 }).toBeGreaterThan(0.45);
  expect((await statoAudio(schermo))?.isteresiMs).toBe(ISTERESI_S * 1000);

  // 2. Ducking: mentre il narratore legge l'apertura, musica e ambienti stanno ~9 dB sotto.
  await expect(schermo.getByTestId('sottotitolo')).not.toHaveText('', { timeout: 30_000 });
  await expect.poll(async () => (await guadagni(schermo))['sotto_voce'], { timeout: 5_000 }).toBeLessThan(0.45);
  expect((await guadagni(schermo))['sotto_voce']).toBeGreaterThan(0.25);
  expect((await statoAudio(schermo))?.sottoVoce).toBe(true);
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'audio-narrazione-ducking.png') });
  // A voce finita (finestra aperta) risalgono.
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 90_000 }).toBe('finestra');
  await expect.poll(async () => (await guadagni(schermo))['sotto_voce'], { timeout: 8_000 }).toBeGreaterThan(0.9);
  expect((await guadagni(schermo))['musica:luogo_scena_forno_vecchio']).toBeGreaterThan(0.95);

  // 3. Cambio di luogo (l'isteresi è già passata): dissolvenza incrociata e strati nuovi.
  await luogo(schermo, 'n_piazza');
  await expect.poll(async () => (await statoAudio(schermo))?.musica, { timeout: 5_000 }).toBe('luogo_n_piazza');
  await schermo.waitForTimeout(1500);
  const meta = await guadagni(schermo);
  expect(meta['musica:luogo_n_piazza']).toBeGreaterThan(0.1);
  expect(meta['musica:luogo_n_piazza']).toBeLessThan(0.99);
  expect(meta['uscita:luogo_scena_forno_vecchio']).toBeGreaterThan(0.1);
  expect(meta['uscita:luogo_scena_forno_vecchio']).toBeLessThan(0.99);
  expect((await statoAudio(schermo))?.ambienti).toEqual(['amb_n_piazza_vento']);
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'audio-dissolvenza-luogo.png') });
  await expect.poll(async () => (await guadagni(schermo))['uscita:luogo_scena_forno_vecchio'] ?? 0, { timeout: 8_000 }).toBe(0);

  // 4. Isteresi: si torna subito indietro → gli ambienti seguono, la musica aspetta l'intervallo.
  const cambiPrima = (await statoAudio(schermo))!.cambiMusica;
  await luogo(schermo, 'scena_forno_vecchio');
  await expect.poll(async () => (await statoAudio(schermo))?.ambienti, { timeout: 5_000 }).toEqual(FORNO);
  const inAttesa = await statoAudio(schermo);
  expect(inAttesa).toMatchObject({ musica: 'luogo_n_piazza', musicaPendente: 'luogo_scena_forno_vecchio', cambiMusica: cambiPrima });
  await expect.poll(async () => (await statoAudio(schermo))?.musica, { timeout: (ISTERESI_S + 4) * 1000 }).toBe('luogo_scena_forno_vecchio');
  expect((await statoAudio(schermo))?.cambiMusica).toBe(cambiPrima + 1);

  // 5. Umore esplicito (master/Motore): cambia subito, anche dentro l'intervallo.
  const primaUmore = Date.now();
  await umore(schermo, 'tensione');
  await expect.poll(async () => (await statoAudio(schermo))?.musica, { timeout: 3_000 }).toBe('umore_tensione');
  expect(Date.now() - primaUmore).toBeLessThan(3_000);
  await umore(schermo, null);
  await expect.poll(async () => (await statoAudio(schermo))?.musica, { timeout: 3_000 }).toBe('luogo_scena_forno_vecchio');

  // 6. Temi: il copione fa parlare Ottavia (turno 1), Sebastiano (2, senza tema), Baldrin (3) e di
  //    nuovo Ottavia (4). Il suo tema suona alla prima battuta, sotto la voce, e mai più.
  const turno = async (n: number) => {
    await expect.poll(async () => (await salute(schermo)).fase, { timeout: 90_000 }).toBe('finestra');
    await tel.getByTestId('testo-azione').fill(`mi guardo intorno (${n})`);
    await tel.getByTestId('invia-azione').click();
    await tel.getByTestId('pronto').click();
    await expect.poll(async () => (await salute(schermo)).turno, { timeout: 30_000 }).toBe(n);
  };
  await turno(1);
  await expect(schermo.getByTestId('ritratto')).toHaveAttribute('src', /ritratto_png_ottavia/, { timeout: 30_000 });
  await expect.poll(async () => (await guadagni(schermo))['tema:tema_png_ottavia'] ?? 0, { timeout: 2_000 }).toBeGreaterThan(0.5);
  expect((await statoAudio(schermo))?.temiSuonati).toEqual(['scena_forno_vecchio:png_ottavia']);
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'audio-tema-ottavia.png') });
  for (const n of [2, 3, 4]) await turno(n);
  await expect(schermo.getByTestId('ritratto')).toHaveAttribute('src', /ritratto_png_ottavia/, { timeout: 30_000 });
  await schermo.waitForTimeout(1000);
  const temi = await statoAudio(schermo);
  expect(temi?.temiSuonati).toEqual(['scena_forno_vecchio:png_ottavia', 'scena_forno_vecchio:png_baldrin']);
  expect(temi?.temi).toBe(2);
  expect((await guadagni(schermo))['tema:tema_png_ottavia']).toBeUndefined();
  expect(temi!.abbassamenti).toBeGreaterThanOrEqual(5);

  // 7. Pannello (tasto A): muto della musica, volume ricordato; crediti (tasto C).
  await schermo.keyboard.press('a');
  await expect(schermo.getByTestId('pannello-audio')).toBeVisible();
  await schermo.getByTestId('muto-musica').click();
  await expect.poll(async () => (await guadagni(schermo))['bus_musica'], { timeout: 2_000 }).toBeLessThan(0.01);
  await schermo.getByTestId('muto-musica').click();
  // Ambienti dal 60 % al 30 %: sei passi da 5 con la tastiera sul cursore.
  await schermo.getByTestId('volume-ambiente').focus();
  for (let i = 0; i < 6; i += 1) await schermo.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await guadagni(schermo))['bus_ambiente'], { timeout: 2_000 }).toBeCloseTo(0.3, 2);
  const salvate = await schermo.evaluate(() => JSON.parse(localStorage.getItem('cantastorie:mixer') ?? '{}') as Record<string, { volume: number; muto: boolean }>);
  expect(salvate['ambiente']).toEqual({ volume: 0.3, muto: false });
  expect(salvate['musica']?.muto).toBe(false);
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'audio-pannello.png') });
  await schermo.keyboard.press('a');
  await expect(schermo.getByTestId('pannello-audio')).toHaveCount(0);
  await schermo.keyboard.press('c');
  await expect(schermo.getByTestId('crediti')).toContainText('Kevin MacLeod (incompetech.com), CC BY 4.0');
  await schermo.screenshot({ path: path.join(SCREENSHOT, 'audio-crediti.png') });
  await schermo.keyboard.press('c');
  await expect(schermo.getByTestId('crediti')).toHaveCount(0);
  await schermo.evaluate(() => localStorage.removeItem('cantastorie:mixer'));

  await luogo(schermo, 'scena_forno_vecchio');
  expect(errori, errori.join('\n')).toEqual([]);
});
