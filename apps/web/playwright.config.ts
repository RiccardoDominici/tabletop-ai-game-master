/**
 * Playwright per l'e2e di F0 (apps/web/e2e). Il server NON viene avviato da qui: lo avvia
 * scripts/avvio.sh su una PORTA DI PROVA (la 4610 è la partita vera, magari in corso), poi:
 *   TAGM_PORTA=4710 TAGM_TIRI_GIOCATORI=automatico scripts/avvio.sh --finto --mock
 *   (automatic rolls: with the campaign default, manual rolls, a check would wait for a die no spec enters;
 *   e2e/tiri-manuali.spec.ts tests manual rolls with its own server line)
 *   npm run e2e                      (un turno, contro http://localhost:4710)
 *   E2E_TURNI=5 npm run e2e          (cinque turni, per le misure di latenza)
 *   TAGM_PORTA=4710 scripts/arresto.sh
 * Un'altra porta: E2E_PORTA=4720 (o E2E_URL); i log si leggono da logs/porta-<porta>/.
 *
 * Chromium: se la build attesa da questa versione di Playwright non è installata, si usa la più
 * recente già presente in ~/Library/Caches/ms-playwright (oppure TAGM_CHROMIUM).
 */
import path from 'node:path';
import { defineConfig } from '@playwright/test';
import { chromiumDisponibile, URL_PROVE } from './e2e/percorsi';

const RADICE = path.resolve(import.meta.dirname, '..', '..');


const turni = Number(process.env.E2E_TURNI ?? 1);

export default defineConfig({
  testDir: './e2e',
  // Una cartella per server sotto prova: due serie di prove in parallelo (su porte diverse) non si
  // cancellano a vicenda tracce e allegati.
  outputDir: path.join(RADICE, 'logs', 'e2e', `porta-${new URL(URL_PROVE).port || '80'}`),
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // Con la voce vera un turno dura quanto la narrazione detta ad alta voce.
  timeout: 60_000 + turni * 150_000,
  reporter: [['list']],
  use: {
    // Mai la partita vera su 4610: per default l'istanza di prova su 4710 (vedi e2e/percorsi.ts).
    baseURL: URL_PROVE,
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: chromiumDisponibile(),
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },
});
