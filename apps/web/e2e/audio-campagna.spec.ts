/**
 * Controllo dell'audio VERO di una campagna (qualunque: legge il catalogo del server), in Chromium.
 * Gira su un server di prova, mai su quello della partita (4610), per esempio:
 *
 *   PORT=4620 CANTASTORIE_CAMPAGNA=ponte-lanterne CANTASTORIE_LLM=finto CANTASTORIE_TTS=mock \
 *     CANTASTORIE_LOG=/tmp/cantastorie-prova npm run start -w @cantastorie/server
 *   (pagine come in audio.spec.ts: vite build in una cartella a parte + vite preview --port 4622)
 *   E2E_AUDIO_CAMPAGNA=1 E2E_URL=http://localhost:4622 npx playwright test e2e/audio-campagna.spec.ts
 *
 * 1. File: ogni traccia si decodifica nel browser (canali, durata, picco) e ogni loop ha la
 *    giunta senza clic (salto ≤ 3 volte il 99° percentile dei salti vicini).
 * 2. Proiettore: giro di tutti i luoghi con musica (isteresi accorciata a 1 s), guadagni letti dal
 *    vivo, strati d'ambiente, buffer e punti di loop in uso; tre turni del narratore a copione per
 *    l'anticipo dei temi dei PNG; memoria decodificata. Rapporto in logs/audio-campagna-chromium.json,
 *    screenshot in logs/screenshots/audio-campagna-*.png. Nessun errore in console.
 * Per Safari/WebKit: e2e/controllo-audio-webkit.ts (stesso controllo dei file).
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { controllaCatalogo, riassunto } from './controllo-audio';

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
const SCREENSHOT = path.join(RADICE, 'logs', 'screenshots');
const RAPPORTO = path.join(RADICE, 'logs', 'audio-campagna-chromium.json');
/** Oltre questo rapporto la giunta di un loop si sente (clic). */
const GIUNTA_MAX = 3;
/** Canali attesi delle tracce in onda (la pipeline: stereo); 0 = non controllare (fixture mono). */
const CANALI = Number(process.env['E2E_AUDIO_CANALI'] ?? 2);

test.skip(!process.env['E2E_AUDIO_CAMPAGNA'], 'E2E_AUDIO_CAMPAGNA=1 col server della campagna da controllare');
test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

type Debug = {
  __schermoDebug: {
    audio: {
      stato(): { musica: string | null; musicaPendente: string | null | undefined; ambienti: string[]; anticipiTemi: Array<{ png: string; id: string; anticipoS: number }>; memoria: Record<string, number> } | null;
      guadagni(): Record<string, number>;
      tracce(): Array<{ id: string; durataBuffer: number; canali: number; loopInizio: number | null; loopFine: number | null }>;
    };
  };
};
const stato = (p: Page) => p.evaluate(() => (window as unknown as Debug).__schermoDebug.audio.stato());
const guadagni = (p: Page) => p.evaluate(() => (window as unknown as Debug).__schermoDebug.audio.guadagni());
const tracce = (p: Page) => p.evaluate(() => (window as unknown as Debug).__schermoDebug.audio.tracce());
const salute = async (p: Page) => (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number; campagna: string };

test('file della campagna: decodifica nel browser e giunte dei loop', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/schermo');
  const esiti = await controllaCatalogo(page);
  console.log(`\n${riassunto(esiti)}\n`);
  fs.mkdirSync(path.dirname(RAPPORTO), { recursive: true });
  fs.writeFileSync(RAPPORTO.replace('.json', '-file.json'), JSON.stringify(esiti, null, 2));
  expect(esiti.length).toBeGreaterThan(0);
  expect(esiti.filter((e) => !e.ok), 'file non decodificati').toEqual([]);
  expect(esiti.filter((e) => e.loop && (e.rapportoGiunta ?? 0) > GIUNTA_MAX).map((e) => `${e.id} ×${e.rapportoGiunta}`), 'giunte con clic').toEqual([]);
  expect(esiti.filter((e) => (e.picco ?? 0) >= 1).map((e) => e.id), 'file in clipping').toEqual([]);
});

test('proiettore: tutti i luoghi, strati, temi dei PNG e memoria', async ({ browser }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: string[] = [];
  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
  schermo.on('pageerror', (e) => errori.push(e.message));
  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  const catalogo = (await (await schermo.request.get('/api/audio')).json()) as { tracce: Record<string, { tipo: string; guadagno: number }> };
  const luoghi = [...new Set(Object.keys(catalogo.tracce).filter((id) => id.startsWith('luogo_')).map((id) => id.slice('luogo_'.length)))];
  await schermo.goto('/schermo?isteresi_audio_s=1');
  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
  await tel.goto('/telefono');
  await tel.locator('[data-testid^="scelta-pg-"]').first().click();
  await schermo.getByTestId('inizia-sessione').click();
  await expect.poll(async () => (await stato(schermo))?.musica ?? null, { timeout: 15_000 }).not.toBeNull();

  // Giro dei luoghi: musica e strati arrivano al loro guadagno; buffer e loop in uso.
  const letture: Array<Record<string, unknown>> = [];
  for (const [i, l] of luoghi.entries()) {
    await schermo.request.post('/api/scena/luogo', { data: { luogo: l } });
    await schermo.waitForTimeout(1300);
    await expect.poll(async () => (await stato(schermo))?.musicaPendente, { timeout: 5_000 }).toBeUndefined();
    await schermo.waitForTimeout(4200); // dissolvenze (3,5 s musica, 3 s ambienti)
    const s = (await stato(schermo))!;
    const g = await guadagni(schermo);
    const t = await tracce(schermo);
    letture.push({ luogo: l, musica: s.musica, ambienti: s.ambienti, guadagni: g, tracce: t });
    if (s.musica) expect(g[`musica:${s.musica}`], `${l}: guadagno della musica`).toBeCloseTo(catalogo.tracce[s.musica]!.guadagno, 2);
    for (const a of s.ambienti) expect(g[`ambiente:${a}`], `${l}: guadagno di ${a}`).toBeCloseTo(catalogo.tracce[a]!.guadagno, 2);
    if (CANALI > 0) for (const x of t) expect(x.canali, `${x.id}: canali`).toBe(CANALI);
    if (i < 2) {
      await schermo.keyboard.press('a');
      await schermo.screenshot({ path: path.join(SCREENSHOT, `audio-campagna-${l}.png`) });
      await schermo.keyboard.press('a');
    }
  }

  // Temi: tre turni del narratore a copione (a ogni turno parla un PNG diverso).
  for (let n = 1; n <= 3; n += 1) {
    await expect.poll(async () => (await salute(schermo)).fase, { timeout: 120_000 }).toBe('finestra');
    await tel.getByTestId('testo-azione').fill(`mi guardo intorno (${n})`);
    await tel.getByTestId('invia-azione').click();
    await tel.getByTestId('pronto').click();
    await expect.poll(async () => (await salute(schermo)).turno, { timeout: 30_000 }).toBe(n);
  }
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 120_000 }).toBe('finestra');
  const fine = (await stato(schermo))!;
  fs.writeFileSync(RAPPORTO, JSON.stringify({ campagna: (await salute(schermo)).campagna, luoghi: letture, anticipiTemi: fine.anticipiTemi, memoria: fine.memoria }, null, 2));
  console.log('Temi:', JSON.stringify(fine.anticipiTemi), '\nMemoria:', JSON.stringify(fine.memoria));
  for (const a of fine.anticipiTemi) expect(a.anticipoS, `${a.png}: il tema parte prima o sotto la battuta`).toBeGreaterThan(-1.5);
  expect(errori, errori.join('\n')).toEqual([]);
});
