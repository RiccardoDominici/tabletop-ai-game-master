/**
 * E2E of manual rolls (docs/prove.md §8) on the real pages, with no model: fake narrator, rules arbiter, the invented
 * campaign with sheets (apps/server/test/fixtures/campagne/prove):
 *
 *   cp -R apps/server/test/fixtures/campagne/prove <copy>
 *   node -e "const f='<copy>/campagna.yaml',Y=require('yaml'),fs=require('fs'),d=Y.parse(fs.readFileSync(f,'utf8'));
 *     d.orologi[0].avanza_quando=[{quando:'scontro',tiro:{dado:6,almeno:4}}];fs.writeFileSync(f,Y.stringify(d))"
 *   TAGM_PORTA=4893 TAGM_CARTELLA_CAMPAGNA=<copy> TAGM_TIRI_GIOCATORI=manuale TAGM_TIRI_MASTER=visibili \
 *     scripts/avvio.sh --finto --mock
 *   E2E_PORTA=4893 npx playwright test -c playwright.config.ts e2e/tiri-manuali.spec.ts
 * (the gate on the clock makes the world roll a d6 when a fight starts: the Game Master roll the table sees.)
 *
 * Projector, two phones, the Game Master panel. Ida persuades Bertoldo (public), Teo opens the toll box's padlock
 * (private). Ida's phone shows the roll card (two d20 with advantage, the bonus, no DC); Teo's phone shows his, the
 * projector only Ida's request and never a number to beat; the panel shows both with the DC. Ida types her dice, the
 * Game Master enters Teo's from the panel; the card on the projector has the total and the outcome, no DC, and so do
 * the phones' cards. Then the Game Master asks Ida a check from the panel («Chiedi una prova»): her phone says the Game
 * Master asks, she rolls, the narrator gets it. Last, «Inizia combattimento»: the world's gate rolls a d6 on the Game
 * Master's side and, with TAGM_TIRI_MASTER=visibili, the projector shows the «Il master» card with yes or no.
 * Screenshots in logs/screenshots/tiri-manuali/ (projector 1920×1080, phone 390×844).
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { CARTELLA_LOG, SCREENSHOT } from './percorsi';

const CARTELLA = path.join(SCREENSHOT, 'tiri-manuali');

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

const salute = async (p: Page) => (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number };

async function attendiFase(page: Page, cond: (s: { fase: string; turno: number }) => boolean, ms: number, cosa: string): Promise<void> {
  const fine = Date.now() + ms;
  for (;;) {
    const s = await salute(page);
    if (cond(s)) return;
    if (Date.now() > fine) throw new Error(`timeout: ${cosa} (${JSON.stringify(s)})`);
    await page.waitForTimeout(200);
  }
}

/** The panel's link from the last start in the server log (the token changes at every start). */
function linkMaster(): string {
  const out = fs.readFileSync(path.join(CARTELLA_LOG, 'server.out'), 'utf8');
  const ultimo = out.slice(out.lastIndexOf('=== avvio'));
  const riga = ultimo.split('\n').filter((r) => r.includes('"PANNELLO MASTER"')).at(-1);
  if (!riga) throw new Error('riga PANNELLO MASTER non trovata');
  return (JSON.parse(riga) as { master: string }).master.replace(/^https?:\/\/[^/]+/, '');
}

async function telefono(browser: Browser, pg: string, errori: string[]): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errori.push(`[${pg}] ${e.message}`));
  await p.goto('/telefono');
  await p.getByTestId(`scelta-pg-${pg}`).click();
  await expect(p.getByTestId('nome-pg')).toBeVisible();
  return p;
}

async function invia(p: Page, testo: string, privata = false): Promise<void> {
  await p.getByTestId('testo-azione').fill(testo);
  if (privata) await p.getByTestId('azione-privata').click();
  await p.getByTestId('invia-azione').click();
}

test('manual rolls: the request without DC, the dice typed on the phone and entered by the Game Master', async ({ browser }) => {
  test.setTimeout(180_000);
  fs.mkdirSync(CARTELLA, { recursive: true });
  const errori: string[] = [];
  const ctxSchermo = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const schermo = await ctxSchermo.newPage();
  schermo.on('pageerror', (e) => errori.push(`[schermo] ${e.message}`));
  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');
  const ida = await telefono(browser, 'pg_ida', errori);
  const teo = await telefono(browser, 'pg_teo', errori);
  const ctxMaster = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const master = await ctxMaster.newPage();
  master.on('pageerror', (e) => errori.push(`[master] ${e.message}`));
  await master.goto(linkMaster());

  await schermo.getByTestId('inizia-sessione').click();
  await attendiFase(schermo, (s) => s.fase === 'finestra' && s.turno === 1, 120_000, 'prima finestra');

  await invia(teo, 'Mentre Bertoldo guarda Ida, apro di nascosto il lucchetto della cassetta del pedaggio', true);
  await invia(ida, 'Convinco Bertoldo a lasciarci passare senza pagare il pedaggio');

  // Ida's phone: the roll card, what to roll and the bonus, no DC.
  const cartaIda = ida.getByTestId('tiro-da-fare');
  await expect(cartaIda).toBeVisible({ timeout: 30_000 });
  await expect(ida.getByTestId('tiro-etichetta')).toContainText('Persuasione');
  await expect(ida.getByTestId('tiro-bonus')).toContainText('+');
  await expect(cartaIda).not.toContainText(/\bCD\b|\bCA\b/);
  // Teo's phone: his private roll.
  await expect(teo.getByTestId('tiro-da-fare')).toBeVisible();
  await expect(teo.getByTestId('tiro-etichetta')).toContainText('Rapidità di mano');
  // Projector: only Ida's request, no number to beat, nothing of Teo's.
  const richieste = schermo.getByTestId('richiesta-tiro');
  await expect(richieste).toHaveCount(1);
  await expect(richieste.first()).toHaveAttribute('data-chi', 'pg_ida');
  await expect(schermo.getByTestId('richieste-schermo')).not.toContainText(/Teo|lucchetto|\bCD\b/);
  // Panel: both rolls with their DC.
  await expect(master.getByTestId('master-tiri')).toBeVisible();
  await expect(master.locator('[data-testid^="master-tiro-r_"][data-chiusa="false"]')).toHaveCount(2);
  await schermo.screenshot({ path: path.join(CARTELLA, 'proiettore-richiesta.png') });
  await ida.screenshot({ path: path.join(CARTELLA, 'telefono-ida-richiesta.png') });
  await teo.screenshot({ path: path.join(CARTELLA, 'telefono-teo-richiesta.png') });
  await master.screenshot({ path: path.join(CARTELLA, 'master-richieste.png') });

  // Ida types her dice: the total appears, then «Fatto».
  const dadi = await ida.locator('[data-testid^="tiro-dado-"]').count();
  for (let i = 0; i < dadi; i++) await ida.getByTestId(`tiro-dado-${i}`).fill(String(12 + i));
  await expect(ida.getByTestId('tiro-totale')).toContainText(/\d/);
  await ida.screenshot({ path: path.join(CARTELLA, 'telefono-ida-dadi.png') });
  await ida.getByTestId('tiro-invia').click();
  await expect(cartaIda).toBeHidden();
  // The Game Master enters Teo's die for him (a 6).
  const rigaTeo = master.locator('[data-testid^="master-tiro-r_"][data-chiusa="false"]');
  await expect(rigaTeo).toHaveCount(1);
  const idTeo = (await rigaTeo.getAttribute('data-testid'))!.replace('master-tiro-', '');
  await master.getByTestId(`master-tiro-${idTeo}-dado-0`).fill('6');
  await master.getByTestId(`master-tiro-${idTeo}-inserisci`).click();
  await expect(teo.getByTestId('tiro-da-fare')).toBeHidden();

  // The narration runs, the cards come: Ida's on the projector with the total, without the number to beat.
  const carta = schermo.locator('[data-testid="carta-tiro"]').first();
  await expect(carta).toBeVisible({ timeout: 30_000 });
  await expect(carta.getByTestId('carta-contro')).toHaveCount(0);
  await expect(carta.getByTestId('carta-totale')).toBeVisible();
  await schermo.screenshot({ path: path.join(CARTELLA, 'proiettore-carta.png') });
  await attendiFase(schermo, (s) => s.fase === 'finestra' && s.turno === 2, 120_000, 'seconda finestra');
  await ida.screenshot({ path: path.join(CARTELLA, 'telefono-ida-dopo.png') });
  // The panel keeps the full cards, the DC included, and says who entered the dice.
  const carte = master.getByTestId('master-tiri-carte');
  await expect(carte).toContainText('CD');
  await expect(carte).toContainText('inserito dal master');
  await master.screenshot({ path: path.join(CARTELLA, 'master-carte.png') });
  // The phones' cards: no number to beat either (the compact «Tiri del turno» and the full card).
  await expect(ida.getByTestId('carta-tiro').first()).toBeVisible();
  for (const c of await ida.getByTestId('carta-tiro').all()) await expect(c).not.toContainText(/\bCD\b|\bCA\b/);
  await expect(teo.getByTestId('carta-tiro').first()).toBeVisible();
  for (const c of await teo.getByTestId('carta-tiro').all()) await expect(c).not.toContainText(/\bCD\b|\bCA\b/);

  // The Game Master asks Ida for a Perception check, hard, from the panel; «Risolvi ora» closes the window.
  const form = master.getByTestId('master-chiedi-prova');
  await form.locator('summary').click();
  await master.getByTestId('master-chiedi-pg').selectOption('pg_ida');
  await master.getByTestId('master-chiedi-cosa').selectOption('abilita:percezione');
  await master.getByTestId('master-chiedi-difficolta').selectOption('difficile');
  await master.getByTestId('master-chiedi-motivo').fill('sentire i passi sul ponte');
  await master.getByTestId('master-chiedi-invia').click();
  await expect(master.getByTestId('master-tiri-chieste')).toContainText('Ida Ferraro');
  await master.screenshot({ path: path.join(CARTELLA, 'master-chiedi.png') });
  await master.getByRole('button', { name: 'Risolvi ora' }).click();
  await expect(cartaIda).toBeVisible({ timeout: 30_000 });
  await expect(cartaIda).toContainText('Il master ti chiede un tiro');
  await expect(ida.getByTestId('tiro-etichetta')).toContainText('Percezione');
  await ida.screenshot({ path: path.join(CARTELLA, 'telefono-ida-dal-master.png') });
  await ida.getByTestId('tiro-dado-0').fill('19');
  await ida.getByTestId('tiro-invia').click();
  await attendiFase(schermo, (s) => s.fase === 'finestra' && s.turno === 3, 120_000, 'terza finestra');
  await expect(master.getByTestId('master-tiri-carte')).toContainText('Percezione');

  // A fight from the panel: the world's gate rolls on the Game Master's side; with «visibili» the table sees it.
  await master.getByTestId('master-combattimento-inizia').click();
  const cartaMaster = schermo.locator('[data-testid="carta-tiro"][data-png="true"]').filter({ hasText: 'Il master' });
  await expect(cartaMaster).toBeVisible({ timeout: 15_000 });
  await expect(cartaMaster).toContainText(/Sì|No/);
  await schermo.screenshot({ path: path.join(CARTELLA, 'proiettore-tiro-master.png') });
  await expect(master.getByTestId('master-tiri-del-master')).toBeVisible();
  await master.getByTestId('master-tiri-del-master').locator('summary').click();
  await expect(master.getByTestId('master-tiri-del-master')).toContainText('o_piena');
  await master.screenshot({ path: path.join(CARTELLA, 'master-tiri-del-master.png') });
  expect(errori).toEqual([]);
});
