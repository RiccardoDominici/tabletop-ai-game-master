/**
 * Strumento: il registro di fine sessione dall'archivio (sessioni.sqlite), senza modelli: lo stesso
 * codice di «Fine sessione» nel pannello del master (sessione/registra.ts). Serve tra le sessioni
 * (scripts/tra-sessioni.sh) e per rifare un registro mancante o controllare che nessuno l'abbia
 * toccato a mano.
 *
 * Uso: scripts/registro.sh <campagna | cartella> [<nn>] [--sessione <nn> | --archivio <id>] [--uscita <dir>] [--controlla]
 *   senza scelta          l'ultima sessione dell'archivio di quella campagna;
 *   --sessione nn (o nn)  l'ultima sessione che ha giocato il pacchetto sessioni/<nn>/;
 *   --archivio id         quella sessione dell'archivio;
 *   --uscita dir          scrive lì invece che in sessioni/<nn>/ (one-shot: logs/registri/…);
 *   --controlla           non scrive: confronta coi file che ci sono già.
 * L'archivio è quello dell'istanza: CANTASTORIE_SESSIONI, oppure <CANTASTORIE_LOG>/sessioni.sqlite
 * (scripts/registro.sh mette CANTASTORIE_LOG come avvio.sh, secondo CANTASTORIE_PORTA).
 *
 * Uscita: 0 fatto (o uguale, con --controlla); 1 diverso (--controlla); 2 argomenti sbagliati;
 * 3 campagna o archivio che non si caricano; 4 nessuna sessione da registrare.
 */
import fs from 'node:fs';
import path from 'node:path';
import { idCampagna } from '../campagna/caricatore';
import { caricaConfig } from '../config';
import { RADICE_REPO } from '../percorsi';
import { ArchivioSessioni } from '../sessione/archivio';
import { estraiSessione } from '../sessione/registra';
import { FILE_REGISTRO, scriviRegistro, testiRegistro } from '../sessione/scrivi-registro';
import { FILE_TRASCRIZIONE } from '../sessione/registro';

const AIUTO = `Uso: scripts/registro.sh <campagna | cartella> [<nn>] [--sessione <nn> | --archivio <id>] [--uscita <dir>] [--controlla]
  --sessione <nn>  l'ultima sessione che ha giocato sessioni/<nn>/ (anche come secondo argomento)
  --archivio <id>  una sessione precisa dell'archivio
  --uscita <dir>   scrive lì invece che nella cartella del pacchetto
  --controlla      non scrive: 0 se i file ci sono e sono uguali a ciò che darebbe l'archivio, 1 se no
  --help           questo aiuto
Uscita: 0 fatto, 1 diverso (--controlla), 2 argomenti, 3 campagna o archivio illeggibili, 4 nessuna sessione.`;

interface Opzioni {
  campagna: string;
  sessione: number | null;
  archivio: string | null;
  uscita: string | null;
  controlla: boolean;
}

function leggiOpzioni(argv: string[]): Opzioni | 'aiuto' | null {
  const o: Opzioni = { campagna: '', sessione: null, archivio: null, uscita: null, controlla: false };
  const numero = (v: string | undefined): number | null => (v !== undefined && /^\d+$/.test(v) ? Number(v) : null);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--help' || a === '-h') return 'aiuto';
    if (a === '--sessione') {
      o.sessione = numero(argv[++i]);
      if (o.sessione === null) return null;
    } else if (a === '--archivio') {
      o.archivio = argv[++i] ?? null;
      if (!o.archivio) return null;
    } else if (a === '--uscita') {
      o.uscita = argv[++i] ?? null;
      if (!o.uscita) return null;
    } else if (a === '--controlla') o.controlla = true;
    else if (a.startsWith('--')) return null;
    else if (!o.campagna) o.campagna = a;
    else if (o.sessione === null && numero(a) !== null) o.sessione = numero(a);
    else return null;
  }
  if (!o.campagna || (o.sessione !== null && o.archivio !== null) || (o.controlla && o.uscita)) return null;
  return o;
}

/** «nozze-neve» o «campagne/nozze-neve» o un percorso qualsiasi. */
function cartellaDi(campagna: string): string | null {
  for (const c of [path.resolve(campagna), path.join(RADICE_REPO, 'campagne', campagna)]) if (fs.existsSync(path.join(c, 'stile.yaml'))) return c;
  return null;
}

function primaRigaDiversa(a: string, b: string): string {
  const ra = a.split('\n');
  const rb = b.split('\n');
  for (let i = 0; i < Math.max(ra.length, rb.length); i++) if (ra[i] !== rb[i]) return `riga ${i + 1}: atteso «${rb[i] ?? '(fine)'}», trovato «${ra[i] ?? '(fine)'}»`;
  return '';
}

function main(): number {
  const o = leggiOpzioni(process.argv.slice(2));
  if (o === 'aiuto') {
    console.log(AIUTO);
    return 0;
  }
  if (!o) {
    console.error(AIUTO);
    return 2;
  }
  const cartella = cartellaDi(o.campagna);
  if (!cartella) {
    console.error(`registro: campagna non trovata: ${o.campagna}`);
    return 3;
  }
  const config = caricaConfig();
  if (!config.fileSessioni || !fs.existsSync(config.fileSessioni)) {
    console.error(`registro: nessun archivio delle sessioni (${config.fileSessioni ?? 'CANTASTORIE_SESSIONI=off'})`);
    return 4;
  }
  let archivio: ArchivioSessioni;
  let id: string;
  try {
    archivio = new ArchivioSessioni(config.fileSessioni);
    id = idCampagna(cartella);
  } catch (err) {
    console.error(`registro: ${(err as Error).message}`);
    return 3;
  }
  try {
    const sessioni = archivio.elenco(id);
    const scelta = o.archivio ? sessioni.find((s) => s.id === o.archivio) : o.sessione !== null ? sessioni.find((s) => s.pacchetto === o.sessione) : sessioni[0];
    if (!scelta) {
      const cosa = o.archivio ? `la sessione ${o.archivio}` : o.sessione !== null ? `una sessione del pacchetto ${o.sessione}` : 'nessuna sessione';
      console.error(`registro: ${id}: nell'archivio ${config.fileSessioni} non c'è ${cosa}`);
      return 4;
    }
    let estratto: ReturnType<typeof estraiSessione>;
    try {
      estratto = estraiSessione({ archivio, sessione: scelta.id, cartellaCampagna: cartella, cartellaLog: config.cartellaLog });
    } catch (err) {
      console.error(`registro: ${(err as Error).message}`);
      return 3;
    }
    const dove = o.uscita ? path.resolve(o.uscita) : estratto.cartella;
    if (o.controlla) {
      const attesi = testiRegistro(estratto.estratto);
      for (const [file, testo] of [[FILE_REGISTRO, attesi.registro], [FILE_TRASCRIZIONE, attesi.trascrizione]] as const) {
        const f = path.join(dove, file);
        if (!fs.existsSync(f)) {
          console.error(`registro: ${f} non c'è`);
          return 1;
        }
        const trovato = fs.readFileSync(f, 'utf8');
        if (trovato !== testo) {
          console.error(`registro: ${f} è diverso da ciò che dà l'archivio (${primaRigaDiversa(trovato, testo)})`);
          return 1;
        }
      }
      console.log(`registro: ${path.join(dove, FILE_REGISTRO)} uguale all'archivio (sessione ${scelta.id})`);
      return 0;
    }
    const file = scriviRegistro(dove, estratto.estratto);
    const r = estratto.estratto.registro;
    console.log(`registro: ${file.registro}`);
    console.log(`  sessione ${scelta.id}${scelta.pacchetto !== null ? ` · pacchetto ${scelta.pacchetto}` : ' · one-shot'} · ${scelta.stato} · turni ${r.archivio.ultimo_turno} · voci ${estratto.estratto.trascrizione.voci.length}`);
    for (const a of r.avvisi) console.log(`  avviso: ${a}`);
    return 0;
  } finally {
    archivio.chiudi();
  }
}

process.exitCode = main();
