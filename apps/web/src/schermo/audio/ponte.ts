/**
 * Ponte tra il resto del proiettore e l'audio della scena (musica, ambienti, temi, effetti):
 * - catalogo: GET /api/audio a ogni (ri)connessione (un server riavviato può averne uno nuovo);
 * - stato della scena (store del tavolo) → RegistaAudio;
 * - linea del tempo della voce (LettorePcm.programmato) → ducking e temi dei PNG;
 * - impostazioni del pannello → volumi dei bus;
 * - `window.__schermoDebug.audio` per l'e2e (stato del regista e guadagni dal vivo).
 *
 * Il mixer nasce solo dopo «Inizia sessione», sullo STESSO AudioContext della voce (i browser
 * permettono l'audio solo dopo un gesto). Prima di allora stato e catalogo si tengono da parte.
 *
 * `?isteresi_audio_s=8` nell'URL accorcia l'isteresi della musica (prove e e2e; predefinito 60 s).
 */
import type { AudioFrase, CatalogoAudioPubblico } from '@tabletop-ai-gm/shared';
import { creaLog } from '../../lib/log';
import { alRientro, prendiSocket } from '../../lib/socket';
import { useTavolo } from '../../store/tavolo';
import { debugSchermo } from '../debug';
import { BancaAudio, scaricaConFetch } from './banca';
import type { ContestoAudio } from './contesto';
import { BUS } from './impostazioni';
import { Mixer } from './mixer';
import { INTERVALLO_MUSICA_MS, puntiDiLoop } from './regole';
import { RegistaAudio } from './regista';
import { useAudioSchermo } from './store';
import { timerFinestra } from './traccia';

const log = creaLog('audio-scena');

let regista: RegistaAudio | null = null;
let mixer: Mixer | null = null;
let catalogo: CatalogoAudioPubblico | null = null;
let contestoAudio: AudioContext | null = null;

/** Isteresi della musica: 60 s, o quella dell'URL (solo per prove). */
function isteresiMs(): number {
  try {
    const s = Number(new URLSearchParams(window.location.search).get('isteresi_audio_s'));
    if (Number.isFinite(s) && s > 0) return s * 1000;
  } catch {
    // URL illeggibile: valore predefinito.
  }
  return INTERVALLO_MUSICA_MS;
}

/** Porta lo stato corrente della scena al regista (se c'è). */
function applicaScena(): void {
  const stato = useTavolo.getState().stato;
  const audio = stato?.scena.audio;
  if (!regista || !stato || !audio) return;
  regista.scena(audio, stato.scena.umore, stato.turno);
}

async function caricaCatalogo(): Promise<void> {
  try {
    const r = await fetch('/api/audio');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    catalogo = (await r.json()) as CatalogoAudioPubblico;
    useAudioSchermo.getState().impostaCrediti(catalogo.crediti ?? []);
    regista?.impostaCatalogo(catalogo);
    log.info('Catalogo audio caricato', { tracce: Object.keys(catalogo.tracce ?? {}).length });
  } catch (errore) {
    // Server vecchio o giù: riprova alla prossima riconnessione; intanto solo la voce.
    log.warn('Catalogo audio non caricato: suona solo la voce', String(errore));
  }
}

/**
 * Crea mixer e regista sull'AudioContext della voce e vi instrada la voce. Va chiamata subito dopo
 * lo sblocco (dentro il gesto «Inizia sessione»); chiamarla di nuovo non fa nulla.
 */
export function avviaAudioScena(ctx: AudioContext, instradaVoce: (nodo: AudioNode) => void): void {
  if (regista) return;
  contestoAudio = ctx;
  const contesto: ContestoAudio = ctx;
  mixer = new Mixer(contesto, useAudioSchermo.getState().impostazioni);
  instradaVoce(mixer.bus.voce as unknown as AudioNode);
  const banca = new BancaAudio(scaricaConFetch, (byte) => ctx.decodeAudioData(byte));
  regista = new RegistaAudio({ ctx: contesto, mixer, banca, timer: timerFinestra, ora: () => performance.now(), isteresiMs: isteresiMs() });
  useAudioSchermo.getState().impostaPronto(true);
  if (catalogo) regista.impostaCatalogo(catalogo);
  applicaScena();
  log.info('Audio della scena avviato', { isteresiS: isteresiMs() / 1000 });
}

/** Dal lettore della voce: un pezzo è in programma (ducking; tema se apre la prima battuta di un PNG). */
export function voceProgrammata(inizio: number, fine: number, frase: AudioFrase | null): void {
  if (!regista) return;
  if (frase) regista.fraseProgrammata(frase.parlante, inizio);
  // Effetto legato alla frase dal Motore: parte con lei, sull'orologio audio.
  if (frase?.effetto) void regista.effetto(frase.effetto, inizio);
  regista.voceProgrammata(inizio, fine);
}

/**
 * `audio:frase` (annuncio, prima dell'audio): `codaS` = secondi di voce già in programma, quindi la
 * frase comincerà circa fra `codaS` (di più se la generazione resta indietro).
 */
export function fraseAnnunciata(frase: AudioFrase, codaS: number): void {
  if (!regista || !mixer) return;
  regista.fraseAnnunciata(frase.parlante, (contestoAudio?.currentTime ?? 0) + codaS);
  if (frase.effetto) regista.preparaEffetto(frase.effetto);
}

/** Effetti arrivati con `audio:fine_turno`: suonano quando la voce del turno è finita davvero. */
const effettiFineTurno = new Map<number, string[]>();

export function effettiDopoIlTurno(turno: number, effetti: readonly string[] | undefined): void {
  if (effetti?.length) effettiFineTurno.set(turno, [...effetti]);
}

/** La voce del turno è uscita tutta dalle casse: gli effetti in attesa partono adesso. */
export function turnoSuonato(turno: number): void {
  const effetti = effettiFineTurno.get(turno);
  effettiFineTurno.delete(turno);
  for (const id of effetti ?? []) void regista?.effetto(id);
}

/** `audio:interrompi`: la voce tace, musica e ambienti risalgono. */
export function interrompiAudioScena(): void {
  effettiFineTurno.clear();
  regista?.interrompi();
}

/** Collega catalogo, stato e impostazioni (una volta per pagina); restituisce lo scollegamento. */
export function collegaAudioScena(): () => void {
  const togliRientro = alRientro(() => void caricaCatalogo());
  // Effetti comandati dal master (stanza «schermo»).
  const s = prendiSocket();
  const suEffetto = (e: { id: string }) => {
    if (!regista) return;
    void regista.effetto(e.id).then((ok) => (ok ? log.info('Effetto', e) : log.warn('Effetto non suonato', e)));
  };
  s.on('audio:effetto', suEffetto);
  const togliStato = useTavolo.subscribe((s, prima) => {
    if (s.stato !== prima.stato) applicaScena();
  });
  const togliImpostazioni = useAudioSchermo.subscribe((s, prima) => {
    if (!mixer || s.impostazioni === prima.impostazioni) return;
    for (const nome of BUS) if (s.impostazioni[nome] !== prima.impostazioni[nome]) mixer.imposta(nome, s.impostazioni[nome]);
  });
  return () => {
    s.off('audio:effetto', suEffetto);
    togliRientro();
    togliStato();
    togliImpostazioni();
  };
}

// Debug per l'e2e: funzioni, perché i guadagni vanno letti dal vivo (AudioParam.value).
debugSchermo.audio = {
  stato: () => regista?.stato() ?? null,
  guadagni: () => regista?.guadagni() ?? {},
  tracce: () => regista?.tracce() ?? [],
  puntiDiLoop,
  effetto: (id: string) => regista?.effetto(id) ?? Promise.resolve(false),
};
