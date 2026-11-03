/**
 * Lo stesso controllo dei file audio di audio-campagna.spec.ts, nel motore di Safari (WebKit di
 * Playwright, senza finestre): decodifica di ogni traccia e giunte dei loop; poi il proiettore
 * vero in WebKit (sblocco, musica e strati che suonano). Mai sul server della partita (4610).
 *
 *   npx playwright install webkit     (una volta)
 *   E2E_URL=http://localhost:4622 npx tsx apps/web/e2e/controllo-audio-webkit.ts
 *
 * Rapporto in logs/audio-campagna-webkit.json; esce con 1 se un file non si decodifica.
 */
import fs from 'node:fs';
import path from 'node:path';
import { webkit } from '@playwright/test';
import { controllaCatalogo, riassunto } from './controllo-audio';

const URL_BASE = process.env['E2E_URL'] ?? 'http://localhost:4622';
const RAPPORTO = path.resolve(import.meta.dirname, '..', '..', '..', 'logs', 'audio-campagna-webkit.json');

const browser = await webkit.launch();
try {
  const pagina = await browser.newPage({ baseURL: URL_BASE, viewport: { width: 1280, height: 720 } });
  const errori: string[] = [];
  pagina.on('pageerror', (e) => errori.push(e.message));
  pagina.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
  await pagina.goto(`${URL_BASE}/schermo`);
  const esiti = await controllaCatalogo(pagina);
  console.log(`WebKit ${browser.version()}\n${riassunto(esiti)}`);

  // Il proiettore vero in WebKit: dopo il clic la musica e gli strati suonano.
  await pagina.getByTestId('inizia-sessione').click();
  let proiettore: unknown = null;
  for (let i = 0; i < 40; i += 1) {
    await pagina.waitForTimeout(250);
    proiettore = await pagina.evaluate(() => {
      const a = (window as unknown as { __schermoDebug: { audio: { stato(): { musica: string | null; ambienti: string[] } | null; guadagni(): Record<string, number>; tracce(): unknown[] } } }).__schermoDebug.audio;
      const s = a.stato();
      return s?.musica ? { stato: s, guadagni: a.guadagni(), tracce: a.tracce() } : null;
    });
    if (proiettore && i > 16) break; // ~4 s: dissolvenze d'entrata finite
  }
  console.log('Proiettore in WebKit:', JSON.stringify(proiettore));
  fs.mkdirSync(path.dirname(RAPPORTO), { recursive: true });
  fs.writeFileSync(RAPPORTO, JSON.stringify({ versione: browser.version(), file: esiti, proiettore, errori }, null, 2));
  const rotti = esiti.filter((e) => !e.ok);
  if (rotti.length || !proiettore || errori.length) {
    console.error('PROBLEMI:', JSON.stringify({ rotti: rotti.map((e) => e.id), proiettore: !!proiettore, errori }));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
