/**
 * Strumento: quale pacchetto sessioni/<nn>/ giocherebbe il server all'avvio, con le stesse regole
 * (sessione/scelta-pacchetto.ts) e la stessa riserva se il pacchetto dopo una «Fine sessione» non si
 * carica (avvio.ts). Serve a scripts/partita.sh per validare proprio quel pacchetto prima di avviare.
 *
 * Uso: npx tsx apps/server/src/strumenti/scelta.ts <cartella> [--modo improvvisa|repertorio] [--sessione N] [--nuova]
 * Stampa una riga JSON: {"numero": 2 | null, "motivo": "...", "avviso": "..." | null}. L'archivio è quello
 * dell'istanza (CANTASTORIE_SESSIONI o <CANTASTORIE_LOG>/sessioni.sqlite); non scrive niente, e un
 * archivio che non c'è vale «nessuna sessione».
 * Uscita: 0; 2 argomenti sbagliati; 3 la sessione chiesta non c'è o il pacchetto non si carica.
 */
import fs from 'node:fs';
import path from 'node:path';
import { caricaCampagna, idCampagna } from '../campagna/caricatore';
import { elencoPacchetti } from '../campagna/pacchetti';
import { caricaConfig } from '../config';
import { ArchivioSessioni, type InfoSessione } from '../sessione/archivio';
import { scegliPacchetto, type SceltaPacchetto } from '../sessione/scelta-pacchetto';

function main(): number {
  const argv = process.argv.slice(2);
  let cartella = '';
  let modo = 'repertorio';
  let sessione: number | null = null;
  let nuova = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--modo') modo = argv[++i] ?? '';
    else if (a === '--sessione') sessione = /^\d+$/.test(argv[i + 1] ?? '') ? Number(argv[++i]) : NaN;
    else if (a === '--nuova') nuova = true;
    else if (!a.startsWith('--') && !cartella) cartella = path.resolve(a);
    else return errore(2, `argomento sconosciuto: ${a}`);
  }
  if (!cartella || !['improvvisa', 'repertorio'].includes(modo) || Number.isNaN(sessione)) return errore(2, 'uso: scelta.ts <cartella> [--modo improvvisa|repertorio] [--sessione N] [--nuova]');
  const config = caricaConfig();
  let sessioni: InfoSessione[] = [];
  if (config.fileSessioni && fs.existsSync(config.fileSessioni)) {
    const archivio = new ArchivioSessioni(config.fileSessioni);
    sessioni = archivio.elenco(idCampagna(cartella));
    archivio.chiudi();
  }
  // --nuova: il server chiuderà le sessioni in corso prima di scegliere.
  if (nuova) sessioni = sessioni.map((s) => (s.stato === 'in_corso' ? { ...s, stato: 'chiusa', motivo_chiusura: 'avvio con --nuova' } : s));
  let scelta: SceltaPacchetto;
  try {
    scelta = scegliPacchetto(elencoPacchetti(cartella), sessioni, modo, sessione);
    if (scelta.numero !== null) {
      try {
        caricaCampagna(cartella, undefined, { pacchetto: scelta.numero });
      } catch (err) {
        if (scelta.riserva === undefined) throw err;
        scelta = { numero: scelta.riserva, motivo: 'ultima giocata', avviso: `La sessione ${scelta.numero} non si carica (${(err as Error).message.split('\n')[0]}): si resta sulla ${scelta.riserva}.` };
      }
    }
  } catch (err) {
    return errore(3, (err as Error).message);
  }
  console.log(JSON.stringify({ numero: scelta.numero, motivo: scelta.motivo, avviso: scelta.avviso }));
  return 0;
}

function errore(codice: number, messaggio: string): number {
  console.error(`scelta: ${messaggio}`);
  return codice;
}

process.exitCode = main();
