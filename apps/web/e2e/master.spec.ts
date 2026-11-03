/**
 * E2E del pannello del master (docs/architettura.md, «Pannello master»): pannello + proiettore +
 * due telefoni sul server vero. Server avviato con le immagini della campagna e voce finta:
 *   CANTASTORIE_PORTA=4710 CANTASTORIE_LLM=finto scripts/avvio.sh --mock          (oppure col narratore Haiku vero)
 *   npx playwright test -c apps/web/playwright.config.ts master
 *
 * Il token si legge dal log del server (riga «PANNELLO MASTER» dell'ultimo avvio), come farebbe il
 * master sul Mac. Scenari: un telefono non entra nel pannello; nota di regia che entra nel
 * messaggio del narratore (riga di log); pausa chiesta durante la narrazione (la narrazione finisce,
 * nessuna finestra); ripresa; orologio avanti; cambio di luogo con dissolvenza sul proiettore;
 * freno d'emergenza a metà narrazione; azione saltata; modalità «senza spoiler» attiva per default
 * (orologi senza testi, azione privata coperta), interruttore che mostra tutto e resta salvato.
 * Screenshot in logs/screenshots/master-*.png; nessun errore in console.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { CARTELLA_LOG } from './percorsi';

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
const SCREENSHOT = path.join(RADICE, 'logs', 'screenshots');
const LOG_SERVER = path.join(CARTELLA_LOG, 'server.jsonl');
const NOTA = 'Ogni frase al massimo otto parole.';

type Debug = { immagine: string | null; transizioni: number };
const debug = (p: Page) => p.evaluate(() => (window as unknown as { __schermoDebug: Debug }).__schermoDebug);
const salute = async (p: Page) => (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number; schermo: boolean };

/** Link del pannello dall'ultimo avvio in logs/server.out (il token cambia a ogni avvio). */
function linkMaster(): string {
  const out = fs.readFileSync(path.join(CARTELLA_LOG, 'server.out'), 'utf8');
  const ultimo = out.slice(out.lastIndexOf('=== avvio'));
  const riga = ultimo.split('\n').filter((r) => r.includes('"PANNELLO MASTER"')).at(-1);
  if (!riga) throw new Error('riga PANNELLO MASTER non trovata in logs/server.out');
  return (JSON.parse(riga) as { master: string }).master;
}

/** Righe di logs/server.jsonl con questo messaggio, scritte dopo `daRiga`. */
function righeLog(msg: string, daRiga: number): Array<Record<string, unknown>> {
  return fs
    .readFileSync(LOG_SERVER, 'utf8')
    .split('\n')
    .slice(daRiga)
    .filter((r) => r.includes(msg))
    .map((r) => JSON.parse(r) as Record<string, unknown>);
}
const righeLogAdesso = (): number => fs.readFileSync(LOG_SERVER, 'utf8').split('\n').length - 1;

async function telefono(browser: Browser, nome: string, errori: string[]): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('console', (m) => m.type() === 'error' && errori.push(`[${nome}] ${m.text()}`));
  p.on('pageerror', (e) => errori.push(`[${nome}] ${e.message}`));
  await p.goto('/telefono');
  return p;
}

async function scrivi(p: Page, testo: string): Promise<void> {
  await p.getByTestId('testo-azione').fill(testo);
  await p.getByTestId('invia-azione').click();
}

test('pannello del master: nota, pausa, ripresa, orologio, luogo, freno, salto', async ({ browser }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(SCREENSHOT, { recursive: true });
  const errori: string[] = [];
  const foto = (p: Page, nome: string) => p.screenshot({ path: path.join(SCREENSHOT, `master-${nome}.png`) });

  // --- Proiettore e scena da capo.
  const schermo = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  schermo.on('console', (m) => m.type() === 'error' && errori.push(`[schermo] ${m.text()}`));
  schermo.on('pageerror', (e) => errori.push(`[schermo] ${e.message}`));
  // Nota: se il proiettore di una prova precedente è ancora collegato (le prove con `browser` non
  // chiudono i loro contesti), «ricomincia» riparte subito dall'apertura: va bene lo stesso.
  if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
  const solo = !(await salute(schermo)).schermo;
  await schermo.request.post('/api/scena/luogo', { data: { luogo: 'scena_forno_vecchio' } });
  await schermo.goto('/schermo');

  // --- Un telefono prova a entrare nel pannello con un token inventato: rifiutato.
  const ginestra = await telefono(browser, 'ginestra', errori);
  const rifiuto = await ginestra.evaluate(
    () =>
      new Promise<unknown>((risolvi) => {
        // Socket.IO a mano (protocollo v4), come farebbe uno smanettone dalla console del telefono.
        const ws = new WebSocket(`${location.origin.replace('http', 'ws')}/socket.io/?EIO=4&transport=websocket`);
        ws.onmessage = (e) => {
          const d = String(e.data);
          if (d.startsWith('0')) ws.send('40');
          else if (d.startsWith('40')) ws.send('421["master:entra",{"token":"indovinato_a_caso_123"}]');
          else if (d.startsWith('431')) {
            risolvi(JSON.parse(d.slice(3)));
            ws.close();
          }
        };
      }),
  );
  expect(rifiuto).toMatchObject([{ ok: false }]);

  // --- Pannello del master col link del log: il token sparisce dalla barra.
  const master = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  master.on('console', (m) => m.type() === 'error' && errori.push(`[master] ${m.text()}`));
  master.on('pageerror', (e) => errori.push(`[master] ${e.message}`));
  await master.goto(linkMaster().replace(/^http:\/\/localhost:\d+/, ''));
  await expect(master.getByTestId('pagina-master')).toHaveAttribute('data-entrata', 'dentro', { timeout: 10_000 });
  expect(master.url()).not.toContain('token=');
  if (solo) await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'attesa');

  // --- Due telefoni scelgono il PG; il proiettore avvia la sessione.
  await ginestra.getByTestId('scelta-pg-pg_ginestra').click();
  const corrado = await telefono(browser, 'corrado', errori);
  await corrado.getByTestId('scelta-pg-pg_corrado').click();
  await schermo.getByTestId('inizia-sessione').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 90_000 });

  // --- Senza spoiler per default: l'orologio dice solo «segni 0/6», niente nome né segni.
  await expect(master.getByTestId('pagina-master')).toHaveAttribute('data-senza-spoiler', 'true');
  await expect(master.getByTestId('master-spoiler')).toHaveAttribute('data-attivo', 'true');
  const orologioCoperto = master.getByTestId('master-orologio-o_colpevole');
  await expect(master.getByTestId('master-orologio-o_colpevole-segni')).toHaveText(/^segni \d\/6$/);
  await expect(orologioCoperto).toContainText('Orologio 1');
  await expect(orologioCoperto).not.toContainText('colpevole');
  await expect(orologioCoperto).not.toContainText('Dalla cappella');
  await expect(orologioCoperto).not.toContainText('a orologio completo');

  // --- Nota di regia: compare nel pannello.
  await master.getByTestId('master-nota-testo').fill(NOTA);
  await master.getByTestId('master-nota-turni').fill('15');
  await master.getByTestId('master-nota-invia').click();
  await expect(master.getByTestId('master-note')).toContainText(NOTA);
  await foto(master, 'pannello-finestra');

  // --- Turno 1: Ginestra agisce, il master chiude la finestra e chiede la pausa durante la narrazione.
  const daRiga = righeLogAdesso();
  await scrivi(ginestra, 'Saluto l’ostessa e ordino una zuppa.');
  await expect(master.getByTestId('master-azioni')).toContainText('Saluto l’ostessa');
  await master.getByTestId('master-chiudi-finestra').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'narrazione', { timeout: 10_000 });
  await master.getByTestId('master-pausa').click();
  await expect(master.getByTestId('master-stato-pausa')).toHaveAttribute('data-richiesta', 'true');
  await foto(master, 'pausa-chiesta');
  // La narrazione finisce (il proiettore parla), poi il tavolo si ferma senza aprire la finestra.
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'pausa', { timeout: 120_000 });
  await expect(ginestra.getByTestId('banner-stato')).toHaveAttribute('data-tipo', 'pausa');
  await expect(corrado.getByTestId('banner-stato')).toContainText('Tavolo in pausa');
  await expect(schermo.getByTestId('riga-finestra')).toHaveText('Tavolo in pausa', { timeout: 15_000 });
  expect((await salute(master)).fase).toBe('pausa');
  await foto(schermo, 'proiettore-pausa');
  await foto(corrado, 'telefono-pausa');
  // La nota è entrata nel messaggio del narratore (riga di log scritta dal Motore).
  const note = righeLog('narratore: note di regia nel messaggio', daRiga);
  expect(note.length).toBeGreaterThan(0);
  expect(JSON.stringify(note[0]!['note'])).toContain(NOTA);
  expect(note[0]!['nel_messaggio']).toBe(true);
  await master.waitForTimeout(1500);
  expect((await salute(master)).fase).toBe('pausa'); // nessuna finestra si apre da sola

  // --- Orologio avanti di un segno.
  const orologio = master.getByTestId('master-orologio-o_colpevole');
  const pieni = Number(await orologio.getAttribute('data-pieni'));
  await master.getByTestId('master-orologio-o_colpevole-avanti').click();
  await expect(orologio).toHaveAttribute('data-pieni', String(pieni + 1));

  // --- Cambio di luogo dal pannello: dissolvenza sul proiettore.
  const prima = (await debug(schermo)).transizioni;
  await master.getByTestId('master-luogo-n_piazza').click();
  await expect(master.getByTestId('master-luogo-corrente')).toHaveAttribute('data-luogo', 'n_piazza');
  await schermo.waitForTimeout(600);
  await foto(schermo, 'proiettore-dissolvenza');
  await expect.poll(async () => (await debug(schermo)).transizioni, { timeout: 10_000 }).toBeGreaterThan(prima);
  await expect(schermo.getByTestId('sfondo-immagine')).toHaveAttribute('data-src', '/api/immagini/luogo_n_piazza.jpg');
  await foto(master, 'pannello-pausa');

  // --- Ripresa: si apre la finestra.
  await master.getByTestId('master-riprendi').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 10_000 });

  // --- Freno d'emergenza a metà narrazione.
  await scrivi(corrado, 'Chiedo a Baldrin del grano.');
  await expect(master.getByTestId('master-azioni')).toContainText('Chiedo a Baldrin');
  await master.getByTestId('master-chiudi-finestra').click();
  await expect(schermo.getByTestId('sottotitolo')).not.toHaveText('', { timeout: 30_000 }); // la voce parla
  await foto(schermo, 'proiettore-prima-del-freno');
  await master.getByTestId('master-ferma-narrazione').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'pausa', { timeout: 5_000 });
  await expect(schermo.getByTestId('sottotitolo')).toHaveText('', { timeout: 5_000 }); // lo schermo tace
  await expect(corrado.getByTestId('stato-mia-azione')).toHaveAttribute('data-stato', 'superata');
  await expect(corrado.getByTestId('motivo-azione')).toContainText('interrotto la narrazione');
  await expect(master.getByTestId('master-trascrizione')).toContainText('Il master ha interrotto la narrazione.');
  await foto(master, 'pannello-freno');
  await foto(corrado, 'telefono-freno');

  // --- In pausa Ginestra scrive in privato; alla ripresa il master salta la sua azione.
  await ginestra.getByTestId('azione-privata').click();
  await scrivi(ginestra, 'Frugo di nascosto nella borsa del nano.');
  await master.getByTestId('master-riprendi').click();
  await expect(master.getByTestId('master-fase')).toHaveAttribute('data-fase', 'finestra', { timeout: 10_000 });
  // Senza spoiler: autore e stato sì, il contenuto dell'azione privata no.
  const riga = master.locator('[data-testid^="master-azione-"][data-privata="true"][data-stato="in_coda"]');
  await expect(riga).toHaveCount(1);
  await expect(riga).toContainText('Ginestra');
  await expect(riga).not.toContainText('Frugo di nascosto');
  const id = ((await riga.getAttribute('data-testid')) ?? '').replace('master-azione-', '');
  await expect(master.getByTestId(`master-azione-${id}-nascosta`)).toBeVisible();
  await foto(master, 'pannello-senza-spoiler');
  // L'interruttore mostra tutto: testo privato, nome e segni dell'orologio.
  await master.getByTestId('master-spoiler').click();
  await expect(master.getByTestId('pagina-master')).toHaveAttribute('data-senza-spoiler', 'false');
  await expect(riga).toContainText('Frugo di nascosto');
  await expect(master.getByTestId('master-orologio-o_colpevole')).toContainText('Il paese vuole un colpevole');
  await expect(master.getByTestId('master-orologio-o_colpevole')).toContainText('Dalla cappella');
  await foto(master, 'pannello-azione');
  // La scelta resta dopo un ricaricamento.
  await master.reload();
  await expect(master.getByTestId('pagina-master')).toHaveAttribute('data-entrata', 'dentro', { timeout: 10_000 });
  await expect(master.getByTestId('pagina-master')).toHaveAttribute('data-senza-spoiler', 'false');
  await master.getByTestId(`master-salta-${id}`).click();
  await expect(ginestra.getByTestId('stato-mia-azione')).toHaveAttribute('data-stato', 'superata');
  await expect(ginestra.getByTestId('motivo-azione')).toContainText('Il master ha saltato');
  await expect(master.getByTestId('master-eventi')).toContainText('Salta azione');
  await foto(ginestra, 'telefono-saltata');
  await foto(master, 'pannello-fine');

  // Riordino: luogo iniziale per le prove successive.
  await master.getByTestId('master-luogo-scena_forno_vecchio').click();
  expect(errori, errori.join('\n')).toEqual([]);
  // Chiude i suoi contesti: un proiettore rimasto collegato farebbe ripartire la scena alla prova dopo.
  for (const p of [schermo, master, ginestra, corrado]) await p.context().close();
});
