/**
 * Prova «come un utente» della serata: server avviato con lo script della partita
 *   CANTASTORIE_PORTA=4710 scripts/partita.sh ponte-lanterne            (modo B, voce finta, Haiku VERO)
 *   npx playwright test -c apps/web/playwright.config.ts partita
 *
 * Proiettore + due telefoni (390x844) + pannello del master, aperti con gli indirizzi che lo script
 * stampa (logs/partita.out). Due turni giocati scrivendo dai telefoni, poi il master passa al Borgo
 * Basso dal pannello e la scena nuova si apre. Costo: due o tre turni di Haiku.
 * Screenshot in logs/screenshots/partita-*.png; nessun errore in console.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { CARTELLA_LOG } from './percorsi';

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
const SCREENSHOT = path.join(RADICE, 'logs', 'screenshots');

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

/** Indirizzo stampato da scripts/partita.sh (riga «  PANNELLO…» seguita dal link). */
function linkMasterDallaPartita(): string {
  const out = fs.readFileSync(path.join(CARTELLA_LOG, 'partita.out'), 'utf8');
  const riga = out.split('\n').find((r) => r.startsWith('  Master:'));
  if (!riga) throw new Error('logs/partita.out senza il link del master: avvia scripts/partita.sh');
  return riga.trim().split(/\s+/)[1]!.replace(/^http:\/\/localhost:\d+/, '');
}

/** Telefono «vero»: apre l'indirizzo di rete stampato dallo script (IP del Mac in LAN), non localhost. */
async function telefono(browser: Browser, url: string, nome: string, errori: string[]): Promise<Page> {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  p.on('console', (m) => m.type() === 'error' && errori.push(`[${nome}] ${m.text()}`));
  p.on('pageerror', (e) => errori.push(`[${nome}] ${e.message}`));
  await p.goto(url);
  return p;
}

async function agisci(p: Page, testo: string): Promise<void> {
  await p.getByTestId('testo-azione').fill(testo);
  await p.getByTestId('invia-azione').click();
}

test('serata: proiettore, due telefoni e master; due turni e un cambio di scena', async ({ browser }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: string[] = [];
  const foto = (p: Page, nome: string) => p.screenshot({ path: path.join(SCREENSHOT, `partita-${nome}.png`) });

  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('console', (m) => m.type() === 'error' && errori.push(`[schermo] ${m.text()}`));
  const salute = (await (await schermo.request.get('/api/salute')).json()) as { campagna: string; modo: string; narratore: string; fase: string };
  test.skip(salute.campagna !== 'ponte-lanterne', 'avvia prima: scripts/partita.sh ponte-lanterne');
  expect(salute).toMatchObject({ modo: 'repertorio', narratore: 'haiku' });
  // Un proiettore già aperto in un browser vero si ricollega da solo e fa partire la scena: si
  // riparte dall'apertura (con uno schermo collegato «ricomincia» la legge subito).
  if (salute.fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');

  const master = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  master.on('console', (m) => m.type() === 'error' && errori.push(`[master] ${m.text()}`));
  await master.goto(linkMasterDallaPartita());
  await expect(master.getByTestId('pagina-master')).toHaveAttribute('data-entrata', 'dentro', { timeout: 10_000 });

  const info = (await (await schermo.request.get('/api/info')).json()) as { url_telefono: string };
  expect(info.url_telefono).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+\/telefono$/);
  const dalia = await telefono(browser, info.url_telefono, 'dalia', errori);
  await dalia.getByTestId('scelta-pg-pg_dalia').click();
  const arrigo = await telefono(browser, info.url_telefono, 'arrigo', errori);
  await arrigo.getByTestId('scelta-pg-pg_arrigo').click();
  await foto(schermo, 'proiettore-attesa');
  await schermo.getByTestId('inizia-sessione').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 120_000 });
  await foto(dalia, 'telefono-dalia-tocca');

  // Turno 1 e 2: entrambi agiscono (inviare = pronto: quando hanno inviato tutti il turno parte).
  const turni = [
    ['Mi sporgo dal parapetto con una lanterna e guardo il leone di pietra.', 'Chiedo al vecchio del casello quanta gente è rimasta nel Borgo.'],
    ['Conto le persone sulla rampa e le metto in fila per la barca.', 'Tengo ferma la catena e chiedo a Tullio di aspettare.'],
  ];
  for (const [i, [a, b]] of turni.entries()) {
    await agisci(dalia, a!);
    await agisci(arrigo, b!);
    await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'narrazione', { timeout: 20_000 });
    await expect(schermo.getByTestId('sottotitolo')).not.toHaveText('', { timeout: 30_000 });
    await foto(schermo, `proiettore-turno${i + 1}`);
    await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 150_000 });
  }
  await foto(dalia, 'telefono-dalia-dopo2');
  await foto(arrigo, 'telefono-arrigo-dopo2');
  await foto(master, 'master-dopo2');

  // Il master passa al Borgo Basso dal pannello.
  await master.getByTestId('master-scena-scena_borgo_basso').click();
  await expect(schermo.getByTestId('titolo-scena')).toHaveText("Il Borgo Basso sott'acqua", { timeout: 10_000 });
  await expect(schermo.getByTestId('sottotitolo')).not.toHaveText('', { timeout: 20_000 });
  await foto(schermo, 'proiettore-borgo');
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 120_000 });
  await foto(master, 'master-borgo');
  await foto(arrigo, 'telefono-arrigo-borgo');
  expect(errori, errori.join('\n')).toEqual([]);
});
