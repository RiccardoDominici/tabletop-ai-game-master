/**
 * «Fine sessione» su disco: da una sessione dell'archivio al registro (registro.yaml +
 * trascrizione.yaml). Stessa strada per il pannello del master e per scripts/registro.sh, così c'è
 * una sola cosa da provare.
 *
 * Le definizioni (nomi, testi dei segni, tipi delle battute) vengono dalla campagna caricata col
 * pacchetto di QUELLA sessione; in modalità B anche dal suo repertorio. Se il repertorio non si
 * carica più (pacchetto cambiato dopo), il registro si scrive lo stesso, con un avviso: gli id
 * dell'archivio sono i fatti, i nomi sono contorno.
 */
import { caricaCampagna } from '../campagna/caricatore';
import { elencoPacchetti } from '../campagna/pacchetti';
import type { Logger } from '../logger';
import { caricaRepertorio } from '../repertorio/caricatore';
import type { ArchivioSessioni } from './archivio';
import { definizioniRegistro, estraiRegistro, type EstrattoRegistro } from './registro';
import { cartellaRegistro, scriviRegistro } from './scrivi-registro';

export interface RegistroScritto {
  sessione: string;
  pacchetto: number | null;
  registro: string;
  trascrizione: string;
  estratto: EstrattoRegistro;
}

export class ErroreRegistro extends Error {
  override name = 'ErroreRegistro';
}

export function registraSessione(o: { archivio: ArchivioSessioni; sessione: string; cartellaCampagna: string; cartellaLog: string; log?: Logger }): RegistroScritto {
  const info = o.archivio.sessione(o.sessione);
  if (!info) throw new ErroreRegistro(`sessione ${o.sessione} non trovata nell'archivio`);
  const pacchetti = elencoPacchetti(o.cartellaCampagna);
  const pacchetto = info.pacchetto === null ? null : (pacchetti.find((p) => p.numero === info.pacchetto) ?? null);
  if (info.pacchetto !== null && !pacchetto) throw new ErroreRegistro(`la sessione ${o.sessione} ha giocato il pacchetto ${info.pacchetto}, che non c'è più in sessioni/`);
  const campagna = caricaCampagna(o.cartellaCampagna, undefined, { pacchetto: info.pacchetto });
  let repertorio: ReturnType<typeof caricaRepertorio> | undefined;
  const avvisi: string[] = [];
  if (info.modo === 'repertorio') {
    try {
      repertorio = caricaRepertorio(campagna);
    } catch (err) {
      avvisi.push(`Repertorio non caricato (${(err as Error).message.split('\n')[0]}): battute senza chi e tipo.`);
    }
  }
  const estratto = estraiRegistro({ ...info, pacchetto: info.pacchetto }, o.archivio.eventi(info.id), definizioniRegistro(campagna, repertorio));
  estratto.registro.avvisi.push(...avvisi);
  const cartella = cartellaRegistro({ cartellaPacchetto: pacchetto?.cartella ?? null, cartellaLog: o.cartellaLog, campagna: info.campagna, sessione: info.id });
  const file = scriviRegistro(cartella, estratto, o.log);
  return { sessione: info.id, pacchetto: info.pacchetto, ...file, estratto };
}
