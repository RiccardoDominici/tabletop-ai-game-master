/**
 * Punto d'ingresso del server di Tabletop AI Game Master (F0).
 * Avvio: config → log → server → ascolto su 0.0.0.0:4610; arresto pulito su SIGINT/SIGTERM.
 * «Prossima sessione» (campagne a più sessioni) ricostruisce il server sullo stesso indirizzo
 * (ciclo-server.ts): qui si ristampano gli indirizzi, il token del master resta lo stesso.
 */
import './variabili-legacy';
import { variabiliLegacyUsate } from './variabili-legacy';
import type { ServerTagm } from './avvio';
import { ServerConCiclo } from './ciclo-server';
import { caricaConfig } from './config';
import { creaLogger } from './logger';

async function main(): Promise<void> {
  const config = caricaConfig();
  const log = creaLogger({ livello: config.livelloLog, cartellaLog: config.cartellaLog });
  if (variabiliLegacyUsate().length > 0) {
    log.warn({ vecchie: variabiliLegacyUsate() }, 'variabili CANTASTORIE_* deprecate: usa TAGM_* (il valore è stato copiato; il vecchio nome sparirà)');
  }
  log.info(
    { porta: config.porta, campagna: config.cartellaCampagna, llm: config.llm.modo, voce: config.voce.modo, assestamento_ms: config.turni.assestamentoMs, concitato_ms: config.turni.concitatoMs, sorvegliante_ms: config.turni.sorveglianteMs },
    'Tabletop AI Game Master: avvio',
  );
  const server = await ServerConCiclo.avvia(config, log);
  const annuncia = (s: ServerTagm): void => {
    const p = s.campagna.pacchetto;
    log.info({ telefono: s.info.url_telefono, schermo: s.info.url_schermo, sessione: p ? `${p.etichetta} · ${p.titolo}` : null }, 'Tabletop AI Game Master: in ascolto');
    // Il link del pannello del master porta il token: sta solo qui, nel log del server sul Mac.
    // Si apre da localhost (non è nel QR dei telefoni).
    log.info({ master: `http://localhost:${config.porta}/master?token=${s.tokenMaster}` }, 'PANNELLO MASTER');
  };
  annuncia(server.corrente);
  server.alCambio(annuncia);

  let inArresto = false;
  const arresta = async (segnale: string): Promise<void> => {
    if (inArresto) return;
    inArresto = true;
    log.info({ segnale }, 'Tabletop AI Game Master: arresto');
    await server.chiudi();
    log.flush?.();
    process.exit(0);
  };
  process.on('SIGINT', () => void arresta('SIGINT'));
  process.on('SIGTERM', () => void arresta('SIGTERM'));
}

main().catch((err: unknown) => {
  // Niente logger qui: potrebbe non esistere ancora. Messaggio e stack bastano.
  console.error('Tabletop AI Game Master: avvio fallito', err);
  process.exit(1);
});
