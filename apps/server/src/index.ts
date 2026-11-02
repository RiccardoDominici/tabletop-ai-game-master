/**
 * Punto d'ingresso del server di Cantastorie (F0).
 * Avvio: config → log → server → ascolto su 0.0.0.0:4610; arresto pulito su SIGINT/SIGTERM.
 */
import { costruisciServer } from './avvio';
import { caricaConfig } from './config';
import { creaLogger } from './logger';

async function main(): Promise<void> {
  const config = caricaConfig();
  const log = creaLogger({ livello: config.livelloLog, cartellaLog: config.cartellaLog });
  log.info(
    { porta: config.porta, campagna: config.cartellaCampagna, llm: config.llm.modo, voce: config.voce.modo, finestra_ms: config.turni.chiusuraDopoPrimaAzioneMs },
    'Cantastorie: avvio',
  );
  const server = await costruisciServer(config, log);
  await server.avvia();
  log.info({ telefono: server.info.url_telefono, schermo: server.info.url_schermo }, 'Cantastorie: in ascolto');

  let inArresto = false;
  const arresta = async (segnale: string): Promise<void> => {
    if (inArresto) return;
    inArresto = true;
    log.info({ segnale }, 'Cantastorie: arresto');
    await server.chiudi();
    log.flush?.();
    process.exit(0);
  };
  process.on('SIGINT', () => void arresta('SIGINT'));
  process.on('SIGTERM', () => void arresta('SIGTERM'));
}

main().catch((err: unknown) => {
  // Niente logger qui: potrebbe non esistere ancora. Messaggio e stack bastano.
  console.error('Cantastorie: avvio fallito', err);
  process.exit(1);
});
