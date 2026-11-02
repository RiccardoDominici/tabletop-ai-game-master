/**
 * Ingresso di @cantastorie/web. I font sono pacchetti locali (@fontsource): il proiettore deve
 * funzionare anche senza internet, solo in LAN.
 */
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
const radice = document.getElementById('root');
if (!radice) {
  log.error('Elemento #root mancante in index.html');
} else {
  createRoot(radice).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
