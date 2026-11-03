/**
 * Scrittura del registro di fine sessione su disco (registro.yaml + trascrizione.yaml) e dove va:
 * - campagna a pacchetti: campagne/<id>/sessioni/<nn>/ (docs/strati.md, «File»);
 * - one-shot: <cartella dei log>/registri/<campagna>/<id della sessione>/, così le cartelle delle
 *   campagne one-shot restano come sono.
 *
 * Il testo è deterministico (stesso estratto → stessi byte): YAML senza a-capo automatici, chiavi
 * nell'ordine dell'estratto, nessuna data di scrittura. La scrittura passa da un file temporaneo e
 * un rename, così un registro a metà non esiste mai.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { Logger } from '../logger';
import { FILE_TRASCRIZIONE, type EstrattoRegistro } from './registro';

export const FILE_REGISTRO = 'registro.yaml';

const INTESTAZIONE_REGISTRO = [
  '# Registro della sessione: estratto dall’archivio (sessioni.sqlite) dal server, senza modelli.',
  '# Ogni voce porta il turno da cui viene. Non si modifica a mano: si rigenera con scripts/registro.sh.',
  '# Contiene le azioni PRIVATE dei PG: solo per il master e il Preparatore, mai per i giocatori.',
].join('\n');

const INTESTAZIONE_TRASCRIZIONE = [
  '# Trascrizione pubblica della sessione: ciò che il tavolo ha sentito e visto, turno per turno.',
  '# Estratta dall’archivio dal server; niente azioni private.',
].join('\n');

/** YAML stabile: niente piegature delle righe lunghe (cambierebbero con la larghezza). */
export function yamlStabile(dati: unknown, intestazione: string): string {
  return `${intestazione}\n${YAML.stringify(dati, { lineWidth: 0, minContentWidth: 0 })}`;
}

/** Nome di cartella sicuro per l'id di una sessione (un'ora ISO: i «:» diventano «-»). */
export function cartellaSicura(id: string): string {
  return id.replace(/[^A-Za-z0-9._-]/g, '-');
}

/** Etichetta a due cifre del pacchetto (1 → «01»). */
export function etichettaPacchetto(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Cartella di destinazione del registro. `cartellaPacchetto` è la cartella sessioni/<nn>/ della
 * sessione giocata (null = one-shot).
 */
export function cartellaRegistro(o: { cartellaPacchetto: string | null; cartellaLog: string; campagna: string; sessione: string }): string {
  return o.cartellaPacchetto ?? path.join(o.cartellaLog, 'registri', cartellaSicura(o.campagna), cartellaSicura(o.sessione));
}

function scriviAtomico(file: string, testo: string): void {
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, testo, 'utf8');
  fs.renameSync(tmp, file);
}

/** Il testo dei due file, esattamente come si scrivono (serve anche a scripts/registro.sh --controlla). */
export function testiRegistro(e: EstrattoRegistro): { registro: string; trascrizione: string } {
  return { registro: yamlStabile(e.registro, INTESTAZIONE_REGISTRO), trascrizione: yamlStabile(e.trascrizione, INTESTAZIONE_TRASCRIZIONE) };
}

/** Scrive registro.yaml e trascrizione.yaml nella cartella; restituisce i due percorsi. */
export function scriviRegistro(cartella: string, e: EstrattoRegistro, log?: Logger): { registro: string; trascrizione: string } {
  fs.mkdirSync(cartella, { recursive: true });
  const registro = path.join(cartella, FILE_REGISTRO);
  const trascrizione = path.join(cartella, FILE_TRASCRIZIONE);
  const testi = testiRegistro(e);
  scriviAtomico(trascrizione, testi.trascrizione);
  scriviAtomico(registro, testi.registro);
  log?.info(
    {
      registro,
      sessione: e.registro.archivio.id,
      pacchetto: e.registro.sessione,
      turni: e.registro.archivio.ultimo_turno,
      voci: e.trascrizione.voci.length,
      indizi: e.registro.indizi?.length ?? null,
      battute: e.registro.battute?.length ?? null,
      segni: e.registro.orologi.reduce((n, o) => n + o.segni.length, 0),
    },
    'registro della sessione scritto',
  );
  return { registro, trascrizione };
}
