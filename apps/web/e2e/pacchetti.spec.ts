/**
 * E2E delle campagne a più sessioni (docs/strati.md, D2) su un'istanza di PROVA (mai la 4610):
 *   npx playwright test -c apps/web/playwright.config.ts pacchetti
 *
 * La prova avvia da sé il server di prova sulla fixture «arco» (due sessioni) copiata in
 * logs/porta-<porta>/, col narratore a copione e un archivio nuovo; alla fine lo riavvia com'era
 * (prova-f0, narratore a copione) per le altre prove.
 *
 * Proiettore, telefono di Anna e pannello: un turno della sessione 01, «Fine sessione» (gioco fermo,
 * registro.yaml scritto nel pacchetto), «Prossima sessione»: il server si ricostruisce sulla 02, il
 * pannello si ricollega da solo (stesso token), il proiettore riparte dal riassunto della 02 e il
 * telefono ritrova Anna senza sceglierla. Screenshot in logs/screenshots/pacchetti-*.png.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { CARTELLA_LOG, RADICE, SCREENSHOT, URL_PROVE } from './percorsi';

const PORTA = new URL(URL_PROVE).port;
const COPIA = path.join(CARTELLA_LOG, 'arco-e2e');
const ARCHIVIO = path.join(CARTELLA_LOG, 'arco-e2e.sqlite');

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

function avviaServerDiProva(env: Record<string, string>): void {
  execFileSync(path.join(RADICE, 'scripts', 'avvio.sh'), ['--mock'], {
    cwd: RADICE,
    env: { ...process.env, CANTASTORIE_PORTA: PORTA, CANTASTORIE_LLM: 'finto', ...env },
    stdio: 'pipe',
    timeout: 240_000,
  });
}

test.afterAll(() => {
  if (PORTA === '4610') return;
  // Le altre prove si aspettano l'istanza di prova com'è di solito.
  avviaServerDiProva({ CANTASTORIE_NUOVA_SESSIONE: '1' });
});

function linkMaster(): string {
  const out = fs.readFileSync(path.join(CARTELLA_LOG, 'server.out'), 'utf8');
  const riga = out.slice(out.lastIndexOf('=== avvio')).split('\n').filter((r) => r.includes('"PANNELLO MASTER"')).at(-1);
  if (!riga) throw new Error('riga PANNELLO MASTER non trovata');
  return (JSON.parse(riga) as { master: string }).master.replace(/^http:\/\/localhost:\d+/, '');
}

/** Clic che arma la conferma, poi il secondo che esegue (useConferma). */
async function conferma(p: Page, testId: string): Promise<void> {
  await p.getByTestId(testId).click();
  await expect(p.getByTestId(testId)).toHaveAttribute('data-conferma', 'true');
  await p.getByTestId(testId).click();
}

test('due sessioni: fine sessione col registro, prossima sessione dal riassunto, il telefono tiene il PG', async ({ browser }) => {
  test.skip(PORTA === '4610', 'mai riavviare la partita vera: usa un server di prova (CANTASTORIE_PORTA=4710)');
  test.setTimeout(480_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  fs.rmSync(COPIA, { recursive: true, force: true });
  for (const f of [ARCHIVIO, `${ARCHIVIO}-wal`, `${ARCHIVIO}-shm`]) fs.rmSync(f, { force: true });
  fs.cpSync(path.join(RADICE, 'apps', 'server', 'test', 'fixtures', 'campagne', 'arco'), COPIA, { recursive: true });
  avviaServerDiProva({ CANTASTORIE_CARTELLA_CAMPAGNA: COPIA, CANTASTORIE_SESSIONI: ARCHIVIO, CANTASTORIE_MODO: 'improvvisa', CANTASTORIE_NUOVA_SESSIONE: '1' });

  const errori: string[] = [];
  const foto = (p: Page, nome: string) => p.screenshot({ path: path.join(SCREENSHOT, `pacchetti-${nome}.png`), fullPage: nome.startsWith('master') });
  const osserva = (p: Page, nome: string) => {
    // Durante la ricostruzione del server la connessione cade per qualche secondo: quegli errori sono attesi.
    p.on('console', (m) => m.type() === 'error' && !/WebSocket|ERR_CONNECTION|socket\.io|Failed to load resource/i.test(m.text()) && errori.push(`[${nome}] ${m.text()}`));
    p.on('pageerror', (e) => errori.push(`[${nome}] ${e.message}`));
  };

  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  osserva(schermo, 'schermo');
  const salute = (await (await schermo.request.get('/api/salute')).json()) as { campagna: string; pacchetto: string | null };
  expect(salute).toMatchObject({ campagna: 'arco', pacchetto: '01' });
  await schermo.goto('/schermo');
  const tel = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  osserva(tel, 'telefono');
  await tel.goto('/telefono');
  await tel.getByTestId('scelta-pg-pg_anna').click();
  await expect(tel.getByTestId('nome-pg')).toContainText('Anna');
  const master = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  osserva(master, 'master');
  await master.goto(linkMaster());
  await expect(master.getByTestId('pagina-master')).toHaveAttribute('data-entrata', 'dentro', { timeout: 10_000 });
  await expect(master.getByTestId('master-pacchetto')).toHaveText('Sessione 01 di 2 · La locanda');
  await expect(master.getByTestId('master-prossima-sessione')).toBeEnabled();
  await expect(master.getByTestId('master-prossima-sessione')).toHaveText('Prossima: sessione 02 · Il guado');

  // --- Sessione 01: apertura col riassunto, un turno.
  await schermo.getByTestId('inizia-sessione').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 90_000 });
  await expect(tel.getByTestId('trascrizione')).toContainText('Piove da tre giorni sulla valle.');
  await tel.getByTestId('testo-azione').fill('Guardo dietro il banco.');
  await tel.getByTestId('invia-azione').click();
  await tel.getByTestId('pronto').click();
  await expect(master.getByTestId('master-turno')).toContainText('turno 2', { timeout: 90_000 });
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 90_000 });
  await foto(master, 'master-01');

  // --- Fine sessione: gioco fermo, registro nel pacchetto 01.
  await conferma(master, 'master-fine-sessione');
  await expect(master.getByTestId('master-sessione-registro')).toContainText('sessioni/01/registro.yaml', { timeout: 15_000 });
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'fermata');
  await expect(tel.getByTestId('trascrizione')).toContainText('Fine della sessione.');
  const registro = fs.readFileSync(path.join(COPIA, 'sessioni', '01', 'registro.yaml'), 'utf8');
  expect(registro).toContain('motivo_chiusura: fine sessione');
  expect(registro).toContain('Guardo dietro il banco.');
  expect(fs.existsSync(path.join(COPIA, 'sessioni', '01', 'trascrizione.yaml'))).toBe(true);
  await expect(master.getByTestId('master-fine-sessione')).toBeDisabled();
  await expect(master.getByTestId('master-sessione-inizio')).toContainText('chiusa con «Fine sessione»');
  await foto(master, 'master-fine');

  // --- Prossima sessione: il server si ricostruisce sulla 02; tutti si ricollegano da soli.
  await conferma(master, 'master-prossima-sessione');
  await expect(master.getByTestId('master-pacchetto')).toHaveText('Sessione 02 di 2 · Il guado', { timeout: 60_000 });
  // Il proiettore era sbloccato: rientra e la 02 comincia dal suo riassunto.
  await expect(tel.getByTestId('trascrizione')).toContainText("Nella sessione precedente l'oste ha confessato.", { timeout: 60_000 });
  await expect(tel.getByTestId('nome-pg')).toContainText('Anna'); // ritrovata, senza sceglierla
  await expect(tel.getByTestId('trascrizione')).not.toContainText('Guardo dietro il banco.'); // sessione nuova
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 90_000 });
  await expect(master.getByTestId('master-prossima-sessione')).toBeDisabled(); // dopo la 02 non c'è niente
  await expect(master.getByTestId('master-prossima-motivo')).toContainText('ultima sessione preparata');
  await expect(master.getByTestId('master-telefono')).toHaveCount(1);
  await expect(master.getByTestId('master-telefono-pg')).toHaveValue('pg_anna');
  const salute2 = (await (await schermo.request.get('/api/salute')).json()) as { pacchetto: string | null };
  expect(salute2.pacchetto).toBe('02');
  await foto(master, 'master-02');
  await foto(schermo, 'proiettore-02');
  await foto(tel, 'telefono-02');
  expect(errori, errori.join('\n')).toEqual([]);
});
