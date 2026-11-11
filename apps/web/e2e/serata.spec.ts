/**
 * E2E della serata (chiusura guidata e diario) su un'istanza di PROVA con il narratore finto:
 *   TAGM_PORTA=4740 scripts/avvio.sh --finto --mock        (dalla radice della worktree)
 *   cd apps/web && E2E_PORTA=4740 npx playwright test -c playwright.config.ts e2e/serata.spec.ts
 *   TAGM_PORTA=4740 scripts/arresto.sh
 *
 * Proiettore, un telefono (Ginestra) e il pannello del master. Un turno con un'azione; il master
 * imposta la durata, preme «Chiudi la sessione» e conferma: il proiettore mostra «Cosa è successo
 * stasera», il telefono apre il Diario e vede la serata. Il master preme «Riprendi»: la trascrizione
 * ha la riga «La volta scorsa.» e il proiettore mostra la carta. Il riassunto può venire dalla riserva
 * del Motore: si accetta sia di_riserva true sia false. Screenshot in logs/screenshots/serata-*.png.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { CARTELLA_LOG, RADICE, SCREENSHOT, URL_PROVE } from './percorsi';

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

const PORTA = new URL(URL_PROVE).port;

/** Link del pannello dall'ultimo avvio del server di prova (il token cambia a ogni avvio). */
function linkMaster(): string {
  const out = fs.readFileSync(path.join(CARTELLA_LOG, 'server.out'), 'utf8');
  const riga = out.slice(out.lastIndexOf('=== avvio')).split('\n').filter((r) => r.includes('"PANNELLO MASTER"')).at(-1);
  if (!riga) throw new Error('riga PANNELLO MASTER non trovata');
  return (JSON.parse(riga) as { master: string }).master.replace(/^http:\/\/localhost:\d+/, '');
}

async function agisci(p: Page, testo: string): Promise<void> {
  await p.getByTestId('testo-azione').fill(testo);
  await p.getByTestId('invia-azione').click();
}

test('serata: durata, chiusura guidata, diario sul telefono, ripresa con «La volta scorsa»', async ({ browser }) => {
  test.skip(PORTA === '4610', 'mai toccare la partita vera: usa un server di prova (TAGM_PORTA=4740)');
  test.setTimeout(420_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: string[] = [];
  const foto = (p: Page, nome: string) => p.screenshot({ path: path.join(SCREENSHOT, `serata-${nome}.png`) });
  const osserva = (p: Page, nome: string) => {
    p.on('console', (m) => m.type() === 'error' && !/WebSocket|ERR_CONNECTION|socket\.io|Failed to load resource/i.test(m.text()) && errori.push(`[${nome}] ${m.text()}`));
    p.on('pageerror', (e) => errori.push(`[${nome}] ${e.message}`));
  };

  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  osserva(schermo, 'schermo');
  const salute = (await (await schermo.request.get('/api/salute')).json()) as { fase: string; narratore: string };
  test.skip(salute.narratore !== 'finto', 'avvia il server di prova col narratore finto (--finto)');
  if (salute.fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');

  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  osserva(tel, 'telefono');
  await tel.goto('/telefono');
  await tel.getByTestId('scelta-pg-pg_ginestra').click();
  await expect(tel.getByTestId('nome-pg')).toContainText('Ginestra');

  const master = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  osserva(master, 'master');
  await master.goto(linkMaster());
  await expect(master.getByTestId('pagina-master')).toHaveAttribute('data-entrata', 'dentro', { timeout: 10_000 });

  // --- Una serata con un turno.
  await schermo.getByTestId('inizia-sessione').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 90_000 });
  await agisci(tel, 'Saluto l’ostessa.');
  await expect(master.getByTestId('master-turno')).toContainText('turno 2', { timeout: 90_000 });
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 90_000 });

  // --- Durata: il master la imposta a un’ora e mezza.
  await master.getByTestId('master-serata-ore').fill('1.5');
  await master.getByTestId('master-serata-imposta').click();
  await expect(master.getByTestId('master-serata-durata')).toContainText('1,5 ore', { timeout: 10_000 });
  await expect(master.getByTestId('master-serata-durata')).toContainText('impostata dal master');
  await foto(master, 'pannello-serata');

  // --- Chiusura: «Chiudi la sessione» si conferma col secondo clic.
  await master.getByTestId('chiudi-sessione').click();
  await expect(master.getByTestId('chiudi-sessione')).toHaveAttribute('data-conferma', 'true');
  await master.getByTestId('chiudi-sessione').click();
  await expect(schermo.getByTestId('fine-serata')).toBeVisible({ timeout: 150_000 });
  const riassunto = (await schermo.getByTestId('fine-serata').innerText()).trim();
  expect(riassunto).toContain('Cosa è successo stasera');
  await schermo.waitForTimeout(800);
  await foto(schermo, 'fine-serata');

  // --- Il telefono apre il Diario e vede la serata appena chiusa (l'intestazione, con quattro pulsanti, sta in 390 px).
  // Tutti i pulsanti dell'intestazione restano dentro il telefono (il «Cambia» non esce dal bordo).
  const cambia = await tel.getByRole('button', { name: 'Cambia personaggio' }).boundingBox();
  expect((cambia?.x ?? 0) + (cambia?.width ?? 0)).toBeLessThanOrEqual(390);
  await tel.getByTestId('apri-diario').click();
  await expect(tel.getByTestId('diario')).toBeVisible();
  await expect(tel.getByTestId('diario-serata').first()).toBeVisible({ timeout: 10_000 });
  await expect(tel.getByTestId('diario-privati')).toBeVisible();
  await foto(tel, 'diario');
  expect(await tel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await tel.getByTestId('chiudi-diario').click();
  await foto(tel, 'intestazione');

  // --- Riprendi: la serata continua, il proiettore mostra la carta e la trascrizione la riga.
  await master.getByTestId('master-riprendi').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 30_000 });
  await expect(master.getByTestId('master-trascrizione')).toContainText('La volta scorsa.', { timeout: 30_000 });
  // La riga ha il nome del narratore prima del testo: si cerca il testo della voce, che comincia così.
  const riga = master.getByTestId('master-trascrizione').locator('p').filter({ hasText: 'La volta scorsa.' });
  await expect(riga.first()).toBeVisible();
  expect((await riga.first().innerText()).replace(/\s+/g, ' ')).toMatch(/La volta scorsa\. /);
  await expect(schermo.getByTestId('la-volta-scorsa')).toBeVisible({ timeout: 15_000 });
  await expect(schermo.getByTestId('fine-serata')).toHaveCount(0);
  await schermo.waitForTimeout(800);
  await foto(schermo, 'la-volta-scorsa');
  await foto(master, 'dopo-riprendi');

  expect(errori, errori.join('\n')).toEqual([]);
});
