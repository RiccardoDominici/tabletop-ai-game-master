/**
 * Ingresso di @cantastorie/web. I font sono pacchetti locali (@fontsource): il proiettore deve
 * funzionare anche senza internet, solo in LAN.
 */
import { impostaLinguaInterfaccia } from './lingua';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/cinzel/wght.css';
import '@fontsource-variable/alegreya/wght.css';
import '@fontsource-variable/alegreya/wght-italic.css';
import '@fontsource/alegreya-sans/400.css';
import '@fontsource/alegreya-sans/400-italic.css';
import '@fontsource/alegreya-sans/500.css';
import '@fontsource/alegreya-sans/700.css';
import '@fontsource/alegreya-sans/800.css';
import './styles/index.css';
import { App } from './App';
import { creaLog } from './lib/log';

const log = creaLog('app');

/** La lingua dell'interfaccia prima del primo disegno (docs/lingue.md): /api/salute, al massimo 1,5 s. */
async function linguaDalServer(): Promise<void> {
  try {
    const r = await fetch('/api/salute', { signal: AbortSignal.timeout(1500) });
    const s = (await r.json()) as { lingua?: unknown };
    impostaLinguaInterfaccia(s.lingua);
  } catch {
    log.warn('Lingua dell’interfaccia non arrivata dal server: italiano');
  }
}

const radice = document.getElementById('root');
if (!radice) {
  log.error('Elemento #root mancante in index.html');
} else {
  void linguaDalServer().then(() =>
    createRoot(radice).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
}
