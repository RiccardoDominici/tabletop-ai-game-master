/**
 * E2E delle azioni simultanee (docs/azioni-concorrenti.md, «Verifica»): proiettore + tre
 * telefoni sul server vero, avviato con narratore a copione, arbitro vero (regole + Haiku) e
 * voce finta:
 *   CANTASTORIE_PORTA=4710 CANTASTORIE_LLM=finto CANTASTORIE_ARBITRO=haiku CANTASTORIE_MOCK_SCALA=0.25 scripts/avvio.sh --mock
 *   npx playwright test -c apps/web/playwright.config.ts azioni
 *
 * Scenari: dipendenza («anch'io») + ritiro → avviso a tutto schermo; conflitto esclusivo (Haiku)
 * → «Tengo / Cambio / Ritiro» e cambio; scrittura mentre il narratore parla; scelta lasciata
 * scadere → «rimasta fuori» con il testo restituito. Screenshot degli avvisi in
 * logs/screenshots/azioni-*.png; nessun errore in console.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';

// Ogni prova chiude i contesti che ha aperto col browser condiviso, anche se fallisce: un proiettore
// rimasto collegato farebbe ripartire la scena (e suonerebbe l'audio) nella prova successiva.
test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
const SCREENSHOT = path.join(RADICE, 'logs', 'screenshots');

interface Salute {
  fase: string;
  turno: number;
}

async function salute(p: Page): Promise<Salute> {
  return (await (await p.request.get('/api/salute')).json()) as Salute;
}

async function attendiFase(p: Page, cond: (s: Salute) => boolean, ms: number, cosa: string): Promise<void> {
  const fine = Date.now() + ms;
  for (;;) {
    if (cond(await salute(p))) return;
    if (Date.now() > fine) throw new Error(`timeout: ${cosa}`);
    await p.waitForTimeout(200);
  }
}

async function telefono(browser: Browser, nome: string, errori: string[]): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('console', (m) => m.type() === 'error' && errori.push(`[${nome}] ${m.text()}`));
  p.on('pageerror', (e) => errori.push(`[${nome}] ${e.message}`));
  await p.goto('/telefono');
  return p;
}

async function scrivi(p: Page, testo: string): Promise<void> {
  const casella = p.getByTestId('testo-azione');
  await casella.fill(testo);
  await p.getByTestId('invia-azione').click();
}

test('azioni simultanee: dipendenze, conflitti, scrittura durante la narrazione, scadenza', async ({ browser }) => {
  test.setTimeout(240_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: string[] = [];

  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('console', (m) => m.type() === 'error' && errori.push(`[schermo] ${m.text()}`));
  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');

  const ginestra = await telefono(browser, 'ginestra', errori);
  const corrado = await telefono(browser, 'corrado', errori);
  const assenzio = await telefono(browser, 'assenzio', errori);
  await ginestra.getByTestId('scelta-pg-pg_ginestra').click();
  await corrado.getByTestId('scelta-pg-pg_corrado').click();
  await assenzio.getByTestId('scelta-pg-pg_assenzio').click();
  await schermo.getByTestId('inizia-sessione').click();
  await attendiFase(schermo, (s) => s.fase === 'finestra' && s.turno === 1, 90_000, 'prima finestra');

  // --- 1. Dipendenza + ritiro: «anch'io» si lega (regola); il ritiro di Ginestra chiede a Corrado.
  await scrivi(ginestra, 'vado avanti verso la grata del ripostiglio');
  await expect(ginestra.getByTestId('stato-mia-azione')).toHaveText('in coda');
  await scrivi(corrado, "anch'io");
  await expect(assenzio.getByTestId('al-tavolo')).toContainText('vado avanti verso la grata');
  await expect(assenzio.getByTestId('al-tavolo')).toContainText("anch'io");
  await expect(assenzio.getByTestId('al-tavolo')).toContainText('Ginestra'); // «con Ginestra»
  await assenzio.screenshot({ path: path.join(SCREENSHOT, 'azioni-al-tavolo.png') });
  await ginestra.getByTestId('ritira-azione').click();
  await expect(corrado.getByTestId('scelta-azione')).toBeVisible({ timeout: 5000 });
  await expect(corrado.getByTestId('scelta-testo')).toContainText('Ginestra ha ritirato');
  await expect(corrado.getByTestId('scelta-conferma')).toHaveText(/Confermo/);
  // Dipendenza rotta: la spinta giusta è «Cambio» (in evidenza), non «Confermo».
  await expect(corrado.getByTestId('scelta-cambio')).toHaveAttribute('data-primario', 'si');
  await expect(corrado.getByTestId('scelta-conferma')).toHaveAttribute('data-primario', 'no');
  await expect(corrado.getByTestId('scelta-testo')).not.toContainText(/conflitto/i);
  await corrado.screenshot({ path: path.join(SCREENSHOT, 'azioni-avviso-dipendenza.png') });
  await corrado.getByTestId('scelta-conferma').click();
  await expect(corrado.getByTestId('scelta-azione')).toBeHidden();
  await expect(corrado.getByTestId('stato-mia-azione')).toHaveText('in coda');

  // --- 2. Conflitto esclusivo (arbitro Haiku): il secondo lo sa subito e cambia azione.
  await scrivi(assenzio, 'mi avvicino a Baldrin e gli sfilo la chiave dal collo');
  await ginestra.waitForTimeout(1500); // oltre la finestra di pareggio: vince chi ha scritto prima
  await scrivi(ginestra, 'la chiave la prendo io, gliela strappo dal collo');
  await expect(ginestra.getByTestId('scelta-azione')).toBeVisible({ timeout: 15_000 });
  await expect(ginestra.getByTestId('scelta-conferma')).toHaveText(/Tengo/);
  await expect(ginestra.getByTestId('scelta-cambio')).toHaveAttribute('data-primario', 'si');
  await expect(ginestra.getByTestId('scelta-testo')).toContainText('Assenzio ha già scritto');
  await ginestra.screenshot({ path: path.join(SCREENSHOT, 'azioni-avviso-conflitto.png') });
  await ginestra.getByTestId('scelta-cambio').click();
  await expect(ginestra.getByTestId('scelta-azione')).toBeHidden();
  await expect(ginestra.getByTestId('testo-azione')).toHaveValue(/chiave la prendo io/); // il testo non si perde
  await scrivi(ginestra, 'tengo alta la lanterna per Assenzio');
  await expect(ginestra.getByTestId('stato-mia-azione')).toHaveText('in coda');

  // Pronti: la finestra si chiude, il narratore (a copione) parla.
  for (const p of [ginestra, corrado, assenzio]) {
    const b = p.getByTestId('pronto');
    if (await b.isEnabled().catch(() => false)) await b.click();
  }
  await attendiFase(schermo, (s) => s.fase === 'narrazione', 20_000, 'narrazione del turno 1');

  // --- 3. Si scrive mentre il narratore parla: l'azione aspetta la finestra dopo.
  await scrivi(assenzio, 'guardo il cane vicino al forno');
  await expect(assenzio.getByTestId('stato-mia-azione')).toHaveText('in coda');
  await expect(ginestra.getByTestId('al-tavolo')).toContainText('guardo il cane');
  await assenzio.screenshot({ path: path.join(SCREENSHOT, 'azioni-durante-narrazione.png') });
  await attendiFase(schermo, (s) => s.fase === 'finestra' && s.turno === 2, 90_000, 'seconda finestra');

  // --- 4. Scelta lasciata scadere: l'azione resta fuori e il testo torna nella casella.
  await scrivi(ginestra, "vado verso la porta d'ingresso");
  await scrivi(corrado, 'la seguo');
  await expect(ginestra.getByTestId('al-tavolo')).toContainText('la seguo');
  await ginestra.getByTestId('ritira-azione').click();
  await expect(corrado.getByTestId('scelta-azione')).toBeVisible({ timeout: 5000 });
  // Nessuno risponde: dopo 10 s dalla prima azione la chiusura è dovuta, si allunga di 8 s, poi «sospesa».
  await expect(corrado.getByTestId('scelta-conto')).toBeVisible({ timeout: 15_000 });
  await corrado.screenshot({ path: path.join(SCREENSHOT, 'azioni-avviso-conto.png') });
  await expect(corrado.getByTestId('stato-mia-azione')).toHaveText('rimasta fuori', { timeout: 30_000 });
  await expect(corrado.getByTestId('motivo-azione')).toContainText('fuori da questo turno');
  await expect(corrado.getByTestId('testo-azione')).toHaveValue('la seguo');
  await corrado.screenshot({ path: path.join(SCREENSHOT, 'azioni-sospesa.png') });

  expect(errori, errori.join('\n')).toEqual([]);
});
