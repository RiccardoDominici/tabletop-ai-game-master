/**
 * Dove gira il server delle prove e dove scrive i log.
 *
 * Le prove NON usano la partita vera (porta 4610): per default puntano a un'istanza di prova su 4710,
 * avviata con `TAGM_PORTA=4710 scripts/avvio.sh …` (log e pagine in logs/porta-4710/).
 * Altre porte: E2E_PORTA=4720, oppure E2E_URL=http://host:porta. I log si leggono dalla cartella
 * dell'istanza (E2E_LOG la forza).
 */
import path from 'node:path';

export const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
export const PORTA_PROVE = 4710;

/** URL del server delle prove. */
export const URL_PROVE = process.env['E2E_URL'] ?? `http://localhost:${process.env['E2E_PORTA'] ?? PORTA_PROVE}`;

const porta = Number(new URL(URL_PROVE).port || 80);

/** Log del server sotto prova: logs/ per la 4610, logs/porta-<porta>/ per un'istanza di prova. */
export const CARTELLA_LOG = process.env['E2E_LOG'] ?? (porta === 4610 ? path.join(RADICE, 'logs') : path.join(RADICE, 'logs', `porta-${porta}`));

/** Screenshot di tutte le prove. */
export const SCREENSHOT = path.join(RADICE, 'logs', 'screenshots');
