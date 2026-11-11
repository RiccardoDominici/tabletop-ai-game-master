import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vite per @tabletop-ai-gm/web (docs/f0-contratti.md, «Porte»).
 *
 * - Dev: Vite serve le pagine su :4612 (0.0.0.0, così i telefoni della LAN arrivano anche in
 *   sviluppo) e inoltra Socket.IO (`/socket.io`, anche WebSocket) e REST (`/api`) al server :4610.
 *   `TAGM_SERVER` cambia il bersaglio (es. un server su un'altra macchina).
 * - Build: `dist/` dentro apps/web; il server la serve con un fallback SPA, quindi /telefono e
 *   /schermo sono rotte del client.
 */
// Il nome vecchio CANTASTORIE_SERVER resta letto per compatibilità (vedi apps/server/src/variabili-legacy.ts).
const SERVER = process.env.TAGM_SERVER ?? process.env.CANTASTORIE_SERVER ?? 'http://127.0.0.1:4610';
const PORTA_VITE = 4612;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: PORTA_VITE,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/socket.io': { target: SERVER, ws: true, changeOrigin: true },
      '/api': { target: SERVER, changeOrigin: true },
    },
  },
  preview: {
    port: PORTA_VITE,
    strictPort: true,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Il proiettore gira su Chrome recente: niente polyfill inutili.
    target: 'es2022',
  },
});
