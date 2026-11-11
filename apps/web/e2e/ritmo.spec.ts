/**
 * E2E del turno senza scadenza (richieste di Riccardo del 9 novembre, punti 1, 3, 5 e 7). Server
 * avviato con il narratore a copione e tempi accorciati:
 *   TAGM_PORTA=4710 TAGM_LLM=finto \
 *     TAGM_COPIONE_FINTO=$PWD/apps/server/test/fixtures/copione-ritmo.txt \
 *     TAGM_CONCITATO_MS=8000 TAGM_SORVEGLIANTE_MS=6000 scripts/avvio.sh --mock
 * Proiettore, due telefoni (Ginestra, Corrado) e il pannello del master:
 * 1. ritmo calmo: nessun timer, nemmeno dopo un'azione (oltre i vecchi 10 s); solo «Invia» e «Ritira»;
 *    proiettore e telefoni dicono «Aspettiamo: …»; quando hanno inviato tutti il turno parte da solo;
 * 2. coda senza timer: un'azione scritta mentre il narratore lavora entra nella finestra dopo e non
 *    fa partire nessun conto alla rovescia;
 * 3. `[ritmo] concitato`: conto alla rovescia su telefoni e proiettore, alla scadenza si risolve con
 *    quello che c'è; `[ritmo] calmo` lo toglie;
 * 4. «Risolvi ora» del master, poi il narratore «si appende» ([blocca]): il sorvegliante riprende il
 *    gioco, l'azione torna al giocatore, la causa finisce nel registro.
 * Screenshot in logs/screenshots/ritmo-*.png; nessun errore in console.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { CARTELLA_LOG, SCREENSHOT } from './percorsi';

test.afterEach(async ({ browser }) => {
  for (const contesto of browser.contexts()) await contesto.close();
});

type Salute = { fase: string; turno: number; sessione: string; narratore: string; campagna: string };
const salute = async (p: Page): Promise<Salute> => (await (await p.request.get('/api/salute')).json()) as Salute;

/** Link del pannello dall'ultimo avvio in server.out (il token cambia a ogni avvio). */
function linkMaster(): string {
  const out = fs.readFileSync(path.join(CARTELLA_LOG, 'server.out'), 'utf8');
  const ultimo = out.slice(out.lastIndexOf('=== avvio'));
  const riga = ultimo.split('\n').filter((r) => r.includes('"PANNELLO MASTER"')).at(-1);
  if (!riga) throw new Error('riga PANNELLO MASTER non trovata in server.out');
  return (JSON.parse(riga) as { master: string }).master;
}

/** Righe di narrazioni.jsonl della sessione in corso. */
function narrazioni(sessione: string): Array<Record<string, unknown>> {
  return fs
    .readFileSync(path.join(CARTELLA_LOG, 'narrazioni.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((r) => JSON.parse(r) as Record<string, unknown>)
    .filter((r) => r['sessione'] === sessione);
}

async function telefono(browser: Browser, idPg: string, errori: string[]): Promise<Page> {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  p.on('console', (m) => m.type() === 'error' && errori.push(`[${idPg}] ${m.text()}`));
  p.on('pageerror', (e) => errori.push(`[${idPg}] ${e.message}`));
  await p.goto('/telefono');
  await p.getByTestId(`scelta-pg-${idPg}`).click();
  return p;
}

async function invia(p: Page, testo: string): Promise<void> {
  await p.getByTestId('testo-azione').fill(testo);
  await p.getByTestId('invia-azione').click();
}

test('ritmo: niente timer al calmo, coda senza conto, concitato col conto, Risolvi ora, sorvegliante', async ({ browser }) => {
  test.setTimeout(240_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const foto = (p: Page, nome: string) => p.screenshot({ path: path.join(SCREENSHOT, `ritmo-${nome}.png`) });
  const errori: string[] = [];

  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('console', (m) => m.type() === 'error' && errori.push(`[schermo] ${m.text()}`));
  const s0 = await salute(schermo);
  test.skip(s0.narratore !== 'finto' || s0.campagna !== 'prova-f0', 'avvia prima il server col copione del ritmo (vedi in cima al file)');
  if (s0.fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  await schermo.goto('/schermo');
  const g = await telefono(browser, 'pg_ginestra', errori);
  const c = await telefono(browser, 'pg_corrado', errori);
  const master = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  master.on('console', (m) => m.type() === 'error' && errori.push(`[master] ${m.text()}`));
  await master.goto(linkMaster());
  await schermo.getByTestId('inizia-sessione').click();

  // --- 1. Ritmo calmo: niente timer, solo «Invia» e «Ritira», «Aspettiamo: …».
  await expect.poll(async () => (await salute(schermo)).turno, { timeout: 60_000 }).toBe(1);
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 10_000 }).toBe('finestra');
  const { sessione } = await salute(schermo);
  await expect(g.getByTestId('banner-stato')).toHaveAttribute('data-tipo', 'tocca_a_te');
  await expect(g.getByTestId('aspettiamo')).toHaveText('Aspettiamo: te e Corrado');
  await expect(schermo.getByTestId('schermo-aspettiamo')).toHaveText('Aspettiamo: Ginestra e Corrado');
  await expect(g.getByTestId('pronto')).toHaveCount(0);
  await expect(g.locator('form[aria-label="La tua azione"] button')).toHaveCount(3); // «Privata», «Ritira», «Invia»
  await invia(g, 'Mi avvicino al forno e ascolto.');
  await expect(g.getByTestId('banner-stato')).toHaveAttribute('data-tipo', 'inviata');
  await expect(schermo.getByTestId('schermo-aspettiamo')).toHaveText('Aspettiamo: Corrado');
  // Oltre i vecchi 10 s dopo la prima azione: la finestra resta aperta, nessun conto alla rovescia.
  await schermo.waitForTimeout(12_000);
  expect(await salute(schermo)).toMatchObject({ fase: 'finestra', turno: 1 });
  await expect(g.getByTestId('conto-alla-rovescia')).toHaveCount(0);
  await expect(c.getByTestId('conto-alla-rovescia')).toHaveCount(0);
  await expect(schermo.getByTestId('schermo-conto')).toHaveCount(0);
  await expect(master.getByTestId('master-aspettiamo')).toHaveText('Aspettiamo: Corrado');
  await foto(c, 'calmo-telefono-corrado');
  await foto(g, 'calmo-telefono-ginestra');
  await foto(schermo, 'calmo-proiettore');
  // Corrado invia: hanno inviato tutti, il turno parte da solo dopo l'assestamento.
  const inviatoA = Date.now();
  await invia(c, 'Tengo la porta aperta per Ginestra.');
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 8_000 }).not.toBe('finestra');
  expect(Date.now() - inviatoA).toBeGreaterThanOrEqual(2_000);
  await expect(c.getByTestId('banner-stato')).toContainText(/Il narratore sta (preparando|raccontando)/);

  // --- 2. Coda senza timer: Ginestra scrive mentre il narratore lavora; entra nella finestra dopo.
  await invia(g, 'Mi metto al riparo sotto l’arco.');
  await expect.poll(async () => (await salute(schermo)).turno, { timeout: 60_000 }).toBe(2);
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 30_000 }).toBe('finestra');
  await expect(schermo.getByTestId('schermo-aspettiamo')).toHaveText('Aspettiamo: Corrado');
  await schermo.waitForTimeout(5_000);
  expect(await salute(schermo)).toMatchObject({ fase: 'finestra', turno: 2 });
  await expect(c.getByTestId('conto-alla-rovescia')).toHaveCount(0);
  await expect(c.getByTestId('banner-stato')).toHaveAttribute('data-tipo', 'tocca_a_te');
  await foto(c, 'coda-telefono-corrado');
  await invia(c, 'Guardo il tetto.');

  // --- 3. Il turno 2 chiede il ritmo concitato: conto alla rovescia, poi si risolve con quello che c'è.
  await expect.poll(async () => (await salute(schermo)).turno, { timeout: 60_000 }).toBe(3);
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 30_000 }).toBe('finestra');
  await expect(g.getByTestId('conto-alla-rovescia')).toBeVisible();
  await expect(schermo.getByTestId('schermo-conto')).toBeVisible();
  await expect(schermo.getByTestId('riga-finestra')).toHaveAttribute('data-ritmo', 'concitato');
  await expect(master.getByTestId('master-ritmo-stato')).toHaveText('ritmo concitato');
  await expect(g.getByTestId('banner-stato')).toContainText('Si va di corsa');
  await foto(g, 'concitato-telefono');
  await foto(schermo, 'concitato-proiettore');
  await foto(master, 'concitato-master');
  const apertaConcitata = Date.now();
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 20_000 }).not.toBe('finestra');
  expect(Date.now() - apertaConcitata).toBeGreaterThanOrEqual(5_000);
  // Il turno 3 torna al ritmo calmo: niente conto alla rovescia.
  await expect.poll(async () => (await salute(schermo)).turno, { timeout: 60_000 }).toBe(4);
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 30_000 }).toBe('finestra');
  await expect(schermo.getByTestId('riga-finestra')).toHaveAttribute('data-ritmo', 'calmo');
  await expect(g.getByTestId('conto-alla-rovescia')).toHaveCount(0);

  // --- 4. «Risolvi ora» con un'azione sola, poi il narratore si appende: riprende il sorvegliante.
  await invia(g, 'Cerco Ottavia tra la folla.');
  await expect(master.getByTestId('master-aspettiamo')).toHaveText('Aspettiamo: Corrado');
  await master.getByTestId('master-chiudi-finestra').click();
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 5_000 }).toBe('narrazione');
  await expect(g.getByTestId('banner-stato')).toContainText('Il narratore sta preparando');
  await foto(g, 'prepara-telefono');
  const bloccatoA = Date.now();
  await expect.poll(async () => (await salute(schermo)).turno, { timeout: 30_000 }).toBe(5);
  await expect.poll(async () => (await salute(schermo)).fase, { timeout: 5_000 }).toBe('finestra');
  expect(Date.now() - bloccatoA).toBeGreaterThanOrEqual(4_000);
  await expect(g.getByTestId('stato-mia-azione')).toHaveText('non è andata');
  await expect(g.getByTestId('motivo-azione')).toContainText('Il narratore si è bloccato');
  await expect(g.getByTestId('testo-azione')).toHaveValue('Cerco Ottavia tra la folla.');
  await foto(g, 'sorvegliante-telefono');
  await foto(schermo, 'sorvegliante-proiettore');

  // Registro: chiusure giuste e la causa del blocco.
  const righe = narrazioni(sessione);
  const turni = righe.filter((r) => r['tipo'] === 'turno');
  expect(turni.slice(0, 3).map((r) => r['chiusura'])).toEqual(['tutti_inviato', 'tutti_inviato', 'scadenza']);
  // Il sorvegliante interviene solo sul turno bloccato: l'apertura (frasi lunghe della voce) va fino in fondo.
  const blocchi = righe.filter((r) => r['tipo'] === 'sorvegliante');
  expect(blocchi).toHaveLength(1);
  expect(blocchi[0]).toMatchObject({ turno: 4, fase: 'narrazione', causa: 'il modello non risponde' });
  expect(errori, errori.join('\n')).toEqual([]);
});
