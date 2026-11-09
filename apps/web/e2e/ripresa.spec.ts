/**
 * E2E della partita salvata (persistenza della sessione) su un'istanza di PROVA:
 *   CANTASTORIE_PORTA=4710 CANTASTORIE_LLM=finto scripts/avvio.sh --mock
 *   npx playwright test -c apps/web/playwright.config.ts ripresa
 *
 * Due turni giocati da proiettore, telefono e pannello; poi la prova RIAVVIA il server di prova
 * (mai la 4610: lì gioca Riccardo) chiedendo di riprendere la sessione. Il telefono si ricollega
 * da solo e ritrova il suo PG, il proiettore riparte senza rileggere l'apertura, il pannello dice
 * da che turno si riprende, e il turno 3 si gioca. Screenshot in logs/screenshots/ripresa-*.png.
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

function linkMaster(): string {
  const out = fs.readFileSync(path.join(CARTELLA_LOG, 'server.out'), 'utf8');
  const riga = out.slice(out.lastIndexOf('=== avvio')).split('\n').filter((r) => r.includes('"PANNELLO MASTER"')).at(-1);
  if (!riga) throw new Error('riga PANNELLO MASTER non trovata');
  return (JSON.parse(riga) as { master: string }).master.replace(/^http:\/\/localhost:\d+/, '');
}

/** Riavvia il server di prova chiedendo di riprendere la sessione (stessa configurazione della prova). */
function riavviaServerDiProva(): void {
  execFileSync(path.join(RADICE, 'scripts', 'avvio.sh'), ['--mock'], {
    cwd: RADICE,
    env: { ...process.env, CANTASTORIE_PORTA: PORTA, CANTASTORIE_LLM: 'finto', CANTASTORIE_NUOVA_SESSIONE: '0' },
    stdio: 'pipe',
    timeout: 240_000,
  });
}

async function agisci(p: Page, testo: string): Promise<void> {
  await p.getByTestId('testo-azione').fill(testo);
  await p.getByTestId('invia-azione').click();
}

test('partita salvata: due turni, riavvio del server, il telefono tiene il PG, il turno 3 continua', async ({ browser }) => {
  test.skip(PORTA === '4610', 'mai riavviare la partita vera: usa un server di prova (CANTASTORIE_PORTA=4710)');
  test.setTimeout(420_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: string[] = [];
  const foto = (p: Page, nome: string) => p.screenshot({ path: path.join(SCREENSHOT, `ripresa-${nome}.png`) });
  const osserva = (p: Page, nome: string) => {
    // Durante il riavvio la connessione cade per qualche secondo: quegli errori di rete sono attesi.
    p.on('console', (m) => m.type() === 'error' && !/WebSocket|ERR_CONNECTION|socket\.io|Failed to load resource/i.test(m.text()) && errori.push(`[${nome}] ${m.text()}`));
    p.on('pageerror', (e) => errori.push(`[${nome}] ${e.message}`));
  };

  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  osserva(schermo, 'schermo');
  const salute = (await (await schermo.request.get('/api/salute')).json()) as { fase: string; narratore: string };
  test.skip(salute.narratore !== 'finto', 'avvia il server di prova col narratore a copione (CANTASTORIE_LLM=finto)');
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

  // --- Due turni.
  await schermo.getByTestId('inizia-sessione').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 90_000 });
  await master.getByTestId('master-nota-testo').fill('Frasi corte.');
  await master.getByTestId('master-nota-invia').click();
  await expect(master.getByTestId('master-note')).toContainText('Frasi corte.');
  for (const [n, testo] of [[2, 'Saluto l’ostessa.'], [3, 'Chiedo del pane.']] as const) {
    await agisci(tel, testo);
    await expect(master.getByTestId('master-turno')).toContainText(`turno ${n}`, { timeout: 90_000 });
    await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 90_000 });
  }
  const trascrizionePrima = (await tel.getByTestId('trascrizione').innerText()).trim();
  expect(trascrizionePrima).toContain('Chiedo del pane.');
  await foto(master, 'prima');

  // --- Riavvio del server di prova (la 4610 non si tocca).
  riavviaServerDiProva();

  // Il telefono si ricollega da solo e ritrova Ginestra (token del dispositivo), senza sceglierla di
  // nuovo: lo si vede dalla voce di sistema della ripresa, che arriva solo dal server nuovo.
  await expect(tel.getByTestId('trascrizione')).toContainText('La sessione riprende da dove si era fermata.', { timeout: 30_000 });
  await expect(tel.getByTestId('nome-pg')).toContainText('Ginestra');
  await expect(tel.getByTestId('trascrizione')).toContainText('Chiedo del pane.');
  await expect(tel.getByTestId('banner-stato')).toHaveAttribute('data-tipo', /tocca_a_te|non_chiamato/);
  await expect(tel.getByTestId('trascrizione')).not.toContainText('Scena fermata'); // lo spegnimento non è uno stop
  // Il proiettore era sbloccato: rientra e la sessione riparte da sola, senza rileggere l'apertura.
  await expect(schermo.getByTestId('riga-finestra')).toContainText(/Tocca a|Ginestra/, { timeout: 30_000 });
  await foto(schermo, 'proiettore-dopo');
  await foto(tel, 'telefono-dopo');

  // Il pannello (token nuovo: si riapre col link nuovo) dice da che turno si è ripreso.
  await master.goto(linkMaster());
  await expect(master.getByTestId('pagina-master')).toHaveAttribute('data-entrata', 'dentro', { timeout: 10_000 });
  await expect(master.getByTestId('master-sessione-ripresa')).toContainText('dal turno 3');
  await expect(master.getByTestId('master-note')).toContainText('Frasi corte.');
  await expect(master.getByTestId('master-turno')).toContainText('turno 3');
  await expect(master.getByTestId('master-trascrizione')).toContainText('La sessione riprende da dove si era fermata.');
  await foto(master, 'dopo');

  // --- Turno 3.
  await agisci(tel, 'Mi siedo vicino al fuoco.');
  await expect(master.getByTestId('master-turno')).toContainText('turno 4', { timeout: 90_000 });
  await expect(tel.getByTestId('trascrizione')).toContainText('Mi siedo vicino al fuoco.');
  // L'apertura c'è una volta sola (non è stata riletta).
  const testo = await tel.getByTestId('trascrizione').innerText();
  const apertura = 'È la Notte dei Lumi';
  expect(testo.split(apertura).length - 1).toBe(1);
  await foto(tel, 'telefono-turno3');
  expect(errori, errori.join('\n')).toEqual([]);
});
