/**
 * «Ascolta qui»: la voce del gioco anche su questo telefono (senza cassa, o per chi siede lontano).
 *
 * - Acceso con un tocco (serve un gesto per sbloccare l'audio del browser): crea un `LettorePcm`
 *   (lo stesso del proiettore, senza musica né effetti), ascolta gli `audio:*` del socket e chiede
 *   al server di entrare nelle stanze d'ascolto (`telefono:ascolta`). Il server manda qui anche la
 *   voce degli esiti privati di questo PG, che il proiettore non riceve mai.
 * - A ogni riconnessione si richiede l'ascolto (le stanze del server si perdono con la connessione).
 * - La scelta resta in localStorage: dopo un ricaricamento il primo tocco sulla pagina la riaccende.
 * - Il telefono non manda avvisi di inizio/fine audio: le misure le fa solo il proiettore.
 */
import { t } from '../lingua';
import { create } from 'zustand';
import type { AudioFineFrase, AudioFineTurno, AudioFrase, AudioPezzo } from '@tabletop-ai-gm/shared';
import { LettorePcm } from '../audio/lettore';
import { creaLog } from '../lib/log';
import { leggiMemoria, scriviMemoria } from '../lib/memoria';
import { alRientro, conEsito, prendiSocket } from '../lib/socket';

const log = creaLog('ascolto');
const CHIAVE = 'tabletop-ai-gm:ascolta-qui';

interface StoreAscolto {
  /** Voce attiva su questo telefono. */
  attivo: boolean;
  /** Era acceso prima di un ricaricamento: aspetta un tocco per ripartire. */
  daRiattivare: boolean;
  /** Ultimo errore (audio non disponibile, server che non risponde). */
  errore: string | null;
  /** Testo in onda adesso (null in silenzio): per mostrare che sta parlando. */
  inOnda: string | null;
}

export const useAscolto = create<StoreAscolto>(() => ({
  attivo: false,
  daRiattivare: leggiMemoria(CHIAVE) === '1',
  errore: null,
  inOnda: null,
}));

/** Contatori per le prove e2e (window.__ascoltoDebug): frasi e pezzi arrivati, frasi private. */
const debug = { frasi: 0, pezzi: 0, private: 0, byte: 0 };
(window as unknown as { __ascoltoDebug?: typeof debug }).__ascoltoDebug = debug;

let lettore: LettorePcm | null = null;
let scollega: (() => void) | null = null;
let togliRientro: (() => void) | null = null;

function nuovoLettore(): LettorePcm {
  return new LettorePcm({
    inizioTurno: () => undefined,
    fineTurno: () => useAscolto.setState({ inOnda: null }),
    inizioFrase: (frase) => useAscolto.setState({ inOnda: frase.nome }),
    fineFrase: () => useAscolto.setState({ inOnda: null }),
    statoContesto: (stato) => log.debug('Stato audio', { stato }),
    contatori: () => undefined,
  });
}

function collegaEventi(l: LettorePcm): () => void {
  const s = prendiSocket();
  const frase = (m: AudioFrase) => {
    debug.frasi += 1;
    if (m.solo_pg) debug.private += 1;
    l.frase(m);
  };
  const pezzo = (p: AudioPezzo) => {
    debug.pezzi += 1;
    debug.byte += p.pcm.byteLength;
    l.pezzo(p);
  };
  const fineFrase = (f: AudioFineFrase) => l.fineFrase(f);
  const fineTurno = (f: AudioFineTurno) => l.fineTurno(f);
  const interrompi = () => {
    l.interrompi();
    useAscolto.setState({ inOnda: null });
  };
  s.on('audio:frase', frase);
  s.on('audio:pezzo', pezzo);
  s.on('audio:fine_frase', fineFrase);
  s.on('audio:fine_turno', fineTurno);
  s.on('audio:interrompi', interrompi);
  return () => {
    s.off('audio:frase', frase);
    s.off('audio:pezzo', pezzo);
    s.off('audio:fine_frase', fineFrase);
    s.off('audio:fine_turno', fineTurno);
    s.off('audio:interrompi', interrompi);
  };
}

async function chiediAlServer(attivo: boolean): Promise<boolean> {
  const esito = await conEsito((s, fine) => s.emit('telefono:ascolta', { attivo }, fine));
  if (!esito.ok) {
    log.warn('Ascolta qui: il server non ha risposto', { attivo, errore: esito.errore });
    useAscolto.setState({ errore: esito.errore });
  }
  return esito.ok;
}

/** Accende la voce qui. Va chiamata dentro un gesto dell'utente (tocco). */
export async function accendiAscolto(): Promise<void> {
  if (useAscolto.getState().attivo) return;
  lettore ??= nuovoLettore();
  try {
    // La parte sincrona dello sblocco deve stare dentro il gesto: niente await prima di questa riga.
    await lettore.sblocca();
  } catch (err) {
    log.warn('Ascolta qui: audio non disponibile', { err: (err as Error).message });
    useAscolto.setState({ errore: t('telefono.ascolta.no_audio') });
    return;
  }
  scollega = collegaEventi(lettore);
  useAscolto.setState({ attivo: true, daRiattivare: false, errore: null });
  scriviMemoria(CHIAVE, '1');
  // A ogni (ri)connessione il server deve rimetterci nelle stanze d'ascolto.
  togliRientro = alRientro(() => void chiediAlServer(true));
  log.info('Ascolta qui acceso');
}

/** Spegne la voce qui (e lo ricorda). */
export function spegniAscolto(): void {
  togliRientro?.();
  togliRientro = null;
  scollega?.();
  scollega = null;
  lettore?.interrompi();
  useAscolto.setState({ attivo: false, daRiattivare: false, inOnda: null });
  scriviMemoria(CHIAVE, '0');
  if (prendiSocket().connected) void chiediAlServer(false);
  log.info('Ascolta qui spento');
}

/**
 * Era acceso prima del ricaricamento: il primo tocco sulla pagina lo riaccende (l'audio del browser
 * non parte senza un gesto). Restituisce la funzione per togliere l'attesa.
 */
export function riattivaAlPrimoTocco(): () => void {
  if (!useAscolto.getState().daRiattivare) return () => undefined;
  const tocco = (): void => {
    document.removeEventListener('pointerdown', tocco, true);
    void accendiAscolto();
  };
  document.addEventListener('pointerdown', tocco, true);
  return () => document.removeEventListener('pointerdown', tocco, true);
}
