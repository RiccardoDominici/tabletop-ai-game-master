/**
 * Chi fa cosa (docs/provider.md), per le persone e per gli script.
 *
 *   npx tsx apps/server/src/strumenti/provider.ts            tabella: componente → provider, modello, perché
 *   npx tsx apps/server/src/strumenti/provider.ts --shell    variabili per gli script (avvio.sh, partita.sh):
 *     LETTORE, VOCE, ARBITRO_AZIONI…   provider scelto di ogni componente
 *     SERVE_LOCALE=1                   qualche componente usa il server locale dei modelli
 *     AVVIO_LOCALE=mlx|no              chi lo accende; URL_LOCALE, MODELLO_LOCALE, PORTA_LOCALE
 *     URL_ASCOLTO, PORTA_ASCOLTO       the local speech-to-text server (whisper-server), when ASCOLTO=locale
 * Stesse regole del server (stesse variabili d'ambiente, stessi file, stesse chiavi).
 */
import { caricaConfig } from '../config';
import { COMPONENTI, descriviScelte, risolvi } from '../provider/config';

const config = caricaConfig();
const scelte = risolvi(config.provider, { anthropic: config.llm.fileChiave, openrouter: config.voce.fish.fileChiave });
if (process.argv.includes('--shell')) {
  const loc = config.provider.backend.locale;
  // Voice and speech-to-text have their own local servers (4611, 4614): they do not need the model server.
  const serve = COMPONENTI.some((c) => c !== 'voce' && c !== 'ascolto' && scelte[c].provider === 'locale');
  const urlAscolto = scelte.ascolto.provider === 'locale' ? scelte.ascolto.url ?? '' : '';
  const porta = (() => {
    try {
      return new URL(loc.url ?? '').port || '80';
    } catch {
      return '';
    }
  })();
  const righe = [
    ...COMPONENTI.map((c) => `${c.toUpperCase()}=${scelte[c].provider}`),
    `MODO_LETTORE=${scelte.lettore.modo ?? ''}`,
    `SERVE_LOCALE=${serve ? 1 : 0}`,
    `AVVIO_LOCALE=${loc.avvio ?? 'no'}`,
    `URL_LOCALE=${loc.url ?? ''}`,
    `PORTA_LOCALE=${porta}`,
    `MODELLO_LOCALE=${loc.modello ?? ''}`,
    `URL_ASCOLTO=${urlAscolto}`,
    `PORTA_ASCOLTO=${urlAscolto ? new URL(urlAscolto).port || '80' : ''}`,
  ];
  // Valori senza spazi né virgolette: si possono leggere con `eval`.
  console.log(righe.map((r) => r.replace(/[^\w=.:/@-]/g, '')).join('\n'));
} else {
  console.log(`Provider (${config.provider.file.join(' + ') || 'nessun file'}):`);
  for (const r of descriviScelte(scelte)) console.log(`  ${r}`);
}
